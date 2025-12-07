/**
 * セッション管理ライブラリ
 *
 * 設計書: 23_セキュリティ設計書 - 同時ログイン制御
 * GAP-003: 同時ログイン制御実装
 *
 * 方式: 最新セッションのみ有効
 * - 新規ログイン時に既存セッションを無効化
 * - ミドルウェアでセッション有効性を検証
 */

import { createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/monitoring'
import crypto from 'crypto'

/**
 * セッション情報
 */
export interface SessionInfo {
  id: string
  userId: string
  sessionToken: string
  deviceInfo?: string
  ipAddress?: string
  userAgent?: string
  isValid: boolean
  createdAt: string
  lastActiveAt: string
}

/**
 * セッション作成オプション
 */
interface CreateSessionOptions {
  userId: string
  deviceInfo?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * セッショントークンを生成
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * 新規セッションを作成し、既存セッションを無効化
 *
 * @returns セッショントークン
 */
export async function createSession(options: CreateSessionOptions): Promise<string> {
  const { userId, deviceInfo, ipAddress, userAgent } = options
  const supabase = createServiceClient()

  // 1. 既存の有効なセッションを無効化
  const { data: invalidated, error: invalidateError } = await supabase.rpc(
    'invalidate_user_sessions',
    {
      p_user_id: userId,
      p_reason: 'new_login',
    }
  )

  if (invalidateError) {
    // テーブルが存在しない場合は無視（マイグレーション前対応）
    if (invalidateError.code !== '42P01' && invalidateError.code !== '42883') {
      logger.warn('Failed to invalidate existing sessions', {
        category: 'auth',
        action: 'session_invalidate',
        userId,
        errorMessage: invalidateError.message,
      })
    }
  } else if (invalidated && invalidated > 0) {
    logger.info('Existing sessions invalidated', {
      category: 'auth',
      action: 'session_invalidate',
      userId,
      metadata: { count: invalidated },
    })
  }

  // 2. 新規セッションを作成
  const sessionToken = generateSessionToken()

  const { error: insertError } = await supabase.from('user_sessions').insert({
    user_id: userId,
    session_token: sessionToken,
    device_info: deviceInfo,
    ip_address: ipAddress,
    user_agent: userAgent?.slice(0, 500), // 長さ制限
  })

  if (insertError) {
    // テーブルが存在しない場合は無視（マイグレーション前対応）
    if (insertError.code === '42P01') {
      logger.warn('user_sessions table not found, skipping session creation', {
        category: 'auth',
        action: 'session_create',
        userId,
      })
      return sessionToken
    }

    logger.error('Failed to create session', {
      category: 'auth',
      action: 'session_create',
      userId,
      errorMessage: insertError.message,
    })
    throw new Error('セッションの作成に失敗しました')
  }

  logger.info('New session created', {
    category: 'auth',
    action: 'session_create',
    userId,
    metadata: {
      device_info: deviceInfo,
      ip_address: ipAddress,
    },
  })

  return sessionToken
}

/**
 * セッションの有効性を確認
 */
export async function validateSession(sessionToken: string): Promise<boolean> {
  if (!sessionToken) return false

  const supabase = createServiceClient()

  const { data, error } = await supabase.rpc('is_session_valid', {
    p_session_token: sessionToken,
  })

  if (error) {
    // テーブルが存在しない場合は有効として扱う（マイグレーション前対応）
    if (error.code === '42P01' || error.code === '42883') {
      return true
    }
    logger.warn('Session validation failed', {
      category: 'auth',
      action: 'session_validate',
      errorMessage: error.message,
    })
    return false
  }

  return data === true
}

/**
 * セッションの最終アクティブ時刻を更新
 */
export async function updateSessionActivity(sessionToken: string): Promise<void> {
  if (!sessionToken) return

  const supabase = createServiceClient()

  const { error } = await supabase.rpc('update_session_activity', {
    p_session_token: sessionToken,
  })

  if (error && error.code !== '42P01' && error.code !== '42883') {
    // エラーは無視（パフォーマンス優先）
    logger.debug('Failed to update session activity', {
      category: 'auth',
      action: 'session_activity',
      errorMessage: error.message,
    })
  }
}

/**
 * セッションを無効化（ログアウト時）
 */
export async function invalidateSession(sessionToken: string): Promise<void> {
  if (!sessionToken) return

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('user_sessions')
    .update({
      is_valid: false,
      invalidated_at: new Date().toISOString(),
      invalidated_reason: 'logout',
    })
    .eq('session_token', sessionToken)

  if (error && error.code !== '42P01') {
    logger.warn('Failed to invalidate session on logout', {
      category: 'auth',
      action: 'session_logout',
      errorMessage: error.message,
    })
  }
}

/**
 * ユーザーの全セッションを無効化（管理者機能）
 */
export async function invalidateAllUserSessions(
  userId: string,
  reason: string = 'admin_revoke'
): Promise<number> {
  const supabase = createServiceClient()

  const { data, error } = await supabase.rpc('invalidate_user_sessions', {
    p_user_id: userId,
    p_reason: reason,
  })

  if (error) {
    if (error.code === '42P01' || error.code === '42883') {
      return 0
    }
    logger.error('Failed to invalidate all user sessions', {
      category: 'auth',
      action: 'session_revoke_all',
      userId,
      errorMessage: error.message,
    })
    throw new Error('セッションの無効化に失敗しました')
  }

  if (data && data > 0) {
    logger.info('All user sessions invalidated', {
      category: 'security',
      action: 'session_revoke_all',
      userId,
      metadata: { count: data, reason },
    })
  }

  return data || 0
}

/**
 * DBから取得するセッションの型
 */
interface UserSessionRow {
  id: string
  user_id: string
  session_token: string
  device_info: string | null
  ip_address: string | null
  user_agent: string | null
  is_valid: boolean
  created_at: string
  last_active_at: string
  invalidated_at: string | null
  invalidated_reason: string | null
}

/**
 * ユーザーのアクティブセッション一覧を取得
 */
export async function getUserSessions(userId: string): Promise<SessionInfo[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    if (error.code === '42P01') {
      return []
    }
    throw new Error('セッション情報の取得に失敗しました')
  }

  return ((data || []) as UserSessionRow[]).map((session) => ({
    id: session.id,
    userId: session.user_id,
    sessionToken: session.session_token,
    deviceInfo: session.device_info ?? undefined,
    ipAddress: session.ip_address ?? undefined,
    userAgent: session.user_agent ?? undefined,
    isValid: session.is_valid,
    createdAt: session.created_at,
    lastActiveAt: session.last_active_at,
  }))
}
