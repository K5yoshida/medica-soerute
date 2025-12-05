'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Globe,
  BarChart2,
  TrendingUp,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Search,
} from 'lucide-react'
import {
  KeywordFiltersBar,
  KeywordFilters,
  defaultFilters,
  filtersToQueryParams,
} from '@/components/catalog/keyword-filters'

interface MediaDetail {
  id: string
  name: string
  domain: string | null
  category: string
  description: string | null
  monthly_visits: number | null
  bounce_rate: number | null
  pages_per_visit: number | null
  avg_visit_duration: number | null
  latest_traffic: TrafficData | null
}

interface TrafficData {
  search_pct: number
  direct_pct: number
  referral_pct: number
  display_pct: number
  email_pct: number
  social_pct: number
}

interface Keyword {
  id: string
  keyword: string
  monthly_search_volume: number | null
  search_rank: number | null
  estimated_traffic: number | null
  seo_difficulty: number | null
  cpc_usd: number | null
  competition: number | null
  url: string | null
  intent: string | null
}

interface KeywordStats {
  total: number
  total_monthly_search_volume: number
  total_estimated_traffic: number
}

// 応募意図ラベル
const INTENT_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  A: { label: '応募直前', color: 'text-rose-600', bgColor: 'bg-rose-100' },
  B: { label: '比較検討', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  C: { label: '情報収集', color: 'text-sky-600', bgColor: 'bg-sky-100' },
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  return num.toLocaleString('ja-JP')
}

function formatCompactNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toLocaleString('ja-JP')
}

