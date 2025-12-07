'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  BookOpen,
  Target,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Users,
  Shield,
  Zap,
  ChevronDown,
  Menu,
  X
} from 'lucide-react'

// デザインシステムカラー（03_ブランディングとデザインガイドより）
const colors = {
  primary: '#0D9488',
  primaryLight: '#F0FDFA',
  primaryDark: '#0F766E',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#18181B',
  textSecondary: '#52525B',
  textMuted: '#A1A1AA',
  border: '#E4E4E7',
  success: '#22C55E',
  accent: '#8B5CF6',
}

const features = [
  {
    icon: BookOpen,
    title: '媒体カタログ',
    description: '医療・介護業界の主要求人媒体を網羅。SEOキーワード、流入データ、競合分析を一元管理。',
    details: ['30+媒体のデータ収録', 'キーワード検索・フィルター', '流入経路の可視化'],
  },
  {
    icon: Target,
    title: '媒体マッチング',
    description: '求人条件を入力するだけで、AIが最適な媒体を分析・スコアリング。',
    details: ['AI搭載の媒体提案', 'マッチ度スコア表示', '予算に応じた最適化'],
  },
  {
    icon: BarChart3,
    title: 'PESO診断',
    description: 'Paid・Earned・Shared・Ownedの4軸で採用活動を診断し、改善点を明確化。',
    details: ['4軸の詳細診断', '業界平均との比較', '具体的なアクション提案'],
  },
]

const benefits = [
  {
    icon: TrendingUp,
    title: 'データドリブンな意思決定',
    description: '感覚や経験だけに頼らず、実データに基づいた媒体選定が可能に。',
  },
  {
    icon: Users,
    title: '採用コストの最適化',
    description: '無駄な媒体費用を削減し、効果の高い媒体に予算を集中。',
  },
  {
    icon: Shield,
    title: '医療・介護業界特化',
    description: '業界特有のキーワードや求職者動向を深く理解したデータ分析。',
  },
  {
    icon: Zap,
    title: '即座に分析結果を取得',
    description: 'AIによる高速分析で、待ち時間なく戦略立案が可能。',
  },
]

const plans = [
  {
    name: 'Starter',
    price: '9,800',
    description: '個人・小規模事業所向け',
    features: [
      '媒体マッチング 10回/月',
      'PESO診断 無制限',
      '基本レポート出力',
      'メールサポート',
    ],
    cta: '14日間無料で試す',
    popular: false,
  },
  {
    name: 'Professional',
    price: '19,800',
    description: '中規模法人向け',
    features: [
      '媒体マッチング 50回/月',
      'PESO診断 無制限',
      '詳細レポート出力',
      'CSVエクスポート',
      '優先サポート',
      'チーム共有機能',
    ],
    cta: '14日間無料で試す',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'お問い合わせ',
    description: '大規模法人・複数拠点向け',
    features: [
      '媒体マッチング 無制限',
      'PESO診断 無制限',
      '詳細レポート出力',
      'CSVエクスポート',
      '専任サポート',
      'API連携',
      'カスタムレポート',
      'SLA保証',
    ],
    cta: 'お問い合わせ',
    popular: false,
  },
]

const stats = [
  { value: '30+', label: '収録媒体数' },
  { value: '10,000+', label: '分析キーワード' },
  { value: '95%', label: '顧客満足度' },
  { value: '40%', label: '平均コスト削減' },
]

