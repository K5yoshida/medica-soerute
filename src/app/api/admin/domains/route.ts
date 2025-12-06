import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Admin API: ドメイン管理
 *
 * GET  - ドメイン一覧取得
 * POST - ドメイン追加
 */

// ドメイン一覧取得
export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const search = searchParams.get('search')
    const plan = searchParams.get('plan')

    const offset = (page - 1) * limit

    // クエリ構築
    let query = supabase
      .from('allowed_domains')
      .select('*', { count: 'exact' })

    // フィルター
    if (search) {
      query = query.or(`domain.ilike.%${search}%,organization_name.ilike.%${search}%`)
    }

    if (plan && plan !== 'all') {
      query = query.eq('plan', plan)
    }

    // ソート・ページネーション
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: domains, error: domainsError, count } = await query

    if (domainsError) {
      console.error('Failed to fetch domains:', domainsError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'ドメイン一覧の取得に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        domains: domains || [],
        total: count || 0,
        page,
        limit,
      },
    })
  } catch (error) {
    console.error('Get domains error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

// ドメイン追加
export async function POST(request: Request) {
  try {
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

    const body = await request.json()
    const { domain, plan, organization_name, max_users } = body

    // バリデーション
    if (!domain) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'ドメインは必須です' } },
        { status: 400 }
      )
    }

    if (!plan || !['medica', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'プランは medica または enterprise を指定してください' } },
        { status: 400 }
      )
    }

    // ドメイン形式チェック
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9-]+)+$/
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '正しいドメイン形式で入力してください' } },
        { status: 400 }
      )
    }

    // 重複チェック
    const { data: existing } = await supabase
      .from('allowed_domains')
      .select('id')
      .eq('domain', domain.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: 'このドメインは既に登録されています' } },
        { status: 409 }
      )
    }

    // 登録
    const { data: newDomain, error: insertError } = await supabase
      .from('allowed_domains')
      .insert({
        domain: domain.toLowerCase(),
        plan,
        organization_name: organization_name || null,
        max_users: max_users || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert domain:', insertError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'ドメインの登録に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newDomain,
    })
  } catch (error) {
    console.error('Create domain error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
