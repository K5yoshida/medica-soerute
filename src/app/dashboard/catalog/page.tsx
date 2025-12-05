'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  ChevronDown,
  Loader2,
  RefreshCw,
  ChevronRight,
  HelpCircle,
  X,
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
  intent_a_pct: number | null
  intent_b_pct: number | null
  intent_c_pct: number | null
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
    title: 'キーワード数',
    description: 'この媒体が検索上位を獲得しているキーワードの数です。多いほどSEOが強いことを示します。',
    source: 'ラッコキーワード',
    note: '検索順位100位以内のキーワードを集計しています。',
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

// ヘルプモーダルコンポーネント
function HelpModal({ helpKey, onClose }: { helpKey: string; onClose: () => void }) {
  const help = COLUMN_HELP[helpKey]
  if (!help) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-zinc-900 mb-3">{help.title}</h3>
        <p className="text-sm text-zinc-600 leading-relaxed mb-4">{help.description}</p>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <span className="px-2 py-0.5 bg-zinc-100 rounded">データソース: {help.source}</span>
        </div>
        {help.note && (
          <p className="text-xs text-zinc-400 mt-3 pt-3 border-t border-zinc-100">
            {help.note}
          </p>
        )}
      </div>
    </div>
  )
}

// ヘルプ付きテーブルヘッダーコンポーネント
function TableHeader({
  label,
  helpKey,
  align = 'right',
  onHelpClick,
  sticky = false,
}: {
  label: string
  helpKey: string
  align?: 'left' | 'right'
  onHelpClick: (key: string) => void
  sticky?: boolean
}) {
  return (
    <th
      className={`${align === 'left' ? 'text-left' : 'text-right'} px-2 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider ${sticky ? 'sticky left-0 bg-zinc-50' : ''}`}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [activeHelp, setActiveHelp] = useState<string | null>(null)

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
      {/* ヘルプモーダル */}
      {activeHelp && (
        <HelpModal helpKey={activeHelp} onClose={() => setActiveHelp(null)} />
      )}

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
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider sticky left-0 bg-zinc-50 w-[180px] min-w-[180px] max-w-[180px]">
                    媒体名
                  </th>
                  <TableHeader label="月間訪問" helpKey="monthly_visits" onHelpClick={setActiveHelp} />
                  <TableHeader label="直帰率" helpKey="bounce_rate" onHelpClick={setActiveHelp} />
                  <TableHeader label="PV/訪問" helpKey="pages_per_visit" onHelpClick={setActiveHelp} />
                  <TableHeader label="滞在時間" helpKey="avg_visit_duration" onHelpClick={setActiveHelp} />
                  <TableHeader label="検索" helpKey="search_pct" onHelpClick={setActiveHelp} />
                  <TableHeader label="直接" helpKey="direct_pct" onHelpClick={setActiveHelp} />
                  <TableHeader label="参照" helpKey="referral_pct" onHelpClick={setActiveHelp} />
                  <TableHeader label="広告" helpKey="display_pct" onHelpClick={setActiveHelp} />
                  <TableHeader label="SNS" helpKey="social_pct" onHelpClick={setActiveHelp} />
                  <TableHeader label="KW数" helpKey="keyword_count" onHelpClick={setActiveHelp} />
                  <TableHeader label="推定流入" helpKey="estimated_traffic" onHelpClick={setActiveHelp} />
                  <TableHeader label="応募" helpKey="intent_a" onHelpClick={setActiveHelp} />
                  <TableHeader label="比較" helpKey="intent_b" onHelpClick={setActiveHelp} />
                  <TableHeader label="情報" helpKey="intent_c" onHelpClick={setActiveHelp} />
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
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm font-medium text-red-600">
                        {media.intent_a_pct != null ? `${media.intent_a_pct}%` : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm font-medium text-orange-600">
                        {media.intent_b_pct != null ? `${media.intent_b_pct}%` : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className="text-sm font-medium text-cyan-600">
                        {media.intent_c_pct != null ? `${media.intent_c_pct}%` : '-'}
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
