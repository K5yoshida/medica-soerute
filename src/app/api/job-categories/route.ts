import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/job-categories
 * 職種マスター取得API
 * job_categoriesテーブルから有効な職種一覧を取得
 */
export async function GET() {
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('job_categories')
      .select('id, code, name, category, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Job categories fetch error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: '職種データの取得に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Job categories API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
