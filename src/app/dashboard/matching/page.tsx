'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check, Loader2, Star, Folder, Download } from 'lucide-react'

type Step = 'input' | 'query' | 'loading' | 'result'

interface MatchResult {
  rank: number
  mediaName: string
  score: number
  searchShare: string
  monthlyTraffic: string
  color: string
}

const sampleResults: MatchResult[] = [
  { rank: 1, mediaName: 'Indeed', score: 85.2, searchShare: '32%', monthlyTraffic: '12,400', color: '#2557a7' },
  { rank: 2, mediaName: 'ジョブメドレー', score: 72.8, searchShare: '24%', monthlyTraffic: '8,200', color: '#00a98f' },
  { rank: 3, mediaName: 'カイゴジョブ', score: 64.1, searchShare: '18%', monthlyTraffic: '5,600', color: '#e85298' },
  { rank: 4, mediaName: 'マイナビ介護', score: 52.3, searchShare: '14%', monthlyTraffic: '4,100', color: '#ff6b35' },
  { rank: 5, mediaName: 'e介護転職', score: 41.6, searchShare: '8%', monthlyTraffic: '2,300', color: '#4a90a4' },
]

const suggestedQueries = [
  { text: '川崎市 訪問介護 求人', selected: true },
  { text: '麻生区 介護 正社員', selected: true },
  { text: '訪問介護 ヘルパー 募集', selected: true },
  { text: '川崎 介護職 転職', selected: true },
  { text: '神奈川 訪問介護 未経験', selected: false },
  { text: '介護福祉士 訪問 求人', selected: false },
]

