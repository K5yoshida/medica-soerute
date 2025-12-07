/**
 * Edge Runtime対応レート制限
 *
 * 設計書: 23_セキュリティ設計書 - 23.6.2 Rate Limiting
 *
 * Middleware（Edge Runtime）で使用するレート制限。
 * APIエンドポイントへの過剰なリクエストを制限。
 */
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

// Upstash Redis クライアント（Edge Runtime対応）
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
 * - /api/matching: 5 req/min（AI分析）
 * - /api/peso: 5 req/min（AI分析）
 * - /api/auth/login: 5 req/15min（ブルートフォース対策）
 * - /api/*: 100 req/min（デフォルト）
 */
type RateLimitConfig = {
  requests: number
  windowMs: number
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // AI分析エンドポイント（コスト高、厳格な制限）
  '/api/matching': { requests: 10, windowMs: 60000 }, // 10 req/min
  '/api/peso': { requests: 10, windowMs: 60000 }, // 10 req/min

  // 認証エンドポイント（ブルートフォース対策）
  '/api/auth/login': { requests: 5, windowMs: 900000 }, // 5 req/15min
  '/api/auth/signup': { requests: 3, windowMs: 3600000 }, // 3 req/hour
  '/api/auth/password': { requests: 3, windowMs: 3600000 }, // 3 req/hour

  // 決済エンドポイント
  '/api/stripe': { requests: 20, windowMs: 3600000 }, // 20 req/hour

  // 管理者API（緩めの制限）
  '/api/admin': { requests: 200, windowMs: 60000 }, // 200 req/min

  // デフォルト
  default: { requests: 100, windowMs: 60000 }, // 100 req/min
}

/**
 * パスに対応するレート制限設定を取得
 */
function getRateLimitConfig(pathname: string): RateLimitConfig {
  // プレフィックスマッチ（長いパスから優先）
  const paths = Object.keys(rateLimitConfigs)
    .filter((p) => p !== 'default')
    .sort((a, b) => b.length - a.length)

  for (const path of paths) {
    if (pathname.startsWith(path)) {
      return rateLimitConfigs[path]
    }
  }

  return rateLimitConfigs.default
}

/**
 * IPアドレスを取得
 */
export function getClientIP(request: Request): string {
  // Vercel/Cloudflare環境
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Cloudflare
  const cfIP = request.headers.get('cf-connecting-ip')
  if (cfIP) {
    return cfIP
  }

  return 'unknown'
}

/**
 * APIエンドポイントのレート制限をチェック
 *
 * @returns NextResponse | null（nullの場合は続行）
 */
export async function checkApiRateLimit(
  request: Request,
  pathname: string,
  userId?: string
): Promise<NextResponse | null> {
  // Redisが設定されていない場合はスキップ
  if (!redis) {
    return null
  }

  // APIエンドポイント以外はスキップ
  if (!pathname.startsWith('/api/')) {
    return null
  }

  // ヘルスチェックはスキップ
  if (pathname === '/api/health') {
    return null
  }

  // Webhookはスキップ（独自の検証機構がある）
  if (pathname.includes('/webhook')) {
    return null
  }

  const config = getRateLimitConfig(pathname)

  // レート制限インスタンスを作成
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, `${config.windowMs}ms`),
    analytics: true,
    prefix: 'ratelimit',
  })

  // 識別子を決定（認証済みはユーザーID、未認証はIP）
  const identifier = userId || `ip:${getClientIP(request)}`
  const key = `${identifier}:${pathname}`

  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(key)

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)

      return NextResponse.json(
        {
          error: {
            code: 'E-LIMIT-004',
            message: 'リクエスト回数が上限を超えました',
            details: {
              limit,
              remaining,
              retry_after_seconds: retryAfter,
            },
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
            'Retry-After': String(retryAfter),
          },
        }
      )
    }
  } catch (error) {
    // Redis接続エラーの場合はログを出力して続行
    console.error('Rate limit check failed:', error)
  }

  return null
}
