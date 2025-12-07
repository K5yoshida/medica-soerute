'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Search,
  Plus,
  MoreHorizontal,
  Globe,
  Eye,
  TrendingUp,
  X,
  Loader2,
  ExternalLink,
  FileText,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Calendar,
  BarChart3,
} from 'lucide-react'

/**
 * SC-904: 媒体マスター管理画面
 *
 * 機能:
 * - 媒体一覧表示
 * - 新規媒体追加
 * - 媒体編集・削除
 * - SimilarWeb画像からデータ取り込み
 */

interface TrafficSources {
  search_pct: number | null
  direct_pct: number | null
  referral_pct: number | null
  display_pct: number | null
  social_pct: number | null
  email_pct: number | null
}

interface Media {
  id: string
  name: string
  domain: string | null
  monthly_visits: number | null
  bounce_rate: number | null
  pages_per_visit: number | null
  avg_visit_duration: number | null
  is_active: boolean
  keyword_count: number
  created_at: string
  data_updated_at: string | null
  traffic_sources: TrafficSources | null
  last_csv_import_at: string | null
}

interface SimilarWebExtractData {
  domain?: string
  monthly_visits?: number
  bounce_rate?: number
  pages_per_visit?: number
  avg_visit_duration?: number
  traffic_sources?: {
    direct?: number
    referral?: number
    search?: number
    social?: number
    mail?: number
    display?: number
  }
  confidence?: 'high' | 'medium' | 'low'
}

