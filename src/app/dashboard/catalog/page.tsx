'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  HelpCircle,
  X,
  List,
} from 'lucide-react'
import { MediaSearch } from '@/components/catalog/media-search'
import { RankingResults } from '@/components/catalog/ranking-results'

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
  intent_a_pct: number | null
  intent_b_pct: number | null
  intent_c_pct: number | null
}

interface RankingResult {
  media_id: string
  media_name: string
  domain: string | null
  matched_keyword_count: number
  total_estimated_traffic: number
  intent_a_count: number
  intent_a_pct: number
  monthly_visits: number | null
  top_keywords: Array<{
    keyword: string
    monthly_search_volume: number
    estimated_traffic: number
    search_rank: number
  }>
}

interface ColumnHelp {
  title: string
  description: string
  source: string
  note?: string
}

const COLUMN_HELP: Record<string, ColumnHelp> = {
  monthly_visits: {
    title: '月間訪問数',
    description: 'サイト全体の月間ユニーク訪問者数です。検索・直接アクセス・SNS・広告など、すべての流入経路からの訪問を含みます。',
    source: 'SimilarWeb',
    note: '直近1ヶ月のデータを表示しています。',
  },
  bounce_rate: {
    title: '直帰率',
    description: 'サイトに訪問後、他のページを閲覧せずに離脱した訪問者の割合です。低いほどサイト内の回遊性が高いことを示します。',
    source: 'SimilarWeb',
    note: '一般的に40%以下が良好とされています。',
  },
  pages_per_visit: {
    title: 'PV/訪問',
    description: '1回の訪問あたりの平均閲覧ページ数です。高いほどユーザーがサイト内のコンテンツを多く閲覧していることを示します。',
    source: 'SimilarWeb',
  },
  avg_visit_duration: {
    title: '滞在時間',
    description: '1回の訪問あたりの平均滞在時間です。長いほどユーザーがコンテンツをじっくり閲覧していることを示します。',
    source: 'SimilarWeb',
    note: '求人サイトでは3分以上が良好とされています。',
  },
  search_pct: {
    title: '検索流入',
    description: 'Google等の検索エンジンからの流入割合です。オーガニック検索（自然検索）と有料検索（リスティング広告）の合計です。',
    source: 'SimilarWeb',
    note: 'SEO対策の効果を測る指標として重要です。',
  },
  direct_pct: {
    title: '直接流入',
    description: 'URLを直接入力したり、ブックマークからアクセスした訪問の割合です。ブランド認知度の指標となります。',
    source: 'SimilarWeb',
  },
  referral_pct: {
    title: '参照流入',
    description: '他のWebサイトからのリンク経由でアクセスした訪問の割合です。外部サイトでの露出度を示します。',
    source: 'SimilarWeb',
  },
  display_pct: {
    title: '広告流入',
    description: 'ディスプレイ広告（バナー広告等）からの流入割合です。有料広告への依存度を示します。',
    source: 'SimilarWeb',
  },
  social_pct: {
    title: 'SNS流入',
    description: 'Twitter、Facebook、Instagram等のSNSからの流入割合です。ソーシャルメディアでの認知度を示します。',
    source: 'SimilarWeb',
  },
  keyword_count: {
    title: 'クエリ数',
    description: 'この媒体が検索上位を獲得しているクエリの数です。多いほどSEOが強いことを示します。',
    source: 'ラッコキーワード',
    note: '検索順位100位以内のクエリを集計しています。',
  },
  total_search_volume: {
    title: '月間Vol合計',
    description: 'この媒体が獲得しているキーワードの月間検索ボリュームの合計です。ユーザーがこれらのキーワードを検索した回数の合計を示します。',
    source: 'ラッコキーワード',
    note: '検索ボリュームが大きいほど、潜在的なリーチが広いことを示します。',
  },
  estimated_traffic: {
    title: '推定流入',
    description: '各キーワードの検索ボリュームと順位から算出した、検索経由の推定月間流入数の合計です。',
    source: 'ラッコキーワード',
    note: '月間訪問数とは計算方法が異なるため、数値が一致しないことがあります。',
  },
  intent_a: {
    title: '応募直前クエリ',
    description: '「〇〇 求人」「〇〇 応募」など、求人への応募意欲が高いユーザーが検索するキーワードの割合です。',
    source: 'ラッコキーワード（AI分類）',
    note: 'コンバージョンに最も近いキーワードです。この割合が高い媒体は応募獲得に強いと言えます。',
  },
  intent_b: {
    title: '比較検討クエリ',
    description: '「〇〇 評判」「〇〇 口コミ」「〇〇 比較」など、転職先を比較検討しているユーザーが検索するキーワードの割合です。',
    source: 'ラッコキーワード（AI分類）',
    note: '検討段階のユーザーを獲得できるキーワードです。',
  },
  intent_c: {
    title: '情報収集クエリ',
    description: '「〇〇 年収」「〇〇 仕事内容」「〇〇 資格」など、業界や職種についての情報を収集しているユーザーが検索するキーワードの割合です。',
    source: 'ラッコキーワード（AI分類）',
    note: '潜在層向けのキーワードです。認知拡大に効果的です。',
  },
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

// ヘルプモーダルコンポーネント
function HelpModal({ helpKey, onClose }: { helpKey: string; onClose: () => void }) {
  const help = COLUMN_HELP[helpKey]
  if (!help) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-white rounded-lg w-full mx-4"
        style={{
          maxWidth: '480px',
          border: '1px solid #E4E4E7',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E4E4E7',
          }}
        >
          <h3
            className="font-semibold"
            style={{
              fontSize: '16px',
              color: '#18181B',
            }}
          >
            {help.title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors hover:bg-zinc-100"
            style={{ color: '#A1A1AA' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          <p
            className="leading-relaxed mb-4"
            style={{
              fontSize: '14px',
              color: '#52525B',
            }}
          >
            {help.description}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="px-2 py-0.5 rounded"
              style={{
                fontSize: '11px',
                fontWeight: 500,
                background: '#F4F4F5',
                color: '#52525B',
              }}
            >
              データソース: {help.source}
            </span>
          </div>
          {help.note && (
            <p
              className="mt-3 pt-3"
              style={{
                fontSize: '12px',
                color: '#A1A1AA',
                borderTop: '1px solid #F4F4F5',
              }}
            >
              {help.note}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ヘルプ付きテーブルヘッダーコンポーネント
function TableHeader({
  label,
  helpKey,
  align = 'center',
  width,
  borderRight,
  onHelpClick,
}: {
  label: string
  helpKey: string
  align?: 'left' | 'center' | 'right'
  width?: number
  borderRight?: boolean
  onHelpClick: (key: string) => void
}) {
  const alignClass = align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right'
  const justifyClass = align === 'left' ? '' : align === 'center' ? 'justify-center' : 'justify-end'
  return (
    <th
      className={`${alignClass} px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap`}
      style={{ background: '#FAFAFA', height: '41px', width: width ? `${width}px` : undefined, minWidth: width ? `${width}px` : undefined, borderRight: borderRight ? '1px solid #E4E4E7' : undefined }}
    >
      <div className={`flex items-center gap-1 ${justifyClass}`}>
        <span>{label}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onHelpClick(helpKey)
          }}
          className="text-zinc-300 hover:text-teal-500 transition"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </th>
  )
}

export default function CatalogPage() {
  const router = useRouter()
  const [mediaList, setMediaList] = useState<MediaMaster[]>([])
  const [tableSearchQuery, setTableSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeHelp, setActiveHelp] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pageSize = 20

  // ランキング検索用の状態
  const [rankingKeywords, setRankingKeywords] = useState<string[]>([])
  const [rankingResults, setRankingResults] = useState<RankingResult[]>([])
  const [isRankingLoading, setIsRankingLoading] = useState(false)

  // サイドバー状態をリッスン
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') {
      setSidebarCollapsed(true)
    }

    const handleSidebarToggle = (e: CustomEvent<{ collapsed: boolean }>) => {
      setSidebarCollapsed(e.detail.collapsed)
    }

    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener)
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener)
    }
  }, [])

  const contentMaxWidth = sidebarCollapsed ? '1356px' : '1200px'

  // 左右テーブルのスクロール同期用ref
  const leftTableRef = useRef<HTMLDivElement>(null)
  const rightTableRef = useRef<HTMLDivElement>(null)
  const scrollSource = useRef<'left' | 'right' | null>(null)
  const rafId = useRef<number | null>(null)

  const handleLeftScroll = () => {
    if (scrollSource.current === 'right') return
    scrollSource.current = 'left'

    if (rafId.current) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      if (rightTableRef.current && leftTableRef.current) {
        rightTableRef.current.scrollTop = leftTableRef.current.scrollTop
      }
      scrollSource.current = null
    })
  }

  const handleRightScroll = () => {
    if (scrollSource.current === 'left') return
    scrollSource.current = 'right'

    if (rafId.current) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      if (leftTableRef.current && rightTableRef.current) {
        leftTableRef.current.scrollTop = rightTableRef.current.scrollTop
      }
      scrollSource.current = null
    })
  }

  // 媒体一覧を取得
  const fetchMedia = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (tableSearchQuery) {
        params.set('search', tableSearchQuery)
      }
      params.set('sort_by', 'keyword_count')
      params.set('sort_order', 'desc')
      params.set('limit', String(pageSize))
      params.set('offset', String((currentPage - 1) * pageSize))

      const res = await fetch(`/api/media?${params.toString()}`)
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error?.message || '媒体データの取得に失敗しました')
      }

      setMediaList(data.data || [])
      setTotalCount(data.pagination?.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [tableSearchQuery, currentPage, pageSize])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  useEffect(() => {
    setCurrentPage(1)
  }, [tableSearchQuery])

  // ランキング検索
  const handleRankingSearch = useCallback(async (keywords: string) => {
    setIsRankingLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('keywords', keywords)
      params.set('sort_by', 'estimated_traffic')
      params.set('limit', '20')

      const res = await fetch(`/api/media/ranking?${params.toString()}`)
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'ランキングの取得に失敗しました')
      }

      setRankingKeywords(data.data.keywords || [])
      setRankingResults(data.data.results || [])
    } catch (err) {
      console.error('Ranking search error:', err)
      setRankingKeywords([])
      setRankingResults([])
    } finally {
      setIsRankingLoading(false)
    }
  }, [])

  const handleClearRanking = useCallback(() => {
    setRankingKeywords([])
    setRankingResults([])
  }, [])

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasRankingResults = rankingKeywords.length > 0

  return (
    <>
      {/* ヘルプモーダル */}
      {activeHelp && (
        <HelpModal helpKey={activeHelp} onClose={() => setActiveHelp(null)} />
      )}

      {/* ページヘッダー */}
      <header
        className="bg-white border-b border-zinc-200"
        style={{ position: 'sticky', top: 0, zIndex: 40 }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ maxWidth: contentMaxWidth }}
        >
          <div>
            <h1 className="text-[15px] font-semibold text-zinc-900 tracking-tight">
              媒体カタログ
            </h1>
            <p className="text-[13px] text-zinc-400 mt-0.5">
              採用条件に合った媒体を探す・比較する
            </p>
          </div>

          <div className="flex items-center gap-3">
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

      {/* コンテンツエリア */}
      <div className="p-6" style={{ maxWidth: contentMaxWidth }}>
        {/* キーワード検索ボックス */}
        <MediaSearch onSearch={handleRankingSearch} isLoading={isRankingLoading} />

        {/* ランキング結果 */}
        {hasRankingResults && (
          <RankingResults
            keywords={rankingKeywords}
            results={rankingResults}
            onClear={handleClearRanking}
          />
        )}

        {/* 全媒体一覧セクション */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-zinc-400" />
              <h3 className="font-semibold text-zinc-900" style={{ fontSize: '15px' }}>
                全媒体一覧
              </h3>
              <span className="text-zinc-400" style={{ fontSize: '13px' }}>
                （{formatNumber(totalCount)}媒体）
              </span>
            </div>

            {/* テーブル用の媒体名検索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="媒体名で検索..."
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                className="w-56 pl-9 pr-3 py-2 border border-zinc-200 rounded-md text-[13px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              />
            </div>
          </div>

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
            <>
              {/* テーブルコンテナ */}
              <div
                className="bg-white border border-zinc-200 rounded-lg"
                style={{ display: 'flex', overflow: 'hidden', position: 'relative', maxHeight: 'calc(100vh - 400px)' }}
              >
                {/* 左側: 媒体名列（固定） */}
                <div
                  ref={leftTableRef}
                  onScroll={handleLeftScroll}
                  className="hide-scrollbar"
                  style={{
                    flexShrink: 0,
                    width: '180px',
                    borderRight: '1px solid #E4E4E7',
                    background: '#FAFAFA',
                    position: 'relative',
                    zIndex: 1,
                    overflowY: 'auto',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                      <tr style={{ borderBottom: '1px solid #E4E4E7', height: '41px' }}>
                        <th
                          className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                          style={{ background: '#F4F4F5', padding: '0 16px 0 20px' }}
                        >
                          媒体名
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mediaList.map((media) => (
                        <tr
                          key={media.id}
                          onClick={() => router.push(`/dashboard/catalog/${media.id}`)}
                          onMouseEnter={() => setHoveredRowId(media.id)}
                          onMouseLeave={() => setHoveredRowId(null)}
                          className={`catalog-row ${hoveredRowId === media.id ? 'is-hovered' : ''}`}
                          style={{ borderBottom: '1px solid #F4F4F5', height: '57px' }}
                        >
                          <td style={{ padding: '0 16px 0 20px' }}>
                            <div className="flex items-center gap-3" title={`${media.name}\n${media.domain || ''}`}>
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                                {media.name.charAt(0)}
                              </div>
                              <div className="overflow-hidden">
                                <div className="flex items-center gap-1">
                                  <span className="media-name text-sm font-medium text-zinc-900 transition truncate">
                                    {media.name}
                                  </span>
                                  <svg
                                    className="inline-chevron w-3.5 h-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M9 18l6-6-6-6" />
                                  </svg>
                                </div>
                                <div className="text-xs text-zinc-400 truncate">
                                  {media.domain || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 右側: データ列 */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  <div
                    ref={rightTableRef}
                    onScroll={handleRightScroll}
                    style={{
                      width: '100%',
                      height: '100%',
                      overflowY: 'auto',
                      overflowX: 'auto',
                    }}
                  >
                    <table style={{ minWidth: '1100px', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr style={{ borderBottom: '1px solid #E4E4E7', height: '41px' }}>
                          <TableHeader label="月間訪問" helpKey="monthly_visits" width={100} onHelpClick={setActiveHelp} />
                          <TableHeader label="直帰率" helpKey="bounce_rate" width={70} onHelpClick={setActiveHelp} />
                          <TableHeader label="PV/訪問" helpKey="pages_per_visit" width={70} onHelpClick={setActiveHelp} />
                          <TableHeader label="滞在時間" helpKey="avg_visit_duration" width={80} borderRight onHelpClick={setActiveHelp} />
                          <TableHeader label="検索" helpKey="search_pct" width={60} onHelpClick={setActiveHelp} />
                          <TableHeader label="直接" helpKey="direct_pct" width={60} onHelpClick={setActiveHelp} />
                          <TableHeader label="参照" helpKey="referral_pct" width={60} onHelpClick={setActiveHelp} />
                          <TableHeader label="広告" helpKey="display_pct" width={60} onHelpClick={setActiveHelp} />
                          <TableHeader label="SNS" helpKey="social_pct" width={60} borderRight onHelpClick={setActiveHelp} />
                          <TableHeader label="クエリ数" helpKey="keyword_count" width={90} onHelpClick={setActiveHelp} />
                          <TableHeader label="月間Vol" helpKey="total_search_volume" width={100} onHelpClick={setActiveHelp} />
                          <TableHeader label="推定流入" helpKey="estimated_traffic" width={100} borderRight onHelpClick={setActiveHelp} />
                          <TableHeader label="応募" helpKey="intent_a" width={60} onHelpClick={setActiveHelp} />
                          <TableHeader label="比較" helpKey="intent_b" width={60} onHelpClick={setActiveHelp} />
                          <TableHeader label="情報" helpKey="intent_c" width={60} borderRight onHelpClick={setActiveHelp} />
                          <th
                            className="text-center px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                            style={{ background: '#FAFAFA', height: '41px', width: '60px', minWidth: '60px' }}
                          >
                            詳細
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mediaList.map((media) => (
                          <tr
                            key={media.id}
                            onClick={() => router.push(`/dashboard/catalog/${media.id}`)}
                            onMouseEnter={() => setHoveredRowId(media.id)}
                            onMouseLeave={() => setHoveredRowId(null)}
                            className={`cursor-pointer transition ${hoveredRowId === media.id ? 'bg-zinc-100' : ''}`}
                            style={{ borderBottom: '1px solid #F4F4F5', height: '57px' }}
                          >
                            <td className="px-2 py-2.5 text-center" style={{ width: '100px', minWidth: '100px' }}>
                              <span className="text-sm font-semibold text-zinc-900">
                                {formatCompactNumber(media.monthly_visits)}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '70px', minWidth: '70px' }}>
                              <span className="text-sm text-zinc-600">
                                {formatPercent(media.bounce_rate)}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '70px', minWidth: '70px' }}>
                              <span className="text-sm text-zinc-600">
                                {media.pages_per_visit ? media.pages_per_visit.toFixed(1) : '-'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '80px', minWidth: '80px', borderRight: '1px solid #E4E4E7' }}>
                              <span className="text-sm text-zinc-600">
                                {formatDuration(media.avg_visit_duration)}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '60px', minWidth: '60px' }}>
                              <span className="text-sm text-sky-600 font-medium">
                                {media.latest_traffic?.search_pct != null ? `${media.latest_traffic.search_pct.toFixed(0)}%` : '-'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '60px', minWidth: '60px' }}>
                              <span className="text-sm text-blue-600">
                                {media.latest_traffic?.direct_pct != null ? `${media.latest_traffic.direct_pct.toFixed(0)}%` : '-'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '60px', minWidth: '60px' }}>
                              <span className="text-sm text-rose-600">
                                {media.latest_traffic?.referral_pct != null ? `${media.latest_traffic.referral_pct.toFixed(0)}%` : '-'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '60px', minWidth: '60px' }}>
                              <span className="text-sm text-amber-600">
                                {media.latest_traffic?.display_pct != null ? `${media.latest_traffic.display_pct.toFixed(0)}%` : '-'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '60px', minWidth: '60px', borderRight: '1px solid #E4E4E7' }}>
                              <span className="text-sm text-green-600">
                                {media.latest_traffic?.social_pct != null ? `${media.latest_traffic.social_pct.toFixed(0)}%` : '-'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '90px', minWidth: '90px' }}>
                              <span className="text-sm text-zinc-600">
                                {formatNumber(media.keyword_count)}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '100px', minWidth: '100px' }}>
                              <span className="text-sm text-zinc-600">
                                {formatCompactNumber(media.total_search_volume)}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '100px', minWidth: '100px', borderRight: '1px solid #E4E4E7' }}>
                              <span className="text-sm text-zinc-600">
                                {formatCompactNumber(media.total_estimated_traffic)}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '60px', minWidth: '60px' }}>
                              <span className="text-sm font-medium text-red-600">
                                {media.intent_a_pct != null ? `${media.intent_a_pct}%` : '-'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '60px', minWidth: '60px' }}>
                              <span className="text-sm font-medium text-orange-600">
                                {media.intent_b_pct != null ? `${media.intent_b_pct}%` : '-'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '60px', minWidth: '60px', borderRight: '1px solid #E4E4E7' }}>
                              <span className="text-sm font-medium text-cyan-600">
                                {media.intent_c_pct != null ? `${media.intent_c_pct}%` : '-'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" style={{ width: '60px', minWidth: '60px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/dashboard/catalog/${media.id}`)
                                }}
                                className="px-2 py-1 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded transition-colors"
                              >
                                詳細
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ページネーション */}
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
            </>
          )}
        </div>
      </div>
    </>
  )
}
