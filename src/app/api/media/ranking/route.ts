import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface RankingResult {
  media_id: string
  media_name: string
  domain: string | null
  matched_keyword_count: number
  total_estimated_traffic: number
  // intent別の流入数（4カテゴリ: branded, transactional, informational, b2b）
  branded_traffic: number        // 指名検索
  transactional_traffic: number  // 応募意図
  informational_traffic: number  // 情報収集
  b2b_traffic: number            // 法人向け
  // intent別のキーワード数
  branded_count: number
  transactional_count: number
  informational_count: number
  b2b_count: number
  monthly_visits: number | null
  top_keywords: Array<{
    keyword: string
    monthly_search_volume: number
    estimated_traffic: number
    search_rank: number
    intent: string
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
    // ソート基準: transactional (応募意図), total (総流入), informational (情報収集), b2b (法人向け), keyword_count
    const sortBy = searchParams.get('sort_by') || 'transactional'
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

// キーワードデータの型（intentを含む）
interface KeywordData {
  media_id: string
  keyword: string
  monthly_search_volume: number | null
  estimated_traffic: number | null
  search_rank: number | null
  intent: string
}

// Supabase JSクライアントを使った実装
async function executeRankingQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  keywordList: string[],
  sortBy: string,
  limit: number
): Promise<RankingResult[]> {
  // Step 1: keywordsテーブルからquery_masterをジョインしてマッチするキーワードを取得
  // keywords.query_id -> query_master.id の関係
  let query = supabase
    .from('keywords')
    .select(`
      media_id,
      keyword,
      monthly_search_volume,
      estimated_traffic,
      search_rank,
      query_id,
      query_master (
        intent
      ),
      media_master!inner (
        id,
        name,
        domain,
        monthly_visits,
        is_active
      )
    `)
    .eq('media_master.is_active', true)

  // 各キーワードでILIKE検索（部分一致）
  for (const kw of keywordList) {
    query = query.ilike('keyword', `%${kw}%`)
  }

  const { data: keywordsData, error } = await query

  if (error || !keywordsData) {
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

  for (const kw of keywordsData) {
    const media = kw.media_master as unknown as {
      id: string
      name: string
      domain: string | null
      monthly_visits: number | null
    }
    // query_masterからintentを取得（存在しない場合はunknown）
    const queryMaster = kw.query_master as unknown as { intent: string } | null
    const intent = queryMaster?.intent || 'unknown'

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
      intent: intent,
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

    // intent別の流入数を計算（4カテゴリ: branded, transactional, informational, b2b）
    const brandedKeywords = media.keywords.filter(k => k.intent === 'branded')
    const transactionalKeywords = media.keywords.filter(k => k.intent === 'transactional')
    const informationalKeywords = media.keywords.filter(k => k.intent === 'informational')
    const b2bKeywords = media.keywords.filter(k => k.intent === 'b2b')

    const brandedTraffic = brandedKeywords.reduce((sum, k) => sum + (k.estimated_traffic || 0), 0)
    const transactionalTraffic = transactionalKeywords.reduce((sum, k) => sum + (k.estimated_traffic || 0), 0)
    const informationalTraffic = informationalKeywords.reduce((sum, k) => sum + (k.estimated_traffic || 0), 0)
    const b2bTraffic = b2bKeywords.reduce((sum, k) => sum + (k.estimated_traffic || 0), 0)

    // 上位5キーワードを取得（推定流入数順）
    const topKeywords = media.keywords
      .sort((a, b) => (b.estimated_traffic || 0) - (a.estimated_traffic || 0))
      .slice(0, 5)
      .map((k) => ({
        keyword: k.keyword,
        monthly_search_volume: k.monthly_search_volume || 0,
        estimated_traffic: k.estimated_traffic || 0,
        search_rank: k.search_rank || 0,
        intent: k.intent,
      }))

    results.push({
      media_id: media.media_id,
      media_name: media.media_name,
      domain: media.domain,
      monthly_visits: media.monthly_visits,
      matched_keyword_count: matchedKeywordCount,
      total_estimated_traffic: totalEstimatedTraffic,
      branded_traffic: brandedTraffic,
      transactional_traffic: transactionalTraffic,
      informational_traffic: informationalTraffic,
      b2b_traffic: b2bTraffic,
      branded_count: brandedKeywords.length,
      transactional_count: transactionalKeywords.length,
      informational_count: informationalKeywords.length,
      b2b_count: b2bKeywords.length,
      top_keywords: topKeywords,
    })
  })

  // Step 4: ソート
  // デフォルトは「応募意図の流入数 → 総流入数」の優先順位
  results.sort((a, b) => {
    switch (sortBy) {
      case 'transactional':
        // 応募意図の流入数でソート、同率なら総流入数
        if (b.transactional_traffic !== a.transactional_traffic) {
          return b.transactional_traffic - a.transactional_traffic
        }
        return b.total_estimated_traffic - a.total_estimated_traffic
      case 'total':
        // 総流入数でソート
        return b.total_estimated_traffic - a.total_estimated_traffic
      case 'informational':
        // 情報収集の流入数でソート
        if (b.informational_traffic !== a.informational_traffic) {
          return b.informational_traffic - a.informational_traffic
        }
        return b.total_estimated_traffic - a.total_estimated_traffic
      case 'b2b':
        // 法人向けの流入数でソート
        if (b.b2b_traffic !== a.b2b_traffic) {
          return b.b2b_traffic - a.b2b_traffic
        }
        return b.total_estimated_traffic - a.total_estimated_traffic
      case 'keyword_count':
        return b.matched_keyword_count - a.matched_keyword_count
      default:
        // デフォルトは応募意図
        if (b.transactional_traffic !== a.transactional_traffic) {
          return b.transactional_traffic - a.transactional_traffic
        }
        return b.total_estimated_traffic - a.total_estimated_traffic
    }
  })

  return results.slice(0, limit)
}
