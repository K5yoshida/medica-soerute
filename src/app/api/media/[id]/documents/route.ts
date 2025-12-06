import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 媒体資料一覧の取得
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

    // 資料一覧取得
    const { data: documents, error: documentsError } = await supabase
      .from('media_documents')
      .select('*')
      .eq('media_id', id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Failed to fetch documents:', documentsError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: '資料データの取得に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        media_id: id,
        media_name: media.name,
        documents: documents || [],
      },
    })
  } catch (error) {
    console.error('Get media documents error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
