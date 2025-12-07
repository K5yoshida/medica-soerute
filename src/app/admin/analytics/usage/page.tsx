'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  Users,
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

/**
 * SC-907: 利用状況分析画面
 *
 * Design spec: 09_画面一覧.md - SC-907
 *
 * Features:
 * - 利用状況サマリー表示
 * - 機能別利用回数グラフ
 * - ユーザー別利用ランキング
 * - 期間別トレンド分析
 */

interface UsageStats {
  totalUsers: number
  activeUsers: number
  totalAnalyses: number
  totalPeso: number
  matchingGrowth: number
  pesoGrowth: number
  userGrowth: number
}

interface DailyUsage {
  date: string
  matching: number
  peso: number
  catalog: number
}

interface TopUser {
  id: string
  email: string
  company: string
  matchingCount: number
  pesoCount: number
  lastActive: string
}

export default function AdminAnalyticsUsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([])
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics/usage?period=${period}`)
      const data = await res.json()

      if (data.success) {
        setStats(data.data.summary)
        setDailyUsage(data.data.dailyUsage || [])
        setTopUsers(data.data.topUsers || [])
      } else {
        // フォールバック: モックデータ
        setStats({
          totalUsers: 156,
          activeUsers: 89,
          totalAnalyses: 1234,
          totalPeso: 567,
          matchingGrowth: 12.5,
          pesoGrowth: 8.3,
          userGrowth: 5.2,
        })
        setDailyUsage(generateMockDailyData(period))
        setTopUsers([
          {
            id: '1',
            email: 'tanaka@example.com',
            company: '株式会社タナカ',
            matchingCount: 45,
            pesoCount: 12,
            lastActive: '2024-01-15T10:00:00Z',
          },
          {
            id: '2',
            email: 'suzuki@example.com',
            company: '鈴木商事',
            matchingCount: 38,
            pesoCount: 8,
            lastActive: '2024-01-15T09:30:00Z',
          },
          {
            id: '3',
            email: 'yamada@example.com',
            company: '山田製作所',
            matchingCount: 32,
            pesoCount: 15,
            lastActive: '2024-01-14T16:00:00Z',
          },
          {
            id: '4',
            email: 'sato@example.com',
            company: '佐藤興業',
            matchingCount: 28,
            pesoCount: 6,
            lastActive: '2024-01-14T14:00:00Z',
          },
          {
            id: '5',
            email: 'ito@example.com',
            company: '伊藤建設',
            matchingCount: 25,
            pesoCount: 10,
            lastActive: '2024-01-13T11:00:00Z',
          },
        ])
      }
    } catch (error) {
      console.error('Failed to fetch usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchData()
    setIsRefreshing(false)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    })
  }

  const maxValue = Math.max(...dailyUsage.map((d) => d.matching + d.peso + d.catalog), 1)

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
              利用状況分析
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
              }}
            >
              機能別・ユーザー別の利用状況を分析
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
            {/* Stats Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <StatCard
                icon={<Users style={{ width: 16, height: 16, color: '#7C3AED' }} />}
                iconBg="rgba(124, 58, 237, 0.1)"
                label="アクティブユーザー"
                value={`${stats?.activeUsers || 0} / ${stats?.totalUsers || 0}`}
                change={stats?.userGrowth}
              />
              <StatCard
                icon={<BarChart3 style={{ width: 16, height: 16, color: '#3B82F6' }} />}
                iconBg="rgba(59, 130, 246, 0.1)"
                label="マッチング分析"
                value={(stats?.totalAnalyses || 0).toLocaleString()}
                change={stats?.matchingGrowth}
              />
              <StatCard
                icon={<TrendingUp style={{ width: 16, height: 16, color: '#0D9488' }} />}
                iconBg="rgba(13, 148, 136, 0.1)"
                label="PESO診断"
                value={(stats?.totalPeso || 0).toLocaleString()}
                change={stats?.pesoGrowth}
              />
              <StatCard
                icon={<Calendar style={{ width: 16, height: 16, color: '#F59E0B' }} />}
                iconBg="rgba(245, 158, 11, 0.1)"
                label="期間"
                value={period === '7d' ? '7日間' : period === '30d' ? '30日間' : '90日間'}
              />
            </div>

            {/* Chart and Top Users */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '24px',
              }}
            >
              {/* Usage Chart */}
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
                  日別利用推移
                </h3>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <LegendItem color="#3B82F6" label="マッチング" />
                  <LegendItem color="#0D9488" label="PESO" />
                  <LegendItem color="#F59E0B" label="カタログ" />
                </div>

                <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                  {dailyUsage.map((day, idx) => (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <div
                          style={{
                            height: `${(day.catalog / maxValue) * 200}px`,
                            background: '#F59E0B',
                            borderRadius: '2px 2px 0 0',
                          }}
                        />
                        <div
                          style={{
                            height: `${(day.peso / maxValue) * 200}px`,
                            background: '#0D9488',
                          }}
                        />
                        <div
                          style={{
                            height: `${(day.matching / maxValue) * 200}px`,
                            background: '#3B82F6',
                            borderRadius: '0 0 2px 2px',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#A1A1AA',
                          transform: 'rotate(-45deg)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(day.date)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Users */}
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
                  利用ランキング
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {topUsers.map((user, idx) => (
                    <div
                      key={user.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: '#FAFAFA',
                        borderRadius: '6px',
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: idx < 3 ? '#7C3AED' : '#E4E4E7',
                          color: idx < 3 ? '#FFFFFF' : '#71717A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
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
                          {user.company}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#A1A1AA',
                          }}
                        >
                          {user.email}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                          {user.matchingCount + user.pesoCount}回
                        </div>
                        <div style={{ fontSize: '10px', color: '#A1A1AA' }}>
                          M:{user.matchingCount} P:{user.pesoCount}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
  change,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  change?: number
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '20px', fontWeight: 600, color: '#18181B' }}>{value}</span>
        {change !== undefined && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '12px',
              color: change >= 0 ? '#0D9488' : '#EF4444',
            }}
          >
            {change >= 0 ? (
              <ArrowUpRight style={{ width: 12, height: 12 }} />
            ) : (
              <ArrowDownRight style={{ width: 12, height: 12 }} />
            )}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '2px',
          background: color,
        }}
      />
      <span style={{ fontSize: '12px', color: '#71717A' }}>{label}</span>
    </div>
  )
}

function generateMockDailyData(period: string): DailyUsage[] {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const data: DailyUsage[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    data.push({
      date: date.toISOString().split('T')[0],
      matching: Math.floor(Math.random() * 50) + 10,
      peso: Math.floor(Math.random() * 30) + 5,
      catalog: Math.floor(Math.random() * 100) + 20,
    })
  }

  return data
}
