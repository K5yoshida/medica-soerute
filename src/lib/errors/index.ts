/**
 * エラーハンドリングライブラリ
 *
 * 設計書: 19_エラーカタログと監視ポリシー
 *
 * APIエラーレスポンスの一貫した生成と、
 * エラーのログ記録を提供。
 */
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { ERROR_CATALOG, type ErrorCode } from './codes'

export { ERROR_CATALOG, type ErrorCode, getDefaultErrorCode } from './codes'

/**
 * エラーレスポンスの型定義
 *
 * 設計書: 19.4.1 標準エラーレスポンス
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode
    message: string
    details?: unknown
    timestamp: string
    request_id?: string
  }
}

/**
 * バリデーションエラーの詳細型
 */
export interface ValidationErrorDetails {
  fields: Array<{
    field: string
    message: string
  }>
}

/**
 * 利用制限エラーの詳細型
 */
export interface LimitErrorDetails {
  feature: string
  limit: number
  current: number
  reset_at?: string
  upgrade_url?: string
}

/**
 * アプリケーションエラークラス
 *
 * エラーコード体系に準拠したエラーを生成。
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly httpStatus: number
  public readonly details?: unknown

  constructor(code: ErrorCode, details?: unknown, customMessage?: string) {
    const definition = ERROR_CATALOG[code]
    super(customMessage || definition.message)

    this.name = 'AppError'
    this.code = code
    this.httpStatus = definition.httpStatus
    this.details = details

    // スタックトレースを正しく設定
    Error.captureStackTrace?.(this, this.constructor)
  }

  /**
   * JSONレスポンス用のオブジェクトを生成
   */
  toJSON(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * NextResponseを生成
   */
  toResponse(): NextResponse<ErrorResponse> {
    return NextResponse.json(this.toJSON(), { status: this.httpStatus })
  }
}

/**
 * エラーレスポンスを生成
 *
 * @param code エラーコード
 * @param details 詳細情報（オプション）
 * @param customMessage カスタムメッセージ（オプション）
 */
export function createErrorResponse(
  code: ErrorCode,
  details?: unknown,
  customMessage?: string
): NextResponse<ErrorResponse> {
  const error = new AppError(code, details, customMessage)

  // 500系エラーはSentryに送信
  if (error.httpStatus >= 500) {
    Sentry.captureException(error, {
      tags: { error_code: code },
      extra: { details },
    })
  }

  return error.toResponse()
}

/**
 * バリデーションエラーレスポンスを生成
 */
export function createValidationErrorResponse(
  fields: Array<{ field: string; message: string }>
): NextResponse<ErrorResponse> {
  const details: ValidationErrorDetails = { fields }
  return createErrorResponse('E-VALID-001', details)
}

/**
 * 利用制限エラーレスポンスを生成
 */
export function createLimitErrorResponse(
  feature: string,
  limit: number,
  current: number,
  resetAt?: Date
): NextResponse<ErrorResponse> {
  const details: LimitErrorDetails = {
    feature,
    limit,
    current,
    reset_at: resetAt?.toISOString(),
    upgrade_url: '/pricing',
  }
  return createErrorResponse('E-LIMIT-001', details)
}

/**
 * 認証エラーレスポンスを生成
 */
export function createAuthErrorResponse(
  code: ErrorCode = 'E-AUTH-001'
): NextResponse<ErrorResponse> {
  return createErrorResponse(code)
}

/**
 * 不明なエラーをAppErrorに変換
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    // Supabaseエラーのハンドリング
    const supabaseError = error as { code?: string; status?: number }
    if (supabaseError.code === 'PGRST116') {
      return new AppError('E-DATA-001')
    }
    if (supabaseError.status === 401) {
      return new AppError('E-AUTH-001')
    }

    // 一般的なエラー
    return new AppError('E-SYS-001', { originalError: error.message })
  }

  return new AppError('E-SYS-001')
}

/**
 * APIルートのエラーハンドラー
 *
 * 使用例:
 * ```ts
 * export async function GET(request: NextRequest) {
 *   return handleApiError(async () => {
 *     // 処理
 *     return NextResponse.json({ success: true, data: result })
 *   })
 * }
 * ```
 */
export async function handleApiError<T>(
  fn: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ErrorResponse>> {
  try {
    return await fn()
  } catch (error) {
    const appError = normalizeError(error)

    // エラーログを出力
    console.error(`[${appError.code}] ${appError.message}`, {
      details: appError.details,
      stack: appError.stack,
    })

    // 500系エラーはSentryに送信
    if (appError.httpStatus >= 500) {
      Sentry.captureException(error, {
        tags: { error_code: appError.code },
        extra: { details: appError.details },
      })
    }

    return appError.toResponse()
  }
}

/**
 * エラーをログに記録（Sentry送信なし）
 */
export function logError(
  code: ErrorCode,
  message: string,
  context?: Record<string, unknown>
): void {
  console.error(`[${code}] ${message}`, context)
}

/**
 * エラーをSentryに送信
 */
export function captureError(
  error: Error | AppError,
  context?: Record<string, unknown>
): void {
  const appError = error instanceof AppError ? error : normalizeError(error)

  Sentry.captureException(error, {
    tags: { error_code: appError.code },
    extra: {
      details: appError.details,
      ...context,
    },
  })
}
