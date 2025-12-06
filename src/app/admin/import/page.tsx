'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  Clock,
} from 'lucide-react'

/**
 * SC-903: CSVインポート画面
 *
 * 機能:
 * - ラッコキーワード、SimilarWebのCSVインポート
 * - 意図分類の自動付与
 * - インポート履歴表示
 * - エラーハンドリング
 */

type ImportType = 'rakko_keywords' | 'similarweb'
type ImportStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

interface ImportHistory {
  id: string
  type: ImportType
  fileName: string
  totalRows: number
  successCount: number
  errorCount: number
  status: 'completed' | 'failed'
  createdAt: string
}

interface MediaOption {
  id: string
  name: string
}

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>('rakko_keywords')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ success: number; error: number; errors?: string[] } | null>(null)
  const [mediaList, setMediaList] = useState<MediaOption[]>([])
  const [selectedMediaId, setSelectedMediaId] = useState<string>('')
  const [history, setHistory] = useState<ImportHistory[]>([])

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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setStatus('idle')
      setResult(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile)
      setStatus('idle')
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setStatus('uploading')
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', importType)
      if (selectedMediaId) {
        formData.append('media_id', selectedMediaId)
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const res = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)
      setStatus('processing')

      const data = await res.json()

      if (data.success) {
        setStatus('success')
        setResult({
          success: data.data.successCount,
          error: data.data.errorCount,
          errors: data.data.errors,
        })
        // Add to history
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            type: importType,
            fileName: file.name,
            totalRows: data.data.successCount + data.data.errorCount,
            successCount: data.data.successCount,
            errorCount: data.data.errorCount,
            status: 'completed',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ])
      } else {
        setStatus('error')
        setResult({
          success: 0,
          error: 1,
          errors: [data.error?.message || 'インポートに失敗しました'],
        })
      }
    } catch {
      setStatus('error')
      setResult({
        success: 0,
        error: 1,
        errors: ['通信エラーが発生しました'],
      })
    }
  }

  const resetForm = () => {
    setFile(null)
    setStatus('idle')
    setProgress(0)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
          キーワードデータや流入経路データをインポート
        </p>
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Import Form */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E4E4E7',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                新規インポート
              </span>
            </div>

            <div style={{ padding: '20px' }}>
              {/* Import Type Selection */}
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
                      padding: '12px',
                      border: `1px solid ${importType === 'rakko_keywords' ? '#7C3AED' : '#E4E4E7'}`,
                      borderRadius: '8px',
                      background: importType === 'rakko_keywords' ? 'rgba(124,58,237,0.05)' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: importType === 'rakko_keywords' ? '#7C3AED' : '#18181B',
                      }}
                    >
                      ラッコキーワード
                    </div>
                    <div style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '2px' }}>
                      キーワード・検索順位データ
                    </div>
                  </button>
                  <button
                    onClick={() => setImportType('similarweb')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: `1px solid ${importType === 'similarweb' ? '#7C3AED' : '#E4E4E7'}`,
                      borderRadius: '8px',
                      background: importType === 'similarweb' ? 'rgba(124,58,237,0.05)' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: importType === 'similarweb' ? '#7C3AED' : '#18181B',
                      }}
                    >
                      SimilarWeb
                    </div>
                    <div style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '2px' }}>
                      流入経路・トラフィックデータ
                    </div>
                  </button>
                </div>
              </div>

              {/* Media Selection (for rakko_keywords) */}
              {importType === 'rakko_keywords' && (
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
                    対象媒体（任意）
                  </label>
                  <select
                    value={selectedMediaId}
                    onChange={(e) => setSelectedMediaId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E4E4E7',
                      borderRadius: '6px',
                      fontSize: '13px',
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
                  <p style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '4px' }}>
                    媒体を選択すると、キーワードと媒体の紐付けデータも保存されます
                  </p>
                </div>
              )}

              {/* File Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #E4E4E7',
                  borderRadius: '8px',
                  padding: '32px',
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
                    <FileText className="h-10 w-10 mx-auto mb-3" style={{ color: '#7C3AED' }} />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#18181B' }}>{file.name}</p>
                    <p style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '4px' }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto mb-3" style={{ color: '#A1A1AA' }} />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#18181B' }}>
                      ファイルをドロップまたはクリックして選択
                    </p>
                    <p style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '4px' }}>
                      CSV形式のみ対応
                    </p>
                  </>
                )}
              </div>

              {/* Progress / Result */}
              {status !== 'idle' && (
                <div style={{ marginTop: '20px' }}>
                  {(status === 'uploading' || status === 'processing') && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#7C3AED' }} />
                        <span style={{ fontSize: '13px', color: '#52525B' }}>
                          {status === 'uploading' ? 'アップロード中...' : '処理中...'}
                        </span>
                      </div>
                      <div
                        style={{
                          height: '4px',
                          background: '#E4E4E7',
                          borderRadius: '2px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            background: '#7C3AED',
                            width: `${progress}%`,
                            transition: 'width 0.2s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {status === 'success' && result && (
                    <div
                      style={{
                        padding: '16px',
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <CheckCircle2 className="h-5 w-5" style={{ color: '#22C55E' }} />
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#166534' }}>
                          インポート完了
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#166534' }}>
                        {result.success}件のデータをインポートしました
                        {result.error > 0 && ` （${result.error}件のエラー）`}
                      </p>
                    </div>
                  )}

                  {status === 'error' && result && (
                    <div
                      style={{
                        padding: '16px',
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <XCircle className="h-5 w-5" style={{ color: '#EF4444' }} />
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#991B1B' }}>
                          インポートエラー
                        </span>
                      </div>
                      {result.errors?.map((error, i) => (
                        <p key={i} style={{ fontSize: '13px', color: '#991B1B' }}>
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                {status === 'success' || status === 'error' ? (
                  <button
                    onClick={resetForm}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#7C3AED',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    新しいインポート
                  </button>
                ) : (
                  <button
                    onClick={handleImport}
                    disabled={!file || status === 'uploading' || status === 'processing'}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      background: '#7C3AED',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: !file || status !== 'idle' ? 'not-allowed' : 'pointer',
                      opacity: !file || status !== 'idle' ? 0.7 : 1,
                    }}
                  >
                    {(status === 'uploading' || status === 'processing') && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    インポート開始
                  </button>
                )}
              </div>

              {/* Template Download */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E4E4E7' }}>
                <p style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '8px' }}>
                  テンプレートをダウンロード
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
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
                      padding: '6px 12px',
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
          </div>

          {/* Import History */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E4E4E7',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                インポート履歴
              </span>
            </div>

            <div style={{ padding: '8px' }}>
              {history.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#A1A1AA' }}>
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p style={{ fontSize: '13px' }}>履歴がありません</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderBottom: '1px solid #F4F4F5',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: item.status === 'completed' ? '#D1FAE5' : '#FEE2E2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4" style={{ color: '#10B981' }} />
                      ) : (
                        <XCircle className="h-4 w-4" style={{ color: '#EF4444' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>
                        {item.fileName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#F4F4F5',
                            color: '#52525B',
                          }}
                        >
                          {item.type === 'rakko_keywords' ? 'ラッコKW' : 'SimilarWeb'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#A1A1AA' }}>
                          {item.successCount}件成功
                          {item.errorCount > 0 && ` / ${item.errorCount}件エラー`}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#A1A1AA' }}>
                      {new Date(item.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Format Guide */}
        <div
          style={{
            marginTop: '24px',
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E4E4E7',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle className="h-4 w-4" style={{ color: '#F59E0B' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
              CSVフォーマット仕様
            </span>
          </div>

          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#18181B', marginBottom: '8px' }}>
                ラッコキーワード形式
              </h4>
              <div
                style={{
                  padding: '12px',
                  background: '#F4F4F5',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#52525B',
                  overflowX: 'auto',
                }}
              >
                keyword,search_volume,cpc,competition,seo_difficulty,search_rank,estimated_traffic,url
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#18181B', marginBottom: '8px' }}>
                SimilarWeb形式
              </h4>
              <div
                style={{
                  padding: '12px',
                  background: '#F4F4F5',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#52525B',
                  overflowX: 'auto',
                }}
              >
                domain,period,monthly_visits,search_pct,direct_pct,referral_pct,social_pct,display_pct,email_pct
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
