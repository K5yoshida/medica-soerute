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

// 統一ログエントリ（system_logsからのデータ）
interface LogEntry {
  id: string
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  category: 'auth' | 'api' | 'system' | 'billing' | 'user' | 'external' | 'job' | 'security'
  message: string
  request_id?: string
  user_id?: string
  user_email?: string
  action?: string
  duration_ms?: number
  error_code?: string
  error_name?: string
  error_message?: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, unknown>
}

interface LogsResponse {
  success: boolean
  data?: {
    logs: LogEntry[]
    stats: {
      total: number
      info: number
      warn: number
      error: number
      debug: number
      today_total: number
    }
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

interface SystemLogRow {
  id: string
  timestamp: string
  level: string
  category: string
  message: string
  request_id: string | null
  user_id: string | null
  action: string | null
  duration_ms: number | null
  error_code: string | null
  error_name: string | null
  error_message: string | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
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
    const level = searchParams.get('level') // error, warn, info, debug
    const category = searchParams.get('category') // auth, api, system, billing, user, external, job, security
    const range = searchParams.get('range') || '24h' // 1h, 24h, 7d, 30d
    const q = searchParams.get('q') || '' // 検索クエリ
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const perPage = Math.min(Math.max(parseInt(searchParams.get('per_page') || '50', 10), 1), 100)
    const offset = (page - 1) * perPage

    // 4. Service Clientでデータ取得
    const serviceClient = createServiceClient()

    // 4.1 日時範囲を計算
    const now = new Date()
    let startDate: Date
    switch (range) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '24h':
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
    }

    // 4.2 ログデータを取得（system_logsテーブル）
    let query = serviceClient
      .from('system_logs')
      .select(
        'id, timestamp, level, category, message, request_id, user_id, action, duration_ms, error_code, error_name, error_message, ip_address, user_agent, metadata',
        { count: 'exact' }
      )
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })
      .range(offset, offset + perPage - 1)

    // フィルター適用
    if (level && level !== 'all') {
      query = query.eq('level', level)
    }

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (q) {
      query = query.ilike('message', `%${q}%`)
    }

    const { data: logs, error: logsError, count } = await query

    if (logsError) {
      // テーブルが存在しない場合は空のレスポンスを返す（マイグレーション前対応）
      if (logsError.code === '42P01') {
        return NextResponse.json({
          success: true,
          data: {
            logs: [],
            stats: { total: 0, info: 0, warn: 0, error: 0, debug: 0, today_total: 0 },
            pagination: { current_page: 1, per_page: perPage, total_pages: 0, total_count: 0 },
          },
        })
      }
      console.error('Logs query error:', logsError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'ログデータの取得に失敗しました' } },
        { status: 500 }
      )
    }

    // 4.3 ユーザー情報を取得（ログに紐づくユーザーのメールアドレス）
    const logRows = (logs || []) as SystemLogRow[]
    const userIds = Array.from(new Set(logRows.filter(log => log.user_id).map(log => log.user_id as string)))
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

    // 4.4 統計情報を取得（直近24時間）
    const todayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const { data: statsData } = await serviceClient
      .from('system_logs')
      .select('level')
      .gte('timestamp', todayStart.toISOString())

    const stats = {
      total: (statsData || []).length,
      info: (statsData || []).filter((s: { level: string }) => s.level === 'info').length,
      warn: (statsData || []).filter((s: { level: string }) => s.level === 'warn').length,
      error: (statsData || []).filter((s: { level: string }) => s.level === 'error').length,
      debug: (statsData || []).filter((s: { level: string }) => s.level === 'debug').length,
      today_total: (statsData || []).length,
    }

    // 5. レスポンス整形
    const logsWithEmail: LogEntry[] = logRows.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level as LogEntry['level'],
      category: log.category as LogEntry['category'],
      message: log.message,
      request_id: log.request_id || undefined,
      user_id: log.user_id || undefined,
      user_email: log.user_id ? userMap[log.user_id] : undefined,
      action: log.action || undefined,
      duration_ms: log.duration_ms || undefined,
      error_code: log.error_code || undefined,
      error_name: log.error_name || undefined,
      error_message: log.error_message || undefined,
      ip_address: log.ip_address || undefined,
      user_agent: log.user_agent || undefined,
      metadata: log.metadata || undefined,
    }))

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / perPage)

    // 6. レスポンス返却
    return NextResponse.json({
      success: true,
      data: {
        logs: logsWithEmail,
        stats,
        pagination: {
          current_page: page,
          per_page: perPage,
          total_pages: totalPages,
          total_count: totalCount,
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
