'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  FileText,
  RotateCcw,
} from 'lucide-react'
import { DocumentSidebar } from '@/components/catalog/document-sidebar'
import { FilterDropdown, KeywordFilterDropdown } from '@/components/catalog/rakko-filter-dropdown'

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
  keyword_id?: string
  keyword: string
  monthly_search_volume: number | null
  search_rank: number | null
  ranking_position?: number | null
  estimated_traffic: number | null
  seo_difficulty: number | null
  cpc_usd: number | null
  cpc?: number | null
  competition: number | null
  competition_level?: number | null
  url: string | null
  landing_url?: string | null
  // 新スキーマ: intentとquery_typeは直接プロパティとして返される
  intent: string | null
  query_type: string | null
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

// 検索目的ラベル（keywords.query_type）
const QUERY_TYPE_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  Do: { label: 'Do', color: '#E11D48', bgColor: '#FFE4E6' },
  Know: { label: 'Know', color: '#0284C7', bgColor: '#E0F2FE' },
  Go: { label: 'Go', color: '#7C3AED', bgColor: '#EDE9FE' },
  Buy: { label: 'Buy', color: '#D97706', bgColor: '#FEF3C7' },
}

// 検索段階ラベル（keywords.intent）- 4カテゴリ: branded, transactional, informational, b2b
const INTENT_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  branded: { label: '指名検索', color: '#7C3AED', bgColor: '#EDE9FE' },
  transactional: { label: '応募意図', color: '#E11D48', bgColor: '#FFE4E6' },
  informational: { label: '情報収集', color: '#0284C7', bgColor: '#E0F2FE' },
  b2b: { label: '法人向け', color: '#059669', bgColor: '#D1FAE5' },
  unknown: { label: '未分類', color: '#71717A', bgColor: '#F4F4F5' },
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  return num.toLocaleString('ja-JP')
}

