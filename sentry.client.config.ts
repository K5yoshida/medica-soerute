/**
 * Sentry クライアント設定
 *
 * 設計書: 19_エラーカタログと監視ポリシー - 19.6.3 Sentry設定
 *
 * クライアントサイドのエラートラッキングとパフォーマンスモニタリングを設定。
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 環境設定
  environment: process.env.NODE_ENV,

  // パフォーマンスモニタリング
  // 本番環境では100%、開発環境では0%
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,

  // セッションリプレイ
  // 通常セッションは10%、エラー発生時は100%
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // デバッグ（開発環境のみ）
  debug: false,

  // 機密情報のマスキング
  beforeSend(event) {
    // 認証ヘッダーとCookieを削除
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }

    // URLからトークンパラメータを削除
    if (event.request?.url) {
      const url = new URL(event.request.url)
      url.searchParams.delete('token')
      url.searchParams.delete('access_token')
      url.searchParams.delete('refresh_token')
      event.request.url = url.toString()
    }

    return event
  },

  // 無視するエラーパターン
  ignoreErrors: [
    // ブラウザの一般的なエラー
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // ネットワークエラー
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // ユーザーによるナビゲーションキャンセル
    'AbortError',
    // Chrome拡張機能由来
    /^chrome-extension:\/\//,
    // Firefoxアドオン由来
    /^moz-extension:\/\//,
  ],

  // 無視するURLパターン
  denyUrls: [
    // Chrome拡張機能
    /extensions\//i,
    /^chrome:\/\//i,
    // Firefox拡張機能
    /^moz-extension:\/\//i,
    // Safari拡張機能
    /^safari-extension:\/\//i,
  ],

  // Replay設定
  integrations: [
    Sentry.replayIntegration({
      // マスキング設定
      maskAllText: false,
      blockAllMedia: false,
      // 機密フィールドのマスキング
      mask: ['.sensitive', '[data-sentry-mask]'],
      // パスワードフィールドは常にマスク
      maskAllInputs: true,
    }),
  ],
})
