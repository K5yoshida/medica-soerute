'use client'

import { useState, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'

interface MediaSearchProps {
  onSearch: (keywords: string) => void
  isLoading?: boolean
}

export function MediaSearch({ onSearch, isLoading = false }: MediaSearchProps) {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (inputValue.trim()) {
        onSearch(inputValue.trim())
      }
    },
    [inputValue, onSearch]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && inputValue.trim()) {
        onSearch(inputValue.trim())
      }
    },
    [inputValue, onSearch]
  )

  return (
    <div
      className="bg-gradient-to-br from-teal-50 to-white border border-teal-100 rounded-xl"
      style={{ padding: '28px 32px' }}
    >
      <h2
        className="font-semibold text-zinc-900 mb-2"
        style={{ fontSize: '16px' }}
      >
        あなたの採用条件に強い媒体を探す
      </h2>
      <p
        className="text-zinc-500 mb-5"
        style={{ fontSize: '13px' }}
      >
        どんな人材を採用したいですか？
      </p>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              style={{ width: '18px', height: '18px' }}
            />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例: 営業 正社員 / エンジニア 東京 / 未経験 アルバイト"
              disabled={isLoading}
              className="w-full bg-white border border-zinc-200 rounded-lg outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50"
              style={{
                padding: '14px 16px 14px 48px',
                fontSize: '14px',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="flex items-center gap-2 bg-teal-600 text-white font-medium rounded-lg transition hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              padding: '14px 24px',
              fontSize: '14px',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                検索中...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                媒体を探す
              </>
            )}
          </button>
        </div>
      </form>

      <p
        className="text-zinc-400 mt-3"
        style={{ fontSize: '12px' }}
      >
        スペース区切りでAND検索（部分一致）。最大5キーワードまで。
      </p>
    </div>
  )
}
