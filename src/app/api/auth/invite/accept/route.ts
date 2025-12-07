import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { UserRole, PlanType } from '@/types/database'

interface AcceptInviteRequest {
  token: string
  password: string
  password_confirmation: string
  display_name?: string
}

/**
 * POST /api/auth/invite/accept
 * 招待受諾API
 *
 * Supabaseの招待リンクをクリックした後、パスワード設定と追加情報を登録
 */
export async function POST(request: NextRequest) {
  try {
    const body: AcceptInviteRequest = await request.json()

    // バリデーション
    if (!body.token) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '招待トークンは必須です' } },
        { status: 400 }
      )
    }

    if (!body.password) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'パスワードは必須です' } },
        { status: 400 }
      )
    }

    if (body.password.length < 8) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'パスワードは8文字以上で入力してください' } },
        { status: 400 }
      )
    }

    if (body.password !== body.password_confirmation) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'パスワードが一致しません' } },
        { status: 400 }
      )
    }

    // Supabaseクライアントを作成
    const supabase = await createClient()

    // トークンを使ってセッションを確立（OTPとして扱う）
    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: body.token,
      type: 'invite',
    })

    if (verifyError || !sessionData.user) {
      console.error('Token verification error:', verifyError)
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: '招待トークンが無効または期限切れです' } },
        { status: 400 }
      )
    }

    const user = sessionData.user

    // パスワードを更新
    const { error: updateError } = await supabase.auth.updateUser({
      password: body.password,
    })

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { success: false, error: { code: 'UPDATE_ERROR', message: 'パスワードの設定に失敗しました' } },
        { status: 500 }
      )
    }

    // ユーザーメタデータから招待時の情報を取得
    const userMetadata = user.user_metadata || {}
    const role = (userMetadata.role as UserRole) || 'user'
    const plan = (userMetadata.plan as PlanType) || 'trial'

    // サービスクライアントでusersテーブルにレコードを作成/更新
    const serviceClient = createServiceClient()

    // 既存のユーザーレコードを確認
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!existingUser) {
      // 新規ユーザーレコード作成
      const trialEndsAt = plan === 'trial'
        ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        : null

      const { error: insertError } = await serviceClient
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          company_name: body.display_name || null,
          role,
          plan,
          trial_ends_at: trialEndsAt,
          monthly_analysis_count: 0,
          monthly_analysis_limit: plan === 'medica' ? 999999 : 20,
          monthly_peso_count: 0,
          monthly_peso_limit: plan === 'medica' ? 999999 : 10,
        })

      if (insertError) {
        console.error('User insert error:', insertError)
        // Auth側のユーザーは作成済みなので続行
      }
    } else {
      // 既存ユーザーの更新（display_nameがあれば）
      if (body.display_name) {
        await serviceClient
          .from('users')
          .update({ company_name: body.display_name })
          .eq('id', user.id)
      }
    }

    // 使用ログを記録
    await serviceClient.from('usage_logs').insert({
      user_id: user.id,
      action_type: 'invite_accepted',
      metadata: {
        invited_by: userMetadata.invited_by,
        role,
        plan,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        access_token: sessionData.session?.access_token,
        user: {
          id: user.id,
          email: user.email,
          role,
          plan,
        },
      },
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : '招待の受諾に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}
