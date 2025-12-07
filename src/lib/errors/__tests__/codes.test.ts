/**
 * エラーコード関連のテスト
 *
 * テスト対象: src/lib/errors/codes.ts
 * - getErrorDefinition: エラーコードからエラー定義を取得
 * - getDefaultErrorCode: HTTPステータスからデフォルトのエラーコードを取得
 * - ERROR_CATALOG: エラーカタログの整合性
 */
import { describe, it, expect } from 'vitest'
import {
  ERROR_CATALOG,
  getErrorDefinition,
  getDefaultErrorCode,
} from '../codes'

describe('ERROR_CATALOG', () => {
  // テスト1: すべてのエラーコードが正しい形式を持つ
  it('should have valid error code format for all entries', () => {
    const errorCodePattern = /^E-(AUTH|VALID|LIMIT|EXT|DATA|SYS)-\d{3}$/

    for (const code of Object.keys(ERROR_CATALOG)) {
      expect(code).toMatch(errorCodePattern)
    }
  })

  // テスト2: すべてのエラー定義が必須フィールドを持つ
  it('should have required fields for all error definitions', () => {
    for (const [code, definition] of Object.entries(ERROR_CATALOG)) {
      expect(definition.code).toBe(code)
      expect(definition.httpStatus).toBeGreaterThanOrEqual(400)
      expect(definition.httpStatus).toBeLessThan(600)
      expect(definition.message).toBeTruthy()
      expect(typeof definition.message).toBe('string')
    }
  })

  // テスト3: AUTHカテゴリのエラーが存在する
  it('should have AUTH category errors', () => {
    const authErrors = Object.keys(ERROR_CATALOG).filter(code => code.startsWith('E-AUTH-'))
    expect(authErrors.length).toBeGreaterThan(0)
    expect(authErrors).toContain('E-AUTH-001')
  })

  // テスト4: LIMITカテゴリのエラーが429ステータスを含む
  it('should have rate limit error with 429 status', () => {
    const definition = ERROR_CATALOG['E-LIMIT-004']
    expect(definition).toBeDefined()
    expect(definition.httpStatus).toBe(429)
  })
})

describe('getErrorDefinition', () => {
  // テスト5: 有効なエラーコードの定義を取得できる
  it('should return error definition for valid error code', () => {
    const definition = getErrorDefinition('E-AUTH-001')

    expect(definition).toBeDefined()
    expect(definition.code).toBe('E-AUTH-001')
    expect(definition.httpStatus).toBe(401)
    expect(definition.message).toBe('認証が必要です')
  })

  // テスト6: バリデーションエラーの定義を取得できる
  it('should return validation error definition', () => {
    const definition = getErrorDefinition('E-VALID-003')

    expect(definition).toBeDefined()
    expect(definition.httpStatus).toBe(422)
  })

  // テスト7: システムエラーの定義を取得できる
  it('should return system error definition', () => {
    const definition = getErrorDefinition('E-SYS-001')

    expect(definition).toBeDefined()
    expect(definition.httpStatus).toBe(500)
  })
})

describe('getDefaultErrorCode', () => {
  // テスト8: 401ステータスにはE-AUTH-001を返す
  it('should return E-AUTH-001 for 401 status', () => {
    expect(getDefaultErrorCode(401)).toBe('E-AUTH-001')
  })

  // テスト9: 403ステータスにはE-AUTH-006を返す
  it('should return E-AUTH-006 for 403 status', () => {
    expect(getDefaultErrorCode(403)).toBe('E-AUTH-006')
  })

  // テスト10: 404ステータスにはE-DATA-001を返す
  it('should return E-DATA-001 for 404 status', () => {
    expect(getDefaultErrorCode(404)).toBe('E-DATA-001')
  })

  // テスト11: 429ステータスにはE-LIMIT-004を返す
  it('should return E-LIMIT-004 for 429 status', () => {
    expect(getDefaultErrorCode(429)).toBe('E-LIMIT-004')
  })

  // テスト12: 500ステータスにはE-SYS-001を返す
  it('should return E-SYS-001 for 500 status', () => {
    expect(getDefaultErrorCode(500)).toBe('E-SYS-001')
  })

  // テスト13: 未定義のステータスにはE-SYS-001を返す
  it('should return E-SYS-001 for unknown status', () => {
    expect(getDefaultErrorCode(999)).toBe('E-SYS-001')
  })
})
