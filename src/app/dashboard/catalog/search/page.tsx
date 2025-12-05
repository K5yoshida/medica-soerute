'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  ChevronDown,
  Download,
  ArrowLeft,
  Loader2,
  Filter,
} from 'lucide-react'

interface SearchKeyword {
  id: string
  keyword: string
  intent: 'A' | 'B' | 'C' | null
  search_volume: number | null
  rank: number | null
  estimated_traffic: number | null
  seo_difficulty: number | null
  cpc: number | null
  media: {
    id: string
    name: string
    domain: string | null
    category: string
    monthly_visits: number | null
  }
}

interface SearchStats {
  total_results: number
  media_count: number
  intent_breakdown: {
    A: number
    B: number
    C: number
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'すべて',
  nursing: '看護師',
  welfare: '介護・福祉',
  pharmacy: '薬剤師',
  dental: '歯科',
  rehabilitation: 'リハビリ',
  general: '総合',
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  return num.toLocaleString('ja-JP')
}

function KeywordSearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [keywords, setKeywords] = useState<SearchKeyword[]>([])
  const [stats, setStats] = useState<SearchStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [intentFilter, setIntentFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [minVolume, setMinVolume] = useState<string>('')
  const [maxRank, setMaxRank] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  // Pagination
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const limit = 50

  const performSearch = useCallback(async (resetOffset = true) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setError('検索キーワードは2文字以上で入力してください')
      return
    }

    if (resetOffset) {
      setOffset(0)
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('q', searchQuery)
      params.set('limit', limit.toString())
      params.set('offset', resetOffset ? '0' : offset.toString())

      if (intentFilter !== 'all') {
        params.set('intent', intentFilter)
      }
      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter)
      }
      if (minVolume) {
        params.set('min_volume', minVolume)
      }
      if (maxRank) {
        params.set('max_rank', maxRank)
      }

