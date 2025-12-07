/**
 * レートリミッターのテスト
 *
 * テスト対象: src/lib/rate-limiter.ts
 * - getRateLimitHeaders: レート制限ヘッダー生成
 * - createRateLimitResponse: レート制限エラーレスポンス生成
 *
 * 注: checkRateLimit関連はRedis依存のため、ここでは内部ロジックのみテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRateLimitHeaders, createRateLimitResponse } from '../rate-limiter'

describe('getRateLimitHeaders', () => {
  // テスト25: 正しいレート制限ヘッダーを生成する
  it('should generate correct rate limit headers', () => {
    const result = {
      remaining: 5,
      reset: 1700000000000,
      limit: 10,
    }

    const headers = getRateLimitHeaders(result)

    expect(headers['X-RateLimit-Limit']).toBe('10')
    expect(headers['X-RateLimit-Remaining']).toBe('5')
    expect(headers['X-RateLimit-Reset']).toBe('1700000000')
  })

  // テスト26: remainingが0の場合も正しく処理する
  it('should handle zero remaining correctly', () => {
    const result = {
      remaining: 0,
      reset: 1700000000000,
      limit: 100,
    }

    const headers = getRateLimitHeaders(result)

    expect(headers['X-RateLimit-Remaining']).toBe('0')
    expect(headers['X-RateLimit-Limit']).toBe('100')
  })
})

describe('createRateLimitResponse', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
  })

  // テスト27: 429ステータスでレスポンスを生成する
  it('should create response with 429 status', () => {
    const now = Date.now()
    const result = {
      remaining: 0,
      reset: now + 60000,
      limit: 5,
    }

    const response = createRateLimitResponse(result)

    expect(response.status).toBe(429)
  })

  // テスト28: Retry-Afterヘッダーを含む
  it('should include Retry-After header', () => {
    const now = Date.now()
    const result = {
      remaining: 0,
      reset: now + 120000, // 2分後
      limit: 5,
    }

    const response = createRateLimitResponse(result)

    expect(response.headers['Retry-After']).toBe('120')
  })

  // テスト29: エラーコードE-LIMIT-004を含むボディを生成する
  it('should include E-LIMIT-004 error code in body', () => {
    const now = Date.now()
    const result = {
      remaining: 0,
      reset: now + 60000,
      limit: 5,
    }

    const response = createRateLimitResponse(result)

    expect(response.body.error.code).toBe('E-LIMIT-004')
    expect(response.body.error.message).toBe('リクエスト回数が上限を超えました')
  })

  // テスト30: 詳細情報を含む
  it('should include details in error body', () => {
    const now = Date.now()
    const result = {
      remaining: 0,
      reset: now + 30000,
      limit: 10,
    }

    const response = createRateLimitResponse(result)

    expect(response.body.error.details).toBeDefined()
    expect(response.body.error.details.limit).toBe(10)
    expect(response.body.error.details.remaining).toBe(0)
    expect(response.body.error.details.retry_after_seconds).toBe(30)
  })

  vi.useRealTimers()
})
