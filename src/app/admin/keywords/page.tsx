'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  Check,
  CheckCircle,
  AlertCircle,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react'

// 検索段階ラベル（query_master.intent）- 4カテゴリ: branded, transactional, informational, b2b
const INTENT_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  branded: { label: '指名検索', color: '#7C3AED', bgColor: '#EDE9FE' },
  transactional: { label: '応募意図', color: '#E11D48', bgColor: '#FFE4E6' },
  informational: { label: '情報収集', color: '#0284C7', bgColor: '#E0F2FE' },
  b2b: { label: '法人向け', color: '#059669', bgColor: '#D1FAE5' },
  unknown: { label: '未分類', color: '#71717A', bgColor: '#F4F4F5' },
}

// 検索目的ラベル（query_master.query_type）- カタログ詳細と同じ
const QUERY_TYPE_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  Do: { label: 'Do', color: '#E11D48', bgColor: '#FFE4E6' },
  Know: { label: 'Know', color: '#0284C7', bgColor: '#E0F2FE' },
  Go: { label: 'Go', color: '#7C3AED', bgColor: '#EDE9FE' },
  Buy: { label: 'Buy', color: '#D97706', bgColor: '#FEF3C7' },
}

// 分類ソースのラベル
const SOURCE_CONFIG = {
  rule: { label: 'ルール', color: '#10B981' },
  ai: { label: 'AI', color: '#8B5CF6' },
  manual: { label: '手動', color: '#F59E0B' },
  unknown: { label: '不明', color: '#6B7280' },
} as const

type QueryIntent = keyof typeof INTENT_LABELS
type QueryType = keyof typeof QUERY_TYPE_LABELS
type ClassificationSource = keyof typeof SOURCE_CONFIG

interface Keyword {
  id: string
  keyword: string
  keyword_normalized: string
  intent: QueryIntent
  intent_confidence: string | null
  intent_reason: string | null
  query_type: QueryType | null
  max_monthly_search_volume: number | null
  max_cpc: number | null
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
  classification_source: ClassificationSource
  created_at: string
  updated_at: string
}

interface Stats {
  total_keywords: number
  verified_count: number
  verification_rate: number
  unverified_ai_count: number
  by_source: Record<ClassificationSource, number>
  by_intent: Record<QueryIntent, number>
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  return num.toLocaleString('ja-JP')
}

