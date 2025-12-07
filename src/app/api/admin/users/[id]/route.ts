// ===========================================
// User CRUD API
// ユーザー情報の取得・更新・削除
// GET /api/admin/users/{user_id}
// PATCH /api/admin/users/{user_id}
// DELETE /api/admin/users/{user_id}
// 設計書: 13_APIエンドポイント一覧.md - 13.8 管理者API
// 画面: SC-902 ユーザー管理画面
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { UserRole, PlanType } from '@/types/database'

// ===== 型定義（既存の型定義を活用） =====

interface UpdateUserRequest {
  role?: string  // バリデーション前なのでstring
  plan?: string  // バリデーション前なのでstring
  company_name?: string
  monthly_analysis_limit?: number
}

interface UserItem {
  id: string
  email: string
  company_name: string | null
  role: UserRole
  plan: PlanType
  monthly_analysis_count: number
  monthly_analysis_limit: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

interface UserUpdateResponse {
  success: boolean
  data?: {
    user: UserItem
  }
  error?: {
    code?: string
    message: string
  }
}

// ===== バリデーション（設計書に基づく正式な値） =====

// 設計書 12_DB一覧.md より: role = 'admin' | 'internal' | 'user'
const VALID_ROLES: UserRole[] = ['admin', 'internal', 'user']

// 設計書 12_DB一覧.md より: plan = 'medica' | 'enterprise' | 'trial' | 'starter' | 'professional'
const VALID_PLANS: PlanType[] = ['medica', 'enterprise', 'trial', 'starter', 'professional']

function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole)
}

function isValidPlan(plan: string): plan is PlanType {
  return VALID_PLANS.includes(plan as PlanType)
}

/**
 * role/plan の組み合わせバリデーション
 * 設計書 12_DB一覧.md より:
 * - admin: 任意のプラン可
 * - internal: medica/enterprise のみ許可
 * - user: trial/starter/professional のみ許可
 */
function validateRolePlanCombination(role: UserRole, plan: PlanType): boolean {
  if (role === 'admin') {
    // adminは全プラン可
    return true
  }
  if (role === 'internal') {
    // internalは medica/enterprise のみ
    return plan === 'medica' || plan === 'enterprise'
  }
  if (role === 'user') {
    // userは trial/starter/professional のみ
    return plan === 'trial' || plan === 'starter' || plan === 'professional'
  }
  return false
}

// ===== メインハンドラー =====

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UserUpdateResponse>> {
  try {
    const { id: userId } = await params

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
    const body: UpdateUserRequest = await request.json()

    // 4. バリデーション
    let validatedRole: UserRole | undefined
    let validatedPlan: PlanType | undefined

    if (body.role !== undefined) {
      if (!isValidRole(body.role)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `roleは ${VALID_ROLES.join(', ')} のいずれかである必要があります`,
            },
          },
          { status: 400 }
        )
      }
      validatedRole = body.role
    }

    if (body.plan !== undefined) {
      if (!isValidPlan(body.plan)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `planは ${VALID_PLANS.join(', ')} のいずれかである必要があります`,
            },
          },
          { status: 400 }
        )
      }
      validatedPlan = body.plan
    }

    // 5. Service Clientで対象ユーザーを取得
    const serviceClient = createServiceClient()

    const { data: targetUser, error: fetchError } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '指定されたユーザーが見つかりません' } },
        { status: 404 }
      )
    }

    // 6. role/plan組み合わせバリデーション
    const newRole = validatedRole ?? targetUser.role
    const newPlan = validatedPlan ?? targetUser.plan

    if (!validateRolePlanCombination(newRole, newPlan)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `role "${newRole}" と plan "${newPlan}" の組み合わせは許可されていません`,
          },
        },
        { status: 400 }
      )
    }

    // 7. 更新データ構築
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validatedRole !== undefined) {
      updateData.role = validatedRole
    }
    if (validatedPlan !== undefined) {
      updateData.plan = validatedPlan
    }
    if (body.company_name !== undefined) {
      updateData.company_name = body.company_name
    }
    if (body.monthly_analysis_limit !== undefined) {
      updateData.monthly_analysis_limit = body.monthly_analysis_limit
    }

    // 8. ユーザー更新
    const { data: updatedUser, error: updateError } = await serviceClient
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('User update error:', updateError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'ユーザー情報の更新に失敗しました' } },
        { status: 500 }
      )
    }

    // 9. レスポンス返却
    return NextResponse.json({
      success: true,
      data: {
        user: updatedUser as UserItem,
      },
    })
  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'ユーザー情報の更新に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}

// GET: 単一ユーザー取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UserUpdateResponse>> {
  try {
    const { id: userId } = await params

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

    // 3. Service Clientでユーザー取得
    const serviceClient = createServiceClient()

    const { data: targetUser, error: fetchError } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '指定されたユーザーが見つかりません' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        user: targetUser as UserItem,
      },
    })
  } catch (error) {
    console.error('User fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'ユーザー情報の取得に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}

// DELETE: ユーザー削除
interface DeleteResponse {
  success: boolean
  error?: {
    code?: string
    message: string
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<DeleteResponse>> {
  try {
    const { id: userId } = await params

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

    // 3. 自分自身の削除を禁止
    if (userId === user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '自分自身を削除することはできません' } },
        { status: 403 }
      )
    }

    // 4. Service Clientで対象ユーザーの存在確認
    const serviceClient = createServiceClient()

    const { data: targetUser, error: fetchError } = await serviceClient
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '指定されたユーザーが見つかりません' } },
        { status: 404 }
      )
    }

    // 5. 他の管理者を削除する場合の追加確認（オプション：将来の拡張用）
    // 現時点では管理者も削除可能とする

    // 6. usersテーブルから削除
    // auth.usersへのカスケード削除はDB側で設定されている想定
    const { error: deleteError } = await serviceClient
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('User delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'ユーザーの削除に失敗しました' } },
        { status: 500 }
      )
    }

    // 7. 設計書に従い204 No Contentを返却
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('User delete error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'ユーザーの削除に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}
