import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/trends/keywords
 *
 * 媒体別キーワード順位推移取得
 * 設計書: 13_APIエンドポイント一覧.md - 13.8.1 トレンド分析API
 * 画面: SC-913 トレンド分析画面
 * 機能: F-ADM-014 トレンド分析
 */

// ===== 型定義 =====

interface KeywordRow {
  id: string
  media_id: string
  keyword: string
  seo_difficulty: number | null
  monthly_search_volume: number | null
  search_rank: number | null
  estimated_traffic: number | null
  cpc_usd: number | null
  data_updated_at: string | null
  created_at: string
}

interface MediaRow {
  id: string
  name: string
  domain: string | null
}

interface KeywordTrendItem {
  keyword_id: string
  keyword: string
  rank: number | null
  search_volume: number | null
  estimated_traffic: number | null
  seo_difficulty: number | null
  trend: 'improving' | 'declining' | 'stable'
  best_rank: number | null
  worst_rank: number | null
}

interface KeywordTrendsResponse {
  success: boolean
  data?: {
    media: {
      id: string
      name: string
      domain: string | null
    }[]
    keywords: Record<string, KeywordTrendItem[]> // media_id -> keywords
    summary: {
      total_keywords: number
      by_media: Record<string, {
        count: number
        improving: number
        declining: number
        stable: number
      }>
    }
  }
  error?: {
    code?: string
    message: string
  }
}

// ===== ユーティリティ関数 =====

/**
 * キーワードのトレンドを判定
 * 現在のランクと履歴から判定（簡易版：現在値のみで判定）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function determineTrend(currentRank: number | null): 'improving' | 'declining' | 'stable' {
  // 履歴データがないため、現状は全てstableとして返す
  // TODO: 履歴テーブル追加時に実装
  return 'stable'
}


// ===== メインハンドラー =====

export async function GET(request: NextRequest): Promise<NextResponse<KeywordTrendsResponse>> {
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
    const limitParam = searchParams.get('limit')

    // バリデーション
    if (!mediaIdsParam) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'media_idsパラメータは必須です' } },
        { status: 400 }
      )
    }

    const mediaIds = mediaIdsParam.split(',').map(id => id.trim()).filter(Boolean)
    if (mediaIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '有効な媒体IDを指定してください' } },
        { status: 400 }
      )
    }

    if (mediaIds.length > 10) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '媒体IDは最大10件まで指定可能です' } },
        { status: 400 }
      )
    }

    const limit = Math.min(Math.max(parseInt(limitParam || '20', 10), 1), 50)

    // 4. Service Clientでデータ取得
    const serviceClient = createServiceClient()

    // 4.1 媒体情報を取得
    const { data: mediaList, error: mediaError } = await serviceClient
      .from('media_master')
      .select('id, name, domain')
      .in('id', mediaIds)

    if (mediaError) {
      console.error('Media query error:', mediaError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: '媒体情報の取得に失敗しました' } },
        { status: 500 }
      )
    }

    if (!mediaList || mediaList.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '指定された媒体が見つかりません' } },
        { status: 404 }
      )
    }

    // 4.2 キーワードデータを取得
    const { data: keywordsData, error: keywordsError } = await serviceClient
      .from('keywords')
      .select('*')
      .in('media_id', mediaIds)
      .order('monthly_search_volume', { ascending: false, nullsFirst: false })
      .limit(limit * mediaIds.length) // 各媒体ごとにlimit件

    if (keywordsError) {
      console.error('Keywords query error:', keywordsError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'キーワードデータの取得に失敗しました' } },
        { status: 500 }
      )
    }

    // 5. データ整形
    const keywordsByMedia: Record<string, KeywordTrendItem[]> = {}
    const summaryByMedia: Record<string, { count: number; improving: number; declining: number; stable: number }> = {}

    // 初期化
    mediaIds.forEach(mediaId => {
      keywordsByMedia[mediaId] = []
      summaryByMedia[mediaId] = { count: 0, improving: 0, declining: 0, stable: 0 }
    })

    // キーワードを媒体ごとにグループ化
    if (keywordsData) {
      const keywordsByMediaMap = new Map<string, KeywordRow[]>()
      keywordsData.forEach((kw: KeywordRow) => {
        const existing = keywordsByMediaMap.get(kw.media_id) || []
        existing.push(kw)
        keywordsByMediaMap.set(kw.media_id, existing)
      })

      // 各媒体ごとにlimit件まで取得
      keywordsByMediaMap.forEach((keywords, mediaId) => {
        const limitedKeywords = keywords.slice(0, limit)

        limitedKeywords.forEach(kw => {
          const trend = determineTrend(kw.search_rank)

          keywordsByMedia[mediaId].push({
            keyword_id: kw.id,
            keyword: kw.keyword,
            rank: kw.search_rank,
            search_volume: kw.monthly_search_volume,
            estimated_traffic: kw.estimated_traffic,
            seo_difficulty: kw.seo_difficulty,
            trend,
            best_rank: kw.search_rank, // 履歴がないため現在値
            worst_rank: kw.search_rank,
          })

          summaryByMedia[mediaId].count++
          summaryByMedia[mediaId][trend]++
        })
      })
    }

    // 総キーワード数
    const totalKeywords = Object.values(summaryByMedia).reduce((sum, s) => sum + s.count, 0)

    // 6. レスポンス返却
    return NextResponse.json({
      success: true,
      data: {
        media: (mediaList as MediaRow[]).map(m => ({
          id: m.id,
          name: m.name,
          domain: m.domain,
        })),
        keywords: keywordsByMedia,
        summary: {
          total_keywords: totalKeywords,
          by_media: summaryByMedia,
        }
      }
    })

  } catch (error) {
    console.error('Keyword trends error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'キーワード順位推移の取得に失敗しました'
        },
      },
      { status: 500 }
    )
  }
}
