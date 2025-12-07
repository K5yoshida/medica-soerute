/**
 * 内部ログ保存API
 *
 * POST /api/internal/logs
 *
 * 監視モジュールからのログをDBに保存する内部API。
 * 認証: X-Internal-Secret ヘッダーによる内部認証
 *
 * 設計書: 19_エラーカタログと監視ポリシー - 19.5 ログ設計
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// ログレベル
type LogLevel = 'error' | 'warn' | 'info' | 'debug'

// ログカテゴリ
type LogCategory = 'auth' | 'api' | 'system' | 'billing' | 'user' | 'external' | 'job' | 'security'

// リクエストボディ
interface LogRequestBody {
  level: LogLevel
  category: LogCategory
  message: string
  request_id?: string
  user_id?: string
  action?: string
  duration_ms?: number
  error_code?: string
  error_name?: string
  error_message?: string
  error_stack?: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, unknown>
}

// バリデーション
const VALID_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug']
const VALID_CATEGORIES: LogCategory[] = ['auth', 'api', 'system', 'billing', 'user', 'external', 'job', 'security']

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 内部認証チェック
    const internalSecret = request.headers.get('X-Internal-Secret')
    const expectedSecret = process.env.INTERNAL_API_SECRET

    // シークレットが設定されていない場合は本番ではエラー
    if (process.env.NODE_ENV === 'production' && !expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Internal API not configured' },
        { status: 500 }
      )
    }

    // シークレットが設定されている場合は検証
    if (expectedSecret && internalSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. リクエストボディ取得
    const body: LogRequestBody = await request.json()

    // 3. バリデーション
    if (!body.level || !VALID_LEVELS.includes(body.level)) {
      return NextResponse.json(
        { success: false, error: 'Invalid level' },
        { status: 400 }
      )
    }

    if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      )
    }

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // 4. Service Clientでデータ挿入
    const serviceClient = createServiceClient()

    const { error: insertError } = await serviceClient
      .from('system_logs')
      .insert({
        level: body.level,
        category: body.category,
        message: body.message.slice(0, 2000), // メッセージ長制限
        request_id: body.request_id?.slice(0, 100),
        user_id: body.user_id,
        action: body.action?.slice(0, 100),
        duration_ms: body.duration_ms,
        error_code: body.error_code?.slice(0, 50),
        error_name: body.error_name?.slice(0, 100),
        error_message: body.error_message?.slice(0, 2000),
        error_stack: body.error_stack?.slice(0, 10000),
        ip_address: body.ip_address,
        user_agent: body.user_agent?.slice(0, 500),
        metadata: body.metadata,
      })

    if (insertError) {
      // テーブルが存在しない場合は静かに失敗（マイグレーション前対応）
      if (insertError.code === '42P01') {
        return NextResponse.json({ success: true, warning: 'Table not yet created' })
      }
      console.error('Failed to insert log:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to save log' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Internal logs API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
