'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, Folder, Download, X, AlertCircle, Grid2X2, RefreshCw } from 'lucide-react'

/**
 * PESO Diagnosis Result Detail Page (SC-403)
 * GAP-017: 結果画面独立化
 *
 * 履歴から保存したPESO診断結果を再表示するページ
 * - GET /api/peso/results/{id} から結果取得
 * - 保存・エクスポート機能
 */

interface PesoScores {
  paid: number
  earned: number
  shared: number
  owned: number
}

interface CompanyInfo {
  company_name?: string
  industry?: string
  employee_size?: string
  prefecture?: string
}

interface DiagnosisData {
  companyInfo?: CompanyInfo
  currentActivities?: {
    paid: string[]
    earned: string[]
    shared: string[]
    owned: string[]
  }
  contentDepth?: {
    photo: string | null
    text: string | null
  }
  saved_name?: string
}

interface Recommendation {
  category: string
  priority: string
  title: string
  description: string
}

interface PesoResult {
  id: string
  diagnosis_data: DiagnosisData | null
  scores: PesoScores | null
  recommendations: Recommendation[] | string[] | null
  created_at: string
}

// PESOカテゴリの設定
const PESO_CONFIG = {
  paid: { label: 'Paid', color: '#3B82F6', bgLight: 'rgba(59,130,246,0.1)', subtitle: '有料広告・求人媒体' },
  earned: { label: 'Earned', color: '#F59E0B', bgLight: 'rgba(245,158,11,0.1)', subtitle: '口コミ・第三者評価' },
  shared: { label: 'Shared', color: '#EC4899', bgLight: 'rgba(236,72,153,0.1)', subtitle: 'SNS拡散・シェア' },
  owned: { label: 'Owned', color: '#10B981', bgLight: 'rgba(16,185,129,0.1)', subtitle: '自社メディア' },
}

