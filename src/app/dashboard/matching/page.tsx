'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Check, Loader2, Star, Folder, Download, X, Sparkles, AlertCircle } from 'lucide-react'

// 職種マスターの型定義
interface JobCategory {
  id: string
  code: string
  name: string
  category: string
  sort_order: number
}

/**
 * Media Matching Page
 *
 * Design spec: 03_ブランディングとデザインガイド.md
 *
 * Flow:
 * 1. Input - User enters business location, occupation, employment type
 * 2. Query - User selects search queries
 * 3. Loading - Analysis in progress
 * 4. Result - Display ranked media recommendations
 */

type Step = 'input' | 'query' | 'loading' | 'result'

// GAP-015: 予算配分を含む結果型
interface MatchResult {
  rank: number
  mediaId: string
  mediaName: string
  score: number
  searchShare: string
  monthlyTraffic: string
  color: string
  // GAP-015: 予算配分情報
  budgetAllocation?: number // 推奨予算配分率（0-100%）
  expectedROI?: string // 期待ROI
  recommendedBudget?: string // 推奨予算額
  estimatedCost?: string // 想定費用
  matchReasons?: string[] // マッチング理由
}

// デフォルトの表示用サンプル（APIレスポンスがない場合のフォールバック）
const sampleResults: MatchResult[] = [
  { rank: 1, mediaId: 'indeed', mediaName: 'Indeed', score: 85.2, searchShare: '32%', monthlyTraffic: '12,400', color: '#2557a7', budgetAllocation: 40, expectedROI: '応募単価 3,000円', recommendedBudget: '50万円〜80万円' },
  { rank: 2, mediaId: 'jobmedley', mediaName: 'ジョブメドレー', score: 72.8, searchShare: '24%', monthlyTraffic: '8,200', color: '#00a98f', budgetAllocation: 30, expectedROI: '応募単価 4,500円', recommendedBudget: '30万円〜50万円' },
  { rank: 3, mediaId: 'kaigojob', mediaName: 'カイゴジョブ', score: 64.1, searchShare: '18%', monthlyTraffic: '5,600', color: '#e85298', budgetAllocation: 15, expectedROI: '応募単価 5,000円', recommendedBudget: '15万円〜25万円' },
  { rank: 4, mediaId: 'mynavi', mediaName: 'マイナビ介護', score: 52.3, searchShare: '14%', monthlyTraffic: '4,100', color: '#ff6b35', budgetAllocation: 10, expectedROI: '応募単価 6,000円', recommendedBudget: '10万円〜20万円' },
  { rank: 5, mediaId: 'ekaigo', mediaName: 'e介護転職', score: 41.6, searchShare: '8%', monthlyTraffic: '2,300', color: '#4a90a4', budgetAllocation: 5, expectedROI: '応募単価 8,000円', recommendedBudget: '5万円〜10万円' },
]

// 予算配分の円グラフ用カラーパレット
const BUDGET_COLORS = ['#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']

// F-MAT-002: AIサジェストクエリの型定義
interface SuggestedQuery {
  text: string
  selected: boolean
  category?: 'related' | 'competitor' | 'longtail'
  relevanceScore?: number
  reason?: string
}

// デフォルトのサジェストクエリ（APIフォールバック用）
const getDefaultQueries = (address: string, occupation: string): SuggestedQuery[] => [
  { text: `${address || '川崎市'} ${occupation || '訪問介護'} 求人`, selected: true, category: 'related', relevanceScore: 95 },
  { text: `${occupation || '訪問介護'} 正社員 募集`, selected: true, category: 'related', relevanceScore: 90 },
  { text: `${occupation || '訪問介護'} 転職`, selected: true, category: 'related', relevanceScore: 85 },
  { text: `${occupation || '訪問介護'} 未経験 可`, selected: false, category: 'longtail', relevanceScore: 75 },
]

