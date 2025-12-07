'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Grid2X2, Star, FileText, ChevronRight, Clock, X, Sparkles } from 'lucide-react'

/**
 * Dashboard Home Page
 *
 * Design spec: 03_ブランディングとデザインガイド.md
 */

interface UserData {
  monthly_analysis_count: number
  role: 'admin' | 'internal' | 'user'
  plan: 'medica' | 'enterprise' | 'trial' | 'starter' | 'professional'
  upgrade_notified_at: string | null
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false)
  const [dismissingBanner, setDismissingBanner] = useState(false)

  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser(data.data)
          // 法人プランで通知未確認の場合にバナー表示
          const userData = data.data as UserData
          if (
            (userData.role === 'internal' || userData.role === 'admin') &&
            userData.upgrade_notified_at === null
          ) {
            setShowUpgradeBanner(true)
          }
        }
      })
      .catch(console.error)
  }, [])

  // 通知確認ハンドラー
  const handleDismissBanner = useCallback(async () => {
    setDismissingBanner(true)
    try {
      const res = await fetch('/api/user/notification/upgrade', { method: 'POST' })
      if (res.ok) {
        setShowUpgradeBanner(false)
      }
    } catch (error) {
      console.error('Failed to dismiss banner:', error)
    } finally {
      setDismissingBanner(false)
    }
  }, [])

  const recentAnalyses = [
    {
      id: '1',
      type: 'matching',
      title: '川崎市麻生区 × 訪問介護',
      time: '2時間前',
      result: { label: 'Best', value: 'Indeed' },
    },
    {
      id: '2',
      type: 'peso',
      title: '株式会社ケアサポート',
      time: '昨日',
      result: { label: 'Score', value: '68/100' },
    },
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
        <h1
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#18181B',
            letterSpacing: '-0.01em',
            margin: 0,
          }}
        >
          ホーム
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#A1A1AA',
            marginTop: '2px',
            fontWeight: 400,
          }}
        >
          分析を開始しましょう
        </p>
      </header>

      {/* Upgrade Notification Banner */}
      {showUpgradeBanner && (
        <div
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #0D9488 100%)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles style={{ width: 20, height: 20, color: '#FFFFFF' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', marginBottom: '2px' }}>
              法人プランにアップグレードされました
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)' }}>
              すべての機能が無制限でご利用いただけます。媒体分析・PESO診断など、ぜひご活用ください。
            </div>
          </div>
          <button
            onClick={handleDismissBanner}
            disabled={dismissingBanner}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 500,
              cursor: dismissingBanner ? 'not-allowed' : 'pointer',
              opacity: dismissingBanner ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!dismissingBanner) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.3)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
            }}
          >
            {dismissingBanner ? '確認中...' : '確認しました'}
            {!dismissingBanner && <X style={{ width: 14, height: 14 }} />}
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <StatCard
            label="今月の分析数"
            value={user?.monthly_analysis_count || 0}
            change="+23% vs 先月"
          />
          <StatCard label="保存済み成果物" value={0} />
          <StatCard label="フォルダ数" value={0} />
          <StatCard label="登録媒体数" value={15} />
        </div>

        {/* Action section card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: '8px',
            marginBottom: '24px',
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
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#18181B',
              }}
            >
              分析を始める
            </span>
          </div>

          <div style={{ padding: '20px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
              }}
            >
              <ActionCard
                href="/dashboard/catalog"
                icon={<Grid2X2 style={{ width: 16, height: 16, color: '#0D9488' }} />}
                iconBg="#F0FDFA"
                hoverBorder="#0D9488"
                title="媒体カタログ"
                description="媒体の獲得キーワード・流入経路を確認"
              />
              <ActionCard
                href="/dashboard/matching"
                icon={<Star style={{ width: 16, height: 16, color: '#D97706' }} />}
                iconBg="rgba(245,158,11,0.1)"
                hoverBorder="#F59E0B"
                title="媒体マッチング"
                description="求人に最適な媒体をAIが提案"
              />
              <ActionCard
                href="/dashboard/peso"
                icon={<FileText style={{ width: 16, height: 16, color: '#7C3AED' }} />}
                iconBg="rgba(139,92,246,0.1)"
                hoverBorder="#8B5CF6"
                title="PESO診断"
                description="採用メディア戦略の現状を可視化"
              />
            </div>
          </div>
        </div>

        {/* Recent analyses card */}
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
              最近の分析
            </span>
            <Link
              href="/dashboard/history"
              style={{
                fontSize: '13px',
                color: '#0D9488',
                textDecoration: 'none',
              }}
            >
              すべて見る
            </Link>
          </div>

          <div style={{ padding: '20px' }}>
            {recentAnalyses.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentAnalyses.map((item) => (
                  <HistoryItem key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#A1A1AA' }}>
                <Clock
                  style={{
                    width: 32,
                    height: 32,
                    margin: '0 auto 8px',
                    opacity: 0.5,
                  }}
                />
                <p style={{ fontSize: '13px' }}>まだ履歴がありません</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>
                  媒体マッチングやPESO診断を実行すると、ここに履歴が表示されます
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({
  label,
  value,
  change,
}: {
  label: string
  value: number | string
  change?: string
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
      <div style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '4px' }}>{label}</div>
      <div
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#18181B',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {change && (
        <div style={{ fontSize: '12px', color: '#0D9488', marginTop: '4px' }}>{change}</div>
      )}
    </div>
  )
}

function ActionCard({
  href,
  icon,
  iconBg,
  hoverBorder,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  iconBg: string
  hoverBorder: string
  title: string
  description: string
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      href={href}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: `1px solid ${isHovered ? hoverBorder : '#E4E4E7'}`,
        borderRadius: '8px',
        padding: '20px',
        textDecoration: 'none',
        display: 'block',
        transition: 'all 0.15s ease',
        boxShadow: isHovered ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: iconBg,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>{title}</span>
      </div>
      <p style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: 1.5, margin: 0 }}>
        {description}
      </p>
      <ChevronRight
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 16,
          height: 16,
          color: '#A1A1AA',
        }}
      />
    </Link>
  )
}

function HistoryItem({
  item,
}: {
  item: {
    id: string
    type: string
    title: string
    time: string
    result: { label: string; value: string }
  }
}) {
  const [isHovered, setIsHovered] = useState(false)
  const isMatching = item.type === 'matching'
  const bgColor = isMatching ? 'rgba(245,158,11,0.1)' : 'rgba(139,92,246,0.1)'
  const iconColor = isMatching ? '#D97706' : '#7C3AED'

  return (
    <Link
      href={`/dashboard/history/${item.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px',
        borderRadius: '8px',
        textDecoration: 'none',
        transition: 'background 0.1s ease',
        background: isHovered ? '#F4F4F5' : 'transparent',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '8px',
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isMatching ? (
          <Star style={{ width: 16, height: 16, color: iconColor }} />
        ) : (
          <FileText style={{ width: 16, height: 16, color: iconColor }} />
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>{item.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 500,
              background: bgColor,
              color: iconColor,
            }}
          >
            {isMatching ? 'マッチング' : 'PESO'}
          </span>
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: '#D4D4D8',
            }}
          />
          <span style={{ fontSize: '12px', color: '#A1A1AA' }}>{item.time}</span>
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', color: '#A1A1AA' }}>{item.result.label}</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
          {item.result.value}
        </div>
      </div>
    </Link>
  )
}
