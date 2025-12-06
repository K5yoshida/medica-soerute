'use client'

import { useEffect, useState, useCallback } from 'react'
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
} from 'lucide-react'

/**
 * SC-904: 媒体マスター管理画面
 *
 * 機能:
 * - 媒体一覧表示
 * - 新規媒体追加
 * - 媒体編集・削除
 */

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
    monthly_visits: '',
    is_active: true,
  })
  const [saveLoading, setSaveLoading] = useState(false)

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
      monthly_visits: '',
      is_active: true,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (item: Media) => {
    setEditingMedia(item)
    setFormData({
      name: item.name,
      domain: item.domain || '',
      monthly_visits: item.monthly_visits?.toString() || '',
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
          monthly_visits: formData.monthly_visits ? parseInt(formData.monthly_visits) : null,
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

  const formatNumber = (num: number | null) => {
    if (num === null) return '-'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
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
              求人媒体の登録・編集
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
                        background: '#EDE9FE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#7C3AED',
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
                      {item.domain && (
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
                </div>

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
                      fontSize: '12px',
                      color: '#7C3AED',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {item.is_active ? '非アクティブにする' : 'アクティブにする'}
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
                  ドメイン
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
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                  月間訪問数
                </label>
                <input
                  type="number"
                  value={formData.monthly_visits}
                  onChange={(e) => setFormData({ ...formData, monthly_visits: e.target.value })}
                  placeholder="例: 10000000"
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
                disabled={!formData.name || saveLoading}
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
                  cursor: saveLoading || !formData.name ? 'not-allowed' : 'pointer',
                  opacity: saveLoading || !formData.name ? 0.7 : 1,
                }}
              >
                {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingMedia ? '保存' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
