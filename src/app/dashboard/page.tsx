import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Grid2X2, Star, FileText, ChevronRight, Clock } from 'lucide-react'

/**
 * Dashboard Home Page
 *
 * Design spec: 03_ブランディングとデザインガイド.md
 *
 * Header:
 * - bg: #FFFFFF
 * - border-bottom: 1px solid #E4E4E7
 * - padding: 16px 24px
 * - title: 15px, weight 600, color #18181B, letter-spacing -0.01em
 * - subtitle: 13px, color #A1A1AA, margin-top 2px
 *
 * Content:
 * - padding: 24px
 *
 * Stats grid: 4 columns, gap 16px
 * - card: bg white, border 1px solid #E4E4E7, radius 8px, padding 16px 20px
 * - label: 12px, color #A1A1AA
 * - value: 24px, weight 600, color #18181B (changed from 28px to match spec)
 * - change: 12px, color #0D9488
 *
 * Action cards: 3 columns, gap 16px
 * - padding: 20px
 * - icon container: 32x32, radius 6px
 * - title: 13px, weight 600
 * - desc: 12px, color #A1A1AA
 */

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser?.id)
    .single()

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
      {/* Header: bg white, border-bottom, padding 16px 24px, sticky */}
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
        {/* Title: 15px, weight 600, color #18181B, letter-spacing -0.01em */}
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
        {/* Subtitle: 13px, color #A1A1AA, margin-top 2px */}
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

      {/* Content: padding 24px */}
      <div style={{ padding: '24px' }}>
        {/* Stats grid: 4 columns, gap 16px, margin-bottom 24px */}
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
          {/* Card header: padding 16px 20px */}
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

          {/* Card body: padding 20px */}
          <div style={{ padding: '20px' }}>
            {/* Action cards grid: 3 columns, gap 16px */}
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

/**
 * Stat Card Component
 *
 * Style:
 * - bg: white, border: 1px solid #E4E4E7, radius: 8px
 * - padding: 16px 20px
 * - label: 12px, color #A1A1AA, margin-bottom 4px
 * - value: 24px, weight 600, color #18181B
 * - change: 12px, color #0D9488, margin-top 4px
 */
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

/**
 * Action Card Component
 *
 * Style:
 * - bg: white, border: 1px solid #E4E4E7, radius: 8px
 * - padding: 20px
 * - position: relative (for arrow)
 * - hover: border-color changes, shadow-sm
 * - icon container: 32x32, radius 6px
 * - title: 13px, weight 600, color #18181B
 * - desc: 12px, color #A1A1AA, line-height 1.5
 */
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
  return (
    <Link
      href={href}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '8px',
        padding: '20px',
        textDecoration: 'none',
        display: 'block',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = hoverBorder
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E4E4E7'
        e.currentTarget.style.boxShadow = 'none'
      }}
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

/**
 * History Item Component
 */
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
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#F4F4F5'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {/* Icon: 36x36, radius 8px */}
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

      {/* Content */}
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

      {/* Result */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', color: '#A1A1AA' }}>{item.result.label}</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
          {item.result.value}
        </div>
      </div>
    </Link>
  )
}
