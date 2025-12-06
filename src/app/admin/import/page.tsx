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
import { createBrowserClient } from '@supabase/ssr'

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

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Supabase client for realtime
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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

  // Supabase Realtimeで進捗を購読
  useEffect(() => {
    const channel = supabase
      .channel('import_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'import_jobs',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updatedJob = payload.new as ImportJob
            setJobs((prev) => {
              const exists = prev.find((j) => j.id === updatedJob.id)
              if (exists) {
                return prev.map((j) => (j.id === updatedJob.id ? updatedJob : j))
              } else {
                return [updatedJob, ...prev].slice(0, 10)
              }
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

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
        fetchJobs()
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

                      {/* Progress */}
                      {currentJob.status === 'processing' && currentJob.total_rows && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#52525B' }}>進捗</span>
                            <span style={{ fontSize: '12px', color: '#52525B' }}>
                              {currentJob.processed_rows} / {currentJob.total_rows}件
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
                      <div style={{ display: 'flex', gap: '8px' }}>
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
                  ) : null}
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
    </>
  )
}
