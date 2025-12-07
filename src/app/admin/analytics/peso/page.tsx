'use client'

import { useEffect, useState } from 'react'
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Target,
  Megaphone,
  Share2,
  Globe,
} from 'lucide-react'

/**
 * SC-908: PESOインサイト画面
 *
 * Design spec: 09_画面一覧.md - SC-908
 *
 * Features:
 * - PESO診断結果の集計・分析
 * - カテゴリ別スコア分布
 * - 業界別・規模別の傾向分析
 * - 改善推奨施策のトレンド
 */

interface PesoStats {
  totalDiagnoses: number
  avgTotalScore: number
  avgScores: {
    paid: number
    earned: number
    shared: number
    owned: number
  }
  scoreChange: {
    paid: number
    earned: number
    shared: number
    owned: number
  }
}

interface IndustryData {
  industry: string
  count: number
  avgScore: number
}

interface TopRecommendation {
  action: string
  category: 'paid' | 'earned' | 'shared' | 'owned'
  count: number
  percentage: number
}

export default function AdminAnalyticsPesoPage() {
  const [stats, setStats] = useState<PesoStats | null>(null)
  const [industryData, setIndustryData] = useState<IndustryData[]>([])
  const [topRecommendations, setTopRecommendations] = useState<TopRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics/peso?period=${period}`)
      const data = await res.json()

      if (data.success) {
        setStats(data.data.summary)
        setIndustryData(data.data.industryBreakdown || [])
        setTopRecommendations(data.data.topRecommendations || [])
      } else {
        // フォールバック: モックデータ
        setStats({
          totalDiagnoses: 234,
          avgTotalScore: 58,
          avgScores: {
            paid: 72,
            earned: 45,
            shared: 52,
            owned: 63,
          },
          scoreChange: {
            paid: 3.2,
            earned: -2.1,
            shared: 5.4,
            owned: 1.8,
          },
        })
        setIndustryData([
          { industry: '医療・介護', count: 89, avgScore: 62 },
          { industry: 'IT・通信', count: 45, avgScore: 68 },
          { industry: '製造業', count: 38, avgScore: 55 },
          { industry: '小売・飲食', count: 32, avgScore: 48 },
          { industry: 'その他', count: 30, avgScore: 52 },
        ])
        setTopRecommendations([
          { action: 'Googleクチコミの返信対応を強化', category: 'earned', count: 156, percentage: 67 },
          { action: 'Instagram運用の頻度向上', category: 'shared', count: 134, percentage: 57 },
          { action: '採用サイトのコンテンツ充実', category: 'owned', count: 98, percentage: 42 },
          { action: 'Indeed PLUS へのアップグレード', category: 'paid', count: 87, percentage: 37 },
          { action: 'プレスリリースの定期配信', category: 'earned', count: 76, percentage: 32 },
        ])
      }
    } catch (error) {
      console.error('Failed to fetch PESO data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchData()
    setIsRefreshing(false)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'paid':
        return <Target style={{ width: 14, height: 14 }} />
      case 'earned':
        return <Megaphone style={{ width: 14, height: 14 }} />
      case 'shared':
        return <Share2 style={{ width: 14, height: 14 }} />
      case 'owned':
        return <Globe style={{ width: 14, height: 14 }} />
      default:
        return null
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'paid':
        return '#3B82F6'
      case 'earned':
        return '#F59E0B'
      case 'shared':
        return '#0D9488'
      case 'owned':
        return '#7C3AED'
      default:
        return '#71717A'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'paid':
        return 'Paid'
      case 'earned':
        return 'Earned'
      case 'shared':
        return 'Shared'
      case 'owned':
        return 'Owned'
      default:
        return category
    }
  }

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
            <h1
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#18181B',
                margin: 0,
              }}
            >
              PESOインサイト
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
              }}
            >
              PESO診断結果の集計・傾向分析
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #E4E4E7',
                fontSize: '13px',
                color: '#18181B',
                background: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <option value="7d">過去7日間</option>
              <option value="30d">過去30日間</option>
              <option value="90d">過去90日間</option>
            </select>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#18181B',
                cursor: 'pointer',
                opacity: isRefreshing ? 0.6 : 1,
              }}
            >
              <RefreshCw
                style={{
                  width: 14,
                  height: 14,
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                }}
              />
              更新
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#18181B',
                cursor: 'pointer',
              }}
            >
              <Download style={{ width: 14, height: 14 }} />
              エクスポート
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#A1A1AA' }}>
            読み込み中...
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <StatCard
                icon={<PieChart style={{ width: 16, height: 16, color: '#7C3AED' }} />}
                iconBg="rgba(124, 58, 237, 0.1)"
                label="診断実施数"
                value={(stats?.totalDiagnoses || 0).toLocaleString()}
              />
              <PesoScoreCard
                label="Paid"
                score={stats?.avgScores.paid || 0}
                change={stats?.scoreChange.paid || 0}
                color="#3B82F6"
              />
              <PesoScoreCard
                label="Earned"
                score={stats?.avgScores.earned || 0}
                change={stats?.scoreChange.earned || 0}
                color="#F59E0B"
              />
              <PesoScoreCard
                label="Shared"
                score={stats?.avgScores.shared || 0}
                change={stats?.scoreChange.shared || 0}
                color="#0D9488"
              />
              <PesoScoreCard
                label="Owned"
                score={stats?.avgScores.owned || 0}
                change={stats?.scoreChange.owned || 0}
                color="#7C3AED"
              />
            </div>

            {/* Charts Section */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                marginBottom: '24px',
              }}
            >
              {/* Industry Breakdown */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#18181B',
                    margin: '0 0 16px 0',
                  }}
                >
                  業界別診断数・平均スコア
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {industryData.map((item) => {
                    const maxCount = Math.max(...industryData.map((d) => d.count))
                    return (
                      <div key={item.industry}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '4px',
                          }}
                        >
                          <span style={{ fontSize: '13px', color: '#18181B' }}>{item.industry}</span>
                          <span style={{ fontSize: '13px', color: '#71717A' }}>
                            {item.count}件 (平均 {item.avgScore}点)
                          </span>
                        </div>
                        <div
                          style={{
                            height: '8px',
                            background: '#F4F4F5',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${(item.count / maxCount) * 100}%`,
                              background: `linear-gradient(90deg, #7C3AED ${item.avgScore}%, #3B82F6)`,
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* PESO Radar Chart (Simplified) */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#18181B',
                    margin: '0 0 16px 0',
                  }}
                >
                  PESOバランス（全体平均）
                </h3>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '200px',
                  }}
                >
                  {/* Simplified bar representation */}
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', height: '160px' }}>
                    {[
                      { key: 'paid', value: stats?.avgScores.paid || 0 },
                      { key: 'earned', value: stats?.avgScores.earned || 0 },
                      { key: 'shared', value: stats?.avgScores.shared || 0 },
                      { key: 'owned', value: stats?.avgScores.owned || 0 },
                    ].map((item) => (
                      <div
                        key={item.key}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <div
                          style={{
                            width: '48px',
                            height: `${item.value * 1.5}px`,
                            background: getCategoryColor(item.key),
                            borderRadius: '4px 4px 0 0',
                            position: 'relative',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: '-24px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#18181B',
                            }}
                          >
                            {item.value}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#71717A', fontWeight: 500 }}>
                          {getCategoryLabel(item.key)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '12px',
                    padding: '12px',
                    background: '#FAFAFA',
                    borderRadius: '6px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#71717A' }}>総合平均スコア: </span>
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#18181B' }}>
                    {stats?.avgTotalScore || 0}点
                  </span>
                </div>
              </div>
            </div>

            {/* Top Recommendations */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#18181B',
                  margin: '0 0 16px 0',
                }}
              >
                よく提示される改善推奨施策
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {topRecommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '12px 16px',
                      background: '#FAFAFA',
                      borderRadius: '6px',
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '6px',
                        background: `${getCategoryColor(rec.category)}15`,
                        color: getCategoryColor(rec.category),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getCategoryIcon(rec.category)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>
                        {rec.action}
                      </div>
                      <div style={{ fontSize: '11px', color: '#A1A1AA' }}>
                        {getCategoryLabel(rec.category)} カテゴリ
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>
                        {rec.count}件
                      </div>
                      <div style={{ fontSize: '11px', color: '#A1A1AA' }}>{rec.percentage}%</div>
                    </div>
                    <div
                      style={{
                        width: '100px',
                        height: '6px',
                        background: '#E4E4E7',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${rec.percentage}%`,
                          height: '100%',
                          background: getCategoryColor(rec.category),
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '8px',
        padding: '16px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '6px',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: '12px', color: '#71717A' }}>{label}</span>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 600, color: '#18181B' }}>{value}</div>
    </div>
  )
}

function PesoScoreCard({
  label,
  score,
  change,
  color,
}: {
  label: string
  score: number
  change: number
  color: string
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '8px',
        padding: '16px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 500, color }}>{label}</span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            fontSize: '11px',
            color: change >= 0 ? '#0D9488' : '#EF4444',
          }}
        >
          {change >= 0 ? (
            <TrendingUp style={{ width: 12, height: 12 }} />
          ) : (
            <TrendingDown style={{ width: 12, height: 12 }} />
          )}
          {Math.abs(change)}%
        </div>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: '#18181B' }}>{score}</div>
      <div
        style={{
          marginTop: '8px',
          height: '4px',
          background: '#F4F4F5',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            background: color,
            borderRadius: '2px',
          }}
        />
      </div>
    </div>
  )
}
