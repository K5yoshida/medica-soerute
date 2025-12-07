// ===========================================
// System Logs API
// システムログ取得
// GET /api/admin/logs
// 設計書: 13_APIエンドポイント一覧.md - 13.8 管理者API
// 画面: SC-909 ログ管理画面
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ===== 型定義 =====

interface LogEntry {
  id: string
  user_id: string
  action_type: string
  metadata: Record<string, unknown> | null
  created_at: string
  user_email?: string
}

interface LogsResponse {
  success: boolean
  data?: {
    logs: LogEntry[]
    pagination: {
      current_page: number
      per_page: number
      total_pages: number
      total_count: number
    }
    filters: {
      types: string[]
    }
  }
  error?: {
    code?: string
    message: string
  }
}

interface UsageLogRow {
  id: string
  user_id: string
  action_type: string
  metadata: Record<string, unknown> | null
  created_at: string
}

interface ActionTypeRow {
  action_type: string
}

// ===== メインハンドラー =====

export async function GET(request: NextRequest): Promise<NextResponse<LogsResponse>> {
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
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const perPage = Math.min(Math.max(parseInt(searchParams.get('per_page') || '50', 10), 1), 100)
    const offset = (page - 1) * perPage

    // 4. Service Clientでデータ取得
    const serviceClient = createServiceClient()

    // 4.1 ログデータを取得
    let query = serviceClient
      .from('usage_logs')
      .select('id, user_id, action_type, metadata, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    // フィルター適用
    if (type) {
      query = query.eq('action_type', type)
    }

    if (startDateParam) {
      query = query.gte('created_at', new Date(startDateParam).toISOString())
    }

    if (endDateParam) {
      query = query.lte('created_at', new Date(endDateParam).toISOString())
    }

    const { data: logs, error: logsError, count } = await query

    if (logsError) {
      console.error('Logs query error:', logsError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'ログデータの取得に失敗しました' } },
        { status: 500 }
      )
    }

    // 4.2 ユーザー情報を取得（ログに紐づくユーザーのメールアドレス）
    const logRows = (logs || []) as UsageLogRow[]
    const userIds = Array.from(new Set(logRows.map(log => log.user_id)))
    const userMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: users } = await serviceClient
        .from('users')
        .select('id, email')
        .in('id', userIds)

      if (users) {
        users.forEach((u: { id: string; email: string }) => {
          userMap[u.id] = u.email
        })
      }
    }

    // 4.3 利用可能なログタイプを取得
    const { data: typeData } = await serviceClient
      .from('usage_logs')
      .select('action_type')

    const typeRows = (typeData || []) as ActionTypeRow[]
    const availableTypes = Array.from(new Set(typeRows.map(t => t.action_type))).sort()

    // 5. レスポンス整形
    const logsWithEmail: LogEntry[] = logRows.map(log => ({
      ...log,
      user_email: userMap[log.user_id] || undefined,
    }))

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / perPage)

    // 6. レスポンス返却
    return NextResponse.json({
      success: true,
      data: {
        logs: logsWithEmail,
        pagination: {
          current_page: page,
          per_page: perPage,
          total_pages: totalPages,
          total_count: totalCount,
        },
        filters: {
          types: availableTypes,
        },
      },
    })
  } catch (error) {
    console.error('Logs error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'ログの取得に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}
