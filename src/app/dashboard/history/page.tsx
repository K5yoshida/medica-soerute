'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, Star, FileText, Clock, Folder, Trash2, ExternalLink } from 'lucide-react'

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

  // 日付でグルーピング
  const groupedHistory = filteredHistory.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = []
    }
    acc[item.date].push(item)
    return acc
  }, {} as Record<string, HistoryItem[]>)

  return (
    <>
      {/* ヘッダー */}
      <header className="bg-white border-b border-[#E4E4E7] px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold text-[#18181B] tracking-tight">履歴</h1>
            <p className="text-[13px] text-[#A1A1AA] mt-0.5">過去の分析・診断結果</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 検索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA]" />
              <input
                type="text"
                placeholder="履歴を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 pr-3 py-2 border border-[#E4E4E7] rounded-md text-[13px] focus:outline-none focus:border-[#A1A1AA] transition-colors"
              />
            </div>
            {/* フィルター */}
            <button className="px-3 py-2 border border-[#E4E4E7] rounded-md text-[13px] text-[#52525B] hover:bg-[#F4F4F5] transition-colors flex items-center gap-2">
              フィルター
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* コンテンツ */}
      <div className="p-6">
        {/* タブフィルター */}
        <div className="flex gap-1 mb-6 bg-[#F4F4F5] p-1 rounded-lg inline-flex">
          {[
            { id: 'all', label: 'すべて' },
            { id: 'matching', label: '媒体マッチング' },
            { id: 'peso', label: 'PESO診断' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-white text-[#18181B] shadow-sm'
                  : 'text-[#A1A1AA] hover:text-[#52525B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 履歴リスト */}
        {Object.keys(groupedHistory).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([date, items]) => (
              <div key={date}>
                {/* 日付ヘッダー */}
                <div className="text-[12px] font-medium text-[#A1A1AA] mb-3">{date}</div>

                {/* アイテム */}
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-[#E4E4E7] rounded-lg p-4 hover:border-[#A1A1AA] transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        {/* アイコン */}
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            item.type === 'matching'
                              ? 'bg-[rgba(245,158,11,0.1)]'
                              : 'bg-[rgba(139,92,246,0.1)]'
                          }`}
                        >
                          {item.type === 'matching' ? (
                            <Star className="h-5 w-5 text-[#D97706]" />
                          ) : (
                            <FileText className="h-5 w-5 text-[#7C3AED]" />
                          )}
                        </div>

                        {/* コンテンツ */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[14px] font-medium text-[#18181B] truncate">
                              {item.title}
                            </span>
                            {item.folder && (
                              <span className="text-[11px] text-[#A1A1AA] flex items-center gap-1 flex-shrink-0">
                                <Folder className="h-3 w-3" />
                                {item.folder}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[12px] text-[#A1A1AA]">
                            <span
                              className={`px-1.5 py-0.5 rounded font-medium ${
                                item.type === 'matching'
                                  ? 'bg-[rgba(245,158,11,0.1)] text-[#D97706]'
                                  : 'bg-[rgba(139,92,246,0.1)] text-[#7C3AED]'
                              }`}
                            >
                              {item.type === 'matching' ? 'マッチング' : 'PESO'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-[#D4D4D8]" />
                            <span>{item.subtitle}</span>
                            <span className="w-1 h-1 rounded-full bg-[#D4D4D8]" />
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.time}
                            </span>
                          </div>
                        </div>

                        {/* 結果 */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-[11px] text-[#A1A1AA]">{item.result.label}</div>
                          <div className="text-[14px] font-semibold text-[#18181B]">{item.result.value}</div>
                        </div>

                        {/* アクション（ホバー時表示） */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Link
                            href={`/dashboard/history/${item.id}`}
                            className="p-1.5 hover:bg-[#F4F4F5] rounded-md transition-colors"
                          >
                            <ExternalLink className="h-4 w-4 text-[#A1A1AA]" />
                          </Link>
                          <button className="p-1.5 hover:bg-[#F4F4F5] rounded-md transition-colors">
                            <Folder className="h-4 w-4 text-[#A1A1AA]" />
                          </button>
                          <button className="p-1.5 hover:bg-[#FEF2F2] rounded-md transition-colors">
                            <Trash2 className="h-4 w-4 text-[#A1A1AA] hover:text-[#EF4444]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#E4E4E7] rounded-lg py-12">
            <div className="text-center text-[#A1A1AA]">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-[14px] font-medium text-[#52525B]">履歴がありません</p>
              <p className="text-[13px] mt-1">
                媒体マッチングやPESO診断を実行すると、ここに履歴が表示されます
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
