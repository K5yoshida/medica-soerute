/**
 * 構造化ログライブラリ
 *
 * 設計書: 19_エラーカタログと監視ポリシー - 19.5 ログ設計
 *
 * アプリケーション全体で一貫したログ出力を提供。
 * Sentryとの連携も含む。
 * DBへの永続化はバックグラウンドで非同期実行。
 */
import * as Sentry from '@sentry/nextjs'

/**
 * ログレベル定義
 *
 * 設計書: 19.5.1 ログレベル定義
 * - ERROR: システムエラー、外部API障害 → Console + Sentry（即時アラート）+ DB保存
 * - WARN: 利用制限到達、リトライ発生 → Console + Sentry（集計）+ DB保存
 * - INFO: 重要な業務イベント → Console + DB保存（本番のみ）
 * - DEBUG: 開発用詳細情報 → Console (dev only)
 */
type LogLevel = 'error' | 'warn' | 'info' | 'debug'

/**
 * ログカテゴリ定義
 *
 * 設計書: 19.5.4 ログカテゴリ
 */
type LogCategory = 'auth' | 'api' | 'system' | 'billing' | 'user' | 'external' | 'job' | 'security'

/**
 * ログコンテキスト
 */
export interface LogContext {
  request_id?: string
  user_id?: string
  action?: string
  duration_ms?: number
  category?: LogCategory
  ip_address?: string
  user_agent?: string
  [key: string]: unknown
}

/**
 * ログエラー情報
 */
interface LogError {
  code?: string
  name: string
  message: string
  stack?: string
}

/**
 * 構造化ログフォーマット
 *
 * 設計書: 19.5.2 ログフォーマット
 */
interface StructuredLog {
  timestamp: string
  level: string
  message: string
  context?: LogContext
  error?: LogError
  metadata: {
    environment: string | undefined
    version: string | undefined
  }
}

/**
 * DB保存用ログデータ
 */
interface SystemLogData {
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

/**
 * ログをDBに非同期保存する関数
 * エラーが発生してもログ出力には影響しない
 */
async function persistLog(data: SystemLogData): Promise<void> {
  // 本番環境でのみDB保存（開発時はコンソールのみ）
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  try {
    // 内部APIを呼び出してDB保存（非同期・fire-and-forget）
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    await fetch(`${baseUrl}/api/internal/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '',
      },
      body: JSON.stringify(data),
    }).catch(() => {
      // DB保存失敗は無視（ログ出力には影響させない）
    })
  } catch {
    // DB保存失敗は無視
  }
}

/**
 * Loggerクラス
 *
 * シングルトンパターンでアプリケーション全体で共有。
 */
class Logger {
  /**
   * 構造化ログをフォーマット
   */
  private formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: LogError
  ): StructuredLog {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      context,
      error,
      metadata: {
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version,
      },
    }
  }

  /**
   * DB保存用データを作成
   */
  private createLogData(
    level: LogLevel,
    message: string,
    category: LogCategory,
    context?: LogContext,
    error?: LogError
  ): SystemLogData {
    const { category: _, ip_address, user_agent, ...restContext } = context || {}
    return {
      level,
      category,
      message,
      request_id: context?.request_id,
      user_id: context?.user_id,
      action: context?.action,
      duration_ms: context?.duration_ms,
      error_code: error?.code,
      error_name: error?.name,
      error_message: error?.message,
      error_stack: error?.stack,
      ip_address,
      user_agent,
      metadata: Object.keys(restContext).length > 0 ? restContext : undefined,
    }
  }

  /**
   * エラーログ
   *
   * システムエラー、外部API障害時に使用。
   * Sentryにも送信される。DBにも保存される。
   */
  error(message: string, context?: LogContext, error?: Error): void {
    const logError = error
      ? {
          code: (error as Error & { code?: string }).code,
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined

    const log = this.formatLog('error', message, context, logError)
    console.error(JSON.stringify(log))

    // Sentryに送信
    if (error) {
      Sentry.captureException(error, {
        extra: context,
        tags: {
          action: context?.action,
        },
      })
    } else {
      Sentry.captureMessage(message, {
        level: 'error',
        extra: context,
        tags: {
          action: context?.action,
        },
      })
    }

    // DB保存（非同期・fire-and-forget）
    const category = context?.category || 'system'
    void persistLog(this.createLogData('error', message, category, context, logError))
  }

  /**
   * 警告ログ
   *
   * 利用制限到達、リトライ発生時に使用。
   * Sentryにブレッドクラムとして記録。DBにも保存される。
   */
  warn(message: string, context?: LogContext): void {
    const log = this.formatLog('warn', message, context)
    console.warn(JSON.stringify(log))

    // Sentryにブレッドクラムとして記録
    Sentry.addBreadcrumb({
      category: 'warning',
      message,
      level: 'warning',
      data: context,
    })

    // DB保存（非同期・fire-and-forget）
    const category = context?.category || 'system'
    void persistLog(this.createLogData('warn', message, category, context))
  }

  /**
   * 情報ログ
   *
   * 重要な業務イベント時に使用。
   * 本番環境ではDBにも保存される。
   */
  info(message: string, context?: LogContext): void {
    const log = this.formatLog('info', message, context)
    console.info(JSON.stringify(log))

    // DB保存（非同期・fire-and-forget）- 重要なイベントのみ
    const category = context?.category || 'system'
    void persistLog(this.createLogData('info', message, category, context))
  }

  /**
   * デバッグログ
   *
   * 開発用詳細情報。本番では出力されない。
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      const log = this.formatLog('debug', message, context)
      console.debug(JSON.stringify(log))
    }
  }

  /**
   * API呼び出しログ
   *
   * APIリクエスト/レスポンスのログ出力用ヘルパー。
   */
  apiCall(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    const message = `${method} ${path} ${statusCode}`

    const logContext: LogContext = {
      ...context,
      method,
      path,
      status_code: statusCode,
      duration_ms: durationMs,
    }

    if (level === 'error') {
      this.error(message, logContext)
    } else if (level === 'warn') {
      this.warn(message, logContext)
    } else {
      this.info(message, logContext)
    }
  }

  /**
   * 外部サービス呼び出しログ
   *
   * Claude API、Stripe等の外部サービス呼び出し時に使用。
   */
  externalCall(
    service: string,
    operation: string,
    success: boolean,
    durationMs: number,
    context?: LogContext
  ): void {
    const message = `External call: ${service}.${operation} ${success ? 'succeeded' : 'failed'}`

    const logContext: LogContext = {
      ...context,
      service,
      operation,
      success,
      duration_ms: durationMs,
    }

    if (success) {
      this.info(message, logContext)
    } else {
      this.warn(message, logContext)
    }
  }
}

/**
 * シングルトンインスタンス
 */
export const logger = new Logger()
