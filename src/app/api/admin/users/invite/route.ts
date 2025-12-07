// ===========================================
// User Invite API
// ユーザー招待メール送信
// POST /api/admin/users/invite
// 設計書: 13_APIエンドポイント一覧.md - 13.8 管理者API
// 画面: SC-902 ユーザー管理画面
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { UserRole, PlanType } from '@/types/database'

// ===== 型定義 =====

interface InviteUserRequest {
  email: string
  role?: string
  plan?: string
  memo?: string
}

interface InviteResponse {
  success: boolean
  data?: {
    invitation_id: string
    email: string
    expires_at: string
  }
  error?: {
    code?: string
    message: string
  }
}

// ===== バリデーション =====

const VALID_ROLES: UserRole[] = ['admin', 'internal', 'user']
const VALID_PLANS: PlanType[] = ['medica', 'enterprise', 'trial', 'starter', 'professional']

function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole)
}

function isValidPlan(plan: string): plan is PlanType {
  return VALID_PLANS.includes(plan as PlanType)
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * role/plan の組み合わせバリデーション
 */
function validateRolePlanCombination(role: UserRole, plan: PlanType): boolean {
  if (role === 'admin') {
    return true
  }
  if (role === 'internal') {
    return plan === 'medica' || plan === 'enterprise'
  }
  if (role === 'user') {
    return plan === 'trial' || plan === 'starter' || plan === 'professional'
  }
  return false
}

// ===== メインハンドラー =====

export async function POST(request: NextRequest): Promise<NextResponse<InviteResponse>> {
  try {
    // 1. 認証チェック
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

    // 2. admin権限チェック
    const { data: currentUserData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!currentUserData || currentUserData.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } },
        { status: 403 }
      )
    }

    // 3. リクエストボディ取得
    const body: InviteUserRequest = await request.json()

    // 4. バリデーション
    if (!body.email) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'メールアドレスは必須です' } },
        { status: 400 }
      )
    }

    if (!isValidEmail(body.email)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '有効なメールアドレスを入力してください' } },
        { status: 400 }
      )
    }

    const role: UserRole = body.role && isValidRole(body.role) ? body.role : 'user'
    const plan: PlanType = body.plan && isValidPlan(body.plan) ? body.plan : 'trial'

    if (!validateRolePlanCombination(role, plan)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `role "${role}" と plan "${plan}" の組み合わせは許可されていません`,
          },
        },
        { status: 400 }
      )
    }

    // 5. 既存ユーザーチェック
    const serviceClient = createServiceClient()

    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('email', body.email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'このメールアドレスは既に登録されています' } },
        { status: 409 }
      )
    }

    // 6. Supabase Auth で招待メール送信
    // inviteUserByEmail はサービスロールキーが必要
    const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
      body.email,
      {
        data: {
          role,
          plan,
          invited_by: user.id,
          memo: body.memo || null,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=invite`,
      }
    )

    if (inviteError) {
      console.error('Invite user error:', inviteError)
      return NextResponse.json(
        { success: false, error: { code: 'INVITE_ERROR', message: '招待メールの送信に失敗しました' } },
        { status: 500 }
      )
    }

    // 7. 招待有効期限（7日後）
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // 8. レスポンス返却
    return NextResponse.json(
      {
        success: true,
        data: {
          invitation_id: inviteData.user?.id || `inv_${Date.now()}`,
          email: body.email,
          expires_at: expiresAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Invite user error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'ユーザー招待に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}
