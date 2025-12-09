'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, X, Trophy, TrendingUp, Users, Search as SearchIcon, Building2 } from 'lucide-react'

interface TopKeyword {
  keyword: string
  monthly_search_volume: number
  estimated_traffic: number
  search_rank: number
  intent?: string
}

interface RankingResult {
  media_id: string
  media_name: string
  domain: string | null
  matched_keyword_count: number
  total_estimated_traffic: number
  // intent別の流入数（6カテゴリ）
  branded_media_traffic?: number
  branded_customer_traffic?: number
  branded_ambiguous_traffic?: number
  transactional_traffic?: number
  informational_traffic?: number
  b2b_traffic?: number
  // intent別のキーワード数
  branded_media_count?: number
  branded_customer_count?: number
  branded_ambiguous_count?: number
  transactional_count?: number
  informational_count?: number
  b2b_count?: number
  monthly_visits: number | null
  top_keywords: TopKeyword[]
}

interface RankingResultsProps {
  keywords: string[]
  results: RankingResult[]
  onClear: () => void
  onSortChange?: (sortBy: string) => void
  currentSort?: string
}

// ソートタブの定義（6カテゴリ対応）
const SORT_TABS = [
  { id: 'total', label: '総流入数', icon: Users, description: '全体のトラフィック規模' },
  { id: 'transactional', label: '応募意図', icon: TrendingUp, description: '応募意欲が高いユーザーからの流入' },
  { id: 'informational', label: '情報収集', icon: SearchIcon, description: '認知獲得・情報提供' },
  { id: 'b2b', label: '法人向け', icon: Building2, description: '採用担当者・人事からの流入' },
]

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  return num.toLocaleString('ja-JP')
}

function formatCompactNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}千万`
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return num.toLocaleString('ja-JP')
}

// intentラベル（6カテゴリ）
function getIntentLabel(intent: string): { label: string; color: string } {
  switch (intent) {
    case 'branded_media':
      return { label: '指名検索（媒体）', color: '#7C3AED' }
    case 'branded_customer':
      return { label: '指名検索（顧客）', color: '#DB2777' }
    case 'branded_ambiguous':
      return { label: '指名検索（曖昧）', color: '#9333EA' }
    case 'transactional':
      return { label: '応募意図', color: '#DC2626' }
    case 'informational':
      return { label: '情報収集', color: '#3B82F6' }
    case 'b2b':
      return { label: '法人向け', color: '#10B981' }
    default:
      return { label: '未分類', color: '#A1A1AA' }
  }
}

// 順位メダル
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div
        className="flex items-center justify-center rounded-full font-bold text-white"
        style={{
          width: '32px',
          height: '32px',
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
          fontSize: '14px',
          boxShadow: '0 2px 8px rgba(255, 193, 7, 0.4)',
        }}
      >
        1
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div
        className="flex items-center justify-center rounded-full font-bold text-white"
        style={{
          width: '32px',
          height: '32px',
          background: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)',
          fontSize: '14px',
          boxShadow: '0 2px 8px rgba(192, 192, 192, 0.4)',
        }}
      >
        2
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div
        className="flex items-center justify-center rounded-full font-bold text-white"
        style={{
          width: '32px',
          height: '32px',
          background: 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)',
          fontSize: '14px',
          boxShadow: '0 2px 8px rgba(205, 127, 50, 0.4)',
        }}
      >
        3
      </div>
    )
  }
  return (
    <div
      className="flex items-center justify-center rounded-full font-medium text-zinc-500 bg-zinc-100"
      style={{ width: '28px', height: '28px', fontSize: '13px' }}
    >
      {rank}
    </div>
  )
}

// 現在のソート基準に応じた主要数値を取得
function getPrimaryMetric(result: RankingResult, sortBy: string): { value: number; label: string } {
  switch (sortBy) {
    case 'transactional':
      return { value: result.transactional_traffic || 0, label: '応募意図流入' }
    case 'informational':
      return { value: result.informational_traffic || 0, label: '情報収集流入' }
    case 'b2b':
      return { value: result.b2b_traffic || 0, label: '法人向け流入' }
    case 'total':
    default:
      return { value: result.total_estimated_traffic, label: '総流入数' }
  }
}

// 1〜3位用のカード
function TopRankCard({
  result,
  rank,
  onClick,
  sortBy,
}: {
  result: RankingResult
  rank: number
  onClick: () => void
  sortBy: string
}) {
  const borderColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32'
  const primaryMetric = getPrimaryMetric(result, sortBy)

  return (
    <div
      className="bg-white rounded-xl cursor-pointer transition hover:shadow-lg"
      style={{
        border: `2px solid ${borderColor}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
      onClick={onClick}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #F4F4F5',
        }}
      >
        <div className="flex items-center gap-3">
          <RankBadge rank={rank} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900" style={{ fontSize: '15px' }}>
                {result.media_name}
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </div>
            <span className="text-zinc-400" style={{ fontSize: '12px' }}>
              {result.domain || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* 統計 */}
      <div
        className="grid grid-cols-4 gap-4"
        style={{ padding: '16px 20px', background: '#FAFAFA' }}
      >
        <div className="text-center">
          <div className="text-zinc-400 mb-1" style={{ fontSize: '11px' }}>
            {primaryMetric.label}
          </div>
          <div className="font-semibold text-rose-600" style={{ fontSize: '16px' }}>
            {formatCompactNumber(primaryMetric.value)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-zinc-400 mb-1" style={{ fontSize: '11px' }}>
            総流入
          </div>
          <div className="font-semibold text-zinc-900" style={{ fontSize: '16px' }}>
            {formatCompactNumber(result.total_estimated_traffic)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-zinc-400 mb-1" style={{ fontSize: '11px' }}>
            該当KW
          </div>
          <div className="font-semibold text-zinc-900" style={{ fontSize: '16px' }}>
            {formatNumber(result.matched_keyword_count)}
            <span className="text-zinc-400 font-normal" style={{ fontSize: '12px' }}>
              件
            </span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-zinc-400 mb-1" style={{ fontSize: '11px' }}>
            月間訪問
          </div>
          <div className="font-semibold text-zinc-900" style={{ fontSize: '16px' }}>
            {formatCompactNumber(result.monthly_visits)}
          </div>
        </div>
      </div>

      {/* 該当キーワード */}
      {result.top_keywords && result.top_keywords.length > 0 && (
        <div style={{ padding: '16px 20px' }}>
          <div className="text-zinc-500 mb-2" style={{ fontSize: '11px' }}>
            獲得キーワード例
          </div>
          <div className="space-y-1.5">
            {result.top_keywords.slice(0, 3).map((kw, i) => {
              const intentInfo = getIntentLabel(kw.intent || 'unknown')
              return (
                <div
                  key={i}
                  className="flex items-center justify-between bg-zinc-50 rounded-md"
                  style={{ padding: '8px 12px' }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: `${intentInfo.color}15`,
                        color: intentInfo.color,
                        fontWeight: 500,
                      }}
                    >
                      {intentInfo.label}
                    </span>
                    <span className="text-zinc-700 truncate" style={{ fontSize: '13px', maxWidth: '200px' }}>
                      {kw.keyword}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-zinc-500" style={{ fontSize: '12px' }}>
                    <span>
                      流入 <span className="font-medium text-zinc-700">{formatNumber(kw.estimated_traffic)}</span>
                    </span>
                    <span>
                      順位 <span className="font-medium text-zinc-700">{kw.search_rank}位</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          {/* 詳細ボタン - キーワード例の右下に配置 */}
          <div className="flex justify-end mt-3">
            <button
              className="px-4 py-2 bg-teal-600 text-white font-medium rounded-md transition hover:bg-teal-700"
              style={{ fontSize: '13px' }}
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
            >
              詳細を見る
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 4位以降用のリスト行
function RankListItem({
  result,
  rank,
  onClick,
  sortBy,
}: {
  result: RankingResult
  rank: number
  onClick: () => void
  sortBy: string
}) {
  const primaryMetric = getPrimaryMetric(result, sortBy)

  return (
    <div
      className="flex items-center gap-4 bg-white border border-zinc-200 rounded-lg cursor-pointer transition hover:border-teal-300 hover:shadow-sm"
      style={{ padding: '12px 16px' }}
      onClick={onClick}
    >
      <RankBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-900 truncate" style={{ fontSize: '14px' }}>
            {result.media_name}
          </span>
          <span className="text-zinc-400 truncate" style={{ fontSize: '12px' }}>
            {result.domain}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-6 text-zinc-600" style={{ fontSize: '13px' }}>
        <div>
          <span className="text-zinc-400">{primaryMetric.label}: </span>
          <span className="font-medium text-rose-600">{formatCompactNumber(primaryMetric.value)}</span>
        </div>
        <div>
          <span className="text-zinc-400">総流入: </span>
          <span className="font-medium">{formatCompactNumber(result.total_estimated_traffic)}</span>
        </div>
        <div>
          <span className="text-zinc-400">KW: </span>
          <span className="font-medium">{formatNumber(result.matched_keyword_count)}</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
    </div>
  )
}

export function RankingResults({ keywords, results, onClear, onSortChange, currentSort = 'total' }: RankingResultsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(currentSort)

  const handleMediaClick = (mediaId: string) => {
    // 検索キーワードをURLパラメータとして渡す
    const params = new URLSearchParams()
    if (keywords.length > 0) {
      params.set('keywords', keywords.join(' '))
    }
    const queryString = params.toString()
    router.push(`/dashboard/catalog/${mediaId}${queryString ? `?${queryString}` : ''}`)
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onSortChange?.(tabId)
  }

  const topResults = results.slice(0, 3)
  const restResults = results.slice(3)

  if (results.length === 0) {
    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-zinc-900" style={{ fontSize: '15px' }}>
              「{keywords.join('」「')}」に強い媒体ランキング
            </h3>
          </div>
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-3 py-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition"
            style={{ fontSize: '13px' }}
          >
            <X className="w-4 h-4" />
            検索をクリア
          </button>
        </div>

        <div
          className="bg-zinc-50 border border-zinc-200 rounded-lg text-center"
          style={{ padding: '48px 24px' }}
        >
          <div className="text-zinc-400 mb-2" style={{ fontSize: '14px' }}>
            該当するキーワードを獲得している媒体が見つかりませんでした
          </div>
          <div className="text-zinc-400" style={{ fontSize: '13px' }}>
            別のキーワードで検索してみてください
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-zinc-900" style={{ fontSize: '15px' }}>
            「{keywords.join('」「')}」に強い媒体ランキング
          </h3>
          <span className="text-zinc-400" style={{ fontSize: '13px' }}>
            （{results.length}媒体）
          </span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-3 py-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition"
          style={{ fontSize: '13px' }}
        >
          <X className="w-4 h-4" />
          検索をクリア
        </button>
      </div>

      {/* ソートタブ */}
      <div className="flex gap-2 mb-6">
        {SORT_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition"
              style={{
                background: isActive ? '#0D9488' : '#F4F4F5',
                color: isActive ? '#FFFFFF' : '#52525B',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
              }}
              title={tab.description}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 1〜3位カード */}
      <div className="space-y-4 mb-6">
        {topResults.map((result, i) => (
          <TopRankCard
            key={result.media_id}
            result={result}
            rank={i + 1}
            onClick={() => handleMediaClick(result.media_id)}
            sortBy={activeTab}
          />
        ))}
      </div>

      {/* 4位以降リスト */}
      {restResults.length > 0 && (
        <div>
          <div className="text-zinc-500 mb-3" style={{ fontSize: '13px' }}>
            4位以降
          </div>
          <div className="space-y-2">
            {restResults.map((result, i) => (
              <RankListItem
                key={result.media_id}
                result={result}
                rank={i + 4}
                onClick={() => handleMediaClick(result.media_id)}
                sortBy={activeTab}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
