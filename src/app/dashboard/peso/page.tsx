'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, FileText, Folder, Download, Info, Eye, Shield, CheckCircle } from 'lucide-react'

type Step = 'input' | 'loading' | 'result'
type ViewMode = 'peso' | 'funnel' | 'conversion' | 'journey'

interface PESOScore {
  p: number
  e: number
  s: number
  o: number
  total: number
}

const pesoData = {
  p: { label: 'Paid', subtitle: '有料メディア', score: 78, examples: ['Indeed広告', 'Google広告', '求人媒体'] },
  e: { label: 'Earned', subtitle: '獲得メディア', score: 45, examples: ['口コミ', 'プレスリリース', 'メディア露出'] },
  s: { label: 'Shared', subtitle: '共有メディア', score: 32, examples: ['Twitter/X', 'Instagram', 'LINE'] },
  o: { label: 'Owned', subtitle: '自社メディア', score: 68, examples: ['採用サイト', 'ブログ', '採用LP'] },
}

const funnelStages = [
  { id: 1, title: '認知', sub: '求人の存在を知る', score: 72, status: 'good' },
  { id: 2, title: '興味・関心', sub: '詳細を見てもらう', score: 58, status: 'warning' },
  { id: 3, title: '比較・検討', sub: '他社と比べて選ぶ', score: 45, status: 'warning' },
  { id: 4, title: '応募', sub: '応募完了', score: 90, status: 'good' },
]

const conversionStages = [
  { id: 1, title: 'Impression（露出）', sub: '求職者の目に触れる施策', score: 68, status: 'good' },
  { id: 2, title: 'PV（流入）', sub: '詳細を見てもらう施策', score: 52, status: 'warning' },
  { id: 3, title: 'CV（応募）', sub: '応募を完了させる施策', score: 88, status: 'good' },
]

const journeySteps = [
  { id: 1, label: '検索', desc: 'Googleや求人サイトで検索' },
  { id: 2, label: '探索', desc: '求人情報を詳しく確認' },
  { id: 3, label: '保存', desc: '気になる求人を保存' },
  { id: 4, label: '評価', desc: '口コミやSNSで評判確認' },
  { id: 5, label: '応募', desc: '応募フォームから送信' },
]

