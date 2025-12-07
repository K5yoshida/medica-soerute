import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */

/**
 * セキュリティヘッダー設定
 *
 * 設計書: 23_セキュリティ設計書 - 23.3.2 A05: Security Misconfiguration
 *
 * OWASP Top 10 対策として以下のヘッダーを設定:
 * - CSP: XSS攻撃防止
 * - HSTS: HTTPS強制
 * - X-Content-Type-Options: MIMEスニッフィング防止
 * - X-Frame-Options: クリックジャッキング防止
 * - X-XSS-Protection: ブラウザXSSフィルター有効化
 * - Referrer-Policy: リファラー情報制御
 * - Permissions-Policy: ブラウザ機能制限
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com https://browser.sentry-cdn.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.stripe.com https://vitals.vercel-insights.com https://*.sentry.io https://*.ingest.sentry.io",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "worker-src 'self' blob:",
    ].join('; '),
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const nextConfig = {
  async headers() {
    return [
      {
        // すべてのルートにセキュリティヘッダーを適用
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

/**
 * Sentry設定
 *
 * 設計書: 19_エラーカタログと監視ポリシー - 19.6 監視ポリシー
 */
export default withSentryConfig(nextConfig, {
  // ソースマップを自動的にアップロード
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // ソースマップをSentryにのみアップロードし、クライアントには公開しない
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // 本番ビルド時のみソースマップをアップロード
  silent: !process.env.CI,

  // Sentry Webpack Plugin設定
  widenClientFileUpload: true,

  // Vercel Cron Monitorsを自動設定
  automaticVercelMonitors: true,

  // ビルド時のTelemetryを無効化
  telemetry: false,

  // トンネルルートを有効化（広告ブロッカー対策）
  tunnelRoute: '/monitoring-tunnel',

  // パフォーマンス最適化
  hideSourceMaps: true,
  disableLogger: true,
})
