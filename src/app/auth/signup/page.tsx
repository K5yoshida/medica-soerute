'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Check } from 'lucide-react'

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
  success: '#22C55E',
  successLight: '#F0FDF4',
}

const registerSchema = z
  .object({
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'パスワードは英大文字、英小文字、数字を含む必要があります'
      ),
    confirmPassword: z.string(),
    displayName: z.string().min(1, '表示名を入力してください'),
    companyName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

// パスワード強度チェック
function checkPasswordStrength(password: string) {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
  }
  const score = Object.values(checks).filter(Boolean).length
  return { checks, score }
}

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ checks: { length: false, lowercase: false, uppercase: false, number: false }, score: 0 })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch('password', '')

  // パスワード変更時に強度をチェック
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPasswordStrength(checkPasswordStrength(value))
  }

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.displayName,
            company_name: data.companyName,
          },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('このメールアドレスは既に登録されています')
        } else {
          setError(authError.message)
        }
        return
      }

      setSuccess(true)
    } catch {
      setError('登録に失敗しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
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
          background: colors.bgPage,
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            background: colors.bgWhite,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '40px 32px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: colors.successLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <CheckCircle2 size={32} style={{ color: colors.success }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.textPrimary, marginBottom: '12px' }}>
            登録完了
          </h2>
          <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, marginBottom: '24px' }}>
            確認メールを送信しました。
            <br />
            メール内のリンクをクリックして登録を完了してください。
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            style={{
              width: '100%',
              height: '40px',
              background: 'transparent',
              color: colors.primary,
              border: `1px solid ${colors.primary}`,
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.1s ease',
            }}
          >
            ログインページへ
          </button>
        </div>
      </div>
    )
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
          <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.7, marginBottom: '32px' }}>
            求人媒体の本質を、データで可視化する
          </p>

          {/* 機能紹介 */}
          <div style={{ textAlign: 'left' }}>
            {[
              '媒体カタログ - 30+媒体のデータを網羅',
              '媒体マッチング - AIが最適媒体を提案',
              'PESO診断 - 採用活動を4軸で診断',
            ].map((feature, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                }}
              >
                <Check size={18} />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右側：登録フォーム */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* ロゴ（モバイル用） */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }} className="mobile-logo">
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
                新規アカウント登録
              </h2>
              <p style={{ fontSize: '14px', color: colors.textSecondary }}>
                14日間の無料トライアルを開始
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
                  メールアドレス <span style={{ color: colors.error }}>*</span>
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
                />
                {errors.email && (
                  <p style={{ fontSize: '12px', color: colors.error, marginTop: '4px' }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* 表示名 */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="displayName"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: colors.textPrimary,
                    marginBottom: '6px',
                  }}
                >
                  表示名 <span style={{ color: colors.error }}>*</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  placeholder="山田 太郎"
                  {...register('displayName')}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: colors.textPrimary,
                    background: colors.bgWhite,
                    border: `1px solid ${errors.displayName ? colors.error : colors.border}`,
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'border-color 0.1s ease',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.displayName && (
                  <p style={{ fontSize: '12px', color: colors.error, marginTop: '4px' }}>
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              {/* 会社名 */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="companyName"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: colors.textPrimary,
                    marginBottom: '6px',
                  }}
                >
                  会社名（任意）
                </label>
                <input
                  id="companyName"
                  type="text"
                  placeholder="株式会社〇〇"
                  {...register('companyName')}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: colors.textPrimary,
                    background: colors.bgWhite,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'border-color 0.1s ease',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* パスワード */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: colors.textPrimary,
                    marginBottom: '6px',
                  }}
                >
                  パスワード <span style={{ color: colors.error }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      onChange: handlePasswordChange,
                    })}
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

                {/* パスワード強度インジケーター */}
                {password && (
                  <div style={{ marginTop: '8px' }}>
                    {/* 強度バー */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          style={{
                            flex: 1,
                            height: '4px',
                            borderRadius: '2px',
                            background: passwordStrength.score >= level
                              ? passwordStrength.score <= 2 ? colors.error
                                : passwordStrength.score === 3 ? '#EAB308'
                                : colors.success
                              : colors.bgSubtle,
                            transition: 'background 0.2s ease',
                          }}
                        />
                      ))}
                    </div>
                    {/* チェックリスト */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                      {[
                        { key: 'length', label: '8文字以上' },
                        { key: 'lowercase', label: '英小文字' },
                        { key: 'uppercase', label: '英大文字' },
                        { key: 'number', label: '数字' },
                      ].map(({ key, label }) => (
                        <div
                          key={key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: passwordStrength.checks[key as keyof typeof passwordStrength.checks]
                              ? colors.success
                              : colors.textMuted,
                          }}
                        >
                          {passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? (
                            <Check size={12} />
                          ) : (
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: `1px solid ${colors.border}` }} />
                          )}
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* パスワード確認 */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="confirmPassword"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: colors.textPrimary,
                    marginBottom: '6px',
                  }}
                >
                  パスワード（確認） <span style={{ color: colors.error }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '8px 40px 8px 12px',
                      fontSize: '14px',
                      color: colors.textPrimary,
                      background: colors.bgWhite,
                      border: `1px solid ${errors.confirmPassword ? colors.error : colors.border}`,
                      borderRadius: '6px',
                      outline: 'none',
                      transition: 'border-color 0.1s ease',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                    {showConfirmPassword ? (
                      <EyeOff size={18} style={{ color: colors.textMuted }} />
                    ) : (
                      <Eye size={18} style={{ color: colors.textMuted }} />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p style={{ fontSize: '12px', color: colors.error, marginTop: '4px' }}>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* 登録ボタン */}
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
                    登録中...
                  </>
                ) : (
                  'アカウントを作成'
                )}
              </button>

              {/* 利用規約 */}
              <p style={{ fontSize: '11px', color: colors.textMuted, textAlign: 'center', marginTop: '16px', lineHeight: 1.6 }}>
                アカウントを作成することで、
                <Link href="#" style={{ color: colors.primary, textDecoration: 'none' }}>利用規約</Link>
                および
                <Link href="#" style={{ color: colors.primary, textDecoration: 'none' }}>プライバシーポリシー</Link>
                に同意したものとみなされます。
              </p>
            </form>

            {/* ログインリンク */}
            <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary }}>
                既にアカウントをお持ちの方は
              </span>{' '}
              <Link
                href="/auth/login"
                style={{
                  fontSize: '13px',
                  color: colors.primary,
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                ログイン
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
