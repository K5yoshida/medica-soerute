'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react'

/**
 * SC-501: 決済完了画面
 *
 * Design spec: 09_画面一覧.md - SC-501
 *
 * Features:
 * - 決済完了メッセージ表示
 * - プラン情報の確認
 * - ダッシュボードへの導線
 */

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [planInfo, setPlanInfo] = useState<{
    name: string
    price: string
    features: string[]
  } | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')

    // セッション情報を取得（オプション）
    if (sessionId) {
      // 実際のAPIからセッション情報を取得することも可能
      // ここではダミーデータを使用
      setTimeout(() => {
        setPlanInfo({
          name: 'Starter',
          price: '¥9,800/月',
          features: [
            'マッチング分析 20回/月',
            'PESO診断 10回/月',
            '媒体カタログ閲覧 無制限',
            'CSVエクスポート',
          ],
        })
        setLoading(false)
      }, 1000)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAFAFA',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E4E4E7',
          padding: '48px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px' }}>
            <Loader2
              style={{
                width: 48,
                height: 48,
                color: '#7C3AED',
                animation: 'spin 1s linear infinite',
                margin: '0 auto',
              }}
            />
            <p style={{ marginTop: '16px', color: '#71717A', fontSize: '14px' }}>
              処理中...
            </p>
          </div>
        ) : (
          <>
            {/* Success Icon */}
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(13, 148, 136, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <CheckCircle style={{ width: 40, height: 40, color: '#0D9488' }} />
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: '#18181B',
                margin: '0 0 8px 0',
              }}
            >
              お支払いが完了しました
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: '#71717A',
                margin: '0 0 32px 0',
              }}
            >
              ご登録ありがとうございます。すべての機能がご利用いただけます。
            </p>

            {/* Plan Info */}
            {planInfo && (
              <div
                style={{
                  background: '#FAFAFA',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '32px',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#18181B' }}>
                    {planInfo.name}プラン
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#7C3AED' }}>
                    {planInfo.price}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {planInfo.features.map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: '#71717A',
                      }}
                    >
                      <CheckCircle style={{ width: 14, height: 14, color: '#0D9488' }} />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={handleGoToDashboard}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 32px',
                background: '#7C3AED',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'center',
              }}
            >
              ダッシュボードへ
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>

            <p
              style={{
                fontSize: '12px',
                color: '#A1A1AA',
                marginTop: '16px',
              }}
            >
              領収書はご登録のメールアドレスに送信されます
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FAFAFA',
          }}
        >
          <Loader2
            style={{
              width: 32,
              height: 32,
              color: '#7C3AED',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  )
}
