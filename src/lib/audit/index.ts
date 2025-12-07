/**
 * 監査ログモジュール
 * 設計書: GAP-020 監査ログ実装
 *
 * セキュリティに関わる操作（認証、権限変更、データエクスポート等）を記録
 */

import { createServiceClient } from '@/lib/supabase/server'

// 監査アクションの種別
export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.login_failed'
  | 'auth.password_reset'
  | 'auth.session_invalidated'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.role_changed'
  | 'user.plan_changed'
  | 'user.invited'
  | 'admin.user_viewed'
  | 'admin.user_modified'
  | 'admin.domain_added'
  | 'admin.domain_removed'
  | 'data.exported'
  | 'data.imported'
  | 'billing.subscription_created'
  | 'billing.subscription_cancelled'
  | 'billing.payment_failed'
  | 'api.rate_limited'

// 監査ログエントリ
export interface AuditLogEntry {
  action: AuditAction
  userId?: string
  targetUserId?: string
  targetResourceType?: string
  targetResourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  success: boolean
}

/**
 * 監査ログを記録
 *
 * @example
 * await logAuditEvent({
 *   action: 'auth.login',
 *   userId: user.id,
 *   ipAddress: request.headers.get('x-forwarded-for'),
 *   success: true,
 * })
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createServiceClient()

    await supabase.from('system_logs').insert({
      level: entry.success ? 'info' : 'warn',
      category: 'security',
      message: formatAuditMessage(entry),
      action: entry.action,
      user_id: entry.userId,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      metadata: {
        audit: true,
        target_user_id: entry.targetUserId,
        target_resource_type: entry.targetResourceType,
        target_resource_id: entry.targetResourceId,
        success: entry.success,
        ...entry.details,
      },
    })
  } catch (error) {
    // 監査ログの記録失敗はシステムログに出力するが、メイン処理は継続
    console.error('Failed to log audit event:', error, entry)
  }
}

/**
 * 監査ログメッセージをフォーマット
 */
function formatAuditMessage(entry: AuditLogEntry): string {
  const actionLabels: Record<AuditAction, string> = {
    'auth.login': 'ユーザーがログインしました',
    'auth.logout': 'ユーザーがログアウトしました',
    'auth.login_failed': 'ログイン試行が失敗しました',
    'auth.password_reset': 'パスワードがリセットされました',
    'auth.session_invalidated': 'セッションが無効化されました',
    'user.created': 'ユーザーが作成されました',
    'user.updated': 'ユーザー情報が更新されました',
    'user.deleted': 'ユーザーが削除されました',
    'user.role_changed': 'ユーザーの権限が変更されました',
    'user.plan_changed': 'ユーザーのプランが変更されました',
    'user.invited': 'ユーザーが招待されました',
    'admin.user_viewed': '管理者がユーザー情報を閲覧しました',
    'admin.user_modified': '管理者がユーザー情報を変更しました',
    'admin.domain_added': '管理者がドメインを追加しました',
    'admin.domain_removed': '管理者がドメインを削除しました',
    'data.exported': 'データがエクスポートされました',
    'data.imported': 'データがインポートされました',
    'billing.subscription_created': 'サブスクリプションが作成されました',
    'billing.subscription_cancelled': 'サブスクリプションがキャンセルされました',
    'billing.payment_failed': '支払いが失敗しました',
    'api.rate_limited': 'APIレート制限に到達しました',
  }

  let message = actionLabels[entry.action] || entry.action

  if (entry.targetUserId && entry.targetUserId !== entry.userId) {
    message += ` (対象: ${entry.targetUserId})`
  }

  if (entry.targetResourceType && entry.targetResourceId) {
    message += ` [${entry.targetResourceType}:${entry.targetResourceId}]`
  }

  return message
}

/**
 * HTTPリクエストからクライアント情報を抽出
 */
export function extractClientInfo(request: Request): {
  ipAddress?: string
  userAgent?: string
} {
  const headers = request.headers
  return {
    ipAddress:
      headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      headers.get('x-real-ip') ||
      undefined,
    userAgent: headers.get('user-agent') || undefined,
  }
}
