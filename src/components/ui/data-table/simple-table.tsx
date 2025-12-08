'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { TableHeader } from './table-header'
import type { ColumnDef, FixedColumnDef, SortOrder } from './types'

/**
 * SimpleTable - 横スクロールなしのシンプルなテーブル
 *
 * Design spec: 03_ブランディングとデザインガイド.md - 3.8.4 テーブル
 *
 * Features:
 * - 単一テーブル（横スクロールなし、画面幅に収まる）
 * - ソート機能
 * - 行ホバー
 */

export interface SimpleTableProps<T> {
  /** テーブルデータ */
  data: T[]
  /** 各行のユニークキー取得関数 */
  getRowKey: (row: T) => string
  /** 固定列定義（最左列として表示） */
  fixedColumn: FixedColumnDef<T>
  /** カラム定義 */
  columns: ColumnDef<T>[]
  /** 行クリックハンドラー */
  onRowClick?: (row: T) => void
  /** 現在のソートカラムID */
  sortBy?: string
  /** 現在のソート順序 */
  sortOrder?: SortOrder
  /** ソート変更ハンドラー */
  onSort?: (columnId: string) => void
  /** ヘルプクリックハンドラー */
  onHelpClick?: (helpKey: string) => void
  /** ローディング状態 */
  isLoading?: boolean
  /** 空状態メッセージ */
  emptyMessage?: string
  /** テーブル最大高さ */
  maxHeight?: string
}

export function SimpleTable<T>({
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
}: SimpleTableProps<T>) {
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null)

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

  return (
    <div
      className="bg-white border border-zinc-200 rounded-lg overflow-hidden"
      style={{ maxHeight, width: '100%' }}
    >
      <div style={{ overflowY: 'auto', maxHeight, width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr style={{ borderBottom: '1px solid #E4E4E7', height: '41px' }}>
              {/* 固定列ヘッダー */}
              <th
                className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                style={{
                  background: '#F4F4F5',
                  padding: '0 16px 0 20px',
                  minWidth: `${fixedColumn.width}px`,
                }}
              >
                {fixedColumn.header}
              </th>
              {/* データ列ヘッダー */}
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
                  {/* 固定列セル */}
                  <td
                    style={{
                      padding: '0 16px 0 20px',
                      minWidth: `${fixedColumn.width}px`,
                    }}
                  >
                    {fixedColumn.cell(row, rowIndex)}
                  </td>
                  {/* データ列セル */}
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={`px-2 py-2.5 ${col.align === 'left' ? 'text-left' : col.align === 'right' ? 'text-right' : 'text-center'}`}
                      style={{
                        minWidth: col.minWidth ? `${col.minWidth}px` : col.width ? `${col.width}px` : undefined,
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
      </div>
    </div>
  )
}
