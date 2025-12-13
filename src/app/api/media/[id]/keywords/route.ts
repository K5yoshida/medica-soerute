import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

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
}

// 媒体別キーワード一覧の取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
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

    // 媒体の存在確認
    const { data: media, error: mediaError } = await supabase
      .from('media_master')
      .select('id, name')
      .eq('id', id)
      .single()

    if (mediaError || !media) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '媒体が見つかりません' } },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const exclude = searchParams.get('exclude') // 除外キーワード
    const sortBy = searchParams.get('sort_by') || 'monthly_search_volume'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // ラッコキーワード風フィルターパラメータ
    const intent = searchParams.get('intent') // branded,transactional,informational,b2b のカンマ区切り
    const queryType = searchParams.get('query_type') // Do,Know,Go,Buy のカンマ区切り
    const seoDifficultyMin = searchParams.get('seo_difficulty_min')
    const seoDifficultyMax = searchParams.get('seo_difficulty_max')
    const searchVolumeMin = searchParams.get('search_volume_min')
    const searchVolumeMax = searchParams.get('search_volume_max')
    const rankMin = searchParams.get('rank_min')
    const rankMax = searchParams.get('rank_max')
    const competitionMin = searchParams.get('competition_min')
    const competitionMax = searchParams.get('competition_max')
    const estimatedTrafficMin = searchParams.get('estimated_traffic_min')
    const estimatedTrafficMax = searchParams.get('estimated_traffic_max')
    const cpcMin = searchParams.get('cpc_min')
    const cpcMax = searchParams.get('cpc_max')

    // キーワード関連フィルタ（search, exclude, intent, queryType）がある場合、
    // 先にkeywordsテーブルでフィルタしてIDを取得（DBレベルでのフィルタリング）
    let matchingKeywordIds: string[] | null = null
    const hasKeywordFilter = search || exclude || intent || queryType

    if (hasKeywordFilter) {
      const { data: allKeywords, error: keywordError } = await supabase
        .from('keywords')
        .select('id, keyword, intent, query_type')

      if (keywordError) {
        console.error('Failed to fetch keywords:', keywordError)
        return NextResponse.json(
          { success: false, error: { code: 'DB_ERROR', message: 'キーワード検索に失敗しました' } },
          { status: 500 }
        )
      }

      type KeywordRecord = { id: string; keyword: string | null; intent: string | null; query_type: string | null }
      let filteredKeywordRecords = (allKeywords || []) as KeywordRecord[]

      // 検索フィルタ（部分一致）
      if (search) {
        const searchLower = search.toLowerCase()
        filteredKeywordRecords = filteredKeywordRecords.filter(
          (k) => k.keyword?.toLowerCase().includes(searchLower)
        )
      }

      // 除外フィルタ
      if (exclude) {
        const excludeLower = exclude.toLowerCase()
        filteredKeywordRecords = filteredKeywordRecords.filter(
          (k) => !k.keyword?.toLowerCase().includes(excludeLower)
        )
      }

      // intentフィルタ（検索カテゴリ）
      if (intent) {
        const intentArray = intent.split(',').map((i) => i.trim().toLowerCase())
        filteredKeywordRecords = filteredKeywordRecords.filter(
          (k) => k.intent && intentArray.includes(k.intent.toLowerCase())
        )
      }

      // queryTypeフィルタ（検索目的）
      if (queryType) {
        const queryTypeArray = queryType.split(',').map((q) => q.trim())
        filteredKeywordRecords = filteredKeywordRecords.filter(
          (k) => k.query_type && queryTypeArray.includes(k.query_type)
        )
      }

      matchingKeywordIds = filteredKeywordRecords.map((k) => k.id)

      // マッチするキーワードがない場合は空の結果を返す
      if (matchingKeywordIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            media_id: id,
            media_name: media.name,
            keywords: [],
            stats: { total: 0, total_monthly_search_volume: 0, total_estimated_traffic: 0 },
            intent_stats: {
              branded: { count: 0, volume: 0, traffic: 0 },
              transactional: { count: 0, volume: 0, traffic: 0 },
              informational: { count: 0, volume: 0, traffic: 0 },
              b2b: { count: 0, volume: 0, traffic: 0 },
              unknown: { count: 0, volume: 0, traffic: 0 },
            },
          },
          pagination: { total: 0, limit, offset, unfiltered_total: 0 },
        })
      }
    }

    // キーワード取得クエリ（media_keywordsからkeywordsをリレーションで取得）
    let query = supabase
      .from('media_keywords')
      .select('*, keywords(id, keyword, intent, query_type)', { count: 'exact' })
      .eq('media_id', id)

    // 検索フィルタがある場合、マッチするkeyword_idでフィルタ
    if (matchingKeywordIds !== null) {
      query = query.in('keyword_id', matchingKeywordIds)
    }

    // SEO難易度フィルター
    if (seoDifficultyMin) {
      query = query.gte('seo_difficulty', parseInt(seoDifficultyMin, 10))
    }
    if (seoDifficultyMax) {
      query = query.lte('seo_difficulty', parseInt(seoDifficultyMax, 10))
    }

    // 月間検索数フィルター
    if (searchVolumeMin) {
      query = query.gte('monthly_search_volume', parseInt(searchVolumeMin, 10))
    }
    if (searchVolumeMax) {
      query = query.lte('monthly_search_volume', parseInt(searchVolumeMax, 10))
    }

    // 検索順位フィルター
    if (rankMin) {
      query = query.gte('ranking_position', parseInt(rankMin, 10))
    }
    if (rankMax) {
      query = query.lte('ranking_position', parseInt(rankMax, 10))
    }

    // 競合性フィルター
    if (competitionMin) {
      query = query.gte('competition_level', parseInt(competitionMin, 10))
    }
    if (competitionMax) {
      query = query.lte('competition_level', parseInt(competitionMax, 10))
    }

    // 推定流入数フィルター
    if (estimatedTrafficMin) {
      query = query.gte('estimated_traffic', parseInt(estimatedTrafficMin, 10))
    }
    if (estimatedTrafficMax) {
      query = query.lte('estimated_traffic', parseInt(estimatedTrafficMax, 10))
    }

    // CPCフィルター
    if (cpcMin) {
      query = query.gte('cpc', parseFloat(cpcMin))
    }
    if (cpcMax) {
      query = query.lte('cpc', parseFloat(cpcMax))
    }

    // ソート
    const ascending = sortOrder === 'asc'
    switch (sortBy) {
      case 'keyword':
        // リレーションのソートは後処理で行う
        query = query.order('monthly_search_volume', { ascending: false, nullsFirst: false })
        break
      case 'search_rank':
      case 'ranking_position':
        query = query.order('ranking_position', { ascending, nullsFirst: false })
        break
      case 'estimated_traffic':
        query = query.order('estimated_traffic', { ascending, nullsFirst: false })
        break
      case 'seo_difficulty':
        query = query.order('seo_difficulty', { ascending, nullsFirst: false })
        break
      case 'cpc':
      case 'cpc_usd':
        query = query.order('cpc', { ascending, nullsFirst: false })
        break
      case 'monthly_search_volume':
      default:
        query = query.order('monthly_search_volume', { ascending, nullsFirst: false })
        break
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    const { data: mediaKeywords, error: keywordsError, count } = await query

    if (keywordsError) {
      console.error('Failed to fetch keywords:', keywordsError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'キーワードデータの取得に失敗しました' } },
        { status: 500 }
      )
    }

    // 全てのフィルタはDBレベルで処理済み（search, exclude, intent, 数値フィルタ）
    const filteredKeywords = (mediaKeywords || []) as MediaKeywordWithRelation[]

    // レスポンス用にフラット化
    const keywords = filteredKeywords.map((mk) => ({
      id: mk.id,
      keyword_id: mk.keyword_id,
      keyword: mk.keywords?.keyword || '',
      intent: mk.keywords?.intent || 'unknown',
      query_type: mk.keywords?.query_type || null,
      ranking_position: mk.ranking_position,
      search_rank: mk.ranking_position, // 互換性のため
      monthly_search_volume: mk.monthly_search_volume,
      estimated_traffic: mk.estimated_traffic,
      cpc: mk.cpc,
      cpc_usd: mk.cpc, // 互換性のため
      competition_level: mk.competition_level,
      competition: mk.competition_level, // 互換性のため
      seo_difficulty: mk.seo_difficulty,
      landing_url: mk.landing_url,
      url: mk.landing_url, // 互換性のため
    }))

    // 統計情報を計算
    const { data: allMediaKeywords } = await supabase
      .from('media_keywords')
      .select('monthly_search_volume, estimated_traffic, keywords(intent)')
      .eq('media_id', id)

    type AllKeywordStats = {
      monthly_search_volume: number | null
      estimated_traffic: number | null
      keywords: { intent: string | null } | null
    }
    const typedAllKeywords = allMediaKeywords as AllKeywordStats[] | null

    // 全体統計
    const stats = {
      total: typedAllKeywords?.length || 0,
      total_monthly_search_volume: typedAllKeywords?.reduce((sum, k) => sum + (k.monthly_search_volume || 0), 0) || 0,
      total_estimated_traffic: typedAllKeywords?.reduce((sum, k) => sum + (k.estimated_traffic || 0), 0) || 0,
    }

    // 意図別統計（4カテゴリ: branded, transactional, informational, b2b + unknown）
    const intentStats = {
      branded: { count: 0, volume: 0, traffic: 0 },
      transactional: { count: 0, volume: 0, traffic: 0 },
      informational: { count: 0, volume: 0, traffic: 0 },
      b2b: { count: 0, volume: 0, traffic: 0 },
      unknown: { count: 0, volume: 0, traffic: 0 },
    }

    typedAllKeywords?.forEach((k) => {
      const intent = k.keywords?.intent as keyof typeof intentStats | null
      if (intent && intent in intentStats) {
        intentStats[intent].count += 1
        intentStats[intent].volume += k.monthly_search_volume || 0
        intentStats[intent].traffic += k.estimated_traffic || 0
      } else {
        intentStats.unknown.count += 1
        intentStats.unknown.volume += k.monthly_search_volume || 0
        intentStats.unknown.traffic += k.estimated_traffic || 0
      }
    })

    // 全てのフィルタはDBレベルで処理済みなので、countが正確な件数
    return NextResponse.json({
      success: true,
      data: {
        media_id: id,
        media_name: media.name,
        keywords: keywords,
        stats,
        intent_stats: intentStats,
      },
      pagination: {
        total: count || 0,
        limit,
        offset,
        unfiltered_total: count || 0,
      },
    })
  } catch (error) {
    console.error('Get media keywords error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
