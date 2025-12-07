/**
 * Sentry Edge設定
 *
 * 設計書: 19_エラーカタログと監視ポリシー - 19.6.3 Sentry設定
 *
 * Edge Runtime（Middleware等）のエラートラッキングを設定。
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 環境設定
  environment: process.env.NODE_ENV,

  // パフォーマンスモニタリング
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,

  // デバッグ
  debug: false,

  // 機密情報のマスキング
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }
    return event
  },
})
