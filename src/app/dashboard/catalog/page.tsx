'use client'

import { useState, useEffect, useCallback } from 'react'
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
  ExternalLink,
  BarChart2,
} from 'lucide-react'
import { MediaSearch } from '@/components/catalog/media-search'
import { RankingResults } from '@/components/catalog/ranking-results'
import { ComparisonModal } from '@/components/catalog/comparison-modal'

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
  top_keywords: Array<{
    keyword: string
    monthly_search_volume: number
    estimated_traffic: number
    search_rank: number
    intent?: string
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
    description: 'サイト全体の月間ユニーク訪問者数です。',
    source: 'SimilarWeb',
  },
  bounce_rate: {
    title: '直帰率',
    description: 'サイトに訪問後、他のページを閲覧せずに離脱した訪問者の割合です。',
    source: 'SimilarWeb',
  },
  pages_per_visit: {
    title: 'PV/訪問',
    description: '1回の訪問あたりの平均閲覧ページ数です。',
    source: 'SimilarWeb',
  },
  avg_visit_duration: {
    title: '滞在時間',
    description: '1回の訪問あたりの平均滞在時間です。',
    source: 'SimilarWeb',
  },
  search_pct: {
    title: '検索流入',
    description: 'Google等の検索エンジンからの流入割合です。',
    source: 'SimilarWeb',
  },
  direct_pct: {
    title: '直接流入',
    description: 'URLを直接入力したり、ブックマークからアクセスした訪問の割合です。',
    source: 'SimilarWeb',
  },
  referral_pct: {
    title: '参照流入',
    description: '他のWebサイトからのリンク経由でアクセスした訪問の割合です。',
    source: 'SimilarWeb',
  },
  display_pct: {
    title: '広告流入',
    description: 'ディスプレイ広告からの流入割合です。',
    source: 'SimilarWeb',
  },
  social_pct: {
    title: 'SNS流入',
    description: 'SNSからの流入割合です。',
    source: 'SimilarWeb',
  },
  email_pct: {
    title: 'メール流入',
    description: 'メールマガジン等からの流入割合です。',
    source: 'SimilarWeb',
  },
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  return num.toLocaleString('ja-JP')
}

