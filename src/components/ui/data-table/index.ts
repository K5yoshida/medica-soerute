/**
 * DataTable 共通コンポーネント
 *
 * 左固定列 + 右スクロール可能データテーブル
 *
 * @example
 * import { DataTable } from '@/components/ui/data-table'
 *
 * <DataTable
 *   data={mediaList}
 *   getRowKey={(row) => row.id}
 *   fixedColumn={{
 *     width: 240,
 *     header: '媒体名',
 *     cell: (row) => <MediaCell media={row} />,
 *   }}
 *   columns={[
 *     { id: 'visits', label: '月間訪問', width: 120, cell: (row) => formatNumber(row.visits) },
 *     // ...
 *   ]}
 *   onRowClick={(row) => router.push(`/catalog/${row.id}`)}
 * />
 */

export { DataTable } from './data-table'
export { SimpleTable } from './simple-table'
export { TableHeader } from './table-header'
export { FixedColumn } from './fixed-column'
export { ScrollableArea } from './scrollable-area'
export type {
  DataTableProps,
  ColumnDef,
  FixedColumnDef,
  TableHeaderProps,
  ScrollShadowState,
  SortOrder,
} from './types'
export type { SimpleTableProps } from './simple-table'
