'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  Globe,
  X,
  Loader2,
  ExternalLink,
  FileText,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Edit,
  ChevronLeft,
  ChevronRight,
  List,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

/**
 * SC-904: 媒体マスター管理画面
 *
 * 機能:
 * - 媒体一覧表示（テーブル形式）
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

// ソート可能なカラムのキー
type SortKey =
  | 'name'
  | 'data_updated_at'
  | 'last_csv_import_at'
  | 'monthly_visits'
  | 'keyword_count'
  | 'bounce_rate'
  | 'pages_per_visit'
  | 'avg_visit_duration'
  | 'search_pct'
  | 'direct_pct'
  | 'referral_pct'
  | 'display_pct'
  | 'email_pct'
  | 'social_pct'

// ジョブ関連の型定義
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

interface ImportJob {
  id: string
  status: JobStatus
  file_name: string
  import_type: string
  media_id: string | null
  total_rows: number | null
  processed_rows: number
  success_count: number
  error_count: number
  current_step: string | null
  created_at: string
}

const STATUS_LABELS: Record<JobStatus, string> = {
  pending: '待機中',
  processing: '処理中',
  completed: '完了',
  failed: '失敗',
  cancelled: 'キャンセル',
}

const STEP_LABELS: Record<string, string> = {
  parse: 'CSVパース',
  db_lookup: 'DB検索',
  rule_classification: 'ルール分類',
  ai_classification: 'AI分類',
  db_insert: 'データ保存',
  finalize: '完了処理',
}

export default function MediaPage() {
  const router = useRouter()
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // ソート状態
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMedia, setEditingMedia] = useState<Media | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    is_active: true,
  })
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // SimilarWeb Import modal
  const [isSimilarWebModalOpen, setIsSimilarWebModalOpen] = useState(false)
  const [selectedMediaForSW, setSelectedMediaForSW] = useState<Media | null>(null)
  const [swImages, setSwImages] = useState<File[]>([])
  const [swExtractLoading, setSwExtractLoading] = useState(false)
  const [swExtractResult, setSwExtractResult] = useState<SimilarWebExtractData | null>(null)
  const [swError, setSwError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ジョブ一覧サイドモーダル
  const [showJobList, setShowJobList] = useState(false)
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null)

  // ジョブ一覧取得
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/import/jobs?limit=10')
      const data = await res.json()
      if (data.success && data.data) {
        setJobs(data.data.jobs)
        // 選択中のジョブがあれば更新
        if (selectedJob) {
          const updatedJob = data.data.jobs.find((j: ImportJob) => j.id === selectedJob.id)
          if (updatedJob) {
            setSelectedJob(updatedJob)
          }
        }
      }
    } catch {
      console.error('Failed to fetch jobs')
    }
  }, [selectedJob])

  // 初回ジョブ取得（バッジ表示用）
  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // ジョブ一覧のポーリング
  useEffect(() => {
    if (!showJobList) return

    const hasProcessingJob = jobs.some((j) => j.status === 'processing' || j.status === 'pending')
    const interval = hasProcessingJob ? 2000 : 5000

    const pollingInterval = setInterval(fetchJobs, interval)

    return () => {
      clearInterval(pollingInterval)
    }
  }, [fetchJobs, showJobList, jobs])

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        show_inactive_only: showInactive.toString(),
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

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, showInactive])

  const openAddModal = () => {
    setEditingMedia(null)
    setFormData({
      name: '',
      domain: '',
      is_active: true,
    })
    setSaveError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (item: Media) => {
    setEditingMedia(item)
    setFormData({
      name: item.name,
      domain: item.domain || '',
      is_active: item.is_active,
    })
    setSaveError(null)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    setSaveLoading(true)
    setSaveError(null)
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
        setSaveError(null)
        fetchMedia()
      } else {
        setSaveError(data.error?.message || '保存に失敗しました')
      }
    } catch (error) {
      console.error('Failed to save media:', error)
      setSaveError('保存中にエラーが発生しました')
    } finally {
      setSaveLoading(false)
    }
  }

  // SimilarWeb Import handlers
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      // 画像ファイルのみフィルタリング
      const imageFiles = Array.from(files).filter(file =>
        ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)
      )
      const newFiles = imageFiles.slice(0, 5 - swImages.length)
      if (newFiles.length > 0) {
        setSwImages([...swImages, ...newFiles])
      }
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
    return num.toLocaleString()
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }

  const hasSimilarWebData = (item: Media) => {
    return item.monthly_visits !== null || item.bounce_rate !== null
  }

  // ソート処理
  const handleSort = (column: SortKey) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  // ソートされたデータ
  const sortedMedia = [...media].sort((a, b) => {
    let aVal: number | string | null = null
    let bVal: number | string | null = null

    switch (sortBy) {
      case 'name':
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        break
      case 'data_updated_at':
        aVal = a.data_updated_at || ''
        bVal = b.data_updated_at || ''
        break
      case 'last_csv_import_at':
        aVal = a.last_csv_import_at || ''
        bVal = b.last_csv_import_at || ''
        break
      case 'monthly_visits':
        aVal = a.monthly_visits ?? -1
        bVal = b.monthly_visits ?? -1
        break
      case 'keyword_count':
        aVal = a.keyword_count
        bVal = b.keyword_count
        break
      case 'bounce_rate':
        aVal = a.bounce_rate ?? -1
        bVal = b.bounce_rate ?? -1
        break
      case 'pages_per_visit':
        aVal = a.pages_per_visit ?? -1
        bVal = b.pages_per_visit ?? -1
        break
      case 'avg_visit_duration':
        aVal = a.avg_visit_duration ?? -1
        bVal = b.avg_visit_duration ?? -1
        break
      case 'search_pct':
        aVal = a.traffic_sources?.search_pct ?? -1
        bVal = b.traffic_sources?.search_pct ?? -1
        break
      case 'direct_pct':
        aVal = a.traffic_sources?.direct_pct ?? -1
        bVal = b.traffic_sources?.direct_pct ?? -1
        break
      case 'referral_pct':
        aVal = a.traffic_sources?.referral_pct ?? -1
        bVal = b.traffic_sources?.referral_pct ?? -1
        break
      case 'display_pct':
        aVal = a.traffic_sources?.display_pct ?? -1
        bVal = b.traffic_sources?.display_pct ?? -1
        break
      case 'email_pct':
        aVal = a.traffic_sources?.email_pct ?? -1
        bVal = b.traffic_sources?.email_pct ?? -1
        break
      case 'social_pct':
        aVal = a.traffic_sources?.social_pct ?? -1
        bVal = b.traffic_sources?.social_pct ?? -1
        break
    }

    if (aVal === null || bVal === null) return 0
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  // Pagination
  const totalCount = sortedMedia.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const paginatedMedia = sortedMedia.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
              求人媒体の登録・編集・データ取り込み
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="/admin/import"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#FFFFFF',
                color: '#6366F1',
                border: '1px solid #6366F1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <FileText className="h-4 w-4" />
              ラッコKWインポート
            </a>
            <button
              onClick={() => {
                setSelectedMediaForSW(null)
                setSwImages([])
                setSwExtractResult(null)
                setSwError(null)
                setIsSimilarWebModalOpen(true)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#FFFFFF',
                color: '#6366F1',
                border: '1px solid #6366F1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Upload className="h-4 w-4" />
              SimilarWeb更新
            </button>
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
        </div>
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {/* Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search */}
            <div style={{ position: 'relative', maxWidth: '320px' }}>
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
                  width: '280px',
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

            <span style={{ fontSize: '13px', color: '#A1A1AA' }}>
              {totalCount}件
            </span>
          </div>

          {/* ジョブ一覧ボタン */}
          <button
            onClick={() => setShowJobList(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#FFFFFF',
              color: '#6366F1',
              border: '1px solid #6366F1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <List className="h-4 w-4" />
            ジョブ一覧
            {jobs.filter((j) => j.status === 'processing').length > 0 && (
              <span
                style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 600,
                }}
              >
                {jobs.filter((j) => j.status === 'processing').length}
              </span>
            )}
          </button>
        </div>

        {/* Media Table */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1400px' }}>
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E4E4E7' }}>
                  <th
                    onClick={() => handleSort('name')}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#52525B',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      left: 0,
                      background: '#FAFAFA',
                      zIndex: 1,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>媒体名</span>
                      <span style={{ fontSize: '10px', color: sortBy === 'name' ? '#7C3AED' : '#D4D4D8' }}>
                        {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </div>
                  </th>
                  <HeaderCell label="SW更新" sortKey="data_updated_at" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="ラッコ更新" sortKey="last_csv_import_at" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="月間訪問" sortKey="monthly_visits" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="KW数" sortKey="keyword_count" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="直帰率" sortKey="bounce_rate" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="PV/訪問" sortKey="pages_per_visit" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="平均滞在" sortKey="avg_visit_duration" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="検索" sortKey="search_pct" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="直接" sortKey="direct_pct" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="参照" sortKey="referral_pct" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="広告" sortKey="display_pct" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="メール" sortKey="email_pct" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="SNS" sortKey="social_pct" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                  <HeaderCell label="ステータス" />
                  <th style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 500, color: '#52525B', background: '#FAFAFA' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={16} style={{ padding: '48px', textAlign: 'center' }}>
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: '#A1A1AA' }} />
                      <p style={{ marginTop: '8px', color: '#A1A1AA', fontSize: '13px' }}>読み込み中...</p>
                    </td>
                  </tr>
                ) : paginatedMedia.length === 0 ? (
                  <tr>
                    <td colSpan={16} style={{ padding: '48px', textAlign: 'center', color: '#A1A1AA' }}>
                      媒体が見つかりません
                    </td>
                  </tr>
                ) : (
                  paginatedMedia.map((item, index) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: index < paginatedMedia.length - 1 ? '1px solid #F4F4F5' : 'none',
                        opacity: item.is_active ? 1 : 0.6,
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* 媒体名 - 固定列 */}
                      <td
                        style={{
                          padding: '12px 16px',
                          position: 'sticky',
                          left: 0,
                          background: '#FFFFFF',
                          zIndex: 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '6px',
                              background: hasSimilarWebData(item) ? '#EDE9FE' : '#FEF3C7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: hasSimilarWebData(item) ? '#7C3AED' : '#D97706',
                              fontSize: '12px',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {item.name.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#18181B',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '160px',
                              }}
                            >
                              {item.name}
                            </div>
                            {item.domain ? (
                              <a
                                href={`https://${item.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  fontSize: '11px',
                                  color: '#7C3AED',
                                  textDecoration: 'none',
                                }}
                              >
                                <Globe className="h-3 w-3" />
                                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.domain}
                                </span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#A1A1AA' }}>ドメイン未設定</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <DataCell
                        value={formatDate(item.data_updated_at)}
                        color={item.data_updated_at ? '#16A34A' : '#D97706'}
                      />
                      <DataCell value={formatDate(item.last_csv_import_at)} />
                      <DataCell value={formatNumber(item.monthly_visits)} bold />
                      <DataCell value={item.keyword_count.toLocaleString()} />
                      <DataCell value={item.bounce_rate != null ? `${item.bounce_rate.toFixed(2)}%` : '-'} />
                      <DataCell value={item.pages_per_visit ? item.pages_per_visit.toFixed(1) : '-'} />
                      <DataCell value={formatDuration(item.avg_visit_duration)} />
                      <DataCell value={item.traffic_sources?.search_pct != null ? `${item.traffic_sources.search_pct.toFixed(2)}%` : '-'} color="#3730A3" />
                      <DataCell value={item.traffic_sources?.direct_pct != null ? `${item.traffic_sources.direct_pct.toFixed(2)}%` : '-'} color="#1E40AF" />
                      <DataCell value={item.traffic_sources?.referral_pct != null ? `${item.traffic_sources.referral_pct.toFixed(2)}%` : '-'} color="#DC2626" />
                      <DataCell value={item.traffic_sources?.display_pct != null ? `${item.traffic_sources.display_pct.toFixed(2)}%` : '-'} color="#D97706" />
                      <DataCell value={item.traffic_sources?.email_pct != null ? `${item.traffic_sources.email_pct.toFixed(2)}%` : '-'} color="#059669" />
                      <DataCell value={item.traffic_sources?.social_pct != null ? `${item.traffic_sources.social_pct.toFixed(2)}%` : '-'} color="#DB2777" />
                      {/* ステータス */}
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: item.is_active ? '#D1FAE5' : '#FEE2E2',
                            color: item.is_active ? '#065F46' : '#991B1B',
                            fontWeight: 500,
                          }}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {/* 操作 */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(item)
                          }}
                          style={{
                            padding: '6px',
                            background: '#F4F4F5',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: '#52525B',
                          }}
                          title="編集"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
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
          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '13px', color: '#A1A1AA' }}>
              {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} / {totalCount}件
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

              {/* エラーメッセージ */}
              {saveError && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle className="h-4 w-4" style={{ color: '#DC2626', flexShrink: 0 }} />
                    <p style={{ fontSize: '12px', color: '#DC2626', margin: 0 }}>
                      {saveError}
                    </p>
                  </div>
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
      {isSimilarWebModalOpen && (
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
                {selectedMediaForSW && (
                  <p style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '4px' }}>
                    {selectedMediaForSW.name}
                  </p>
                )}
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
              {/* Media Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '8px' }}>
                  対象媒体 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={selectedMediaForSW?.id || ''}
                  onChange={(e) => {
                    const selected = media.find(m => m.id === e.target.value)
                    setSelectedMediaForSW(selected || null)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E4E4E7',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="">媒体を選択してください</option>
                  {media.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.domain ? `(${m.domain})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image Upload Area */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '8px' }}>
                  SimilarWebのスクリーンショット（2枚以上推奨）
                </label>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    border: isDragging ? '2px dashed #7C3AED' : '2px dashed #E4E4E7',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragging ? '#F5F3FF' : '#FAFAFA',
                    marginBottom: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ImageIcon className="h-8 w-8 mx-auto" style={{ color: isDragging ? '#7C3AED' : '#A1A1AA', marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px', color: isDragging ? '#7C3AED' : '#52525B', margin: 0 }}>
                    {isDragging ? 'ここにドロップ' : 'クリックまたはドラッグ＆ドロップで画像を選択'}
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
                    {swExtractResult.bounce_rate != null && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>直帰率</div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{swExtractResult.bounce_rate.toFixed(2)}%</div>
                      </div>
                    )}
                    {swExtractResult.pages_per_visit && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>PV/訪問</div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{swExtractResult.pages_per_visit.toFixed(1)}</div>
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
                        {swExtractResult.traffic_sources.search != null && (
                          <span style={{ fontSize: '11px', background: '#E0E7FF', color: '#3730A3', padding: '2px 8px', borderRadius: '4px' }}>
                            検索: {swExtractResult.traffic_sources.search.toFixed(2)}%
                          </span>
                        )}
                        {swExtractResult.traffic_sources.direct != null && (
                          <span style={{ fontSize: '11px', background: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '4px' }}>
                            直接: {swExtractResult.traffic_sources.direct.toFixed(2)}%
                          </span>
                        )}
                        {swExtractResult.traffic_sources.referral != null && (
                          <span style={{ fontSize: '11px', background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '4px' }}>
                            参照: {swExtractResult.traffic_sources.referral.toFixed(2)}%
                          </span>
                        )}
                        {swExtractResult.traffic_sources.social != null && (
                          <span style={{ fontSize: '11px', background: '#FCE7F3', color: '#9D174D', padding: '2px 8px', borderRadius: '4px' }}>
                            SNS: {swExtractResult.traffic_sources.social.toFixed(2)}%
                          </span>
                        )}
                        {swExtractResult.traffic_sources.display != null && (
                          <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '4px' }}>
                            広告: {swExtractResult.traffic_sources.display.toFixed(2)}%
                          </span>
                        )}
                        {swExtractResult.traffic_sources.mail != null && (
                          <span style={{ fontSize: '11px', background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '4px' }}>
                            メール: {swExtractResult.traffic_sources.mail.toFixed(2)}%
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
                  disabled={!selectedMediaForSW || swImages.length === 0 || swExtractLoading}
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
                    cursor: !selectedMediaForSW || swImages.length === 0 || swExtractLoading ? 'not-allowed' : 'pointer',
                    opacity: !selectedMediaForSW || swImages.length === 0 || swExtractLoading ? 0.7 : 1,
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

      {/* Job List Side Modal */}
      {showJobList && (
        <>
          {/* Overlay */}
          <div
            onClick={() => {
              setShowJobList(false)
              setSelectedJob(null)
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              zIndex: 50,
            }}
          />
          {/* Side Panel */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '400px',
              background: '#FFFFFF',
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
              zIndex: 51,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E4E4E7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#18181B' }}>
                ジョブ一覧
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={fetchJobs}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#52525B',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  更新
                </button>
                <button
                  onClick={() => router.push('/admin/import')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    background: '#7C3AED',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  新規インポート
                </button>
                <button
                  onClick={() => {
                    setShowJobList(false)
                    setSelectedJob(null)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    background: '#F4F4F5',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <X className="h-4 w-4" style={{ color: '#52525B' }} />
                </button>
              </div>
            </div>

            {/* Job List */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {jobs.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: '#A1A1AA' }}>
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p style={{ fontSize: '14px' }}>ジョブがありません</p>
                  <button
                    onClick={() => router.push('/admin/import')}
                    style={{
                      marginTop: '16px',
                      padding: '8px 16px',
                      background: '#7C3AED',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    CSVインポートを開始
                  </button>
                </div>
              ) : selectedJob ? (
                // ジョブ詳細表示
                <div style={{ padding: '24px' }}>
                  <button
                    onClick={() => setSelectedJob(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      background: '#F4F4F5',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#52525B',
                      cursor: 'pointer',
                      marginBottom: '16px',
                    }}
                  >
                    ← 一覧に戻る
                  </button>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {selectedJob.status === 'processing' && (
                        <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#7C3AED' }} />
                      )}
                      {selectedJob.status === 'completed' && (
                        <CheckCircle2 className="h-5 w-5" style={{ color: '#10B981' }} />
                      )}
                      {selectedJob.status === 'failed' && (
                        <XCircle className="h-5 w-5" style={{ color: '#EF4444' }} />
                      )}
                      {selectedJob.status === 'pending' && (
                        <Clock className="h-5 w-5" style={{ color: '#A1A1AA' }} />
                      )}
                      <span style={{ fontSize: '16px', fontWeight: 600, color: '#18181B' }}>
                        {STATUS_LABELS[selectedJob.status]}
                      </span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#52525B', wordBreak: 'break-all' }}>
                      {selectedJob.file_name}
                    </p>
                  </div>

                  {selectedJob.status === 'processing' && selectedJob.total_rows && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#71717A' }}>進捗</span>
                        <span style={{ fontSize: '12px', color: '#52525B' }}>
                          {selectedJob.processed_rows} / {selectedJob.total_rows}
                        </span>
                      </div>
                      <div style={{ height: '8px', background: '#E4E4E7', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            background: '#7C3AED',
                            width: `${(selectedJob.processed_rows / selectedJob.total_rows) * 100}%`,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      {selectedJob.current_step && (
                        <p style={{ fontSize: '12px', color: '#71717A', marginTop: '6px' }}>
                          現在: {STEP_LABELS[selectedJob.current_step] || selectedJob.current_step}
                        </p>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '12px', background: '#F4F4F5', borderRadius: '6px' }}>
                      <div style={{ fontSize: '11px', color: '#71717A', marginBottom: '4px' }}>成功</div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#10B981' }}>
                        {selectedJob.success_count.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '12px', background: '#F4F4F5', borderRadius: '6px' }}>
                      <div style={{ fontSize: '11px', color: '#71717A', marginBottom: '4px' }}>エラー</div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: selectedJob.error_count > 0 ? '#EF4444' : '#52525B' }}>
                        {selectedJob.error_count.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', fontSize: '12px', color: '#A1A1AA' }}>
                    作成: {new Date(selectedJob.created_at).toLocaleString('ja-JP')}
                  </div>
                </div>
              ) : (
                // ジョブ一覧
                jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    style={{
                      padding: '16px 24px',
                      borderBottom: '1px solid #F4F4F5',
                      cursor: 'pointer',
                      background: 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#FAFAFA'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      {job.status === 'processing' && (
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#7C3AED' }} />
                      )}
                      {job.status === 'completed' && (
                        <CheckCircle2 className="h-4 w-4" style={{ color: '#10B981' }} />
                      )}
                      {job.status === 'failed' && (
                        <XCircle className="h-4 w-4" style={{ color: '#EF4444' }} />
                      )}
                      {job.status === 'cancelled' && (
                        <X className="h-4 w-4" style={{ color: '#A1A1AA' }} />
                      )}
                      {job.status === 'pending' && (
                        <Clock className="h-4 w-4" style={{ color: '#A1A1AA' }} />
                      )}
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: '#18181B',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {job.file_name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginLeft: '26px' }}>
                      <span style={{ fontSize: '12px', color: '#71717A' }}>
                        {STATUS_LABELS[job.status]}
                        {job.status === 'processing' && job.current_step && (
                          <> - {STEP_LABELS[job.current_step] || job.current_step}</>
                        )}
                      </span>
                      <span style={{ fontSize: '12px', color: '#A1A1AA' }}>
                        {new Date(job.created_at).toLocaleString('ja-JP', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {job.status === 'processing' && job.total_rows && (
                      <div
                        style={{
                          height: '4px',
                          background: '#E4E4E7',
                          borderRadius: '2px',
                          marginTop: '8px',
                          marginLeft: '26px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            background: '#7C3AED',
                            width: `${(job.processed_rows / job.total_rows) * 100}%`,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ヘッダーセルコンポーネント（ソート対応）
function HeaderCell({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder,
  onSort,
}: {
  label: string
  sortKey?: SortKey
  currentSortBy?: SortKey
  currentSortOrder?: 'asc' | 'desc'
  onSort?: (key: SortKey) => void
}) {
  const isSortable = sortKey && onSort
  const isActive = currentSortBy === sortKey

  return (
    <th
      onClick={isSortable ? () => onSort(sortKey) : undefined}
      style={{
        textAlign: 'center',
        padding: '12px 8px',
        fontSize: '12px',
        fontWeight: 500,
        color: '#52525B',
        whiteSpace: 'nowrap',
        cursor: isSortable ? 'pointer' : 'default',
        background: '#FAFAFA',
        userSelect: 'none',
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
        {isSortable && (
          <span style={{ fontSize: '10px', color: isActive ? '#7C3AED' : '#D4D4D8' }}>
            {isActive ? (currentSortOrder === 'asc' ? '↑' : '↓') : '↕'}
          </span>
        )}
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