export default function MatchingPage() {
  const [step, setStep] = useState<Step>('input')
  const [formData, setFormData] = useState({
    address: '',
    occupation: '',
    employment: '',
  })
  const [queries, setQueries] = useState<SuggestedQuery[]>([])
  const [resultId, setResultId] = useState<string | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  // F-MAT-002: AIサジェスト関連の状態
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [usedFallback, setUsedFallback] = useState(false)
  // 職種マスター
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([])
  const [jobCategoriesLoading, setJobCategoriesLoading] = useState(true)

  // 職種マスターを取得
  useEffect(() => {
    const fetchJobCategories = async () => {
      try {
        const response = await fetch('/api/job-categories')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setJobCategories(data.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch job categories:', error)
      } finally {
        setJobCategoriesLoading(false)
      }
    }
    fetchJobCategories()
  }, [])

  const selectedCount = queries.filter((q) => q.selected).length

  // F-MAT-002: AIクエリ提案APIを呼び出す関数
  const fetchSuggestedQueries = useCallback(async () => {
    setSuggestLoading(true)
    setSuggestError(null)
    setUsedFallback(false)

    try {
      const response = await fetch('/api/keywords/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType: formData.occupation || '訪問介護',
          area: formData.address || '',
          conditions: formData.employment ? [formData.employment] : [],
          suggestionType: 'all',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'キーワード提案の取得に失敗しました')
      }

      const data = await response.json()

      if (data.success && data.data?.keywords?.length > 0) {
        // APIからのキーワードを選択可能な形式に変換
        const suggestedQueries: SuggestedQuery[] = data.data.keywords.map(
          (kw: { keyword: string; category: string; relevanceScore: number; reason: string }, index: number) => ({
            text: kw.keyword,
            selected: index < 4, // 上位4件をデフォルトで選択
            category: kw.category as 'related' | 'competitor' | 'longtail',
            relevanceScore: kw.relevanceScore,
            reason: kw.reason,
          })
        )
        setQueries(suggestedQueries)
      } else {
        // 空の結果の場合はフォールバック
        setQueries(getDefaultQueries(formData.address, formData.occupation))
        setUsedFallback(true)
      }
    } catch (error) {
      console.error('Keyword suggestion error:', error)
      setSuggestError(error instanceof Error ? error.message : 'エラーが発生しました')
      // フォールバック：デフォルトのクエリを使用
      setQueries(getDefaultQueries(formData.address, formData.occupation))
      setUsedFallback(true)
    } finally {
      setSuggestLoading(false)
    }
  }, [formData.address, formData.occupation, formData.employment])

  const handleNext = async () => {
    if (step === 'input') {
      setStep('query')
      // F-MAT-002: Step1完了時にAIクエリ提案APIを呼び出し
      await fetchSuggestedQueries()
    }
  }

  const handleAnalyze = async () => {
    setStep('loading')

    try {
      // マッチングAPI呼び出し
      const selectedQueryTexts = queries.filter((q) => q.selected).map((q) => q.text)
      const response = await fetch('/api/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditions: {
            location: formData.address || '川崎市麻生区',
            occupation: formData.occupation || '訪問介護',
            employmentType: formData.employment || '正社員',
          },
          keywords: selectedQueryTexts,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.data?.id) {
          setResultId(data.data.id)
        }
      }
    } catch (error) {
      console.error('Matching analysis error:', error)
    }

    setStep('result')
  }

  const toggleQuery = (index: number) => {
    setQueries((prev) =>
      prev.map((q, i) => (i === index ? { ...q, selected: !q.selected } : q))
    )
  }

  const goBackToInput = () => {
    setStep('input')
    setQueries([])
    setSuggestError(null)
    setUsedFallback(false)
  }

  const handleReset = () => {
    setStep('input')
    setFormData({ address: '', occupation: '', employment: '' })
    setQueries([])
    setResultId(null)
    setSaveName('')
    setSuggestError(null)
    setUsedFallback(false)
  }

  // 結果保存
  const handleSave = useCallback(async () => {
    if (!resultId || !saveName.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/matching/results/${resultId}/save`, {
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
      alert('分析結果がありません')
      return
    }

    setExporting(true)
    try {
      const response = await fetch(`/api/matching/results/${resultId}/export?format=${format}`)

      if (!response.ok) {
        const data = await response.json()
        alert(data.error?.message || 'エクスポートに失敗しました')
        return
      }

      if (format === 'csv') {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `matching_result_${resultId}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
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

  return (
    <>
      {/* Header: sticky, bg white, border-bottom, padding 16px 24px */}
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
        {step === 'result' ? (
          <>
            <button
              onClick={handleReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '13px',
                color: '#A1A1AA',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '4px',
                padding: 0,
              }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
              新規分析
            </button>
            <h1
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#18181B',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              媒体マッチング結果
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
                fontWeight: 400,
              }}
            >
              {formData.address || '川崎市麻生区'} × {formData.occupation || '訪問介護'} × {formData.employment || '正社員'}
            </p>
          </>
        ) : (
          <>
            <h1
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#18181B',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              媒体マッチング
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
                fontWeight: 400,
              }}
            >
              求人に最適な媒体をAIが提案
            </p>
          </>
        )}
      </header>

      {/* Content area: padding 24px */}
      <div style={{ padding: '24px' }}>
        <div style={{ maxWidth: '576px', margin: '0 auto' }}>
          {/* Progress indicator */}
          {step !== 'result' && step !== 'loading' && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#0D9488',
                  transform: step === 'input' ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                }}
              />
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: step === 'query' ? '#0D9488' : '#E4E4E7',
                  transform: step === 'query' ? 'scale(1.25)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              />
            </div>
          )}

          {/* Step 1 summary (collapsed) */}
          {step === 'query' && (
            <button
              onClick={goBackToInput}
              style={{
                width: '100%',
                background: '#F4F4F5',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  background: '#0D9488',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Check style={{ width: 12, height: 12, color: '#FFFFFF', strokeWidth: 2.5 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#A1A1AA' }}>分析条件</div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#18181B',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formData.address || '川崎市麻生区'} ・ {formData.occupation || '訪問介護'} ・ {formData.employment || '正社員'}
                </div>
              </div>
              <span style={{ fontSize: '12px', color: '#A1A1AA', flexShrink: 0 }}>変更</span>
            </button>
          )}

          {/* Step 1: Input form */}
          {step === 'input' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#A1A1AA',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                  }}
                >
                  Step 1
                </div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#18181B',
                    marginBottom: '8px',
                  }}
                >
                  分析条件を入力
                </h2>
                <p style={{ fontSize: '13px', color: '#A1A1AA' }}>
                  求人の基本情報を入力してください
                </p>
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#52525B',
                        marginBottom: '4px',
                      }}
                    >
                      事業所住所
                    </label>
                    <input
                      type="text"
                      placeholder="例：神奈川県川崎市麻生区"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #E4E4E7',
                        borderRadius: '6px',
                        fontSize: '13px',
                        outline: 'none',
                        transition: 'border-color 0.15s ease',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#52525B',
                          marginBottom: '4px',
                        }}
                      >
                        募集職種
                      </label>
                      <select
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        disabled={jobCategoriesLoading}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '6px',
                          fontSize: '13px',
                          outline: 'none',
                          background: '#FFFFFF',
                          cursor: jobCategoriesLoading ? 'wait' : 'pointer',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="">選択してください</option>
                        {jobCategories.map((category) => (
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#52525B',
                          marginBottom: '4px',
                        }}
                      >
                        雇用形態
                      </label>
                      <select
                        value={formData.employment}
                        onChange={(e) => setFormData({ ...formData, employment: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '6px',
                          fontSize: '13px',
                          outline: 'none',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="">選択してください</option>
                        <option value="正社員">正社員</option>
                        <option value="パート・アルバイト">パート・アルバイト</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleNext}
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '10px 16px',
                      background: '#0D9488',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    次へ進む
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Query selection */}
          {step === 'query' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#A1A1AA',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                  }}
                >
                  Step 2
                </div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#18181B',
                    marginBottom: '8px',
                  }}
                >
                  検索クエリを選択
                </h2>
                <p style={{ fontSize: '13px', color: '#A1A1AA' }}>
                  求職者が検索しそうなキーワードを選択してください
                </p>
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                {/* F-MAT-002: AI推定バッジと説明 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      background: usedFallback ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                      color: usedFallback ? '#D97706' : '#059669',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {usedFallback ? (
                      <>
                        <AlertCircle style={{ width: 10, height: 10 }} />
                        基本提案
                      </>
                    ) : (
                      <>
                        <Sparkles style={{ width: 10, height: 10 }} />
                        AI提案
                      </>
                    )}
                  </span>
                  <span style={{ fontSize: '13px', color: '#52525B' }}>
                    {formData.address || '指定なし'}で{formData.occupation || '介護'}の{formData.employment || '求人'}を探す求職者
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '20px' }}>
                  {usedFallback
                    ? '基本的なキーワードを提案しています。より詳細な条件を入力すると精度が向上します。'
                    : 'AIが入力条件を分析し、検索される可能性の高いクエリを提案しています'}
                </p>

                {/* F-MAT-002: ローディング状態 */}
                {suggestLoading ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '32px',
                      gap: '12px',
                    }}
                  >
                    <Loader2
                      style={{
                        width: 32,
                        height: 32,
                        color: '#0D9488',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    <span style={{ fontSize: '13px', color: '#52525B' }}>
                      AIがキーワードを分析中...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* F-MAT-002: エラー表示 */}
                    {suggestError && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px',
                          background: '#FEF3C7',
                          border: '1px solid #FDE68A',
                          borderRadius: '6px',
                          marginBottom: '16px',
                          fontSize: '12px',
                          color: '#92400E',
                        }}
                      >
                        <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                        <span>{suggestError}。デフォルトのキーワードを表示しています。</span>
                      </div>
                    )}

                    {/* クエリ選択ボタン群 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                      {queries.map((query, index) => (
                        <button
                          key={index}
                          onClick={() => toggleQuery(index)}
                          title={query.reason || undefined}
                          style={{
                            padding: '8px 16px',
                            border: query.selected ? '1px solid #0D9488' : '1px solid #E4E4E7',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 500,
                            background: query.selected ? '#F0FDFA' : '#FFFFFF',
                            color: query.selected ? '#0D9488' : '#52525B',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            position: 'relative',
                          }}
                        >
                          {query.text}
                          {query.relevanceScore && query.relevanceScore >= 90 && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                width: '8px',
                                height: '8px',
                                background: '#0D9488',
                                borderRadius: '50%',
                              }}
                            />
                          )}
                        </button>
                      ))}
                      <button
                        style={{
                          padding: '8px 16px',
                          border: '1px dashed #E4E4E7',
                          borderRadius: '9999px',
                          fontSize: '13px',
                          color: '#A1A1AA',
                          background: 'transparent',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease',
                        }}
                      >
                        + カスタム追加
                      </button>
                    </div>
                  </>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '16px',
                    borderTop: '1px solid #F4F4F5',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#A1A1AA' }}>{selectedCount}件選択中</span>
                  {!suggestLoading && queries.length > 0 && (
                    <button
                      onClick={fetchSuggestedQueries}
                      style={{
                        fontSize: '12px',
                        color: '#0D9488',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Sparkles style={{ width: 12, height: 12 }} />
                      再提案
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={selectedCount === 0 || suggestLoading}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '10px 16px',
                  background: selectedCount === 0 || suggestLoading ? '#A1A1AA' : '#0D9488',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: selectedCount === 0 || suggestLoading ? 'not-allowed' : 'pointer',
                  opacity: selectedCount === 0 || suggestLoading ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.15s ease',
                }}
              >
                媒体を分析する
                <Star style={{ width: 16, height: 16 }} />
              </button>
            </div>
          )}

          {/* Loading state */}
          {step === 'loading' && (
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                padding: '48px 24px',
                textAlign: 'center',
              }}
            >
              <Loader2
                style={{
                  width: 48,
                  height: 48,
                  color: '#0D9488',
                  margin: '0 auto 16px',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#18181B', marginBottom: '8px' }}>
                媒体データを分析中...
              </div>
              <p style={{ fontSize: '13px', color: '#A1A1AA' }}>
                検索クエリごとのランキングを取得しています
              </p>
            </div>
          )}
        </div>

        {/* Results display */}
        {step === 'result' && (
          <div style={{ maxWidth: '768px', margin: '0 auto' }}>
            {/* Hero area */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#A1A1AA',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px',
                }}
              >
                Analysis Complete
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#18181B', marginBottom: '8px' }}>
                おすすめ媒体ランキング
              </h2>
              <p style={{ fontSize: '13px', color: '#A1A1AA' }}>
                選択した検索クエリに基づく最適な媒体を分析しました
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={() => setShowSaveModal(true)}
                disabled={!resultId}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: resultId ? '#52525B' : '#A1A1AA',
                  background: '#FFFFFF',
                  cursor: resultId ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.15s ease',
                  opacity: resultId ? 1 : 0.6,
                }}
              >
                <Folder style={{ width: 16, height: 16 }} />
                保存
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                disabled={!resultId}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: resultId ? '#52525B' : '#A1A1AA',
                  background: '#FFFFFF',
                  cursor: resultId ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.15s ease',
                  opacity: resultId ? 1 : 0.6,
                }}
              >
                <Download style={{ width: 16, height: 16 }} />
                エクスポート
              </button>
            </div>

            {/* Ranking cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {sampleResults.map((result) => (
                <div
                  key={result.rank}
                  style={{
                    background: '#FFFFFF',
                    border: result.rank === 1 ? '1px solid #0D9488' : '1px solid #E4E4E7',
                    borderRadius: '8px',
                    padding: '16px',
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                      background:
                        result.rank === 1
                          ? '#0D9488'
                          : result.rank === 2
                            ? '#FEF3C7'
                            : result.rank === 3
                              ? '#FFEDD5'
                              : '#F4F4F5',
                      color:
                        result.rank === 1
                          ? '#FFFFFF'
                          : result.rank === 2
                            ? '#D97706'
                            : result.rank === 3
                              ? '#EA580C'
                              : '#A1A1AA',
                    }}
                  >
                    {result.rank}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: result.color }}>
                      {result.mediaName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#A1A1AA' }}>
                      検索シェア{result.searchShare} ・ 推定月間トラフィック {result.monthlyTraffic}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#18181B' }}>
                      {result.score}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#A1A1AA' }}>適合率</div>
                  </div>
                </div>
              ))}
            </div>

            {/* GAP-015: 予算配分提案セクション */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', marginBottom: '16px' }}>
                予算配分の提案
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 円グラフ風の予算配分バー */}
                <div>
                  <div style={{ fontSize: '13px', color: '#52525B', marginBottom: '12px' }}>推奨投資割合</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sampleResults.slice(0, 5).map((result, index) => (
                      <div key={result.mediaId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '80px', fontSize: '12px', color: '#52525B', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {result.mediaName}
                        </div>
                        <div style={{ flex: 1, height: '16px', background: '#F4F4F5', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${result.budgetAllocation || 0}%`,
                              height: '100%',
                              background: BUDGET_COLORS[index % BUDGET_COLORS.length],
                              borderRadius: '4px',
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </div>
                        <div style={{ width: '40px', fontSize: '12px', fontWeight: 600, color: '#18181B', textAlign: 'right' }}>
                          {result.budgetAllocation || 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 予算・ROI詳細テーブル */}
                <div>
                  <div style={{ fontSize: '13px', color: '#52525B', marginBottom: '12px' }}>推奨予算と期待ROI</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {sampleResults.slice(0, 5).map((result, index) => (
                      <div
                        key={result.mediaId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: index === 0 ? '#F0FDFA' : '#FAFAFA',
                          borderRadius: '6px',
                          borderLeft: `3px solid ${BUDGET_COLORS[index % BUDGET_COLORS.length]}`,
                        }}
                      >
                        <div style={{ flex: 1, fontSize: '12px', color: '#52525B' }}>
                          {result.recommendedBudget || '-'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#0D9488', fontWeight: 500 }}>
                          {result.expectedROI || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#92400E',
                }}
              >
                ※ 予算配分はAIによる推定値です。実際の掲載費用は各媒体の料金プランによって異なります。
              </div>
            </div>

            {/* Analysis conditions summary */}
            <div
              style={{
                background: '#F4F4F5',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#18181B', marginBottom: '16px' }}>
                分析条件
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '4px' }}>事業所住所</div>
                  <div style={{ fontSize: '13px', color: '#18181B' }}>
                    {formData.address || '神奈川県川崎市麻生区'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '4px' }}>募集職種</div>
                  <div style={{ fontSize: '13px', color: '#18181B' }}>
                    {formData.occupation || '訪問介護'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '4px' }}>雇用形態</div>
                  <div style={{ fontSize: '13px', color: '#18181B' }}>
                    {formData.employment || '正社員'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '4px' }}>分析日時</div>
                  <div style={{ fontSize: '13px', color: '#18181B' }}>
                    {new Date().toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>
            </div>

            {/* New analysis button */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '10px 24px',
                  background: '#0D9488',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.15s ease',
                }}
              >
                <Star style={{ width: 16, height: 16 }} />
                新規分析を開始
              </button>
            </div>
          </div>
        )}
      </div>

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
                分析結果を保存
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
                placeholder="例：川崎市訪問介護分析_12月"
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
