import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Admin API: 個別ドメイン操作
 *
 * PATCH  - ドメイン更新
 * DELETE - ドメイン削除
 */

interface RouteParams {
  params: Promise<{ id: string }>
}

// ドメイン更新
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

    // 対象ドメインの存在確認
    const { data: existingDomain, error: fetchError } = await supabase
      .from('allowed_domains')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingDomain) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'ドメインが見つかりません' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { plan, organization_name, max_users } = body

    // バリデーション
    if (plan && !['medica', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'プランは medica または enterprise を指定してください' } },
        { status: 400 }
      )
    }

    // 更新データを構築
    const updateData: Record<string, unknown> = {}
    if (plan !== undefined) updateData.plan = plan
    if (organization_name !== undefined) updateData.organization_name = organization_name
    if (max_users !== undefined) updateData.max_users = max_users

    // 更新
    const { data: updatedDomain, error: updateError } = await supabase
      .from('allowed_domains')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update domain:', updateError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'ドメインの更新に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedDomain,
    })
  } catch (error) {
    console.error('Update domain error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

// ドメイン削除
export async function DELETE(request: Request, { params }: RouteParams) {
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

    // 対象ドメインの存在確認
    const { data: existingDomain, error: fetchError } = await supabase
      .from('allowed_domains')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingDomain) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'ドメインが見つかりません' } },
        { status: 404 }
      )
    }

    // 削除
    const { error: deleteError } = await supabase
      .from('allowed_domains')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Failed to delete domain:', deleteError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'ドメインの削除に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { id },
    })
  } catch (error) {
    console.error('Delete domain error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
