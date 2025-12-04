import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 媒体一覧の取得
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

    let query = supabase
      .from('media_master')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    // フィルター適用
    if (category) {
      query = query.eq('category', category)
    }

    if (isActive !== null && isActive !== '') {
      query = query.eq('is_active', isActive === 'true')
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch media:', error)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: '媒体データの取得に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Get media error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
