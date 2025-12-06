import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface RankingResult {
  media_id: string
  media_name: string
  domain: string | null
  matched_keyword_count: number
  total_estimated_traffic: number
  intent_a_count: number
  intent_a_pct: number
  monthly_visits: number | null
  top_keywords: Array<{
    keyword: string
    monthly_search_volume: number
    estimated_traffic: number
    search_rank: number
  }>
}

// キーワード検索による媒体ランキングAPI
export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams
    const keywords = searchParams.get('keywords')
    const sortBy = searchParams.get('sort_by') || 'estimated_traffic' // estimated_traffic, keyword_count, intent_a_pct
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (!keywords || keywords.trim() === '') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'キーワードを入力してください' } },
        { status: 400 }
      )
    }

    // スペース区切りでキーワードを分割
    const keywordList = keywords
      .trim()
      .split(/\s+/)
      .filter((k) => k.length > 0)
      .slice(0, 5) // 最大5キーワード

    if (keywordList.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'キーワードを入力してください' } },
        { status: 400 }
      )
    }

    // RLSをバイパスするためservice clientを使用してキーワード検索
    const serviceClient = createServiceClient()
    const results = await executeRankingQuery(serviceClient, keywordList, sortBy, limit)

    return NextResponse.json({
      success: true,
      data: {
        keywords: keywordList,
        results,
        total: results.length,
      },
    })
  } catch (error) {
    console.error('Ranking API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

// キーワードデータの型
interface KeywordData {
  media_id: string
  keyword: string
  monthly_search_volume: number | null
  estimated_traffic: number | null
  search_rank: number | null
}

// Supabase JSクライアントを使った代替実装
async function executeRankingQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  keywordList: string[],
  sortBy: string,
  limit: number
): Promise<RankingResult[]> {
  // Step 1: マッチするキーワードを取得
  let query = supabase
    .from('keywords')
    .select(`
      media_id,
      keyword,
      monthly_search_volume,
      estimated_traffic,
      search_rank,
      media_master!inner (
        id,
        name,
        domain,
        monthly_visits,
        is_active
      )
    `)
    .eq('media_master.is_active', true)

  // 各キーワードでILIKE検索
  for (const kw of keywordList) {
    query = query.ilike('keyword', `%${kw}%`)
  }

  const { data: keywords, error } = await query

  if (error || !keywords) {
    console.error('Keywords query error:', error)
    return []
  }

  // Step 2: 媒体ごとに集計
  const mediaMap = new Map<string, {
    media_id: string
    media_name: string
    domain: string | null
    monthly_visits: number | null
    keywords: KeywordData[]
  }>()

  for (const kw of keywords) {
    const media = kw.media_master as unknown as {
      id: string
      name: string
      domain: string | null
      monthly_visits: number | null
    }

    if (!mediaMap.has(media.id)) {
      mediaMap.set(media.id, {
        media_id: media.id,
        media_name: media.name,
        domain: media.domain,
        monthly_visits: media.monthly_visits,
        keywords: [],
      })
    }
    mediaMap.get(media.id)!.keywords.push({
      media_id: kw.media_id,
      keyword: kw.keyword,
      monthly_search_volume: kw.monthly_search_volume,
      estimated_traffic: kw.estimated_traffic,
      search_rank: kw.search_rank,
    })
  }

  // Step 3: 集計結果を作成
  const results: RankingResult[] = []

  mediaMap.forEach((media) => {
    const matchedKeywordCount = media.keywords.length
    const totalEstimatedTraffic = media.keywords.reduce(
      (sum: number, k) => sum + (k.estimated_traffic || 0),
      0
    )
    // intentカラムがDBにないため、一時的に0を設定
    const intentACount = 0
    const intentAPct = 0

    // 上位5キーワードを取得
    const topKeywords = media.keywords
      .sort((a, b) => (b.estimated_traffic || 0) - (a.estimated_traffic || 0))
      .slice(0, 5)
      .map((k) => ({
        keyword: k.keyword,
        monthly_search_volume: k.monthly_search_volume || 0,
        estimated_traffic: k.estimated_traffic || 0,
        search_rank: k.search_rank || 0,
      }))

    results.push({
      media_id: media.media_id,
      media_name: media.media_name,
      domain: media.domain,
      monthly_visits: media.monthly_visits,
      matched_keyword_count: matchedKeywordCount,
      total_estimated_traffic: totalEstimatedTraffic,
      intent_a_count: intentACount,
      intent_a_pct: intentAPct,
      top_keywords: topKeywords,
    })
  })

  // Step 4: ソート
  results.sort((a, b) => {
    switch (sortBy) {
      case 'keyword_count':
        return b.matched_keyword_count - a.matched_keyword_count
      case 'intent_a_pct':
        return b.intent_a_pct - a.intent_a_pct
      case 'estimated_traffic':
      default:
        return b.total_estimated_traffic - a.total_estimated_traffic
    }
  })

  return results.slice(0, limit)
}
