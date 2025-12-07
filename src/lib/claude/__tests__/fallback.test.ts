/**
 * Claude APIフォールバックモジュールのテスト
 * 設計書: GAP-014 Claude APIフォールバック実装
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import {
  classifyError,
  isRetryableError,
  calculateBackoffDelay,
  withRetry,
  withFallback,
  getDefaultKeywordSuggestions,
  getDefaultMediaMatchFallback,
  getDefaultPesoFallback,
  getDefaultRecommendationsFallback,
} from '../fallback'

// モックエラーを作成するヘルパー関数
function createMockRateLimitError() {
  const error = Object.create(Anthropic.RateLimitError.prototype)
  error.status = 429
  error.message = 'Rate limit exceeded'
  return error
}

function createMockAPIError(status: number, message: string) {
  const error = Object.create(Anthropic.APIError.prototype)
  error.status = status
  error.message = message
  return error
}

describe('classifyError', () => {
  it('RateLimitErrorをrate_limitとして分類する', () => {
    const error = createMockRateLimitError()
    expect(classifyError(error)).toBe('rate_limit')
  })

  it('529エラーをoverloadedとして分類する', () => {
    const error = createMockAPIError(529, 'Overloaded')
    expect(classifyError(error)).toBe('overloaded')
  })

  it('408エラーをtimeoutとして分類する', () => {
    const error = createMockAPIError(408, 'Request timeout')
    expect(classifyError(error)).toBe('timeout')
  })

  it('その他のAPIErrorをapi_errorとして分類する', () => {
    const error = createMockAPIError(500, 'Internal server error')
    expect(classifyError(error)).toBe('api_error')
  })

  it('ネットワークエラーをnetwork_errorとして分類する', () => {
    const error = new Error('network error')
    expect(classifyError(error)).toBe('network_error')
  })

  it('不明なエラーをunknownとして分類する', () => {
    expect(classifyError('string error')).toBe('unknown')
    expect(classifyError(null)).toBe('unknown')
  })
})

describe('isRetryableError', () => {
  it('rate_limitはリトライ可能', () => {
    expect(isRetryableError('rate_limit')).toBe(true)
  })

  it('overloadedはリトライ可能', () => {
    expect(isRetryableError('overloaded')).toBe(true)
  })

  it('timeoutはリトライ可能', () => {
    expect(isRetryableError('timeout')).toBe(true)
  })

  it('network_errorはリトライ可能', () => {
    expect(isRetryableError('network_error')).toBe(true)
  })

  it('api_errorはリトライ不可', () => {
    expect(isRetryableError('api_error')).toBe(false)
  })

  it('unknownはリトライ不可', () => {
    expect(isRetryableError('unknown')).toBe(false)
  })
})

describe('calculateBackoffDelay', () => {
  it('指数バックオフで遅延時間を計算する', () => {
    const config = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
    }

    // ジッターがあるため範囲でテスト
    const delay0 = calculateBackoffDelay(0, config)
    expect(delay0).toBeGreaterThanOrEqual(800) // 1000 - 20%
    expect(delay0).toBeLessThanOrEqual(1200) // 1000 + 20%

    const delay1 = calculateBackoffDelay(1, config)
    expect(delay1).toBeGreaterThanOrEqual(1600) // 2000 - 20%
    expect(delay1).toBeLessThanOrEqual(2400) // 2000 + 20%
  })

  it('最大遅延を超えない', () => {
    const config = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      backoffMultiplier: 10,
    }

    const delay = calculateBackoffDelay(3, config)
    expect(delay).toBeLessThanOrEqual(5000)
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('成功時は結果を返す', async () => {
    const operation = vi.fn().mockResolvedValue('success')

    const result = await withRetry(operation, { maxRetries: 0 })

    expect(result.success).toBe(true)
    expect(result.data).toBe('success')
    expect(result.usedFallback).toBe(false)
    expect(result.retryCount).toBe(0)
  })

  it('リトライ後に成功する場合はリトライ回数を記録する', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(createMockRateLimitError())
      .mockResolvedValueOnce('success')

    const result = await withRetry(operation, {
      maxRetries: 1,
      initialDelayMs: 10,
      maxDelayMs: 100,
    })

    expect(result.success).toBe(true)
    expect(result.data).toBe('success')
    expect(result.retryCount).toBe(1)
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('リトライ不可能なエラーでは即座に失敗する', async () => {
    const operation = vi.fn()
      .mockRejectedValue(createMockAPIError(500, 'Server error'))

    const result = await withRetry(operation, { maxRetries: 3 })

    expect(result.success).toBe(false)
    expect(result.errorType).toBe('api_error')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('最大リトライ回数に達すると失敗する', async () => {
    const operation = vi.fn()
      .mockRejectedValue(createMockRateLimitError())

    const result = await withRetry(operation, {
      maxRetries: 2,
      initialDelayMs: 10,
      maxDelayMs: 50,
    })

    expect(result.success).toBe(false)
    expect(result.errorType).toBe('rate_limit')
    expect(result.retryCount).toBe(2)
    expect(operation).toHaveBeenCalledTimes(3) // 初回 + 2回リトライ
  })
})

describe('withFallback', () => {
  it('API成功時はフォールバックを使用しない', async () => {
    const operation = vi.fn().mockResolvedValue('api result')
    const fallbackFn = vi.fn().mockReturnValue('fallback result')

    const result = await withFallback(operation, fallbackFn, { maxRetries: 0 })

    expect(result.success).toBe(true)
    expect(result.data).toBe('api result')
    expect(result.usedFallback).toBe(false)
    expect(fallbackFn).not.toHaveBeenCalled()
  })

  it('API失敗時はフォールバックを使用する', async () => {
    const operation = vi.fn()
      .mockRejectedValue(createMockAPIError(500, 'Server error'))
    const fallbackFn = vi.fn().mockReturnValue('fallback result')

    const result = await withFallback(operation, fallbackFn, { maxRetries: 0 })

    expect(result.success).toBe(true)
    expect(result.data).toBe('fallback result')
    expect(result.usedFallback).toBe(true)
    expect(fallbackFn).toHaveBeenCalledWith('api_error')
  })

  it('フォールバックも失敗した場合は失敗を返す', async () => {
    const operation = vi.fn()
      .mockRejectedValue(createMockAPIError(500, 'Server error'))
    const fallbackFn = vi.fn().mockImplementation(() => {
      throw new Error('Fallback failed')
    })

    const result = await withFallback(operation, fallbackFn, { maxRetries: 0 })

    expect(result.success).toBe(false)
    expect(result.usedFallback).toBe(true)
    expect(result.fallbackReason).toBe('Both API and fallback failed')
  })
})

describe('デフォルトフォールバック関数', () => {
  describe('getDefaultKeywordSuggestions', () => {
    it('職種を指定した場合は職種を含むキーワードを返す', () => {
      const result = getDefaultKeywordSuggestions('看護師')

      expect(result.keywords).toHaveLength(3)
      expect(result.keywords[0].keyword).toContain('看護師')
      expect(result.suggestedCategories).toBeDefined()
      expect(result.searchTips).toBeDefined()
    })

    it('職種未指定の場合はデフォルトキーワードを返す', () => {
      const result = getDefaultKeywordSuggestions()

      expect(result.keywords).toHaveLength(3)
      expect(result.keywords[0].keyword).toContain('医療')
    })
  })

  describe('getDefaultMediaMatchFallback', () => {
    it('空のマッチ結果とエラーメッセージを返す', () => {
      const result = getDefaultMediaMatchFallback()

      expect(result.matchedMedia).toEqual([])
      expect(result.analysisDetail.overallAssessment).toContain('利用できません')
    })
  })

  describe('getDefaultPesoFallback', () => {
    it('ゼロスコアとエラーメッセージを返す', () => {
      const result = getDefaultPesoFallback()

      expect(result.scores.paid).toBe(0)
      expect(result.scores.earned).toBe(0)
      expect(result.scores.shared).toBe(0)
      expect(result.scores.owned).toBe(0)
      expect(result.analysis).toContain('利用できません')
    })
  })

  describe('getDefaultRecommendationsFallback', () => {
    it('エラーメッセージを含む推奨を返す', () => {
      const result = getDefaultRecommendationsFallback()

      expect(result.shortTerm[0]).toContain('利用できません')
      expect(result.priorityActions[0]).toContain('お試しください')
    })
  })
})
