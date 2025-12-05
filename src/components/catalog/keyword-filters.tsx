'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChevronDown, X, RotateCcw } from 'lucide-react'

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

// 応募意図ラベル
const INTENT_LABELS: Record<string, { label: string; color: string }> = {
  A: { label: '応募直前', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  B: { label: '比較検討', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  C: { label: '情報収集', color: 'bg-sky-100 text-sky-700 border-sky-200' },
}

// プリセット範囲オプション
const SEO_DIFFICULTY_PRESETS = [
  { label: '簡単 (0-30)', min: 0, max: 30 },
  { label: '普通 (31-60)', min: 31, max: 60 },
  { label: '難しい (61-100)', min: 61, max: 100 },
]

const SEARCH_VOLUME_PRESETS = [
  { label: '少 (~1,000)', min: null, max: 1000 },
  { label: '中 (1,001~10,000)', min: 1001, max: 10000 },
  { label: '多 (10,001~)', min: 10001, max: null },
]

const RANK_PRESETS = [
  { label: 'Top 3', min: 1, max: 3 },
  { label: 'Top 10', min: 1, max: 10 },
  { label: 'Top 20', min: 1, max: 20 },
  { label: 'Top 50', min: 1, max: 50 },
]

const COMPETITION_PRESETS = [
  { label: '低 (0-30)', min: 0, max: 30 },
  { label: '中 (31-70)', min: 31, max: 70 },
  { label: '高 (71-100)', min: 71, max: 100 },
]

interface RangeFilterDropdownProps {
  label: string
  minValue: number | null
  maxValue: number | null
  onMinChange: (val: number | null) => void
  onMaxChange: (val: number | null) => void
  presets: Array<{ label: string; min: number | null; max: number | null }>
  unit?: string
  step?: number
}

function RangeFilterDropdown({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  presets,
  unit = '',
  step = 1,
}: RangeFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const hasValue = minValue !== null || maxValue !== null

  const displayValue = useMemo(() => {
    if (minValue !== null && maxValue !== null) {
      return `${minValue.toLocaleString()}${unit} ~ ${maxValue.toLocaleString()}${unit}`
    }
    if (minValue !== null) {
      return `${minValue.toLocaleString()}${unit}以上`
    }
    if (maxValue !== null) {
      return `${maxValue.toLocaleString()}${unit}以下`
    }
    return label
  }, [minValue, maxValue, label, unit])

  const handlePresetClick = (preset: { min: number | null; max: number | null }) => {
    onMinChange(preset.min)
    onMaxChange(preset.max)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMinChange(null)
    onMaxChange(null)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-md border transition ${
          hasValue
            ? 'bg-teal-50 border-teal-300 text-teal-700'
            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
        }`}
      >
        <span className="max-w-[140px] truncate">{displayValue}</span>
        {hasValue ? (
          <X className="w-3 h-3 flex-shrink-0" onClick={handleClear} />
        ) : (
          <ChevronDown className="w-3 h-3 flex-shrink-0" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 p-3">
            {/* プリセット */}
            <div className="mb-3">
              <div className="text-[11px] text-zinc-400 mb-1.5">プリセット</div>
              <div className="flex flex-wrap gap-1">
                {presets.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handlePresetClick(preset)}
                    className={`px-2 py-1 text-[11px] rounded border transition ${
                      minValue === preset.min && maxValue === preset.max
                        ? 'bg-teal-100 border-teal-300 text-teal-700'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* カスタム範囲 */}
            <div className="border-t border-zinc-100 pt-3">
              <div className="text-[11px] text-zinc-400 mb-1.5">カスタム範囲</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="最小"
                  value={minValue ?? ''}
                  onChange={(e) => onMinChange(e.target.value ? Number(e.target.value) : null)}
                  step={step}
                  className="flex-1 px-2 py-1.5 border border-zinc-200 rounded text-[12px] outline-none focus:border-teal-500"
                />
                <span className="text-zinc-400 text-[12px]">~</span>
                <input
                  type="number"
                  placeholder="最大"
                  value={maxValue ?? ''}
                  onChange={(e) => onMaxChange(e.target.value ? Number(e.target.value) : null)}
                  step={step}
                  className="flex-1 px-2 py-1.5 border border-zinc-200 rounded text-[12px] outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* 適用ボタン */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full mt-3 py-1.5 bg-teal-600 text-white text-[12px] rounded hover:bg-teal-700 transition"
            >
              適用
            </button>
          </div>
        </>
      )}
    </div>
  )
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
    return (
      filters.intent.length > 0 ||
      filters.seoDifficultyMin !== null ||
      filters.seoDifficultyMax !== null ||
      filters.searchVolumeMin !== null ||
      filters.searchVolumeMax !== null ||
      filters.rankMin !== null ||
      filters.rankMax !== null ||
      filters.cpcMin !== null ||
      filters.cpcMax !== null ||
      filters.competitionMin !== null ||
      filters.competitionMax !== null ||
      filters.estimatedTrafficMin !== null ||
      filters.estimatedTrafficMax !== null
    )
  }, [filters])

  return (
    <div className={`flex items-center gap-2 flex-wrap ${compact ? '' : 'py-2'}`}>
      {/* 応募意図フィルター */}
      {showIntentFilter && (
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-zinc-400 mr-1">応募意図:</span>
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

      {/* 区切り */}
      {showIntentFilter && <div className="w-px h-5 bg-zinc-200" />}

      {/* SEO難易度 */}
      <RangeFilterDropdown
        label="SEO難易度"
        minValue={filters.seoDifficultyMin}
        maxValue={filters.seoDifficultyMax}
        onMinChange={(val) => onFiltersChange({ ...filters, seoDifficultyMin: val })}
        onMaxChange={(val) => onFiltersChange({ ...filters, seoDifficultyMax: val })}
        presets={SEO_DIFFICULTY_PRESETS}
      />

      {/* 月間検索数 */}
      <RangeFilterDropdown
        label="月間検索数"
        minValue={filters.searchVolumeMin}
        maxValue={filters.searchVolumeMax}
        onMinChange={(val) => onFiltersChange({ ...filters, searchVolumeMin: val })}
        onMaxChange={(val) => onFiltersChange({ ...filters, searchVolumeMax: val })}
        presets={SEARCH_VOLUME_PRESETS}
        step={100}
      />

      {/* 検索順位 */}
      <RangeFilterDropdown
        label="検索順位"
        minValue={filters.rankMin}
        maxValue={filters.rankMax}
        onMinChange={(val) => onFiltersChange({ ...filters, rankMin: val })}
        onMaxChange={(val) => onFiltersChange({ ...filters, rankMax: val })}
        presets={RANK_PRESETS}
        unit="位"
      />

      {/* 競合性 */}
      <RangeFilterDropdown
        label="競合性"
        minValue={filters.competitionMin}
        maxValue={filters.competitionMax}
        onMinChange={(val) => onFiltersChange({ ...filters, competitionMin: val })}
        onMaxChange={(val) => onFiltersChange({ ...filters, competitionMax: val })}
        presets={COMPETITION_PRESETS}
      />

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
