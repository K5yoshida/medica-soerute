'use client'

import { useState, useCallback } from 'react'
import {
  Grid2X2,
  Filter,
  Zap,
  Users,
  Loader2,
  AlertCircle,
  X,
  Folder,
  Download,
} from 'lucide-react'

/**
 * PESO Diagnosis Page
 *
 * Design based on mockup:
 * - Header with URL input and action buttons
 * - Tab navigation: PESO切り口 / ファネル切り口 / Imp→PV→CV / 求職者の動き
 * - 2x2 grid layout for PESO categories
 * - Selectable tags within each category
 * - Survey modal with 3 steps
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

// Survey modal types
interface SurveyCategory {
  id: string
  label: string
  options: { id: string; label: string }[]
}

const surveyCategories: SurveyCategory[] = [
  {
    id: 'job_media',
    label: '求人媒体',
    options: [
      { id: 'indeed', label: 'Indeed' },
      { id: 'jobmedley', label: 'ジョブメドレー' },
      { id: 'mynavi', label: 'マイナビ転職' },
      { id: 'rikunabi', label: 'リクナビNEXT' },
      { id: 'doda', label: 'doda' },
      { id: 'engage', label: 'エンゲージ' },
      { id: 'agent', label: '人材紹介' },
    ],
  },
  {
    id: 'sns',
    label: 'SNS',
    options: [
      { id: 'instagram', label: 'Instagram' },
      { id: 'x_twitter', label: 'X（Twitter）' },
      { id: 'facebook', label: 'Facebook' },
      { id: 'youtube', label: 'YouTube' },
      { id: 'tiktok', label: 'TikTok' },
      { id: 'line', label: 'LINE公式' },
    ],
  },
  {
    id: 'web',
    label: '自社サイト・Web',
    options: [
      { id: 'career_site', label: '採用サイト' },
      { id: 'corporate_site', label: 'コーポレートサイト' },
      { id: 'staff_blog', label: 'スタッフブログ' },
      { id: 'google_business', label: 'Googleビジネス' },
    ],
  },
  {
    id: 'review',
    label: '口コミ・評判',
    options: [
      { id: 'google_review', label: 'Googleクチコミ' },
      { id: 'openwork', label: 'OpenWork' },
      { id: 'tenshoku_kaigi', label: '転職会議' },
    ],
  },
  {
    id: 'ads',
    label: '広告',
    options: [
      { id: 'google_ads', label: 'Google広告' },
      { id: 'yahoo_ads', label: 'Yahoo!広告' },
      { id: 'sns_ads', label: 'SNS広告' },
    ],
  },
  {
    id: 'other',
    label: 'その他',
    options: [
      { id: 'referral', label: 'リファラル採用' },
      { id: 'school', label: '学校・養成校訪問' },
    ],
  },
]

const photoDepthOptions = [
  { value: 'none', level: 'Lv.0', title: '写真なし', desc: '求人に写真を掲載していない' },
  { value: 'free', level: 'Lv.1', title: 'フリー素材', desc: 'フリー画像を活用している' },
  { value: 'original', level: 'Lv.2', title: '撮影写真', desc: '自社で撮影した写真を使用' },
  { value: 'edited', level: 'Lv.3', title: '加工・編集', desc: '撮影写真を加工・編集して使用' },
  { value: 'ab_test', level: 'Lv.4', title: 'A/Bテスト', desc: '複数パターンでA/Bテスト実施中' },
]

const textDepthOptions = [
  { value: 'basic', level: 'Lv.0', title: '基本情報のみ', desc: '給与・勤務地など最低限の情報' },
  { value: 'detailed', level: 'Lv.1', title: '詳細記載', desc: '仕事内容・職場環境を詳しく記載' },
  { value: 'interview', level: 'Lv.2', title: '従業員の声', desc: '従業員インタビューを反映' },
  { value: 'competitive', level: 'Lv.3', title: '競合分析', desc: '競合求人を調査し相対比較で差別化' },
  { value: 'ab_test', level: 'Lv.4', title: 'A/Bテスト', desc: '複数パターンでA/Bテスト実施中' },
]

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
  const [resultId, setResultId] = useState<string | null>(null)

  // Save/Export modal state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Survey modal state
  const [isSurveyOpen, setIsSurveyOpen] = useState(false)
  const [surveyStep, setSurveyStep] = useState(1)
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set())
  const [photoDepth, setPhotoDepth] = useState<string | null>(null)
  const [textDepth, setTextDepth] = useState<string | null>(null)

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

  // Survey modal handlers
  const openSurvey = () => {
    setSurveyStep(1)
    setSelectedActivities(new Set())
    setPhotoDepth(null)
    setTextDepth(null)
    setIsSurveyOpen(true)
  }

  const closeSurvey = () => {
    setIsSurveyOpen(false)
  }

  const toggleActivity = (activityId: string) => {
    setSelectedActivities((prev) => {
      const next = new Set(prev)
      if (next.has(activityId)) {
        next.delete(activityId)
      } else {
        next.add(activityId)
      }
      return next
    })
  }

  const handleSurveyNext = () => {
    if (surveyStep < 3) {
      setSurveyStep(surveyStep + 1)
    }
  }

  const handleSurveyBack = () => {
    if (surveyStep > 1) {
      setSurveyStep(surveyStep - 1)
    }
  }

  const handleSurveySubmit = async () => {
    setIsSurveyOpen(false)
    setIsAnalyzing(true)
    setError(null)

    try {
      // Map selected activities to PESO categories
      const paid = Array.from(selectedActivities).filter((id) =>
        ['indeed', 'jobmedley', 'mynavi', 'rikunabi', 'doda', 'engage', 'agent', 'google_ads', 'yahoo_ads', 'sns_ads'].includes(id)
      )
      const earned = Array.from(selectedActivities).filter((id) =>
        ['google_review', 'openwork', 'tenshoku_kaigi'].includes(id)
      )
      const shared = Array.from(selectedActivities).filter((id) =>
        ['instagram', 'x_twitter', 'facebook', 'youtube', 'tiktok', 'line'].includes(id)
      )
      const owned = Array.from(selectedActivities).filter((id) =>
        ['career_site', 'corporate_site', 'staff_blog', 'google_business', 'referral', 'school'].includes(id)
      )

      const response = await fetch('/api/peso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentActivities: { paid, earned, shared, owned },
          contentDepth: { photo: photoDepth, text: textDepth },
        }),
      })

      const data = await response.json()

      if (!data.success) {
        if (data.error?.code === 'PLAN_RESTRICTION') {
          setError('PESO診断機能を利用するにはライトプラン以上へのアップグレードが必要です。')
        } else {
          setError(data.error?.message || '診断中にエラーが発生しました')
        }
      } else {
        console.log('Survey analysis result:', data.data)
        if (data.data?.id) {
          setResultId(data.data.id)
        }
      }
    } catch (err) {
      console.error('Survey diagnosis error:', err)
      setError('通信エラーが発生しました')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 結果保存
  const handleSave = useCallback(async () => {
    if (!resultId || !saveName.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/peso/results/${resultId}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveName.trim() }),
      })

      if (response.ok) {
        setShowSaveModal(false)
        setSaveName('')
        alert('保存しました')
      } else {
        const data = await response.json()
        alert(data.error?.message || '保存に失敗しました')
      }
    } catch {
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }, [resultId, saveName])

  // CSVエクスポート
  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    if (!resultId) {
      alert('診断結果がありません')
      return
    }

    setExporting(true)
    try {
      const response = await fetch(`/api/peso/results/${resultId}/export?format=${format}`)

      if (!response.ok) {
        const data = await response.json()
        alert(data.error?.message || 'エクスポートに失敗しました')
        return
      }

      if (format === 'csv') {
        const blob = await response.blob()
        const downloadUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `peso_result_${resultId}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(downloadUrl)
      } else {
        const data = await response.json()
        if (data.data?.pdf_url) {
          window.open(data.data.pdf_url, '_blank')
        }
      }
      setShowExportModal(false)
    } catch {
      alert('エクスポートに失敗しました')
    } finally {
      setExporting(false)
    }
  }, [resultId])

  const getProgressPercent = () => {
    return (surveyStep / 3) * 100
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
        if (data.data?.id) {
          setResultId(data.data.id)
        }
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
              onClick={openSurvey}
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
            {resultId && (
              <>
                <button
                  onClick={() => setShowSaveModal(true)}
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
                  <Folder style={{ width: 16, height: 16 }} />
                  保存
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
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
                  <Download style={{ width: 16, height: 16 }} />
                  エクスポート
                </button>
              </>
            )}
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

      {/* Survey Modal */}
      {isSurveyOpen && (
        <div
          onClick={closeSurvey}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E4E4E7',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                  採用活動アンケート
                </h2>
                <button
                  onClick={closeSurvey}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X style={{ width: 20, height: 20, color: '#A1A1AA' }} />
                </button>
              </div>
              {/* Progress bar */}
              <div style={{ background: '#E4E4E7', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    background: '#0D9488',
                    height: '100%',
                    width: `${getProgressPercent()}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#A1A1AA' }}>
                STEP {surveyStep} / 3
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflow: 'auto', flex: 1 }}>
              {/* STEP 1: やっていること */}
              {surveyStep === 1 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '24px' }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '6px',
                        background: '#0D9488',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      1
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: '0 0 4px 0' }}>
                        やっていること
                      </h3>
                      <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>
                        現在、採用活動で行っていることをすべて選択してください
                      </p>
                    </div>
                  </div>

                  {surveyCategories.map((category) => (
                    <div key={category.id} style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '10px' }}>
                        {category.label}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {category.options.map((option) => {
                          const isSelected = selectedActivities.has(option.id)
                          return (
                            <label
                              key={option.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 14px',
                                border: isSelected ? '1px solid #0D9488' : '1px solid #E4E4E7',
                                borderRadius: '6px',
                                background: isSelected ? 'rgba(13,148,136,0.05)' : '#FFFFFF',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleActivity(option.id)}
                                style={{ display: 'none' }}
                              />
                              <div
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: '4px',
                                  border: isSelected ? '1px solid #0D9488' : '1px solid #D4D4D8',
                                  background: isSelected ? '#0D9488' : '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {isSelected && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
                                    <path d="M5 12l5 5L20 7" />
                                  </svg>
                                )}
                              </div>
                              <span style={{ fontSize: '13px', color: isSelected ? '#0D9488' : '#52525B' }}>
                                {option.label}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  <div
                    style={{
                      marginTop: '24px',
                      padding: '12px 16px',
                      background: '#F4F4F5',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#52525B',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#0D9488' }}>{selectedActivities.size}</span>件選択中
                  </div>
                </div>
              )}

              {/* STEP 2: 詳細 */}
              {surveyStep === 2 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '24px' }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '6px',
                        background: '#0D9488',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      2
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: '0 0 4px 0' }}>
                        詳細を教えてください
                      </h3>
                      <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>
                        選択した項目について、具体的な活動内容を教えてください
                      </p>
                    </div>
                  </div>

                  {selectedActivities.size === 0 ? (
                    <div
                      style={{
                        padding: '48px 24px',
                        textAlign: 'center',
                        color: '#A1A1AA',
                        background: '#F9FAFB',
                        borderRadius: '8px',
                      }}
                    >
                      <p style={{ fontSize: '14px' }}>STEP 1で選択した項目の詳細入力欄がここに表示されます</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {Array.from(selectedActivities).map((activityId) => {
                        const allOptions = surveyCategories.flatMap((c) => c.options)
                        const option = allOptions.find((o) => o.id === activityId)
                        if (!option) return null
                        return (
                          <div
                            key={activityId}
                            style={{
                              padding: '16px',
                              border: '1px solid #E4E4E7',
                              borderRadius: '8px',
                              background: '#FFFFFF',
                            }}
                          >
                            <div style={{ fontSize: '14px', fontWeight: 500, color: '#18181B', marginBottom: '8px' }}>
                              {option.label}
                            </div>
                            <textarea
                              placeholder={`${option.label}について、具体的な取り組み内容を教えてください`}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #E4E4E7',
                                borderRadius: '6px',
                                fontSize: '13px',
                                resize: 'vertical',
                                minHeight: '80px',
                                outline: 'none',
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: 求人コンテンツ */}
              {surveyStep === 3 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '24px' }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '6px',
                        background: '#0D9488',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      3
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: '0 0 4px 0' }}>
                        求人コンテンツについて
                      </h3>
                      <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>
                        求人原稿の写真・テキストへの取り組みを教えてください
                      </p>
                    </div>
                  </div>

                  {/* 求人写真 */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '12px' }}>
                      求人写真
                    </div>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                      {photoDepthOptions.map((option) => {
                        const isSelected = photoDepth === option.value
                        return (
                          <label
                            key={option.value}
                            style={{
                              flex: '1 0 auto',
                              minWidth: '120px',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="radio"
                              name="photo-depth"
                              value={option.value}
                              checked={isSelected}
                              onChange={() => setPhotoDepth(option.value)}
                              style={{ display: 'none' }}
                            />
                            <div
                              style={{
                                padding: '12px',
                                border: isSelected ? '2px solid #0D9488' : '1px solid #E4E4E7',
                                borderRadius: '8px',
                                background: isSelected ? 'rgba(13,148,136,0.05)' : '#FFFFFF',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: isSelected ? '#0D9488' : '#A1A1AA',
                                  marginBottom: '4px',
                                }}
                              >
                                {option.level}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: '#18181B', marginBottom: '4px' }}>
                                {option.title}
                              </div>
                              <div style={{ fontSize: '11px', color: '#A1A1AA', lineHeight: 1.4 }}>
                                {option.desc}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* 求人テキスト */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '12px' }}>
                      求人テキスト
                    </div>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                      {textDepthOptions.map((option) => {
                        const isSelected = textDepth === option.value
                        return (
                          <label
                            key={option.value}
                            style={{
                              flex: '1 0 auto',
                              minWidth: '120px',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="radio"
                              name="text-depth"
                              value={option.value}
                              checked={isSelected}
                              onChange={() => setTextDepth(option.value)}
                              style={{ display: 'none' }}
                            />
                            <div
                              style={{
                                padding: '12px',
                                border: isSelected ? '2px solid #0D9488' : '1px solid #E4E4E7',
                                borderRadius: '8px',
                                background: isSelected ? 'rgba(13,148,136,0.05)' : '#FFFFFF',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: isSelected ? '#0D9488' : '#A1A1AA',
                                  marginBottom: '4px',
                                }}
                              >
                                {option.level}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: '#18181B', marginBottom: '4px' }}>
                                {option.title}
                              </div>
                              <div style={{ fontSize: '11px', color: '#A1A1AA', lineHeight: 1.4 }}>
                                {option.desc}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #E4E4E7',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {surveyStep > 1 ? (
                <button
                  onClick={handleSurveyBack}
                  style={{
                    padding: '10px 20px',
                    background: '#FFFFFF',
                    color: '#52525B',
                    border: '1px solid #E4E4E7',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  戻る
                </button>
              ) : (
                <div />
              )}
              {surveyStep < 3 ? (
                <button
                  onClick={handleSurveyNext}
                  style={{
                    padding: '10px 24px',
                    background: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  次へ
                </button>
              ) : (
                <button
                  onClick={handleSurveySubmit}
                  style={{
                    padding: '10px 24px',
                    background: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  診断結果を見る
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowSaveModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              margin: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                診断結果を保存
              </h3>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X style={{ width: 20, height: 20, color: '#71717A' }} />
              </button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#52525B', marginBottom: '4px' }}>
                保存名
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="例：PESO診断_12月"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#52525B',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!saveName.trim() || saving}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: saveName.trim() ? '#0D9488' : '#A1A1AA',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  cursor: saveName.trim() && !saving ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {saving ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Folder style={{ width: 16, height: 16 }} />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              margin: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                エクスポート形式を選択
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X style={{ width: 20, height: 20, color: '#71717A' }} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                style={{
                  padding: '16px',
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#18181B',
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                }}
              >
                <Download style={{ width: 20, height: 20, color: '#0D9488' }} />
                <div>
                  <div style={{ fontWeight: 500 }}>CSVファイル</div>
                  <div style={{ fontSize: '12px', color: '#71717A' }}>Excel等で開けます</div>
                </div>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                style={{
                  padding: '16px',
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#18181B',
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                }}
              >
                <Download style={{ width: 20, height: 20, color: '#7C3AED' }} />
                <div>
                  <div style={{ fontWeight: 500 }}>PDFファイル</div>
                  <div style={{ fontSize: '12px', color: '#71717A' }}>印刷・共有用</div>
                </div>
              </button>
            </div>
            {exporting && (
              <div style={{ marginTop: '16px', textAlign: 'center', color: '#71717A', fontSize: '13px' }}>
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '8px' }} />
                エクスポート中...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
