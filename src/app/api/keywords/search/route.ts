import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface KeywordWithMedia {
  id: string
  media_id: string
  keyword: string
  monthly_search_volume: number | null
  search_rank: number | null
  estimated_traffic: number | null
  seo_difficulty: number | null
  cpc_usd: number | null
  competition: number | null
  url: string | null
  intent: string | null
  media_master: {
    id: string
    name: string
    domain: string | null
    category: string
    monthly_visits: number | null
    is_active: boolean
  }
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

    // ラッコキーワード風フィルターパラメータ
    const intent = searchParams.get('intent') // A,B,C のカンマ区切り
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

    // キーワードをmedia_masterと結合して検索
    let keywordQuery = supabase
      .from('keywords')
      .select(`
        *,
        media_master!inner (
          id,
          name,
          domain,
          category,
          monthly_visits,
          is_active
        )
      `, { count: 'exact' })
      .ilike('keyword', `%${query}%`)
      .eq('media_master.is_active', true)

    // カテゴリフィルター
    if (category && category !== 'all') {
      keywordQuery = keywordQuery.eq('media_master.category', category)
    }

    // 応募意図フィルター
    if (intent) {
      const intentArray = intent.split(',').map((i) => i.trim().toUpperCase())
      keywordQuery = keywordQuery.in('intent', intentArray)
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
      keywordQuery = keywordQuery.gte('search_rank', parseInt(rankMin, 10))
    }
    if (rankMax) {
      keywordQuery = keywordQuery.lte('search_rank', parseInt(rankMax, 10))
    }

    // 競合性フィルター
    if (competitionMin) {
      keywordQuery = keywordQuery.gte('competition', parseInt(competitionMin, 10))
    }
    if (competitionMax) {
      keywordQuery = keywordQuery.lte('competition', parseInt(competitionMax, 10))
    }

    // ソート
    const ascending = sortOrder === 'asc'
    switch (sortBy) {
      case 'keyword':
        keywordQuery = keywordQuery.order('keyword', { ascending })
        break
      case 'search_rank':
        keywordQuery = keywordQuery.order('search_rank', { ascending, nullsFirst: false })
        break
      case 'estimated_traffic':
        keywordQuery = keywordQuery.order('estimated_traffic', { ascending, nullsFirst: false })
        break
      case 'seo_difficulty':
        keywordQuery = keywordQuery.order('seo_difficulty', { ascending, nullsFirst: false })
        break
      case 'cpc_usd':
        keywordQuery = keywordQuery.order('cpc_usd', { ascending, nullsFirst: false })
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

    const { data: keywords, error: keywordsError, count } = await keywordQuery

    if (keywordsError) {
      console.error('Failed to search keywords:', keywordsError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'キーワード検索に失敗しました' } },
        { status: 500 }
      )
    }

    // 型キャスト
    const typedKeywords = keywords as KeywordWithMedia[] | null

    // 検索結果の統計を計算
    const stats = {
      total_results: count || 0,
      media_count: new Set(typedKeywords?.map((k: KeywordWithMedia) => k.media_id)).size,
    }

    // レスポンスデータを整形
    const formattedKeywords = typedKeywords?.map((k: KeywordWithMedia) => ({
      id: k.id,
      keyword: k.keyword,
      monthly_search_volume: k.monthly_search_volume,
      search_rank: k.search_rank,
      estimated_traffic: k.estimated_traffic,
      seo_difficulty: k.seo_difficulty,
      cpc_usd: k.cpc_usd,
      competition: k.competition,
      url: k.url,
      intent: k.intent,
      media: {
        id: k.media_master.id,
        name: k.media_master.name,
        domain: k.media_master.domain,
        category: k.media_master.category,
        monthly_visits: k.media_master.monthly_visits,
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
