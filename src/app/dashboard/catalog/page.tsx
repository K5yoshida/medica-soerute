'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  ChevronDown,
  Loader2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react'

interface TrafficData {
  search_pct: number | null
  direct_pct: number | null
  referral_pct: number | null
  display_pct: number | null
  email_pct: number | null
  social_pct: number | null
}

interface MediaMaster {
  id: string
  name: string
  domain: string | null
  category: string
  description: string | null
  monthly_visits: number | null
  bounce_rate: number | null
  pages_per_visit: number | null
  avg_visit_duration: number | null
  is_active: boolean
  keyword_count: number
  total_search_volume: number | null
  total_estimated_traffic: number | null
  latest_traffic: TrafficData | null
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

function formatCompactNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  return num.toLocaleString('ja-JP')
}

function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  return `${num.toFixed(1)}%`
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function CatalogPage() {
  const router = useRouter()
  const [mediaList, setMediaList] = useState<MediaMaster[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  // 媒体一覧を取得
  const fetchMedia = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter)
      }
      if (searchQuery) {
        params.set('search', searchQuery)
      }
      params.set('sort_by', 'keyword_count')
      params.set('sort_order', 'desc')

      const res = await fetch(`/api/media?${params.toString()}`)
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error?.message || '媒体データの取得に失敗しました')
      }

      setMediaList(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [categoryFilter, searchQuery])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold text-zinc-900 tracking-tight">
              媒体カタログ
            </h1>
            <p className="text-[13px] text-zinc-400 mt-0.5">
              媒体の獲得キーワード・流入経路を確認
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 媒体検索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="媒体を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMedia()}
                className="w-64 pl-9 pr-3 py-2 border border-zinc-200 rounded-md text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              />
            </div>

            {/* カテゴリフィルター */}
            <div className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="px-3 py-2 border border-zinc-200 rounded-md text-[13px] text-zinc-600 bg-white flex items-center gap-2 hover:bg-zinc-50 transition"
              >
                {CATEGORY_LABELS[categoryFilter]}
                <ChevronDown className="w-4 h-4" />
              </button>

              {showCategoryDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCategoryDropdown(false)} />
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-zinc-200 rounded-md shadow-lg py-1 z-50">
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => {
                          setCategoryFilter(value)
                          setShowCategoryDropdown(false)
                        }}
                        className={`w-full px-3 py-2 text-left text-[13px] hover:bg-zinc-50 transition ${
                          categoryFilter === value ? 'text-teal-600 bg-teal-50' : 'text-zinc-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 更新ボタン */}
            <button
              onClick={fetchMedia}
              disabled={isLoading}
              className="p-2 border border-zinc-200 rounded-md text-zinc-600 bg-white hover:bg-zinc-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-[13px]">{error}</div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            <span className="ml-2 text-[13px] text-zinc-500">読み込み中...</span>
          </div>
        ) : mediaList.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-[13px]">媒体が見つかりません</div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider sticky left-0 bg-zinc-50 w-[180px] min-w-[180px] max-w-[180px]">
                    媒体名
                  </th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    月間訪問
                  </th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    直帰率
                  </th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    PV/訪問
                  </th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    滞在時間
                  </th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    検索
                  </th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    直接
                  </th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    参照
                  </th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    広告
                  </th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    SNS
                  </th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    KW数
                  </th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    推定流入
                  </th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {mediaList.map((media) => (
                  <tr
                    key={media.id}
                    onClick={() => router.push(`/dashboard/catalog/${media.id}`)}
                    className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition group"
                  >
                    <td className="px-3 py-2.5 sticky left-0 bg-white group-hover:bg-zinc-50 w-[180px] min-w-[180px] max-w-[180px]">
                      <div className="flex items-center gap-2" title={`${media.name}\n${media.domain || ''}`}>
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                          {media.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium text-zinc-900 group-hover:text-teal-600 transition truncate">
                            {media.name}
                          </div>
                          <div className="text-xs text-zinc-400 truncate">
                            {media.domain || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm font-semibold text-zinc-900">
                        {formatCompactNumber(media.monthly_visits)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm text-zinc-600">
                        {formatPercent(media.bounce_rate)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm text-zinc-600">
                        {media.pages_per_visit ? media.pages_per_visit.toFixed(2) : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm text-zinc-600">
                        {formatDuration(media.avg_visit_duration)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm text-sky-600 font-medium">
                        {media.latest_traffic?.search_pct != null ? `${media.latest_traffic.search_pct.toFixed(1)}%` : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm text-blue-600">
                        {media.latest_traffic?.direct_pct != null ? `${media.latest_traffic.direct_pct.toFixed(1)}%` : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm text-rose-600">
                        {media.latest_traffic?.referral_pct != null ? `${media.latest_traffic.referral_pct.toFixed(1)}%` : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm text-amber-600">
                        {media.latest_traffic?.display_pct != null ? `${media.latest_traffic.display_pct.toFixed(1)}%` : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm text-green-600">
                        {media.latest_traffic?.social_pct != null ? `${media.latest_traffic.social_pct.toFixed(1)}%` : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm font-semibold text-zinc-900">
                        {formatNumber(media.keyword_count)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm text-zinc-600">
                        {formatCompactNumber(media.total_estimated_traffic)}
                      </span>
                    </td>
                    <td className="px-1 py-2 text-right">
                      <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-teal-500 transition" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
