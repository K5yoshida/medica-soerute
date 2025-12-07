'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  BarChart2,
  Search,
  Globe,
  ExternalLink,
} from 'lucide-react'

/**
 * 媒体比較モーダル
 *
 * カタログページで選択した媒体を比較表示するモーダル
 * - 基本情報比較
 * - トレンド推移（SimilarWebデータ）
 * - キーワード比較
 */

// =====================================
// 型定義
// =====================================

interface MediaMaster {
  id: string
  name: string
  domain: string | null
  monthly_visits: number | null
  bounce_rate: number | null
  pages_per_visit: number | null
  avg_visit_duration: number | null
  keyword_count: number
  total_search_volume: number | null
  total_estimated_traffic: number | null
  latest_traffic: TrafficData | null
}

interface TrafficData {
  search_pct: number | null
  direct_pct: number | null
  referral_pct: number | null
  display_pct: number | null
  email_pct: number | null
  social_pct: number | null
}

interface TrafficTrend {
  period: string
  monthly_visits: number | null
  search_pct: number | null
  bounce_rate: number | null
  pages_per_visit: number | null
  avg_visit_duration: number | null
}

interface KeywordData {
  keyword: string
  intent: string | null
  rank: number | null
  search_volume: number | null
  estimated_traffic: number | null
}

interface ComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  selectedMedia: MediaMaster[]
}

// =====================================
// 定数
// =====================================

const MEDIA_COLORS = [
  { bg: '#0D9488', light: '#CCFBF1' },
  { bg: '#7C3AED', light: '#EDE9FE' },
  { bg: '#EA580C', light: '#FFEDD5' },
  { bg: '#2563EB', light: '#DBEAFE' },
  { bg: '#DB2777', light: '#FCE7F3' },
]

// =====================================
// ユーティリティ関数
// =====================================

function formatNumber(num: number | null): string {
  if (num === null) return '-'
  return num.toLocaleString('ja-JP')
}

function formatCompact(num: number | null): string {
  if (num === null) return '-'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString('ja-JP')
}

