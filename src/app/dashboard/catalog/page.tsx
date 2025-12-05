'use client'

import { useState } from 'react'
import {
  Search,
  ChevronDown,
  X,
  ExternalLink,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Users,
  BarChart2,
} from 'lucide-react'

/**
 * Media Catalog Page
 *
 * Design spec: 03_ブランディングとデザインガイド.md
 *
 * Layout:
 * - Header: sticky, bg white, border-bottom
 * - Content: flex layout with main table and side panel
 * - Side panel: 400px width, slides in from right
 */

interface Media {
  id: string
  name: string
  domain: string
  monthlyTraffic: string
  trafficChange: number
  organic: number
  paid: number
  direct: number
}

interface Keyword {
  keyword: string
  intent: 'A' | 'B' | 'C'
  rank: number
  traffic: string
  volume: string
}

const sampleMedia: Media[] = [
  {
    id: '1',
    name: 'Indeed',
    domain: 'jp.indeed.com',
    monthlyTraffic: '45,000,000',
    trafficChange: 12.5,
    organic: 68,
    paid: 22,
    direct: 10,
  },
  {
    id: '2',
    name: 'ジョブメドレー',
    domain: 'job-medley.com',
    monthlyTraffic: '8,500,000',
    trafficChange: 8.2,
    organic: 72,
    paid: 18,
    direct: 10,
  },
  {
    id: '3',
    name: 'カイゴジョブ',
    domain: 'kaigojob.com',
    monthlyTraffic: '3,200,000',
    trafficChange: -2.3,
    organic: 65,
    paid: 25,
    direct: 10,
  },
  {
    id: '4',
    name: 'マイナビ介護',
    domain: 'mynavi-kaigo.jp',
    monthlyTraffic: '2,800,000',
    trafficChange: 5.1,
    organic: 58,
    paid: 32,
    direct: 10,
  },
  {
    id: '5',
    name: 'e介護転職',
    domain: 'ekaigotenshoku.com',
    monthlyTraffic: '1,500,000',
    trafficChange: 0,
    organic: 78,
    paid: 12,
    direct: 10,
  },
  {
    id: '6',
    name: 'ナースではたらこ',
    domain: 'nurse-dework.jp',
    monthlyTraffic: '980,000',
    trafficChange: 15.8,
    organic: 62,
    paid: 28,
    direct: 10,
  },
]

const sampleKeywords: Keyword[] = [
  { keyword: '訪問介護 求人', intent: 'A', rank: 1, traffic: '15,200', volume: '48,000' },
  { keyword: '介護職 転職', intent: 'A', rank: 3, traffic: '12,800', volume: '42,000' },
  { keyword: '川崎市 介護 正社員', intent: 'A', rank: 2, traffic: '8,500', volume: '22,000' },
  { keyword: 'ヘルパー 求人 神奈川', intent: 'B', rank: 5, traffic: '5,200', volume: '15,000' },
  { keyword: '介護福祉士 訪問', intent: 'B', rank: 4, traffic: '4,800', volume: '12,000' },
  { keyword: '介護職 未経験 OK', intent: 'B', rank: 8, traffic: '3,200', volume: '18,000' },
  { keyword: '訪問介護 パート', intent: 'C', rank: 6, traffic: '2,800', volume: '9,500' },
  { keyword: '介護 日勤のみ', intent: 'C', rank: 12, traffic: '1,500', volume: '6,200' },
]

