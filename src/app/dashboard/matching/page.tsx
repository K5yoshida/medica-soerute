'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check, Loader2, Star, Folder, Download } from 'lucide-react'

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

interface MatchResult {
  rank: number
  mediaName: string
  score: number
  searchShare: string
  monthlyTraffic: string
  color: string
}

const sampleResults: MatchResult[] = [
  { rank: 1, mediaName: 'Indeed', score: 85.2, searchShare: '32%', monthlyTraffic: '12,400', color: '#2557a7' },
  { rank: 2, mediaName: 'ジョブメドレー', score: 72.8, searchShare: '24%', monthlyTraffic: '8,200', color: '#00a98f' },
  { rank: 3, mediaName: 'カイゴジョブ', score: 64.1, searchShare: '18%', monthlyTraffic: '5,600', color: '#e85298' },
  { rank: 4, mediaName: 'マイナビ介護', score: 52.3, searchShare: '14%', monthlyTraffic: '4,100', color: '#ff6b35' },
  { rank: 5, mediaName: 'e介護転職', score: 41.6, searchShare: '8%', monthlyTraffic: '2,300', color: '#4a90a4' },
]

const suggestedQueries = [
  { text: '川崎市 訪問介護 求人', selected: true },
  { text: '麻生区 介護 正社員', selected: true },
  { text: '訪問介護 ヘルパー 募集', selected: true },
  { text: '川崎 介護職 転職', selected: true },
  { text: '神奈川 訪問介護 未経験', selected: false },
  { text: '介護福祉士 訪問 求人', selected: false },
]

export default function MatchingPage() {
  const [step, setStep] = useState<Step>('input')
  const [formData, setFormData] = useState({
    address: '',
    occupation: '',
    employment: '',
  })
  const [queries, setQueries] = useState(suggestedQueries)

  const selectedCount = queries.filter((q) => q.selected).length

  const handleNext = () => {
    if (step === 'input') {
      setStep('query')
    }
  }

  const handleAnalyze = async () => {
    setStep('loading')
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setStep('result')
  }

  const toggleQuery = (index: number) => {
    setQueries((prev) =>
      prev.map((q, i) => (i === index ? { ...q, selected: !q.selected } : q))
    )
  }

  const goBackToInput = () => {
    setStep('input')
  }

  const handleReset = () => {
    setStep('input')
    setFormData({ address: '', occupation: '', employment: '' })
    setQueries(suggestedQueries)
  }

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
                        <option value="訪問介護">訪問介護</option>
                        <option value="訪問看護">訪問看護</option>
                        <option value="施設介護">施設介護</option>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      background: 'rgba(16,185,129,0.1)',
                      color: '#059669',
                      borderRadius: '4px',
                    }}
                  >
                    AI推定
                  </span>
                  <span style={{ fontSize: '13px', color: '#52525B' }}>
                    川崎市で訪問介護の正社員を探す30-40代
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '20px' }}>
                  推定ペルソナに基づいて、検索される可能性の高いクエリを提案しています
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                  {queries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => toggleQuery(index)}
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
                      }}
                    >
                      {query.text}
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
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={selectedCount === 0}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '10px 16px',
                  background: selectedCount === 0 ? '#A1A1AA' : '#0D9488',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedCount === 0 ? 0.5 : 1,
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
                  transition: 'background 0.15s ease',
                }}
              >
                <Folder style={{ width: 16, height: 16 }} />
                保存
              </button>
              <button
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
                  transition: 'background 0.15s ease',
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
    </>
  )
}
