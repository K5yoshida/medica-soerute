'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Target,
  Megaphone,
  Share2,
  Globe,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react'

/**
 * SC-905: 施策マスター管理画面
 *
 * Design spec: 09_画面一覧.md - SC-905
 *
 * Features:
 * - 施策マスター一覧表示
 * - カテゴリ別フィルタリング（P/E/S/O）
 * - 施策の追加・編集・削除
 * - フォームスキーマ編集
 */

interface TacticFormField {
  name: string
  type: 'text' | 'number' | 'select' | 'checkbox' | 'multiselect'
  label: string
  options?: string[]
  required?: boolean
}

interface Tactic {
  code: string
  name: string
  category: string
  peso_category: 'paid' | 'earned' | 'shared' | 'owned'
  form_schema: {
    fields: TacticFormField[]
  }
}

export default function AdminTacticsPage() {
  const [tactics, setTactics] = useState<Tactic[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [pesoFilter, setPesoFilter] = useState<string>('all')
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const [_editingTactic, setEditingTactic] = useState<Tactic | null>(null)

  useEffect(() => {
    fetchTactics()
  }, [])

  const fetchTactics = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/master/tactics')
      const data = await res.json()
      if (data.success) {
        setTactics(data.data.tactics)
      }
    } catch (error) {
      console.error('Failed to fetch tactics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'paid':
        return <Target style={{ width: 14, height: 14 }} />
      case 'earned':
        return <Megaphone style={{ width: 14, height: 14 }} />
      case 'shared':
        return <Share2 style={{ width: 14, height: 14 }} />
      case 'owned':
        return <Globe style={{ width: 14, height: 14 }} />
      default:
        return null
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'paid':
        return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' }
      case 'earned':
        return { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' }
      case 'shared':
        return { bg: 'rgba(13, 148, 136, 0.1)', text: '#0D9488' }
      case 'owned':
        return { bg: 'rgba(124, 58, 237, 0.1)', text: '#7C3AED' }
      default:
        return { bg: '#F4F4F5', text: '#71717A' }
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'paid':
        return 'Paid'
      case 'earned':
        return 'Earned'
      case 'shared':
        return 'Shared'
      case 'owned':
        return 'Owned'
      default:
        return category
    }
  }

  const filteredTactics = tactics.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPeso = pesoFilter === 'all' || t.peso_category === pesoFilter
    return matchesSearch && matchesPeso
  })

  const groupedTactics = filteredTactics.reduce(
    (acc, tactic) => {
      const cat = tactic.peso_category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(tactic)
      return acc
    },
    {} as Record<string, Tactic[]>
  )

  return (
    <>
      {/* Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#18181B',
                margin: 0,
              }}
            >
              施策マスター管理
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
              }}
            >
              PESO診断で使用する施策定義を管理
            </p>
          </div>

          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#7C3AED',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            施策を追加
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Search
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 14,
                height: 14,
                color: '#A1A1AA',
              }}
            />
            <input
              type="text"
              placeholder="施策名・コードで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '6px',
                border: '1px solid #E4E4E7',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* PESO Filter */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'paid', 'earned', 'shared', 'owned'].map((cat) => {
              const isActive = pesoFilter === cat
              const color = cat === 'all' ? { bg: '#F4F4F5', text: '#71717A' } : getCategoryColor(cat)
              return (
                <button
                  key={cat}
                  onClick={() => setPesoFilter(cat)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${isActive ? color.text : '#E4E4E7'}`,
                    background: isActive ? color.bg : '#FFFFFF',
                    color: isActive ? color.text : '#71717A',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {cat === 'all' ? 'すべて' : getCategoryLabel(cat)}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#A1A1AA' }}>読み込み中...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(groupedTactics).map(([category, items]) => (
              <div
                key={category}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #E4E4E7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '6px',
                      background: getCategoryColor(category).bg,
                      color: getCategoryColor(category).text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getCategoryIcon(category)}
                  </span>
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#18181B',
                      margin: 0,
                    }}
                  >
                    {getCategoryLabel(category)} Media
                  </h3>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#A1A1AA',
                      marginLeft: 'auto',
                    }}
                  >
                    {items.length}件
                  </span>
                </div>

                <div>
                  {items.map((tactic) => {
                    const isExpanded = expandedCode === tactic.code
                    return (
                      <div key={tactic.code} style={{ borderBottom: '1px solid #F4F4F5' }}>
                        <div
                          style={{
                            padding: '12px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            cursor: 'pointer',
                          }}
                          onClick={() => setExpandedCode(isExpanded ? null : tactic.code)}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#18181B',
                              }}
                            >
                              {tactic.name}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#A1A1AA',
                                fontFamily: 'monospace',
                              }}
                            >
                              {tactic.code}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#71717A',
                              background: '#F4F4F5',
                              padding: '4px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {tactic.category}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#A1A1AA',
                            }}
                          >
                            {tactic.form_schema.fields.length}フィールド
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingTactic(tactic)
                              }}
                              style={{
                                padding: '6px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#71717A',
                              }}
                            >
                              <Edit2 style={{ width: 14, height: 14 }} />
                            </button>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                padding: '6px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#EF4444',
                              }}
                            >
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                          {isExpanded ? (
                            <ChevronUp style={{ width: 16, height: 16, color: '#A1A1AA' }} />
                          ) : (
                            <ChevronDown style={{ width: 16, height: 16, color: '#A1A1AA' }} />
                          )}
                        </div>

                        {isExpanded && (
                          <div
                            style={{
                              padding: '16px 20px',
                              background: '#FAFAFA',
                              borderTop: '1px solid #F4F4F5',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px',
                              }}
                            >
                              <Settings style={{ width: 14, height: 14, color: '#71717A' }} />
                              <span style={{ fontSize: '12px', fontWeight: 500, color: '#71717A' }}>
                                フォームフィールド
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {tactic.form_schema.fields.map((field, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '8px 12px',
                                    background: '#FFFFFF',
                                    borderRadius: '6px',
                                    border: '1px solid #E4E4E7',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      color: '#FFFFFF',
                                      background: '#71717A',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {field.type}
                                  </span>
                                  <span style={{ fontSize: '13px', color: '#18181B' }}>
                                    {field.label}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      color: '#A1A1AA',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {field.name}
                                  </span>
                                  {field.required && (
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        color: '#EF4444',
                                        marginLeft: 'auto',
                                      }}
                                    >
                                      必須
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
