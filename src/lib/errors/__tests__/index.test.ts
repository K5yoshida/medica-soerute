/**
 * エラーハンドリングライブラリのテスト
 *
 * テスト対象: src/lib/errors/index.ts
 * - AppError: アプリケーションエラークラス
 * - normalizeError: エラー正規化関数
 */
import { describe, it, expect } from 'vitest'
import { AppError, normalizeError } from '../index'

describe('AppError', () => {
  // テスト14: AppErrorのインスタンスが正しく作成される
  it('should create AppError instance with correct properties', () => {
    const error = new AppError('E-AUTH-001')

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe('E-AUTH-001')
    expect(error.httpStatus).toBe(401)
    expect(error.message).toBe('認証が必要です')
    expect(error.name).toBe('AppError')
  })

  // テスト15: カスタムメッセージでAppErrorを作成できる
  it('should allow custom message', () => {
    const error = new AppError('E-AUTH-001', undefined, 'カスタムメッセージ')

    expect(error.message).toBe('カスタムメッセージ')
    expect(error.code).toBe('E-AUTH-001')
  })

  // テスト16: detailsを含むAppErrorを作成できる
  it('should include details when provided', () => {
    const details = { field: 'email', reason: 'invalid format' }
    const error = new AppError('E-VALID-001', details)

    expect(error.details).toEqual(details)
  })

  // テスト17: toJSON()が正しいフォーマットを返す
  it('should return correct JSON format', () => {
    const details = { field: 'test' }
    const error = new AppError('E-DATA-001', details)
    const json = error.toJSON()

    expect(json.error).toBeDefined()
    expect(json.error.code).toBe('E-DATA-001')
    expect(json.error.message).toBe('指定されたデータが見つかりません')
    expect(json.error.details).toEqual(details)
    expect(json.error.timestamp).toBeDefined()
    expect(new Date(json.error.timestamp).getTime()).not.toBeNaN()
  })

  // テスト18: 500系エラーのhttpStatusが正しい
  it('should have correct httpStatus for 500 errors', () => {
    const error = new AppError('E-SYS-001')
    expect(error.httpStatus).toBe(500)
  })
})

describe('normalizeError', () => {
  // テスト19: AppErrorはそのまま返される
  it('should return AppError as is', () => {
    const appError = new AppError('E-AUTH-001')
    const normalized = normalizeError(appError)

    expect(normalized).toBe(appError)
  })

  // テスト20: 通常のErrorはE-SYS-001に変換される
  it('should convert regular Error to E-SYS-001', () => {
    const error = new Error('Something went wrong')
    const normalized = normalizeError(error)

    expect(normalized).toBeInstanceOf(AppError)
    expect(normalized.code).toBe('E-SYS-001')
    expect(normalized.details).toEqual({ originalError: 'Something went wrong' })
  })

  // テスト21: Supabase PGRST116エラーはE-DATA-001に変換される
  it('should convert Supabase PGRST116 error to E-DATA-001', () => {
    const supabaseError = new Error('Row not found')
    ;(supabaseError as Error & { code: string }).code = 'PGRST116'

    const normalized = normalizeError(supabaseError)

    expect(normalized.code).toBe('E-DATA-001')
  })

  // テスト22: Supabase 401エラーはE-AUTH-001に変換される
  it('should convert Supabase 401 error to E-AUTH-001', () => {
    const supabaseError = new Error('Unauthorized')
    ;(supabaseError as Error & { status: number }).status = 401

    const normalized = normalizeError(supabaseError)

    expect(normalized.code).toBe('E-AUTH-001')
  })

  // テスト23: 非Errorオブジェクトはe-SYS-001に変換される
  it('should convert non-Error to E-SYS-001', () => {
    const normalized = normalizeError('string error')

    expect(normalized).toBeInstanceOf(AppError)
    expect(normalized.code).toBe('E-SYS-001')
  })

  // テスト24: undefinedはE-SYS-001に変換される
  it('should convert undefined to E-SYS-001', () => {
    const normalized = normalizeError(undefined)

    expect(normalized).toBeInstanceOf(AppError)
    expect(normalized.code).toBe('E-SYS-001')
  })
})
