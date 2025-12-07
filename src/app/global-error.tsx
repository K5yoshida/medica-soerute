'use client'

/**
 * グローバルエラーハンドラー
 *
 * 設計書: 19_エラーカタログと監視ポリシー
 *
 * アプリケーション全体の未捕捉エラーをキャッチし、
 * Sentryに送信しつつユーザーフレンドリーなエラー画面を表示。
 */
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Sentryにエラーを送信
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#09090B',
            color: '#FAFAFA',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                marginBottom: '1rem',
              }}
            >
              エラーが発生しました
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#A1A1AA',
                marginBottom: '1.5rem',
              }}
            >
              申し訳ございません。予期しないエラーが発生しました。
              <br />
              問題が解決しない場合は、サポートまでお問い合わせください。
            </p>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: '#0D9488',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              もう一度試す
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
