/**
 * 構造化ログライブラリ
 *
 * 設計書: 19_エラーカタログと監視ポリシー - 19.5 ログ設計
 *
 * アプリケーション全体で一貫したログ出力を提供。
 * Sentryとの連携も含む。
 */
import * as Sentry from '@sentry/nextjs'

/**
 * ログレベル定義
 *
 * 設計書: 19.5.1 ログレベル定義
 * - ERROR: システムエラー、外部API障害 → Console + Sentry（即時アラート）
 * - WARN: 利用制限到達、リトライ発生 → Console + Sentry（集計）
 * - INFO: 重要な業務イベント → Console
 * - DEBUG: 開発用詳細情報 → Console (dev only)
 */
type LogLevel = 'error' | 'warn' | 'info' | 'debug'

/**
 * ログコンテキスト
 */
export interface LogContext {
  request_id?: string
  user_id?: string
  action?: string
  duration_ms?: number
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
   * エラーログ
   *
   * システムエラー、外部API障害時に使用。
   * Sentryにも送信される。
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
  }

  /**
   * 警告ログ
   *
   * 利用制限到達、リトライ発生時に使用。
   * Sentryにブレッドクラムとして記録。
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
  }

  /**
   * 情報ログ
   *
   * 重要な業務イベント時に使用。
   */
  info(message: string, context?: LogContext): void {
    const log = this.formatLog('info', message, context)
    console.info(JSON.stringify(log))
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
