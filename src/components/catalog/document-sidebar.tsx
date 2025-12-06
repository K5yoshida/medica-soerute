'use client'

import { useState, useEffect } from 'react'
import { X, FileText, Image, File, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from 'lucide-react'

interface MediaDocument {
  id: string
  title: string
  description: string | null
  file_url: string
  file_type: string
  file_size: number | null
  thumbnail_url: string | null
  display_order: number
  created_at: string
}

interface DocumentSidebarProps {
  isOpen: boolean
  onClose: () => void
  mediaId: string
  mediaName: string
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string) {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-500" />
    case 'image':
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return <Image className="w-5 h-5 text-blue-500" />
    default:
      return <File className="w-5 h-5 text-zinc-500" />
  }
}

export function DocumentSidebar({ isOpen, onClose, mediaId, mediaName }: DocumentSidebarProps) {
  const [documents, setDocuments] = useState<MediaDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (isOpen && mediaId) {
      fetchDocuments()
    }
  }, [isOpen, mediaId])

  const fetchDocuments = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/media/${mediaId}/documents`)
      const data = await res.json()
      if (data.success) {
        setDocuments(data.data.documents || [])
        setSelectedIndex(0)
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedDocument = documents[selectedIndex]

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : documents.length - 1))
  }

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < documents.length - 1 ? prev + 1 : 0))
  }

  // ESCキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
      if (isOpen && documents.length > 1) {
        if (e.key === 'ArrowLeft') handlePrev()
        if (e.key === 'ArrowRight') handleNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, documents.length, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/40 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* サイドバー */}
      <div
        className="fixed top-0 right-0 h-full bg-white z-50 shadow-xl flex flex-col transition-transform"
        style={{ width: '520px' }}
      >
        {/* ヘッダー */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-zinc-200"
          style={{ background: '#FAFAFA' }}
        >
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">媒体資料</h2>
            <p className="text-[12px] text-zinc-500 mt-0.5">{mediaName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-zinc-200 transition"
          >
            <X className="w-5 h-5 text-zinc-600" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span className="ml-2 text-[13px] text-zinc-500">読み込み中...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <FileText className="w-12 h-12 text-zinc-300 mb-4" />
              <p className="text-[14px] text-zinc-600 font-medium mb-2">資料がありません</p>
              <p className="text-[12px] text-zinc-400">
                この媒体にはまだ資料がアップロードされていません。
              </p>
            </div>
          ) : (
            <>
              {/* プレビューエリア */}
              <div className="flex-1 p-4 overflow-auto" style={{ background: '#F4F4F5' }}>
                {selectedDocument && (
                  <div className="h-full flex flex-col">
                    {/* ファイルプレビュー */}
                    <div
                      className="flex-1 bg-white rounded-lg border border-zinc-200 overflow-hidden flex items-center justify-center"
                      style={{ minHeight: '400px' }}
                    >
                      {selectedDocument.file_type === 'pdf' ? (
                        <iframe
                          src={`${selectedDocument.file_url}#toolbar=0`}
                          className="w-full h-full"
                          title={selectedDocument.title}
                        />
                      ) : selectedDocument.file_type === 'image' ||
                        ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(selectedDocument.file_type.toLowerCase()) ? (
                        <img
                          src={selectedDocument.file_url}
                          alt={selectedDocument.title}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="text-center p-8">
                          <File className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                          <p className="text-[13px] text-zinc-500 mb-4">
                            このファイル形式はプレビューできません
                          </p>
                          <a
                            href={selectedDocument.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-[13px] font-medium rounded-md hover:bg-teal-700 transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                            ファイルを開く
                          </a>
                        </div>
                      )}
                    </div>

                    {/* ファイル情報 */}
                    <div className="mt-4 bg-white rounded-lg border border-zinc-200 p-4">
                      <div className="flex items-start gap-3">
                        {getFileIcon(selectedDocument.file_type)}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[14px] font-medium text-zinc-900 truncate">
                            {selectedDocument.title}
                          </h3>
                          {selectedDocument.description && (
                            <p className="text-[12px] text-zinc-500 mt-1 line-clamp-2">
                              {selectedDocument.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[11px] text-zinc-400 uppercase">
                              {selectedDocument.file_type}
                            </span>
                            {selectedDocument.file_size && (
                              <span className="text-[11px] text-zinc-400">
                                {formatFileSize(selectedDocument.file_size)}
                              </span>
                            )}
                          </div>
                        </div>
                        <a
                          href={selectedDocument.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-teal-600 hover:bg-teal-50 rounded-md transition"
                          title="新しいタブで開く"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ナビゲーション（複数資料がある場合） */}
              {documents.length > 1 && (
                <div className="px-4 py-3 border-t border-zinc-200 flex items-center justify-between">
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3 py-1.5 text-[13px] text-zinc-600 hover:bg-zinc-100 rounded-md transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    前へ
                  </button>
                  <div className="flex items-center gap-2">
                    {documents.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedIndex(idx)}
                        className={`w-2 h-2 rounded-full transition ${
                          idx === selectedIndex ? 'bg-teal-600' : 'bg-zinc-300 hover:bg-zinc-400'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 px-3 py-1.5 text-[13px] text-zinc-600 hover:bg-zinc-100 rounded-md transition"
                  >
                    次へ
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* 資料一覧（サムネイル） */}
              {documents.length > 1 && (
                <div className="px-4 py-3 border-t border-zinc-200 overflow-x-auto">
                  <div className="flex gap-2">
                    {documents.map((doc, idx) => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedIndex(idx)}
                        className={`flex-shrink-0 w-20 h-20 rounded-md border-2 overflow-hidden transition ${
                          idx === selectedIndex
                            ? 'border-teal-600'
                            : 'border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        {doc.thumbnail_url ? (
                          <img
                            src={doc.thumbnail_url}
                            alt={doc.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-100 flex items-center justify-center">
                            {getFileIcon(doc.file_type)}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
