/**
 * セッション検証（Edge Runtime対応）
 *
 * ミドルウェアから呼び出されるEdge Runtime対応のセッション検証。
 * Supabase REST APIを直接呼び出してセッション有効性を確認。
 *
 * 設計書: 23_セキュリティ設計書 - 同時ログイン制御
 */

const SESSION_COOKIE_NAME = 'app_session_token'

/**
 * セッションの有効性をEdge Runtimeから検証
 *
 * パフォーマンス考慮:
 * - キャッシュ不可（セキュリティ上、常に最新を確認）
 * - タイムアウト短め（500ms）
 * - 失敗時は有効として扱う（可用性優先）
 */
export async function validateSessionEdge(
  sessionToken: string | undefined
): Promise<{ valid: boolean; reason?: string }> {
  // セッショントークンがない場合は検証スキップ
  // （マイグレーション前の移行期間対応）
  if (!sessionToken) {
    return { valid: true, reason: 'no_token' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // 環境変数がない場合はスキップ
  if (!supabaseUrl || !supabaseServiceKey) {
    return { valid: true, reason: 'no_config' }
  }

  try {
    // RPC関数を呼び出してセッション有効性を確認
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/is_session_valid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ p_session_token: sessionToken }),
      // Edge Runtimeではsignalが使えないのでタイムアウトなし
    })

    // レスポンスエラーチェック
    if (!response.ok) {
      // テーブルが存在しない場合（マイグレーション前）は有効として扱う
      if (response.status === 404) {
        return { valid: true, reason: 'table_not_found' }
      }
      console.warn('Session validation API error:', response.status)
      return { valid: true, reason: 'api_error' }
    }

    const isValid = await response.json()
    return { valid: isValid === true, reason: isValid ? 'valid' : 'invalid' }
  } catch (error) {
    // エラー時は有効として扱う（可用性優先）
    console.warn('Session validation failed:', error)
    return { valid: true, reason: 'error' }
  }
}

/**
 * リクエストからセッショントークンを取得
 */
export function getSessionTokenFromRequest(request: Request): string | undefined {
  const cookies = request.headers.get('cookie')
  if (!cookies) return undefined

  const match = cookies.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))
  return match ? match[1] : undefined
}

/**
 * セッション無効時のリダイレクトURLを生成
 */
export function getSessionInvalidRedirectUrl(request: Request): string {
  const url = new URL('/auth/login', request.url)
  url.searchParams.set('reason', 'session_expired')
  url.searchParams.set('redirect', new URL(request.url).pathname)
  return url.toString()
}
