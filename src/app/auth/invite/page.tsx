'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { UserPlus, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

/**
 * SC-006: 招待受諾画面
 *
 * Design spec: 09_画面一覧.md - SC-006
 *
 * Features:
 * - 招待トークン検証
 * - パスワード設定
 * - 表示名入力（オプション）
 * - アカウント作成完了
 */

function InvitePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [token, setToken] = useState<string>('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  useEffect(() => {
    const tokenParam = searchParams.get('token') || searchParams.get('token_hash')
    if (tokenParam) {
      setToken(tokenParam)
      setTokenValid(true) // トークンの存在を確認
    } else {
      setTokenValid(false)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // バリデーション
    if (!password) {
      setError('パスワードを入力してください')
      return
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }

    if (password !== passwordConfirmation) {
      setError('パスワードが一致しません')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          password_confirmation: passwordConfirmation,
          display_name: displayName || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || '招待の受諾に失敗しました')
      }

      setSuccess(true)

      // 3秒後にダッシュボードへリダイレクト
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '招待の受諾に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // トークンがない場合
  if (tokenValid === false) {
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
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <AlertCircle style={{ width: 32, height: 32, color: '#EF4444' }} />
          </div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#18181B',
              margin: '0 0 8px 0',
            }}
          >
            無効な招待リンク
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#71717A',
              margin: '0 0 24px 0',
            }}
          >
            招待リンクが無効または期限切れです。
            <br />
            管理者に新しい招待を依頼してください。
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            style={{
              padding: '10px 24px',
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#71717A',
              cursor: 'pointer',
            }}
          >
            ログインページへ
          </button>
        </div>
      </div>
    )
  }

  // 成功画面
  if (success) {
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
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(13, 148, 136, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <CheckCircle style={{ width: 32, height: 32, color: '#0D9488' }} />
          </div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#18181B',
              margin: '0 0 8px 0',
            }}
          >
            アカウント作成完了
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#71717A',
              margin: 0,
            }}
          >
            ダッシュボードへ移動します...
          </p>
        </div>
      </div>
    )
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
          padding: '40px',
          maxWidth: '400px',
          width: '100%',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '12px',
              background: 'rgba(124, 58, 237, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <UserPlus style={{ width: 28, height: 28, color: '#7C3AED' }} />
          </div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#18181B',
              margin: '0 0 4px 0',
            }}
          >
            招待を受諾
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#71717A',
              margin: 0,
            }}
          >
            パスワードを設定してアカウントを作成
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: '#EF4444' }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Display Name */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#18181B',
                marginBottom: '6px',
              }}
            >
              表示名（オプション）
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例: 山田 太郎"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #E4E4E7',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#18181B',
                marginBottom: '6px',
              }}
            >
              パスワード <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E4E4E7',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? (
                  <EyeOff style={{ width: 18, height: 18, color: '#A1A1AA' }} />
                ) : (
                  <Eye style={{ width: 18, height: 18, color: '#A1A1AA' }} />
                )}
              </button>
            </div>
          </div>

          {/* Password Confirmation */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#18181B',
                marginBottom: '6px',
              }}
            >
              パスワード（確認） <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="パスワードを再入力"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #E4E4E7',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#7C3AED',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading && (
              <Loader2
                style={{
                  width: 16,
                  height: 16,
                  animation: 'spin 1s linear infinite',
                }}
              />
            )}
            {loading ? '処理中...' : 'アカウントを作成'}
          </button>
        </form>
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

export default function InvitePage() {
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
      <InvitePageContent />
    </Suspense>
  )
}
