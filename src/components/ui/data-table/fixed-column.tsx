'use client'

import { forwardRef } from 'react'
import type { FixedColumnProps } from './types'

/**
 * FixedColumn - 左固定列ラッパー
 *
 * Design spec: 一覧ページのパターンを継承
 * - background: #FAFAFA (固定列は bg-page で視覚的に区別)
 * - borderRight: 1px solid #E4E4E7
 * - overflowY: auto (スクロール同期用)
 * - hide-scrollbar クラスでスクロールバー非表示
 */
export const FixedColumn = forwardRef<HTMLDivElement, FixedColumnProps>(
  function FixedColumn({ children, width, scrollRef, onScroll }, ref) {
    return (
      <div
        ref={scrollRef ?? ref}
        onScroll={onScroll}
        className="hide-scrollbar"
        style={{
          flexShrink: 0,
          width: `${width}px`,
          borderRight: '1px solid #E4E4E7',
          background: '#FAFAFA',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    )
  }
)
