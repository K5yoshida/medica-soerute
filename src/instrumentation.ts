/**
 * Next.js Instrumentation
 *
 * 設計書: 19_エラーカタログと監視ポリシー - 19.6.3 Sentry設定
 *
 * サーバーサイドでSentryを初期化するためのInstrumentation Hook。
 * Next.js 13.4+で利用可能。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}
