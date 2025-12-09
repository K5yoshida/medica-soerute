import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface RankingResult {
  media_id: string
  media_name: string
  domain: string | null
  matched_keyword_count: number
  total_estimated_traffic: number
  // intent別の流入数（6カテゴリ）
  branded_media_traffic: number      // 指名検索（媒体）
  branded_customer_traffic: number   // 指名検索（顧客）
  branded_ambiguous_traffic: number  // 指名検索（曖昧）
  transactional_traffic: number      // 応募意図
  informational_traffic: number      // 情報収集
  b2b_traffic: number                // 法人向け
  // intent別のキーワード数
  branded_media_count: number
  branded_customer_count: number
  branded_ambiguous_count: number
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
    // ソート基準: transactional, total, branded_media, branded_customer, branded_ambiguous, informational, b2b, keyword_count
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
// 新スキーマ: keywords（キーワードマスター）+ media_keywords（媒体×キーワード紐付け）
async function executeRankingQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  keywordList: string[],
  sortBy: string,
  limit: number
): Promise<RankingResult[]> {
  // Step 1: media_keywordsテーブルからkeywordsとmedia_masterをジョインしてマッチするキーワードを取得
  // media_keywords.keyword_id -> keywords.id, media_keywords.media_id -> media_master.id
  let query = supabase
    .from('media_keywords')
    .select(`
      keyword_id,
      media_id,
      monthly_search_volume,
      estimated_traffic,
      ranking_position,
      keywords!inner (
        keyword,
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

  // 各キーワードでILIKE検索（部分一致）- keywordsテーブルのkeywordカラムに対して
  for (const kw of keywordList) {
    query = query.ilike('keywords.keyword', `%${kw}%`)
  }

  const { data: mediaKeywordsData, error } = await query

  if (error || !mediaKeywordsData) {
    console.error('Media keywords query error:', error)
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

  for (const mk of mediaKeywordsData) {
    const media = mk.media_master as unknown as {
      id: string
      name: string
      domain: string | null
      monthly_visits: number | null
    }
    // keywordsテーブルからintentを取得
    const keywordData = mk.keywords as unknown as { keyword: string; intent: string } | null
    const intent = keywordData?.intent || 'unknown'
    const keyword = keywordData?.keyword || ''

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
      media_id: mk.media_id,
      keyword: keyword,
      monthly_search_volume: mk.monthly_search_volume,
      estimated_traffic: mk.estimated_traffic,
      search_rank: mk.ranking_position,
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

    // intent別の流入数を計算（6カテゴリ）
    const brandedMediaKeywords = media.keywords.filter(k => k.intent === 'branded_media')
    const brandedCustomerKeywords = media.keywords.filter(k => k.intent === 'branded_customer')
    const brandedAmbiguousKeywords = media.keywords.filter(k => k.intent === 'branded_ambiguous')
    const transactionalKeywords = media.keywords.filter(k => k.intent === 'transactional')
    const informationalKeywords = media.keywords.filter(k => k.intent === 'informational')
    const b2bKeywords = media.keywords.filter(k => k.intent === 'b2b')

    const brandedMediaTraffic = brandedMediaKeywords.reduce((sum, k) => sum + (k.estimated_traffic || 0), 0)
    const brandedCustomerTraffic = brandedCustomerKeywords.reduce((sum, k) => sum + (k.estimated_traffic || 0), 0)
    const brandedAmbiguousTraffic = brandedAmbiguousKeywords.reduce((sum, k) => sum + (k.estimated_traffic || 0), 0)
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
      branded_media_traffic: brandedMediaTraffic,
      branded_customer_traffic: brandedCustomerTraffic,
      branded_ambiguous_traffic: brandedAmbiguousTraffic,
      transactional_traffic: transactionalTraffic,
      informational_traffic: informationalTraffic,
      b2b_traffic: b2bTraffic,
      branded_media_count: brandedMediaKeywords.length,
      branded_customer_count: brandedCustomerKeywords.length,
      branded_ambiguous_count: brandedAmbiguousKeywords.length,
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
      case 'branded_media':
        // 媒体指名検索の流入数でソート
        if (b.branded_media_traffic !== a.branded_media_traffic) {
          return b.branded_media_traffic - a.branded_media_traffic
        }
        return b.total_estimated_traffic - a.total_estimated_traffic
      case 'branded_customer':
        // 顧客指名検索の流入数でソート
        if (b.branded_customer_traffic !== a.branded_customer_traffic) {
          return b.branded_customer_traffic - a.branded_customer_traffic
        }
        return b.total_estimated_traffic - a.total_estimated_traffic
      case 'branded_ambiguous':
        // 曖昧指名検索の流入数でソート
        if (b.branded_ambiguous_traffic !== a.branded_ambiguous_traffic) {
          return b.branded_ambiguous_traffic - a.branded_ambiguous_traffic
        }
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
