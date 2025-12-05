import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 媒体別流入経路データの取得
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
      .select('id, name, monthly_visits')
      .eq('id', id)
      .single()

    if (mediaError || !media) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '媒体が見つかりません' } },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '12', 10) // デフォルト12ヶ月分

    // 流入経路データを取得（最新順）
    const { data: trafficData, error: trafficError } = await supabase
      .from('traffic_data')
      .select('*')
      .eq('media_id', id)
      .order('period', { ascending: false })
      .limit(limit)

    if (trafficError) {
      console.error('Failed to fetch traffic data:', trafficError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: '流入経路データの取得に失敗しました' } },
        { status: 500 }
      )
    }

    // 最新データと前月データから変化率を計算
    let changeRate = null
    if (trafficData && trafficData.length >= 2) {
      const latest = trafficData[0]
      const previous = trafficData[1]
      changeRate = {
        search: latest.search_pct - previous.search_pct,
        direct: latest.direct_pct - previous.direct_pct,
        referral: latest.referral_pct - previous.referral_pct,
        display: latest.display_pct - previous.display_pct,
        email: latest.email_pct - previous.email_pct,
        social: latest.social_pct - previous.social_pct,
      }
    }

    // グラフ用にデータを整形（時系列順に戻す）
    const chartData = trafficData ? [...trafficData].reverse().map(d => ({
      period: d.period,
      search: d.search_pct,
      direct: d.direct_pct,
      referral: d.referral_pct,
      display: d.display_pct,
      email: d.email_pct,
      social: d.social_pct,
    })) : []

    return NextResponse.json({
      success: true,
      data: {
        media_id: id,
        media_name: media.name,
        monthly_visits: media.monthly_visits,
        latest: trafficData?.[0] || null,
        history: trafficData || [],
        change_rate: changeRate,
        chart_data: chartData,
      },
    })
  } catch (error) {
    console.error('Get media traffic error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
