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
      { id: 'mass_ads', label: 'マス広告', selected: false },
      { id: 'display_video', label: 'ディスプレイ/動画広告', selected: false },
      { id: 'search_ads', label: '検索連動型広告など', selected: false },
    ],
  },
  {
    key: 'earned',
    label: 'Earned',
    subtitle: '口コミ・第三者評価',
    color: '#F59E0B',
    bgLight: 'rgba(245,158,11,0.1)',
    tags: [
      { id: 'broad_pr', label: '広義のPR', selected: false },
      { id: 'narrow_pr', label: '狭義のPR（パブリシティ）', selected: false },
      { id: 'strategic_pr', label: '戦略PRなど', selected: false },
    ],
  },
  {
    key: 'owned',
    label: 'Owned',
    subtitle: '自社メディア',
    color: '#10B981',
    bgLight: 'rgba(16,185,129,0.1)',
    tags: [
      { id: 'corporate_site', label: 'コーポレートサイト', selected: false },
      { id: 'brand_site', label: 'ブランドサイト', selected: false },
      { id: 'content_site', label: 'コンテンツサイトなど', selected: false },
    ],
  },
  {
    key: 'shared',
    label: 'Shared',
    subtitle: 'SNS拡散・シェア',
    color: '#EC4899',
    bgLight: 'rgba(236,72,153,0.1)',
    tags: [
      { id: 'sns', label: 'SNS', selected: false },
      { id: 'review_site', label: 'クチコミ（レビュー）サイト', selected: false },
      { id: 'video_site', label: '動画共有サイトなど', selected: false },
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
  const [surveyStep, setSurveyStep] = useState(0) // STEP 0から開始（企業情報）
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set())
  const [photoDepth, setPhotoDepth] = useState<string | null>(null)
  const [textDepth, setTextDepth] = useState<string | null>(null)

  // STEP 0: 企業情報（GAP-016）
  const [companyInfo, setCompanyInfo] = useState({
    companyName: '',
    industry: '',
    employeeSize: '',
    prefecture: '',
  })

  const _toggleTag = (categoryKey: string, tagId: string) => {
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
    setSurveyStep(0) // STEP 0から開始
    setSelectedActivities(new Set())
    setPhotoDepth(null)
    setTextDepth(null)
    setCompanyInfo({ companyName: '', industry: '', employeeSize: '', prefecture: '' })
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
    if (surveyStep > 0) {
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
          // STEP 0: 企業情報（GAP-016）
          companyInfo: {
            company_name: companyInfo.companyName,
            industry: companyInfo.industry,
            employee_size: companyInfo.employeeSize,
            prefecture: companyInfo.prefecture,
          },
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
    return ((surveyStep + 1) / 4) * 100 // 4ステップ (0,1,2,3)
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

            {/* 2x2 Grid - 100% height */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gridTemplateRows: 'repeat(2, 1fr)',
                gap: '16px',
                height: 'calc(100vh - 280px)',
                minHeight: '400px',
              }}
            >
              {orderedCategories.map((category) => (
                <div
                  key={category.key}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: '8px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Category header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
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

                  {/* Bullet list */}
                  <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: 0, flex: 1 }}>
                    {category.tags.map((tag) => (
                      <li
                        key={tag.id}
                        style={{
                          fontSize: '14px',
                          color: '#52525B',
                          lineHeight: 1.8,
                          marginBottom: '4px',
                        }}
                      >
                        {tag.label}
                      </li>
                    ))}
                  </ul>
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
                STEP {surveyStep} / 3（{surveyStep === 0 ? '企業情報' : surveyStep === 1 ? 'やっていること' : surveyStep === 2 ? '詳細' : '求人コンテンツ'}）
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflow: 'auto', flex: 1 }}>
              {/* STEP 0: 企業情報（GAP-016） */}
              {surveyStep === 0 && (
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
                      0
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: '0 0 4px 0' }}>
                        企業情報
                      </h3>
                      <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>
                        診断精度向上のため、貴社の基本情報を教えてください（任意）
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* 企業名 */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                        企業名
                      </label>
                      <input
                        type="text"
                        value={companyInfo.companyName}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                        placeholder="例：株式会社〇〇"
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

                    {/* 業界 */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                        業種・業界
                      </label>
                      <select
                        value={companyInfo.industry}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, industry: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: '#FFFFFF',
                        }}
                      >
                        <option value="">選択してください</option>
                        <optgroup label="IT・通信">
                          <option value="it_software">ソフトウェア・SaaS</option>
                          <option value="it_web">Web・インターネット</option>
                          <option value="it_telecom">通信・ネットワーク</option>
                        </optgroup>
                        <optgroup label="製造・メーカー">
                          <option value="manufacturing_electronics">電機・精密機器</option>
                          <option value="manufacturing_automotive">自動車・輸送機器</option>
                          <option value="manufacturing_chemical">化学・素材</option>
                          <option value="manufacturing_food">食品・飲料</option>
                          <option value="manufacturing_other">その他製造</option>
                        </optgroup>
                        <optgroup label="小売・流通">
                          <option value="retail">小売・販売</option>
                          <option value="ecommerce">EC・通販</option>
                          <option value="logistics">物流・倉庫</option>
                        </optgroup>
                        <optgroup label="サービス">
                          <option value="consulting">コンサルティング</option>
                          <option value="advertising">広告・マーケティング</option>
                          <option value="hr_service">人材サービス</option>
                          <option value="hospitality">ホテル・旅行</option>
                          <option value="restaurant">飲食</option>
                          <option value="education">教育・スクール</option>
                        </optgroup>
                        <optgroup label="金融・不動産">
                          <option value="finance">金融・保険</option>
                          <option value="real_estate">不動産</option>
                        </optgroup>
                        <optgroup label="医療・福祉">
                          <option value="hospital">病院・クリニック</option>
                          <option value="nursing">介護・福祉</option>
                          <option value="pharmacy">薬局</option>
                        </optgroup>
                        <optgroup label="建設・インフラ">
                          <option value="construction">建設・土木</option>
                          <option value="infrastructure">電力・ガス・水道</option>
                        </optgroup>
                        <optgroup label="その他">
                          <option value="government">官公庁・自治体</option>
                          <option value="npo">NPO・団体</option>
                          <option value="other">その他</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* 従業員規模 */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                        従業員規模
                      </label>
                      <select
                        value={companyInfo.employeeSize}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, employeeSize: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: '#FFFFFF',
                        }}
                      >
                        <option value="">選択してください</option>
                        <option value="1-10">1〜10名</option>
                        <option value="11-50">11〜50名</option>
                        <option value="51-100">51〜100名</option>
                        <option value="101-300">101〜300名</option>
                        <option value="301-500">301〜500名</option>
                        <option value="501-1000">501〜1000名</option>
                        <option value="1001+">1001名以上</option>
                      </select>
                    </div>

                    {/* 所在地 */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                        所在地（都道府県）
                      </label>
                      <select
                        value={companyInfo.prefecture}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, prefecture: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: '#FFFFFF',
                        }}
                      >
                        <option value="">選択してください</option>
                        <option value="hokkaido">北海道</option>
                        <option value="aomori">青森県</option>
                        <option value="iwate">岩手県</option>
                        <option value="miyagi">宮城県</option>
                        <option value="akita">秋田県</option>
                        <option value="yamagata">山形県</option>
                        <option value="fukushima">福島県</option>
                        <option value="ibaraki">茨城県</option>
                        <option value="tochigi">栃木県</option>
                        <option value="gunma">群馬県</option>
                        <option value="saitama">埼玉県</option>
                        <option value="chiba">千葉県</option>
                        <option value="tokyo">東京都</option>
                        <option value="kanagawa">神奈川県</option>
                        <option value="niigata">新潟県</option>
                        <option value="toyama">富山県</option>
                        <option value="ishikawa">石川県</option>
                        <option value="fukui">福井県</option>
                        <option value="yamanashi">山梨県</option>
                        <option value="nagano">長野県</option>
                        <option value="gifu">岐阜県</option>
                        <option value="shizuoka">静岡県</option>
                        <option value="aichi">愛知県</option>
                        <option value="mie">三重県</option>
                        <option value="shiga">滋賀県</option>
                        <option value="kyoto">京都府</option>
                        <option value="osaka">大阪府</option>
                        <option value="hyogo">兵庫県</option>
                        <option value="nara">奈良県</option>
                        <option value="wakayama">和歌山県</option>
                        <option value="tottori">鳥取県</option>
                        <option value="shimane">島根県</option>
                        <option value="okayama">岡山県</option>
                        <option value="hiroshima">広島県</option>
                        <option value="yamaguchi">山口県</option>
                        <option value="tokushima">徳島県</option>
                        <option value="kagawa">香川県</option>
                        <option value="ehime">愛媛県</option>
                        <option value="kochi">高知県</option>
                        <option value="fukuoka">福岡県</option>
                        <option value="saga">佐賀県</option>
                        <option value="nagasaki">長崎県</option>
                        <option value="kumamoto">熊本県</option>
                        <option value="oita">大分県</option>
                        <option value="miyazaki">宮崎県</option>
                        <option value="kagoshima">鹿児島県</option>
                        <option value="okinawa">沖縄県</option>
                      </select>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: '24px',
                      padding: '12px 16px',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#166534',
                    }}
                  >
                    💡 企業情報を入力すると、業界・規模に最適化された診断結果を提供できます
                  </div>
                </div>
              )}

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