export default function MediaDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [media, setMedia] = useState<MediaDetail | null>(null)
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [keywordStats, setKeywordStats] = useState<KeywordStats | null>(null)
  const [filters, setFilters] = useState<KeywordFilters>(defaultFilters)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('monthly_search_volume')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ページネーション
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50

  // 媒体情報を取得
  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch(`/api/media/${id}`)
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error?.message || '媒体情報の取得に失敗しました')
      }

      setMedia(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  // キーワード一覧を取得
  const fetchKeywords = useCallback(async () => {
    setIsLoadingKeywords(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(pageSize))
      params.set('offset', String((currentPage - 1) * pageSize))
      params.set('sort_by', sortBy)
      params.set('sort_order', sortOrder)

      if (searchQuery) {
        params.set('search', searchQuery)
      }

      // フィルター適用
      const filterParams = filtersToQueryParams(filters)
      Object.entries(filterParams).forEach(([key, value]) => {
        params.set(key, value)
      })

      const res = await fetch(`/api/media/${id}/keywords?${params.toString()}`)
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'キーワードの取得に失敗しました')
      }

      setKeywords(data.data?.keywords || [])
      setKeywordStats(data.data?.stats || null)
      setTotalCount(data.pagination?.total || 0)
    } catch (err) {
      console.error('Failed to fetch keywords:', err)
    } finally {
      setIsLoadingKeywords(false)
    }
  }, [id, currentPage, sortBy, sortOrder, searchQuery, filters])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  useEffect(() => {
    if (media) {
      fetchKeywords()
    }
  }, [media, fetchKeywords])

  // ソート変更
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  // CSVダウンロード
  const handleDownloadCSV = async () => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '10000')

      const filterParams = filtersToQueryParams(filters)
      Object.entries(filterParams).forEach(([key, value]) => {
        params.set(key, value)
      })

      const res = await fetch(`/api/media/${id}/keywords?${params.toString()}`)
      const data = await res.json()

      if (!data.success || !data.data?.keywords) return

      const csvContent = [
        ['キーワード', '応募意図', 'SEO難易度', '月間検索数', '検索順位', '推定流入数', 'CPC ($)', '競合性', 'URL'].join(','),
        ...data.data.keywords.map((kw: Keyword) =>
          [
            `"${kw.keyword}"`,
            kw.intent || '',
            kw.seo_difficulty || '',
            kw.monthly_search_volume || '',
            kw.search_rank || '',
            kw.estimated_traffic || '',
            kw.cpc_usd || '',
            kw.competition || '',
            kw.url ? `"${kw.url}"` : '',
          ].join(',')
        ),
      ].join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${media?.name || 'keywords'}_keywords.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV download failed:', err)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        <span className="ml-2 text-[13px] text-zinc-500">読み込み中...</span>
      </div>
    )
  }

  if (error || !media) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-[13px]">
          {error || '媒体が見つかりません'}
        </div>
        <Link
          href="/dashboard/catalog"
          className="mt-4 inline-flex items-center gap-2 text-[13px] text-teal-600 hover:text-teal-700"
        >
          <ArrowLeft className="w-4 h-4" />
          一覧に戻る
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/catalog"
              className="p-2 rounded-md hover:bg-zinc-100 transition"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-[13px] font-medium">
                {media.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-zinc-900">
                  {media.name}
                </h1>
                <div className="flex items-center gap-1 text-[12px] text-zinc-400">
                  <Globe className="w-3 h-3" />
                  {media.domain || 'ドメイン未設定'}
                  {media.domain && (
                    <a
                      href={`https://${media.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 hover:text-teal-600"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-zinc-600 border border-zinc-200 rounded-md hover:bg-zinc-50 transition"
          >
            <Download className="w-4 h-4" />
            CSVダウンロード
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-zinc-200">
            <BarChart2 className="w-5 h-5 text-teal-500" />
            <div>
              <div className="text-[11px] text-zinc-400">KW数</div>
              <div className="text-[18px] font-bold text-zinc-900">
                {formatNumber(keywordStats?.total || 0)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-zinc-200">
            <Users className="w-5 h-5 text-amber-500" />
            <div>
              <div className="text-[11px] text-zinc-400">月間Vol合計</div>
              <div className="text-[18px] font-bold text-zinc-900">
                {formatCompactNumber(keywordStats?.total_monthly_search_volume)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-zinc-200">
            <TrendingUp className="w-5 h-5 text-rose-500" />
            <div>
              <div className="text-[11px] text-zinc-400">推定流入合計</div>
              <div className="text-[18px] font-bold text-zinc-900">
                {formatCompactNumber(keywordStats?.total_estimated_traffic)}
              </div>
            </div>
          </div>

          {/* 流入経路グラフ */}
          {media.latest_traffic && (
            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-zinc-200 ml-auto">
              <div className="text-[11px] text-zinc-400 mr-2">流入経路</div>
              <div className="flex items-center gap-1">
                <div className="w-32 h-3 bg-zinc-100 rounded-full flex overflow-hidden">
                  <div className="bg-teal-500" style={{ width: `${media.latest_traffic.search_pct}%` }} title="検索" />
                  <div className="bg-amber-500" style={{ width: `${media.latest_traffic.direct_pct}%` }} title="直接" />
                  <div className="bg-indigo-500" style={{ width: `${media.latest_traffic.referral_pct}%` }} title="参照" />
                  <div className="bg-pink-500" style={{ width: `${media.latest_traffic.display_pct}%` }} title="広告" />
                  <div className="bg-purple-500" style={{ width: `${media.latest_traffic.social_pct}%` }} title="SNS" />
                </div>
                <span className="text-[11px] text-zinc-500 ml-1">
                  検索 {media.latest_traffic.search_pct.toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-4">
          {/* 検索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="キーワードを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setCurrentPage(1)
                  fetchKeywords()
                }
              }}
              className="w-64 pl-9 pr-3 py-2 border border-zinc-200 rounded-md text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
            />
          </div>

          <div className="w-px h-6 bg-zinc-200" />

          {/* フィルター */}
          <KeywordFiltersBar
            filters={filters}
            onFiltersChange={(newFilters) => {
              setFilters(newFilters)
              setCurrentPage(1)
            }}
            showIntentFilter={true}
            compact
          />
        </div>
      </div>

      {/* Keywords Table */}
      <div className="p-6">
        {isLoadingKeywords ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        ) : keywords.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-[13px]">
            キーワードが見つかりません
          </div>
        ) : (
          <>
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <SortableHeader
                      label="キーワード"
                      column="keyword"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                      align="left"
                    />
                    <th className="text-center px-3 py-3 text-[11px] font-medium text-zinc-500 uppercase w-20">
                      意図
                    </th>
                    <SortableHeader
                      label="SEO難易度"
                      column="seo_difficulty"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="月間検索数"
                      column="monthly_search_volume"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="検索順位"
                      column="search_rank"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="推定流入数"
                      column="estimated_traffic"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="CPC ($)"
                      column="cpc_usd"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="競合性"
                      column="competition"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <th className="text-right px-3 py-3 text-[11px] font-medium text-zinc-500 uppercase w-16">
                      URL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw) => (
                    <tr key={kw.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition">
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-medium text-zinc-900">{kw.keyword}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {kw.intent && INTENT_LABELS[kw.intent] ? (
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded ${INTENT_LABELS[kw.intent].bgColor} ${INTENT_LABELS[kw.intent].color}`}>
                            {INTENT_LABELS[kw.intent].label}
                          </span>
                        ) : (
                          <span className="text-[12px] text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {kw.seo_difficulty !== null ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-10 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  kw.seo_difficulty > 70 ? 'bg-red-500' : kw.seo_difficulty > 40 ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${kw.seo_difficulty}%` }}
                              />
                            </div>
                            <span className="text-[12px] text-zinc-600 w-6 text-right">{kw.seo_difficulty}</span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-[13px] text-zinc-900">{formatNumber(kw.monthly_search_volume)}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-[13px] font-medium text-zinc-900">
                          {kw.search_rank ? kw.search_rank : '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-[13px] text-zinc-900">{formatNumber(kw.estimated_traffic)}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-[12px] text-zinc-600">
                          {kw.cpc_usd !== null ? `$${kw.cpc_usd.toFixed(2)}` : '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-[12px] text-zinc-600">
                          {kw.competition !== null ? kw.competition : '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {kw.url ? (
                          <a
                            href={kw.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1 rounded hover:bg-zinc-100 transition"
                            title={kw.url}
                          >
                            <ArrowUpRight className="w-4 h-4 text-teal-600" />
                          </a>
                        ) : (
                          <span className="text-[12px] text-zinc-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[13px] text-zinc-500">
                  {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} / {formatNumber(totalCount)} 件
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-zinc-200 rounded-md text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[13px] text-zinc-600 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-zinc-200 rounded-md text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

// ソート可能なヘッダー
function SortableHeader({
  label,
  column,
  currentSort,
  currentOrder,
  onSort,
  align = 'right',
}: {
  label: string
  column: string
  currentSort: string
  currentOrder: 'asc' | 'desc'
  onSort: (column: string) => void
  align?: 'left' | 'right'
}) {
  const isActive = currentSort === column

  return (
    <th
      className={`px-3 py-3 text-[11px] font-medium text-zinc-500 uppercase cursor-pointer hover:bg-zinc-100 transition ${
        align === 'left' ? 'text-left' : 'text-right'
      }`}
      onClick={() => onSort(column)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        <span className={`text-[10px] ${isActive ? 'text-teal-600' : 'text-zinc-300'}`}>
          {isActive ? (currentOrder === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </div>
    </th>
  )
}
