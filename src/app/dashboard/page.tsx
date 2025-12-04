import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Grid2X2, Star, FileText, ChevronRight, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser?.id)
    .single()

  // サンプルの最近の分析データ
  const recentAnalyses = [
    {
      id: '1',
      type: 'matching',
      title: '川崎市麻生区 × 訪問介護',
      time: '2時間前',
      result: { label: 'Best', value: 'Indeed' },
    },
    {
      id: '2',
      type: 'peso',
      title: '株式会社ケアサポート',
      time: '昨日',
      result: { label: 'Score', value: '68/100' },
    },
  ]

  return (
    <>
      {/* ヘッダー */}
      <header className="bg-white border-b border-[#E4E4E7] px-6 py-4 sticky top-0 z-40">
        <h1 className="text-[15px] font-semibold text-[#18181B] tracking-tight">ホーム</h1>
        <p className="text-[13px] text-[#A1A1AA] mt-0.5">分析を開始しましょう</p>
      </header>

      {/* コンテンツエリア */}
      <div className="p-6">
        {/* 統計カード */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-[#E4E4E7] rounded-lg p-5">
            <div className="text-[12px] text-[#A1A1AA] mb-1">今月の分析数</div>
            <div className="text-[28px] font-bold text-[#18181B]">{user?.monthly_analysis_count || 0}</div>
            <div className="text-[12px] text-[#0D9488] mt-1">+23% vs 先月</div>
          </div>
          <div className="bg-white border border-[#E4E4E7] rounded-lg p-5">
            <div className="text-[12px] text-[#A1A1AA] mb-1">保存済み成果物</div>
            <div className="text-[28px] font-bold text-[#18181B]">0</div>
          </div>
          <div className="bg-white border border-[#E4E4E7] rounded-lg p-5">
            <div className="text-[12px] text-[#A1A1AA] mb-1">フォルダ数</div>
            <div className="text-[28px] font-bold text-[#18181B]">0</div>
          </div>
          <div className="bg-white border border-[#E4E4E7] rounded-lg p-5">
            <div className="text-[12px] text-[#A1A1AA] mb-1">登録媒体数</div>
            <div className="text-[28px] font-bold text-[#18181B]">15</div>
          </div>
        </div>

        {/* 分析を始める */}
        <div className="bg-white border border-[#E4E4E7] rounded-lg mb-6">
          <div className="px-5 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#18181B]">分析を始める</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4">
              {/* 媒体カタログ */}
              <Link
                href="/dashboard/catalog"
                className="group relative bg-white border border-[#E4E4E7] rounded-lg p-5 hover:border-[#0D9488] hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#F0FDFA] rounded-md flex items-center justify-center">
                    <Grid2X2 className="h-4 w-4 text-[#0D9488]" />
                  </div>
                  <span className="text-[13px] font-semibold text-[#18181B]">媒体カタログ</span>
                </div>
                <p className="text-[12px] text-[#A1A1AA] leading-relaxed">
                  媒体の獲得キーワード・流入経路を確認
                </p>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA] group-hover:text-[#0D9488] transition-colors" />
              </Link>

              {/* 媒体マッチング */}
              <Link
                href="/dashboard/matching"
                className="group relative bg-white border border-[#E4E4E7] rounded-lg p-5 hover:border-[#F59E0B] hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[rgba(245,158,11,0.1)] rounded-md flex items-center justify-center">
                    <Star className="h-4 w-4 text-[#D97706]" />
                  </div>
                  <span className="text-[13px] font-semibold text-[#18181B]">媒体マッチング</span>
                </div>
                <p className="text-[12px] text-[#A1A1AA] leading-relaxed">
                  求人に最適な媒体をAIが提案
                </p>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA] group-hover:text-[#F59E0B] transition-colors" />
              </Link>

              {/* PESO診断 */}
              <Link
                href="/dashboard/peso"
                className="group relative bg-white border border-[#E4E4E7] rounded-lg p-5 hover:border-[#8B5CF6] hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[rgba(139,92,246,0.1)] rounded-md flex items-center justify-center">
                    <FileText className="h-4 w-4 text-[#7C3AED]" />
                  </div>
                  <span className="text-[13px] font-semibold text-[#18181B]">PESO診断</span>
                </div>
                <p className="text-[12px] text-[#A1A1AA] leading-relaxed">
                  採用メディア戦略の現状を可視化
                </p>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA] group-hover:text-[#8B5CF6] transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* 最近の分析 */}
        <div className="bg-white border border-[#E4E4E7] rounded-lg">
          <div className="px-5 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#18181B]">最近の分析</span>
            <Link href="/dashboard/history" className="text-[13px] text-[#0D9488] hover:underline">
              すべて見る
            </Link>
          </div>
          <div className="p-5">
            {recentAnalyses.length > 0 ? (
              <div className="space-y-2">
                {recentAnalyses.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/history/${item.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#F4F4F5] transition-colors cursor-pointer"
                  >
                    {/* アイコン */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        item.type === 'matching'
                          ? 'bg-[rgba(245,158,11,0.1)]'
                          : 'bg-[rgba(139,92,246,0.1)]'
                      }`}
                    >
                      {item.type === 'matching' ? (
                        <Star className="h-4 w-4 text-[#D97706]" />
                      ) : (
                        <FileText className="h-4 w-4 text-[#7C3AED]" />
                      )}
                    </div>

                    {/* コンテンツ */}
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-[#18181B]">{item.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                            item.type === 'matching'
                              ? 'bg-[rgba(245,158,11,0.1)] text-[#D97706]'
                              : 'bg-[rgba(139,92,246,0.1)] text-[#7C3AED]'
                          }`}
                        >
                          {item.type === 'matching' ? 'マッチング' : 'PESO'}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[#D4D4D8]" />
                        <span className="text-[12px] text-[#A1A1AA]">{item.time}</span>
                      </div>
                    </div>

                    {/* 結果 */}
                    <div className="text-right">
                      <div className="text-[11px] text-[#A1A1AA]">{item.result.label}</div>
                      <div className="text-[13px] font-semibold text-[#18181B]">{item.result.value}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[#A1A1AA]">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-[13px]">まだ履歴がありません</p>
                <p className="text-[12px] mt-1">
                  媒体マッチングやPESO診断を実行すると、ここに履歴が表示されます
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