function _formatCompactNumber(num: number | null | undefined): string {
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
  const searchParams = useSearchParams()
  const id = params.id as string

  // URLパラメータからキーワードを取得（カタログページからの遷移時）
  const initialKeywords = searchParams.get('keywords') || ''

  const [media, setMedia] = useState<MediaDetail | null>(null)
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [_keywordStats, setKeywordStats] = useState<KeywordStats | null>(null)
  const [_intentStats, setIntentStats] = useState<IntentStats | null>(null)

  // フィルター状態（URLパラメータで初期化）
  const [includeKeywords, setIncludeKeywords] = useState(initialKeywords)
  const [excludeKeywords, setExcludeKeywords] = useState('')
  const [seoDifficulty, setSeoDifficulty] = useState<{ min: number | null; max: number | null }>({ min: null, max: null })
  const [searchVolume, setSearchVolume] = useState<{ min: number | null; max: number | null }>({ min: null, max: null })
  const [searchRank, setSearchRank] = useState<{ min: number | null; max: number | null }>({ min: null, max: null })
  const [estimatedTraffic, setEstimatedTraffic] = useState<{ min: number | null; max: number | null }>({ min: null, max: null })
  const [cpc, setCpc] = useState<{ min: number | null; max: number | null }>({ min: null, max: null })
  const [competition, setCompetition] = useState<{ min: number | null; max: number | null }>({ min: null, max: null })

  // フィルターがアクティブか判定
  const hasActiveFilters =
    includeKeywords !== '' ||
    excludeKeywords !== '' ||
    seoDifficulty.min !== null || seoDifficulty.max !== null ||
    searchVolume.min !== null || searchVolume.max !== null ||
    searchRank.min !== null || searchRank.max !== null ||
    estimatedTraffic.min !== null || estimatedTraffic.max !== null ||
    cpc.min !== null || cpc.max !== null ||
    competition.min !== null || competition.max !== null

  // 全フィルターリセット
  const handleResetFilters = () => {
    setIncludeKeywords('')
    setExcludeKeywords('')
    setSeoDifficulty({ min: null, max: null })
    setSearchVolume({ min: null, max: null })
    setSearchRank({ min: null, max: null })
    setEstimatedTraffic({ min: null, max: null })
    setCpc({ min: null, max: null })
    setCompetition({ min: null, max: null })
    setCurrentPage(1)
  }

  const [searchQuery] = useState('')
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
      if (seoDifficulty.min !== null) params.set('seo_difficulty_min', String(seoDifficulty.min))
      if (seoDifficulty.max !== null) params.set('seo_difficulty_max', String(seoDifficulty.max))
      if (searchVolume.min !== null) params.set('search_volume_min', String(searchVolume.min))
      if (searchVolume.max !== null) params.set('search_volume_max', String(searchVolume.max))
      if (searchRank.min !== null) params.set('rank_min', String(searchRank.min))
      if (searchRank.max !== null) params.set('rank_max', String(searchRank.max))
      if (estimatedTraffic.min !== null) params.set('estimated_traffic_min', String(estimatedTraffic.min))
      if (estimatedTraffic.max !== null) params.set('estimated_traffic_max', String(estimatedTraffic.max))
      if (cpc.min !== null) params.set('cpc_min', String(cpc.min))
      if (cpc.max !== null) params.set('cpc_max', String(cpc.max))
      if (competition.min !== null) params.set('competition_min', String(competition.min))
      if (competition.max !== null) params.set('competition_max', String(competition.max))

      const res = await fetch(`/api/media/${id}/keywords?${params.toString()}`)
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'キーワードの取得に失敗しました')
      }

      // キーワードフィルターはフロントエンドで適用
      let filteredKeywords = data.data?.keywords || []
      if (includeKeywords) {
        const includes = includeKeywords.split(/[\s\n]+/).filter(k => k.trim())
        if (includes.length > 0) {
          filteredKeywords = filteredKeywords.filter((kw: Keyword) =>
            includes.some(inc => kw.keyword.toLowerCase().includes(inc.toLowerCase()))
          )
        }
      }
      if (excludeKeywords) {
        const excludes = excludeKeywords.split(/[\s\n]+/).filter(k => k.trim())
        if (excludes.length > 0) {
          filteredKeywords = filteredKeywords.filter((kw: Keyword) =>
            !excludes.some(exc => kw.keyword.toLowerCase().includes(exc.toLowerCase()))
          )
        }
      }

      setKeywords(filteredKeywords)
      setKeywordStats(data.data?.stats || null)
      setIntentStats(data.data?.intent_stats || null)
      setTotalCount(data.pagination?.total || 0)
    } catch (err) {
      console.error('Failed to fetch keywords:', err)
    } finally {
      setIsLoadingKeywords(false)
    }
  }, [id, currentPage, sortBy, sortOrder, searchQuery, seoDifficulty, searchVolume, searchRank, estimatedTraffic, cpc, competition, includeKeywords, excludeKeywords])

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

  // ソート可能なヘッダーセル
  const SortableHeader = ({ label, columnId }: { label: string; columnId: string }) => (
    <th
      onClick={() => handleSort(columnId)}
      style={{
        textAlign: 'center',
        padding: '12px 8px',
        fontSize: '12px',
        fontWeight: 500,
        color: '#52525B',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        background: '#FAFAFA',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
        <span>{label}</span>
        <span style={{ fontSize: '10px', color: sortBy === columnId ? '#0D9488' : '#D4D4D8' }}>
          {sortBy === columnId ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </div>
    </th>
  )

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

          {/* 資料閲覧ボタン */}
          <button
            onClick={() => setIsDocumentSidebarOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-[13px] font-medium rounded-md hover:bg-teal-700 transition"
          >
            <FileText className="w-4 h-4" />
            資料閲覧
          </button>
        </div>
      </header>

      {/* Stats Cards - SimilarWeb データ */}
      <div style={{ padding: '12px 24px', background: '#FAFAFA', borderBottom: '1px solid #E4E4E7', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px', width: '100%' }}>
          {/* 月間訪問数 */}
          <div
            style={{
              flex: 0.7,
              background: '#FFFFFF',
              padding: '12px 16px',
              borderRadius: '6px',
              border: '1px solid #E4E4E7',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA', marginBottom: '4px' }}>月間訪問</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#18181B' }}>
              {formatNumber(media.monthly_visits)}
            </div>
          </div>

          {/* 直帰率 */}
          <div
            style={{
              flex: 0.7,
              background: '#FFFFFF',
              padding: '12px 16px',
              borderRadius: '6px',
              border: '1px solid #E4E4E7',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA', marginBottom: '4px' }}>直帰率</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#18181B' }}>
              {media.bounce_rate !== null ? `${media.bounce_rate.toFixed(2)}%` : '-'}
            </div>
          </div>

          {/* PV/訪問 */}
          <div
            style={{
              flex: 0.7,
              background: '#FFFFFF',
              padding: '12px 16px',
              borderRadius: '6px',
              border: '1px solid #E4E4E7',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA', marginBottom: '4px' }}>PV/訪問</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#18181B' }}>
              {media.pages_per_visit !== null ? media.pages_per_visit.toFixed(1) : '-'}
            </div>
          </div>

          {/* 平均滞在時間 */}
          <div
            style={{
              flex: 0.7,
              background: '#FFFFFF',
              padding: '12px 16px',
              borderRadius: '6px',
              border: '1px solid #E4E4E7',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA', marginBottom: '4px' }}>平均滞在</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#18181B' }}>
              {media.avg_visit_duration !== null
                ? `${Math.floor(media.avg_visit_duration / 60)}:${String(media.avg_visit_duration % 60).padStart(2, '0')}`
                : '-'}
            </div>
          </div>

          {/* 流入経路 */}
          {media.latest_traffic && (
            <div
              style={{
                flex: 3,
                background: '#FFFFFF',
                padding: '12px 16px',
                borderRadius: '6px',
                border: '1px solid #E4E4E7',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA', marginBottom: '4px' }}>流入経路</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0D9488' }}>
                    {media.latest_traffic.search_pct.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '9px', color: '#A1A1AA' }}>検索</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#F59E0B' }}>
                    {media.latest_traffic.direct_pct.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '9px', color: '#A1A1AA' }}>直接</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#6366F1' }}>
                    {media.latest_traffic.referral_pct.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '9px', color: '#A1A1AA' }}>参照</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#EC4899' }}>
                    {media.latest_traffic.display_pct.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '9px', color: '#A1A1AA' }}>広告</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#06B6D4' }}>
                    {media.latest_traffic.email_pct.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '9px', color: '#A1A1AA' }}>メール</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#A855F7' }}>
                    {media.latest_traffic.social_pct.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '9px', color: '#A1A1AA' }}>SNS</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 24px', background: '#FFFFFF', borderBottom: '1px solid #E4E4E7', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* キーワードフィルター */}
          <KeywordFilterDropdown
            includeKeywords={includeKeywords}
            excludeKeywords={excludeKeywords}
            onIncludeChange={(v) => { setIncludeKeywords(v); setCurrentPage(1) }}
            onExcludeChange={(v) => { setExcludeKeywords(v); setCurrentPage(1) }}
          />

          {/* SEO難易度 */}
          <FilterDropdown
            label="SEO難易度"
            value={seoDifficulty}
            onChange={(v) => { setSeoDifficulty(v); setCurrentPage(1) }}
            presets={[
              { label: '1-33', min: 1, max: 33 },
              { label: '34-66', min: 34, max: 66 },
              { label: '67-100', min: 67, max: 100 },
            ]}
          />

          {/* 検索順位 */}
          <FilterDropdown
            label="検索順位"
            value={searchRank}
            onChange={(v) => { setSearchRank(v); setCurrentPage(1) }}
            presets={[
              { label: '1-3', min: 1, max: 3 },
              { label: '1-10', min: 1, max: 10 },
              { label: '1-20', min: 1, max: 20 },
              { label: '4-10', min: 4, max: 10 },
              { label: '11-20', min: 11, max: 20 },
              { label: '21+', min: 21, max: null },
            ]}
          />

          {/* 月間検索数 */}
          <FilterDropdown
            label="月間検索数"
            value={searchVolume}
            onChange={(v) => { setSearchVolume(v); setCurrentPage(1) }}
            presets={[
              { label: '0', min: 0, max: 0 },
              { label: '1-1000', min: 1, max: 1000 },
              { label: '1001-10000', min: 1001, max: 10000 },
              { label: '10001-100000', min: 10001, max: 100000 },
              { label: '100001+', min: 100001, max: null },
            ]}
          />

          {/* CPC ($) */}
          <FilterDropdown
            label="CPC ($)"
            value={cpc}
            onChange={(v) => { setCpc(v); setCurrentPage(1) }}
            presets={[
              { label: '0', min: 0, max: 0 },
              { label: '0.01-1', min: 0.01, max: 1 },
              { label: '1.01-10', min: 1.01, max: 10 },
              { label: '10.01+', min: 10.01, max: null },
            ]}
            allowDecimal
          />

          {/* 競合性 */}
          <FilterDropdown
            label="競合性"
            value={competition}
            onChange={(v) => { setCompetition(v); setCurrentPage(1) }}
            presets={[
              { label: '0', min: 0, max: 0 },
              { label: '1-33', min: 1, max: 33 },
              { label: '34-66', min: 34, max: 66 },
              { label: '67-100', min: 67, max: 100 },
            ]}
          />

          {/* 推定流入数 */}
          <FilterDropdown
            label="推定流入数"
            value={estimatedTraffic}
            onChange={(v) => { setEstimatedTraffic(v); setCurrentPage(1) }}
            presets={[
              { label: '0', min: 0, max: 0 },
              { label: '1-1000', min: 1, max: 1000 },
              { label: '1001-10000', min: 1001, max: 10000 },
              { label: '10001+', min: 10001, max: null },
            ]}
          />

          {/* リセットボタン */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              リセット
            </button>
          )}
        </div>
      </div>

      {/* Keywords Table */}
      <div style={{ padding: '24px', width: '100%' }}>
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E4E4E7' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#52525B',
                      whiteSpace: 'nowrap',
                      background: '#FAFAFA',
                    }}
                  >
                    キーワード
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '12px 8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#52525B',
                      whiteSpace: 'nowrap',
                      background: '#FAFAFA',
                    }}
                  >
                    検索目的
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '12px 8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#52525B',
                      whiteSpace: 'nowrap',
                      background: '#FAFAFA',
                    }}
                  >
                    検索段階
                  </th>
                  <SortableHeader label="SEO難易度" columnId="seo_difficulty" />
                  <SortableHeader label="月間検索数" columnId="monthly_search_volume" />
                  <SortableHeader label="検索順位" columnId="search_rank" />
                  <SortableHeader label="推定流入数" columnId="estimated_traffic" />
                  <SortableHeader label="CPC ($)" columnId="cpc_usd" />
                  <SortableHeader label="競合性" columnId="competition" />
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '12px 8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#52525B',
                      whiteSpace: 'nowrap',
                      background: '#FAFAFA',
                    }}
                  >
                    URL
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingKeywords ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '48px' }}>
                      <Loader2 style={{ width: 24, height: 24, color: '#0D9488', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                      <span style={{ marginLeft: '8px', fontSize: '13px', color: '#52525B' }}>読み込み中...</span>
                    </td>
                  </tr>
                ) : keywords.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '48px', color: '#A1A1AA', fontSize: '13px' }}>
                      キーワードが見つかりません
                    </td>
                  </tr>
                ) : (
                  keywords.map((kw, index) => (
                    <tr
                      key={kw.id}
                      style={{
                        borderBottom: index < keywords.length - 1 ? '1px solid #F4F4F5' : 'none',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FAFAFA'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      {/* キーワード */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>
                          {kw.keyword}
                        </span>
                      </td>
                      {/* 検索目的 */}
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        {kw.query_type && QUERY_TYPE_LABELS[kw.query_type] ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              background: QUERY_TYPE_LABELS[kw.query_type].bgColor,
                              color: QUERY_TYPE_LABELS[kw.query_type].color,
                            }}
                          >
                            {QUERY_TYPE_LABELS[kw.query_type].label}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#A1A1AA' }}>-</span>
                        )}
                      </td>
                      {/* 検索段階 */}
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        {kw.intent && INTENT_LABELS[kw.intent] ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              background: INTENT_LABELS[kw.intent].bgColor,
                              color: INTENT_LABELS[kw.intent].color,
                            }}
                          >
                            {INTENT_LABELS[kw.intent].label}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#A1A1AA' }}>-</span>
                        )}
                      </td>
                      {/* SEO難易度 */}
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        {kw.seo_difficulty !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <div style={{ width: '40px', height: '6px', borderRadius: '3px', overflow: 'hidden', background: '#F4F4F5' }}>
                              <div
                                style={{
                                  height: '100%',
                                  borderRadius: '3px',
                                  width: `${kw.seo_difficulty}%`,
                                  background: kw.seo_difficulty > 70 ? '#EF4444' : kw.seo_difficulty > 40 ? '#F59E0B' : '#22C55E',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '12px', color: '#52525B' }}>{kw.seo_difficulty}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#A1A1AA' }}>-</span>
                        )}
                      </td>
                      {/* 月間検索数 */}
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                        {formatNumber(kw.monthly_search_volume)}
                      </td>
                      {/* 検索順位 */}
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: 500, color: '#18181B' }}>
                        {kw.search_rank || '-'}
                      </td>
                      {/* 推定流入数 */}
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', color: '#18181B' }}>
                        {formatNumber(kw.estimated_traffic)}
                      </td>
                      {/* CPC ($) */}
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', color: '#52525B' }}>
                        {kw.cpc_usd !== null ? `$${kw.cpc_usd.toFixed(2)}` : '-'}
                      </td>
                      {/* 競合性 */}
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', color: '#52525B' }}>
                        {kw.competition !== null ? kw.competition : '-'}
                      </td>
                      {/* URL */}
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        {kw.url ? (
                          <a
                            href={kw.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#0D9488' }}
                            title={kw.url}
                          >
                            <ArrowUpRight style={{ width: 16, height: 16 }} />
                          </a>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#A1A1AA' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

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
