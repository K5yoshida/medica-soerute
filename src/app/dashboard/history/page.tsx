'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  ChevronDown,
  Star,
  FileText,
  Clock,
  Folder,
  Trash2,
  ExternalLink,
} from 'lucide-react'

/**
 * History Page
 *
 * Design spec: 03_ブランディングとデザインガイド.md
 *
 * Features:
 * - Filter by type (all, matching, peso)
 * - Search functionality
 * - Grouped by date
 * - Hover actions
 */

interface HistoryItem {
  id: string
  type: 'matching' | 'peso'
  title: string
  subtitle: string
  date: string
  time: string
  result: {
    label: string
    value: string
  }
  folder?: string
}

const sampleHistory: HistoryItem[] = [
  {
    id: '1',
    type: 'matching',
    title: '川崎市麻生区 × 訪問介護',
    subtitle: '正社員 ・ 6クエリ',
    date: '2024/12/03',
    time: '14:30',
    result: { label: 'Best', value: 'Indeed' },
    folder: '12月案件',
  },
  {
    id: '2',
    type: 'peso',
    title: '株式会社ケアサポート',
    subtitle: 'URL分析',
    date: '2024/12/03',
    time: '10:15',
    result: { label: 'Score', value: '68/100' },
  },
  {
    id: '3',
    type: 'matching',
    title: '横浜市青葉区 × 施設介護',
    subtitle: 'パート ・ 4クエリ',
    date: '2024/12/02',
    time: '16:45',
    result: { label: 'Best', value: 'ジョブメドレー' },
    folder: '12月案件',
  },
  {
    id: '4',
    type: 'peso',
    title: '医療法人〇〇会',
    subtitle: 'アンケート',
    date: '2024/12/01',
    time: '09:30',
    result: { label: 'Score', value: '52/100' },
  },
  {
    id: '5',
    type: 'matching',
    title: '品川区 × 訪問看護',
    subtitle: '正社員 ・ 5クエリ',
    date: '2024/11/30',
    time: '13:00',
    result: { label: 'Best', value: 'マイナビ介護' },
  },
]

export default function HistoryPage() {
  const [filter, setFilter] = useState<'all' | 'matching' | 'peso'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredHistory = sampleHistory.filter((item) => {
    if (filter !== 'all' && item.type !== filter) return false
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Group by date
  const groupedHistory = filteredHistory.reduce(
    (acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = []
      }
      acc[item.date].push(item)
      return acc
    },
    {} as Record<string, HistoryItem[]>
  )

  return (
    <>
      {/* Header: sticky, bg white, border-bottom, padding 16px 24px */}
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E4E4E7',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#18181B',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              履歴
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
                fontWeight: 400,
              }}
            >
              過去の分析・診断結果
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search input */}
            <div style={{ position: 'relative' }}>
              <Search
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: '#A1A1AA',
                }}
              />
              <input
                type="text"
                placeholder="履歴を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '256px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
              />
            </div>

            {/* Filter button */}
            <button
              style={{
                padding: '8px 12px',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#52525B',
                background: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.15s ease',
              }}
            >
              フィルター
              <ChevronDown style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </header>

      {/* Content area: padding 24px */}
      <div style={{ padding: '24px' }}>
        {/* Tab filter */}
        <div
          style={{
            display: 'inline-flex',
            gap: '4px',
            marginBottom: '24px',
            background: '#F4F4F5',
            padding: '4px',
            borderRadius: '8px',
          }}
        >
          {[
            { id: 'all', label: 'すべて' },
            { id: 'matching', label: '媒体マッチング' },
            { id: 'peso', label: 'PESO診断' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: filter === tab.id ? '#FFFFFF' : 'transparent',
                color: filter === tab.id ? '#18181B' : '#A1A1AA',
                boxShadow: filter === tab.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* History list */}
        {Object.keys(groupedHistory).length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(groupedHistory).map(([date, items]) => (
              <div key={date}>
                {/* Date header */}
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#A1A1AA',
                    marginBottom: '12px',
                  }}
                >
                  {date}
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map((item) => (
                    <HistoryItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '8px',
              padding: '48px 24px',
            }}
          >
            <div style={{ textAlign: 'center', color: '#A1A1AA' }}>
              <Clock
                style={{
                  width: 40,
                  height: 40,
                  margin: '0 auto 12px',
                  opacity: 0.5,
                }}
              />
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#52525B' }}>
                履歴がありません
              </p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                媒体マッチングやPESO診断を実行すると、ここに履歴が表示されます
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/**
 * History Item Card Component
 */
function HistoryItemCard({ item }: { item: HistoryItem }) {
  const [isHovered, setIsHovered] = useState(false)
  const isMatching = item.type === 'matching'
  const iconBg = isMatching ? 'rgba(245,158,11,0.1)' : 'rgba(139,92,246,0.1)'
  const iconColor = isMatching ? '#D97706' : '#7C3AED'

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '8px',
        padding: '16px',
        transition: 'border-color 0.15s ease',
        borderColor: isHovered ? '#A1A1AA' : '#E4E4E7',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: iconBg,
          }}
        >
          {isMatching ? (
            <Star style={{ width: 20, height: 20, color: iconColor }} />
          ) : (
            <FileText style={{ width: 20, height: 20, color: iconColor }} />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#18181B',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.title}
            </span>
            {item.folder && (
              <span
                style={{
                  fontSize: '11px',
                  color: '#A1A1AA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <Folder style={{ width: 12, height: 12 }} />
                {item.folder}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#A1A1AA' }}>
            <span
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 500,
                background: iconBg,
                color: iconColor,
              }}
            >
              {isMatching ? 'マッチング' : 'PESO'}
            </span>
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#D4D4D8',
              }}
            />
            <span>{item.subtitle}</span>
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#D4D4D8',
              }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock style={{ width: 12, height: 12 }} />
              {item.time}
            </span>
          </div>
        </div>

        {/* Result */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', color: '#A1A1AA' }}>{item.result.label}</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>
            {item.result.value}
          </div>
        </div>

        {/* Actions (visible on hover) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.15s ease',
            flexShrink: 0,
          }}
        >
          <Link
            href={`/dashboard/history/${item.id}`}
            style={{
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.1s ease',
              background: 'transparent',
            }}
          >
            <ExternalLink style={{ width: 16, height: 16, color: '#A1A1AA' }} />
          </Link>
          <button
            style={{
              padding: '6px',
              border: 'none',
              borderRadius: '6px',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.1s ease',
            }}
          >
            <Folder style={{ width: 16, height: 16, color: '#A1A1AA' }} />
          </button>
          <button
            style={{
              padding: '6px',
              border: 'none',
              borderRadius: '6px',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.1s ease',
            }}
          >
            <Trash2 style={{ width: 16, height: 16, color: '#A1A1AA' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
