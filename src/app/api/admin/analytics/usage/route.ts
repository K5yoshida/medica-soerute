// ===========================================
// Usage Analytics API
// 利用状況分析データ取得
// GET /api/admin/analytics/usage
// 設計書: 13_APIエンドポイント一覧.md - 13.8 管理者API
// 画面: SC-907 利用状況分析画面
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ===== 型定義 =====

interface FeatureUsage {
  feature: string
  count: number
  unique_users: number
}

interface TrendItem {
  date: string
  matching: number
  peso: number
}

interface UsageAnalyticsData {
  summary: {
    active_users: number
    total_matching: number
    total_peso: number
  }
  by_feature: FeatureUsage[]
  trend: TrendItem[]
}

interface UsageAnalyticsResponse {
  success: boolean
  data?: UsageAnalyticsData
  error?: {
    code?: string
    message: string
  }
}

interface AnalysisResultRow {
  id: string
  user_id: string
  created_at: string
}

interface PesoDiagnosisRow {
  id: string
  user_id: string
  created_at: string
}

// ===== ユーティリティ関数 =====

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDefaultDateRange(): { startDate: Date; endDate: Date } {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30) // デフォルト30日間
  return { startDate, endDate }
}

// ===== メインハンドラー =====

export async function GET(request: NextRequest): Promise<NextResponse<UsageAnalyticsResponse>> {
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

    // 2. admin権限チェック
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
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')
    const groupBy = searchParams.get('group_by') || 'day' // day, week, month

    const { startDate: defaultStart, endDate: defaultEnd } = getDefaultDateRange()
    const startDate = startDateParam ? new Date(startDateParam) : defaultStart
    const endDate = endDateParam ? new Date(endDateParam) : defaultEnd

    // 4. Service Clientでデータ取得
    const serviceClient = createServiceClient()

    // 4.1 analysis_results（マッチング結果）を取得
    const { data: matchingData, error: matchingError } = await serviceClient
      .from('analysis_results')
      .select('id, user_id, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (matchingError) {
      console.error('Matching data query error:', matchingError)
    }

    // 4.2 peso_diagnoses を取得
    const { data: pesoData, error: pesoError } = await serviceClient
      .from('peso_diagnoses')
      .select('id, user_id, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (pesoError) {
      console.error('PESO data query error:', pesoError)
    }

    // 5. 集計処理
    const matchingRows = (matchingData || []) as AnalysisResultRow[]
    const pesoRows = (pesoData || []) as PesoDiagnosisRow[]
    const matchingCount = matchingRows.length
    const pesoCount = pesoRows.length

    // ユニークユーザー数
    const matchingUsers = new Set(matchingRows.map(m => m.user_id))
    const pesoUsers = new Set(pesoRows.map(p => p.user_id))
    const allUsers = new Set([...Array.from(matchingUsers), ...Array.from(pesoUsers)])

    // 機能別集計
    const byFeature: FeatureUsage[] = [
      { feature: 'matching', count: matchingCount, unique_users: matchingUsers.size },
      { feature: 'peso', count: pesoCount, unique_users: pesoUsers.size },
    ]

    // 日別トレンド集計
    const trendMap = new Map<string, { matching: number; peso: number }>()

    // 日付範囲内の全日を初期化
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateKey = formatDate(currentDate)
      trendMap.set(dateKey, { matching: 0, peso: 0 })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // マッチングデータを日別に集計
    matchingRows.forEach(m => {
      const dateKey = formatDate(new Date(m.created_at))
      const existing = trendMap.get(dateKey)
      if (existing) {
        existing.matching++
      }
    })

    // PESOデータを日別に集計
    pesoRows.forEach(p => {
      const dateKey = formatDate(new Date(p.created_at))
      const existing = trendMap.get(dateKey)
      if (existing) {
        existing.peso++
      }
    })

    // トレンドデータを配列に変換
    let trend: TrendItem[] = Array.from(trendMap.entries())
      .map(([date, counts]) => ({
        date,
        matching: counts.matching,
        peso: counts.peso,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // group_by に応じて集約
    if (groupBy === 'week' || groupBy === 'month') {
      const aggregated = new Map<string, { matching: number; peso: number }>()

      trend.forEach(item => {
        const date = new Date(item.date)
        let key: string

        if (groupBy === 'week') {
          // 週の開始日（月曜日）を計算
          const dayOfWeek = date.getDay()
          const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
          const monday = new Date(date.setDate(diff))
          key = formatDate(monday)
        } else {
          // 月の初日
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
        }

        const existing = aggregated.get(key) || { matching: 0, peso: 0 }
        existing.matching += item.matching
        existing.peso += item.peso
        aggregated.set(key, existing)
      })

      trend = Array.from(aggregated.entries())
        .map(([date, counts]) => ({
          date,
          matching: counts.matching,
          peso: counts.peso,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // 6. レスポンス返却
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          active_users: allUsers.size,
          total_matching: matchingCount,
          total_peso: pesoCount,
        },
        by_feature: byFeature,
        trend,
      },
    })
  } catch (error) {
    console.error('Usage analytics error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : '利用状況分析の取得に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}
