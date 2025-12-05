import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface KeywordStats {
  monthly_search_volume: number | null
  estimated_traffic: number | null
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
    const sortBy = searchParams.get('sort_by') || 'monthly_search_volume'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // キーワード取得クエリ
    let query = supabase
      .from('keywords')
      .select('*', { count: 'exact' })
      .eq('media_id', id)

    // フィルター
    if (search) {
      query = query.ilike('keyword', `%${search}%`)
    }

    // ソート
    const ascending = sortOrder === 'asc'
    switch (sortBy) {
      case 'keyword':
        query = query.order('keyword', { ascending })
        break
      case 'search_rank':
        query = query.order('search_rank', { ascending, nullsFirst: false })
        break
      case 'estimated_traffic':
        query = query.order('estimated_traffic', { ascending, nullsFirst: false })
        break
      case 'seo_difficulty':
        query = query.order('seo_difficulty', { ascending, nullsFirst: false })
        break
      case 'cpc_usd':
        query = query.order('cpc_usd', { ascending, nullsFirst: false })
        break
      case 'monthly_search_volume':
      default:
        query = query.order('monthly_search_volume', { ascending, nullsFirst: false })
        break
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    const { data: keywords, error: keywordsError, count } = await query

    if (keywordsError) {
      console.error('Failed to fetch keywords:', keywordsError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'キーワードデータの取得に失敗しました' } },
        { status: 500 }
      )
    }

    // 統計情報を計算
    const { data: allKeywords } = await supabase
      .from('keywords')
      .select('monthly_search_volume, estimated_traffic')
      .eq('media_id', id)

    const typedAllKeywords = allKeywords as KeywordStats[] | null

    const stats = {
      total: typedAllKeywords?.length || 0,
      total_monthly_search_volume: typedAllKeywords?.reduce((sum: number, k: KeywordStats) => sum + (k.monthly_search_volume || 0), 0) || 0,
      total_estimated_traffic: typedAllKeywords?.reduce((sum: number, k: KeywordStats) => sum + (k.estimated_traffic || 0), 0) || 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        media_id: id,
        media_name: media.name,
        keywords: keywords || [],
        stats,
      },
      pagination: {
        total: count || 0,
        limit,
        offset,
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
