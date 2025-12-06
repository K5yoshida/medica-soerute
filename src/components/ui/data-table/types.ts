/**
 * DataTable 共通型定義
 *
 * Design spec: 03_ブランディングとデザインガイド.md - 3.8.4 テーブル
 */

import { ReactNode } from 'react'

/**
 * スクロールシャドウの状態
 */
export type ScrollShadowState = 'start' | 'middle' | 'end' | 'none'

/**
 * ソート順序
 */
export type SortOrder = 'asc' | 'desc'

/**
 * カラム定義の基本型
 */
export interface ColumnDef<T> {
  /** カラムID（ソート・識別用） */
  id: string
  /** ヘッダー表示ラベル */
  label: string
  /** カラム幅（px） */
  width: number
  /** 最小幅（px） */
  minWidth?: number
  /** 配置 */
  align?: 'left' | 'center' | 'right'
  /** 右ボーダー表示 */
  borderRight?: boolean
  /** ソート可能か */
  sortable?: boolean
  /** ヘルプキー（ヘルプモーダル用） */
  helpKey?: string
  /** セルレンダラー */
  cell: (row: T, rowIndex: number) => ReactNode
}

/**
 * 固定列の定義
 */
export interface FixedColumnDef<T> {
  /** 固定列の幅（px） */
  width: number
  /** 固定列のヘッダー */
  header: ReactNode
  /** 固定列のセルレンダラー */
  cell: (row: T, rowIndex: number) => ReactNode
}

/**
 * DataTable Props
 */
export interface DataTableProps<T> {
  /** テーブルデータ */
  data: T[]
  /** 各行のユニークキー取得関数 */
  getRowKey: (row: T) => string
  /** 固定列定義 */
  fixedColumn: FixedColumnDef<T>
  /** スクロール可能カラム定義 */
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
  /** 行ホバー時の左アクセントライン表示 */
  showAccentLine?: boolean
}

/**
 * TableHeader Props（ヘルプ付き）
 */
export interface TableHeaderProps {
  /** ラベル */
  label: string
  /** ヘルプキー */
  helpKey?: string
  /** 配置 */
  align?: 'left' | 'center' | 'right'
  /** 幅 */
  width?: number
  /** 最小幅 */
  minWidth?: number
  /** 右ボーダー */
  borderRight?: boolean
  /** ソート可能 */
  sortable?: boolean
  /** 現在のソートカラムか */
  isActiveSort?: boolean
  /** ソート順序 */
  sortOrder?: SortOrder
  /** ソートクリックハンドラー */
  onSort?: () => void
  /** ヘルプクリックハンドラー */
  onHelpClick?: (helpKey: string) => void
}

/**
 * ScrollableArea Props
 */
export interface ScrollableAreaProps {
  children: ReactNode
  /** 縦スクロール同期用ref */
  scrollRef?: React.RefObject<HTMLDivElement>
  /** スクロールイベントハンドラー */
  onScroll?: () => void
  /** スクロールシャドウ状態 */
  scrollShadow?: ScrollShadowState
}

/**
 * FixedColumn Props
 */
export interface FixedColumnProps {
  children: ReactNode
  /** 幅（px） */
  width: number
  /** 縦スクロール同期用ref */
  scrollRef?: React.RefObject<HTMLDivElement>
  /** スクロールイベントハンドラー */
  onScroll?: () => void
}