export default function MediaPage() {
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMedia, setEditingMedia] = useState<Media | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    is_active: true,
  })
  const [saveLoading, setSaveLoading] = useState(false)

  // SimilarWeb Import modal
  const [isSimilarWebModalOpen, setIsSimilarWebModalOpen] = useState(false)
  const [selectedMediaForSW, setSelectedMediaForSW] = useState<Media | null>(null)
  const [swImages, setSwImages] = useState<File[]>([])
  const [swExtractLoading, setSwExtractLoading] = useState(false)
  const [swExtractResult, setSwExtractResult] = useState<SimilarWebExtractData | null>(null)
  const [swError, setSwError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        include_inactive: showInactive.toString(),
      })

      const res = await fetch(`/api/admin/media?${params}`)
      const data = await res.json()

      if (data.success) {
        setMedia(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch media:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, showInactive])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  const openAddModal = () => {
    setEditingMedia(null)
    setFormData({
      name: '',
      domain: '',
      is_active: true,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (item: Media) => {
    setEditingMedia(item)
    setFormData({
      name: item.name,
      domain: item.domain || '',
      is_active: item.is_active,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    setSaveLoading(true)
    try {
      const url = editingMedia ? `/api/admin/media/${editingMedia.id}` : '/api/admin/media'
      const method = editingMedia ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          domain: formData.domain || null,
          is_active: formData.is_active,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setIsModalOpen(false)
        fetchMedia()
      }
    } catch (error) {
      console.error('Failed to save media:', error)
    } finally {
      setSaveLoading(false)
    }
  }

  const handleToggleActive = async (item: Media) => {
    try {
      const res = await fetch(`/api/admin/media/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active }),
      })

      if (res.ok) {
        fetchMedia()
      }
    } catch (error) {
      console.error('Failed to toggle media status:', error)
    }
  }

  // SimilarWeb Import handlers
  const openSimilarWebModal = (item: Media) => {
    setSelectedMediaForSW(item)
    setSwImages([])
    setSwExtractResult(null)
    setSwError(null)
    setIsSimilarWebModalOpen(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files).slice(0, 5 - swImages.length)
      setSwImages([...swImages, ...newFiles])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setSwImages(swImages.filter((_, i) => i !== index))
  }

  const handleExtractSimilarWeb = async () => {
    if (!selectedMediaForSW || swImages.length === 0) return

    setSwExtractLoading(true)
    setSwError(null)
    setSwExtractResult(null)

    try {
      const formData = new FormData()
      swImages.forEach((file) => {
        formData.append('images', file)
      })
      formData.append('media_id', selectedMediaForSW.id)

      const res = await fetch('/api/admin/media/similarweb-extract', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        setSwExtractResult(data.data.extracted)
        // 成功後、リストを更新
        fetchMedia()
      } else {
        setSwError(data.error?.message || '抽出に失敗しました')
      }
    } catch (error) {
      console.error('SimilarWeb extract error:', error)
      setSwError('抽出中にエラーが発生しました')
    } finally {
      setSwExtractLoading(false)
    }
  }

  const formatNumber = (num: number | null) => {
    if (num === null) return '-'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`
  }

  // SimilarWebデータが未取得か判定
  const hasSimilarWebData = (item: Media) => {
    return item.monthly_visits !== null || item.bounce_rate !== null
  }

  return (
    <>
      {/* Header */}
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
            <h1
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#18181B',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              媒体マスター管理
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
                fontWeight: 400,
              }}
            >
              求人媒体の登録・編集・SimilarWebデータ取り込み
            </p>
          </div>
          <button
            onClick={openAddModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#7C3AED',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus className="h-4 w-4" />
            新規媒体を追加
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {/* Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
            <Search
              className="h-4 w-4"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#A1A1AA',
              }}
            />
            <input
              type="text"
              placeholder="媒体名またはドメインで検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Show inactive toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#52525B',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            非アクティブを表示
          </label>
        </div>

        {/* Media Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}
        >
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center' }}>
              <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: '#A1A1AA' }} />
              <p style={{ marginTop: '8px', color: '#A1A1AA', fontSize: '13px' }}>読み込み中...</p>
            </div>
          ) : media.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: '#A1A1AA' }}>
              媒体が見つかりません
            </div>
          ) : (
            media.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  opacity: item.is_active ? 1 : 0.6,
                }}
              >
                {/* ヘッダー: 媒体名・ドメイン・編集ボタン */}
                <div
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #F4F4F5',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: hasSimilarWebData(item) ? '#EDE9FE' : '#FEF3C7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: hasSimilarWebData(item) ? '#7C3AED' : '#D97706',
                        fontSize: '16px',
                        fontWeight: 600,
                      }}
                    >
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>
                        {item.name}
                      </div>
                      {item.domain ? (
                        <a
                          href={`https://${item.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: '#7C3AED',
                            textDecoration: 'none',
                          }}
                        >
                          <Globe className="h-3 w-3" />
                          {item.domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#A1A1AA' }}>ドメイン未設定</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openEditModal(item)}
                    style={{
                      padding: '6px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#A1A1AA',
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>

                {/* メイン情報: 月間訪問・キーワード・直帰率 */}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#A1A1AA', marginBottom: '4px' }}>
                        <Eye className="h-3 w-3" />
                        <span style={{ fontSize: '11px' }}>月間訪問</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>
                        {formatNumber(item.monthly_visits)}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#A1A1AA', marginBottom: '4px' }}>
                        <FileText className="h-3 w-3" />
                        <span style={{ fontSize: '11px' }}>キーワード</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>
                        {item.keyword_count.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#A1A1AA', marginBottom: '4px' }}>
                        <TrendingUp className="h-3 w-3" />
                        <span style={{ fontSize: '11px' }}>直帰率</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>
                        {item.bounce_rate ? `${item.bounce_rate}%` : '-'}
                      </div>
                    </div>
                  </div>

                  {/* トラフィックソース（データがある場合のみ表示） */}
                  {item.traffic_sources && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F4F4F5' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#A1A1AA', marginBottom: '8px' }}>
                        <BarChart3 className="h-3 w-3" />
                        <span style={{ fontSize: '11px' }}>トラフィックソース</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {item.traffic_sources.search_pct && (
                          <span style={{ fontSize: '10px', background: '#DBEAFE', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px' }}>
                            検索 {item.traffic_sources.search_pct}%
                          </span>
                        )}
                        {item.traffic_sources.direct_pct && (
                          <span style={{ fontSize: '10px', background: '#E0E7FF', color: '#3730A3', padding: '2px 6px', borderRadius: '4px' }}>
                            直接 {item.traffic_sources.direct_pct}%
                          </span>
                        )}
                        {item.traffic_sources.referral_pct && (
                          <span style={{ fontSize: '10px', background: '#FEE2E2', color: '#991B1B', padding: '2px 6px', borderRadius: '4px' }}>
                            参照 {item.traffic_sources.referral_pct}%
                          </span>
                        )}
                        {item.traffic_sources.social_pct && (
                          <span style={{ fontSize: '10px', background: '#FCE7F3', color: '#9D174D', padding: '2px 6px', borderRadius: '4px' }}>
                            SNS {item.traffic_sources.social_pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 更新日情報 */}
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F4F4F5' }}>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#71717A' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar className="h-3 w-3" />
                        <span>SW:</span>
                        <span style={{ color: item.data_updated_at ? '#18181B' : '#D97706' }}>
                          {formatDate(item.data_updated_at) || '未取得'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText className="h-3 w-3" />
                        <span>CSV:</span>
                        <span style={{ color: item.last_csv_import_at ? '#18181B' : '#A1A1AA' }}>
                          {formatDate(item.last_csv_import_at) || '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* フッター: SimilarWebボタン・ステータス */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderTop: '1px solid #F4F4F5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#FAFAFA',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: item.is_active ? '#D1FAE5' : '#FEE2E2',
                        color: item.is_active ? '#065F46' : '#991B1B',
                        fontWeight: 500,
                      }}
                    >
                      {item.is_active ? 'アクティブ' : '非アクティブ'}
                    </span>
                    <button
                      onClick={() => handleToggleActive(item)}
                      style={{
                        fontSize: '11px',
                        color: '#7C3AED',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {item.is_active ? '停止' : '有効化'}
                    </button>
                  </div>
                  <button
                    onClick={() => openSimilarWebModal(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: hasSimilarWebData(item) ? '#FFFFFF' : '#6366F1',
                      color: hasSimilarWebData(item) ? '#6366F1' : '#FFFFFF',
                      border: hasSimilarWebData(item) ? '1px solid #6366F1' : 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <Upload className="h-3 w-3" />
                    {hasSimilarWebData(item) ? 'SW更新' : 'SimilarWeb取込'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid #E4E4E7',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                {editingMedia ? '媒体を編集' : '新規媒体を追加'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#A1A1AA',
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                  媒体名 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: Indeed"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E4E4E7',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                  ドメイン <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="例: jp.indeed.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E4E4E7',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <p style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '4px' }}>
                  SimilarWebでの検索に使用します
                </p>
              </div>

              <div style={{ marginBottom: '16px', padding: '12px', background: '#F0F9FF', borderRadius: '6px', border: '1px solid #BAE6FD' }}>
                <p style={{ fontSize: '12px', color: '#0369A1', margin: 0 }}>
                  月間訪問数・直帰率などのデータは、登録後にSimilarWeb画像から取り込みます。
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#52525B',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  アクティブとして公開
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 24px',
                borderTop: '1px solid #E4E4E7',
                background: '#FAFAFA',
              }}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#52525B',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.domain || saveLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#7C3AED',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#FFFFFF',
                  cursor: saveLoading || !formData.name || !formData.domain ? 'not-allowed' : 'pointer',
                  opacity: saveLoading || !formData.name || !formData.domain ? 0.7 : 1,
                }}
              >
                {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingMedia ? '保存' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SimilarWeb Import Modal */}
      {isSimilarWebModalOpen && selectedMediaForSW && (
        <div
          onClick={() => setIsSimilarWebModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '560px',
              overflow: 'hidden',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid #E4E4E7',
              }}
            >
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                  SimilarWebデータ取り込み
                </h2>
                <p style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '4px' }}>
                  {selectedMediaForSW.name}
                </p>
              </div>
              <button
                onClick={() => setIsSimilarWebModalOpen(false)}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#A1A1AA',
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Image Upload Area */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '8px' }}>
                  SimilarWebのスクリーンショット（2枚以上推奨）
                </label>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #E4E4E7',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#FAFAFA',
                    marginBottom: '12px',
                  }}
                >
                  <ImageIcon className="h-8 w-8 mx-auto" style={{ color: '#A1A1AA', marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px', color: '#52525B', margin: 0 }}>
                    クリックして画像を選択
                  </p>
                  <p style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '4px' }}>
                    PNG, JPEG, WebP, GIF（最大5枚、各10MB以下）
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                {/* Selected Images */}
                {swImages.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {swImages.map((file, index) => (
                      <div
                        key={index}
                        style={{
                          position: 'relative',
                          width: '80px',
                          height: '80px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid #E4E4E7',
                        }}
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Screenshot ${index + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          onClick={() => removeImage(index)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.6)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <X className="h-3 w-3" style={{ color: '#FFFFFF' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {swError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: '#FEF2F2',
                    borderRadius: '6px',
                    marginBottom: '16px',
                  }}
                >
                  <AlertCircle className="h-4 w-4" style={{ color: '#DC2626' }} />
                  <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>{swError}</p>
                </div>
              )}

              {/* Extract Result */}
              {swExtractResult && (
                <div
                  style={{
                    padding: '16px',
                    background: '#F0FDF4',
                    borderRadius: '8px',
                    border: '1px solid #BBF7D0',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Check className="h-4 w-4" style={{ color: '#16A34A' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#16A34A' }}>
                      データを抽出しました
                    </span>
                    {swExtractResult.confidence && (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: swExtractResult.confidence === 'high' ? '#DCFCE7' : '#FEF9C3',
                          color: swExtractResult.confidence === 'high' ? '#166534' : '#854D0E',
                        }}
                      >
                        {swExtractResult.confidence === 'high' ? '高信頼度' : swExtractResult.confidence === 'medium' ? '中信頼度' : '低信頼度'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {swExtractResult.domain && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>ドメイン</div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{swExtractResult.domain}</div>
                      </div>
                    )}
                    {swExtractResult.monthly_visits && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>月間訪問数</div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{formatNumber(swExtractResult.monthly_visits)}</div>
                      </div>
                    )}
                    {swExtractResult.bounce_rate && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>直帰率</div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{swExtractResult.bounce_rate}%</div>
                      </div>
                    )}
                    {swExtractResult.pages_per_visit && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>平均ページ数</div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{swExtractResult.pages_per_visit.toFixed(2)}</div>
                      </div>
                    )}
                    {swExtractResult.avg_visit_duration && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>平均滞在時間</div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{formatDuration(swExtractResult.avg_visit_duration)}</div>
                      </div>
                    )}
                  </div>

                  {swExtractResult.traffic_sources && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>トラフィックソース</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {swExtractResult.traffic_sources.search && (
                          <span style={{ fontSize: '11px', background: '#E0E7FF', color: '#3730A3', padding: '2px 8px', borderRadius: '4px' }}>
                            検索: {swExtractResult.traffic_sources.search}%
                          </span>
                        )}
                        {swExtractResult.traffic_sources.direct && (
                          <span style={{ fontSize: '11px', background: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '4px' }}>
                            直接: {swExtractResult.traffic_sources.direct}%
                          </span>
                        )}
                        {swExtractResult.traffic_sources.referral && (
                          <span style={{ fontSize: '11px', background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '4px' }}>
                            参照: {swExtractResult.traffic_sources.referral}%
                          </span>
                        )}
                        {swExtractResult.traffic_sources.social && (
                          <span style={{ fontSize: '11px', background: '#FCE7F3', color: '#9D174D', padding: '2px 8px', borderRadius: '4px' }}>
                            SNS: {swExtractResult.traffic_sources.social}%
                          </span>
                        )}
                        {swExtractResult.traffic_sources.display && (
                          <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '4px' }}>
                            広告: {swExtractResult.traffic_sources.display}%
                          </span>
                        )}
                        {swExtractResult.traffic_sources.mail && (
                          <span style={{ fontSize: '11px', background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '4px' }}>
                            メール: {swExtractResult.traffic_sources.mail}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 24px',
                borderTop: '1px solid #E4E4E7',
                background: '#FAFAFA',
              }}
            >
              <button
                onClick={() => setIsSimilarWebModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#52525B',
                  cursor: 'pointer',
                }}
              >
                {swExtractResult ? '閉じる' : 'キャンセル'}
              </button>
              {!swExtractResult && (
                <button
                  onClick={handleExtractSimilarWeb}
                  disabled={swImages.length === 0 || swExtractLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: '#6366F1',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#FFFFFF',
                    cursor: swImages.length === 0 || swExtractLoading ? 'not-allowed' : 'pointer',
                    opacity: swImages.length === 0 || swExtractLoading ? 0.7 : 1,
                  }}
                >
                  {swExtractLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      解析中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      データを抽出
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
