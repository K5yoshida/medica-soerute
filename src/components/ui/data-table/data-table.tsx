'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { FixedColumn } from './fixed-column'
import { ScrollableArea } from './scrollable-area'
import { TableHeader } from './table-header'
import type { DataTableProps, ScrollShadowState } from './types'

/**
 * DataTable - 左固定列 + 右スクロールデータテーブル
 *
 * Design spec: 03_ブランディングとデザインガイド.md - 3.8.4 テーブル
 *
 * Features:
 * - 左右分割レイアウト（固定列 + スクロール列）
 * - 縦スクロール同期（requestAnimationFrame使用）
 * - 横スクロールシャドウ表示
 * - 行ホバー同期（左右テーブル間）
 * - ソート機能
 * - ヘルプモーダル連携
 */
export function DataTable<T>({
  data,
  getRowKey,
  fixedColumn,
  columns,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  onHelpClick,
  isLoading,
  emptyMessage = 'データがありません',
  maxHeight = 'calc(100vh - 140px)',
  showAccentLine = true,
}: DataTableProps<T>) {
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null)
  const [scrollShadow, setScrollShadow] = useState<ScrollShadowState>('start')

  // スクロール同期用ref
  const leftTableRef = useRef<HTMLDivElement>(null)
  const rightTableRef = useRef<HTMLDivElement>(null)
  const scrollSource = useRef<'left' | 'right' | null>(null)
  const rafId = useRef<number | null>(null)

  // 縦スクロール同期（左 → 右）
  const handleLeftScroll = useCallback(() => {
    if (scrollSource.current === 'right') return
    scrollSource.current = 'left'

    if (rafId.current) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      if (rightTableRef.current && leftTableRef.current) {
        rightTableRef.current.scrollTop = leftTableRef.current.scrollTop
      }
      scrollSource.current = null
    })
  }, [])

  // 縦スクロール同期（右 → 左）+ 横スクロールシャドウ更新
  const handleRightScroll = useCallback(() => {
    if (scrollSource.current === 'left') return
    scrollSource.current = 'right'

    if (rafId.current) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      if (leftTableRef.current && rightTableRef.current) {
        leftTableRef.current.scrollTop = rightTableRef.current.scrollTop
      }
      scrollSource.current = null
    })

    updateScrollShadow()
  }, [])

  // 横スクロールシャドウ状態更新
  const updateScrollShadow = useCallback(() => {
    const el = rightTableRef.current
    if (!el) return

    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = scrollWidth - clientWidth

    if (maxScroll <= 0) {
      setScrollShadow('none')
    } else if (scrollLeft <= 1) {
      setScrollShadow('start')
    } else if (scrollLeft >= maxScroll - 1) {
      setScrollShadow('end')
    } else {
      setScrollShadow('middle')
    }
  }, [])

  // 初回ロード時とリサイズ時にシャドウ状態を更新
  useEffect(() => {
    updateScrollShadow()
    window.addEventListener('resize', updateScrollShadow)
    return () => window.removeEventListener('resize', updateScrollShadow)
  }, [updateScrollShadow, data])

  // ローディング表示
  if (isLoading) {
    return (
      <div
        className="bg-white border border-zinc-200 rounded-lg flex items-center justify-center"
        style={{ minHeight: '200px' }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        <span className="ml-2 text-[13px] text-zinc-500">読み込み中...</span>
      </div>
    )
  }

  // 空状態表示
  if (data.length === 0) {
    return (
      <div
        className="bg-white border border-zinc-200 rounded-lg flex items-center justify-center"
        style={{ minHeight: '200px' }}
      >
        <span className="text-[13px] text-zinc-500">{emptyMessage}</span>
      </div>
    )
  }

  const rowClassName = showAccentLine ? 'data-table-row' : ''

  return (
    <div
      className="bg-white border border-zinc-200 rounded-lg"
      style={{ display: 'flex', overflow: 'hidden', position: 'relative', maxHeight }}
    >
      {/* 左側: 固定列 */}
      <FixedColumn
        width={fixedColumn.width}
        scrollRef={leftTableRef}
        onScroll={handleLeftScroll}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr style={{ borderBottom: '1px solid #E4E4E7', height: '41px' }}>
              <th
                className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                style={{ background: '#F4F4F5', padding: '0 16px 0 20px' }}
              >
                {fixedColumn.header}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => {
              const rowKey = getRowKey(row)
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={() => setHoveredRowId(rowKey)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  className={`${rowClassName} ${hoveredRowId === rowKey ? 'is-hovered' : ''}`}
                  style={{
                    borderBottom: '1px solid #F4F4F5',
                    height: '57px',
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                >
                  <td style={{ padding: '0 16px 0 20px' }}>
                    {fixedColumn.cell(row, rowIndex)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </FixedColumn>

      {/* 右側: スクロール可能データ列 */}
      <ScrollableArea
        scrollRef={rightTableRef}
        onScroll={handleRightScroll}
        scrollShadow={scrollShadow}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr style={{ borderBottom: '1px solid #E4E4E7', height: '41px' }}>
              {columns.map((col) => (
                <TableHeader
                  key={col.id}
                  label={col.label}
                  helpKey={col.helpKey}
                  align={col.align}
                  width={col.width}
                  minWidth={col.minWidth}
                  borderRight={col.borderRight}
                  sortable={col.sortable}
                  isActiveSort={sortBy === col.id}
                  sortOrder={sortOrder}
                  onSort={col.sortable && onSort ? () => onSort(col.id) : undefined}
                  onHelpClick={onHelpClick}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => {
              const rowKey = getRowKey(row)
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={() => setHoveredRowId(rowKey)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  className={`transition ${hoveredRowId === rowKey ? 'bg-zinc-100' : ''}`}
                  style={{
                    borderBottom: '1px solid #F4F4F5',
                    height: '57px',
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={`px-2 py-2.5 ${col.align === 'left' ? 'text-left' : col.align === 'right' ? 'text-right' : 'text-center'}`}
                      style={{
                        width: col.width ? `${col.width}px` : undefined,
                        minWidth: col.minWidth ?? col.width ? `${col.minWidth ?? col.width}px` : undefined,
                        borderRight: col.borderRight ? '1px solid #E4E4E7' : undefined,
                      }}
                    >
                      {col.cell(row, rowIndex)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </ScrollableArea>
    </div>
  )
}
