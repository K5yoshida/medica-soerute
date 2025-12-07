/**
 * レート制限ライブラリ
 *
 * 設計書: 23_セキュリティ設計書 - 23.6.2 Rate Limiting
 *
 * Upstash Redisを使用したエンドポイント別レート制限。
 * APIエンドポイントの過剰な使用を防ぎ、サービスの安定性を確保。
 */
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Upstash Redis クライアント
// 環境変数が設定されていない場合はnullを返す（開発環境用）
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

/**
 * レート制限設定
 *
 * 設計書記載の制限値:
 * - /api/matching/analyze: 5 req/min
 * - /api/peso/diagnose: 5 req/min
 * - /api/auth/login: 5 req/15min
 * - /api/*: 100 req/min
 */
type RateLimitConfig = {
  requests: number
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // AI分析エンドポイント（コスト高）
  '/api/matching/analyze': { requests: 5, window: '1 m' },
  '/api/peso': { requests: 5, window: '1 m' },

  // 認証エンドポイント（ブルートフォース対策）
  '/api/auth/login': { requests: 5, window: '15 m' },
  '/api/auth/signup': { requests: 3, window: '1 h' },
  '/api/auth/password/forgot': { requests: 3, window: '1 h' },

  // 決済エンドポイント
  '/api/stripe/checkout': { requests: 10, window: '1 h' },

  // デフォルト（その他のAPIエンドポイント）
  default: { requests: 100, window: '1 m' },
}

/**
 * エンドポイントに対応するレート制限設定を取得
 */
function getRateLimitConfig(pathname: string): RateLimitConfig {
  // 完全一致を優先
  if (rateLimitConfigs[pathname]) {
    return rateLimitConfigs[pathname]
  }

  // プレフィックスマッチ（/api/matching/analyze/xxx など）
  for (const [path, config] of Object.entries(rateLimitConfigs)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      return config
    }
  }

  return rateLimitConfigs.default
}

/**
 * 時間文字列をミリ秒に変換
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*(s|m|h|d)$/)
  if (!match) return 60000 // デフォルト1分

  const value = parseInt(match[1])
  const unit = match[2]

  switch (unit) {
    case 's':
      return value * 1000
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'd':
      return value * 24 * 60 * 60 * 1000
    default:
      return 60000
  }
}

/**
 * レート制限チェック
 *
 * @param identifier ユーザーID または IPアドレス
 * @param pathname APIエンドポイントのパス
 * @returns { success: boolean, remaining: number, reset: number }
 */
export async function checkRateLimit(
  identifier: string,
  pathname: string
): Promise<{
  success: boolean
  remaining: number
  reset: number
  limit: number
}> {
  // Redisが設定されていない場合はスキップ（開発環境）
  if (!redis) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 60000,
      limit: 999,
    }
  }

  const config = getRateLimitConfig(pathname)
  const windowMs = parseWindow(config.window)

  // エンドポイント別のレート制限を作成
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, `${windowMs}ms`),
    analytics: true,
    prefix: `ratelimit:${pathname}`,
  })

  const key = `${identifier}:${pathname}`
  const { success, remaining, reset, limit } = await ratelimit.limit(key)

  return { success, remaining, reset, limit }
}

/**
 * IP アドレスベースのレート制限（認証不要エンドポイント用）
 */
export async function checkRateLimitByIP(
  ip: string,
  pathname: string
): Promise<{
  success: boolean
  remaining: number
  reset: number
  limit: number
}> {
  return checkRateLimit(`ip:${ip}`, pathname)
}

/**
 * ユーザーIDベースのレート制限（認証必要エンドポイント用）
 */
export async function checkRateLimitByUser(
  userId: string,
  pathname: string
): Promise<{
  success: boolean
  remaining: number
  reset: number
  limit: number
}> {
  return checkRateLimit(`user:${userId}`, pathname)
}

/**
 * レート制限レスポンスヘッダーを生成
 */
export function getRateLimitHeaders(result: {
  remaining: number
  reset: number
  limit: number
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
  }
}

/**
 * レート制限エラーレスポンスを生成
 */
export function createRateLimitResponse(result: {
  remaining: number
  reset: number
  limit: number
}) {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)

  return {
    status: 429,
    headers: {
      ...getRateLimitHeaders(result),
      'Retry-After': String(retryAfter),
    },
    body: {
      error: {
        code: 'E-LIMIT-004',
        message: 'リクエスト回数が上限を超えました',
        details: {
          limit: result.limit,
          remaining: result.remaining,
          retry_after_seconds: retryAfter,
        },
      },
    },
  }
}
