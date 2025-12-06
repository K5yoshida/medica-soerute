'use client'

import { forwardRef } from 'react'
import type { ScrollableAreaProps } from './types'

/**
 * ScrollableArea - 横スクロール可能なデータ列ラッパー
 *
 * Design spec: 一覧ページのパターンを継承
 * - 左右シャドウオーバーレイでスクロール可能性を示す
 * - シャドウはグラデーション (rgba(0,0,0,0.06))
 */
export const ScrollableArea = forwardRef<HTMLDivElement, ScrollableAreaProps>(
  function ScrollableArea({ children, scrollRef, onScroll, scrollShadow = 'start' }, ref) {
    return (
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* 右端シャドウ（スクロール可能を示す） */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '40px',
            background: 'linear-gradient(to left, rgba(0,0,0,0.06) 0%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 3,
            opacity: scrollShadow === 'start' || scrollShadow === 'middle' ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
        {/* 左端シャドウ（スクロール済みを示す） */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '40px',
            background: 'linear-gradient(to right, rgba(0,0,0,0.06) 0%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 3,
            opacity: scrollShadow === 'end' || scrollShadow === 'middle' ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
        <div
          ref={scrollRef ?? ref}
          onScroll={onScroll}
          style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
          }}
        >
          {children}
        </div>
      </div>
    )
  }
)