export default function PESOPage() {
  const [step, setStep] = useState<Step>('input')
  const [inputMode, setInputMode] = useState<'url' | 'survey'>('url')
  const [url, setUrl] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('peso')

  const handleAnalyze = async () => {
    setStep('loading')
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setStep('result')
  }

  const handleReset = () => {
    setStep('input')
    setUrl('')
  }

  const scores: PESOScore = {
    p: pesoData.p.score,
    e: pesoData.e.score,
    s: pesoData.s.score,
    o: pesoData.o.score,
    total: Math.round((pesoData.p.score + pesoData.e.score + pesoData.s.score + pesoData.o.score) / 4),
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
              新規診断
            </button>
            <h1 className="text-[15px] font-semibold text-[#18181B] tracking-tight">PESO診断レポート</h1>
            <p className="text-[13px] text-[#A1A1AA] mt-0.5">株式会社ケアサポート ・ 2024/12/03</p>
          </>
        ) : (
          <>
            <h1 className="text-[15px] font-semibold text-[#18181B] tracking-tight">PESO診断</h1>
            <p className="text-[13px] text-[#A1A1AA] mt-0.5">採用メディア戦略の現状を可視化</p>
          </>
        )}
      </header>

      {/* コンテンツ */}
      <div className="p-6">
        {/* 入力画面 */}
        {step === 'input' && (
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-6">
              <div className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">診断方法を選択</div>
              <h2 className="text-[18px] font-semibold text-[#18181B] mb-2">採用サイトを診断</h2>
              <p className="text-[13px] text-[#A1A1AA]">URLを入力するか、アンケートに回答して診断を開始</p>
            </div>

            {/* タブ切り替え */}
            <div className="bg-white border border-[#E4E4E7] rounded-lg overflow-hidden">
              <div className="flex border-b border-[#F4F4F5]">
                <button
                  onClick={() => setInputMode('url')}
                  className={`flex-1 px-4 py-3 text-[13px] font-medium relative ${
                    inputMode === 'url' ? 'text-[#18181B] bg-white' : 'text-[#A1A1AA] bg-[#F4F4F5]'
                  }`}
                >
                  URL分析
                  {inputMode === 'url' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D9488]" />
                  )}
                </button>
                <button
                  onClick={() => setInputMode('survey')}
                  className={`flex-1 px-4 py-3 text-[13px] font-medium relative border-l border-[#F4F4F5] ${
                    inputMode === 'survey' ? 'text-[#18181B] bg-white' : 'text-[#A1A1AA] bg-[#F4F4F5]'
                  }`}
                >
                  アンケート
                  {inputMode === 'survey' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D9488]" />
                  )}
                </button>
              </div>

              <div className="p-5">
                {inputMode === 'url' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="url"
                        placeholder="https://example.com/recruit"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="flex-1 px-3 py-2 border border-[#E4E4E7] rounded-md text-[14px] focus:outline-none focus:border-[#A1A1AA] transition-colors"
                      />
                      <button
                        onClick={handleAnalyze}
                        className="w-9 h-9 bg-[#0D9488] rounded-md flex items-center justify-center hover:bg-[#0F766E] transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 text-white" />
                      </button>
                    </div>
                    <p className="text-[12px] text-[#A1A1AA]">
                      採用サイトのURLを入力すると、AIが自動でPESO分析を行います
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[13px] text-[#52525B]">
                      以下のアンケートに回答して、採用活動の現状を診断します。
                    </p>
                    <button
                      onClick={handleAnalyze}
                      className="w-full px-4 py-2.5 bg-[#0D9488] text-white rounded-md text-[13px] font-medium hover:bg-[#0F766E] transition-colors flex items-center justify-center gap-2"
                    >
                      アンケートを開始
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ローディング */}
        {step === 'loading' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white border border-[#E4E4E7] rounded-lg py-12 text-center">
              <Loader2 className="h-12 w-12 text-[#0D9488] animate-spin mx-auto mb-4" />
              <div className="text-[16px] font-semibold text-[#18181B] mb-2">診断中...</div>
              <p className="text-[13px] text-[#A1A1AA]">採用サイトをPESO分析しています</p>
            </div>
          </div>
        )}

        {/* 結果画面 */}
        {step === 'result' && (
          <div className="max-w-5xl mx-auto">
            {/* スコアサマリー */}
            <div className="bg-white border border-[#E4E4E7] rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[11px] text-[#A1A1AA] uppercase tracking-wider mb-1">Total Score</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[48px] font-bold text-[#18181B]">{scores.total}</span>
                    <span className="text-[18px] text-[#A1A1AA]">/ 100</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 border border-[#E4E4E7] rounded-md text-[13px] text-[#52525B] hover:bg-[#F4F4F5] transition-colors flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    保存
                  </button>
                  <button className="px-3 py-1.5 border border-[#E4E4E7] rounded-md text-[13px] text-[#52525B] hover:bg-[#F4F4F5] transition-colors flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    PDF出力
                  </button>
                </div>
              </div>

              {/* 個別スコア */}
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(pesoData).map(([key, data]) => (
                  <div key={key} className="text-center">
                    <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-[14px] font-bold mb-2 ${
                      key === 'p' ? 'bg-blue-100 text-blue-700' :
                      key === 'e' ? 'bg-amber-100 text-amber-700' :
                      key === 's' ? 'bg-pink-100 text-pink-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {key.toUpperCase()}
                    </div>
                    <div className="text-[20px] font-bold text-[#18181B]">{data.score}</div>
                    <div className="text-[11px] text-[#A1A1AA]">{data.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 切り口タブ */}
            <div className="flex gap-1 mb-6 bg-[#F4F4F5] p-1 rounded-lg">
              {[
                { id: 'peso', label: 'PESO切り口' },
                { id: 'funnel', label: 'ファネル切り口' },
                { id: 'conversion', label: 'Imp→PV→CV' },
                { id: 'journey', label: '求職者の動き' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as ViewMode)}
                  className={`flex-1 px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${
                    viewMode === tab.id
                      ? 'bg-white text-[#18181B] shadow-sm'
                      : 'text-[#A1A1AA] hover:text-[#52525B]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* PESO切り口 */}
            {viewMode === 'peso' && (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(pesoData).map(([key, data]) => (
                  <div
                    key={key}
                    className={`bg-white border rounded-lg p-5 ${
                      key === 'p' ? 'border-l-4 border-l-blue-500' :
                      key === 'e' ? 'border-l-4 border-l-amber-500' :
                      key === 's' ? 'border-l-4 border-l-pink-500' :
                      'border-l-4 border-l-green-500'
                    } border-[#E4E4E7]`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[12px] font-bold ${
                        key === 'p' ? 'bg-blue-100 text-blue-700' :
                        key === 'e' ? 'bg-amber-100 text-amber-700' :
                        key === 's' ? 'bg-pink-100 text-pink-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {key.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-[#18181B]">{data.label}</div>
                        <div className="text-[12px] text-[#A1A1AA]">{data.subtitle}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {data.examples.map((example, i) => (
                        <div key={i} className="text-[12px] text-[#52525B] flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            key === 'p' ? 'bg-blue-500' :
                            key === 'e' ? 'bg-amber-500' :
                            key === 's' ? 'bg-pink-500' :
                            'bg-green-500'
                          }`} />
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ファネル切り口 */}
            {viewMode === 'funnel' && (
              <div className="space-y-4">
                {funnelStages.map((stage) => (
                  <div key={stage.id} className="bg-white border border-[#E4E4E7] rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        stage.id === 1 ? 'bg-blue-100' :
                        stage.id === 2 ? 'bg-purple-100' :
                        stage.id === 3 ? 'bg-orange-100' :
                        'bg-green-100'
                      }`}>
                        {stage.id === 1 ? <Info className="h-5 w-5 text-blue-600" /> :
                         stage.id === 2 ? <Eye className="h-5 w-5 text-purple-600" /> :
                         stage.id === 3 ? <Shield className="h-5 w-5 text-orange-600" /> :
                         <CheckCircle className="h-5 w-5 text-green-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-[14px] font-semibold text-[#18181B]">{stage.title}</div>
                        <div className="text-[12px] text-[#A1A1AA]">{stage.sub}</div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[20px] font-bold ${
                          stage.status === 'good' ? 'text-[#18181B]' : 'text-[#F59E0B]'
                        }`}>
                          {stage.score}
                        </span>
                        <span className="text-[13px] text-[#A1A1AA]"> / 100</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* コンバージョン切り口 */}
            {viewMode === 'conversion' && (
              <div className="space-y-4">
                {conversionStages.map((stage, index) => (
                  <div key={stage.id}>
                    <div className="bg-white border border-[#E4E4E7] rounded-lg p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#F4F4F5] rounded-full flex items-center justify-center text-[14px] font-bold text-[#52525B]">
                          {stage.id}
                        </div>
                        <div className="flex-1">
                          <div className="text-[14px] font-semibold text-[#18181B]">{stage.title}</div>
                          <div className="text-[12px] text-[#A1A1AA]">{stage.sub}</div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[20px] font-bold ${
                            stage.status === 'good' ? 'text-[#18181B]' : 'text-[#F59E0B]'
                          }`}>
                            {stage.score}
                          </span>
                          <span className="text-[13px] text-[#A1A1AA]"> / 100</span>
                        </div>
                      </div>
                    </div>
                    {index < conversionStages.length - 1 && (
                      <div className="flex justify-center py-2">
                        <svg className="w-6 h-6 text-[#A1A1AA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M19 12l-7 7-7-7" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 求職者ジャーニー */}
            {viewMode === 'journey' && (
              <div className="bg-white border border-[#E4E4E7] rounded-lg p-6">
                <div className="flex items-center justify-between">
                  {journeySteps.map((s, index) => (
                    <div key={s.id} className="flex items-center">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-[#F4F4F5] rounded-lg flex items-center justify-center mb-2 cursor-pointer hover:bg-[#E4E4E7] transition-colors">
                          <span className="text-[14px] font-bold text-[#52525B]">0{s.id}</span>
                        </div>
                        <div className="text-[13px] font-medium text-[#18181B]">{s.label}</div>
                      </div>
                      {index < journeySteps.length - 1 && (
                        <div className="mx-4">
                          <svg className="w-5 h-5 text-[#A1A1AA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 text-[12px] text-[#A1A1AA]">
                  {journeySteps.map((s) => (
                    <div key={s.id} className="text-center w-20">
                      {s.desc}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 新規診断ボタン */}
            <div className="text-center mt-8">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-[#0D9488] text-white rounded-md text-[13px] font-medium hover:bg-[#0F766E] transition-colors inline-flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                新規診断を開始
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