function formatPercent(num: number | null): string {
  if (num === null) return '-'
  return `${num.toFixed(1)}%`
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getTrendIcon(current: number | null, previous: number | null, inverse = false) {
  if (current === null || previous === null) return null
  const diff = current - previous
  const isPositive = inverse ? diff < 0 : diff > 0

  if (Math.abs(diff) < 0.5) {
    return <Minus className="w-3.5 h-3.5 text-zinc-400" />
  }
  if (isPositive) {
    return <TrendingUp className="w-3.5 h-3.5 text-green-500" />
  }
  return <TrendingDown className="w-3.5 h-3.5 text-red-500" />
}

// =====================================
// メインコンポーネント
// =====================================

export function ComparisonModal({ isOpen, onClose, selectedMedia }: ComparisonModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'trends' | 'keywords'>('basic')
  const [trafficTrends, setTrafficTrends] = useState<Record<string, TrafficTrend[]>>({})
  const [keywordData, setKeywordData] = useState<Record<string, KeywordData[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [periods, setPeriods] = useState<string[]>([])

  // トレンドデータ取得
  const fetchTrends = useCallback(async () => {
    if (selectedMedia.length === 0) return

    setIsLoading(true)
    try {
      const mediaIds = selectedMedia.map((m) => m.id).join(',')

      // トラフィックトレンド取得
      const trafficRes = await fetch(`/api/admin/trends/traffic?media_ids=${mediaIds}&period=6months`)
      const trafficData = await trafficRes.json()

      if (trafficData.success && trafficData.data) {
        const newTrends: Record<string, TrafficTrend[]> = {}
        trafficData.data.media.forEach(
          (media: { media_id: string; trends: TrafficTrend[] }) => {
            newTrends[media.media_id] = media.trends
          }
        )
        setTrafficTrends(newTrends)
        if (trafficData.data.periods) {
          setPeriods(trafficData.data.periods)
        }
      }

      // キーワードデータ取得
      const keywordsRes = await fetch(`/api/admin/trends/keywords?media_ids=${mediaIds}&limit=20`)
      const keywordsData = await keywordsRes.json()

      if (keywordsData.success && keywordsData.data) {
        const newKeywords: Record<string, KeywordData[]> = {}
        Object.entries(keywordsData.data.keywords).forEach(([mediaId, keywords]) => {
          newKeywords[mediaId] = (keywords as Array<{
            keyword: string
            intent: string | null
            rank: number | null
            search_volume: number | null
            estimated_traffic: number | null
          }>).map((kw) => ({
            keyword: kw.keyword,
            intent: kw.intent,
            rank: kw.rank,
            search_volume: kw.search_volume,
            estimated_traffic: kw.estimated_traffic,
          }))
        })
        setKeywordData(newKeywords)
      }
    } catch (error) {
      console.error('Failed to fetch trends:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedMedia])

  useEffect(() => {
    if (isOpen && selectedMedia.length > 0) {
      fetchTrends()
    }
  }, [isOpen, fetchTrends, selectedMedia.length])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* オーバーレイ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
        }}
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div
        style={{
          position: 'relative',
          background: '#FFFFFF',
          borderRadius: '12px',
          width: '95%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #E4E4E7',
          }}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#18181B', margin: 0 }}>
              媒体比較
            </h2>
            <p style={{ fontSize: '13px', color: '#A1A1AA', marginTop: '2px' }}>
              {selectedMedia.length}媒体を比較中
            </p>
          </div>

          {/* 選択中の媒体タグ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedMedia.map((media, index) => {
              const color = MEDIA_COLORS[index % MEDIA_COLORS.length]
              return (
                <div
                  key={media.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '16px',
                    background: color.light,
                    border: `1px solid ${color.bg}`,
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: color.bg,
                    }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: color.bg }}>
                    {media.name}
                  </span>
                </div>
              )
            })}
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            <X style={{ width: 20, height: 20, color: '#A1A1AA' }} />
          </button>
        </div>

        {/* タブ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '12px 24px',
            background: '#FAFAFA',
            borderBottom: '1px solid #E4E4E7',
          }}
        >
          <TabButton
            active={activeTab === 'basic'}
            onClick={() => setActiveTab('basic')}
            icon={<BarChart2 className="w-4 h-4" />}
            label="基本情報"
          />
          <TabButton
            active={activeTab === 'trends'}
            onClick={() => setActiveTab('trends')}
            icon={<TrendingUp className="w-4 h-4" />}
            label="トレンド推移"
          />
          <TabButton
            active={activeTab === 'keywords'}
            onClick={() => setActiveTab('keywords')}
            icon={<Search className="w-4 h-4" />}
            label="キーワード比較"
          />
        </div>

        {/* コンテンツ */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {isLoading && activeTab !== 'basic' ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px',
              }}
            >
              <Loader2
                style={{ width: 24, height: 24, color: '#0D9488', animation: 'spin 1s linear infinite' }}
              />
              <span style={{ marginLeft: '8px', fontSize: '13px', color: '#52525B' }}>
                データを読み込み中...
              </span>
            </div>
          ) : activeTab === 'basic' ? (
            <BasicComparison media={selectedMedia} />
          ) : activeTab === 'trends' ? (
            <TrendsComparison
              media={selectedMedia}
              trafficTrends={trafficTrends}
              periods={periods}
            />
          ) : (
            <KeywordsComparison media={selectedMedia} keywordData={keywordData} />
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================
// タブボタン
// =====================================

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        borderRadius: '6px',
        border: 'none',
        background: active ? '#FFFFFF' : 'transparent',
        color: active ? '#18181B' : '#71717A',
        fontSize: '13px',
        fontWeight: active ? 500 : 400,
        cursor: 'pointer',
        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// =====================================
// 基本情報比較タブ
// =====================================

function BasicComparison({ media }: { media: MediaMaster[] }) {
  const metrics = [
    { key: 'monthly_visits', label: '月間訪問数', format: formatCompact },
    { key: 'bounce_rate', label: '直帰率', format: (v: number | null) => formatPercent(v), inverse: true },
    { key: 'pages_per_visit', label: 'PV/訪問', format: (v: number | null) => v?.toFixed(1) || '-' },
    { key: 'avg_visit_duration', label: '滞在時間', format: formatDuration },
    { key: 'keyword_count', label: 'クエリ数', format: formatNumber },
    { key: 'total_search_volume', label: '月間Vol合計', format: formatCompact },
    { key: 'total_estimated_traffic', label: '推定流入', format: formatCompact },
  ]

  const trafficSources = [
    { key: 'search_pct', label: '検索', color: '#0EA5E9' },
    { key: 'direct_pct', label: '直接', color: '#3B82F6' },
    { key: 'referral_pct', label: '参照', color: '#F43F5E' },
    { key: 'display_pct', label: '広告', color: '#F59E0B' },
    { key: 'social_pct', label: 'SNS', color: '#10B981' },
  ]

  // 各指標の最大値を計算（バー表示用）
  const getMaxValue = (key: string) => {
    const values = media.map((m) => {
      const value = m[key as keyof MediaMaster]
      return typeof value === 'number' ? value : 0
    })
    return Math.max(...values, 1)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 媒体ヘッダー */}
      <div style={{ display: 'grid', gridTemplateColumns: `180px repeat(${media.length}, 1fr)`, gap: '16px' }}>
        <div />
        {media.map((m, index) => {
          const color = MEDIA_COLORS[index % MEDIA_COLORS.length]
          return (
            <div
              key={m.id}
              style={{
                padding: '16px',
                background: color.light,
                borderRadius: '8px',
                border: `1px solid ${color.bg}20`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: color.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  {m.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>{m.name}</div>
                  {m.domain && (
                    <a
                      href={`https://${m.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#71717A',
                        textDecoration: 'none',
                      }}
                    >
                      <Globe className="w-3 h-3" />
                      {m.domain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 主要指標 */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E4E4E7',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            background: '#FAFAFA',
            borderBottom: '1px solid #E4E4E7',
          }}
        >
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#18181B', margin: 0 }}>主要指標</h3>
        </div>
        <div style={{ padding: '16px' }}>
          {metrics.map((metric, idx) => {
            const maxValue = getMaxValue(metric.key)
            return (
              <div
                key={metric.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `180px repeat(${media.length}, 1fr)`,
                  gap: '16px',
                  padding: '12px 0',
                  borderBottom: idx < metrics.length - 1 ? '1px solid #F4F4F5' : 'none',
                }}
              >
                <div style={{ fontSize: '13px', color: '#52525B', fontWeight: 500 }}>{metric.label}</div>
                {media.map((m, index) => {
                  const value = m[metric.key as keyof MediaMaster]
                  const numValue = typeof value === 'number' ? value : 0
                  const barWidth = (numValue / maxValue) * 100
                  const color = MEDIA_COLORS[index % MEDIA_COLORS.length]

                  return (
                    <div key={m.id}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#18181B', marginBottom: '4px' }}>
                        {metric.format(typeof value === 'number' ? value : null)}
                      </div>
                      <div
                        style={{
                          height: '4px',
                          background: '#F4F4F5',
                          borderRadius: '2px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${barWidth}%`,
                            height: '100%',
                            background: color.bg,
                            borderRadius: '2px',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* 流入経路 */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E4E4E7',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            background: '#FAFAFA',
            borderBottom: '1px solid #E4E4E7',
          }}
        >
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#18181B', margin: 0 }}>流入経路</h3>
        </div>
        <div style={{ padding: '16px' }}>
          {trafficSources.map((source, idx) => (
            <div
              key={source.key}
              style={{
                display: 'grid',
                gridTemplateColumns: `180px repeat(${media.length}, 1fr)`,
                gap: '16px',
                padding: '12px 0',
                borderBottom: idx < trafficSources.length - 1 ? '1px solid #F4F4F5' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: source.color,
                  }}
                />
                <span style={{ fontSize: '13px', color: '#52525B', fontWeight: 500 }}>{source.label}</span>
              </div>
              {media.map((m) => {
                const traffic = m.latest_traffic
                const value = traffic ? traffic[source.key as keyof TrafficData] : null
                return (
                  <div key={m.id} style={{ fontSize: '14px', fontWeight: 500, color: source.color }}>
                    {formatPercent(value)}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// =====================================
// トレンド推移タブ
// =====================================

function TrendsComparison({
  media,
  trafficTrends,
  periods,
}: {
  media: MediaMaster[]
  trafficTrends: Record<string, TrafficTrend[]>
  periods: string[]
}) {
  if (periods.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#A1A1AA' }}>
        トレンドデータがありません
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 月間訪問数推移 */}
      <TrendTable
        title="月間訪問数推移"
        media={media}
        trafficTrends={trafficTrends}
        periods={periods}
        valueKey="monthly_visits"
        formatFn={formatCompact}
      />

      {/* 検索流入比率推移 */}
      <TrendTable
        title="検索流入比率推移"
        media={media}
        trafficTrends={trafficTrends}
        periods={periods}
        valueKey="search_pct"
        formatFn={formatPercent}
      />

      {/* 直帰率推移 */}
      <TrendTable
        title="直帰率推移"
        media={media}
        trafficTrends={trafficTrends}
        periods={periods}
        valueKey="bounce_rate"
        formatFn={formatPercent}
        inverse
      />
    </div>
  )
}

function TrendTable({
  title,
  media,
  trafficTrends,
  periods,
  valueKey,
  formatFn,
  inverse,
}: {
  title: string
  media: MediaMaster[]
  trafficTrends: Record<string, TrafficTrend[]>
  periods: string[]
  valueKey: keyof TrafficTrend
  formatFn: (value: number | null) => string
  inverse?: boolean
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          background: '#FAFAFA',
          borderBottom: '1px solid #E4E4E7',
        }}
      >
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#18181B', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E4E4E7' }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#52525B',
                  width: '160px',
                }}
              >
                媒体
              </th>
              {periods.map((period) => (
                <th
                  key={period}
                  style={{
                    textAlign: 'center',
                    padding: '12px 8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#52525B',
                  }}
                >
                  {period.replace('-', '/')}
                </th>
              ))}
              <th
                style={{
                  textAlign: 'center',
                  padding: '12px 16px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#52525B',
                  width: '100px',
                }}
              >
                前月比
              </th>
            </tr>
          </thead>
          <tbody>
            {media.map((m, index) => {
              const trends = trafficTrends[m.id] || []
              const color = MEDIA_COLORS[index % MEDIA_COLORS.length]
              const lastTrend = trends[trends.length - 1]
              const prevTrend = trends[trends.length - 2]

              return (
                <tr key={m.id} style={{ borderBottom: '1px solid #F4F4F5' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: color.bg,
                        }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>{m.name}</span>
                    </div>
                  </td>
                  {periods.map((period) => {
                    const trend = trends.find((t) => t.period === period)
                    const value = trend ? (trend[valueKey] as number | null) : null
                    return (
                      <td key={period} style={{ textAlign: 'center', padding: '12px 8px' }}>
                        <span style={{ fontSize: '13px', color: '#52525B' }}>{formatFn(value)}</span>
                      </td>
                    )
                  })}
                  <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      {getTrendIcon(
                        lastTrend ? (lastTrend[valueKey] as number | null) : null,
                        prevTrend ? (prevTrend[valueKey] as number | null) : null,
                        inverse
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// =====================================
// キーワード比較タブ
// =====================================

function KeywordsComparison({
  media,
  keywordData,
}: {
  media: MediaMaster[]
  keywordData: Record<string, KeywordData[]>
}) {
  // 全キーワードを抽出（重複排除）
  const allKeywords = Array.from(
    new Set(Object.values(keywordData).flat().map((k) => k.keyword))
  ).slice(0, 20)

  if (allKeywords.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#A1A1AA' }}>
        キーワードデータがありません
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          background: '#FAFAFA',
          borderBottom: '1px solid #E4E4E7',
        }}
      >
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#18181B', margin: 0 }}>
          キーワード順位比較（上位20件）
        </h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E4E4E7' }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#52525B',
                  width: '200px',
                }}
              >
                キーワード
              </th>
              {media.map((m, index) => {
                const color = MEDIA_COLORS[index % MEDIA_COLORS.length]
                return (
                  <th
                    key={m.id}
                    style={{
                      textAlign: 'center',
                      padding: '12px 16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: color.bg,
                    }}
                  >
                    {m.name}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {allKeywords.map((keyword) => (
              <tr key={keyword} style={{ borderBottom: '1px solid #F4F4F5' }}>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: '13px', color: '#18181B' }}>{keyword}</span>
                </td>
                {media.map((m) => {
                  const keywords = keywordData[m.id] || []
                  const kw = keywords.find((k) => k.keyword === keyword)
                  const rank = kw?.rank

                  return (
                    <td key={m.id} style={{ textAlign: 'center', padding: '12px 16px' }}>
                      {rank ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            fontSize: '13px',
                            fontWeight: 600,
                            background:
                              rank <= 3
                                ? '#DCFCE7'
                                : rank <= 10
                                ? '#DBEAFE'
                                : rank <= 20
                                ? '#FEF9C3'
                                : '#F4F4F5',
                            color:
                              rank <= 3
                                ? '#166534'
                                : rank <= 10
                                ? '#1E40AF'
                                : rank <= 20
                                ? '#854D0E'
                                : '#52525B',
                          }}
                        >
                          {rank}
                        </span>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#A1A1AA' }}>-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
