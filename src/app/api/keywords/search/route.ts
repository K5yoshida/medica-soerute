import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * media_keywords と keywords を JOIN した結果の型
 * 新スキーマ: media_keywords (媒体×キーワード紐付け) → keywords (キーワードマスター)
 */
interface MediaKeywordWithRelation {
  id: string
  keyword_id: string
  media_id: string
  ranking_position: number | null
  monthly_search_volume: number | null
  estimated_traffic: number | null
  cpc: number | null
  competition_level: number | null
  seo_difficulty: number | null
  landing_url: string | null
  keywords: {
    id: string
    keyword: string
    intent: string | null
    query_type: string | null
  } | null
  media_master: {
    id: string
    name: string
    domain: string | null
    category: string
    monthly_visits: number | null
    is_active: boolean
  } | null
}

// キーワード横断検索API
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sort_by') || 'monthly_search_volume'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // フィルターパラメータ
    const intent = searchParams.get('intent') // カンマ区切り
    const seoDifficultyMin = searchParams.get('seo_difficulty_min')
    const seoDifficultyMax = searchParams.get('seo_difficulty_max')
    const searchVolumeMin = searchParams.get('search_volume_min')
    const searchVolumeMax = searchParams.get('search_volume_max')
    const rankMin = searchParams.get('rank_min')
    const rankMax = searchParams.get('rank_max')
    const competitionMin = searchParams.get('competition_min')
    const competitionMax = searchParams.get('competition_max')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_QUERY', message: '検索キーワードは2文字以上で入力してください' } },
        { status: 400 }
      )
    }

    // 新スキーマ: media_keywords → keywords, media_master を JOIN
    // keywords テーブルのキーワードで検索
    let keywordQuery = supabase
      .from('media_keywords')
      .select(`
        id,
        keyword_id,
        media_id,
        ranking_position,
        monthly_search_volume,
        estimated_traffic,
        cpc,
        competition_level,
        seo_difficulty,
        landing_url,
        keywords!inner (
          id,
          keyword,
          intent,
          query_type
        ),
        media_master!inner (
          id,
          name,
          domain,
          category,
          monthly_visits,
          is_active
        )
      `, { count: 'exact' })
      .ilike('keywords.keyword', `%${query}%`)
      .eq('media_master.is_active', true)

    // カテゴリフィルター
    if (category && category !== 'all') {
      keywordQuery = keywordQuery.eq('media_master.category', category)
    }

    // 意図分類フィルター
    if (intent) {
      const intentArray = intent.split(',').map((i) => i.trim().toLowerCase())
      keywordQuery = keywordQuery.in('keywords.intent', intentArray)
    }

    // SEO難易度フィルター
    if (seoDifficultyMin) {
      keywordQuery = keywordQuery.gte('seo_difficulty', parseInt(seoDifficultyMin, 10))
    }
    if (seoDifficultyMax) {
      keywordQuery = keywordQuery.lte('seo_difficulty', parseInt(seoDifficultyMax, 10))
    }

    // 月間検索数フィルター
    if (searchVolumeMin) {
      keywordQuery = keywordQuery.gte('monthly_search_volume', parseInt(searchVolumeMin, 10))
    }
    if (searchVolumeMax) {
      keywordQuery = keywordQuery.lte('monthly_search_volume', parseInt(searchVolumeMax, 10))
    }

    // 検索順位フィルター
    if (rankMin) {
      keywordQuery = keywordQuery.gte('ranking_position', parseInt(rankMin, 10))
    }
    if (rankMax) {
      keywordQuery = keywordQuery.lte('ranking_position', parseInt(rankMax, 10))
    }

    // 競合性フィルター
    if (competitionMin) {
      keywordQuery = keywordQuery.gte('competition_level', parseInt(competitionMin, 10))
    }
    if (competitionMax) {
      keywordQuery = keywordQuery.lte('competition_level', parseInt(competitionMax, 10))
    }

    // ソート
    const ascending = sortOrder === 'asc'
    switch (sortBy) {
      case 'keyword':
        keywordQuery = keywordQuery.order('keywords(keyword)', { ascending })
        break
      case 'search_rank':
      case 'ranking_position':
        keywordQuery = keywordQuery.order('ranking_position', { ascending, nullsFirst: false })
        break
      case 'estimated_traffic':
        keywordQuery = keywordQuery.order('estimated_traffic', { ascending, nullsFirst: false })
        break
      case 'seo_difficulty':
        keywordQuery = keywordQuery.order('seo_difficulty', { ascending, nullsFirst: false })
        break
      case 'cpc':
      case 'cpc_usd':
        keywordQuery = keywordQuery.order('cpc', { ascending, nullsFirst: false })
        break
      case 'media_name':
        keywordQuery = keywordQuery.order('media_master(name)', { ascending })
        break
      case 'monthly_search_volume':
      default:
        keywordQuery = keywordQuery.order('monthly_search_volume', { ascending, nullsFirst: false })
        break
    }

    // ページネーション
    keywordQuery = keywordQuery.range(offset, offset + limit - 1)

    const { data: mediaKeywords, error: keywordsError, count } = await keywordQuery

    if (keywordsError) {
      console.error('Failed to search keywords:', keywordsError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'キーワード検索に失敗しました' } },
        { status: 500 }
      )
    }

    // 型キャスト
    const typedKeywords = mediaKeywords as MediaKeywordWithRelation[] | null

    // 検索結果の統計を計算
    const stats = {
      total_results: count || 0,
      media_count: new Set(typedKeywords?.map((k) => k.media_id)).size,
    }

    // レスポンスデータを整形（フロントエンドの期待する形式に変換）
    const formattedKeywords = typedKeywords?.map((mk) => ({
      id: mk.id,
      keyword: mk.keywords?.keyword || '',
      monthly_search_volume: mk.monthly_search_volume,
      search_rank: mk.ranking_position, // 互換性のため
      ranking_position: mk.ranking_position,
      estimated_traffic: mk.estimated_traffic,
      seo_difficulty: mk.seo_difficulty,
      cpc_usd: mk.cpc, // 互換性のため
      cpc: mk.cpc,
      competition: mk.competition_level, // 互換性のため
      competition_level: mk.competition_level,
      url: mk.landing_url, // landing_url を url として返す
      landing_url: mk.landing_url,
      intent: mk.keywords?.intent || 'unknown',
      query_type: mk.keywords?.query_type || null,
      media: {
        id: mk.media_master?.id || '',
        name: mk.media_master?.name || '',
        domain: mk.media_master?.domain || null,
        category: mk.media_master?.category || '',
        monthly_visits: mk.media_master?.monthly_visits || null,
      },
    }))

    return NextResponse.json({
      success: true,
      data: {
        query,
        keywords: formattedKeywords || [],
        stats,
      },
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Keyword search error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
