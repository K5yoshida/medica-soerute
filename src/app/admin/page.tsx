'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  CreditCard,
  Database,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

/**
 * SC-901: 管理画面ダッシュボード
 *
 * KPIサマリー、最近のアクティビティ、クイックアクション
 */

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  paidUsers: number
  mrr: number
  totalMedia: number
  totalKeywords: number
  recentLogins: Array<{
    id: string
    email: string
    loginAt: string
  }>
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [_loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // モックデータ（API実装前）
  const mockStats: DashboardStats = {
    totalUsers: 156,
    activeUsers: 42,
    paidUsers: 28,
    mrr: 548000,
    totalMedia: 15,
    totalKeywords: 12450,
    recentLogins: [
      { id: '1', email: 'tanaka@example.com', loginAt: '2分前' },
      { id: '2', email: 'suzuki@example.com', loginAt: '15分前' },
      { id: '3', email: 'yamada@example.com', loginAt: '1時間前' },
    ],
  }

  const displayStats = stats || mockStats

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
        <h1
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#18181B',
            letterSpacing: '-0.01em',
            margin: 0,
          }}
        >
          管理ダッシュボード
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#A1A1AA',
            marginTop: '2px',
            fontWeight: 400,
          }}
        >
          システム全体の状況を確認
        </p>
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {/* KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <KPICard
            icon={<Users className="h-5 w-5" />}
            iconBg="#EDE9FE"
            iconColor="#7C3AED"
            label="総ユーザー数"
            value={displayStats.totalUsers}
            suffix="人"
            change={+12}
          />
          <KPICard
            icon={<Activity className="h-5 w-5" />}
            iconBg="#DBEAFE"
            iconColor="#3B82F6"
            label="アクティブユーザー"
            value={displayStats.activeUsers}
            suffix="人"
            subLabel="今週"
          />
          <KPICard
            icon={<CreditCard className="h-5 w-5" />}
            iconBg="#D1FAE5"
            iconColor="#10B981"
            label="有料ユーザー"
            value={displayStats.paidUsers}
            suffix="人"
            change={+3}
          />
          <KPICard
            icon={<TrendingUp className="h-5 w-5" />}
            iconBg="#FEF3C7"
            iconColor="#F59E0B"
            label="MRR"
            value={`¥${displayStats.mrr.toLocaleString()}`}
            change={+8.5}
            changeType="percent"
          />
        </div>

        {/* Second row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <KPICard
            icon={<Database className="h-5 w-5" />}
            iconBg="#E0E7FF"
            iconColor="#6366F1"
            label="登録媒体数"
            value={displayStats.totalMedia}
            suffix="媒体"
          />
          <KPICard
            icon={<Database className="h-5 w-5" />}
            iconBg="#FCE7F3"
            iconColor="#EC4899"
            label="総キーワード数"
            value={displayStats.totalKeywords.toLocaleString()}
            suffix="件"
          />
        </div>

        {/* Quick Actions & Recent Activity */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
          }}
        >
          {/* Quick Actions */}
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
                クイックアクション
              </span>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <QuickActionLink
                  href="/admin/users"
                  label="新規ユーザーを招待"
                  description="メールで招待を送信"
                />
                <QuickActionLink
                  href="/admin/import"
                  label="CSVインポート"
                  description="キーワードデータを更新"
                />
                <QuickActionLink
                  href="/admin/media"
                  label="媒体を追加"
                  description="新しい媒体を登録"
                />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
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
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                最近のログイン
              </span>
              <Link
                href="/admin/logs"
                style={{
                  fontSize: '12px',
                  color: '#7C3AED',
                  textDecoration: 'none',
                }}
              >
                すべて見る
              </Link>
            </div>
            <div style={{ padding: '8px 16px' }}>
              {displayStats.recentLogins.map((login) => (
                <div
                  key={login.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: '1px solid #F4F4F5',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#EDE9FE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#7C3AED',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      {login.email.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '13px', color: '#18181B' }}>{login.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#A1A1AA' }}>
                    <Clock className="h-3 w-3" />
                    <span style={{ fontSize: '12px' }}>{login.loginAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function KPICard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  suffix,
  subLabel,
  change,
  changeType = 'number',
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: string | number
  suffix?: string
  subLabel?: string
  change?: number
  changeType?: 'number' | 'percent'
}) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0

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
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#A1A1AA' }}>{label}</div>
          {subLabel && <div style={{ fontSize: '11px', color: '#D4D4D8' }}>{subLabel}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '28px', fontWeight: 600, color: '#18181B' }}>{value}</span>
        {suffix && <span style={{ fontSize: '14px', color: '#A1A1AA' }}>{suffix}</span>}
      </div>
      {change !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
            fontSize: '12px',
            color: isPositive ? '#10B981' : isNegative ? '#EF4444' : '#A1A1AA',
          }}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : isNegative ? (
            <TrendingDown className="h-3 w-3" />
          ) : null}
          <span>
            {isPositive ? '+' : ''}
            {change}
            {changeType === 'percent' ? '%' : ''} vs 先月
          </span>
        </div>
      )}
    </div>
  )
}

function QuickActionLink({
  href,
  label,
  description,
}: {
  href: string
  label: string
  description: string
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#FAFAFA',
        borderRadius: '8px',
        textDecoration: 'none',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#F4F4F5'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#FAFAFA'
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>{label}</div>
        <div style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '2px' }}>{description}</div>
      </div>
      <ArrowRight className="h-4 w-4" style={{ color: '#A1A1AA' }} />
    </Link>
  )
}