      const res = await fetch(`/api/keywords/search?${params.toString()}`)
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'キーワード検索に失敗しました')
      }

      setKeywords(data.data?.keywords || [])
      setStats(data.data?.stats || null)
      setTotal(data.pagination?.total || 0)

      // Update URL without reloading
      const url = new URL(window.location.href)
      url.searchParams.set('q', searchQuery)
      window.history.replaceState({}, '', url.toString())
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
      setKeywords([])
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, intentFilter, categoryFilter, minVolume, maxRank, offset])

  // Initial search if query exists
  useEffect(() => {
    if (initialQuery) {
      performSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // CSV download
  const handleDownloadCSV = async () => {
    if (!searchQuery) return

    try {
      const params = new URLSearchParams()
      params.set('q', searchQuery)
      params.set('limit', '1000')
      if (intentFilter !== 'all') params.set('intent', intentFilter)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)

      const res = await fetch(`/api/keywords/search?${params.toString()}`)
      const data = await res.json()

      if (!data.success || !data.data?.keywords) return

      const csvContent = [
        ['キーワード', '媒体名', 'カテゴリ', '応募意図', '検索順位', '検索ボリューム', '推定流入数', 'SEO難易度'].join(','),
        ...data.data.keywords.map((kw: SearchKeyword) =>
          [
            `"${kw.keyword}"`,
            `"${kw.media.name}"`,
            CATEGORY_LABELS[kw.media.category] || kw.media.category,
            kw.intent || '',
            kw.rank || '',
            kw.search_volume || '',
            kw.estimated_traffic || '',
            kw.seo_difficulty || '',
          ].join(',')
        ),
      ].join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `keyword_search_${searchQuery}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV download failed:', err)
    }
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
            <div>
              <h1 className="text-[15px] font-semibold text-zinc-900 tracking-tight">
                キーワード横断検索
              </h1>
              <p className="text-[13px] text-zinc-400 mt-0.5">
                全媒体のキーワードを一括検索
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="キーワードを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                className="w-80 pl-9 pr-3 py-2 border border-zinc-200 rounded-md text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              />
            </div>

            <button
              onClick={() => performSearch()}
              disabled={isLoading || searchQuery.length < 2}
              className="px-4 py-2 bg-teal-600 text-white rounded-md text-[13px] font-medium hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              検索
            </button>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-md transition ${
                showFilters
                  ? 'border-teal-500 bg-teal-50 text-teal-600'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>

            {/* CSV download */}
            {keywords.length > 0 && (
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1 px-3 py-2 border border-zinc-200 rounded-md text-[13px] text-zinc-600 hover:bg-zinc-50 transition"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center gap-4">
            {/* Intent filter */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-zinc-500">応募意図:</span>
              <div className="flex gap-1">
                {['all', 'A', 'B', 'C'].map((intent) => (
                  <button
                    key={intent}
                    onClick={() => setIntentFilter(intent)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                      intentFilter === intent
                        ? 'bg-teal-600 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {intent === 'all' ? 'すべて' : intent}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div className="relative">
              <span className="text-[12px] text-zinc-500 mr-2">カテゴリ:</span>
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="px-2.5 py-1 border border-zinc-200 rounded text-[12px] text-zinc-600 bg-white flex items-center gap-1 hover:bg-zinc-50 transition"
              >
                {CATEGORY_LABELS[categoryFilter]}
                <ChevronDown className="w-3 h-3" />
              </button>

              {showCategoryDropdown && (
                <div className="absolute left-12 mt-1 w-32 bg-white border border-zinc-200 rounded-md shadow-lg py-1 z-50">
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => {
                        setCategoryFilter(value)
                        setShowCategoryDropdown(false)
                      }}
                      className={`w-full px-3 py-1.5 text-left text-[12px] hover:bg-zinc-50 transition ${
                        categoryFilter === value ? 'text-teal-600 bg-teal-50' : 'text-zinc-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Min volume */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-zinc-500">最小ボリューム:</span>
              <input
                type="number"
                placeholder="0"
                value={minVolume}
                onChange={(e) => setMinVolume(e.target.value)}
                className="w-24 px-2 py-1 border border-zinc-200 rounded text-[12px] outline-none focus:border-teal-500"
              />
            </div>

            {/* Max rank */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-zinc-500">最大順位:</span>
              <input
                type="number"
                placeholder="100"
                value={maxRank}
                onChange={(e) => setMaxRank(e.target.value)}
                className="w-20 px-2 py-1 border border-zinc-200 rounded text-[12px] outline-none focus:border-teal-500"
              />
            </div>

            <button
              onClick={() => performSearch()}
              className="px-3 py-1 bg-teal-600 text-white rounded text-[12px] hover:bg-teal-700 transition"
            >
              フィルター適用
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="p-6">
        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-[13px]">
            {error}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            <span className="ml-2 text-[13px] text-zinc-500">検索中...</span>
          </div>
        ) : keywords.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-zinc-400 text-[13px]">
              {searchQuery ? 'キーワードが見つかりません' : 'キーワードを入力して検索してください'}
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            {stats && (
              <div className="mb-4 flex items-center gap-4 text-[13px]">
                <span className="text-zinc-600">
                  <span className="font-semibold text-zinc-900">{stats.total_results}</span> 件のキーワード
                </span>
                <span className="text-zinc-600">
                  <span className="font-semibold text-zinc-900">{stats.media_count}</span> 媒体
                </span>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[11px]">
                    A: {stats.intent_breakdown.A}
                  </span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[11px]">
                    B: {stats.intent_breakdown.B}
                  </span>
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[11px]">
                    C: {stats.intent_breakdown.C}
                  </span>
                </div>
              </div>
            )}

            {/* Results table */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="text-left px-4 py-3 text-[12px] font-medium text-zinc-500">
                      キーワード
                    </th>
                    <th className="text-left px-4 py-3 text-[12px] font-medium text-zinc-500">
                      媒体
                    </th>
                    <th className="text-center px-4 py-3 text-[12px] font-medium text-zinc-500">
                      意図
                    </th>
                    <th className="text-right px-4 py-3 text-[12px] font-medium text-zinc-500">
                      順位
                    </th>
                    <th className="text-right px-4 py-3 text-[12px] font-medium text-zinc-500">
                      検索Vol
                    </th>
                    <th className="text-right px-4 py-3 text-[12px] font-medium text-zinc-500">
                      推定流入
                    </th>
                    <th className="text-right px-4 py-3 text-[12px] font-medium text-zinc-500">
                      SEO難易度
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw) => (
                    <tr
                      key={kw.id}
                      className="border-b border-zinc-100 hover:bg-zinc-50 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-medium text-zinc-900">
                          {kw.keyword}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/catalog?media=${kw.media.id}`}
                          className="text-[13px] text-teal-600 hover:underline"
                        >
                          {kw.media.name}
                        </Link>
                        <div className="text-[11px] text-zinc-400">
                          {CATEGORY_LABELS[kw.media.category] || kw.media.category}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            kw.intent === 'A'
                              ? 'bg-green-100 text-green-700'
                              : kw.intent === 'B'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-zinc-100 text-zinc-500'
                          }`}
                        >
                          {kw.intent || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[13px] font-medium text-zinc-900">
                          {kw.rank ? `${kw.rank}位` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[13px] text-zinc-900">
                          {formatNumber(kw.search_volume)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[13px] text-zinc-900">
                          {formatNumber(kw.estimated_traffic)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {kw.seo_difficulty !== null ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  kw.seo_difficulty > 70
                                    ? 'bg-red-500'
                                    : kw.seo_difficulty > 40
                                    ? 'bg-amber-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${kw.seo_difficulty}%` }}
                              />
                            </div>
                            <span className="text-[12px] text-zinc-600">
                              {kw.seo_difficulty}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-zinc-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[13px] text-zinc-500">
                  {offset + 1} - {Math.min(offset + limit, total)} / {total} 件
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setOffset(Math.max(0, offset - limit))
                      performSearch(false)
                    }}
                    disabled={offset === 0}
                    className="px-3 py-1.5 border border-zinc-200 rounded text-[13px] text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => {
                      setOffset(offset + limit)
                      performSearch(false)
                    }}
                    disabled={offset + limit >= total}
                    className="px-3 py-1.5 border border-zinc-200 rounded text-[13px] text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    次へ
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

export default function KeywordSearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    }>
      <KeywordSearchContent />
    </Suspense>
  )
}
