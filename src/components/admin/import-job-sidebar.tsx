'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RefreshCw,
  X,
} from 'lucide-react'

/**
 * インポートジョブ一覧サイドバー
 *
 * 使用場所:
 * - /admin/import (CSVインポート画面)
 * - /admin/media (媒体マスター管理画面)
 */

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

interface ImportJobSidebarProps {
  isOpen: boolean
  onClose: () => void
  onJobSelect: (jobId: string) => void
  selectedJobId?: string | null
}

export function ImportJobSidebar({
  isOpen,
  onClose,
  onJobSelect,
  selectedJobId,
}: ImportJobSidebarProps) {
  const [jobs, setJobs] = useState<ImportJob[]>([])

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

  // 初回取得
  useEffect(() => {
    if (isOpen) {
      fetchJobs()
    }
  }, [isOpen, fetchJobs])

  // ポーリングで進捗を更新
  useEffect(() => {
    if (!isOpen) return

    const hasProcessingJob = jobs.some((j) => j.status === 'processing' || j.status === 'pending')
    const interval = hasProcessingJob ? 2000 : 5000

    const pollingInterval = setInterval(fetchJobs, interval)

    return () => {
      clearInterval(pollingInterval)
    }
  }, [fetchJobs, isOpen, jobs])

  // 処理中ジョブ数（バッジ表示用）- 将来のバッジ機能で使用予定
  const _processingCount = jobs.filter((j) => j.status === 'processing').length

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
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
              onClick={onClose}
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
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => onJobSelect(job.id)}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #F4F4F5',
                  cursor: 'pointer',
                  background: selectedJobId === job.id ? '#F5F3FF' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
                onMouseOver={(e) => {
                  if (selectedJobId !== job.id) {
                    e.currentTarget.style.background = '#FAFAFA'
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedJobId !== job.id) {
                    e.currentTarget.style.background = 'transparent'
                  }
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
  )
}

/**
 * ジョブ一覧サイドバーのトリガーボタン用hook
 * 処理中ジョブ数を取得してバッジ表示に使用
 */
export function useImportJobCount() {
  const [processingCount, setProcessingCount] = useState(0)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/import/jobs?limit=10')
      const data = await res.json()
      if (data.success && data.data) {
        const count = data.data.jobs.filter(
          (j: ImportJob) => j.status === 'processing'
        ).length
        setProcessingCount(count)
      }
    } catch {
      // エラー時は何もしない
    }
  }, [])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 5000)
    return () => clearInterval(interval)
  }, [fetchCount])

  return processingCount
}
