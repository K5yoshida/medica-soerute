'use client'

import { useState } from 'react'
import { Search, ChevronDown, X, ExternalLink, Download, TrendingUp, TrendingDown, Minus, Globe, Users, BarChart2 } from 'lucide-react'

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
  { id: '1', name: 'Indeed', domain: 'jp.indeed.com', monthlyTraffic: '45,000,000', trafficChange: 12.5, organic: 68, paid: 22, direct: 10 },
  { id: '2', name: 'ジョブメドレー', domain: 'job-medley.com', monthlyTraffic: '8,500,000', trafficChange: 8.2, organic: 72, paid: 18, direct: 10 },
  { id: '3', name: 'カイゴジョブ', domain: 'kaigojob.com', monthlyTraffic: '3,200,000', trafficChange: -2.3, organic: 65, paid: 25, direct: 10 },
  { id: '4', name: 'マイナビ介護', domain: 'mynavi-kaigo.jp', monthlyTraffic: '2,800,000', trafficChange: 5.1, organic: 58, paid: 32, direct: 10 },
  { id: '5', name: 'e介護転職', domain: 'ekaigotenshoku.com', monthlyTraffic: '1,500,000', trafficChange: 0, organic: 78, paid: 12, direct: 10 },
  { id: '6', name: 'ナースではたらこ', domain: 'nurse-dework.jp', monthlyTraffic: '980,000', trafficChange: 15.8, organic: 62, paid: 28, direct: 10 },
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

  const handleMediaClick = (media: Media) => {
    setSelectedMedia(media)
  }

  const closePanel = () => {
    setSelectedMedia(null)
  }

  return (
    <>
      {/* ヘッダー */}
      <header className="bg-white border-b border-[#E4E4E7] px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold text-[#18181B] tracking-tight">媒体カタログ</h1>
            <p className="text-[13px] text-[#A1A1AA] mt-0.5">媒体の獲得キーワード・流入経路を確認</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 検索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA]" />
              <input
                type="text"
                placeholder="媒体を検索..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
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
      <div className="flex">
        {/* メインテーブル */}
        <div className={`flex-1 p-6 ${selectedMedia ? 'pr-0' : ''}`}>
          <div className="bg-white border border-[#E4E4E7] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E4E4E7]">
                  <th className="text-left px-4 py-3 text-[12px] font-medium text-[#A1A1AA] uppercase tracking-wider">媒体名</th>
                  <th className="text-left px-4 py-3 text-[12px] font-medium text-[#A1A1AA] uppercase tracking-wider">ドメイン</th>
                  <th className="text-right px-4 py-3 text-[12px] font-medium text-[#A1A1AA] uppercase tracking-wider">月間トラフィック</th>
                  <th className="text-right px-4 py-3 text-[12px] font-medium text-[#A1A1AA] uppercase tracking-wider">変化</th>
                  <th className="text-center px-4 py-3 text-[12px] font-medium text-[#A1A1AA] uppercase tracking-wider">流入構成</th>
                </tr>
              </thead>
              <tbody>
                {sampleMedia.map((media) => (
                  <tr
                    key={media.id}
                    onClick={() => handleMediaClick(media)}
                    className={`border-b border-[#F4F4F5] hover:bg-[#F4F4F5] cursor-pointer transition-colors ${
                      selectedMedia?.id === media.id ? 'bg-[#F0FDFA]' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="text-[14px] font-medium text-[#18181B]">{media.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] text-[#A1A1AA]">{media.domain}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-[14px] font-medium text-[#18181B]">{media.monthlyTraffic}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`text-[13px] flex items-center justify-end gap-1 ${
                        media.trafficChange > 0 ? 'text-[#10B981]' :
                        media.trafficChange < 0 ? 'text-[#EF4444]' :
                        'text-[#A1A1AA]'
                      }`}>
                        {media.trafficChange > 0 ? <TrendingUp className="h-3.5 w-3.5" /> :
                         media.trafficChange < 0 ? <TrendingDown className="h-3.5 w-3.5" /> :
                         <Minus className="h-3.5 w-3.5" />}
                        {media.trafficChange > 0 ? '+' : ''}{media.trafficChange}%
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {/* ミニスタックバー */}
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-24 h-1.5 bg-[#F4F4F5] rounded-full flex overflow-hidden">
                          <div className="bg-[#0D9488]" style={{ width: `${media.organic}%` }} />
                          <div className="bg-[#F59E0B]" style={{ width: `${media.paid}%` }} />
                          <div className="bg-[#A1A1AA]" style={{ width: `${media.direct}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* サイドパネル */}
        {selectedMedia && (
          <div className="w-[400px] border-l border-[#E4E4E7] bg-white h-[calc(100vh-120px)] overflow-y-auto sticky top-[73px]">
            {/* パネルヘッダー */}
            <div className="px-5 py-4 border-b border-[#E4E4E7] flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="text-[15px] font-semibold text-[#18181B]">{selectedMedia.name}</div>
                <div className="text-[12px] text-[#A1A1AA] flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {selectedMedia.domain}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-[#F4F4F5] rounded-md transition-colors">
                  <ExternalLink className="h-4 w-4 text-[#A1A1AA]" />
                </button>
                <button onClick={closePanel} className="p-1.5 hover:bg-[#F4F4F5] rounded-md transition-colors">
                  <X className="h-4 w-4 text-[#A1A1AA]" />
                </button>
              </div>
            </div>

            {/* 概要 */}
            <div className="px-5 py-4 border-b border-[#E4E4E7]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA] mb-1">
                    <Users className="h-3.5 w-3.5" />
                    月間トラフィック
                  </div>
                  <div className="text-[18px] font-bold text-[#18181B]">{selectedMedia.monthlyTraffic}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA] mb-1">
                    <BarChart2 className="h-3.5 w-3.5" />
                    先月比
                  </div>
                  <div className={`text-[18px] font-bold flex items-center gap-1 ${
                    selectedMedia.trafficChange > 0 ? 'text-[#10B981]' :
                    selectedMedia.trafficChange < 0 ? 'text-[#EF4444]' :
                    'text-[#A1A1AA]'
                  }`}>
                    {selectedMedia.trafficChange > 0 ? '+' : ''}{selectedMedia.trafficChange}%
                  </div>
                </div>
              </div>

              {/* 流入経路 */}
              <div className="mt-4">
                <div className="text-[11px] text-[#A1A1AA] mb-2">流入経路の内訳</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                      <span className="text-[12px] text-[#52525B]">オーガニック検索</span>
                    </div>
                    <span className="text-[12px] font-medium text-[#18181B]">{selectedMedia.organic}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      <span className="text-[12px] text-[#52525B]">有料広告</span>
                    </div>
                    <span className="text-[12px] font-medium text-[#18181B]">{selectedMedia.paid}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#A1A1AA]" />
                      <span className="text-[12px] text-[#52525B]">ダイレクト</span>
                    </div>
                    <span className="text-[12px] font-medium text-[#18181B]">{selectedMedia.direct}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* キーワード一覧 */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-[#18181B]">獲得キーワード</span>
                <button className="text-[12px] text-[#0D9488] hover:underline flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </button>
              </div>

              {/* 意図フィルター */}
              <div className="flex gap-1 mb-3">
                {['all', 'A', 'B', 'C'].map((intent) => (
                  <button
                    key={intent}
                    onClick={() => setIntentFilter(intent)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      intentFilter === intent
                        ? 'bg-[#0D9488] text-white'
                        : 'bg-[#F4F4F5] text-[#52525B] hover:bg-[#E4E4E7]'
                    }`}
                  >
                    {intent === 'all' ? 'すべて' : `意図${intent}`}
                  </button>
                ))}
              </div>

              {/* キーワードテーブル */}
              <div className="space-y-1">
                {filteredKeywords.map((kw, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-[#F4F4F5] last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-[#18181B] truncate">{kw.keyword}</div>
                      <div className="text-[11px] text-[#A1A1AA]">Vol: {kw.volume}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        kw.intent === 'A' ? 'bg-[#D1FAE5] text-[#059669]' :
                        kw.intent === 'B' ? 'bg-[#FEF3C7] text-[#D97706]' :
                        'bg-[#F4F4F5] text-[#A1A1AA]'
                      }`}>
                        {kw.intent}
                      </span>
                      <div className="text-right">
                        <div className="text-[13px] font-medium text-[#18181B]">{kw.rank}位</div>
                        <div className="text-[10px] text-[#A1A1AA]">{kw.traffic}</div>
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