function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  return `${num.toFixed(2)}%`
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'relative',
          background: '#FFFFFF',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '400px',
          margin: '16px',
          border: '1px solid #E4E4E7',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E4E4E7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: 0 }}>
            {help.title}
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            <X style={{ width: 18, height: 18, color: '#A1A1AA' }} />
          </button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: '13px', color: '#52525B', lineHeight: 1.6, margin: '0 0 12px 0' }}>
            {help.description}
          </p>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              background: '#F4F4F5',
              color: '#52525B',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            データソース: {help.source}
          </span>
        </div>
      </div>
    </div>
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
  const pageSize = 20

  // ランキング検索用の状態
  const [rankingKeywords, setRankingKeywords] = useState<string[]>([])
  const [rankingResults, setRankingResults] = useState<RankingResult[]>([])
  const [isRankingLoading, setIsRankingLoading] = useState(false)
  const [rankingSortBy, setRankingSortBy] = useState('total')
  const [lastSearchKeywords, setLastSearchKeywords] = useState('')

  // 比較機能用の状態
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set())
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false)

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
  const handleRankingSearch = useCallback(async (keywords: string, sortBy: string = 'total') => {
    setIsRankingLoading(true)
    setLastSearchKeywords(keywords)
    try {
      const params = new URLSearchParams()
      params.set('keywords', keywords)
      params.set('sort_by', sortBy)
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

  // ソート変更時にAPIを再呼び出し
  const handleSortChange = useCallback((newSortBy: string) => {
    setRankingSortBy(newSortBy)
    if (lastSearchKeywords) {
      handleRankingSearch(lastSearchKeywords, newSortBy)
    }
  }, [lastSearchKeywords, handleRankingSearch])

  const handleClearRanking = useCallback(() => {
    setRankingKeywords([])
    setRankingResults([])
  }, [])

  // 媒体選択のトグル
  const toggleMediaSelection = useCallback((mediaId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedMediaIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(mediaId)) {
        newSet.delete(mediaId)
      } else {
        if (newSet.size < 5) {
          newSet.add(mediaId)
        }
      }
      return newSet
    })
  }, [])

  // 選択をクリア
  const clearSelection = useCallback(() => {
    setSelectedMediaIds(new Set())
  }, [])

  // 選択中の媒体データを取得
  const getSelectedMedia = useCallback(() => {
    return mediaList.filter((m) => selectedMediaIds.has(m.id))
  }, [mediaList, selectedMediaIds])

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasRankingResults = rankingKeywords.length > 0

  return (
    <>
      {/* ヘルプモーダル */}
      {activeHelp && <HelpModal helpKey={activeHelp} onClose={() => setActiveHelp(null)} />}

      {/* ページヘッダー */}
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E4E4E7',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: 0 }}>
              媒体カタログ
            </h1>
            <p style={{ fontSize: '13px', color: '#A1A1AA', marginTop: '2px' }}>
              採用条件に合った媒体を探す・比較する
            </p>
          </div>
          <button
            onClick={fetchMedia}
            disabled={isLoading}
            style={{
              padding: '8px',
              border: '1px solid #E4E4E7',
              borderRadius: '6px',
              background: '#FFFFFF',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <RefreshCw
              style={{
                width: 16,
                height: 16,
                color: '#52525B',
                animation: isLoading ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </button>
        </div>
      </header>

      {/* コンテンツエリア */}
      <div style={{ padding: '24px' }}>
        {/* キーワード検索ボックス */}
        <MediaSearch onSearch={handleRankingSearch} isLoading={isRankingLoading} />

        {/* ランキング結果 */}
        {hasRankingResults && (
          <RankingResults
            keywords={rankingKeywords}
            results={rankingResults}
            onClear={handleClearRanking}
            onSortChange={handleSortChange}
            currentSort={rankingSortBy}
          />
        )}

        {/* 全媒体一覧セクション */}
        <div style={{ marginTop: '32px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <List style={{ width: 18, height: 18, color: '#A1A1AA' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                全媒体一覧
              </h3>
              <span style={{ fontSize: '13px', color: '#A1A1AA' }}>
                （{formatNumber(totalCount)}媒体）
              </span>
            </div>

            {/* テーブル用の媒体名検索 */}
            <div style={{ position: 'relative' }}>
              <Search
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: '#A1A1AA',
                }}
              />
              <input
                type="text"
                placeholder="媒体名で検索..."
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                style={{
                  width: '200px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {error ? (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FEE2E2',
                borderRadius: '8px',
                padding: '16px',
                color: '#991B1B',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          ) : isLoading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px',
              }}
            >
              <Loader2
                style={{ width: 24, height: 24, color: '#0D9488', animation: 'spin 1s linear infinite' }}
              />
              <span style={{ marginLeft: '8px', fontSize: '13px', color: '#52525B' }}>
                読み込み中...
              </span>
            </div>
          ) : mediaList.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px',
                color: '#A1A1AA',
                fontSize: '13px',
              }}
            >
              媒体が見つかりません
            </div>
          ) : (
            <>
              {/* テーブル - 横スクロール対応 */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E4E4E7' }}>
                        {/* チェックボックス列 */}
                        <th
                          style={{
                            width: '48px',
                            padding: '12px 8px',
                            background: '#FAFAFA',
                          }}
                        >
                          <span style={{ fontSize: '11px', color: '#A1A1AA' }}>比較</span>
                        </th>
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
                          媒体名
                        </th>
                        <HeaderCell label="月間訪問" helpKey="monthly_visits" onHelp={setActiveHelp} />
                        <HeaderCell label="直帰率" helpKey="bounce_rate" onHelp={setActiveHelp} />
                        <HeaderCell label="PV/訪問" helpKey="pages_per_visit" onHelp={setActiveHelp} />
                        <HeaderCell label="平均滞在" helpKey="avg_visit_duration" onHelp={setActiveHelp} />
                        <HeaderCell label="検索" helpKey="search_pct" onHelp={setActiveHelp} />
                        <HeaderCell label="直接" helpKey="direct_pct" onHelp={setActiveHelp} />
                        <HeaderCell label="参照" helpKey="referral_pct" onHelp={setActiveHelp} />
                        <HeaderCell label="広告" helpKey="display_pct" onHelp={setActiveHelp} />
                        <HeaderCell label="メール" helpKey="email_pct" onHelp={setActiveHelp} />
                        <HeaderCell label="SNS" helpKey="social_pct" onHelp={setActiveHelp} />
                        <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {mediaList.map((media, index) => (
                        <tr
                          key={media.id}
                          onClick={() => router.push(`/dashboard/catalog/${media.id}`)}
                          className="catalog-row"
                          style={{
                            borderBottom: index < mediaList.length - 1 ? '1px solid #F4F4F5' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: selectedMediaIds.has(media.id) ? '#F0FDFA' : 'transparent',
                            position: 'relative',
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedMediaIds.has(media.id)) {
                              e.currentTarget.style.background = '#F0FDFA'
                              // セルの背景も変更
                              const checkboxCell = e.currentTarget.querySelector('.checkbox-cell') as HTMLElement
                              if (checkboxCell) checkboxCell.style.background = '#F0FDFA'
                              const nameCell = e.currentTarget.querySelector('.media-name-cell') as HTMLElement
                              if (nameCell) nameCell.style.background = '#F0FDFA'
                              // 媒体名の色を変更
                              const nameEl = e.currentTarget.querySelector('.media-name-text') as HTMLElement
                              if (nameEl) nameEl.style.color = '#0D9488'
                              // 詳細ボタンを強調
                              const btnEl = e.currentTarget.querySelector('.detail-btn') as HTMLElement
                              if (btnEl) {
                                btnEl.style.background = '#0D9488'
                                btnEl.style.color = '#FFFFFF'
                              }
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedMediaIds.has(media.id)) {
                              e.currentTarget.style.background = 'transparent'
                              // セルの背景も戻す
                              const checkboxCell = e.currentTarget.querySelector('.checkbox-cell') as HTMLElement
                              if (checkboxCell) checkboxCell.style.background = '#FFFFFF'
                              const nameCell = e.currentTarget.querySelector('.media-name-cell') as HTMLElement
                              if (nameCell) nameCell.style.background = '#FFFFFF'
                              // 媒体名の色を戻す
                              const nameEl = e.currentTarget.querySelector('.media-name-text') as HTMLElement
                              if (nameEl) nameEl.style.color = '#18181B'
                              // 詳細ボタンを戻す
                              const btnEl = e.currentTarget.querySelector('.detail-btn') as HTMLElement
                              if (btnEl) {
                                btnEl.style.background = '#F0FDFA'
                                btnEl.style.color = '#0D9488'
                              }
                            }
                          }}
                        >
                          {/* チェックボックス */}
                          <td
                            className="checkbox-cell"
                            style={{
                              padding: '12px 8px',
                              background: selectedMediaIds.has(media.id) ? '#F0FDFA' : '#FFFFFF',
                              textAlign: 'center',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedMediaIds.has(media.id)}
                              onChange={() => {}}
                              onClick={(e) => toggleMediaSelection(media.id, e)}
                              disabled={!selectedMediaIds.has(media.id) && selectedMediaIds.size >= 5}
                              style={{
                                width: 16,
                                height: 16,
                                cursor: !selectedMediaIds.has(media.id) && selectedMediaIds.size >= 5 ? 'not-allowed' : 'pointer',
                                accentColor: '#0D9488',
                              }}
                            />
                          </td>
                          {/* 媒体名 */}
                          <td
                            className="media-name-cell"
                            style={{
                              padding: '12px 16px',
                              background: selectedMediaIds.has(media.id) ? '#F0FDFA' : '#FFFFFF',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <div>
                              <div
                                className="media-name-text"
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  color: '#18181B',
                                  transition: 'color 0.15s ease',
                                }}
                              >
                                {media.name}
                              </div>
                              <div
                                style={{
                                  fontSize: '11px',
                                  color: '#A1A1AA',
                                }}
                              >
                                {media.domain || '-'}
                              </div>
                            </div>
                          </td>
                          <DataCell value={formatNumber(media.monthly_visits)} bold />
                          <DataCell value={formatPercent(media.bounce_rate)} />
                          <DataCell value={media.pages_per_visit?.toFixed(1) || '-'} />
                          <DataCell value={formatDuration(media.avg_visit_duration)} />
                          <DataCell
                            value={formatPercent(media.latest_traffic?.search_pct)}
                            color="#0EA5E9"
                          />
                          <DataCell
                            value={formatPercent(media.latest_traffic?.direct_pct)}
                            color="#3B82F6"
                          />
                          <DataCell
                            value={formatPercent(media.latest_traffic?.referral_pct)}
                            color="#F43F5E"
                          />
                          <DataCell
                            value={formatPercent(media.latest_traffic?.display_pct)}
                            color="#F59E0B"
                          />
                          <DataCell
                            value={formatPercent(media.latest_traffic?.email_pct)}
                            color="#8B5CF6"
                          />
                          <DataCell
                            value={formatPercent(media.latest_traffic?.social_pct)}
                            color="#10B981"
                          />
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              className="detail-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/dashboard/catalog/${media.id}`)
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#F0FDFA',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#0D9488',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              詳細
                              <ExternalLink style={{ width: 12, height: 12 }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div
                  style={{
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '13px', color: '#A1A1AA' }}>
                    {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)}{' '}
                    / {formatNumber(totalCount)} 件
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px',
                        border: '1px solid #E4E4E7',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 1 ? 0.5 : 1,
                      }}
                    >
                      <ChevronLeft style={{ width: 16, height: 16, color: '#52525B' }} />
                    </button>
                    <span style={{ fontSize: '13px', color: '#52525B', padding: '0 8px' }}>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '8px',
                        border: '1px solid #E4E4E7',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        opacity: currentPage === totalPages ? 0.5 : 1,
                      }}
                    >
                      <ChevronRight style={{ width: 16, height: 16, color: '#52525B' }} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* フローティング比較バー */}
      {selectedMediaIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#18181B',
            borderRadius: '12px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            zIndex: 50,
          }}
        >
          <span style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 500 }}>
            {selectedMediaIds.size}媒体選択中
            <span style={{ color: '#A1A1AA', fontWeight: 400, marginLeft: '4px' }}>
              （最大5）
            </span>
          </span>

          <div style={{ width: '1px', height: '20px', background: '#3F3F46' }} />

          <button
            onClick={() => setIsComparisonModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#0D9488',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <BarChart2 style={{ width: 16, height: 16 }} />
            比較する
          </button>

          <button
            onClick={clearSelection}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            <X style={{ width: 18, height: 18, color: '#A1A1AA' }} />
          </button>
        </div>
      )}

      {/* 比較モーダル */}
      <ComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        selectedMedia={getSelectedMedia()}
      />
    </>
  )
}

// ヘッダーセルコンポーネント
function HeaderCell({
  label,
  helpKey,
  onHelp,
}: {
  label: string
  helpKey: string
  onHelp: (key: string) => void
}) {
  return (
    <th
      style={{
        textAlign: 'center',
        padding: '12px 8px',
        fontSize: '12px',
        fontWeight: 500,
        color: '#52525B',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}
      >
        <span>{label}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onHelp(helpKey)
          }}
          style={{
            padding: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            opacity: 0.4,
          }}
        >
          <HelpCircle style={{ width: 12, height: 12, color: '#52525B' }} />
        </button>
      </div>
    </th>
  )
}

// データセルコンポーネント
function DataCell({
  value,
  bold,
  color,
}: {
  value: string
  bold?: boolean
  color?: string
}) {
  return (
    <td
      style={{
        padding: '12px 8px',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: bold ? 600 : 400,
        color: color || '#52525B',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </td>
  )
}
