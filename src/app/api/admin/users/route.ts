// ===========================================
// Users List API
// ユーザー一覧を取得する
// GET /api/admin/users
// 設計書: 13_APIエンドポイント一覧.md - 13.8 管理者API
// 画面: SC-902 ユーザー管理画面
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { UserRole, PlanType } from '@/types/database'

// ===== 型定義 =====

interface UserRow {
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

// UserItemはUserRowと同じ構造
// company_name はメールドメインから自動取得した値で上書きされる
type UserItem = UserRow

interface AllowedDomain {
  domain: string
  organization_name: string | null
}

interface UsersResponse {
  success: boolean
  data?: {
    users: UserItem[]
    total: number
    pagination: {
      current_page: number
      per_page: number
      total_pages: number
      total_count: number
    }
  }
  error?: {
    code?: string
    message: string
  }
}

// ===== メインハンドラー =====

export async function GET(request: NextRequest): Promise<NextResponse<UsersResponse>> {
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
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } },
        { status: 403 }
      )
    }

    // 3. クエリパラメータ取得
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('q') || searchParams.get('search')
    const role = searchParams.get('role')
    const plan = searchParams.get('plan')
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const perPage = Math.min(Math.max(parseInt(searchParams.get('per_page') || '20', 10), 1), 100)
    const offset = (page - 1) * perPage

    // 4. Service Clientでユーザー一覧を取得（RLSバイパス）
    const serviceClient = createServiceClient()

    let query = serviceClient
      .from('users')
      .select(
        `
        id,
        email,
        company_name,
        role,
        plan,
        monthly_analysis_count,
        monthly_analysis_limit,
        stripe_customer_id,
        stripe_subscription_id,
        created_at,
        updated_at
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    // 5. フィルター適用

    // 検索フィルター（メールまたは会社名で部分一致）
    if (search) {
      query = query.or(`email.ilike.%${search}%,company_name.ilike.%${search}%`)
    }

    // ロールフィルター
    if (role && role !== 'all') {
      query = query.eq('role', role)
    }

    // プランフィルター
    if (plan && plan !== 'all') {
      query = query.eq('plan', plan)
    }

    // 6. クエリ実行
    const { data: users, error: queryError, count } = await query

    if (queryError) {
      console.error('Users query error:', queryError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'ユーザー一覧の取得に失敗しました' } },
        { status: 500 }
      )
    }

    // 7. メールドメインから組織名を取得
    const userRows = (users || []) as UserRow[]

    // ユニークなドメインを抽出
    const allDomains = userRows.map(u => u.email.split('@')[1]).filter(Boolean)
    const uniqueDomains = Array.from(new Set(allDomains))

    // allowed_domains から組織名を取得
    let domainMap: Record<string, string> = {}
    if (uniqueDomains.length > 0) {
      const { data: domains } = await serviceClient
        .from('allowed_domains')
        .select('domain, organization_name')
        .in('domain', uniqueDomains)

      if (domains) {
        domainMap = (domains as AllowedDomain[]).reduce((acc, d) => {
          if (d.organization_name) {
            acc[d.domain] = d.organization_name
          }
          return acc
        }, {} as Record<string, string>)
      }
    }

    // ユーザーにorganization_nameを反映
    const usersWithOrg: UserItem[] = userRows.map(u => {
      const emailDomain = u.email.split('@')[1]
      return {
        ...u,
        company_name: domainMap[emailDomain] || u.company_name,
      }
    })

    // 8. レスポンス整形
    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / perPage)

    return NextResponse.json({
      success: true,
      data: {
        users: usersWithOrg,
        total: totalCount,
        pagination: {
          current_page: page,
          per_page: perPage,
          total_pages: totalPages,
          total_count: totalCount,
        },
      },
    })
  } catch (error) {
    console.error('Users list error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'ユーザー一覧の取得に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}