const faqs = [
  {
    question: '無料トライアルの期間中に課金されますか？',
    answer: 'いいえ、14日間の無料トライアル期間中は一切課金されません。期間終了前にキャンセルすれば、費用は発生しません。',
  },
  {
    question: 'どのような媒体のデータが見られますか？',
    answer: '医療・介護業界の主要求人媒体を網羅しています。マイナビ、リクナビ、Indeed、各種専門媒体など30以上の媒体データを収録しています。',
  },
  {
    question: 'データはどのくらいの頻度で更新されますか？',
    answer: 'キーワードデータは月次で更新され、流入データは週次で更新されます。常に最新の市場動向を把握できます。',
  },
  {
    question: '導入にあたってサポートはありますか？',
    answer: 'はい、プランに応じたサポートを提供しています。Professional以上のプランでは優先サポート、Enterpriseでは専任担当者が対応します。',
  },
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: colors.background }}>
      {/* Header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(8px)' : 'none',
          borderBottom: scrolled ? `1px solid ${colors.border}` : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: colors.primary,
              }}
            >
              MEDICA SOERUTE
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
            }}
            className="desktop-nav"
          >
            <a href="#features" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
              機能紹介
            </a>
            <a href="#benefits" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
              メリット
            </a>
            <a href="#pricing" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
              料金
            </a>
            <a href="#faq" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
              FAQ
            </a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className="desktop-nav">
            <Link
              href="/auth/login"
              style={{
                padding: '8px 16px',
                color: colors.text,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              ログイン
            </Link>
            <Link
              href="/auth/signup"
              style={{
                padding: '10px 20px',
                background: colors.primary,
                color: '#FFFFFF',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'background 0.2s',
              }}
            >
              無料で試す
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
            }}
            className="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: colors.surface,
              borderBottom: `1px solid ${colors.border}`,
              padding: '16px 24px',
            }}
            className="mobile-menu"
          >
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <a href="#features" style={{ color: colors.text, textDecoration: 'none', fontSize: '16px' }}>機能紹介</a>
              <a href="#benefits" style={{ color: colors.text, textDecoration: 'none', fontSize: '16px' }}>メリット</a>
              <a href="#pricing" style={{ color: colors.text, textDecoration: 'none', fontSize: '16px' }}>料金</a>
              <a href="#faq" style={{ color: colors.text, textDecoration: 'none', fontSize: '16px' }}>FAQ</a>
              <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '8px 0' }} />
              <Link href="/auth/login" style={{ color: colors.text, textDecoration: 'none', fontSize: '16px' }}>ログイン</Link>
              <Link
                href="/auth/signup"
                style={{
                  padding: '12px',
                  background: colors.primary,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                無料で試す
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section
        style={{
          paddingTop: '120px',
          paddingBottom: '80px',
          background: `linear-gradient(180deg, ${colors.primary}08 0%, ${colors.background} 100%)`,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '6px 16px',
              background: `${colors.primary}15`,
              color: colors.primary,
              borderRadius: '100px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '24px',
            }}
          >
            医療・介護業界特化の採用支援ツール
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 800,
              color: colors.text,
              lineHeight: 1.2,
              marginBottom: '24px',
            }}
          >
            媒体選びを、
            <br />
            <span style={{ color: colors.primary }}>データで武装する</span>
          </h1>

          <p
            style={{
              fontSize: '18px',
              color: colors.textSecondary,
              lineHeight: 1.7,
              maxWidth: '640px',
              margin: '0 auto 40px',
            }}
          >
            求人媒体のSEOキーワードデータを分析し、
            <br className="desktop-only" />
            最適な採用戦略を導き出します。
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/auth/signup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                background: colors.primary,
                color: '#FFFFFF',
                textDecoration: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              無料で試す
              <ArrowRight size={18} />
            </Link>
            <a
              href="#features"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                background: colors.surface,
                color: colors.text,
                textDecoration: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 600,
                border: `1px solid ${colors.border}`,
                transition: 'background 0.2s',
              }}
            >
              詳しく見る
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '48px 0', background: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '32px',
              textAlign: 'center',
            }}
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <div style={{ fontSize: '36px', fontWeight: 800, color: colors.primary, marginBottom: '8px' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '14px', color: colors.textSecondary }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '80px 0', background: colors.background }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 700, color: colors.text, marginBottom: '16px' }}>
              主な機能
            </h2>
            <p style={{ fontSize: '16px', color: colors.textSecondary }}>
              データに基づいた採用媒体戦略を実現する3つの機能
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {features.map((feature) => (
              <div
                key={feature.title}
                style={{
                  background: colors.surface,
                  borderRadius: '16px',
                  padding: '32px',
                  border: `1px solid ${colors.border}`,
                  transition: 'box-shadow 0.3s, transform 0.3s',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    background: `${colors.primary}10`,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <feature.icon size={28} style={{ color: colors.primary }} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: colors.text, marginBottom: '12px' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7, marginBottom: '20px' }}>
                  {feature.description}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {feature.details.map((detail) => (
                    <li
                      key={detail}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        color: colors.text,
                        marginBottom: '8px',
                      }}
                    >
                      <CheckCircle2 size={16} style={{ color: colors.success }} />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" style={{ padding: '80px 0', background: colors.surface }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 700, color: colors.text, marginBottom: '16px' }}>
              導入メリット
            </h2>
            <p style={{ fontSize: '16px', color: colors.textSecondary }}>
              MEDICA SOERUTEで実現できること
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '24px',
                  background: colors.background,
                  borderRadius: '12px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    background: `${colors.primary}10`,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <benefit.icon size={24} style={{ color: colors.primary }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: colors.text, marginBottom: '8px' }}>
                    {benefit.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '80px 0', background: colors.background }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 700, color: colors.text, marginBottom: '16px' }}>
              料金プラン
            </h2>
            <p style={{ fontSize: '16px', color: colors.textSecondary }}>
              14日間の無料トライアル付き・クレジットカード不要
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
              maxWidth: '1000px',
              margin: '0 auto',
            }}
          >
            {plans.map((plan) => (
              <div
                key={plan.name}
                style={{
                  background: colors.surface,
                  borderRadius: '16px',
                  padding: '32px',
                  border: plan.popular ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                  position: 'relative',
                  boxShadow: plan.popular ? '0 8px 30px rgba(13, 148, 136, 0.15)' : 'none',
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '6px 16px',
                      background: colors.primary,
                      color: '#FFFFFF',
                      borderRadius: '100px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    おすすめ
                  </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: colors.text, marginBottom: '8px' }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '16px' }}>
                    {plan.description}
                  </p>
                  <div>
                    {plan.price === 'お問い合わせ' ? (
                      <span style={{ fontSize: '24px', fontWeight: 700, color: colors.text }}>{plan.price}</span>
                    ) : (
                      <>
                        <span style={{ fontSize: '36px', fontWeight: 800, color: colors.text }}>¥{plan.price}</span>
                        <span style={{ fontSize: '14px', color: colors.textSecondary }}>/月</span>
                      </>
                    )}
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        fontSize: '14px',
                        color: colors.text,
                        marginBottom: '12px',
                      }}
                    >
                      <CheckCircle2 size={18} style={{ color: colors.success, flexShrink: 0, marginTop: '2px' }} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/signup"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '14px',
                    background: plan.popular ? colors.primary : 'transparent',
                    color: plan.popular ? '#FFFFFF' : colors.primary,
                    textDecoration: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    textAlign: 'center',
                    border: plan.popular ? 'none' : `2px solid ${colors.primary}`,
                    transition: 'background 0.2s',
                    boxSizing: 'border-box',
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" style={{ padding: '80px 0', background: colors.surface }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 700, color: colors.text, marginBottom: '16px' }}>
              よくある質問
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, index) => (
              <div
                key={index}
                style={{
                  background: colors.background,
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600, color: colors.text }}>{faq.question}</span>
                  <ChevronDown
                    size={20}
                    style={{
                      color: colors.textSecondary,
                      transform: openFaq === index ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
                {openFaq === index && (
                  <div style={{ padding: '0 24px 20px', fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7 }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          padding: '80px 0',
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
            今すぐ始めましょう
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '32px' }}>
            14日間の無料トライアルで、データドリブンな採用媒体選びを体験してください。
            <br />
            クレジットカード不要・いつでもキャンセル可能
          </p>
          <Link
            href="/auth/signup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 32px',
              background: '#FFFFFF',
              color: colors.primary,
              textDecoration: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
            }}
          >
            無料で試す
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '48px 0', background: colors.text }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>MEDICA SOERUTE</span>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="#" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', fontSize: '14px' }}>
                利用規約
              </Link>
              <Link href="#" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', fontSize: '14px' }}>
                プライバシーポリシー
              </Link>
              <Link href="#" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', fontSize: '14px' }}>
                特定商取引法に基づく表記
              </Link>
              <Link href="#" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', fontSize: '14px' }}>
                お問い合わせ
              </Link>
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
              © 2024 MEDICA SOERUTE. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Global Styles for Responsive */}
      <style jsx global>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
          .desktop-only {
            display: block;
          }
        }
        @media (max-width: 767px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          .desktop-only {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
