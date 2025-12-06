'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  Clock,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  X,
  Play,
  List,
} from 'lucide-react'

/**
 * SC-903: CSVインポート画面（4ステップウィザード版）
 *
 * 機能:
 * - Step 1: ファイル選択
 * - Step 2: 設定（インポートタイプ、媒体選択）
 * - Step 3: プレビュー確認
 * - Step 4: 実行・進捗表示
 * - ジョブ一覧表示（Supabase Realtimeで進捗更新）
 */

type ImportType = 'rakko_keywords' | 'similarweb'
type QueryIntent = 'branded' | 'transactional' | 'commercial' | 'informational' | 'unknown'
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

interface MediaOption {
  id: string
  name: string
}

interface PreviewRow {
  keyword: string
  searchVolume: number | null
  cpc: number | null
  competition: number | null
  seoDifficulty: number | null
  searchRank: number | null
  estimatedTraffic: number | null
  url: string | null
}

interface ImportJob {
  id: string
  status: JobStatus
  file_name: string
  import_type: ImportType
  media_id: string | null
  total_rows: number | null
  processed_rows: number
  success_count: number
  error_count: number
  current_step: string | null
  intent_summary: Record<string, number> | null
  error_message: string | null
  error_details: {
    insertErrors?: string[]
    parseErrors?: string[]
    duplicateInfo?: string
  } | null
  classification_stats: {
    db_existing: number
    rule_classified: number
    ai_classified: number
    total_input: number
    unique_keywords: number
    duplicate_keywords: number
  } | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

const INTENT_LABELS: Record<QueryIntent, string> = {
  branded: '指名検索',
  transactional: '応募直前',
  commercial: '比較検討',
  informational: '情報収集',
  unknown: '未分類',
}

const INTENT_COLORS: Record<QueryIntent, string> = {
  branded: '#8B5CF6',
  transactional: '#10B981',
  commercial: '#F59E0B',
  informational: '#3B82F6',
  unknown: '#A1A1AA',
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

export default function ImportPage() {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<ImportType>('rakko_keywords')
  const [selectedMediaId, setSelectedMediaId] = useState<string>('')
  const [mediaList, setMediaList] = useState<MediaOption[]>([])

  // Preview state
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [_columns, setColumns] = useState<string[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Job state
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showJobList, setShowJobList] = useState(false)

  // Preview state
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<{
    items: { keyword: string; intent: string; intent_reason: string; search_volume: number | null }[]
    total: number
  } | null>(null)
  const [previewFilter, setPreviewFilter] = useState<string>('all')
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 媒体リストを取得
  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const res = await fetch('/api/media')
        const data = await res.json()
        if (data.success && data.data) {
          setMediaList(data.data.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name })))
        }
      } catch {
        console.error('Failed to fetch media list')
      }
    }
    fetchMedia()
  }, [])

  // ジョブ一覧を取得
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/import/jobs?limit=10')
      const data = await res.json()
      if (data.success && data.data) {
        setJobs(data.data.jobs)
      }
    } catch {
      console.error('Failed to fetch jobs')
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // ポーリングで進捗を更新
  // Supabase RealtimeはRLSの制限でanon keyでは正常に動作しないことがあるため、
  // 安定性を優先してポーリングをメインにする
  useEffect(() => {
    // 処理中のジョブがある場合は2秒間隔、なければ5秒間隔
    const hasProcessingJob = jobs.some((j) => j.status === 'processing' || j.status === 'pending')
    const interval = hasProcessingJob ? 2000 : 5000

    const pollingInterval = setInterval(fetchJobs, interval)

    return () => {
      clearInterval(pollingInterval)
    }
  }, [fetchJobs, jobs])

  // ファイル選択
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setValidationError(null)
      setPreviewRows([])
      setTotalRows(0)
      setColumns([])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setValidationError(null)
      setPreviewRows([])
      setTotalRows(0)
      setColumns([])
    }
  }

  // バリデーションAPI呼び出し
  const validateFile = async () => {
    if (!file) return false

    setIsValidating(true)
    setValidationError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', importType)

      const res = await fetch('/api/admin/import/validate', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success && data.data) {
        setPreviewRows(data.data.previewRows)
        setTotalRows(data.data.totalRows)
        setColumns(data.data.columns)
        return true
      } else {
        setValidationError(data.error?.message || 'バリデーションに失敗しました')
        return false
      }
    } catch {
      setValidationError('通信エラーが発生しました')
      return false
    } finally {
      setIsValidating(false)
    }
  }

  // ジョブ開始
  const startImport = async () => {
    if (!file) return

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', importType)
      if (selectedMediaId) {
        formData.append('media_id', selectedMediaId)
      }

      const res = await fetch('/api/admin/import/start', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success && data.data) {
        setCurrentJobId(data.data.jobId)
        setCurrentStep(4)
        // 即座に一度取得し、少し待ってから再度取得（DBに反映されるまでのラグ対策）
        fetchJobs()
        setTimeout(() => fetchJobs(), 1000)
      } else {
        setValidationError(data.error?.message || 'ジョブの開始に失敗しました')
      }
    } catch {
      setValidationError('通信エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ジョブキャンセル
  const cancelJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/import/jobs/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })

      if (res.ok) {
        fetchJobs()
      }
    } catch {
      console.error('Failed to cancel job')
    }
  }

  // ジョブリトライ
  const retryJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/import/jobs/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      })

      if (res.ok) {
        fetchJobs()
      }
    } catch {
      console.error('Failed to retry job')
    }
  }

  // 次のステップへ
  const nextStep = async () => {
    if (currentStep === 2) {
      const isValid = await validateFile()
      if (!isValid) return
    }
    if (currentStep === 3) {
      await startImport()
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4))
  }

  // 前のステップへ
  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  // リセット
  const resetWizard = () => {
    setCurrentStep(1)
    setFile(null)
    setImportType('rakko_keywords')
    setSelectedMediaId('')
    setPreviewRows([])
    setTotalRows(0)
    setColumns([])
    setValidationError(null)
    setCurrentJobId(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 現在のジョブを取得
  const currentJob = currentJobId ? jobs.find((j) => j.id === currentJobId) : null

  // プレビュー取得
  const fetchPreview = async (jobId: string, intent?: string) => {
    setIsLoadingPreview(true)
    try {
      const filter = intent || previewFilter
      const url = `/api/admin/import/jobs/${jobId}/preview${filter !== 'all' ? `?intent=${filter}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success && data.data) {
        setPreviewData(data.data)
      }
    } catch {
      console.error('Failed to fetch preview')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // プレビューを開く
  const openPreview = (jobId: string) => {
    setShowPreview(true)
    setPreviewFilter('all')
    fetchPreview(jobId)
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
              CSVインポート
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
                fontWeight: 400,
              }}
            >
              キーワードデータを非同期でインポート
            </p>
          </div>
          <button
            onClick={() => setShowJobList(!showJobList)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: showJobList ? '#7C3AED' : '#FFFFFF',
              color: showJobList ? '#FFFFFF' : '#52525B',
              border: '1px solid #E4E4E7',
              borderRadius: '6px',
              fontSize: '13px',
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
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Wizard */}
          <div style={{ flex: 1 }}>
            {/* Step Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px',
              }}
            >
              {[1, 2, 3, 4].map((step) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      background:
                        currentStep === step
                          ? '#7C3AED'
                          : currentStep > step
                          ? '#10B981'
                          : '#E4E4E7',
                      color: currentStep >= step ? '#FFFFFF' : '#A1A1AA',
                    }}
                  >
                    {currentStep > step ? <CheckCircle2 className="h-4 w-4" /> : step}
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: currentStep >= step ? '#18181B' : '#A1A1AA',
                    }}
                  >
                    {step === 1
                      ? 'ファイル選択'
                      : step === 2
                      ? '設定'
                      : step === 3
                      ? 'プレビュー'
                      : '実行'}
                  </span>
                  {step < 4 && (
                    <ChevronRight className="h-4 w-4" style={{ color: '#E4E4E7' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                padding: '24px',
              }}
            >
              {/* Step 1: ファイル選択 */}
              {currentStep === 1 && (
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#18181B', marginBottom: '16px' }}>
                    CSVファイルを選択
                  </h2>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #E4E4E7',
                      borderRadius: '8px',
                      padding: '48px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: file ? '#F5F3FF' : '#FAFAFA',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    {file ? (
                      <>
                        <FileText className="h-12 w-12 mx-auto mb-3" style={{ color: '#7C3AED' }} />
                        <p style={{ fontSize: '15px', fontWeight: 500, color: '#18181B' }}>{file.name}</p>
                        <p style={{ fontSize: '13px', color: '#A1A1AA', marginTop: '4px' }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 mx-auto mb-3" style={{ color: '#A1A1AA' }} />
                        <p style={{ fontSize: '15px', fontWeight: 500, color: '#18181B' }}>
                          ファイルをドロップまたはクリック
                        </p>
                        <p style={{ fontSize: '13px', color: '#A1A1AA', marginTop: '4px' }}>
                          CSV形式のみ対応（50MB以下）
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: 設定 */}
              {currentStep === 2 && (
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#18181B', marginBottom: '16px' }}>
                    インポート設定
                  </h2>

                  {/* Import Type */}
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#52525B',
                        marginBottom: '8px',
                      }}
                    >
                      インポートタイプ
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setImportType('rakko_keywords')}
                        style={{
                          flex: 1,
                          padding: '16px',
                          border: `1px solid ${importType === 'rakko_keywords' ? '#7C3AED' : '#E4E4E7'}`,
                          borderRadius: '8px',
                          background: importType === 'rakko_keywords' ? 'rgba(124,58,237,0.05)' : '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: importType === 'rakko_keywords' ? '#7C3AED' : '#18181B',
                          }}
                        >
                          ラッコキーワード
                        </div>
                        <div style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '4px' }}>
                          キーワード・順位・検索ボリューム
                        </div>
                      </button>
                      <button
                        onClick={() => setImportType('similarweb')}
                        style={{
                          flex: 1,
                          padding: '16px',
                          border: `1px solid ${importType === 'similarweb' ? '#7C3AED' : '#E4E4E7'}`,
                          borderRadius: '8px',
                          background: importType === 'similarweb' ? 'rgba(124,58,237,0.05)' : '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: importType === 'similarweb' ? '#7C3AED' : '#18181B',
                          }}
                        >
                          SimilarWeb
                        </div>
                        <div style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '4px' }}>
                          トラフィックデータ
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Media Selection */}
                  {importType === 'rakko_keywords' && (
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#52525B',
                          marginBottom: '8px',
                        }}
                      >
                        対象媒体（任意）
                      </label>
                      <select
                        value={selectedMediaId}
                        onChange={(e) => setSelectedMediaId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '6px',
                          fontSize: '14px',
                          color: '#18181B',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">媒体を選択（省略可）</option>
                        {mediaList.map((media) => (
                          <option key={media.id} value={media.id}>
                            {media.name}
                          </option>
                        ))}
                      </select>
                      <p style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '6px' }}>
                        選択すると、該当媒体とキーワードが紐付けられます
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: プレビュー */}
              {currentStep === 3 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>
                      プレビュー確認
                    </h2>
                    <span style={{ fontSize: '12px', color: '#A1A1AA' }}>
                      全{totalRows}件のデータ
                    </span>
                  </div>

                  {isValidating ? (
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                      <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" style={{ color: '#7C3AED' }} />
                      <p style={{ fontSize: '14px', color: '#52525B' }}>CSVを検証中...</p>
                    </div>
                  ) : validationError ? (
                    <div
                      style={{
                        padding: '16px',
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <XCircle className="h-5 w-5" style={{ color: '#EF4444' }} />
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#991B1B' }}>
                          {validationError}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Info Card */}
                      <div
                        style={{
                          padding: '12px 16px',
                          background: '#F5F3FF',
                          borderRadius: '8px',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <AlertCircle className="h-4 w-4" style={{ color: '#7C3AED' }} />
                        <span style={{ fontSize: '12px', color: '#6D28D9' }}>
                          意図分類はインポート実行時にAIが自動分析します（ルールベース＋Claude AI）
                        </span>
                      </div>

                      {/* Preview Table */}
                      <div
                        style={{
                          border: '1px solid #E4E4E7',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          maxHeight: '400px',
                          overflowY: 'auto',
                          overflowX: 'auto',
                        }}
                      >
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
                          <thead>
                            <tr style={{ background: '#F4F4F5', position: 'sticky', top: 0 }}>
                              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap' }}>
                                キーワード
                              </th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap' }}>
                                月間検索数
                              </th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap' }}>
                                CPC
                              </th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap' }}>
                                競合性
                              </th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap' }}>
                                SEO難易度
                              </th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap' }}>
                                検索順位
                              </th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap' }}>
                                推定流入数
                              </th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#52525B', whiteSpace: 'nowrap' }}>
                                URL
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.map((row, i) => (
                              <tr
                                key={i}
                                style={{
                                  borderBottom: '1px solid #F4F4F5',
                                  background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                                }}
                              >
                                <td style={{ padding: '8px 10px', color: '#18181B', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {row.keyword}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#52525B' }}>
                                  {row.searchVolume?.toLocaleString() ?? '-'}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#52525B' }}>
                                  {row.cpc ? `$${row.cpc.toFixed(2)}` : '-'}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#52525B' }}>
                                  {row.competition ?? '-'}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#52525B' }}>
                                  {row.seoDifficulty ?? '-'}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#52525B' }}>
                                  {row.searchRank ?? '-'}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#52525B' }}>
                                  {row.estimatedTraffic?.toLocaleString() ?? '-'}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#52525B', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {row.url ? (
                                    <a href={row.url} target="_blank" rel="noopener noreferrer" style={{ color: '#7C3AED', textDecoration: 'none' }}>
                                      {row.url}
                                    </a>
                                  ) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '8px' }}>
                        プレビュー: 先頭50件を表示
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Step 4: 実行 */}
              {currentStep === 4 && (
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#18181B', marginBottom: '16px' }}>
                    インポート実行
                  </h2>

                  {currentJob ? (
                    <div>
                      {/* Processing Steps Indicator */}
                      {(currentJob.status === 'processing' || currentJob.status === 'completed') && (
                        <div
                          style={{
                            background: '#FAFAFA',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '16px',
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '12px' }}>
                            処理ステップ
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {(['parse', 'db_lookup', 'rule_classification', 'ai_classification', 'db_insert', 'finalize'] as const).map((step, index) => {
                              const stepOrder = ['parse', 'db_lookup', 'rule_classification', 'ai_classification', 'db_insert', 'finalize']
                              const currentStepIndex = currentJob.current_step ? stepOrder.indexOf(currentJob.current_step) : -1
                              const thisStepIndex = stepOrder.indexOf(step)

                              const isCompleted = currentJob.status === 'completed' || thisStepIndex < currentStepIndex
                              const isCurrent = currentJob.status === 'processing' && currentJob.current_step === step

                              return (
                                <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <div
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginBottom: '6px',
                                      background: isCompleted ? '#10B981' : isCurrent ? '#7C3AED' : '#E4E4E7',
                                      color: isCompleted || isCurrent ? '#FFFFFF' : '#A1A1AA',
                                      position: 'relative',
                                    }}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4" />
                                    ) : isCurrent ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{index + 1}</span>
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: isCurrent ? 600 : 400,
                                      color: isCompleted ? '#059669' : isCurrent ? '#7C3AED' : '#A1A1AA',
                                      textAlign: 'center',
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {STEP_LABELS[step]}
                                  </span>
                                  {/* Connector line */}
                                  {index < 5 && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: '16px',
                                        left: 'calc(50% + 20px)',
                                        width: 'calc(100% - 40px)',
                                        height: '2px',
                                        background: isCompleted ? '#10B981' : '#E4E4E7',
                                      }}
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '16px',
                          marginBottom: '16px',
                          background:
                            currentJob.status === 'completed'
                              ? '#ECFDF5'
                              : currentJob.status === 'failed'
                              ? '#FEF2F2'
                              : currentJob.status === 'cancelled'
                              ? '#F4F4F5'
                              : '#F5F3FF',
                        }}
                      >
                        {currentJob.status === 'processing' && (
                          <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#7C3AED' }} />
                        )}
                        {currentJob.status === 'completed' && (
                          <CheckCircle2 className="h-4 w-4" style={{ color: '#10B981' }} />
                        )}
                        {currentJob.status === 'failed' && (
                          <XCircle className="h-4 w-4" style={{ color: '#EF4444' }} />
                        )}
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color:
                              currentJob.status === 'completed'
                                ? '#059669'
                                : currentJob.status === 'failed'
                                ? '#DC2626'
                                : currentJob.status === 'cancelled'
                                ? '#52525B'
                                : '#7C3AED',
                          }}
                        >
                          {STATUS_LABELS[currentJob.status]}
                          {currentJob.current_step && currentJob.status === 'processing' && (
                            <> - {STEP_LABELS[currentJob.current_step] || currentJob.current_step}</>
                          )}
                        </span>
                      </div>

                      {/* Progress (rows) */}
                      {currentJob.status === 'processing' && currentJob.total_rows && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#52525B' }}>データ処理進捗</span>
                            <span style={{ fontSize: '12px', color: '#52525B' }}>
                              {currentJob.processed_rows.toLocaleString()} / {currentJob.total_rows.toLocaleString()}件
                            </span>
                          </div>
                          <div
                            style={{
                              height: '8px',
                              background: '#E4E4E7',
                              borderRadius: '4px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                background: '#7C3AED',
                                width: `${(currentJob.processed_rows / currentJob.total_rows) * 100}%`,
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Result Summary */}
                      {currentJob.status === 'completed' && (
                        <>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '12px',
                              marginBottom: '16px',
                            }}
                          >
                            <div
                              style={{
                                padding: '12px',
                                background: '#F0FDF4',
                                borderRadius: '8px',
                              }}
                            >
                              <div style={{ fontSize: '24px', fontWeight: 600, color: '#166534' }}>
                                {currentJob.success_count}
                              </div>
                              <div style={{ fontSize: '12px', color: '#15803D' }}>成功</div>
                            </div>
                            <div
                              style={{
                                padding: '12px',
                                background: currentJob.error_count > 0 ? '#FEF2F2' : '#F4F4F5',
                                borderRadius: '8px',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '24px',
                                  fontWeight: 600,
                                  color: currentJob.error_count > 0 ? '#991B1B' : '#52525B',
                                }}
                              >
                                {currentJob.error_count}
                              </div>
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: currentJob.error_count > 0 ? '#B91C1C' : '#71717A',
                                }}
                              >
                                エラー
                              </div>
                            </div>
                          </div>

                          {/* Intent Summary */}
                          {currentJob.intent_summary && (
                            <div style={{ marginBottom: '16px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  marginBottom: '12px',
                                }}
                              >
                                <BarChart3 className="h-4 w-4" style={{ color: '#7C3AED' }} />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                                  意図分類結果
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {(Object.keys(currentJob.intent_summary!) as QueryIntent[]).map((intent) => (
                                  <div
                                    key={intent}
                                    style={{
                                      flex: '1 1 100px',
                                      padding: '10px',
                                      background: '#FAFAFA',
                                      borderRadius: '6px',
                                      borderLeft: `3px solid ${INTENT_COLORS[intent]}`,
                                    }}
                                  >
                                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#18181B' }}>
                                      {currentJob.intent_summary![intent]}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#52525B' }}>
                                      {INTENT_LABELS[intent]}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Classification Stats */}
                          {currentJob.classification_stats && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#52525B', marginBottom: '8px' }}>
                                分類処理の内訳
                              </div>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(3, 1fr)',
                                  gap: '8px',
                                  fontSize: '11px',
                                }}
                              >
                                <div style={{ padding: '8px', background: '#F5F3FF', borderRadius: '6px' }}>
                                  <div style={{ fontWeight: 600, color: '#7C3AED' }}>
                                    {currentJob.classification_stats.db_existing}
                                  </div>
                                  <div style={{ color: '#6D28D9' }}>DB既存</div>
                                </div>
                                <div style={{ padding: '8px', background: '#ECFDF5', borderRadius: '6px' }}>
                                  <div style={{ fontWeight: 600, color: '#059669' }}>
                                    {currentJob.classification_stats.rule_classified}
                                  </div>
                                  <div style={{ color: '#047857' }}>ルール分類</div>
                                </div>
                                <div style={{ padding: '8px', background: '#FEF3C7', borderRadius: '6px' }}>
                                  <div style={{ fontWeight: 600, color: '#D97706' }}>
                                    {currentJob.classification_stats.ai_classified}
                                  </div>
                                  <div style={{ color: '#B45309' }}>AI分類</div>
                                </div>
                              </div>
                              {currentJob.classification_stats.duplicate_keywords > 0 && (
                                <div style={{ marginTop: '8px', fontSize: '11px', color: '#A1A1AA' }}>
                                  ※ CSV内の重複: {currentJob.classification_stats.duplicate_keywords}件
                                  （{currentJob.classification_stats.total_input}件 → {currentJob.classification_stats.unique_keywords}件）
                                </div>
                              )}
                            </div>
                          )}

                          {/* Error Details */}
                          {currentJob.error_details && (
                            <div
                              style={{
                                padding: '12px',
                                background: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                borderRadius: '8px',
                                marginBottom: '16px',
                              }}
                            >
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400E', marginBottom: '8px' }}>
                                処理詳細
                              </div>
                              {currentJob.error_details.duplicateInfo && (
                                <p style={{ fontSize: '11px', color: '#78350F', marginBottom: '4px' }}>
                                  {currentJob.error_details.duplicateInfo}
                                </p>
                              )}
                              {currentJob.error_details.insertErrors && currentJob.error_details.insertErrors.length > 0 && (
                                <div style={{ marginTop: '8px' }}>
                                  <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 500 }}>
                                    挿入エラー:
                                  </div>
                                  {currentJob.error_details.insertErrors.slice(0, 3).map((err, i) => (
                                    <p key={i} style={{ fontSize: '10px', color: '#B91C1C', marginLeft: '8px' }}>
                                      • {err}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {currentJob.error_details.parseErrors && currentJob.error_details.parseErrors.length > 0 && (
                                <div style={{ marginTop: '8px' }}>
                                  <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 500 }}>
                                    パースエラー:
                                  </div>
                                  {currentJob.error_details.parseErrors.slice(0, 3).map((err, i) => (
                                    <p key={i} style={{ fontSize: '10px', color: '#B91C1C', marginLeft: '8px' }}>
                                      • {err}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Error Message */}
                      {currentJob.status === 'failed' && currentJob.error_message && (
                        <div
                          style={{
                            padding: '12px',
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: '8px',
                            marginBottom: '16px',
                          }}
                        >
                          <p style={{ fontSize: '13px', color: '#991B1B' }}>
                            {currentJob.error_message}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {currentJob.status === 'completed' && (
                          <button
                            onClick={() => openPreview(currentJob.id)}
                            style={{
                              flex: 1,
                              padding: '12px',
                              background: '#10B981',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            結果を見る
                          </button>
                        )}
                        {(currentJob.status === 'completed' ||
                          currentJob.status === 'failed' ||
                          currentJob.status === 'cancelled') && (
                          <button
                            onClick={resetWizard}
                            style={{
                              flex: 1,
                              padding: '12px',
                              background: '#7C3AED',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            新しいインポート
                          </button>
                        )}
                        {(currentJob.status === 'failed' || currentJob.status === 'cancelled') && (
                          <button
                            onClick={() => retryJob(currentJob.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '12px 16px',
                              background: '#FFFFFF',
                              color: '#52525B',
                              border: '1px solid #E4E4E7',
                              borderRadius: '6px',
                              fontSize: '14px',
                              cursor: 'pointer',
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                            リトライ
                          </button>
                        )}
                        {(currentJob.status === 'pending' || currentJob.status === 'processing') && (
                          <button
                            onClick={() => cancelJob(currentJob.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '12px 16px',
                              background: '#FFFFFF',
                              color: '#EF4444',
                              border: '1px solid #FECACA',
                              borderRadius: '6px',
                              fontSize: '14px',
                              cursor: 'pointer',
                            }}
                          >
                            <X className="h-4 w-4" />
                            キャンセル
                          </button>
                        )}
                      </div>
                    </div>
                  ) : isSubmitting ? (
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                      <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" style={{ color: '#7C3AED' }} />
                      <p style={{ fontSize: '14px', color: '#52525B' }}>ジョブを開始中...</p>
                    </div>
                  ) : currentJobId ? (
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                      <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" style={{ color: '#7C3AED' }} />
                      <p style={{ fontSize: '14px', color: '#52525B' }}>ジョブ情報を取得中...</p>
                      <p style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '8px' }}>
                        ジョブID: {currentJobId.slice(0, 8)}...
                      </p>
                    </div>
                  ) : (
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                      <AlertCircle className="h-8 w-8 mx-auto mb-3" style={{ color: '#A1A1AA' }} />
                      <p style={{ fontSize: '14px', color: '#52525B' }}>ジョブが選択されていません</p>
                      <button
                        onClick={resetWizard}
                        style={{
                          marginTop: '16px',
                          padding: '10px 16px',
                          background: '#7C3AED',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        新しいインポートを開始
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              {currentStep < 4 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '24px',
                    paddingTop: '16px',
                    borderTop: '1px solid #E4E4E7',
                  }}
                >
                  <button
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      background: '#FFFFFF',
                      color: currentStep === 1 ? '#A1A1AA' : '#52525B',
                      border: '1px solid #E4E4E7',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentStep === 1 ? 0.5 : 1,
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    戻る
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={
                      (currentStep === 1 && !file) ||
                      isValidating ||
                      isSubmitting
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      background: '#7C3AED',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor:
                        (currentStep === 1 && !file) || isValidating || isSubmitting
                          ? 'not-allowed'
                          : 'pointer',
                      opacity:
                        (currentStep === 1 && !file) || isValidating || isSubmitting ? 0.7 : 1,
                    }}
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        検証中...
                      </>
                    ) : isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        開始中...
                      </>
                    ) : currentStep === 3 ? (
                      <>
                        <Play className="h-4 w-4" />
                        インポート開始
                      </>
                    ) : (
                      <>
                        次へ
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Template Download */}
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
              }}
            >
              <p style={{ fontSize: '12px', color: '#52525B', marginBottom: '8px' }}>
                テンプレートをダウンロード
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#52525B',
                    cursor: 'pointer',
                  }}
                >
                  <Download className="h-3 w-3" />
                  ラッコKW用
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#52525B',
                    cursor: 'pointer',
                  }}
                >
                  <Download className="h-3 w-3" />
                  SimilarWeb用
                </button>
              </div>
            </div>
          </div>

          {/* Job List Sidebar */}
          {showJobList && (
            <div
              style={{
                width: '360px',
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                height: 'fit-content',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid #E4E4E7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>
                  ジョブ一覧
                </span>
                <button
                  onClick={fetchJobs}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#52525B',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw className="h-3 w-3" />
                  更新
                </button>
              </div>

              <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                {jobs.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#A1A1AA' }}>
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p style={{ fontSize: '13px' }}>ジョブがありません</p>
                  </div>
                ) : (
                  jobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => {
                        setCurrentJobId(job.id)
                        setCurrentStep(4)
                      }}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #F4F4F5',
                        cursor: 'pointer',
                        background: currentJobId === job.id ? '#F5F3FF' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
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
                            fontSize: '13px',
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
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: '#A1A1AA' }}>
                          {STATUS_LABELS[job.status]}
                          {job.status === 'processing' && job.current_step && (
                            <> - {STEP_LABELS[job.current_step] || job.current_step}</>
                          )}
                        </span>
                        <span style={{ fontSize: '11px', color: '#A1A1AA' }}>
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
                            height: '3px',
                            background: '#E4E4E7',
                            borderRadius: '2px',
                            marginTop: '6px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              background: '#7C3AED',
                              width: `${(job.processed_rows / job.total_rows) * 100}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && currentJob && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowPreview(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '900px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E4E4E7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                  分類結果プレビュー
                </h3>
                <p style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '2px' }}>
                  {currentJob.file_name} - {previewData?.total || 0}件
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#A1A1AA',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #F4F4F5' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['all', 'branded', 'transactional', 'commercial', 'informational', 'unknown'].map((intent) => (
                  <button
                    key={intent}
                    onClick={() => {
                      setPreviewFilter(intent)
                      fetchPreview(currentJob.id, intent)
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: previewFilter === intent ? '#7C3AED' : '#F4F4F5',
                      color: previewFilter === intent ? '#FFFFFF' : '#52525B',
                    }}
                  >
                    {intent === 'all' ? '全て' : INTENT_LABELS[intent as QueryIntent]}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
              {isLoadingPreview ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <Loader2 className="h-8 w-8 mx-auto animate-spin" style={{ color: '#7C3AED' }} />
                  <p style={{ fontSize: '14px', color: '#52525B', marginTop: '8px' }}>読み込み中...</p>
                </div>
              ) : previewData && previewData.items.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#F4F4F5', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#52525B' }}>
                        キーワード
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#52525B', width: '100px' }}>
                        意図分類
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#52525B', width: '200px' }}>
                        分類理由
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#52525B', width: '100px' }}>
                        検索数
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.items.map((item, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid #F4F4F5',
                          background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                        }}
                      >
                        <td style={{ padding: '10px 16px', color: '#18181B' }}>
                          {item.keyword}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: 500,
                              background: item.intent === 'unknown' ? '#F4F4F5' : `${INTENT_COLORS[item.intent as QueryIntent]}20`,
                              color: item.intent === 'unknown' ? '#52525B' : INTENT_COLORS[item.intent as QueryIntent],
                            }}
                          >
                            {INTENT_LABELS[item.intent as QueryIntent] || item.intent}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#71717A', fontSize: '11px' }}>
                          {item.intent_reason}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#52525B' }}>
                          {item.search_volume?.toLocaleString() || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '48px', textAlign: 'center', color: '#A1A1AA' }}>
                  データがありません
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
