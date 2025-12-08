'use client'

import { useCallback, useMemo } from 'react'
import { RotateCcw } from 'lucide-react'

// フィルター値の型定義
export interface KeywordFilters {
  intent: string[]  // A, B, C
  seoDifficultyMin: number | null
  seoDifficultyMax: number | null
  searchVolumeMin: number | null
  searchVolumeMax: number | null
  rankMin: number | null
  rankMax: number | null
  cpcMin: number | null
  cpcMax: number | null
  competitionMin: number | null
  competitionMax: number | null
  estimatedTrafficMin: number | null
  estimatedTrafficMax: number | null
}

// デフォルト値
export const defaultFilters: KeywordFilters = {
  intent: [],
  seoDifficultyMin: null,
  seoDifficultyMax: null,
  searchVolumeMin: null,
  searchVolumeMax: null,
  rankMin: null,
  rankMax: null,
  cpcMin: null,
  cpcMax: null,
  competitionMin: null,
  competitionMax: null,
  estimatedTrafficMin: null,
  estimatedTrafficMax: null,
}

// 検索段階ラベル（4カテゴリ: branded, transactional, informational, b2b）
const INTENT_LABELS: Record<string, { label: string; color: string }> = {
  branded: { label: '指名検索', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  transactional: { label: '応募意図', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  informational: { label: '情報収集', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  b2b: { label: '法人向け', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

interface KeywordFiltersProps {
  filters: KeywordFilters
  onFiltersChange: (filters: KeywordFilters) => void
  showIntentFilter?: boolean
  compact?: boolean
}

export function KeywordFiltersBar({
  filters,
  onFiltersChange,
  showIntentFilter = true,
  compact = false,
}: KeywordFiltersProps) {
  const handleIntentToggle = useCallback(
    (intent: string) => {
      const newIntent = filters.intent.includes(intent)
        ? filters.intent.filter((i) => i !== intent)
        : [...filters.intent, intent]
      onFiltersChange({ ...filters, intent: newIntent })
    },
    [filters, onFiltersChange]
  )

  const handleReset = useCallback(() => {
    onFiltersChange(defaultFilters)
  }, [onFiltersChange])

  const hasActiveFilters = useMemo(() => {
    return filters.intent.length > 0
  }, [filters])

  return (
    <div className={`flex items-center gap-2 flex-wrap ${compact ? '' : 'py-2'}`}>
      {/* 検索段階フィルター */}
      {showIntentFilter && (
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-zinc-400 mr-1">段階:</span>
          {Object.entries(INTENT_LABELS).map(([key, { label, color }]) => (
            <button
              key={key}
              onClick={() => handleIntentToggle(key)}
              className={`px-2 py-1 text-[11px] font-medium rounded border transition ${
                filters.intent.includes(key)
                  ? color
                  : 'bg-white border-zinc-200 text-zinc-400 hover:bg-zinc-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* リセットボタン */}
      {hasActiveFilters && (
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-700 transition"
        >
          <RotateCcw className="w-3 h-3" />
          リセット
        </button>
      )}
    </div>
  )
}

// フィルターをAPI用クエリパラメータに変換
export function filtersToQueryParams(filters: KeywordFilters): Record<string, string> {
  const params: Record<string, string> = {}

  if (filters.intent.length > 0) {
    params.intent = filters.intent.join(',')
  }
  if (filters.seoDifficultyMin !== null) {
    params.seo_difficulty_min = String(filters.seoDifficultyMin)
  }
  if (filters.seoDifficultyMax !== null) {
    params.seo_difficulty_max = String(filters.seoDifficultyMax)
  }
  if (filters.searchVolumeMin !== null) {
    params.search_volume_min = String(filters.searchVolumeMin)
  }
  if (filters.searchVolumeMax !== null) {
    params.search_volume_max = String(filters.searchVolumeMax)
  }
  if (filters.rankMin !== null) {
    params.rank_min = String(filters.rankMin)
  }
  if (filters.rankMax !== null) {
    params.rank_max = String(filters.rankMax)
  }
  if (filters.cpcMin !== null) {
    params.cpc_min = String(filters.cpcMin)
  }
  if (filters.cpcMax !== null) {
    params.cpc_max = String(filters.cpcMax)
  }
  if (filters.competitionMin !== null) {
    params.competition_min = String(filters.competitionMin)
  }
  if (filters.competitionMax !== null) {
    params.competition_max = String(filters.competitionMax)
  }
  if (filters.estimatedTrafficMin !== null) {
    params.estimated_traffic_min = String(filters.estimatedTrafficMin)
  }
  if (filters.estimatedTrafficMax !== null) {
    params.estimated_traffic_max = String(filters.estimatedTrafficMax)
  }

  return params
}
