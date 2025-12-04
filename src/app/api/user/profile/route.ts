import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@/types'

// プロフィール取得
export async function GET() {
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

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: userData as User,
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

// プロフィール更新
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
    const { companyName, email } = body

    // メールアドレスの更新（Auth側）
    if (email && email !== user.email) {
      const { error: authError } = await supabase.auth.updateUser({
        email,
      })

      if (authError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'EMAIL_UPDATE_FAILED',
              message: authError.message,
            },
          },
          { status: 400 }
        )
      }
    }

    // ユーザー情報の更新
    const updateData: Partial<User> = {}
    if (companyName !== undefined) {
      updateData.company_name = companyName
    }
    if (email) {
      updateData.email = email
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)

      if (updateError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UPDATE_FAILED',
              message: 'プロフィールの更新に失敗しました',
            },
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'プロフィールを更新しました',
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
