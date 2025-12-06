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
  Eye,
  BarChart3,
} from 'lucide-react'

/**
 * SC-903: CSVインポート画面
 *
 * 機能:
 * - ラッコキーワード、SimilarWebのCSVインポート
 * - CSVプレビュー表示
 * - 意図分類の内訳表示
 * - インポート履歴表示
 * - エラーハンドリング
 */

type ImportType = 'rakko_keywords' | 'similarweb'
type ImportStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error'
type QueryIntent = 'branded' | 'transactional' | 'commercial' | 'informational' | 'unknown'

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

interface PreviewRow {
  keyword: string
  searchVolume: number | null
  intent: QueryIntent
  intentReason: string
}

interface IntentSummary {
  branded: number
  transactional: number
  commercial: number
  informational: number
  unknown: number
}

// 意図分類ロジック（クライアント側プレビュー用）
const KNOWN_MEDIA_NAMES = [
  'ジョブメドレー', 'jobmedley', 'job-medley', 'マイナビ', 'リクナビ',
  'indeed', 'インディード', 'エン転職', 'doda', 'ナース人材バンク',
]

const JOB_KEYWORDS = [
  '看護師', 'ナース', '介護', 'ヘルパー', '介護福祉士', 'ケアマネ',
  '薬剤師', '保育士', '歯科衛生士', '歯科助手', '理学療法士', '作業療法士',
  '医療事務', '管理栄養士', '放射線技師', '介護士',
]

const CONDITION_KEYWORDS = [
  '年収', '給料', '給与', '月給', '時給', '賞与',
  '年間休日', '休日', '残業', '夜勤',
]

