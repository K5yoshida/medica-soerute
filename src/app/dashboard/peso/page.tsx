'use client'

import { useState } from 'react'
import {
  Grid2X2,
  Filter,
  Zap,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react'

/**
 * PESO Diagnosis Page
 *
 * Design based on mockup:
 * - Header with URL input and action buttons
 * - Tab navigation: PESO切り口 / ファネル切り口 / Imp→PV→CV / 求職者の動き
 * - 2x2 grid layout for PESO categories
 * - Selectable tags within each category
 *
 * PESO colors:
 * - P (Paid): #3B82F6 (blue)
 * - E (Earned): #F59E0B (amber)
 * - S (Shared): #EC4899 (pink)
 * - O (Owned): #10B981 (green)
 */

type ViewMode = 'peso' | 'funnel' | 'conversion' | 'journey'

interface PESOCategory {
  key: string
  label: string
  subtitle: string
  color: string
  bgLight: string
  tags: { id: string; label: string; selected: boolean }[]
}

const initialPesoData: PESOCategory[] = [
  {
    key: 'paid',
    label: 'Paid',
    subtitle: '有料広告・求人媒体',
    color: '#3B82F6',
    bgLight: 'rgba(59,130,246,0.1)',
    tags: [
      { id: 'indeed', label: 'Indeed', selected: true },
      { id: 'jobmedley', label: 'ジョブメドレー', selected: true },
      { id: 'mynavi', label: 'マイナビ', selected: true },
      { id: 'listing', label: 'リスティング広告', selected: false },
    ],
  },
  {
    key: 'earned',
    label: 'Earned',
    subtitle: '口コミ・第三者評価',
    color: '#F59E0B',
    bgLight: 'rgba(245,158,11,0.1)',
    tags: [
      { id: 'google_review', label: 'Google口コミ', selected: true },
      { id: 'tenshoku', label: '転職会議', selected: true },
      { id: 'openwork', label: 'OpenWork', selected: false },
    ],
  },
  {
    key: 'owned',
    label: 'Owned',
    subtitle: '自社メディア',
    color: '#10B981',
    bgLight: 'rgba(16,185,129,0.1)',
    tags: [
      { id: 'career_site', label: '採用サイト', selected: true },
      { id: 'instagram', label: '公式Instagram', selected: true },
      { id: 'google_business', label: 'Googleビジネス', selected: true },
      { id: 'blog', label: '採用ブログ', selected: false },
      { id: 'form', label: '応募フォーム', selected: true },
      { id: 'tel', label: '電話問合せ', selected: true },
      { id: 'favorite', label: 'お気に入り機能', selected: true },
    ],
  },
  {
    key: 'shared',
    label: 'Shared',
    subtitle: 'SNS拡散・シェア',
    color: '#EC4899',
    bgLight: 'rgba(236,72,153,0.1)',
    tags: [
      { id: 'insta_repost', label: 'Instagramリポスト', selected: false },
      { id: 'twitter', label: 'X（Twitter）での言及', selected: false },
      { id: 'line', label: 'LINEシェア', selected: false },
    ],
  },
]

export default function PESOPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('peso')
  const [url, setUrl] = useState('https://www.shonan-tobu.or.jp/')
  const [pesoData, setPesoData] = useState<PESOCategory[]>(initialPesoData)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleTag = (categoryKey: string, tagId: string) => {
    setPesoData((prev) =>
      prev.map((category) =>
        category.key === categoryKey
          ? {
              ...category,
              tags: category.tags.map((tag) =>
                tag.id === tagId ? { ...tag, selected: !tag.selected } : tag
              ),
            }
          : category
      )
    )
  }

  const handleAnalyze = async () => {
    if (!url) return
    setIsAnalyzing(true)
    setError(null)

    try {
      // Prepare data for API
      const currentActivities = {
        paid: pesoData.find((c) => c.key === 'paid')?.tags.filter((t) => t.selected).map((t) => t.id) || [],
        earned: pesoData.find((c) => c.key === 'earned')?.tags.filter((t) => t.selected).map((t) => t.id) || [],
        shared: pesoData.find((c) => c.key === 'shared')?.tags.filter((t) => t.selected).map((t) => t.id) || [],
        owned: pesoData.find((c) => c.key === 'owned')?.tags.filter((t) => t.selected).map((t) => t.id) || [],
      }

      const response = await fetch('/api/peso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentActivities, url }),
      })

      const data = await response.json()

      if (!data.success) {
        if (data.error?.code === 'PLAN_RESTRICTION') {
          setError('PESO診断機能を利用するにはライトプラン以上へのアップグレードが必要です。')
        } else {
          setError(data.error?.message || '診断中にエラーが発生しました')
        }
      } else {
        // Handle successful response - could navigate to results or show modal
        console.log('Analysis result:', data.data)
      }
    } catch (err) {
      console.error('PESO diagnosis error:', err)
      setError('通信エラーが発生しました')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const tabs = [
    { id: 'peso', label: 'PESO切り口', icon: Grid2X2 },
    { id: 'funnel', label: 'ファネル切り口', icon: Filter },
    { id: 'conversion', label: 'Imp→PV→CV', icon: Zap },
    { id: 'journey', label: '求職者の動き', icon: Users },
  ]

  // Arrange categories in the order: Paid (top-left), Earned (top-right), Owned (bottom-left), Shared (bottom-right)
  const orderedCategories = [
    pesoData.find((c) => c.key === 'paid')!,
    pesoData.find((c) => c.key === 'earned')!,
    pesoData.find((c) => c.key === 'owned')!,
    pesoData.find((c) => c.key === 'shared')!,
  ]

  return (
    <>
      {/* Header */}
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E4E4E7',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', letterSpacing: '-0.01em', margin: 0 }}>
              PESO診断
            </h1>
            <p style={{ fontSize: '13px', color: '#A1A1AA', marginTop: '2px', fontWeight: 400 }}>
              採用メディア戦略の現状を可視化
            </p>
          </div>

          {/* URL input and actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="url"
              placeholder="https://example.com/recruit"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                width: '280px',
                padding: '8px 12px',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              style={{
                padding: '8px 20px',
                background: '#0D9488',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                opacity: isAnalyzing ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isAnalyzing ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : null}
              診断
            </button>
            <span style={{ fontSize: '13px', color: '#A1A1AA' }}>or</span>
            <button
              style={{
                padding: '8px 16px',
                background: '#FFFFFF',
                color: '#52525B',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
              アンケートで診断
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {/* Error message */}
        {error && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FEE2E2',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <AlertCircle style={{ width: 20, height: 20, color: '#EF4444' }} />
            <span style={{ fontSize: '13px', color: '#991B1B' }}>{error}</span>
          </div>
        )}

        {/* Tab navigation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            borderBottom: '1px solid #E4E4E7',
            paddingBottom: '12px',
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = viewMode === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as ViewMode)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: isActive ? '#18181B' : '#A1A1AA',
                  position: 'relative',
                }}
              >
                <Icon style={{ width: 16, height: 16 }} />
                {tab.label}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-13px',
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: '#0D9488',
                      borderRadius: '1px',
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* PESO View */}
        {viewMode === 'peso' && (
          <>
            {/* Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#A1A1AA', background: '#F4F4F5', padding: '4px 12px', borderRadius: '4px' }}>
                自社でコントロール可能
              </span>
              <span style={{ fontSize: '12px', color: '#A1A1AA', background: '#F4F4F5', padding: '4px 12px', borderRadius: '4px' }}>
                第三者発信（信頼されやすい）
              </span>
            </div>

            {/* 2x2 Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
              }}
            >
              {orderedCategories.map((category) => (
                <div
                  key={category.key}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: '8px',
                    padding: '20px',
                  }}
                >
                  {/* Category header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        background: category.color,
                        color: '#FFFFFF',
                      }}
                    >
                      {category.label.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#18181B' }}>
                        {category.label}
                      </div>
                      <div style={{ fontSize: '12px', color: '#A1A1AA' }}>{category.subtitle}</div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {category.tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(category.key, tag.id)}
                        style={{
                          padding: '6px 14px',
                          border: tag.selected ? `1px solid ${category.color}` : '1px solid #E4E4E7',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          background: tag.selected ? '#FFFFFF' : '#FFFFFF',
                          color: tag.selected ? category.color : '#A1A1AA',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Funnel View */}
        {viewMode === 'funnel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { id: 1, title: '認知', sub: '求人の存在を知る', color: '#3B82F6' },
              { id: 2, title: '興味・関心', sub: '詳細を見てもらう', color: '#8B5CF6' },
              { id: 3, title: '比較・検討', sub: '他社と比べて選ぶ', color: '#F59E0B' },
              { id: 4, title: '応募', sub: '応募完了', color: '#10B981' },
            ].map((stage) => (
              <div
                key={stage.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '8px',
                    background: `${stage.color}1A`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: stage.color,
                  }}
                >
                  {stage.id}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>{stage.title}</div>
                  <div style={{ fontSize: '12px', color: '#A1A1AA' }}>{stage.sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Conversion View */}
        {viewMode === 'conversion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { id: 1, title: 'Impression（露出）', sub: '求職者の目に触れる施策' },
              { id: 2, title: 'PV（流入）', sub: '詳細を見てもらう施策' },
              { id: 3, title: 'CV（応募）', sub: '応募を完了させる施策' },
            ].map((stage, index, arr) => (
              <div key={stage.id}>
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#F4F4F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#52525B',
                    }}
                  >
                    {stage.id}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>{stage.title}</div>
                    <div style={{ fontSize: '12px', color: '#A1A1AA' }}>{stage.sub}</div>
                  </div>
                </div>
                {index < arr.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                    <svg style={{ width: 24, height: 24, color: '#A1A1AA' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M19 12l-7 7-7-7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Journey View */}
        {viewMode === 'journey' && (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '8px',
              padding: '32px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {[
                { id: 1, label: '検索', desc: 'Googleや求人サイトで検索' },
                { id: 2, label: '探索', desc: '求人情報を詳しく確認' },
                { id: 3, label: '保存', desc: '気になる求人を保存' },
                { id: 4, label: '評価', desc: '口コミやSNSで評判確認' },
                { id: 5, label: '応募', desc: '応募フォームから送信' },
              ].map((step, index, arr) => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        background: '#F4F4F5',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#52525B' }}>0{step.id}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>{step.label}</div>
                    <div style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '4px', maxWidth: 80 }}>{step.desc}</div>
                  </div>
                  {index < arr.length - 1 && (
                    <div style={{ margin: '0 24px', marginBottom: 40 }}>
                      <svg style={{ width: 20, height: 20, color: '#A1A1AA' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
