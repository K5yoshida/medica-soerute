import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/tactics
 * GAP-011: 4フレームワークマッピング用の施策マスター取得
 *
 * Query params:
 * - category: PESOカテゴリでフィルタ (paid, earned, shared, owned)
 * - funnel: ファネルステージでフィルタ (1-4)
 * - conversion: コンバージョンステージでフィルタ (1-3)
 * - journey: ジャーニーステージでフィルタ (1-5)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const category = searchParams.get('category')
    const funnel = searchParams.get('funnel')
    const conversion = searchParams.get('conversion')
    const journey = searchParams.get('journey')

    let query = supabase
      .from('tactics_master')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('sort_order')

    if (category) {
      query = query.eq('category', category)
    }

    if (funnel) {
      query = query.contains('funnel_stages', [parseInt(funnel)])
    }

    if (conversion) {
      query = query.contains('conversion_stages', [parseInt(conversion)])
    }

    if (journey) {
      query = query.contains('journey_stages', [parseInt(journey)])
    }

    const { data, error } = await query

    if (error) {
      console.error('Tactics fetch error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'FETCH_ERROR', message: '施策データの取得に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Tactics API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