export default function MatchingPage() {
  const [step, setStep] = useState<Step>('input')
  const [formData, setFormData] = useState({
    address: '',
    occupation: '',
    employment: '',
  })
  const [queries, setQueries] = useState(suggestedQueries)

  const selectedCount = queries.filter((q) => q.selected).length

  const handleNext = () => {
    if (step === 'input') {
      setStep('query')
    }
  }

  const handleAnalyze = async () => {
    setStep('loading')
    // 分析シミュレート
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setStep('result')
  }

  const toggleQuery = (index: number) => {
    setQueries((prev) =>
      prev.map((q, i) => (i === index ? { ...q, selected: !q.selected } : q))
    )
  }

  const goBackToInput = () => {
    setStep('input')
  }

  const handleReset = () => {
    setStep('input')
    setFormData({ address: '', occupation: '', employment: '' })
    setQueries(suggestedQueries)
  }

  return (
    <>
      {/* ヘッダー */}
      <header className="bg-white border-b border-[#E4E4E7] px-6 py-4 sticky top-0 z-40">
        {step === 'result' ? (
          <>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[13px] text-[#A1A1AA] hover:text-[#18181B] transition-colors mb-1"
            >
              <ChevronLeft className="h-4 w-4" />
              新規分析
            </button>
            <h1 className="text-[15px] font-semibold text-[#18181B] tracking-tight">媒体マッチング結果</h1>
            <p className="text-[13px] text-[#A1A1AA] mt-0.5">
              {formData.address || '川崎市麻生区'} × {formData.occupation || '訪問介護'} × {formData.employment || '正社員'}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[15px] font-semibold text-[#18181B] tracking-tight">媒体マッチング</h1>
            <p className="text-[13px] text-[#A1A1AA] mt-0.5">求人に最適な媒体をAIが提案</p>
          </>
        )}
      </header>

      {/* コンテンツエリア */}
      <div className="p-6">
        <div className="max-w-xl mx-auto">
          {/* プログレスインジケーター */}
          {step !== 'result' && step !== 'loading' && (
            <div className="flex justify-center gap-2 mb-8">
              <div className={`w-1.5 h-1.5 rounded-full transition-all ${step === 'input' ? 'bg-[#0D9488] scale-125' : 'bg-[#0D9488]'}`} />
              <div className={`w-1.5 h-1.5 rounded-full transition-all ${step === 'query' ? 'bg-[#0D9488] scale-125' : 'bg-[#E4E4E7]'}`} />
            </div>
          )}

          {/* Step 1 サマリー（折りたたみ） */}
          {step === 'query' && (
            <button
              onClick={goBackToInput}
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg p-3 mb-5 flex items-center gap-3 hover:border-[#A1A1AA] transition-colors"
            >
              <div className="w-5 h-5 bg-[#0D9488] rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-[11px] text-[#A1A1AA]">分析条件</div>
                <div className="text-[13px] font-medium text-[#18181B] truncate">
                  {formData.address || '川崎市麻生区'} ・ {formData.occupation || '訪問介護'} ・ {formData.employment || '正社員'}
                </div>
              </div>
              <span className="text-[12px] text-[#A1A1AA] flex-shrink-0">変更</span>
            </button>
          )}

          {/* Step 1: 条件入力 */}
          {step === 'input' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center mb-6">
                <div className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">Step 1</div>
                <h2 className="text-[18px] font-semibold text-[#18181B] mb-2">分析条件を入力</h2>
                <p className="text-[13px] text-[#A1A1AA]">求人の基本情報を入力してください</p>
              </div>

              <div className="bg-white border border-[#E4E4E7] rounded-lg p-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#52525B] mb-1">事業所住所</label>
                    <input
                      type="text"
                      placeholder="例：神奈川県川崎市麻生区"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E4E4E7] rounded-md text-[13px] focus:outline-none focus:border-[#A1A1AA] transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#52525B] mb-1">募集職種</label>
                      <select
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E4E4E7] rounded-md text-[13px] focus:outline-none focus:border-[#A1A1AA] transition-colors bg-white"
                      >
                        <option value="">選択してください</option>
                        <option value="訪問介護">訪問介護</option>
                        <option value="訪問看護">訪問看護</option>
                        <option value="施設介護">施設介護</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#52525B] mb-1">雇用形態</label>
                      <select
                        value={formData.employment}
                        onChange={(e) => setFormData({ ...formData, employment: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E4E4E7] rounded-md text-[13px] focus:outline-none focus:border-[#A1A1AA] transition-colors bg-white"
                      >
                        <option value="">選択してください</option>
                        <option value="正社員">正社員</option>
                        <option value="パート・アルバイト">パート・アルバイト</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleNext}
                    className="w-full mt-2 px-4 py-2.5 bg-[#0D9488] text-white rounded-md text-[13px] font-medium hover:bg-[#0F766E] transition-colors flex items-center justify-center gap-2"
                  >
                    次へ進む
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: クエリ選択 */}
          {step === 'query' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center mb-6">
                <div className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">Step 2</div>
                <h2 className="text-[18px] font-semibold text-[#18181B] mb-2">検索クエリを選択</h2>
                <p className="text-[13px] text-[#A1A1AA]">求職者が検索しそうなキーワードを選択してください</p>
              </div>

              <div className="bg-white border border-[#E4E4E7] rounded-lg p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-[rgba(16,185,129,0.1)] text-[#059669] rounded">AI推定</span>
                  <span className="text-[13px] text-[#52525B]">川崎市で訪問介護の正社員を探す30-40代</span>
                </div>
                <p className="text-[12px] text-[#A1A1AA] mb-5">
                  推定ペルソナに基づいて、検索される可能性の高いクエリを提案しています
                </p>

                <div className="flex flex-wrap gap-2 mb-5">
                  {queries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => toggleQuery(index)}
                      className={`px-4 py-2 border rounded-full text-[13px] font-medium transition-all ${
                        query.selected
                          ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]'
                          : 'border-[#E4E4E7] bg-white text-[#52525B] hover:border-[#A1A1AA]'
                      }`}
                    >
                      {query.text}
                    </button>
                  ))}
                  <button className="px-4 py-2 border border-dashed border-[#E4E4E7] rounded-full text-[13px] text-[#A1A1AA] hover:border-[#A1A1AA] transition-colors">
                    + カスタム追加
                  </button>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#F4F4F5]">
                  <span className="text-[14px] text-[#A1A1AA]">{selectedCount}件選択中</span>
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={selectedCount === 0}
                className="w-full mt-4 px-4 py-2.5 bg-[#0D9488] text-white rounded-md text-[13px] font-medium hover:bg-[#0F766E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                媒体を分析する
                <Star className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ローディング */}
          {step === 'loading' && (
            <div className="bg-white border border-[#E4E4E7] rounded-lg py-12 text-center">
              <Loader2 className="h-12 w-12 text-[#0D9488] animate-spin mx-auto mb-4" />
              <div className="text-[16px] font-semibold text-[#18181B] mb-2">媒体データを分析中...</div>
              <p className="text-[13px] text-[#A1A1AA]">検索クエリごとのランキングを取得しています</p>
            </div>
          )}
        </div>

        {/* 結果表示 */}
        {step === 'result' && (
          <div className="max-w-3xl mx-auto">
            {/* ヒーローエリア */}
            <div className="text-center mb-8">
              <span className="inline-block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
                Analysis Complete
              </span>
              <h2 className="text-[22px] font-bold text-[#18181B] mb-2">おすすめ媒体ランキング</h2>
              <p className="text-[13px] text-[#A1A1AA]">選択した検索クエリに基づく最適な媒体を分析しました</p>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end gap-2 mb-4">
              <button className="px-3 py-1.5 border border-[#E4E4E7] rounded-md text-[13px] text-[#52525B] hover:bg-[#F4F4F5] transition-colors flex items-center gap-2">
                <Folder className="h-4 w-4" />
                保存
              </button>
              <button className="px-3 py-1.5 border border-[#E4E4E7] rounded-md text-[13px] text-[#52525B] hover:bg-[#F4F4F5] transition-colors flex items-center gap-2">
                <Download className="h-4 w-4" />
                エクスポート
              </button>
            </div>

            {/* ランキングカード */}
            <div className="space-y-3 mb-8">
              {sampleResults.map((result) => (
                <div
                  key={result.rank}
                  className={`bg-white border rounded-lg p-4 flex items-center gap-4 ${
                    result.rank === 1 ? 'border-[#0D9488]' : 'border-[#E4E4E7]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] ${
                      result.rank === 1
                        ? 'bg-[#0D9488] text-white'
                        : result.rank === 2
                        ? 'bg-[#FEF3C7] text-[#D97706]'
                        : result.rank === 3
                        ? 'bg-[#FFEDD5] text-[#EA580C]'
                        : 'bg-[#F4F4F5] text-[#A1A1AA]'
                    }`}
                  >
                    {result.rank}
                  </div>
                  <div className="flex-1">
                    <div className="text-[16px] font-semibold" style={{ color: result.color }}>
                      {result.mediaName}
                    </div>
                    <div className="text-[12px] text-[#A1A1AA]">
                      検索シェア{result.searchShare} ・ 推定月間トラフィック {result.monthlyTraffic}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[18px] font-bold text-[#18181B]">{result.score}%</div>
                    <div className="text-[11px] text-[#A1A1AA]">適合率</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 分析条件サマリー */}
            <div className="bg-[#F4F4F5] rounded-lg p-5 mb-6">
              <div className="text-[13px] font-semibold text-[#18181B] mb-4">分析条件</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[11px] text-[#A1A1AA] mb-1">事業所住所</div>
                  <div className="text-[13px] text-[#18181B]">{formData.address || '神奈川県川崎市麻生区'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#A1A1AA] mb-1">募集職種</div>
                  <div className="text-[13px] text-[#18181B]">{formData.occupation || '訪問介護'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#A1A1AA] mb-1">雇用形態</div>
                  <div className="text-[13px] text-[#18181B]">{formData.employment || '正社員'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#A1A1AA] mb-1">分析日時</div>
                  <div className="text-[13px] text-[#18181B]">{new Date().toLocaleString('ja-JP')}</div>
                </div>
              </div>
            </div>

            {/* 新規分析ボタン */}
            <div className="text-center">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-[#0D9488] text-white rounded-md text-[13px] font-medium hover:bg-[#0F766E] transition-colors inline-flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                新規分析を開始
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
