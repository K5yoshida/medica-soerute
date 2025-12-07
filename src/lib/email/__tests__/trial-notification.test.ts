/**
 * トライアル期間終了通知のテスト
 * 設計書: GAP-009 トライアル期間終了通知スケジュール
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Resend mock
const mockSend = vi.fn()
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: mockSend,
      }
    },
  }
})

// 環境変数のモック
vi.stubEnv('RESEND_API_KEY', 'test-api-key')
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://test.example.com')

import { sendTrialExpirationNotification } from '../index'

describe('sendTrialExpirationNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({ data: { id: 'test-message-id' }, error: null })
  })

  it('7日前通知: 正しい件名とメッセージで送信される', async () => {
    const result = await sendTrialExpirationNotification({
      email: 'test@example.com',
      userName: 'テスト株式会社',
      daysRemaining: 7,
      trialEndsAt: '2025-12-14T23:59:59.000Z',
    })

    expect(result.success).toBe(true)
    expect(mockSend).toHaveBeenCalledOnce()

    const callArgs = mockSend.mock.calls[0][0]
    expect(callArgs.subject).toBe('トライアル期間終了まで1週間です - MEDICA SOERUTE')
    expect(callArgs.to).toBe('test@example.com')
    expect(callArgs.html).toContain('トライアル期間終了まで残り7日')
    expect(callArgs.html).toContain('テスト株式会社')
    expect(callArgs.html).toContain('https://test.example.com/settings/billing')
  })

  it('3日前通知: 正しい件名で送信される', async () => {
    await sendTrialExpirationNotification({
      email: 'test@example.com',
      daysRemaining: 3,
      trialEndsAt: '2025-12-10T23:59:59.000Z',
    })

    const callArgs = mockSend.mock.calls[0][0]
    expect(callArgs.subject).toBe('トライアル期間終了まで3日です - MEDICA SOERUTE')
    expect(callArgs.html).toContain('トライアル期間終了まで残り3日')
  })

  it('1日前通知: 緊急マーク付きの件名で送信される', async () => {
    await sendTrialExpirationNotification({
      email: 'test@example.com',
      daysRemaining: 1,
      trialEndsAt: '2025-12-08T23:59:59.000Z',
    })

    const callArgs = mockSend.mock.calls[0][0]
    expect(callArgs.subject).toBe('【重要】明日トライアル期間が終了します - MEDICA SOERUTE')
    expect(callArgs.html).toContain('トライアル期間は明日終了します')
  })

  it('当日通知: 最も緊急度の高いメッセージで送信される', async () => {
    await sendTrialExpirationNotification({
      email: 'test@example.com',
      daysRemaining: 0,
      trialEndsAt: '2025-12-07T23:59:59.000Z',
    })

    const callArgs = mockSend.mock.calls[0][0]
    expect(callArgs.subject).toBe('【重要】本日トライアル期間が終了します - MEDICA SOERUTE')
    expect(callArgs.html).toContain('トライアル期間は本日終了します')
  })

  it('ユーザー名がない場合はお客様と表示される', async () => {
    await sendTrialExpirationNotification({
      email: 'test@example.com',
      daysRemaining: 7,
      trialEndsAt: '2025-12-14T23:59:59.000Z',
    })

    const callArgs = mockSend.mock.calls[0][0]
    expect(callArgs.html).toContain('お客様様')
    expect(callArgs.text).toContain('お客様様')
  })

  it('終了日が正しくフォーマットされる', async () => {
    await sendTrialExpirationNotification({
      email: 'test@example.com',
      daysRemaining: 7,
      trialEndsAt: '2025-12-14T23:59:59.000Z',
    })

    const callArgs = mockSend.mock.calls[0][0]
    // 日本語のロケールでフォーマットされることを確認
    expect(callArgs.html).toContain('2025年12月')
  })

  it('メール送信エラー時はエラー結果を返す', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'Rate limit exceeded' } })

    const result = await sendTrialExpirationNotification({
      email: 'test@example.com',
      daysRemaining: 7,
      trialEndsAt: '2025-12-14T23:59:59.000Z',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Rate limit exceeded')
  })

  it('プレーンテキスト版も含まれる', async () => {
    await sendTrialExpirationNotification({
      email: 'test@example.com',
      userName: 'テスト株式会社',
      daysRemaining: 7,
      trialEndsAt: '2025-12-14T23:59:59.000Z',
    })

    const callArgs = mockSend.mock.calls[0][0]
    expect(callArgs.text).toContain('テスト株式会社様')
    expect(callArgs.text).toContain('トライアル期間終了まで残り7日')
    expect(callArgs.text).toContain('https://test.example.com/settings/billing')
  })
})
