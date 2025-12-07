'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, Folder, Download, X, AlertCircle, Star } from 'lucide-react'

/**
 * Matching Result Detail Page (SC-303)
 * GAP-017: 結果画面独立化
 *
 * 履歴から保存した分析結果を再表示するページ
 * - GET /api/matching/results/{id} から結果取得
 * - 保存・エクスポート機能
 */

interface MatchedMedia {
  name?: string
  mediaName?: string
  score?: number
  matchScore?: number
  rank?: number
  searchShare?: string
  monthlyTraffic?: string
  color?: string
  budgetAllocation?: number
  expectedROI?: string
  recommendedBudget?: string
  estimatedCost?: string
  matchReasons?: string[]
}

interface JobRequirements {
  prefecture?: string
  location?: string
  job_category?: string
  occupation?: string
  employment_type?: string
  employmentType?: string
}

interface AnalysisResult {
  id: string
  job_requirements: JobRequirements | null
  status: string
  matched_media: MatchedMedia[] | null
  analysis_detail: {
    saved_name?: string
    overallAssessment?: string
    marketAnalysis?: string
    recommendations?: string[]
  } | null
  recommendations: string[] | null
  created_at: string
  updated_at: string
}

// 予算配分の円グラフ用カラーパレット
const BUDGET_COLORS = ['#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']

// 媒体カラー
const MEDIA_COLORS: Record<string, string> = {
  indeed: '#2557a7',
  jobmedley: '#00a98f',
  kaigojob: '#e85298',
  mynavi: '#ff6b35',
  ekaigo: '#4a90a4',
}

export default function MatchingResultPage() {
  const params = useParams()
  const router = useRouter()
  const resultId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  // Save/Export modal state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await fetch(`/api/matching/results/${resultId}`)
        const data = await response.json()

        if (!data.success) {
          setError(data.error?.message || '結果の取得に失敗しました')
          return
        }

        setResult(data.data)
      } catch {
        setError('通信エラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    if (resultId) {
      fetchResult()
    }
  }, [resultId])

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

  // 条件データの取得
  const getLocation = () => result?.job_requirements?.location || result?.job_requirements?.prefecture || '-'
  const getOccupation = () => result?.job_requirements?.occupation || result?.job_requirements?.job_category || '-'
  const getEmploymentType = () => result?.job_requirements?.employmentType || result?.job_requirements?.employment_type || '-'

  // matchedMediaの正規化
  const getMatchedMedia = (): MatchedMedia[] => {
    if (!result?.matched_media) return []
    return result.matched_media.map((m, idx) => ({
      ...m,
      name: m.name || m.mediaName || `媒体${idx + 1}`,
      score: m.score ?? m.matchScore ?? 0,
      rank: m.rank ?? idx + 1,
      color: m.color || MEDIA_COLORS[m.name?.toLowerCase() || ''] || BUDGET_COLORS[idx % BUDGET_COLORS.length],
    }))
  }

  if (loading) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <Loader2
          style={{
            width: 48,
            height: 48,
            color: '#0D9488',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }}
        />
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#18181B' }}>
          結果を読み込み中...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FEE2E2',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertCircle style={{ width: 24, height: 24, color: '#EF4444' }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#991B1B' }}>エラー</div>
            <div style={{ fontSize: '13px', color: '#991B1B' }}>{error}</div>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/matching')}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            background: '#0D9488',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          マッチング画面に戻る
        </button>
      </div>
    )
  }

  const matchedMedia = getMatchedMedia()

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
        <button
          onClick={() => router.push('/dashboard/history')}
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
          履歴に戻る
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
          {result?.analysis_detail?.saved_name || '媒体マッチング結果'}
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#A1A1AA',
            marginTop: '2px',
            fontWeight: 400,
          }}
        >
          {getLocation()} × {getOccupation()} × {getEmploymentType()}
        </p>
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
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
              {new Date(result?.created_at || '').toLocaleString('ja-JP')} に分析
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => setShowSaveModal(true)}
              style={{
                padding: '6px 12px',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#52525B',
                background: '#FFFFFF',
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
                padding: '6px 12px',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#52525B',
                background: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Download style={{ width: 16, height: 16 }} />
              エクスポート
            </button>
          </div>

          {/* Ranking cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {matchedMedia.map((media, index) => (
              <div
                key={index}
                style={{
                  background: '#FFFFFF',
                  border: index === 0 ? '1px solid #0D9488' : '1px solid #E4E4E7',
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
                      index === 0
                        ? '#0D9488'
                        : index === 1
                          ? '#FEF3C7'
                          : index === 2
                            ? '#FFEDD5'
                            : '#F4F4F5',
                    color:
                      index === 0
                        ? '#FFFFFF'
                        : index === 1
                          ? '#D97706'
                          : index === 2
                            ? '#EA580C'
                            : '#A1A1AA',
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: media.color }}>
                    {media.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#A1A1AA' }}>
                    {media.searchShare ? `検索シェア${media.searchShare}` : ''}
                    {media.searchShare && media.monthlyTraffic ? ' ・ ' : ''}
                    {media.monthlyTraffic ? `推定月間トラフィック ${media.monthlyTraffic}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#18181B' }}>
                    {media.score}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#A1A1AA' }}>適合率</div>
                </div>
              </div>
            ))}
          </div>

          {/* 予算配分提案セクション */}
          {matchedMedia.some(m => m.budgetAllocation) && (
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
                {/* 予算配分バー */}
                <div>
                  <div style={{ fontSize: '13px', color: '#52525B', marginBottom: '12px' }}>推奨投資割合</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {matchedMedia.slice(0, 5).map((media, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '80px', fontSize: '12px', color: '#52525B', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {media.name}
                        </div>
                        <div style={{ flex: 1, height: '16px', background: '#F4F4F5', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${media.budgetAllocation || 0}%`,
                              height: '100%',
                              background: BUDGET_COLORS[index % BUDGET_COLORS.length],
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                        <div style={{ width: '40px', fontSize: '12px', fontWeight: 600, color: '#18181B', textAlign: 'right' }}>
                          {media.budgetAllocation || 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 予算・ROI詳細テーブル */}
                <div>
                  <div style={{ fontSize: '13px', color: '#52525B', marginBottom: '12px' }}>推奨予算と期待ROI</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {matchedMedia.slice(0, 5).map((media, index) => (
                      <div
                        key={index}
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
                          {media.recommendedBudget || '-'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#0D9488', fontWeight: 500 }}>
                          {media.expectedROI || '-'}
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
          )}

          {/* 分析条件サマリ */}
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
                <div style={{ fontSize: '13px', color: '#18181B' }}>{getLocation()}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '4px' }}>募集職種</div>
                <div style={{ fontSize: '13px', color: '#18181B' }}>{getOccupation()}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '4px' }}>雇用形態</div>
                <div style={{ fontSize: '13px', color: '#18181B' }}>{getEmploymentType()}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '4px' }}>分析日時</div>
                <div style={{ fontSize: '13px', color: '#18181B' }}>
                  {new Date(result?.created_at || '').toLocaleString('ja-JP')}
                </div>
              </div>
            </div>
          </div>

          {/* 新規分析ボタン */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => router.push('/dashboard/matching')}
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
              }}
            >
              <Star style={{ width: 16, height: 16 }} />
              新規分析を開始
            </button>
          </div>
        </div>
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