export default function PesoResultPage() {
  const params = useParams()
  const router = useRouter()
  const resultId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PesoResult | null>(null)

  // Save/Export modal state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await fetch(`/api/peso/results/${resultId}`)
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
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `peso_result_${resultId}.csv`
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

  // スコアのレーダーチャート用の座標計算
  const getRadarPoints = (scores: PesoScores) => {
    const centerX = 100
    const centerY = 100
    const radius = 80

    // 4方向（上、右、下、左）
    const directions = [
      { key: 'paid', angle: -Math.PI / 2 }, // 上
      { key: 'earned', angle: 0 }, // 右
      { key: 'shared', angle: Math.PI / 2 }, // 下
      { key: 'owned', angle: Math.PI }, // 左
    ]

    return directions.map(({ key, angle }) => {
      const score = scores[key as keyof PesoScores] || 0
      const r = (score / 100) * radius
      return {
        key,
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      }
    })
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
          onClick={() => router.push('/dashboard/peso')}
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
          PESO診断画面に戻る
        </button>
      </div>
    )
  }

  const scores = result?.scores || { paid: 0, earned: 0, shared: 0, owned: 0 }
  const radarPoints = getRadarPoints(scores)
  const totalScore = Math.round((scores.paid + scores.earned + scores.shared + scores.owned) / 4)
  const companyInfo = result?.diagnosis_data?.companyInfo

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
          {result?.diagnosis_data?.saved_name || 'PESO診断結果'}
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#A1A1AA',
            marginTop: '2px',
            fontWeight: 400,
          }}
        >
          {companyInfo?.company_name || '診断日: '}{companyInfo?.company_name ? '' : new Date(result?.created_at || '').toLocaleDateString('ja-JP')}
        </p>
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '24px' }}>
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

          {/* Score Summary */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '12px',
              padding: '32px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '48px', alignItems: 'center' }}>
              {/* Radar Chart */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <svg width="200" height="200" viewBox="0 0 200 200">
                  {/* 背景グリッド */}
                  {[20, 40, 60, 80, 100].map((percent) => (
                    <circle
                      key={percent}
                      cx="100"
                      cy="100"
                      r={(percent / 100) * 80}
                      fill="none"
                      stroke="#E4E4E7"
                      strokeWidth="1"
                    />
                  ))}
                  {/* 軸 */}
                  <line x1="100" y1="100" x2="100" y2="20" stroke="#E4E4E7" strokeWidth="1" />
                  <line x1="100" y1="100" x2="180" y2="100" stroke="#E4E4E7" strokeWidth="1" />
                  <line x1="100" y1="100" x2="100" y2="180" stroke="#E4E4E7" strokeWidth="1" />
                  <line x1="100" y1="100" x2="20" y2="100" stroke="#E4E4E7" strokeWidth="1" />
                  {/* データエリア */}
                  <polygon
                    points={radarPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="rgba(13,148,136,0.2)"
                    stroke="#0D9488"
                    strokeWidth="2"
                  />
                  {/* データポイント */}
                  {radarPoints.map((point) => (
                    <circle
                      key={point.key}
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="#0D9488"
                    />
                  ))}
                  {/* ラベル */}
                  <text x="100" y="10" textAnchor="middle" fontSize="12" fill="#3B82F6" fontWeight="600">P</text>
                  <text x="190" y="105" textAnchor="middle" fontSize="12" fill="#F59E0B" fontWeight="600">E</text>
                  <text x="100" y="198" textAnchor="middle" fontSize="12" fill="#EC4899" fontWeight="600">S</text>
                  <text x="10" y="105" textAnchor="middle" fontSize="12" fill="#10B981" fontWeight="600">O</text>
                </svg>
              </div>

              {/* 総合スコア */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', fontWeight: 700, color: '#0D9488', lineHeight: 1 }}>
                  {totalScore}
                </div>
                <div style={{ fontSize: '14px', color: '#A1A1AA', marginTop: '8px' }}>総合スコア</div>
                <div style={{ fontSize: '12px', color: '#52525B', marginTop: '4px' }}>
                  {totalScore >= 80 ? '優秀' : totalScore >= 60 ? '良好' : totalScore >= 40 ? '改善の余地あり' : '要改善'}
                </div>
              </div>
            </div>
          </div>

          {/* PESO Category Scores */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {Object.entries(PESO_CONFIG).map(([key, config]) => {
              const score = scores[key as keyof PesoScores] || 0
              return (
                <div
                  key={key}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      background: config.color,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 700,
                      margin: '0 auto 12px',
                    }}
                  >
                    {config.label.charAt(0)}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: config.color }}>
                    {score}
                  </div>
                  <div style={{ fontSize: '13px', color: '#18181B', fontWeight: 500 }}>
                    {config.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#A1A1AA' }}>
                    {config.subtitle}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recommendations */}
          {result?.recommendations && result.recommendations.length > 0 && (
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#18181B', marginBottom: '16px' }}>
                改善提案
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {result.recommendations.map((rec, index) => {
                  // 推奨事項が文字列の場合とオブジェクトの場合を処理
                  const isString = typeof rec === 'string'
                  const title = isString ? rec : (rec as Recommendation).title
                  const description = isString ? '' : (rec as Recommendation).description
                  const category = isString ? '' : (rec as Recommendation).category
                  const priority = isString ? '' : (rec as Recommendation).priority

                  return (
                    <div
                      key={index}
                      style={{
                        padding: '16px',
                        background: '#FAFAFA',
                        borderRadius: '6px',
                        borderLeft: `3px solid ${
                          category === 'paid' ? '#3B82F6' :
                          category === 'earned' ? '#F59E0B' :
                          category === 'shared' ? '#EC4899' :
                          category === 'owned' ? '#10B981' :
                          '#0D9488'
                        }`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        {priority && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: priority === 'high' ? '#FEE2E2' : priority === 'medium' ? '#FEF3C7' : '#E0F2FE',
                              color: priority === 'high' ? '#991B1B' : priority === 'medium' ? '#92400E' : '#0369A1',
                            }}
                          >
                            {priority === 'high' ? '優先度高' : priority === 'medium' ? '中' : '低'}
                          </span>
                        )}
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#18181B' }}>{title}</span>
                      </div>
                      {description && (
                        <p style={{ fontSize: '13px', color: '#52525B', margin: 0 }}>{description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Company Info Summary */}
          {companyInfo && (
            <div
              style={{
                background: '#F4F4F5',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#18181B', marginBottom: '16px' }}>
                診断情報
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '4px' }}>企業名</div>
                  <div style={{ fontSize: '13px', color: '#18181B' }}>{companyInfo.company_name || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '4px' }}>業種</div>
                  <div style={{ fontSize: '13px', color: '#18181B' }}>{companyInfo.industry || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '4px' }}>従業員規模</div>
                  <div style={{ fontSize: '13px', color: '#18181B' }}>{companyInfo.employee_size || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '4px' }}>診断日時</div>
                  <div style={{ fontSize: '13px', color: '#18181B' }}>
                    {new Date(result?.created_at || '').toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button
              onClick={() => router.push('/dashboard/peso')}
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
              <RefreshCw style={{ width: 16, height: 16 }} />
              新規診断を開始
            </button>
            <button
              onClick={() => router.push('/dashboard/history')}
              style={{
                padding: '10px 24px',
                background: '#FFFFFF',
                color: '#52525B',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Grid2X2 style={{ width: 16, height: 16 }} />
              履歴一覧へ
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
