'use client'

import { HelpCircle } from 'lucide-react'
import type { TableHeaderProps } from './types'

/**
 * TableHeader - ヘルプ・ソート対応ヘッダーセル
 *
 * Design spec: 03_ブランディングとデザインガイド.md - 3.8.4 テーブル
 * - background: #F4F4F5 (bg-subtle)
 * - font-size: 11px
 * - font-weight: 600
 * - color: #A1A1AA (text-muted)
 * - text-transform: uppercase
 * - letter-spacing: 0.04em
 * - padding: 12px 16px
 */
export function TableHeader({
  label,
  helpKey,
  align = 'center',
  width,
  minWidth,
  borderRight,
  sortable,
  isActiveSort,
  sortOrder,
  onSort,
  onHelpClick,
}: TableHeaderProps) {
  const alignClass = align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right'
  const justifyClass = align === 'left' ? '' : align === 'center' ? 'justify-center' : 'justify-end'

  const handleClick = () => {
    if (sortable && onSort) {
      onSort()
    }
  }

  return (
    <th
      className={`${alignClass} px-2 whitespace-nowrap ${sortable ? 'cursor-pointer hover:bg-zinc-100 transition' : ''}`}
      style={{
        background: '#FAFAFA',
        height: '41px',
        width: width ? `${width}px` : undefined,
        minWidth: minWidth ?? width ? `${minWidth ?? width}px` : undefined,
        borderRight: borderRight ? '1px solid #E4E4E7' : undefined,
        fontSize: '11px',
        fontWeight: 600,
        color: '#A1A1AA',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
      onClick={handleClick}
    >
      <div className={`flex items-center gap-1 ${justifyClass}`}>
        <span>{label}</span>
        {sortable && (
          <span style={{ fontSize: '10px', color: isActiveSort ? '#0D9488' : '#D4D4D8' }}>
            {isActiveSort ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
          </span>
        )}
        {helpKey && onHelpClick && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onHelpClick(helpKey)
            }}
            className="text-zinc-300 hover:text-teal-500 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </th>
  )
}
