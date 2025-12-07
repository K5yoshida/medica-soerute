/**
 * Sentry サーバー設定
 *
 * 設計書: 19_エラーカタログと監視ポリシー - 19.6.3 Sentry設定
 *
 * サーバーサイド（API Routes、SSR）のエラートラッキングを設定。
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 環境設定
  environment: process.env.NODE_ENV,

  // パフォーマンスモニタリング
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,

  // デバッグ（開発環境のみ）
  debug: false,

  // 機密情報のマスキング
  beforeSend(event) {
    // 認証ヘッダーとCookieを削除
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }

    // ユーザー情報からメールアドレスをマスク
    if (event.user?.email) {
      const [local, domain] = event.user.email.split('@')
      event.user.email = `${local.slice(0, 2)}***@${domain}`
    }

    return event
  },

  // 無視するエラーパターン
  ignoreErrors: [
    // Next.jsの正常なリダイレクト
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],
})