export default function KeywordsPage() {
  const router = useRouter()
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // フィルター状態
  const [search, setSearch] = useState('')
  const [intentFilter, setIntentFilter] = useState<string>('all')
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const limit = 50

  // ソート状態
  const [sortBy, setSortBy] = useState('max_monthly_search_volume')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 選択状態
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 編集モーダル状態
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null)
  const [editIntent, setEditIntent] = useState<QueryIntent>('unknown')
  const [editReason, setEditReason] = useState('')
  const [editVerified, setEditVerified] = useState(false)
  const [saving, setSaving] = useState(false)

  // 一括検証状態
  const [bulkVerifying, setBulkVerifying] = useState(false)

  // 検索実行（デバウンス用）
  const [searchTerm, setSearchTerm] = useState('')

  // フィルターがアクティブか判定
  const hasActiveFilters =
    search !== '' ||
    intentFilter !== 'all' ||
    verifiedFilter !== 'all' ||
    sourceFilter !== 'all'

  // 全フィルターリセット
  const handleResetFilters = () => {
    setSearch('')
    setSearchTerm('')
    setIntentFilter('all')
    setVerifiedFilter('all')
    setSourceFilter('all')
    setPage(1)
  }

  // データ取得
  const fetchKeywords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      if (searchTerm) params.set('search', searchTerm)
      if (intentFilter !== 'all') params.set('intent', intentFilter)
      if (verifiedFilter !== 'all') params.set('verified', verifiedFilter)
      if (sourceFilter !== 'all') params.set('source', sourceFilter)

      const res = await fetch(`/api/admin/keywords?${params}`)
      const data = await res.json()
      if (data.success) {
        setKeywords(data.data.keywords)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('Failed to fetch keywords:', error)
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm, intentFilter, verifiedFilter, sourceFilter, sortBy, sortOrder])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/admin/keywords/stats')
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeywords()
  }, [fetchKeywords])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // 検索デバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // ソート変更
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    setPage(1)
  }

  // 選択切り替え
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // 全選択切り替え
  const toggleSelectAll = () => {
    if (selectedIds.size === keywords.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(keywords.map((k) => k.id)))
    }
  }

  // 編集モーダルを開く
  const openEditModal = (keyword: Keyword) => {
    setEditingKeyword(keyword)
    setEditIntent(keyword.intent)
    setEditReason(keyword.intent_reason || '')
    setEditVerified(keyword.is_verified)
  }

  // 編集保存
  const saveEdit = async () => {
    if (!editingKeyword) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/keywords/${editingKeyword.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: editIntent,
          intent_reason: editReason,
          is_verified: editVerified,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEditingKeyword(null)
        fetchKeywords()
        fetchStats()
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  // 一括検証
  const bulkVerify = async (verified: boolean) => {
    if (selectedIds.size === 0) return
    setBulkVerifying(true)
    try {
      const res = await fetch('/api/admin/keywords/bulk-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword_ids: Array.from(selectedIds),
          is_verified: verified,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSelectedIds(new Set())
        fetchKeywords()
        fetchStats()
      }
    } catch (error) {
      console.error('Failed to bulk verify:', error)
    } finally {
      setBulkVerifying(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  // ソート可能なヘッダーセル（カタログ詳細と同じスタイル）
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

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      {/* ヘッダー - カタログ詳細と同じスタイル */}
      <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E4E4E7', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => router.back()}
              style={{ padding: '8px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F4F4F5' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <ArrowLeft style={{ width: 20, height: 20, color: '#52525B' }} />
            </button>
            <div>
              <h1 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                キーワードマスター管理
              </h1>
              <p style={{ fontSize: '12px', color: '#71717A', margin: '2px 0 0 0' }}>
                検索キーワードの意図分類を管理・検証します
              </p>
            </div>
          </div>

          {/* 一括検証ボタン */}
          {selectedIds.size > 0 && (
            <button
              onClick={() => bulkVerify(true)}
              disabled={bulkVerifying}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: '#0D9488',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: bulkVerifying ? 'not-allowed' : 'pointer',
                opacity: bulkVerifying ? 0.5 : 1,
              }}
            >
              {bulkVerifying ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <CheckCircle style={{ width: 16, height: 16 }} />}
              {selectedIds.size}件を検証済みに
            </button>
          )}
        </div>
      </header>

      {/* 統計サマリー */}
      {!statsLoading && stats && (
        <div style={{ padding: '12px 24px', background: '#FAFAFA', borderBottom: '1px solid #E4E4E7' }}>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px' }}>
            <div style={{ flex: 1, background: '#FFFFFF', padding: '12px 16px', borderRadius: '6px', border: '1px solid #E4E4E7', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA', marginBottom: '4px' }}>総キーワード数</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#18181B' }}>{formatNumber(stats.total_keywords)}</div>
            </div>
            <div style={{ flex: 1, background: '#FFFFFF', padding: '12px 16px', borderRadius: '6px', border: '1px solid #E4E4E7', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA', marginBottom: '4px' }}>検証済み</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#10B981' }}>
                {formatNumber(stats.verified_count)}
                <span style={{ fontSize: '12px', fontWeight: 400, color: '#71717A', marginLeft: '8px' }}>({stats.verification_rate}%)</span>
              </div>
            </div>
            <div style={{ flex: 1, background: '#FFFFFF', padding: '12px 16px', borderRadius: '6px', border: '1px solid #E4E4E7', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA', marginBottom: '4px' }}>未検証AI分類</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#8B5CF6' }}>{formatNumber(stats.unverified_ai_count)}</div>
            </div>
            <div style={{ flex: 2, background: '#FFFFFF', padding: '12px 16px', borderRadius: '6px', border: '1px solid #E4E4E7' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#A1A1AA', marginBottom: '4px' }}>分類ソース</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                {Object.entries(stats.by_source).map(([source, count]) => (
                  <span
                    key={source}
                    style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: `${SOURCE_CONFIG[source as ClassificationSource]?.color}20`,
                      color: SOURCE_CONFIG[source as ClassificationSource]?.color,
                    }}
                  >
                    {SOURCE_CONFIG[source as ClassificationSource]?.label}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* フィルターバー - カタログ詳細と同じスタイル */}
      <div style={{ padding: '12px 24px', background: '#FFFFFF', borderBottom: '1px solid #E4E4E7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* 検索 */}
          <div style={{ position: 'relative', minWidth: '200px', flex: 1, maxWidth: '300px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#A1A1AA' }} />
            <input
              type="text"
              placeholder="キーワード検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '40px',
                paddingRight: '16px',
                paddingTop: '8px',
                paddingBottom: '8px',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* 意図フィルター */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter style={{ width: 16, height: 16, color: '#A1A1AA' }} />
            <select
              value={intentFilter}
              onChange={(e) => { setIntentFilter(e.target.value); setPage(1) }}
              style={{
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                background: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="all">全ての意図</option>
              {Object.entries(INTENT_LABELS).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* 検証状態フィルター */}
          <select
            value={verifiedFilter}
            onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1) }}
            style={{
              border: '1px solid #E4E4E7',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              background: '#FFFFFF',
              outline: 'none',
            }}
          >
            <option value="all">全ての状態</option>
            <option value="true">検証済み</option>
            <option value="false">未検証</option>
          </select>

          {/* ソースフィルター */}
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
            style={{
              border: '1px solid #E4E4E7',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              background: '#FFFFFF',
              outline: 'none',
            }}
          >
            <option value="all">全てのソース</option>
            {Object.entries(SOURCE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {/* リセットボタン */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#52525B',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F4F4F5' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <RotateCcw style={{ width: 14, height: 14 }} />
              リセット
            </button>
          )}
        </div>
      </div>

      {/* テーブル - カタログ詳細と同じスタイル */}
      <div style={{ padding: '24px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 380px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E4E4E7' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', background: '#FAFAFA', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={keywords.length > 0 && selectedIds.size === keywords.length}
                      onChange={toggleSelectAll}
                      style={{ borderRadius: '4px', border: '1px solid #D4D4D8' }}
                    />
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap', background: '#FAFAFA' }}>
                    キーワード
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap', background: '#FAFAFA' }}>
                    検索目的
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap', background: '#FAFAFA' }}>
                    検索段階
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap', background: '#FAFAFA' }}>
                    ソース
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap', background: '#FAFAFA' }}>
                    検証
                  </th>
                  <SortableHeader label="月間検索数" columnId="max_monthly_search_volume" />
                  <SortableHeader label="CPC ($)" columnId="max_cpc" />
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap', background: '#FAFAFA' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '48px' }}>
                      <Loader2 style={{ width: 24, height: 24, color: '#0D9488', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                      <span style={{ marginLeft: '8px', fontSize: '13px', color: '#52525B' }}>読み込み中...</span>
                    </td>
                  </tr>
                ) : keywords.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: '#A1A1AA', fontSize: '13px' }}>
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
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFAFA' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {/* チェックボックス */}
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(kw.id)}
                          onChange={() => toggleSelect(kw.id)}
                          style={{ borderRadius: '4px', border: '1px solid #D4D4D8' }}
                        />
                      </td>
                      {/* キーワード */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(kw.keyword)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '13px', fontWeight: 500, color: '#18181B', textDecoration: 'none' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#0D9488' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#18181B' }}
                          >
                            {kw.keyword}
                          </a>
                          <ExternalLink style={{ width: 14, height: 14, color: '#A1A1AA' }} />
                        </div>
                        {kw.intent_reason && (
                          <div style={{ fontSize: '11px', color: '#71717A', marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {kw.intent_reason}
                          </div>
                        )}
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
                      {/* ソース */}
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', color: SOURCE_CONFIG[kw.classification_source]?.color }}>
                          {SOURCE_CONFIG[kw.classification_source]?.label || kw.classification_source}
                        </span>
                      </td>
                      {/* 検証 */}
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        {kw.is_verified ? (
                          <Check style={{ width: 20, height: 20, color: '#10B981', margin: '0 auto' }} />
                        ) : (
                          <AlertCircle style={{ width: 20, height: 20, color: '#D4D4D8', margin: '0 auto' }} />
                        )}
                      </td>
                      {/* 月間検索数 */}
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                        {formatNumber(kw.max_monthly_search_volume)}
                      </td>
                      {/* CPC */}
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', color: '#52525B' }}>
                        {kw.max_cpc !== null ? `$${kw.max_cpc.toFixed(2)}` : '-'}
                      </td>
                      {/* 操作 */}
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => openEditModal(kw)}
                          style={{
                            padding: '6px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: '#A1A1AA',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#F4F4F5'; e.currentTarget.style.color = '#0D9488' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#A1A1AA' }}
                        >
                          <Edit2 style={{ width: 16, height: 16 }} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #E4E4E7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#A1A1AA' }}>
              {((page - 1) * limit + 1).toLocaleString()} - {Math.min(page * limit, total).toLocaleString()} / {formatNumber(total)} 件
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{
                  padding: '8px',
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  color: '#52525B',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft style={{ width: 16, height: 16 }} />
              </button>
              <span style={{ fontSize: '13px', color: '#52525B', padding: '0 8px' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || totalPages === 0}
                style={{
                  padding: '8px',
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  color: '#52525B',
                  cursor: page === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages || totalPages === 0 ? 0.5 : 1,
                }}
              >
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 編集モーダル */}
      {editingKeyword && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '480px', margin: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #E4E4E7' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#18181B', margin: 0 }}>キーワード編集</h2>
              <button
                onClick={() => setEditingKeyword(null)}
                style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#A1A1AA' }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#52525B', marginBottom: '4px' }}>キーワード</label>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(editingKeyword.keyword)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#18181B', textDecoration: 'none' }}
                >
                  <span>{editingKeyword.keyword}</span>
                  <ExternalLink style={{ width: 16, height: 16, color: '#A1A1AA' }} />
                </a>
                <p style={{ fontSize: '11px', color: '#71717A', marginTop: '4px' }}>クリックでGoogle検索結果を確認</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#52525B', marginBottom: '4px' }}>意図分類</label>
                <select
                  value={editIntent}
                  onChange={(e) => setEditIntent(e.target.value as QueryIntent)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #E4E4E7',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  {Object.entries(INTENT_LABELS).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#52525B', marginBottom: '4px' }}>分類理由</label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  rows={2}
                  placeholder="分類の理由を入力..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #E4E4E7',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="verified"
                  checked={editVerified}
                  onChange={(e) => setEditVerified(e.target.checked)}
                  style={{ borderRadius: '4px', border: '1px solid #D4D4D8' }}
                />
                <label htmlFor="verified" style={{ fontSize: '13px', color: '#52525B' }}>
                  検証済みとしてマーク
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #E4E4E7', background: '#FAFAFA', borderRadius: '0 0 12px 12px' }}>
              <button
                onClick={() => setEditingKeyword(null)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#52525B',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#0D9488',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
