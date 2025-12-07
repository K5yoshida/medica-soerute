'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

// デザインシステムカラー（03_ブランディングとデザインガイドより）
const colors = {
  primary: '#0D9488',
  primaryDark: '#0F766E',
  primaryLight: '#F0FDFA',
  textPrimary: '#18181B',
  textSecondary: '#52525B',
  textMuted: '#A1A1AA',
  textPlaceholder: '#D4D4D8',
  bgWhite: '#FFFFFF',
  bgPage: '#FAFAFA',
  bgSubtle: '#F4F4F5',
  border: '#E4E4E7',
  borderFocus: '#A1A1AA',
  error: '#EF4444',
  errorLight: '#FEF2F2',
}

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('メールアドレスまたはパスワードが正しくありません')
        } else {
          setError(authError.message)
        }
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('ログインに失敗しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: colors.bgPage,
      }}
    >
      {/* 左側：ブランドエリア */}
      <div
        style={{
          flex: 1,
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="brand-area"
      >
        {/* 背景パターン */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
                              radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
            MEDICA SOERUTE
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.7 }}>
            求人媒体の本質を、データで可視化する
          </p>

          <div style={{ marginTop: '48px' }}>
            <div
              style={{
                display: 'flex',
                gap: '24px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              {[
                { label: '30+', desc: '収録媒体数' },
                { label: '10,000+', desc: 'キーワード' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>{stat.label}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>{stat.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 右側：ログインフォーム */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* ロゴ（モバイル用） */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }} className="mobile-logo">
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: colors.primary }}>
                MEDICA SOERUTE
              </span>
            </Link>
          </div>

          {/* フォームカード */}
          <div
            style={{
              background: colors.bgWhite,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '32px',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.textPrimary, marginBottom: '8px' }}>
                ログイン
              </h2>
              <p style={{ fontSize: '14px', color: colors.textSecondary }}>
                アカウントにログインしてください
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* エラーメッセージ */}
              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: colors.errorLight,
                    border: `1px solid ${colors.error}20`,
                    borderRadius: '6px',
                    marginBottom: '20px',
                  }}
                >
                  <AlertCircle size={16} style={{ color: colors.error, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: colors.error }}>{error}</span>
                </div>
              )}

              {/* メールアドレス */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: colors.textPrimary,
                    marginBottom: '6px',
                  }}
                >
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  {...register('email')}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: colors.textPrimary,
                    background: colors.bgWhite,
                    border: `1px solid ${errors.email ? colors.error : colors.border}`,
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'border-color 0.1s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    if (!errors.email) e.target.style.borderColor = colors.borderFocus
                  }}
                  onBlur={(e) => {
                    if (!errors.email) e.target.style.borderColor = colors.border
                  }}
                />
                {errors.email && (
                  <p style={{ fontSize: '12px', color: colors.error, marginTop: '4px' }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* パスワード */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label
                    htmlFor="password"
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: colors.textPrimary,
                    }}
                  >
                    パスワード
                  </label>
                  <Link
                    href="/auth/password/forgot"
                    style={{
                      fontSize: '12px',
                      color: colors.primary,
                      textDecoration: 'none',
                    }}
                  >
                    パスワードを忘れた方
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '8px 40px 8px 12px',
                      fontSize: '14px',
                      color: colors.textPrimary,
                      background: colors.bgWhite,
                      border: `1px solid ${errors.password ? colors.error : colors.border}`,
                      borderRadius: '6px',
                      outline: 'none',
                      transition: 'border-color 0.1s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      if (!errors.password) e.target.style.borderColor = colors.borderFocus
                    }}
                    onBlur={(e) => {
                      if (!errors.password) e.target.style.borderColor = colors.border
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
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} style={{ color: colors.textMuted }} />
                    ) : (
                      <Eye size={18} style={{ color: colors.textMuted }} />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ fontSize: '12px', color: colors.error, marginTop: '4px' }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* ログインボタン */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '40px',
                  background: isLoading ? colors.textMuted : colors.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) e.currentTarget.style.background = colors.primaryDark
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) e.currentTarget.style.background = colors.primary
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ログイン中...
                  </>
                ) : (
                  'ログイン'
                )}
              </button>
            </form>

            {/* 新規登録リンク */}
            <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary }}>
                アカウントをお持ちでない方は
              </span>{' '}
              <Link
                href="/auth/signup"
                style={{
                  fontSize: '13px',
                  color: colors.primary,
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                新規登録
              </Link>
            </div>
          </div>

          {/* フッター */}
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link
              href="/"
              style={{
                fontSize: '13px',
                color: colors.textMuted,
                textDecoration: 'none',
              }}
            >
              ← トップページに戻る
            </Link>
          </div>
        </div>
      </div>

      {/* レスポンシブスタイル */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (min-width: 768px) {
          .brand-area {
            display: flex !important;
          }
          .mobile-logo {
            display: none !important;
          }
        }

        @media (max-width: 767px) {
          .brand-area {
            display: none !important;
          }
          .mobile-logo {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
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
          <Loader2 size={24} style={{ color: '#0D9488', animation: 'spin 1s linear infinite' }} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
