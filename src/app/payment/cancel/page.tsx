'use client'

import { useRouter } from 'next/navigation'
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react'

/**
 * SC-502: 決済キャンセル画面
 *
 * Design spec: 09_画面一覧.md - SC-502
 *
 * Features:
 * - キャンセルメッセージ表示
 * - 料金プランへの戻り導線
 * - サポートへの問い合わせ導線
 */

export default function PaymentCancelPage() {
  const router = useRouter()

  const handleGoBack = () => {
    router.push('/dashboard/settings')
  }

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@medica.co.jp?subject=プランについてのお問い合わせ'
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
        {/* Cancel Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <XCircle style={{ width: 40, height: 40, color: '#F59E0B' }} />
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
          お支払いがキャンセルされました
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: '#71717A',
            margin: '0 0 32px 0',
            lineHeight: 1.6,
          }}
        >
          決済処理がキャンセルされました。
          <br />
          プランの選択をやり直すことができます。
        </p>

        {/* Info Box */}
        <div
          style={{
            background: '#FEF3C7',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '32px',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <HelpCircle style={{ width: 20, height: 20, color: '#D97706', flexShrink: 0 }} />
            <div>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#92400E',
                  margin: '0 0 4px 0',
                }}
              >
                ご不明な点がございましたら
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: '#A16207',
                  margin: 0,
                }}
              >
                プランの選び方やお支払い方法についてご質問がありましたら、
                お気軽にサポートまでお問い合わせください。
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleGoBack}
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
            <ArrowLeft style={{ width: 16, height: 16 }} />
            プラン選択に戻る
          </button>

          <button
            onClick={handleContactSupport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 32px',
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#71717A',
              cursor: 'pointer',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <HelpCircle style={{ width: 16, height: 16 }} />
            サポートに問い合わせ
          </button>
        </div>

        <p
          style={{
            fontSize: '12px',
            color: '#A1A1AA',
            marginTop: '24px',
          }}
        >
          お支払い情報は保存されていません
        </p>
      </div>
    </div>
  )
}