function classifyIntent(keyword: string): { intent: QueryIntent; reason: string } {
  const k = keyword.toLowerCase().trim()
  if (!k) return { intent: 'unknown', reason: '空のキーワード' }

  for (const mediaName of KNOWN_MEDIA_NAMES) {
    if (k.includes(mediaName.toLowerCase())) {
      return { intent: 'branded', reason: `媒体名を含む` }
    }
  }

  if (/求人|転職|募集|採用|応募|中途/.test(k)) {
    return { intent: 'transactional', reason: '求人・転職系' }
  }

  if (/とは$|とは\s|書き方|意味|方法|やり方|平均|相場|違いは/.test(k)) {
    return { intent: 'informational', reason: '解説・ハウツー系' }
  }

  if (/\d+日|\d+万|\d+円/.test(k)) {
    return { intent: 'commercial', reason: '具体数値条件' }
  }

  if (/比較|ランキング|おすすめ|オススメ|人気|評判|口コミ|vs/.test(k)) {
    return { intent: 'commercial', reason: '比較・評価系' }
  }

  const hasJob = JOB_KEYWORDS.some(job => k.includes(job.toLowerCase()))
  const hasCondition = CONDITION_KEYWORDS.some(cond => k.includes(cond.toLowerCase()))

  if (hasJob && hasCondition) {
    return { intent: 'commercial', reason: '職種×条件' }
  }
  if (hasCondition && !hasJob) {
    return { intent: 'informational', reason: '条件キーワード' }
  }

  return { intent: 'unknown', reason: '判定不能' }
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

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>('rakko_keywords')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ success: number; error: number; errors?: string[] } | null>(null)
  const [mediaList, setMediaList] = useState<MediaOption[]>([])
  const [selectedMediaId, setSelectedMediaId] = useState<string>('')
  const [history, setHistory] = useState<ImportHistory[]>([])

  // プレビュー関連
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [intentSummary, setIntentSummary] = useState<IntentSummary | null>(null)
  const [totalRows, setTotalRows] = useState(0)
  const [isParsingPreview, setIsParsingPreview] = useState(false)

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

  // CSVパース関数
  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"' && !inQuotes) {
        inQuotes = true
      } else if (char === '"' && inQuotes) {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  // ファイルからプレビューを生成
  const generatePreview = useCallback(async (selectedFile: File) => {
    setIsParsingPreview(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const bytes = new Uint8Array(buffer)

      let content: string
      if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        const decoder = new TextDecoder('utf-16le')
        content = decoder.decode(buffer)
      } else if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        const decoder = new TextDecoder('utf-8')
        content = decoder.decode(buffer)
      } else {
        content = await selectedFile.text()
      }

      content = content.replace(/^\uFEFF/, '')

      const lines = content.split('\n').filter((line) => line.trim())
      if (lines.length < 2) {
        setPreviewRows([])
        setIntentSummary(null)
        setTotalRows(0)
        return
      }

      const delimiter = lines[0].includes('\t') ? '\t' : ','
      const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase())

      // カラムマッピング
      const columnMap: Record<string, string> = {
        キーワード: 'keyword',
        月間検索数: 'search_volume',
        keyword: 'keyword',
        search_volume: 'search_volume',
      }

      const keywordIndex = headers.findIndex((h) => columnMap[h] === 'keyword')
      const searchVolumeIndex = headers.findIndex((h) => columnMap[h] === 'search_volume')

      if (keywordIndex === -1) {
        setPreviewRows([])
        setIntentSummary(null)
        setTotalRows(0)
        return
      }

      // 全行をパースして意図分類
      const allRows: PreviewRow[] = []
      const summary: IntentSummary = {
        branded: 0,
        transactional: 0,
        commercial: 0,
        informational: 0,
        unknown: 0,
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = parseCSVLine(line, delimiter)
        const keyword = values[keywordIndex]?.replace(/^["']|["']$/g, '').trim()
        if (!keyword) continue

        const { intent, reason } = classifyIntent(keyword)
        const searchVolume = searchVolumeIndex !== -1
          ? parseInt(values[searchVolumeIndex]?.replace(/[^0-9.-]/g, '') || '0', 10) || null
          : null

        allRows.push({ keyword, searchVolume, intent, intentReason: reason })
        summary[intent]++
      }

      setPreviewRows(allRows.slice(0, 20)) // 先頭20件をプレビュー
      setIntentSummary(summary)
      setTotalRows(allRows.length)
    } catch (err) {
      console.error('Preview generation error:', err)
      setPreviewRows([])
      setIntentSummary(null)
      setTotalRows(0)
    } finally {
      setIsParsingPreview(false)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setStatus('idle')
      setResult(null)
      generatePreview(selectedFile)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setStatus('idle')
      setResult(null)
      generatePreview(droppedFile)
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

      // プログレス更新
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
    setPreviewRows([])
    setIntentSummary(null)
    setTotalRows(0)
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
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
          {/* Left: Import Form */}
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
                      ラッコKW
                    </div>
                    <div style={{ fontSize: '10px', color: '#A1A1AA', marginTop: '2px' }}>
                      キーワード・順位
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
                    <div style={{ fontSize: '10px', color: '#A1A1AA', marginTop: '2px' }}>
                      トラフィック
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
                  padding: '24px',
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
                    <FileText className="h-8 w-8 mx-auto mb-2" style={{ color: '#7C3AED' }} />
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>{file.name}</p>
                    <p style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '2px' }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: '#A1A1AA' }} />
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>
                      ファイルをドロップまたはクリック
                    </p>
                    <p style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '2px' }}>
                      CSV形式のみ対応
                    </p>
                  </>
                )}
              </div>

              {/* Progress / Result */}
              {status !== 'idle' && (
                <div style={{ marginTop: '16px' }}>
                  {(status === 'uploading' || status === 'processing') && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#7C3AED' }} />
                        <span style={{ fontSize: '12px', color: '#52525B' }}>
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
                        padding: '12px',
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 className="h-4 w-4" style={{ color: '#22C55E' }} />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#166534' }}>
                          {result.success}件成功 {result.error > 0 && `/ ${result.error}件エラー`}
                        </span>
                      </div>
                    </div>
                  )}

                  {status === 'error' && result && (
                    <div
                      style={{
                        padding: '12px',
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <XCircle className="h-4 w-4" style={{ color: '#EF4444' }} />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#991B1B' }}>
                          エラー
                        </span>
                      </div>
                      {result.errors?.slice(0, 3).map((error, i) => (
                        <p key={i} style={{ fontSize: '11px', color: '#991B1B', marginTop: '4px' }}>
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ marginTop: '16px' }}>
                {status === 'success' || status === 'error' ? (
                  <button
                    onClick={resetForm}
                    style={{
                      width: '100%',
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
                      width: '100%',
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
                <p style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '8px' }}>
                  テンプレートをダウンロード
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      background: '#FFFFFF',
                      border: '1px solid #E4E4E7',
                      borderRadius: '4px',
                      fontSize: '11px',
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
                      padding: '6px 10px',
                      background: '#FFFFFF',
                      border: '1px solid #E4E4E7',
                      borderRadius: '4px',
                      fontSize: '11px',
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

          {/* Right: Preview & Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Intent Summary */}
            {intentSummary && (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #E4E4E7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <BarChart3 className="h-4 w-4" style={{ color: '#7C3AED' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                    意図分類サマリ
                  </span>
                  <span style={{ fontSize: '12px', color: '#A1A1AA', marginLeft: 'auto' }}>
                    全{totalRows}件
                  </span>
                </div>

                <div style={{ padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {(Object.keys(intentSummary) as QueryIntent[]).map((intent) => (
                    <div
                      key={intent}
                      style={{
                        flex: '1 1 120px',
                        padding: '12px',
                        background: '#FAFAFA',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${INTENT_COLORS[intent]}`,
                      }}
                    >
                      <div style={{ fontSize: '20px', fontWeight: 600, color: '#18181B' }}>
                        {intentSummary[intent]}
                      </div>
                      <div style={{ fontSize: '11px', color: '#52525B', marginTop: '2px' }}>
                        {INTENT_LABELS[intent]}
                      </div>
                      <div style={{ fontSize: '10px', color: '#A1A1AA' }}>
                        {totalRows > 0 ? ((intentSummary[intent] / totalRows) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CSV Preview */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                flex: 1,
                minHeight: '300px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #E4E4E7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Eye className="h-4 w-4" style={{ color: '#7C3AED' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                  プレビュー
                </span>
                {previewRows.length > 0 && (
                  <span style={{ fontSize: '12px', color: '#A1A1AA', marginLeft: 'auto' }}>
                    先頭20件を表示
                  </span>
                )}
              </div>

              <div style={{ flex: 1, overflow: 'auto' }}>
                {isParsingPreview ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#A1A1AA' }}>
                    <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                    <p style={{ fontSize: '13px' }}>解析中...</p>
                  </div>
                ) : previewRows.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#A1A1AA' }}>
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p style={{ fontSize: '13px' }}>ファイルを選択するとプレビューを表示</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#F4F4F5' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: '#52525B' }}>
                          キーワード
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: '#52525B', width: '80px' }}>
                          検索数
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: '#52525B', width: '100px' }}>
                          意図分類
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: '#52525B', width: '100px' }}>
                          理由
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
                          <td style={{ padding: '8px 12px', color: '#18181B' }}>
                            {row.keyword}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#52525B' }}>
                            {row.searchVolume?.toLocaleString() ?? '-'}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 500,
                                background: `${INTENT_COLORS[row.intent]}15`,
                                color: INTENT_COLORS[row.intent],
                              }}
                            >
                              {INTENT_LABELS[row.intent]}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', color: '#A1A1AA', fontSize: '11px' }}>
                            {row.intentReason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Import History (Compact) */}
            {history.length > 0 && (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #E4E4E7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Clock className="h-4 w-4" style={{ color: '#A1A1AA' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                    直近のインポート
                  </span>
                </div>

                <div style={{ padding: '8px' }}>
                  {history.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 12px',
                        borderBottom: '1px solid #F4F4F5',
                      }}
                    >
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4" style={{ color: '#10B981' }} />
                      ) : (
                        <XCircle className="h-4 w-4" style={{ color: '#EF4444' }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: '#18181B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.fileName}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#A1A1AA' }}>
                        {item.successCount}件
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              padding: '12px 16px',
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

          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#18181B', marginBottom: '8px' }}>
                ラッコキーワード形式
              </h4>
              <div
                style={{
                  padding: '10px',
                  background: '#F4F4F5',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  color: '#52525B',
                  overflowX: 'auto',
                }}
              >
                keyword,search_volume,cpc,competition,seo_difficulty,search_rank,estimated_traffic,url
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#18181B', marginBottom: '8px' }}>
                SimilarWeb形式
              </h4>
              <div
                style={{
                  padding: '10px',
                  background: '#F4F4F5',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '10px',
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
