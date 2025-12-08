import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Admin API: 個別媒体操作
 *
 * PATCH - 媒体更新
 */

interface RouteParams {
  params: Promise<{ id: string }>
}

// 媒体更新
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      )
    }

    // admin権限チェック
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } },
        { status: 403 }
      )
    }

    const serviceClient = createServiceClient()

    // 対象媒体の存在確認
    const { data: existingMedia, error: fetchError } = await serviceClient
      .from('media_master')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingMedia) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '媒体が見つかりません' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, domain, monthly_visits, bounce_rate, pages_per_visit, avg_visit_duration, is_active } = body

    // 更新データを構築
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (domain !== undefined) updateData.domain = domain
    if (monthly_visits !== undefined) updateData.monthly_visits = monthly_visits
    if (bounce_rate !== undefined) updateData.bounce_rate = bounce_rate
    if (pages_per_visit !== undefined) updateData.pages_per_visit = pages_per_visit
    if (avg_visit_duration !== undefined) updateData.avg_visit_duration = avg_visit_duration
    if (is_active !== undefined) updateData.is_active = is_active

    // データ更新日時を設定（SimilarWebデータ更新時）
    if (monthly_visits !== undefined || bounce_rate !== undefined || pages_per_visit !== undefined || avg_visit_duration !== undefined) {
      updateData.data_updated_at = new Date().toISOString()
    }

    // 更新
    const { data: updatedMedia, error: updateError } = await serviceClient
      .from('media_master')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update media:', updateError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: '媒体の更新に失敗しました' } },
        { status: 500 }
      )
    }

    // キーワード数を取得
    const { count: keywordCount } = await serviceClient
      .from('media_keywords')
      .select('*', { count: 'exact', head: true })
      .eq('media_id', id)

    return NextResponse.json({
      success: true,
      data: { ...updatedMedia, keyword_count: keywordCount || 0 },
    })
  } catch (error) {
    console.error('Update media error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
