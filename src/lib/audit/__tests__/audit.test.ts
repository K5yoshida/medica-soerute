/**
 * 監査ログモジュールのテスト
 * 設計書: GAP-020 監査ログ実装
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase mock
const mockInsert = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}))

import { logAuditEvent, extractClientInfo, type AuditLogEntry } from '../index'

describe('logAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('ログイン成功イベントを記録できる', async () => {
    const entry: AuditLogEntry = {
      action: 'auth.login',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      success: true,
    }

    await logAuditEvent(entry)

    expect(mockInsert).toHaveBeenCalledOnce()
    const insertData = mockInsert.mock.calls[0][0]
    expect(insertData.level).toBe('info')
    expect(insertData.category).toBe('security')
    expect(insertData.action).toBe('auth.login')
    expect(insertData.user_id).toBe('user-123')
    expect(insertData.ip_address).toBe('192.168.1.1')
    expect(insertData.metadata.audit).toBe(true)
    expect(insertData.metadata.success).toBe(true)
  })

  it('ログイン失敗イベントはwarnレベルで記録される', async () => {
    const entry: AuditLogEntry = {
      action: 'auth.login_failed',
      userId: undefined,
      ipAddress: '192.168.1.1',
      success: false,
      details: { reason: 'invalid_password' },
    }

    await logAuditEvent(entry)

    const insertData = mockInsert.mock.calls[0][0]
    expect(insertData.level).toBe('warn')
    expect(insertData.metadata.success).toBe(false)
    expect(insertData.metadata.reason).toBe('invalid_password')
  })

  it('データエクスポートイベントにリソース情報が含まれる', async () => {
    const entry: AuditLogEntry = {
      action: 'data.exported',
      userId: 'user-123',
      targetResourceType: 'peso_diagnosis',
      targetResourceId: 'diag-456',
      details: { format: 'csv' },
      success: true,
    }

    await logAuditEvent(entry)

    const insertData = mockInsert.mock.calls[0][0]
    expect(insertData.message).toContain('peso_diagnosis')
    expect(insertData.message).toContain('diag-456')
    expect(insertData.metadata.target_resource_type).toBe('peso_diagnosis')
    expect(insertData.metadata.target_resource_id).toBe('diag-456')
    expect(insertData.metadata.format).toBe('csv')
  })

  it('対象ユーザーが別の場合はメッセージに含まれる', async () => {
    const entry: AuditLogEntry = {
      action: 'admin.user_modified',
      userId: 'admin-123',
      targetUserId: 'user-456',
      success: true,
    }

    await logAuditEvent(entry)

    const insertData = mockInsert.mock.calls[0][0]
    expect(insertData.message).toContain('user-456')
    expect(insertData.metadata.target_user_id).toBe('user-456')
  })

  it('DB挿入エラーでも例外を投げない', async () => {
    mockInsert.mockResolvedValue({ error: new Error('DB connection failed') })

    // エラーが発生しても例外を投げないことを確認
    await expect(
      logAuditEvent({
        action: 'auth.login',
        userId: 'user-123',
        success: true,
      })
    ).resolves.not.toThrow()
  })
})

describe('extractClientInfo', () => {
  it('x-forwarded-forヘッダーからIPアドレスを抽出できる', () => {
    const mockRequest = {
      headers: new Headers({
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }),
    } as Request

    const info = extractClientInfo(mockRequest)

    expect(info.ipAddress).toBe('203.0.113.195')
    expect(info.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
  })

  it('x-real-ipヘッダーからフォールバックできる', () => {
    const mockRequest = {
      headers: new Headers({
        'x-real-ip': '192.168.1.100',
        'user-agent': 'curl/7.68.0',
      }),
    } as Request

    const info = extractClientInfo(mockRequest)

    expect(info.ipAddress).toBe('192.168.1.100')
    expect(info.userAgent).toBe('curl/7.68.0')
  })

  it('ヘッダーがない場合はundefinedを返す', () => {
    const mockRequest = {
      headers: new Headers({}),
    } as Request

    const info = extractClientInfo(mockRequest)

    expect(info.ipAddress).toBeUndefined()
    expect(info.userAgent).toBeUndefined()
  })
})
