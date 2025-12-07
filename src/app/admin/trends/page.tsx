'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  Users,
  Search,
  Plus,
  X,
} from 'lucide-react'

// =====================================
// 型定義
// =====================================

interface MediaOption {
  id: string
  name: string
  domain: string | null
}

interface TrafficTrend {
  period: string // YYYY-MM
  monthly_visits: number | null
  search_pct: number | null
  direct_pct: number | null
  referral_pct: number | null
  display_pct: number | null
  social_pct: number | null
  email_pct: number | null
  bounce_rate: number | null
  pages_per_visit: number | null
  avg_visit_duration: number | null
}

interface KeywordRankingTrend {
  period: string // YYYY-MM
  keyword: string
  search_rank: number | null
  monthly_search_volume: number | null
  estimated_traffic: number | null
}

// ダミーデータ生成（後でAPIから取得）
const generateDummyTrafficTrends = (): TrafficTrend[] => {
  const periods = ['2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12']
  const baseVisits = Math.floor(Math.random() * 500000) + 100000

  return periods.map((period) => ({
    period,
    monthly_visits: Math.floor(baseVisits * (1 + (Math.random() - 0.5) * 0.3)),
    search_pct: 35 + Math.random() * 20,
    direct_pct: 20 + Math.random() * 15,
    referral_pct: 10 + Math.random() * 10,
    display_pct: 5 + Math.random() * 8,
    social_pct: 8 + Math.random() * 10,
    email_pct: 2 + Math.random() * 5,
    bounce_rate: 45 + Math.random() * 15,
    pages_per_visit: 2 + Math.random() * 3,
    avg_visit_duration: 120 + Math.random() * 180,
  }))
}

const generateDummyKeywordTrends = (): KeywordRankingTrend[] => {
  const periods = ['2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12']
  const keywords = ['看護師 求人', '介護士 転職', '薬剤師 年収', '理学療法士 求人', '作業療法士 転職']

  const result: KeywordRankingTrend[] = []
  keywords.forEach(keyword => {
    let baseRank = Math.floor(Math.random() * 30) + 1
    periods.forEach(period => {
      baseRank = Math.max(1, Math.min(100, baseRank + Math.floor((Math.random() - 0.5) * 10)))
      result.push({
        period,
        keyword,
        search_rank: baseRank,
        monthly_search_volume: Math.floor(Math.random() * 10000) + 1000,
        estimated_traffic: Math.floor(Math.random() * 5000) + 500,
      })
    })
  })

  return result
}

// ダミー媒体リスト
const dummyMediaList: MediaOption[] = [
  { id: '1', name: 'ナース人材バンク', domain: 'nursejinzaibank.com' },
  { id: '2', name: 'マイナビ看護師', domain: 'kango.mynavi.jp' },
  { id: '3', name: 'レバウェル看護', domain: 'levwell-kango.jp' },
  { id: '4', name: '看護roo!', domain: 'kango-roo.com' },
  { id: '5', name: 'ジョブメドレー', domain: 'job-medley.com' },
]

// =====================================
// ユーティリティ関数
// =====================================

function formatNumber(num: number | null): string {
  if (num === null) return '-'
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
    return <Minus className="w-4 h-4 text-zinc-400" />
  }
  if (isPositive) {
    return <TrendingUp className="w-4 h-4 text-green-500" />
  }
  return <TrendingDown className="w-4 h-4 text-red-500" />
}

function getChangeText(current: number | null, previous: number | null, isPercent = false): string {
  if (current === null || previous === null) return ''
  const diff = current - previous
  const sign = diff > 0 ? '+' : ''
  if (isPercent) {
    return `${sign}${diff.toFixed(1)}pt`
  }
  if (Math.abs(diff) >= 1000) {
    return `${sign}${(diff / 1000).toFixed(1)}K`
  }
  return `${sign}${diff.toFixed(0)}`
}

