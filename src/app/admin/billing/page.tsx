'use client'

import { useEffect, useState } from 'react'
import {
  CreditCard,
  TrendingUp,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
} from 'lucide-react'

/**
 * SC-906: 課金ダッシュボード画面
 *
 * Design spec: 09_画面一覧.md - SC-906
 *
 * Features:
 * - MRR/ARR表示
 * - プラン別収益内訳
 * - 課金履歴一覧
 * - トレンドグラフ（簡易表示）
 */

interface BillingStats {
  mrr: number
  arr: number
  mrrChange: number
  paidUsers: number
  paidUsersChange: number
  avgRevenue: number
  avgRevenueChange: number
  churnRate: number
  churnRateChange: number
}

interface PlanBreakdown {
  plan: string
  users: number
  revenue: number
  percentage: number
  color: string
}

interface Transaction {
  id: string
  userId: string
  userName: string
  email: string
  plan: string
  amount: number
  type: 'subscription' | 'upgrade' | 'downgrade' | 'refund' | 'cancellation'
  status: 'completed' | 'pending' | 'failed'
  createdAt: string
}

export default function AdminBillingPage() {
  const [stats, setStats] = useState<BillingStats | null>(null)
  const [planBreakdown, setPlanBreakdown] = useState<PlanBreakdown[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30d')

  useEffect(() => {
    fetchBillingData()
  }, [currentPage, typeFilter, dateRange])

  const fetchBillingData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/billing/dashboard')
      const data = await res.json()

      if (data.success && data.data) {
        const apiData = data.data
        const totalPaidUsers = apiData.active_subscriptions

        // プラン別の料金設定
        const planPrices: Record<string, number> = {
          starter: 9800,
          professional: 29800,
          enterprise: 50000,
        }

        // 平均単価を計算
        const avgRevenue = totalPaidUsers > 0 ? Math.round(apiData.mrr / totalPaidUsers) : 0

        setStats({
          mrr: apiData.mrr,
          arr: apiData.arr,
          mrrChange: apiData.user_growth.growth_rate,
          paidUsers: totalPaidUsers,
          paidUsersChange: apiData.user_growth.growth_rate,
          avgRevenue: avgRevenue,
          avgRevenueChange: 0,
          churnRate: apiData.churn_rate,
          churnRateChange: 0,
        })

        // プラン別内訳を計算
        const planData = apiData.plan_breakdown
        const totalMrr = apiData.mrr || 1
        const breakdown: PlanBreakdown[] = []

        if (planData.starter > 0) {
          const revenue = planData.starter * planPrices.starter
          breakdown.push({
            plan: 'Starter',
            users: planData.starter,
            revenue,
            percentage: Math.round((revenue / totalMrr) * 100),
            color: '#0D9488',
          })
        }
        if (planData.professional > 0) {
          const revenue = planData.professional * planPrices.professional
          breakdown.push({
            plan: 'Professional',
            users: planData.professional,
            revenue,
            percentage: Math.round((revenue / totalMrr) * 100),
            color: '#7C3AED',
          })
        }
        if (planData.enterprise > 0) {
          const revenue = planData.enterprise * planPrices.enterprise
          breakdown.push({
            plan: 'Enterprise',
            users: planData.enterprise,
            revenue,
            percentage: Math.round((revenue / totalMrr) * 100),
            color: '#F59E0B',
          })
        }

        setPlanBreakdown(breakdown)

        // 取引履歴はStripe連携後に実装（現在は空配列）
        setTransactions([])
        setTotalPages(1)
      } else {
        console.error('Failed to fetch billing data:', data.error?.message)
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTypeLabel = (type: Transaction['type']) => {
    const labels = {
      subscription: '新規契約',
      upgrade: 'アップグレード',
      downgrade: 'ダウングレード',
      refund: '返金',
      cancellation: '解約',
    }
    return labels[type]
  }

  const getTypeColor = (type: Transaction['type']) => {
    const colors = {
      subscription: { bg: 'rgba(13, 148, 136, 0.1)', text: '#0D9488' },
      upgrade: { bg: 'rgba(124, 58, 237, 0.1)', text: '#7C3AED' },
      downgrade: { bg: 'rgba(245, 158, 11, 0.1)', text: '#D97706' },
      refund: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' },
      cancellation: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6B7280' },
    }
    return colors[type]
  }

  const getStatusBadge = (status: Transaction['status']) => {
    const styles = {
      completed: { bg: 'rgba(13, 148, 136, 0.1)', text: '#0D9488', label: '完了' },
      pending: { bg: 'rgba(245, 158, 11, 0.1)', text: '#D97706', label: '処理中' },
      failed: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444', label: '失敗' },
    }
    return styles[status]
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
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              課金ダッシュボード
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
                fontWeight: 400,
              }}
            >
              売上・課金状況の分析
            </p>
          </div>

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
            レポート出力
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {/* Date Range Filter */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
          {[
            { value: '7d', label: '7日間' },
            { value: '30d', label: '30日間' },
            { value: '90d', label: '90日間' },
            { value: '1y', label: '1年間' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: dateRange === option.value ? '1px solid #7C3AED' : '1px solid #E4E4E7',
                background: dateRange === option.value ? 'rgba(124, 58, 237, 0.1)' : '#FFFFFF',
                color: dateRange === option.value ? '#7C3AED' : '#71717A',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* KPI Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <KPICard
            icon={<DollarSign style={{ width: 16, height: 16, color: '#7C3AED' }} />}
            iconBg="rgba(124, 58, 237, 0.1)"
            label="MRR"
            value={stats ? formatCurrency(stats.mrr) : '-'}
            change={stats?.mrrChange}
          />
          <KPICard
            icon={<TrendingUp style={{ width: 16, height: 16, color: '#0D9488' }} />}
            iconBg="rgba(13, 148, 136, 0.1)"
            label="ARR"
            value={stats ? formatCurrency(stats.arr) : '-'}
            subtext="年間換算"
          />
          <KPICard
            icon={<Users style={{ width: 16, height: 16, color: '#F59E0B' }} />}
            iconBg="rgba(245, 158, 11, 0.1)"
            label="有料ユーザー"
            value={stats ? `${stats.paidUsers}名` : '-'}
            change={stats?.paidUsersChange}
          />
          <KPICard
            icon={<CreditCard style={{ width: 16, height: 16, color: '#3B82F6' }} />}
            iconBg="rgba(59, 130, 246, 0.1)"
            label="平均単価"
            value={stats ? formatCurrency(stats.avgRevenue) : '-'}
            change={stats?.avgRevenueChange}
          />
        </div>

        {/* Plan Breakdown & Revenue Trend */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Plan Breakdown */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E4E4E7',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                プラン別収益内訳
              </span>
            </div>

            <div style={{ padding: '20px' }}>
              {planBreakdown.map((plan) => (
                <div
                  key={plan.plan}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: plan.color,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>
                        {plan.plan}
                      </span>
                      <span style={{ fontSize: '13px', color: '#71717A' }}>
                        {plan.users}名 ({plan.percentage}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: '#F4F4F5',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${plan.percentage}%`,
                          background: plan.color,
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#A1A1AA',
                        marginTop: '4px',
                      }}
                    >
                      {formatCurrency(plan.revenue)}
                    </div>
                  </div>
                </div>
              ))}

              <div
                style={{
                  borderTop: '1px solid #E4E4E7',
                  paddingTop: '16px',
                  marginTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>合計</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                  {formatCurrency(planBreakdown.reduce((sum, p) => sum + p.revenue, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E4E4E7',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                主要指標
              </span>
            </div>

            <div style={{ padding: '20px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}
              >
                <MetricCard
                  label="解約率"
                  value={stats ? `${stats.churnRate}%` : '-'}
                  change={stats?.churnRateChange}
                  isNegativeGood
                />
                <MetricCard
                  label="LTV"
                  value={stats ? formatCurrency(stats.avgRevenue * 24) : '-'}
                  subtext="24ヶ月換算"
                />
                <MetricCard
                  label="新規MRR"
                  value={formatCurrency(178200)}
                  subtext="今月"
                />
                <MetricCard
                  label="アップグレード"
                  value="12件"
                  change={15}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E4E4E7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
              課金履歴
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter style={{ width: 14, height: 14, color: '#A1A1AA' }} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E4E4E7',
                  fontSize: '13px',
                  color: '#18181B',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <option value="all">すべて</option>
                <option value="subscription">新規契約</option>
                <option value="upgrade">アップグレード</option>
                <option value="downgrade">ダウングレード</option>
                <option value="refund">返金</option>
                <option value="cancellation">解約</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E4E4E7' }}>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                    }}
                  >
                    ユーザー
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                    }}
                  >
                    プラン
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                    }}
                  >
                    タイプ
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                    }}
                  >
                    金額
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                    }}
                  >
                    ステータス
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                    }}
                  >
                    日時
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center' }}>
                      <div style={{ color: '#A1A1AA', fontSize: '13px' }}>読み込み中...</div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center' }}>
                      <div style={{ color: '#A1A1AA', fontSize: '13px' }}>
                        取引履歴がありません
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const typeStyle = getTypeColor(tx.type)
                    const statusStyle = getStatusBadge(tx.status)

                    return (
                      <tr
                        key={tx.id}
                        style={{
                          borderBottom: '1px solid #F4F4F5',
                        }}
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>
                            {tx.userName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#A1A1AA' }}>{tx.email}</div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              fontSize: '13px',
                              color: '#18181B',
                            }}
                          >
                            {tx.plan}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: typeStyle.bg,
                              color: typeStyle.text,
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {getTypeLabel(tx.type)}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '16px 20px',
                            textAlign: 'right',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: tx.amount < 0 ? '#EF4444' : '#18181B',
                          }}
                        >
                          {tx.amount === 0 ? '-' : formatCurrency(tx.amount)}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: statusStyle.bg,
                              color: statusStyle.text,
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {statusStyle.label}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '16px 20px',
                            textAlign: 'right',
                            fontSize: '12px',
                            color: '#71717A',
                          }}
                        >
                          {formatDate(tx.createdAt)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #E4E4E7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '13px', color: '#71717A' }}>
                {totalPages}ページ中 {currentPage}ページ目
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E4E4E7',
                    background: '#FFFFFF',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  <ChevronLeft style={{ width: 16, height: 16, color: '#71717A' }} />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E4E4E7',
                    background: '#FFFFFF',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  <ChevronRight style={{ width: 16, height: 16, color: '#71717A' }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function KPICard({
  icon,
  iconBg,
  label,
  value,
  change,
  subtext,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  change?: number
  subtext?: string
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '8px',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '8px',
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
      <div style={{ fontSize: '24px', fontWeight: 600, color: '#18181B' }}>{value}</div>
      {change !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '4px',
            fontSize: '12px',
            color: change >= 0 ? '#0D9488' : '#EF4444',
          }}
        >
          {change >= 0 ? (
            <ArrowUpRight style={{ width: 12, height: 12 }} />
          ) : (
            <ArrowDownRight style={{ width: 12, height: 12 }} />
          )}
          {change >= 0 ? '+' : ''}
          {change}% vs 先月
        </div>
      )}
      {subtext && (
        <div style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '4px' }}>{subtext}</div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  change,
  subtext,
  isNegativeGood = false,
}: {
  label: string
  value: string
  change?: number
  subtext?: string
  isNegativeGood?: boolean
}) {
  const isPositive = isNegativeGood ? (change ?? 0) < 0 : (change ?? 0) >= 0

  return (
    <div
      style={{
        padding: '16px',
        background: '#FAFAFA',
        borderRadius: '8px',
      }}
    >
      <div style={{ fontSize: '12px', color: '#71717A', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 600, color: '#18181B' }}>{value}</div>
      {change !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '4px',
            fontSize: '11px',
            color: isPositive ? '#0D9488' : '#EF4444',
          }}
        >
          {isPositive ? (
            <ArrowUpRight style={{ width: 10, height: 10 }} />
          ) : (
            <ArrowDownRight style={{ width: 10, height: 10 }} />
          )}
          {change >= 0 ? '+' : ''}
          {change}%
        </div>
      )}
      {subtext && (
        <div style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '2px' }}>{subtext}</div>
      )}
    </div>
  )
}
