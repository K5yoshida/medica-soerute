import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request) {
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

    const body = await request.json()
    const { newPassword } = body

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'パスワードは8文字以上で入力してください',
          },
        },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PASSWORD_UPDATE_FAILED',
            message: updateError.message,
          },
        },
        { status: 400 }
      )
    }

    // ログを記録
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action_type: 'password_changed',
      metadata: {},
    })

    return NextResponse.json({
      success: true,
      message: 'パスワードを更新しました',
    })
  } catch (error) {
    console.error('Update password error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
