import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/trends/traffic
 *
 * SimilarWeb流入データの期間推移取得
 * 設計書: 13_APIエンドポイント一覧.md - 13.8.1 トレンド分析API
 * 画面: SC-913 トレンド分析画面
 * 機能: F-ADM-014 トレンド分析
 */

// ===== 型定義 =====

interface TrafficDataRow {
  id: string
  media_id: string
  period: string
  search_pct: number | null
  direct_pct: number | null
  referral_pct: number | null
  display_pct: number | null
  email_pct: number | null
  social_pct: number | null
  created_at: string
}

interface MediaRow {
  id: string
  name: string
  domain: string | null
  monthly_visits: number | null
  bounce_rate: number | null
  pages_per_visit: number | null
  avg_visit_duration: number | null
  is_active: boolean
}

interface TrafficTrendItem {
  period: string
  monthly_visits: number | null
  search_pct: number | null
  direct_pct: number | null
  referral_pct: number | null
  display_pct: number | null
  email_pct: number | null
  social_pct: number | null
  bounce_rate: number | null
  pages_per_visit: number | null
  avg_visit_duration: number | null
}

interface MediaTrafficTrend {
  media_id: string
  media_name: string
  domain: string | null
  trends: TrafficTrendItem[]
  latest_metrics: {
    monthly_visits: number | null
    bounce_rate: number | null
    pages_per_visit: number | null
    avg_visit_duration: number | null
  }
  growth_rate: {
    visits: number | null
    search_pct: number | null
  }
}

interface TrafficTrendsResponse {
  success: boolean
  data?: {
    periods: string[]
    media: MediaTrafficTrend[]
    summary: {
      total_media: number
      period_count: number
      data_freshness: string | null
    }
  }
  error?: {
    code?: string
    message: string
  }
}

// ===== ユーティリティ関数 =====

/**
 * 期間文字列（3months, 6months, 12months）から開始期間を計算
 */
function calculatePeriodFrom(periodRange: string): string {
  const now = new Date()
  let monthsBack: number

  switch (periodRange) {
    case '3months':
      monthsBack = 3
      break
    case '6months':
      monthsBack = 6
      break
    case '12months':
      monthsBack = 12
      break
    default:
      monthsBack = 6
  }

  const targetDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
  return `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 現在の期間を取得（YYYY-MM形式）
 */
function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 成長率を計算（最初と最後の値を比較）
 */
function calculateGrowthRate(values: (number | null)[]): number | null {
  const validValues = values.filter((v): v is number => v !== null)
  if (validValues.length < 2) return null

  const first = validValues[0]
  const last = validValues[validValues.length - 1]

  if (first === 0) return null
  return Number((((last - first) / first) * 100).toFixed(1))
}

// ===== メインハンドラー =====

export async function GET(request: NextRequest): Promise<NextResponse<TrafficTrendsResponse>> {
  try {
    // 1. 認証チェック
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      )
    }

    // 2. 権限チェック（Admin権限）
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } },
        { status: 403 }
      )
    }

    // 3. クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const mediaIdsParam = searchParams.get('media_ids')
    const periodRange = searchParams.get('period') || '6months'

    // 期間計算
    const periodFrom = calculatePeriodFrom(periodRange)
    const periodTo = getCurrentPeriod()

    // 4. Service Clientでデータ取得
    const serviceClient = createServiceClient()

    // 4.1 媒体一覧を取得
    let mediaQuery = serviceClient
      .from('media_master')
      .select('id, name, domain, monthly_visits, bounce_rate, pages_per_visit, avg_visit_duration, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (mediaIdsParam) {
      const mediaIds = mediaIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      if (mediaIds.length > 10) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: '媒体IDは最大10件まで指定可能です' } },
          { status: 400 }
        )
      }
      mediaQuery = mediaQuery.in('id', mediaIds)
    }

    const { data: mediaList, error: mediaError } = await mediaQuery

    if (mediaError) {
      console.error('Media query error:', mediaError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: '媒体一覧の取得に失敗しました' } },
        { status: 500 }
      )
    }

    if (!mediaList || mediaList.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          periods: [],
          media: [],
          summary: {
            total_media: 0,
            period_count: 0,
            data_freshness: null
          }
        }
      })
    }

    const mediaIds = mediaList.map((m: MediaRow) => m.id)

    // 4.2 トラフィックデータを取得
    const { data: trafficData, error: trafficError } = await serviceClient
      .from('traffic_data')
      .select('*')
      .in('media_id', mediaIds)
      .gte('period', periodFrom)
      .lte('period', periodTo)
      .order('period', { ascending: true })

    if (trafficError) {
      console.error('Traffic data query error:', trafficError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'トラフィックデータの取得に失敗しました' } },
        { status: 500 }
      )
    }

    // 5. データ整形
    // 5.1 期間リストを生成
    const periodsSet = new Set<string>()
    if (trafficData) {
      trafficData.forEach((t: TrafficDataRow) => periodsSet.add(t.period))
    }
    const periods = Array.from(periodsSet).sort()

    // 5.2 媒体ごとにトレンドデータを整形
    const mediaTrafficMap = new Map<string, TrafficDataRow[]>()
    if (trafficData) {
      trafficData.forEach((t: TrafficDataRow) => {
        const existing = mediaTrafficMap.get(t.media_id) || []
        existing.push(t)
        mediaTrafficMap.set(t.media_id, existing)
      })
    }

    let latestDataTimestamp: string | null = null

    const mediaResults: MediaTrafficTrend[] = (mediaList as MediaRow[]).map(media => {
      const trafficRecords = mediaTrafficMap.get(media.id) || []

      // 期間ごとのトレンドデータを生成
      const trends: TrafficTrendItem[] = trafficRecords.map(t => {
        if (t.created_at && (!latestDataTimestamp || t.created_at > latestDataTimestamp)) {
          latestDataTimestamp = t.created_at
        }

        return {
          period: t.period,
          monthly_visits: media.monthly_visits, // media_masterから取得
          search_pct: t.search_pct,
          direct_pct: t.direct_pct,
          referral_pct: t.referral_pct,
          display_pct: t.display_pct,
          email_pct: t.email_pct,
          social_pct: t.social_pct,
          bounce_rate: media.bounce_rate,
          pages_per_visit: media.pages_per_visit,
          avg_visit_duration: media.avg_visit_duration,
        }
      })

      // 成長率計算
      const searchPctValues = trends.map(t => t.search_pct)

      return {
        media_id: media.id,
        media_name: media.name,
        domain: media.domain,
        trends,
        latest_metrics: {
          monthly_visits: media.monthly_visits,
          bounce_rate: media.bounce_rate,
          pages_per_visit: media.pages_per_visit,
          avg_visit_duration: media.avg_visit_duration,
        },
        growth_rate: {
          visits: null, // 月次推移データがないため現状null
          search_pct: calculateGrowthRate(searchPctValues),
        }
      }
    })

    // 6. レスポンス返却
    return NextResponse.json({
      success: true,
      data: {
        periods,
        media: mediaResults,
        summary: {
          total_media: mediaResults.length,
          period_count: periods.length,
          data_freshness: latestDataTimestamp,
        }
      }
    })

  } catch (error) {
    console.error('Traffic trends error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'トラフィック推移データの取得に失敗しました'
        },
      },
      { status: 500 }
    )
  }
}
