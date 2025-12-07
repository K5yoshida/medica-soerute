'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowRight,
  Search,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Menu,
  X,
  Database,
  Brain,
  Target,
  Layers,
  FileSearch,
} from 'lucide-react'

/**
 * MEDICA SOERUTE Landing Page
 *
 * 本質: 求人媒体の選定を「勘と経験」から「データと戦略」へ変えるSaaS
 *
 * ターゲット:
 * - 採用コンサルタント（提案の説得力を上げたい）
 * - 中規模以上の採用担当者（媒体選びで失敗したくない）
 *
 * 差別化:
 * - SimilarWeb + キーワードデータ + Claude AIの3層融合
 * - 4つのフレームワークで採用戦略を可視化（PESO/ファネル/コンバージョン/ジャーニー）
 */

const colors = {
  primary: '#0D9488',
  primaryLight: '#F0FDFA',
  primaryDark: '#0F766E',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#18181B',
  textSecondary: '#52525B',
  textMuted: '#71717A',
  border: '#E4E4E7',
  borderLight: '#F4F4F5',
}

// =====================================
// ヒーローセクション
// =====================================

function HeroSection() {
  return (
    <section
      style={{
        paddingTop: '120px',
        paddingBottom: '80px',
        background: `linear-gradient(180deg, #0D948808 0%, ${colors.background} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景装飾 */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          right: '-10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', position: 'relative' }}>
        {/* 2カラムレイアウト */}
        <div className="hero-grid">
          {/* 左側：テキストコンテンツ */}
          <div className="hero-content">
            {/* サブタイトル */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '100px',
                fontSize: '13px',
                fontWeight: 500,
                color: colors.textSecondary,
                marginBottom: '24px',
              }}
            >
              <Database size={14} style={{ color: colors.primary }} />
              求人媒体の分析プラットフォーム
            </div>

            {/* メインコピー */}
            <h1
              className="hero-title"
              style={{
                fontWeight: 800,
                color: colors.text,
                lineHeight: 1.15,
                marginBottom: '24px',
                letterSpacing: '-0.02em',
              }}
            >
              採用媒体、<br />
              <span style={{ color: colors.primary }}>どれ選んでも同じ</span>
              <br />
              だと思っていませんか？
            </h1>

            {/* サブコピー */}
            <p
              className="hero-subtitle"
              style={{
                color: colors.textSecondary,
                lineHeight: 1.8,
                marginBottom: '32px',
              }}
            >
              Indeed、ジョブメドレー、マイナビ...
              <br />
              「なんとなく」で媒体を選んでいませんか？
              <br />
              <strong style={{ color: colors.text }}>
                トラフィックデータ × AIで、最適な媒体が5分でわかります。
              </strong>
            </p>

            {/* CTA */}
            <div className="hero-cta">
              <Link
                href="/auth/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 32px',
                  background: colors.primary,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: '0 4px 20px rgba(13, 148, 136, 0.3)',
                  transition: 'all 0.2s',
                }}
              >
                14日間無料で試す
                <ArrowRight size={18} />
              </Link>
              <a
                href="#how-it-works"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 24px',
                  background: 'transparent',
                  color: colors.text,
                  textDecoration: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 500,
                  border: `1px solid ${colors.border}`,
                }}
              >
                仕組みを見る
              </a>
            </div>

            {/* 補足 */}
            <p style={{ fontSize: '13px', color: colors.textMuted, marginTop: '16px' }}>
              クレジットカード不要 • いつでもキャンセル可能
            </p>
          </div>

          {/* 右側：ダッシュボードプレビュー */}
          <div className="hero-preview">
            <DashboardMockup />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .hero-grid {
          display: flex;
          flex-direction: column;
          gap: 48px;
        }
        .hero-content {
          max-width: 100%;
        }
        .hero-title {
          font-size: 32px;
        }
        .hero-subtitle {
          font-size: 16px;
          max-width: 100%;
        }
        .hero-cta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .hero-preview {
          display: none;
        }

        @media (min-width: 768px) {
          .hero-title {
            font-size: 40px;
          }
          .hero-subtitle {
            font-size: 17px;
          }
          .hero-preview {
            display: block;
          }
        }

        @media (min-width: 1024px) {
          .hero-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 64px;
            align-items: center;
          }
          .hero-content {
            max-width: 560px;
          }
          .hero-title {
            font-size: 48px;
          }
          .hero-subtitle {
            font-size: 18px;
            max-width: 480px;
          }
          .hero-preview {
            display: block;
          }
        }
      `}</style>
    </section>
  )
}

// ダッシュボードのモックアップ表示
function DashboardMockup() {
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: '16px',
        boxShadow: '0 25px 80px rgba(0,0,0,0.12)',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
      }}
    >
      {/* ブラウザバー */}
      <div
        style={{
          padding: '12px 16px',
          background: colors.borderLight,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28CA41' }} />
        </div>
        <div
          style={{
            flex: 1,
            marginLeft: '16px',
            padding: '6px 12px',
            background: colors.surface,
            borderRadius: '6px',
            fontSize: '12px',
            color: colors.textMuted,
          }}
        >
          app.medica-soerute.jp/dashboard/catalog
        </div>
      </div>

      {/* コンテンツ */}
      <div style={{ padding: '24px' }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: colors.text, marginBottom: '4px' }}>
            媒体カタログ
          </div>
          <div style={{ fontSize: '13px', color: colors.textMuted }}>
            30媒体のデータを一覧で比較
          </div>
        </div>

        {/* テーブルモック */}
        <div
          style={{
            background: colors.borderLight,
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* ヘッダー行 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '140px repeat(4, 1fr)',
              gap: '12px',
              padding: '12px 16px',
              background: colors.surface,
              borderBottom: `1px solid ${colors.border}`,
              fontSize: '11px',
              fontWeight: 600,
              color: colors.textMuted,
            }}
          >
            <div>媒体名</div>
            <div style={{ textAlign: 'right' }}>月間訪問</div>
            <div style={{ textAlign: 'right' }}>検索流入</div>
            <div style={{ textAlign: 'right' }}>直帰率</div>
            <div style={{ textAlign: 'right' }}>クエリ数</div>
          </div>

          {/* データ行 */}
          {[
            { name: 'Indeed', visits: '8.2M', search: '32%', bounce: '42%', queries: '2,340' },
            { name: 'ジョブメドレー', visits: '3.1M', search: '45%', bounce: '38%', queries: '1,890' },
            { name: 'マイナビ看護', visits: '1.8M', search: '51%', bounce: '35%', queries: '1,420' },
          ].map((row, i) => (
            <div
              key={row.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px repeat(4, 1fr)',
                gap: '12px',
                padding: '14px 16px',
                background: colors.surface,
                borderBottom: i < 2 ? `1px solid ${colors.borderLight}` : 'none',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 600, color: colors.text }}>{row.name}</div>
              <div style={{ textAlign: 'right', color: colors.text }}>{row.visits}</div>
              <div style={{ textAlign: 'right', color: colors.primary, fontWeight: 500 }}>{row.search}</div>
              <div style={{ textAlign: 'right', color: colors.textSecondary }}>{row.bounce}</div>
              <div style={{ textAlign: 'right', color: colors.textSecondary }}>{row.queries}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// =====================================
// 問題提起セクション（Before状態）
// =====================================

function ProblemSection() {
  const problems = [
    {
      title: '媒体営業のトークを鵜呑みにしていませんか？',
      description: '「うちが一番効果出ます」どの媒体も同じことを言う。でも客観データを見たことがない。',
    },
    {
      title: '提案の根拠、説明できますか？',
      description: '「なぜこの媒体を推奨するのか」を聞かれて、経験と勘以外の答えを持っていますか。',
    },
    {
      title: '採用予算、本当に最適に使えていますか？',
      description: '効果の出ない媒体に予算を使い続けていないか。年間で見ると大きな無駄になっている可能性も。',
    },
  ]

  return (
    <section style={{ padding: '100px 0', background: colors.surface }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: colors.primary,
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            The Problem
          </p>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: colors.text, lineHeight: 1.3 }}>
            採用媒体選びは、まだ「勘と経験」に頼っていませんか？
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {problems.map((problem, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '20px',
                padding: '28px',
                background: colors.background,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: `${colors.primary}15`,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: colors.primary,
                }}
              >
                {index + 1}
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: colors.text, marginBottom: '8px' }}>
                  {problem.title}
                </h3>
                <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                  {problem.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =====================================
// ソリューションセクション
// =====================================

function SolutionSection() {
  return (
    <section
      id="how-it-works"
      style={{
        padding: '100px 0',
        background: `linear-gradient(180deg, ${colors.background} 0%, #0D948808 100%)`,
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: colors.primary,
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            The Solution
          </p>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: colors.text, marginBottom: '16px' }}>
            データで武装する。5分で最適解を出す。
          </h2>
          <p style={{ fontSize: '16px', color: colors.textSecondary, maxWidth: '600px', margin: '0 auto' }}>
            トラフィックデータ、検索キーワード分析、そしてAIを組み合わせた
            業界唯一の媒体分析プラットフォーム
          </p>
        </div>

        {/* 3つのデータソース */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '64px',
          }}
        >
          {[
            {
              icon: Database,
              label: 'トラフィック',
              title: 'アクセス分析',
              description: '月間訪問数、直帰率、滞在時間、流入経路を媒体横断で比較',
              color: '#3B82F6',
            },
            {
              icon: Search,
              label: 'キーワード',
              title: 'SEO分析',
              description: '各媒体がどの検索キーワードで上位表示されているかを可視化',
              color: '#8B5CF6',
            },
            {
              icon: Brain,
              label: 'AI',
              title: 'インテリジェント分析',
              description: '条件を入力するだけで最適な媒体を自動マッチング・スコアリング',
              color: '#0D9488',
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: colors.surface,
                borderRadius: '16px',
                padding: '32px',
                border: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  background: `${item.color}10`,
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: item.color,
                  marginBottom: '20px',
                }}
              >
                <item.icon size={14} />
                {item.label}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: colors.text, marginBottom: '12px' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* 融合の図解 */}
        <div
          style={{
            background: colors.surface,
            borderRadius: '16px',
            padding: '40px',
            border: `1px solid ${colors.border}`,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '24px' }}>
            3つのデータソースを融合
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ padding: '12px 20px', background: '#3B82F610', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#3B82F6' }}>
              トラフィック
            </div>
            <span style={{ fontSize: '20px', color: colors.textMuted }}>+</span>
            <div style={{ padding: '12px 20px', background: '#8B5CF610', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#8B5CF6' }}>
              キーワード
            </div>
            <span style={{ fontSize: '20px', color: colors.textMuted }}>+</span>
            <div style={{ padding: '12px 20px', background: '#0D948810', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#0D9488' }}>
              AI分析
            </div>
            <span style={{ fontSize: '20px', color: colors.textMuted }}>=</span>
            <div
              style={{
                padding: '12px 24px',
                background: colors.primary,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              最適な媒体がわかる
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// =====================================
// 機能紹介セクション
// =====================================

function FeaturesSection() {
  const features = [
    {
      icon: FileSearch,
      title: '媒体カタログ',
      description: '30以上の求人媒体のスペックを一元管理。月間訪問数、直帰率、流入経路、SEOキーワードを横断比較。',
      benefits: ['媒体スペックを1画面で把握', 'キーワードで媒体を検索', '流入経路の可視化'],
    },
    {
      icon: Target,
      title: '媒体マッチング',
      description: '「川崎市麻生区 × 訪問介護 × 正社員」のような具体条件を入力するだけ。AIが最適な媒体をスコアリング。',
      benefits: ['条件入力だけで媒体提案', 'マッチスコアで説得力UP', '提案準備が30分→5分に'],
    },
    {
      icon: Layers,
      title: 'PESO診断',
      description: '今やっている採用施策を入力するだけで、Paid/Earned/Shared/Ownedの4軸で戦略を可視化・スコアリング。',
      benefits: ['採用戦略の現状を数値化', '弱点と改善点を明確化', '4つの切り口で多角分析'],
    },
    {
      icon: BarChart3,
      title: '媒体比較',
      description: '複数媒体を選んで、トラフィック推移、キーワード重複、流入経路を並べて比較。提案資料がすぐ作れる。',
      benefits: ['最大5媒体を同時比較', 'トレンド推移をグラフ化', 'キーワード比較表を自動生成'],
    },
  ]

  return (
    <section id="features" style={{ padding: '100px 0', background: colors.surface }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: colors.primary,
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Features
          </p>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: colors.text, marginBottom: '16px' }}>
            4つの分析エンジン
          </h2>
        </div>

        <div className="features-grid">
          {features.map((feature) => (
            <div
              key={feature.title}
              style={{
                background: colors.background,
                borderRadius: '16px',
                padding: '32px',
                border: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  background: `${colors.primary}10`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                }}
              >
                <feature.icon size={26} style={{ color: colors.primary }} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: colors.text, marginBottom: '12px' }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7, marginBottom: '20px' }}>
                {feature.description}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {feature.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      color: colors.text,
                      marginBottom: '10px',
                    }}
                  >
                    <CheckCircle2 size={16} style={{ color: colors.primary, flexShrink: 0 }} />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =====================================
// Before/After セクション
// =====================================

function BeforeAfterSection() {
  return (
    <section style={{ padding: '100px 0', background: colors.background }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: colors.primary,
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Results
          </p>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: colors.text }}>
            導入前後でこう変わる
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          {/* Before */}
          <div
            style={{
              background: '#F4F4F5',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid #E4E4E7',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                background: '#71717A',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '24px',
              }}
            >
              BEFORE
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                '媒体選びは「経験と勘」頼み',
                '提案準備に30分以上かかる',
                '「なぜこの媒体？」に定量的に答えられない',
                '媒体営業のトークを鵜呑み',
                '採用予算の無駄遣いが見えない',
              ].map((item) => (
                <li
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    fontSize: '15px',
                    color: colors.textSecondary,
                    marginBottom: '16px',
                  }}
                >
                  <X size={18} style={{ color: '#A1A1AA', flexShrink: 0, marginTop: '2px' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* After */}
          <div
            style={{
              background: colors.primaryLight,
              borderRadius: '16px',
              padding: '32px',
              border: `1px solid ${colors.primary}30`,
            }}
          >
            <div
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                background: colors.primary,
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '24px',
              }}
            >
              AFTER
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'データに基づいた媒体選定',
                '提案準備が5分で完了',
                'スコアとグラフで説得力のある提案',
                '客観データで媒体を比較評価',
                '予算配分の最適化が可能に',
              ].map((item) => (
                <li
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    fontSize: '15px',
                    color: colors.primaryDark,
                    marginBottom: '16px',
                  }}
                >
                  <CheckCircle2 size={18} style={{ color: colors.primary, flexShrink: 0, marginTop: '2px' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 数字のインパクト */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginTop: '48px',
          }}
        >
          {[
            { value: '30分 → 5分', label: '提案準備時間' },
            { value: '30+', label: '収録媒体数' },
            { value: '4軸', label: '戦略分析フレームワーク' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: colors.surface,
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                border: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ fontSize: '28px', fontWeight: 800, color: colors.primary, marginBottom: '8px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '14px', color: colors.textSecondary }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =====================================
// ターゲットセクション
// =====================================

function TargetSection() {
  const targets = [
    {
      title: '採用コンサルタント',
      description: 'クライアントへの提案に説得力を持たせたい。データで裏付けされた媒体提案で信頼を獲得。',
      useCases: ['媒体提案の根拠づけ', 'クライアントへのレポート作成', '競合媒体の比較分析'],
    },
    {
      title: '採用担当者',
      description: '「どの媒体が自社に合うのか」を客観的に判断したい。無駄な媒体費を減らしたい。',
      useCases: ['最適媒体の選定', '採用予算の最適配分', '採用戦略の見直し'],
    },
  ]

  return (
    <section style={{ padding: '100px 0', background: colors.surface }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: colors.primary,
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Who is this for
          </p>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: colors.text }}>
            こんな方に使われています
          </h2>
        </div>

        <div className="target-grid">
          {targets.map((target) => (
            <div
              key={target.title}
              style={{
                background: colors.background,
                borderRadius: '16px',
                padding: '32px',
                border: `1px solid ${colors.border}`,
              }}
            >
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: colors.text, marginBottom: '12px' }}>
                {target.title}
              </h3>
              <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7, marginBottom: '20px' }}>
                {target.description}
              </p>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: '12px' }}>
                  主な活用シーン
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {target.useCases.map((useCase) => (
                    <span
                      key={useCase}
                      style={{
                        padding: '6px 12px',
                        background: `${colors.primary}10`,
                        color: colors.primary,
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =====================================
// 料金セクション
// =====================================

function PricingSection() {
  const plans = [
    {
      name: 'Free Trial',
      price: '0',
      description: '14日間無料でお試し',
      features: [
        '媒体カタログ閲覧',
        '媒体マッチング 無制限',
        'PESO診断 無制限',
        '分析履歴50件まで保存',
        'CSVエクスポート',
      ],
      popular: false,
      cta: '無料で始める',
      isFree: true,
    },
    {
      name: 'Starter',
      price: '9,800',
      description: '個人・小規模事業所向け',
      features: [
        '媒体カタログ閲覧',
        '媒体マッチング 月20回',
        'PESO診断 月10回',
        '分析履歴50件まで保存',
        'CSVエクスポート',
        'メールサポート',
      ],
      popular: false,
      cta: '14日間無料で試す',
      isFree: false,
    },
    {
      name: 'Professional',
      price: '19,800',
      description: '中規模法人・コンサル向け',
      features: [
        '媒体カタログ閲覧',
        '媒体マッチング 無制限',
        'PESO診断 無制限',
        '分析履歴 無制限',
        'CSV・PDFエクスポート',
        'チームメンバー5名まで',
        '優先サポート',
      ],
      popular: true,
      cta: '14日間無料で試す',
      isFree: false,
    },
    {
      name: 'Enterprise',
      price: '要相談',
      description: '大規模法人・複数拠点',
      features: [
        'Professionalの全機能',
        'チームメンバー無制限',
        'API連携',
        '専任サポート',
        'カスタムレポート',
        'SLA保証',
      ],
      popular: false,
      cta: 'お問い合わせ',
      isFree: false,
    },
  ]

  return (
    <section id="pricing" style={{ padding: '100px 0', background: colors.background }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: colors.primary,
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Pricing
          </p>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: colors.text, marginBottom: '16px' }}>
            シンプルな料金体系
          </h2>
          <p style={{ fontSize: '16px', color: colors.textSecondary }}>
            14日間無料トライアル • クレジットカード不要
          </p>
        </div>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: colors.surface,
                borderRadius: '16px',
                padding: '28px',
                border: plan.popular ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
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

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '14px' }}>
                  {plan.description}
                </p>
                {plan.price === '要相談' ? (
                  <div style={{ fontSize: '24px', fontWeight: 800, color: colors.text }}>{plan.price}</div>
                ) : plan.isFree ? (
                  <div>
                    <span style={{ fontSize: '32px', fontWeight: 800, color: colors.primary }}>¥0</span>
                    <span style={{ fontSize: '13px', color: colors.textSecondary }}>/14日間</span>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: '32px', fontWeight: 800, color: colors.text }}>¥{plan.price}</span>
                    <span style={{ fontSize: '13px', color: colors.textSecondary }}>/月</span>
                  </div>
                )}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', flex: 1 }}>
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '13px',
                      color: colors.text,
                      marginBottom: '10px',
                    }}
                  >
                    <CheckCircle2 size={16} style={{ color: colors.primary, flexShrink: 0, marginTop: '1px' }} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/signup"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  background: plan.popular ? colors.primary : plan.isFree ? colors.primary : 'transparent',
                  color: plan.popular ? '#FFFFFF' : plan.isFree ? '#FFFFFF' : colors.primary,
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textAlign: 'center',
                  border: plan.popular || plan.isFree ? 'none' : `2px solid ${colors.primary}`,
                  boxSizing: 'border-box',
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .pricing-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 640px) {
          .pricing-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .pricing-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }
      `}</style>
    </section>
  )
}

// =====================================
// FAQ セクション
// =====================================

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: 'どのような媒体のデータが見られますか？',
      answer: 'Indeed、ジョブメドレー、マイナビ、リクナビ、各種専門媒体など30以上の求人媒体データを収録しています。主に医療・介護業界で使われる媒体を網羅しています。',
    },
    {
      question: 'データはどこから取得していますか？',
      answer: 'トラフィックデータは業界標準のWeb分析ツールから、検索キーワードデータはSEO分析ツールから取得しています。月次で更新され、常に最新のデータを提供しています。',
    },
    {
      question: '無料トライアル中に課金されますか？',
      answer: 'いいえ、14日間の無料トライアル期間中は一切課金されません。クレジットカードの登録も不要です。期間終了後、有料プランに移行するかどうかを選択できます。',
    },
    {
      question: '導入サポートはありますか？',
      answer: 'Professional以上のプランでは優先サポートを提供しています。Enterpriseプランでは専任担当者がつき、導入支援から運用まで伴走します。',
    },
    {
      question: '途中でプラン変更はできますか？',
      answer: 'はい、いつでもプランのアップグレード・ダウングレードが可能です。変更は次の請求サイクルから適用されます。',
    },
  ]

  return (
    <section id="faq" style={{ padding: '100px 0', background: colors.surface }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: colors.primary,
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            FAQ
          </p>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: colors.text }}>
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
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
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
                    transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                    marginLeft: '16px',
                  }}
                />
              </button>
              {openIndex === index && (
                <div style={{ padding: '0 24px 20px', fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7 }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =====================================
// CTA セクション
// =====================================

function CTASection() {
  return (
    <section
      style={{
        padding: '100px 0',
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
          媒体選びを、データで武装しませんか？
        </h2>
        <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '40px', lineHeight: 1.7 }}>
          14日間の無料トライアルで、データドリブンな媒体選定を体験してください。
          <br />
          クレジットカード不要・いつでもキャンセル可能
        </p>
        <Link
          href="/auth/signup"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '18px 36px',
            background: '#FFFFFF',
            color: colors.primary,
            textDecoration: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          無料で試す
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  )
}

// =====================================
// ヘッダー
// =====================================

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
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
          <span style={{ fontSize: '18px', fontWeight: 700, color: colors.primary }}>
            MEDICA SOERUTE
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="desktop-nav">
          <a href="#how-it-works" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
            仕組み
          </a>
          <a href="#features" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
            機能
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
            style={{ padding: '8px 16px', color: colors.text, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
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
            }}
          >
            無料で試す
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
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
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <a href="#how-it-works" style={{ color: colors.text, textDecoration: 'none', fontSize: '16px' }}>仕組み</a>
            <a href="#features" style={{ color: colors.text, textDecoration: 'none', fontSize: '16px' }}>機能</a>
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

      <style jsx global>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </header>
  )
}

// =====================================
// フッター
// =====================================

function Footer() {
  return (
    <footer style={{ padding: '48px 0', background: colors.text }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>MEDICA SOERUTE</span>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '400px', lineHeight: 1.6 }}>
            採用媒体の分析プラットフォーム。
            データで武装し、最適な媒体選定を。
          </p>
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
          <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)' }}>
            © 2024 MEDICA SOERUTE. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}

// =====================================
// メインページ
// =====================================

export default function HomePage() {
  return (
    <>
      <style jsx global>{`
        /* フィーチャーグリッド */
        .features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 640px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
        }

        /* ターゲットグリッド */
        .target-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 768px) {
          .target-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
        }

        /* セクションのパディング調整 */
        section {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }
        @media (min-width: 640px) {
          section {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
        }

        /* モバイルCTAボタン */
        @media (max-width: 480px) {
          .hero-cta a {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
      <div style={{ minHeight: '100vh', background: colors.background }}>
        <Header />
        <main>
          <HeroSection />
          <ProblemSection />
          <SolutionSection />
          <FeaturesSection />
          <BeforeAfterSection />
          <TargetSection />
          <PricingSection />
          <FAQSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  )
}
