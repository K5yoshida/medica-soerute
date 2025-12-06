'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
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
  FileText,
} from 'lucide-react'
import {
  KeywordFiltersBar,
  KeywordFilters,
  defaultFilters,
  filtersToQueryParams,
} from '@/components/catalog/keyword-filters'
import { DocumentSidebar } from '@/components/catalog/document-sidebar'
import { SimpleTable, ColumnDef } from '@/components/ui/data-table'

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

interface IntentStat {
  count: number
  volume: number
  traffic: number
}

interface IntentStats {
  A: IntentStat
  B: IntentStat
  C: IntentStat
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
  const [intentStats, setIntentStats] = useState<IntentStats | null>(null)
  const [filters, setFilters] = useState<KeywordFilters>(defaultFilters)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('monthly_search_volume')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 資料サイドバー状態
  const [isDocumentSidebarOpen, setIsDocumentSidebarOpen] = useState(false)

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
      setIntentStats(data.data?.intent_stats || null)
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

  const totalPages = Math.ceil(totalCount / pageSize)

  // SimpleTable用カラム定義
  const columns: ColumnDef<Keyword>[] = [
    {
      id: 'seo_difficulty',
      label: 'SEO難易度',
      width: 130,
      align: 'center',
      sortable: true,
      cell: (kw) =>
        kw.seo_difficulty !== null ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: '#F4F4F5' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${kw.seo_difficulty}%`,
                  background: kw.seo_difficulty > 70 ? '#EF4444' : kw.seo_difficulty > 40 ? '#F59E0B' : '#22C55E',
                }}
              />
            </div>
            <span style={{ fontSize: '12px', color: '#52525B', width: '24px', textAlign: 'center' }}>
              {kw.seo_difficulty}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: '#A1A1AA' }}>-</span>
        ),
    },
    {
      id: 'monthly_search_volume',
      label: '月間検索数',
      width: 130,
      align: 'center',
      sortable: true,
      cell: (kw) => (
        <span style={{ fontSize: '13px', color: '#18181B' }}>{formatNumber(kw.monthly_search_volume)}</span>
      ),
    },
    {
      id: 'search_rank',
      label: '検索順位',
      width: 100,
      align: 'center',
      sortable: true,
      cell: (kw) => (
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>
          {kw.search_rank ? kw.search_rank : '-'}
        </span>
      ),
    },
    {
      id: 'estimated_traffic',
      label: '推定流入数',
      width: 130,
      align: 'center',
      sortable: true,
      cell: (kw) => (
        <span style={{ fontSize: '13px', color: '#18181B' }}>{formatNumber(kw.estimated_traffic)}</span>
      ),
    },
    {
      id: 'cpc_usd',
      label: 'CPC ($)',
      width: 110,
      align: 'center',
      sortable: true,
      cell: (kw) => (
        <span style={{ fontSize: '12px', color: '#52525B' }}>
          {kw.cpc_usd !== null ? `$${kw.cpc_usd.toFixed(2)}` : '-'}
        </span>
      ),
    },
    {
      id: 'competition',
      label: '競合性',
      width: 82,
      align: 'center',
      sortable: true,
      cell: (kw) => (
        <span style={{ fontSize: '12px', color: '#52525B' }}>
          {kw.competition !== null ? kw.competition : '-'}
        </span>
      ),
    },
    {
      id: 'url',
      label: 'URL',
      width: 90,
      align: 'center',
      cell: (kw) =>
        kw.url ? (
          <a
            href={kw.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex p-1 rounded hover:bg-zinc-100 transition"
            title={kw.url}
            style={{ color: '#0D9488' }}
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowUpRight className="w-4 h-4" />
          </a>
        ) : (
          <span style={{ fontSize: '12px', color: '#A1A1AA' }}>-</span>
        ),
    },
  ]

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

        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-6 py-4" style={{ background: '#FAFAFA', borderBottom: '1px solid #E4E4E7' }}>
        <div className="flex items-center" style={{ gap: '16px' }}>
          <div
            className="flex items-center"
            style={{
              gap: '12px',
              background: '#FFFFFF',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #E4E4E7',
            }}
          >
            <BarChart2 className="w-5 h-5" style={{ color: '#0D9488' }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA' }}>KW数</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#18181B' }}>
                {formatNumber(keywordStats?.total || 0)}
              </div>
            </div>
          </div>
          <div
            className="flex items-center"
            style={{
              gap: '12px',
              background: '#FFFFFF',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #E4E4E7',
            }}
          >
            <Users className="w-5 h-5" style={{ color: '#D97706' }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA' }}>月間Vol合計</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#18181B' }}>
                {formatCompactNumber(keywordStats?.total_monthly_search_volume)}
              </div>
            </div>
          </div>
          <div
            className="flex items-center"
            style={{
              gap: '12px',
              background: '#FFFFFF',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #E4E4E7',
            }}
          >
            <TrendingUp className="w-5 h-5" style={{ color: '#EF4444' }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA' }}>推定流入合計</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#18181B' }}>
                {formatCompactNumber(keywordStats?.total_estimated_traffic)}
              </div>
            </div>
          </div>

          {/* 流入経路グラフ */}
          {media.latest_traffic && (
            <div
              className="flex items-center"
              style={{
                gap: '12px',
                background: '#FFFFFF',
                padding: '16px 20px',
                borderRadius: '8px',
                border: '1px solid #E4E4E7',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA', marginRight: '8px' }}>流入経路</div>
              <div className="flex items-center gap-1">
                <div className="w-32 h-1.5 bg-zinc-100 rounded-full flex overflow-hidden">
                  <div className="bg-teal-500" style={{ width: `${media.latest_traffic.search_pct}%` }} title="検索" />
                  <div className="bg-amber-500" style={{ width: `${media.latest_traffic.direct_pct}%` }} title="直接" />
                  <div className="bg-indigo-500" style={{ width: `${media.latest_traffic.referral_pct}%` }} title="参照" />
                  <div className="bg-pink-500" style={{ width: `${media.latest_traffic.display_pct}%` }} title="広告" />
                  <div className="bg-purple-500" style={{ width: `${media.latest_traffic.social_pct}%` }} title="SNS" />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#52525B', marginLeft: '4px' }}>
                  検索 {media.latest_traffic.search_pct.toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* 意図別構成 */}
          {intentStats && (
            <div
              style={{
                background: '#FFFFFF',
                padding: '12px 20px',
                borderRadius: '8px',
                border: '1px solid #E4E4E7',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA', marginBottom: '8px' }}>応募意図別構成</div>
              <div className="flex items-center gap-4">
                {/* 横棒グラフ */}
                <div className="flex items-center gap-2">
                  <div className="w-40 h-3 bg-zinc-100 rounded-full flex overflow-hidden">
                    {(() => {
                      const total = intentStats.A.count + intentStats.B.count + intentStats.C.count
                      if (total === 0) return null
                      const aPct = (intentStats.A.count / total) * 100
                      const bPct = (intentStats.B.count / total) * 100
                      const cPct = (intentStats.C.count / total) * 100
                      return (
                        <>
                          <div className="bg-rose-500" style={{ width: `${aPct}%` }} title={`応募直前 ${aPct.toFixed(0)}%`} />
                          <div className="bg-amber-500" style={{ width: `${bPct}%` }} title={`比較検討 ${bPct.toFixed(0)}%`} />
                          <div className="bg-sky-500" style={{ width: `${cPct}%` }} title={`情報収集 ${cPct.toFixed(0)}%`} />
                        </>
                      )
                    })()}
                  </div>
                </div>
                {/* 凡例と数値 */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#E11D48' }}>応募直前</span>
                    <span style={{ fontSize: '11px', color: '#52525B' }}>{formatCompactNumber(intentStats.A.traffic)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#D97706' }}>比較検討</span>
                    <span style={{ fontSize: '11px', color: '#52525B' }}>{formatCompactNumber(intentStats.B.traffic)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-sky-500" />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#0284C7' }}>情報収集</span>
                    <span style={{ fontSize: '11px', color: '#52525B' }}>{formatCompactNumber(intentStats.C.traffic)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 資料閲覧ボタン（右端） */}
          <button
            onClick={() => setIsDocumentSidebarOpen(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-[13px] font-medium rounded-md hover:bg-teal-700 transition"
          >
            <FileText className="w-4 h-4" />
            資料閲覧
          </button>
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
        <SimpleTable<Keyword>
          data={keywords}
          getRowKey={(kw) => kw.id}
          fixedColumn={{
            width: 360,
            header: (
              <div className="flex items-center">
                <span className="flex-1">キーワード</span>
                <span style={{ width: '90px', flexShrink: 0, borderLeft: '1px solid #E4E4E7', paddingLeft: '12px' }}>意図</span>
              </div>
            ),
            cell: (kw) => (
              <div className="flex items-center">
                <div className="flex-1 min-w-0 pr-3">
                  <span className="row-primary-text text-sm font-medium text-zinc-900 transition truncate block">
                    {kw.keyword}
                  </span>
                </div>
                <div style={{ width: '90px', flexShrink: 0, textAlign: 'center', borderLeft: '1px solid #E4E4E7', paddingLeft: '12px' }}>
                  {kw.intent && INTENT_LABELS[kw.intent] ? (
                    <span
                      className={`inline-flex rounded ${INTENT_LABELS[kw.intent].bgColor} ${INTENT_LABELS[kw.intent].color}`}
                      style={{ padding: '2px 6px', fontSize: '10px', fontWeight: 600, borderRadius: '4px' }}
                    >
                      {INTENT_LABELS[kw.intent].label}
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#A1A1AA' }}>-</span>
                  )}
                </div>
              </div>
            ),
          }}
          columns={columns}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          isLoading={isLoadingKeywords}
          emptyMessage="キーワードが見つかりません"
          maxHeight="calc(100vh - 340px)"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span style={{ fontSize: '13px', color: '#A1A1AA' }}>
              {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} / {formatNumber(totalCount)} 件
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  color: '#52525B',
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span style={{ fontSize: '13px', color: '#52525B', padding: '0 8px' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  color: '#52525B',
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 資料サイドバー */}
      <DocumentSidebar
        isOpen={isDocumentSidebarOpen}
        onClose={() => setIsDocumentSidebarOpen(false)}
        mediaId={id}
        mediaName={media?.name || ''}
      />
    </>
  )
}