export default function CatalogPage() {
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  const [intentFilter, setIntentFilter] = useState<string>('all')
  const [searchKeyword, setSearchKeyword] = useState('')

  const filteredKeywords = sampleKeywords.filter((kw) => {
    if (intentFilter !== 'all' && kw.intent !== intentFilter) return false
    if (searchKeyword && !kw.keyword.includes(searchKeyword)) return false
    return true
  })

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
            {/* Title: 15px, weight 600, color #18181B */}
            <h1
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#18181B',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              媒体カタログ
            </h1>
            {/* Subtitle: 13px, color #A1A1AA */}
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
                fontWeight: 400,
              }}
            >
              媒体の獲得キーワード・流入経路を確認
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
                placeholder="媒体を検索..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
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

      {/* Content area */}
      <div style={{ display: 'flex' }}>
        {/* Main table area */}
        <div
          style={{
            flex: 1,
            padding: '24px',
            paddingRight: selectedMedia ? '0' : '24px',
          }}
        >
          {/* Table card */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E4E4E7' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#A1A1AA',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    媒体名
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#A1A1AA',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    ドメイン
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '12px 16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#A1A1AA',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    月間トラフィック
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '12px 16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#A1A1AA',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    変化
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '12px 16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#A1A1AA',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    流入構成
                  </th>
                </tr>
              </thead>
              <tbody>
                {sampleMedia.map((media) => (
                  <tr
                    key={media.id}
                    onClick={() => setSelectedMedia(media)}
                    style={{
                      borderBottom: '1px solid #F4F4F5',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                      background: selectedMedia?.id === media.id ? '#F0FDFA' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedMedia?.id !== media.id) {
                        e.currentTarget.style.background = '#F4F4F5'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedMedia?.id !== media.id) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#18181B' }}>
                        {media.name}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '13px', color: '#A1A1AA' }}>{media.domain}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#18181B' }}>
                        {media.monthlyTraffic}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px',
                          color:
                            media.trafficChange > 0
                              ? '#10B981'
                              : media.trafficChange < 0
                                ? '#EF4444'
                                : '#A1A1AA',
                        }}
                      >
                        {media.trafficChange > 0 ? (
                          <TrendingUp style={{ width: 14, height: 14 }} />
                        ) : media.trafficChange < 0 ? (
                          <TrendingDown style={{ width: 14, height: 14 }} />
                        ) : (
                          <Minus style={{ width: 14, height: 14 }} />
                        )}
                        {media.trafficChange > 0 ? '+' : ''}
                        {media.trafficChange}%
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {/* Mini stack bar */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <div
                          style={{
                            width: '96px',
                            height: '6px',
                            background: '#F4F4F5',
                            borderRadius: '999px',
                            display: 'flex',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ background: '#0D9488', width: `${media.organic}%` }} />
                          <div style={{ background: '#F59E0B', width: `${media.paid}%` }} />
                          <div style={{ background: '#A1A1AA', width: `${media.direct}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side panel */}
        {selectedMedia && (
          <div
            style={{
              width: '400px',
              borderLeft: '1px solid #E4E4E7',
              background: '#FFFFFF',
              height: 'calc(100vh - 120px)',
              overflowY: 'auto',
              position: 'sticky',
              top: '73px',
            }}
          >
            {/* Panel header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E4E4E7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                background: '#FFFFFF',
                zIndex: 10,
              }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#18181B' }}>
                  {selectedMedia.name}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#A1A1AA',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '2px',
                  }}
                >
                  <Globe style={{ width: 12, height: 12 }} />
                  {selectedMedia.domain}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  style={{
                    padding: '6px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <ExternalLink style={{ width: 16, height: 16, color: '#A1A1AA' }} />
                </button>
                <button
                  onClick={() => setSelectedMedia(null)}
                  style={{
                    padding: '6px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <X style={{ width: 16, height: 16, color: '#A1A1AA' }} />
                </button>
              </div>
            </div>

            {/* Summary section */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E4E7' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      color: '#A1A1AA',
                      marginBottom: '4px',
                    }}
                  >
                    <Users style={{ width: 14, height: 14 }} />
                    月間トラフィック
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#18181B' }}>
                    {selectedMedia.monthlyTraffic}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      color: '#A1A1AA',
                      marginBottom: '4px',
                    }}
                  >
                    <BarChart2 style={{ width: 14, height: 14 }} />
                    先月比
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color:
                        selectedMedia.trafficChange > 0
                          ? '#10B981'
                          : selectedMedia.trafficChange < 0
                            ? '#EF4444'
                            : '#A1A1AA',
                    }}
                  >
                    {selectedMedia.trafficChange > 0 ? '+' : ''}
                    {selectedMedia.trafficChange}%
                  </div>
                </div>
              </div>

              {/* Traffic sources */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '8px' }}>
                  流入経路の内訳
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <TrafficSourceRow
                    color="#0D9488"
                    label="オーガニック検索"
                    value={selectedMedia.organic}
                  />
                  <TrafficSourceRow color="#F59E0B" label="有料広告" value={selectedMedia.paid} />
                  <TrafficSourceRow color="#A1A1AA" label="ダイレクト" value={selectedMedia.direct} />
                </div>
              </div>
            </div>

            {/* Keywords section */}
            <div style={{ padding: '16px 20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                  獲得キーワード
                </span>
                <button
                  style={{
                    fontSize: '12px',
                    color: '#0D9488',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Download style={{ width: 14, height: 14 }} />
                  CSV
                </button>
              </div>

              {/* Intent filter */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                {['all', 'A', 'B', 'C'].map((intent) => (
                  <button
                    key={intent}
                    onClick={() => setIntentFilter(intent)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 500,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: intentFilter === intent ? '#0D9488' : '#F4F4F5',
                      color: intentFilter === intent ? '#FFFFFF' : '#52525B',
                    }}
                  >
                    {intent === 'all' ? 'すべて' : `意図${intent}`}
                  </button>
                ))}
              </div>

              {/* Keywords list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredKeywords.map((kw, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: index < filteredKeywords.length - 1 ? '1px solid #F4F4F5' : 'none',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#18181B',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {kw.keyword}
                      </div>
                      <div style={{ fontSize: '11px', color: '#A1A1AA' }}>Vol: {kw.volume}</div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background:
                            kw.intent === 'A'
                              ? '#D1FAE5'
                              : kw.intent === 'B'
                                ? '#FEF3C7'
                                : '#F4F4F5',
                          color:
                            kw.intent === 'A'
                              ? '#059669'
                              : kw.intent === 'B'
                                ? '#D97706'
                                : '#A1A1AA',
                        }}
                      >
                        {kw.intent}
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>
                          {kw.rank}位
                        </div>
                        <div style={{ fontSize: '10px', color: '#A1A1AA' }}>{kw.traffic}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Traffic Source Row Component
 */
function TrafficSourceRow({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: number
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
          }}
        />
        <span style={{ fontSize: '12px', color: '#52525B' }}>{label}</span>
      </div>
      <span style={{ fontSize: '12px', fontWeight: 500, color: '#18181B' }}>{value}%</span>
    </div>
  )
}
