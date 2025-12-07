'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'

// 意図分類のラベルと色
const INTENT_CONFIG = {
  branded: { label: '指名検索', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  transactional: { label: '応募直前', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  commercial: { label: '比較検討', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  informational: { label: '情報収集', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
  b2b: { label: '法人向け', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.1)' },
  unknown: { label: '未分類', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)' },
} as const

// クエリタイプ（Do/Know/Go/Buy）のラベルと色
const QUERY_TYPE_CONFIG = {
  Do: { label: 'Do', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  Know: { label: 'Know', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
  Go: { label: 'Go', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  Buy: { label: 'Buy', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
} as const

// 分類ソースのラベル
const SOURCE_CONFIG = {
  rule: { label: 'ルール', color: '#10B981' },
  ai: { label: 'AI', color: '#8B5CF6' },
  manual: { label: '手動', color: '#F59E0B' },
  unknown: { label: '不明', color: '#6B7280' },
} as const

type QueryIntent = keyof typeof INTENT_CONFIG
type QueryType = keyof typeof QUERY_TYPE_CONFIG
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

export default function KeywordsPage() {
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
  const limit = 20

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

  // データ取得
  const fetchKeywords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
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
  }, [page, searchTerm, intentFilter, verifiedFilter, sourceFilter])

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

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">キーワードマスター管理</h1>
        <p className="text-gray-600">検索キーワードの意図分類を管理・検証します</p>
      </div>

      {/* 統計サマリー */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">総キーワード数</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total_keywords.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">検証済み</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.verified_count.toLocaleString()}
              <span className="text-sm font-normal text-gray-500 ml-2">({stats.verification_rate}%)</span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">未検証AI分類</div>
            <div className="text-2xl font-bold text-purple-600">{stats.unverified_ai_count.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">分類ソース</div>
            <div className="flex gap-2 flex-wrap mt-1">
              {Object.entries(stats.by_source).map(([source, count]) => (
                <span
                  key={source}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    color: SOURCE_CONFIG[source as ClassificationSource]?.color,
                    background: `${SOURCE_CONFIG[source as ClassificationSource]?.color}20`,
                  }}
                >
                  {SOURCE_CONFIG[source as ClassificationSource]?.label}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* フィルターバー */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* 検索 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="キーワード検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* 意図フィルター */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={intentFilter}
              onChange={(e) => {
                setIntentFilter(e.target.value)
                setPage(1)
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">全ての意図</option>
              {Object.entries(INTENT_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* 検証状態フィルター */}
          <select
            value={verifiedFilter}
            onChange={(e) => {
              setVerifiedFilter(e.target.value)
              setPage(1)
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">全ての状態</option>
            <option value="true">検証済み</option>
            <option value="false">未検証</option>
          </select>

          {/* ソースフィルター */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value)
              setPage(1)
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">全てのソース</option>
            {Object.entries(SOURCE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          {/* 一括検証ボタン */}
          {selectedIds.size > 0 && (
            <button
              onClick={() => bulkVerify(true)}
              disabled={bulkVerifying}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {bulkVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {selectedIds.size}件を検証済みに
            </button>
          )}
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={keywords.length > 0 && selectedIds.size === keywords.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  キーワード
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  意図分類
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイプ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ソース
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  検証
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  検索Vol
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                  </td>
                </tr>
              ) : keywords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    キーワードが見つかりません
                  </td>
                </tr>
              ) : (
                keywords.map((keyword) => (
                  <tr key={keyword.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(keyword.id)}
                        onChange={() => toggleSelect(keyword.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(keyword.keyword)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-1.5 font-medium text-gray-900 hover:text-blue-600 transition-colors"
                          title="Googleで検索"
                        >
                          <span className="group-hover:underline">{keyword.keyword}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                        </a>
                      </div>
                      {keyword.intent_reason && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[300px]">
                          {keyword.intent_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          color: INTENT_CONFIG[keyword.intent]?.color,
                          background: INTENT_CONFIG[keyword.intent]?.bg,
                        }}
                      >
                        {INTENT_CONFIG[keyword.intent]?.label || keyword.intent}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {keyword.query_type && QUERY_TYPE_CONFIG[keyword.query_type] ? (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            color: QUERY_TYPE_CONFIG[keyword.query_type].color,
                            background: QUERY_TYPE_CONFIG[keyword.query_type].bg,
                          }}
                        >
                          {QUERY_TYPE_CONFIG[keyword.query_type].label}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs"
                        style={{ color: SOURCE_CONFIG[keyword.classification_source]?.color }}
                      >
                        {SOURCE_CONFIG[keyword.classification_source]?.label || keyword.classification_source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {keyword.is_verified ? (
                        <Check className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {keyword.max_monthly_search_volume?.toLocaleString() || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEditModal(keyword)}
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {total.toLocaleString()}件中 {((page - 1) * limit + 1).toLocaleString()}-
            {Math.min(page * limit, total).toLocaleString()}件表示
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 編集モーダル */}
      {editingKeyword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">キーワード編集</h2>
              <button
                onClick={() => setEditingKeyword(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">キーワード</label>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(editingKeyword.keyword)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-900 font-medium hover:text-blue-600 transition-colors group"
                  >
                    <span className="group-hover:underline">{editingKeyword.keyword}</span>
                    <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                  </a>
                </div>
                <p className="text-xs text-gray-500 mt-1">クリックでGoogle検索結果を確認</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">意図分類</label>
                <select
                  value={editIntent}
                  onChange={(e) => setEditIntent(e.target.value as QueryIntent)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {Object.entries(INTENT_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分類理由</label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="分類の理由を入力..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="verified"
                  checked={editVerified}
                  onChange={(e) => setEditVerified(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="verified" className="text-sm text-gray-700">
                  検証済みとしてマーク
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setEditingKeyword(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
