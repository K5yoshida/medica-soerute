'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  ChevronDown,
  X,
  ExternalLink,
  Download,
  Globe,
  Users,
  BarChart2,
  Loader2,
  RefreshCw,
} from 'lucide-react'

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
  latest_traffic: TrafficData | null
}

interface TrafficData {
  id: string
  media_id: string
  period: string
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
}

interface KeywordStats {
  total: number
  total_monthly_search_volume: number
  total_estimated_traffic: number
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

export default function CatalogPage() {
  const router = useRouter()
  const [mediaList, setMediaList] = useState<MediaMaster[]>([])
  const [selectedMedia, setSelectedMedia] = useState<MediaMaster | null>(null)
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [keywordStats, setKeywordStats] = useState<KeywordStats | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false)
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
      params.set('sort_by', 'monthly_visits')
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

  // 選択した媒体のキーワードを取得
  const fetchKeywords = useCallback(async (mediaId: string) => {
    setIsLoadingKeywords(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '20')
      params.set('sort_by', 'monthly_search_volume')
      params.set('sort_order', 'desc')

      const res = await fetch(`/api/media/${mediaId}/keywords?${params.toString()}`)
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'キーワードデータの取得に失敗しました')
      }

      setKeywords(data.data?.keywords || [])
      setKeywordStats(data.data?.stats || null)
    } catch (err) {
      console.error('Failed to fetch keywords:', err)
      setKeywords([])
      setKeywordStats(null)
    } finally {
      setIsLoadingKeywords(false)
    }
  }, [])

  // 初期読み込み
  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  // 媒体選択時にキーワードを取得
  useEffect(() => {
    if (selectedMedia) {
      fetchKeywords(selectedMedia.id)
    }
  }, [selectedMedia, fetchKeywords])

  // CSVダウンロード
  const handleDownloadCSV = async () => {
    if (!selectedMedia) return

    try {
      const res = await fetch(`/api/media/${selectedMedia.id}/keywords?limit=1000`)
      const data = await res.json()

      if (!data.success || !data.data?.keywords) return

      const csvContent = [
        ['キーワード', 'SEO難易度', '月間検索数', '検索順位', '推定流入数', 'CPC ($)', '競合性', 'URL'].join(','),
        ...data.data.keywords.map((kw: Keyword) =>
          [
            `"${kw.keyword}"`,
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
      link.download = `${selectedMedia.name}_keywords.csv`
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
          <div>
            <h1 className="text-[15px] font-semibold text-zinc-900 tracking-tight">
              媒体カタログ
            </h1>
            <p className="text-[13px] text-zinc-400 mt-0.5">
              媒体の獲得キーワード・流入経路を確認
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search input */}
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

            {/* Category filter */}
            <div className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="px-3 py-2 border border-zinc-200 rounded-md text-[13px] text-zinc-600 bg-white flex items-center gap-2 hover:bg-zinc-50 transition"
              >
                {CATEGORY_LABELS[categoryFilter]}
                <ChevronDown className="w-4 h-4" />
              </button>

              {showCategoryDropdown && (
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
              )}
            </div>

            {/* Refresh button */}
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

      {/* Content area */}
      <div className="flex">
        {/* Main table area */}
        <div className={`flex-1 p-6 ${selectedMedia ? 'pr-0' : ''}`}>
          {error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-[13px]">
              {error}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span className="ml-2 text-[13px] text-zinc-500">読み込み中...</span>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-[13px]">
              媒体が見つかりません
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="text-left px-4 py-3 text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
                      媒体名
                    </th>
                    <th className="text-left px-4 py-3 text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
                      ドメイン
                    </th>
                    <th className="text-right px-4 py-3 text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
                      月間トラフィック
                    </th>
                    <th className="text-right px-4 py-3 text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
                      KW数
                    </th>
                    <th className="text-center px-4 py-3 text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
                      流入構成
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mediaList.map((media) => (
                    <tr
                      key={media.id}
                      onClick={() => setSelectedMedia(media)}
                      className={`border-b border-zinc-100 cursor-pointer transition ${
                        selectedMedia?.id === media.id
                          ? 'bg-teal-50'
                          : 'hover:bg-zinc-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-[14px] font-medium text-zinc-900">
                          {media.name}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {CATEGORY_LABELS[media.category] || media.category}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[13px] text-zinc-400">
                          {media.domain || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-[14px] font-medium text-zinc-900">
                          {formatNumber(media.monthly_visits)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-[14px] font-medium text-zinc-900">
                          {formatNumber(media.keyword_count)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {media.latest_traffic ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 h-1.5 bg-zinc-100 rounded-full flex overflow-hidden">
                              <div
                                className="bg-teal-500"
                                style={{ width: `${media.latest_traffic.search_pct}%` }}
                              />
                              <div
                                className="bg-amber-500"
                                style={{ width: `${media.latest_traffic.direct_pct}%` }}
                              />
                              <div
                                className="bg-zinc-400"
                                style={{ width: `${media.latest_traffic.referral_pct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-[12px] text-zinc-400">-</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Side panel */}
        {selectedMedia && (
          <div className="w-[400px] border-l border-zinc-200 bg-white h-[calc(100vh-120px)] overflow-y-auto sticky top-[73px]">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="text-[15px] font-semibold text-zinc-900">
                  {selectedMedia.name}
                </div>
                <div className="flex items-center gap-1 text-[12px] text-zinc-400 mt-0.5">
                  <Globe className="w-3 h-3" />
                  {selectedMedia.domain || 'ドメイン未設定'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedMedia.domain && (
                  <a
                    href={`https://${selectedMedia.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-zinc-100 transition"
                  >
                    <ExternalLink className="w-4 h-4 text-zinc-400" />
                  </a>
                )}
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="p-1.5 rounded-md hover:bg-zinc-100 transition"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Summary section */}
            <div className="px-5 py-4 border-b border-zinc-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-1">
                    <Users className="w-3.5 h-3.5" />
                    月間トラフィック
                  </div>
                  <div className="text-[18px] font-bold text-zinc-900">
                    {formatNumber(selectedMedia.monthly_visits)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-1">
                    <BarChart2 className="w-3.5 h-3.5" />
                    獲得KW数
                  </div>
                  <div className="text-[18px] font-bold text-zinc-900">
                    {formatNumber(selectedMedia.keyword_count)}
                  </div>
                </div>
              </div>

              {/* Traffic sources */}
              {selectedMedia.latest_traffic && (
                <div className="mt-4">
                  <div className="text-[11px] text-zinc-400 mb-2">流入経路の内訳</div>
                  <div className="space-y-2">
                    <TrafficSourceRow
                      color="#0D9488"
                      label="オーガニック検索"
                      value={selectedMedia.latest_traffic.search_pct}
                    />
                    <TrafficSourceRow
                      color="#F59E0B"
                      label="ダイレクト"
                      value={selectedMedia.latest_traffic.direct_pct}
                    />
                    <TrafficSourceRow
                      color="#6366F1"
                      label="リファラル"
                      value={selectedMedia.latest_traffic.referral_pct}
                    />
                    <TrafficSourceRow
                      color="#EC4899"
                      label="ディスプレイ広告"
                      value={selectedMedia.latest_traffic.display_pct}
                    />
                    <TrafficSourceRow
                      color="#8B5CF6"
                      label="SNS"
                      value={selectedMedia.latest_traffic.social_pct}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Keywords section */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-zinc-900">
                  獲得キーワード
                  {keywordStats && (
                    <span className="ml-2 text-[12px] font-normal text-zinc-400">
                      ({keywordStats.total}件)
                    </span>
                  )}
                </span>
                <button
                  onClick={handleDownloadCSV}
                  className="text-[12px] text-teal-600 flex items-center gap-1 hover:text-teal-700 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
              </div>

              {/* Keyword stats summary */}
              {keywordStats && (
                <div className="flex gap-4 mb-4 text-[12px] bg-zinc-50 p-3 rounded-lg">
                  <div>
                    <div className="text-zinc-400">総検索ボリューム</div>
                    <div className="font-semibold text-zinc-900">
                      {formatNumber(keywordStats.total_monthly_search_volume)}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400">推定流入数合計</div>
                    <div className="font-semibold text-zinc-900">
                      {formatNumber(keywordStats.total_estimated_traffic)}
                    </div>
                  </div>
                </div>
              )}

              {/* Keywords list */}
              {isLoadingKeywords ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                </div>
              ) : keywords.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-[13px]">
                  キーワードデータがありません
                </div>
              ) : (
                <div className="space-y-1">
                  {keywords.map((kw) => (
                    <div
                      key={kw.id}
                      className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-zinc-900 truncate">
                          {kw.keyword}
                        </div>
                        <div className="text-[11px] text-zinc-400 flex gap-2">
                          <span>Vol: {formatNumber(kw.monthly_search_volume)}</span>
                          <span>SEO難易度: {kw.seo_difficulty ?? '-'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-[13px] font-medium text-zinc-900">
                            {kw.search_rank ? `${kw.search_rank}位` : '-'}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            流入: {formatNumber(kw.estimated_traffic)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* View all button */}
              {keywords.length > 0 && keywordStats && keywordStats.total > 20 && (
                <button
                  onClick={() => router.push(`/dashboard/catalog/${selectedMedia.id}/keywords`)}
                  className="w-full mt-4 py-2 text-[13px] text-teal-600 border border-teal-200 rounded-md hover:bg-teal-50 transition"
                >
                  すべてのキーワードを見る ({keywordStats.total}件)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function TrafficSourceRow({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-[12px] text-zinc-600">{label}</span>
      </div>
      <span className="text-[12px] font-medium text-zinc-900">
        {value.toFixed(1)}%
      </span>
    </div>
  )
}
