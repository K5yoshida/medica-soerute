'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface RangePreset {
  label: string
  min: number | null
  max: number | null
}

interface FilterDropdownProps {
  label: string
  value: { min: number | null; max: number | null }
  onChange: (value: { min: number | null; max: number | null }) => void
  presets: RangePreset[]
  allowDecimal?: boolean
}

export function FilterDropdown({
  label,
  value,
  onChange,
  presets,
  allowDecimal = false,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customMin, setCustomMin] = useState<string>('')
  const [customMax, setCustomMax] = useState<string>('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 外側クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 値の表示テキストを生成
  const getDisplayText = () => {
    if (value.min === null && value.max === null) return '指定なし'
    if (value.min !== null && value.max !== null) {
      if (value.min === value.max) return `${value.min}`
      return `${value.min}-${value.max}`
    }
    if (value.min !== null) return `${value.min}+`
    if (value.max !== null) return `~${value.max}`
    return '指定なし'
  }

  const handlePresetClick = (preset: RangePreset) => {
    onChange({ min: preset.min, max: preset.max })
    setIsOpen(false)
  }

  const handleCustomApply = () => {
    const min = customMin === '' ? null : (allowDecimal ? parseFloat(customMin) : parseInt(customMin, 10))
    const max = customMax === '' ? null : (allowDecimal ? parseFloat(customMax) : parseInt(customMax, 10))
    onChange({ min, max })
    setIsOpen(false)
  }

  const isActive = value.min !== null || value.max !== null

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex flex-col items-start px-4 py-2.5 rounded-md border transition min-w-[130px] ${
          isActive
            ? 'border-teal-500 bg-teal-50'
            : 'border-zinc-200 bg-white hover:border-zinc-300'
        }`}
      >
        <span className={`text-[13px] font-medium ${isActive ? 'text-teal-700' : 'text-zinc-700'}`}>
          {label}
        </span>
        <div className="flex items-center gap-1 w-full">
          <span className={`text-[11px] px-1.5 py-0.5 rounded ${
            isActive ? 'bg-teal-100 text-teal-700' : 'bg-zinc-100 text-zinc-500'
          }`}>
            {getDisplayText()}
          </span>
          <ChevronDown className={`w-3 h-3 ml-auto ${isActive ? 'text-teal-600' : 'text-zinc-400'}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 min-w-[200px]">
          {/* プリセット選択 */}
          <div className="p-1">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetClick(preset)}
                className="w-full text-left px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 rounded transition"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* カスタム入力 */}
          <div className="border-t border-zinc-100 p-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder=""
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value)}
                className="w-full px-2 py-1.5 text-[13px] border border-zinc-200 rounded outline-none focus:border-teal-500"
                step={allowDecimal ? '0.01' : '1'}
              />
              <span className="text-zinc-400 text-[13px]">~</span>
              <input
                type="number"
                placeholder=""
                value={customMax}
                onChange={(e) => setCustomMax(e.target.value)}
                className="w-full px-2 py-1.5 text-[13px] border border-zinc-200 rounded outline-none focus:border-teal-500"
                step={allowDecimal ? '0.01' : '1'}
              />
            </div>
            <button
              onClick={handleCustomApply}
              className="w-full mt-2 py-2 bg-zinc-800 text-white text-[13px] font-medium rounded hover:bg-zinc-700 transition"
            >
              確定
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// キーワードフィルター（テキスト入力）
interface KeywordFilterProps {
  includeKeywords: string
  excludeKeywords: string
  onIncludeChange: (value: string) => void
  onExcludeChange: (value: string) => void
}

export function KeywordFilterDropdown({
  includeKeywords,
  excludeKeywords,
  onIncludeChange,
  onExcludeChange,
}: KeywordFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempInclude, setTempInclude] = useState(includeKeywords)
  const [tempExclude, setTempExclude] = useState(excludeKeywords)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleApply = () => {
    onIncludeChange(tempInclude)
    onExcludeChange(tempExclude)
    setIsOpen(false)
  }

  const isActive = includeKeywords !== '' || excludeKeywords !== ''
  const getDisplayText = () => {
    if (!isActive) return '指定なし'
    const parts = []
    if (includeKeywords) parts.push(`含む: ${includeKeywords.split(/[\s\n]+/).length}件`)
    if (excludeKeywords) parts.push(`除外: ${excludeKeywords.split(/[\s\n]+/).length}件`)
    return parts.join(' / ') || '指定なし'
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex flex-col items-start px-4 py-2.5 rounded-md border transition min-w-[130px] ${
          isActive
            ? 'border-teal-500 bg-teal-50'
            : 'border-zinc-200 bg-white hover:border-zinc-300'
        }`}
      >
        <span className={`text-[13px] font-medium ${isActive ? 'text-teal-700' : 'text-zinc-700'}`}>
          キーワード
        </span>
        <div className="flex items-center gap-1 w-full">
          <span className={`text-[11px] px-1.5 py-0.5 rounded ${
            isActive ? 'bg-teal-100 text-teal-700' : 'bg-zinc-100 text-zinc-500'
          }`}>
            {getDisplayText()}
          </span>
          <ChevronDown className={`w-3 h-3 ml-auto ${isActive ? 'text-teal-600' : 'text-zinc-400'}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 min-w-[280px] p-3">
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-medium text-zinc-700">いずれかを含む</span>
              <span className="text-[11px] text-amber-600 flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-100 flex items-center justify-center text-[9px]">!</span>
                改行/空白区切りで一括入力
              </span>
            </div>
            <textarea
              value={tempInclude}
              onChange={(e) => setTempInclude(e.target.value)}
              placeholder="キーワードを入力"
              className="w-full px-3 py-2 text-[13px] border border-zinc-200 rounded outline-none focus:border-teal-500 resize-none h-16"
            />
          </div>

          <div className="mb-3">
            <div className="text-[13px] font-medium text-zinc-700 mb-1">除外するキーワード</div>
            <textarea
              value={tempExclude}
              onChange={(e) => setTempExclude(e.target.value)}
              placeholder="キーワードを入力"
              className="w-full px-3 py-2 text-[13px] border border-zinc-200 rounded outline-none focus:border-teal-500 resize-none h-16"
            />
          </div>

          <button
            onClick={handleApply}
            className="w-full py-2 bg-zinc-800 text-white text-[13px] font-medium rounded hover:bg-zinc-700 transition"
          >
            確定
          </button>
        </div>
      )}
    </div>
  )
}