// 期間カラー（媒体比較用）
const MEDIA_COLORS = [
  { bg: '#0D9488', light: '#CCFBF1' }, // teal
  { bg: '#7C3AED', light: '#EDE9FE' }, // violet
  { bg: '#EA580C', light: '#FFEDD5' }, // orange
  { bg: '#2563EB', light: '#DBEAFE' }, // blue
  { bg: '#DB2777', light: '#FCE7F3' }, // pink
]

// =====================================
// メインコンポーネント
// =====================================

export default function TrendsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [mediaList, setMediaList] = useState<MediaOption[]>([])
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([])
  const [trafficTrends, setTrafficTrends] = useState<Record<string, TrafficTrend[]>>({})
  const [keywordTrends, setKeywordTrends] = useState<Record<string, KeywordRankingTrend[]>>({})

  const [activeTab, setActiveTab] = useState<'traffic' | 'keywords'>('traffic')
  const [periodRange, setPeriodRange] = useState('6months')
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false)

  // 媒体一覧取得
  const fetchMediaList = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media')
      const data = await res.json()
      if (data.success && data.data) {
        setMediaList(data.data.map((m: { id: string; name: string; domain: string | null }) => ({
          id: m.id,
          name: m.name,
          domain: m.domain,
        })))
      } else {
        // APIがまだない場合はダミーデータ
        setMediaList(dummyMediaList)
      }
    } catch {
      setMediaList(dummyMediaList)
    }
  }, [])

  // トレンドデータ取得
  const fetchTrends = useCallback(async () => {
    if (selectedMediaIds.length === 0) {
      setTrafficTrends({})
      setKeywordTrends({})
      return
    }

    setIsLoading(true)
    try {
      // TODO: 実際のAPIから取得
      // const res = await fetch(`/api/admin/trends?media_ids=${selectedMediaIds.join(',')}&period=${periodRange}`)

      // 現在はダミーデータを使用
      const newTrafficTrends: Record<string, TrafficTrend[]> = {}
      const newKeywordTrends: Record<string, KeywordRankingTrend[]> = {}

      selectedMediaIds.forEach(id => {
        newTrafficTrends[id] = generateDummyTrafficTrends()
        newKeywordTrends[id] = generateDummyKeywordTrends()
      })

      setTrafficTrends(newTrafficTrends)
      setKeywordTrends(newKeywordTrends)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMediaIds, periodRange])

  useEffect(() => {
    fetchMediaList()
  }, [fetchMediaList])

  useEffect(() => {
    fetchTrends()
  }, [fetchTrends])

  // 媒体選択の切り替え
  const toggleMediaSelection = (mediaId: string) => {
    if (selectedMediaIds.includes(mediaId)) {
      setSelectedMediaIds(selectedMediaIds.filter(id => id !== mediaId))
    } else {
      if (selectedMediaIds.length < 5) {
        setSelectedMediaIds([...selectedMediaIds, mediaId])
      }
    }
  }

  const removeMedia = (mediaId: string) => {
    setSelectedMediaIds(selectedMediaIds.filter(id => id !== mediaId))
  }

  // 選択中の媒体情報を取得
  const getSelectedMedia = (id: string) => mediaList.find(m => m.id === id)

  // 全期間を取得（表示用）
  const allPeriods = selectedMediaIds.length > 0 && trafficTrends[selectedMediaIds[0]]
    ? trafficTrends[selectedMediaIds[0]].map(t => t.period)
    : []

  return (
    <>
      {/* ヘッダー */}
      <header
        className="bg-white border-b border-zinc-200"
        style={{ position: 'sticky', top: 0, zIndex: 40 }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-[15px] font-semibold text-zinc-900 tracking-tight">
              トレンド分析
            </h1>
            <p className="text-[13px] text-zinc-400 mt-0.5">
              媒体データの推移を確認・比較
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 期間選択 */}
            <select
              value={periodRange}
              onChange={(e) => setPeriodRange(e.target.value)}
              className="px-3 py-2 border border-zinc-200 rounded-md text-[13px] outline-none focus:border-teal-500"
            >
              <option value="3months">過去3ヶ月</option>
              <option value="6months">過去6ヶ月</option>
              <option value="12months">過去12ヶ月</option>
            </select>

            <button
              onClick={fetchTrends}
              disabled={isLoading || selectedMediaIds.length === 0}
              className="p-2 border border-zinc-200 rounded-md text-zinc-600 bg-white hover:bg-zinc-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* 媒体選択セクション */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-medium text-zinc-900">
              比較する媒体を選択
              <span className="ml-2 text-[12px] text-zinc-400 font-normal">
                （最大5媒体）
              </span>
            </h2>
          </div>

          {/* 選択済み媒体タグ */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {selectedMediaIds.map((id, index) => {
              const media = getSelectedMedia(id)
              const color = MEDIA_COLORS[index % MEDIA_COLORS.length]
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ background: color.light, border: `1px solid ${color.bg}` }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: color.bg }}
                  />
                  <span className="text-[13px] font-medium" style={{ color: color.bg }}>
                    {media?.name || id}
                  </span>
                  <button
                    onClick={() => removeMedia(id)}
                    className="p-0.5 rounded-full hover:bg-white/50 transition"
                    style={{ color: color.bg }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}

            {selectedMediaIds.length < 5 && (
              <div className="relative">
                <button
                  onClick={() => setIsMediaSelectorOpen(!isMediaSelectorOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-zinc-300 rounded-full text-zinc-500 hover:border-teal-400 hover:text-teal-600 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-[13px]">媒体を追加</span>
                </button>

                {/* 媒体選択ドロップダウン */}
                {isMediaSelectorOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsMediaSelectorOpen(false)}
                    />
                    <div
                      className="absolute top-full left-0 mt-2 z-50 bg-white border border-zinc-200 rounded-lg shadow-lg"
                      style={{ width: '280px', maxHeight: '300px', overflowY: 'auto' }}
                    >
                      <div className="p-2 border-b border-zinc-100">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input
                            type="text"
                            placeholder="媒体を検索..."
                            className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-md text-[13px] outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>
                      <div className="p-2">
                        {mediaList
                          .filter(m => !selectedMediaIds.includes(m.id))
                          .map(media => (
                            <button
                              key={media.id}
                              onClick={() => {
                                toggleMediaSelection(media.id)
                                setIsMediaSelectorOpen(false)
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-50 transition text-left"
                            >
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                                {media.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-zinc-900 truncate">
                                  {media.name}
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate">
                                  {media.domain || '-'}
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {selectedMediaIds.length === 0 ? (
          // 媒体未選択時のプレースホルダー
          <div
            className="bg-white border border-dashed border-zinc-300 rounded-lg p-12 text-center"
          >
            <Users className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-[15px] font-medium text-zinc-600 mb-2">
              比較する媒体を選択してください
            </h3>
            <p className="text-[13px] text-zinc-400">
              上の「媒体を追加」ボタンから、トレンドを確認したい媒体を選択してください
            </p>
          </div>
        ) : (
          <>
            {/* タブ切り替え */}
            <div className="flex items-center gap-1 mb-6 p-1 bg-zinc-100 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('traffic')}
                className={`px-4 py-2 text-[13px] font-medium rounded-md transition ${
                  activeTab === 'traffic'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                SimilarWeb推移
              </button>
              <button
                onClick={() => setActiveTab('keywords')}
                className={`px-4 py-2 text-[13px] font-medium rounded-md transition ${
                  activeTab === 'keywords'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Search className="w-4 h-4 inline mr-2" />
                キーワード順位推移
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                <span className="ml-2 text-[13px] text-zinc-500">読み込み中...</span>
              </div>
            ) : activeTab === 'traffic' ? (
              // SimilarWeb推移セクション
              <TrafficTrendsView
                selectedMediaIds={selectedMediaIds}
                mediaList={mediaList}
                trafficTrends={trafficTrends}
                periods={allPeriods}
              />
            ) : (
              // キーワード順位推移セクション
              <KeywordTrendsView
                selectedMediaIds={selectedMediaIds}
                mediaList={mediaList}
                keywordTrends={keywordTrends}
                periods={allPeriods}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}

// =====================================
// SimilarWeb推移ビュー
// =====================================

interface TrafficTrendsViewProps {
  selectedMediaIds: string[]
  mediaList: MediaOption[]
  trafficTrends: Record<string, TrafficTrend[]>
  periods: string[]
}

function TrafficTrendsView({
  selectedMediaIds,
  mediaList,
  trafficTrends,
  periods,
}: TrafficTrendsViewProps) {
  const getMediaName = (id: string) => mediaList.find(m => m.id === id)?.name || id

  return (
    <div className="space-y-6">
      {/* 月間訪問数グラフ（簡易版） */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6">
        <h3 className="text-[14px] font-semibold text-zinc-900 mb-4">
          月間訪問数推移
        </h3>

        {/* 簡易棒グラフ表示 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left text-[12px] font-medium text-zinc-500 py-2 px-3 w-40">
                  媒体
                </th>
                {periods.map(period => (
                  <th key={period} className="text-center text-[12px] font-medium text-zinc-500 py-2 px-3">
                    {period.replace('-', '/')}
                  </th>
                ))}
                <th className="text-center text-[12px] font-medium text-zinc-500 py-2 px-3 w-24">
                  前月比
                </th>
              </tr>
            </thead>
            <tbody>
              {selectedMediaIds.map((mediaId, index) => {
                const trends = trafficTrends[mediaId] || []
                const color = MEDIA_COLORS[index % MEDIA_COLORS.length]
                const lastTrend = trends[trends.length - 1]
                const prevTrend = trends[trends.length - 2]

                return (
                  <tr key={mediaId} className="border-b border-zinc-100">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: color.bg }}
                        />
                        <span className="text-[13px] font-medium text-zinc-900">
                          {getMediaName(mediaId)}
                        </span>
                      </div>
                    </td>
                    {periods.map(period => {
                      const trend = trends.find(t => t.period === period)
                      return (
                        <td key={period} className="text-center py-3 px-3">
                          <span className="text-[13px] text-zinc-700">
                            {formatNumber(trend?.monthly_visits ?? null)}
                          </span>
                        </td>
                      )
                    })}
                    <td className="text-center py-3 px-3">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(lastTrend?.monthly_visits ?? null, prevTrend?.monthly_visits ?? null)}
                        <span className="text-[12px] text-zinc-500">
                          {getChangeText(lastTrend?.monthly_visits ?? null, prevTrend?.monthly_visits ?? null)}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 流入経路推移 */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6">
        <h3 className="text-[14px] font-semibold text-zinc-900 mb-4">
          検索流入比率推移
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left text-[12px] font-medium text-zinc-500 py-2 px-3 w-40">
                  媒体
                </th>
                {periods.map(period => (
                  <th key={period} className="text-center text-[12px] font-medium text-zinc-500 py-2 px-3">
                    {period.replace('-', '/')}
                  </th>
                ))}
                <th className="text-center text-[12px] font-medium text-zinc-500 py-2 px-3 w-24">
                  前月比
                </th>
              </tr>
            </thead>
            <tbody>
              {selectedMediaIds.map((mediaId, index) => {
                const trends = trafficTrends[mediaId] || []
                const color = MEDIA_COLORS[index % MEDIA_COLORS.length]
                const lastTrend = trends[trends.length - 1]
                const prevTrend = trends[trends.length - 2]

                return (
                  <tr key={mediaId} className="border-b border-zinc-100">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: color.bg }}
                        />
                        <span className="text-[13px] font-medium text-zinc-900">
                          {getMediaName(mediaId)}
                        </span>
                      </div>
                    </td>
                    {periods.map(period => {
                      const trend = trends.find(t => t.period === period)
                      return (
                        <td key={period} className="text-center py-3 px-3">
                          <span className="text-[13px] text-sky-600 font-medium">
                            {formatPercent(trend?.search_pct ?? null)}
                          </span>
                        </td>
                      )
                    })}
                    <td className="text-center py-3 px-3">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(lastTrend?.search_pct ?? null, prevTrend?.search_pct ?? null)}
                        <span className="text-[12px] text-zinc-500">
                          {getChangeText(lastTrend?.search_pct ?? null, prevTrend?.search_pct ?? null, true)}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* エンゲージメント指標 */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6">
        <h3 className="text-[14px] font-semibold text-zinc-900 mb-4">
          エンゲージメント指標（最新月）
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left text-[12px] font-medium text-zinc-500 py-2 px-3 w-40">
                  媒体
                </th>
                <th className="text-center text-[12px] font-medium text-zinc-500 py-2 px-3">
                  直帰率
                </th>
                <th className="text-center text-[12px] font-medium text-zinc-500 py-2 px-3">
                  PV/訪問
                </th>
                <th className="text-center text-[12px] font-medium text-zinc-500 py-2 px-3">
                  滞在時間
                </th>
              </tr>
            </thead>
            <tbody>
              {selectedMediaIds.map((mediaId, index) => {
                const trends = trafficTrends[mediaId] || []
                const color = MEDIA_COLORS[index % MEDIA_COLORS.length]
                const lastTrend = trends[trends.length - 1]
                const prevTrend = trends[trends.length - 2]

                return (
                  <tr key={mediaId} className="border-b border-zinc-100">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: color.bg }}
                        />
                        <span className="text-[13px] font-medium text-zinc-900">
                          {getMediaName(mediaId)}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[13px] text-zinc-700">
                          {formatPercent(lastTrend?.bounce_rate ?? null)}
                        </span>
                        {getTrendIcon(lastTrend?.bounce_rate ?? null, prevTrend?.bounce_rate ?? null, true)}
                      </div>
                    </td>
                    <td className="text-center py-3 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[13px] text-zinc-700">
                          {lastTrend?.pages_per_visit?.toFixed(1) ?? '-'}
                        </span>
                        {getTrendIcon(lastTrend?.pages_per_visit ?? null, prevTrend?.pages_per_visit ?? null)}
                      </div>
                    </td>
                    <td className="text-center py-3 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[13px] text-zinc-700">
                          {formatDuration(lastTrend?.avg_visit_duration ?? null)}
                        </span>
                        {getTrendIcon(lastTrend?.avg_visit_duration ?? null, prevTrend?.avg_visit_duration ?? null)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// =====================================
// キーワード順位推移ビュー
// =====================================

interface KeywordTrendsViewProps {
  selectedMediaIds: string[]
  mediaList: MediaOption[]
  keywordTrends: Record<string, KeywordRankingTrend[]>
  periods: string[]
}

function KeywordTrendsView({
  selectedMediaIds,
  mediaList,
  keywordTrends,
  periods,
}: KeywordTrendsViewProps) {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [keywordSearch, setKeywordSearch] = useState('')

  const getMediaName = (id: string) => mediaList.find(m => m.id === id)?.name || id

  // 全キーワードを抽出
  const allKeywords = Array.from(new Set(
    Object.values(keywordTrends)
      .flat()
      .map(t => t.keyword)
  )).filter(k => k.toLowerCase().includes(keywordSearch.toLowerCase()))

  return (
    <div className="space-y-6">
      {/* キーワード選択 */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6">
        <h3 className="text-[14px] font-semibold text-zinc-900 mb-4">
          キーワードを選択
        </h3>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="キーワードで検索..."
            value={keywordSearch}
            onChange={(e) => setKeywordSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-md text-[13px] outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {allKeywords.slice(0, 20).map(keyword => (
            <button
              key={keyword}
              onClick={() => setSelectedKeyword(selectedKeyword === keyword ? null : keyword)}
              className={`px-3 py-1.5 rounded-full text-[13px] transition ${
                selectedKeyword === keyword
                  ? 'bg-teal-500 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {keyword}
            </button>
          ))}
        </div>
      </div>

      {/* 選択キーワードの順位推移 */}
      {selectedKeyword && (
        <div className="bg-white border border-zinc-200 rounded-lg p-6">
          <h3 className="text-[14px] font-semibold text-zinc-900 mb-4">
            「{selectedKeyword}」の順位推移
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left text-[12px] font-medium text-zinc-500 py-2 px-3 w-40">
                    媒体
                  </th>
                  {periods.map(period => (
                    <th key={period} className="text-center text-[12px] font-medium text-zinc-500 py-2 px-3">
                      {period.replace('-', '/')}
                    </th>
                  ))}
                  <th className="text-center text-[12px] font-medium text-zinc-500 py-2 px-3 w-24">
                    変動
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedMediaIds.map((mediaId, index) => {
                  const trends = (keywordTrends[mediaId] || []).filter(t => t.keyword === selectedKeyword)
                  const color = MEDIA_COLORS[index % MEDIA_COLORS.length]

                  const sortedTrends = [...trends].sort((a, b) => a.period.localeCompare(b.period))
                  const lastTrend = sortedTrends[sortedTrends.length - 1]
                  const firstTrend = sortedTrends[0]

                  return (
                    <tr key={mediaId} className="border-b border-zinc-100">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: color.bg }}
                          />
                          <span className="text-[13px] font-medium text-zinc-900">
                            {getMediaName(mediaId)}
                          </span>
                        </div>
                      </td>
                      {periods.map(period => {
                        const trend = trends.find(t => t.period === period)
                        const rank = trend?.search_rank
                        return (
                          <td key={period} className="text-center py-3 px-3">
                            {rank ? (
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-semibold ${
                                  rank <= 3
                                    ? 'bg-green-100 text-green-700'
                                    : rank <= 10
                                    ? 'bg-blue-100 text-blue-700'
                                    : rank <= 20
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-zinc-100 text-zinc-600'
                                }`}
                              >
                                {rank}
                              </span>
                            ) : (
                              <span className="text-[13px] text-zinc-400">-</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="text-center py-3 px-3">
                        {lastTrend && firstTrend ? (
                          <div className="flex items-center justify-center gap-1">
                            {getTrendIcon(firstTrend.search_rank, lastTrend.search_rank)}
                            <span className="text-[12px] text-zinc-500">
                              {(firstTrend.search_rank ?? 0) - (lastTrend.search_rank ?? 0) > 0
                                ? `+${(firstTrend.search_rank ?? 0) - (lastTrend.search_rank ?? 0)}`
                                : (firstTrend.search_rank ?? 0) - (lastTrend.search_rank ?? 0)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-zinc-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 主要キーワード一覧 */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6">
        <h3 className="text-[14px] font-semibold text-zinc-900 mb-4">
          主要キーワード順位サマリー（最新月）
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left text-[12px] font-medium text-zinc-500 py-2 px-3">
                  キーワード
                </th>
                {selectedMediaIds.map((mediaId, index) => {
                  const color = MEDIA_COLORS[index % MEDIA_COLORS.length]
                  return (
                    <th key={mediaId} className="text-center text-[12px] font-medium py-2 px-3" style={{ color: color.bg }}>
                      {getMediaName(mediaId)}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {allKeywords.slice(0, 10).map(keyword => (
                <tr
                  key={keyword}
                  className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer"
                  onClick={() => setSelectedKeyword(keyword)}
                >
                  <td className="py-3 px-3">
                    <span className="text-[13px] text-zinc-900">{keyword}</span>
                  </td>
                  {selectedMediaIds.map((mediaId) => {
                    const trends = (keywordTrends[mediaId] || []).filter(t => t.keyword === keyword)
                    const latestTrend = trends.sort((a, b) => b.period.localeCompare(a.period))[0]
                    const rank = latestTrend?.search_rank

                    return (
                      <td key={mediaId} className="text-center py-3 px-3">
                        {rank ? (
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-semibold ${
                              rank <= 3
                                ? 'bg-green-100 text-green-700'
                                : rank <= 10
                                ? 'bg-blue-100 text-blue-700'
                                : rank <= 20
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {rank}
                          </span>
                        ) : (
                          <span className="text-[13px] text-zinc-400">-</span>
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
    </div>
  )
}
