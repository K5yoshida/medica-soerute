import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface MediaMaster {
  id: string
  name: string
  category: string
  description: string | null
  domain: string | null
  monthly_visits: number | null
  bounce_rate: number | null
  pages_per_visit: number | null
  avg_visit_duration: number | null
  is_active: boolean
  data_updated_at: string | null
  created_at: string
  updated_at: string
}

interface KeywordCount {
  media_id: string
}

interface TrafficData {
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

// 媒体一覧の取得（トラフィックデータ・キーワード数を含む）
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
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const isActive = searchParams.get('is_active')
    const sortBy = searchParams.get('sort_by') || 'name'
    const sortOrder = searchParams.get('sort_order') || 'asc'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // 基本的な媒体データを取得
    let query = supabase
      .from('media_master')
      .select('*', { count: 'exact' })

    // フィルター適用
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (isActive !== null && isActive !== '') {
      query = query.eq('is_active', isActive === 'true')
    } else {
      query = query.eq('is_active', true)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,domain.ilike.%${search}%`)
    }

    // ソート
    const ascending = sortOrder === 'asc'
    switch (sortBy) {
      case 'monthly_visits':
        query = query.order('monthly_visits', { ascending, nullsFirst: false })
        break
      case 'category':
        query = query.order('category', { ascending }).order('name', { ascending: true })
        break
      default:
        query = query.order('name', { ascending })
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    const { data: mediaData, error: mediaError, count } = await query

    if (mediaError) {
      console.error('Failed to fetch media:', mediaError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: '媒体データの取得に失敗しました' } },
        { status: 500 }
      )
    }

    if (!mediaData || mediaData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { total: 0, limit, offset },
      })
    }

    // 型キャスト
    const typedMediaData = mediaData as MediaMaster[]

    // 各媒体のキーワード数を取得
    const mediaIds = typedMediaData.map((m: MediaMaster) => m.id)

    const { data: keywordCounts } = await supabase
      .from('keywords')
      .select('media_id')
      .in('media_id', mediaIds)

    // 各媒体の最新トラフィックデータを取得
    const { data: trafficData } = await supabase
      .from('traffic_data')
      .select('*')
      .in('media_id', mediaIds)
      .order('period', { ascending: false })

    // キーワード数をカウント
    const typedKeywordCounts = keywordCounts as KeywordCount[] | null
    const keywordCountMap: Record<string, number> = {}
    if (typedKeywordCounts) {
      typedKeywordCounts.forEach((k: KeywordCount) => {
        keywordCountMap[k.media_id] = (keywordCountMap[k.media_id] || 0) + 1
      })
    }

    // 最新のトラフィックデータをマップ（media_idごとに最新のものだけ）
    const typedTrafficData = trafficData as TrafficData[] | null
    const trafficMap: Record<string, TrafficData> = {}
    if (typedTrafficData) {
      typedTrafficData.forEach((t: TrafficData) => {
        if (!trafficMap[t.media_id]) {
          trafficMap[t.media_id] = t
        }
      })
    }

    // データを結合
    const enrichedData = typedMediaData.map((media: MediaMaster) => ({
      ...media,
      keyword_count: keywordCountMap[media.id] || 0,
      latest_traffic: trafficMap[media.id] || null,
    }))

    return NextResponse.json({
      success: true,
      data: enrichedData,
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Get media error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
