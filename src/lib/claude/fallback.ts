/**
 * Claude API フォールバック実装
 * 設計書: GAP-014 Claude APIフォールバック実装
 *
 * Claude API障害時のフォールバック処理を提供
 * - リトライロジック（指数バックオフ）
 * - キャッシュベースのフォールバック
 * - デグレード応答
 */

import Anthropic from '@anthropic-ai/sdk'

// リトライ設定
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

// エラーの種類
export type ClaudeErrorType =
  | 'rate_limit'
  | 'overloaded'
  | 'timeout'
  | 'api_error'
  | 'network_error'
  | 'unknown'

export interface RetryConfig {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

export interface FallbackResult<T> {
  success: boolean
  data?: T
  usedFallback: boolean
  fallbackReason?: string
  retryCount: number
  errorType?: ClaudeErrorType
}

/**
 * エラーの種類を判定
 */
export function classifyError(error: unknown): ClaudeErrorType {
  if (error instanceof Anthropic.RateLimitError) {
    return 'rate_limit'
  }
  if (error instanceof Anthropic.APIError) {
    if (error.status === 529) {
      return 'overloaded'
    }
    if (error.status === 408 || error.message?.includes('timeout')) {
      return 'timeout'
    }
    return 'api_error'
  }
  if (error instanceof Error) {
    if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
      return 'network_error'
    }
  }
  return 'unknown'
}

/**
 * リトライ可能なエラーかを判定
 */
export function isRetryableError(errorType: ClaudeErrorType): boolean {
  return ['rate_limit', 'overloaded', 'timeout', 'network_error'].includes(errorType)
}

/**
 * 指数バックオフでの遅延時間を計算
 */
export function calculateBackoffDelay(
  retryCount: number,
  config: Required<RetryConfig>
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount)
  // ジッター（±20%のランダム変動）を追加
  const jitter = delay * 0.2 * (Math.random() * 2 - 1)
  return Math.min(delay + jitter, config.maxDelayMs)
}

/**
 * 遅延を実行
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * リトライ付きでClaude API呼び出しを実行
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<FallbackResult<T>> {
  const mergedConfig: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  }

  let lastError: unknown
  let lastErrorType: ClaudeErrorType = 'unknown'

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      const result = await operation()
      return {
        success: true,
        data: result,
        usedFallback: false,
        retryCount: attempt,
      }
    } catch (error) {
      lastError = error
      lastErrorType = classifyError(error)

      // リトライ不可能なエラーの場合は即座に終了
      if (!isRetryableError(lastErrorType)) {
        console.error(`[Claude API] Non-retryable error: ${lastErrorType}`, error)
        break
      }

      // 最後の試行でない場合はバックオフ
      if (attempt < mergedConfig.maxRetries) {
        const delay = calculateBackoffDelay(attempt, mergedConfig)
        console.warn(
          `[Claude API] Retry ${attempt + 1}/${mergedConfig.maxRetries} ` +
          `after ${Math.round(delay)}ms (${lastErrorType})`
        )
        await sleep(delay)
      }
    }
  }

  // すべてのリトライが失敗
  console.error(`[Claude API] All retries exhausted`, lastError)
  return {
    success: false,
    usedFallback: false,
    retryCount: mergedConfig.maxRetries,
    errorType: lastErrorType,
    fallbackReason: `Failed after ${mergedConfig.maxRetries} retries: ${lastErrorType}`,
  }
}

/**
 * フォールバック付きでClaude API呼び出しを実行
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallbackFn: (errorType: ClaudeErrorType) => T,
  config: RetryConfig = {}
): Promise<FallbackResult<T>> {
  const result = await withRetry(operation, config)

  if (result.success) {
    return result
  }

  // フォールバックを実行
  try {
    const fallbackData = fallbackFn(result.errorType || 'unknown')
    return {
      success: true,
      data: fallbackData,
      usedFallback: true,
      fallbackReason: result.fallbackReason,
      retryCount: result.retryCount,
      errorType: result.errorType,
    }
  } catch (fallbackError) {
    console.error('[Claude API] Fallback also failed', fallbackError)
    return {
      success: false,
      usedFallback: true,
      fallbackReason: 'Both API and fallback failed',
      retryCount: result.retryCount,
      errorType: result.errorType,
    }
  }
}

// ============================================
// デフォルトのフォールバックレスポンス
// ============================================

/**
 * キーワード提案のデフォルトフォールバック
 */
export function getDefaultKeywordSuggestions(jobType?: string) {
  const baseKeywords = [
    { keyword: `${jobType || '医療'} 求人`, category: 'related' as const, relevanceScore: 90, reason: '基本的な求人検索' },
    { keyword: `${jobType || '医療'} 転職`, category: 'related' as const, relevanceScore: 85, reason: '転職関連キーワード' },
    { keyword: `${jobType || '医療'} 年収`, category: 'longtail' as const, relevanceScore: 75, reason: '条件面の検索' },
  ]

  return {
    keywords: baseKeywords,
    suggestedCategories: ['勤務形態', '給与条件', 'エリア'],
    searchTips: [
      '具体的な条件を追加すると、より絞り込んだ検索ができます',
      'エリアを指定すると地域密着型の求人が見つかりやすくなります',
    ],
  }
}

/**
 * 媒体マッチングのデフォルトフォールバック
 */
export function getDefaultMediaMatchFallback() {
  return {
    matchedMedia: [],
    analysisDetail: {
      overallAssessment: 'AI分析サービスが一時的に利用できません。しばらく時間をおいて再度お試しください。',
      marketAnalysis: '',
      competitorAnalysis: '',
      recommendations: [
        '時間をおいて再度分析を実行してください',
        '手動で媒体一覧をご確認ください',
      ],
    },
  }
}

/**
 * PESO分析のデフォルトフォールバック
 */
export function getDefaultPesoFallback() {
  return {
    scores: {
      paid: 0,
      earned: 0,
      shared: 0,
      owned: 0,
    },
    analysis: 'AI分析サービスが一時的に利用できません。しばらく時間をおいて再度お試しください。',
    recommendations: [
      '時間をおいて再度診断を実行してください',
    ],
  }
}

/**
 * 施策レコメンドのデフォルトフォールバック
 */
export function getDefaultRecommendationsFallback() {
  return {
    shortTerm: ['AI分析サービスが一時的に利用できません'],
    midTerm: [],
    longTerm: [],
    priorityActions: ['時間をおいて再度お試しください'],
  }
}
