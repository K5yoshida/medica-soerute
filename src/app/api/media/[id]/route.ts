import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface KeywordData {
  intent: string | null
  search_volume: number | null
  estimated_traffic: number | null
}

// 媒体詳細の取得
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

    // 媒体基本情報を取得
    const { data: media, error: mediaError } = await supabase
      .from('media_master')
      .select('*')
      .eq('id', id)
      .single()

    if (mediaError || !media) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '媒体が見つかりません' } },
        { status: 404 }
      )
    }

    // キーワード統計を取得
    const { data: keywords } = await supabase
      .from('keywords')
      .select('intent, search_volume, estimated_traffic')
      .eq('media_id', id)

    // トラフィックデータ（最新3ヶ月）を取得
    const { data: trafficHistory } = await supabase
      .from('traffic_data')
      .select('*')
      .eq('media_id', id)
      .order('period', { ascending: false })
      .limit(3)

    // キーワード統計を計算
    const typedKeywords = keywords as KeywordData[] | null
    const keywordStats = {
      total: typedKeywords?.length || 0,
      intent_a: typedKeywords?.filter((k: KeywordData) => k.intent === 'A').length || 0,
      intent_b: typedKeywords?.filter((k: KeywordData) => k.intent === 'B').length || 0,
      intent_c: typedKeywords?.filter((k: KeywordData) => k.intent === 'C').length || 0,
      total_search_volume: typedKeywords?.reduce((sum: number, k: KeywordData) => sum + (k.search_volume || 0), 0) || 0,
      total_estimated_traffic: typedKeywords?.reduce((sum: number, k: KeywordData) => sum + (k.estimated_traffic || 0), 0) || 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        ...media,
        keyword_stats: keywordStats,
        traffic_history: trafficHistory || [],
      },
    })
  } catch (error) {
    console.error('Get media detail error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
