'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, X, Trophy } from 'lucide-react'

interface TopKeyword {
  keyword: string
  monthly_search_volume: number
  estimated_traffic: number
  search_rank: number
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
  top_keywords: TopKeyword[]
}

interface RankingResultsProps {
  keywords: string[]
  results: RankingResult[]
  onClear: () => void
}

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

// 1〜3位用のカード
function TopRankCard({
  result,
  rank,
  onClick,
}: {
  result: RankingResult
  rank: number
  onClick: () => void
}) {
  const borderColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32'

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
        <button
          className="px-3 py-1.5 bg-teal-50 text-teal-600 font-medium rounded-md transition hover:bg-teal-100"
          style={{ fontSize: '12px' }}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          詳細を見る
        </button>
      </div>

      {/* 統計 */}
      <div
        className="grid grid-cols-4 gap-4"
        style={{ padding: '16px 20px', background: '#FAFAFA' }}
      >
        <div className="text-center">
          <div className="text-zinc-400 mb-1" style={{ fontSize: '11px' }}>
            該当KW数
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
            推定流入
          </div>
          <div className="font-semibold text-zinc-900" style={{ fontSize: '16px' }}>
            {formatCompactNumber(result.total_estimated_traffic)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-zinc-400 mb-1" style={{ fontSize: '11px' }}>
            応募意図A
          </div>
          <div className="font-semibold text-rose-600" style={{ fontSize: '16px' }}>
            {result.intent_a_pct}
            <span className="text-zinc-400 font-normal" style={{ fontSize: '12px' }}>
              %
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
            {result.top_keywords.slice(0, 3).map((kw, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-zinc-50 rounded-md"
                style={{ padding: '8px 12px' }}
              >
                <span className="text-zinc-700 truncate" style={{ fontSize: '13px', maxWidth: '40%' }}>
                  {kw.keyword}
                </span>
                <div className="flex items-center gap-4 text-zinc-500" style={{ fontSize: '12px' }}>
                  <span>
                    検索Vol <span className="font-medium text-zinc-700">{formatNumber(kw.monthly_search_volume)}</span>
                  </span>
                  <span>
                    流入 <span className="font-medium text-zinc-700">{formatNumber(kw.estimated_traffic)}</span>
                  </span>
                  <span>
                    順位 <span className="font-medium text-zinc-700">{kw.search_rank}位</span>
                  </span>
                </div>
              </div>
            ))}
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
}: {
  result: RankingResult
  rank: number
  onClick: () => void
}) {
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
          <span className="text-zinc-400">該当KW: </span>
          <span className="font-medium">{formatNumber(result.matched_keyword_count)}</span>
        </div>
        <div>
          <span className="text-zinc-400">推定流入: </span>
          <span className="font-medium">{formatCompactNumber(result.total_estimated_traffic)}</span>
        </div>
        <div>
          <span className="text-zinc-400">A率: </span>
          <span className="font-medium text-rose-600">{result.intent_a_pct}%</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
    </div>
  )
}

export function RankingResults({ keywords, results, onClear }: RankingResultsProps) {
  const router = useRouter()

  const handleMediaClick = (mediaId: string) => {
    router.push(`/dashboard/catalog/${mediaId}`)
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

      {/* 1〜3位カード */}
      <div className="space-y-4 mb-6">
        {topResults.map((result, i) => (
          <TopRankCard
            key={result.media_id}
            result={result}
            rank={i + 1}
            onClick={() => handleMediaClick(result.media_id)}
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
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
