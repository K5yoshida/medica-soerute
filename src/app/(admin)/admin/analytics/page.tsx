import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

async function getAnalyticsData() {
  const supabase = await createClient()

  // 過去30日間のデータを取得
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // 分析数の推移
  const { data: analysisData } = await supabase
    .from('analysis_results')
    .select('created_at, status')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // PESO診断数
  const { data: pesoData } = await supabase
    .from('peso_diagnoses')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // ユーザー登録数の推移
  const { data: userData } = await supabase
    .from('users')
    .select('created_at, plan')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // 日別集計
  const dailyAnalysis: Record<string, number> = {}
  const dailyPeso: Record<string, number> = {}
  const dailyUsers: Record<string, number> = {}

  analysisData?.forEach((item: { created_at: string; status: string }) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    dailyAnalysis[date] = (dailyAnalysis[date] || 0) + 1
  })

  pesoData?.forEach((item: { created_at: string }) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    dailyPeso[date] = (dailyPeso[date] || 0) + 1
  })

  userData?.forEach((item: { created_at: string; plan: string }) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    dailyUsers[date] = (dailyUsers[date] || 0) + 1
  })

  // プラン別ユーザー数
  const planDistribution: Record<string, number> = {
    free: 0,
    light: 0,
    standard: 0,
    premium: 0,
  }

  const { data: allUsers } = await supabase.from('users').select('plan')
  allUsers?.forEach((user: { plan: string }) => {
    planDistribution[user.plan] = (planDistribution[user.plan] || 0) + 1
  })

  return {
    dailyAnalysis,
    dailyPeso,
    dailyUsers,
    planDistribution,
    totalAnalysis: analysisData?.length || 0,
    totalPeso: pesoData?.length || 0,
    totalNewUsers: userData?.length || 0,
  }
}

export default async function AdminAnalyticsPage() {
  const data = await getAnalyticsData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">分析レポート</h1>
        <p className="text-gray-600">過去30日間のシステム利用状況</p>
      </div>

      {/* サマリー */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">媒体分析実行数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalAnalysis}</div>
            <p className="text-xs text-gray-500">過去30日間</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">PESO診断実行数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalPeso}</div>
            <p className="text-xs text-gray-500">過去30日間</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">新規登録ユーザー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalNewUsers}</div>
            <p className="text-xs text-gray-500">過去30日間</p>
          </CardContent>
        </Card>
      </div>

      {/* プラン分布 */}
      <Card>
        <CardHeader>
          <CardTitle>プラン別ユーザー分布</CardTitle>
          <CardDescription>現在のユーザープラン構成</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(data.planDistribution).map(([plan, count]) => (
              <div key={plan} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-gray-500 capitalize">{plan}プラン</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 日別データ */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>日別分析実行数</CardTitle>
            <CardDescription>過去30日間の推移</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {Object.entries(data.dailyAnalysis)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([date, count]) => (
                  <div
                    key={date}
                    className="flex items-center justify-between border-b pb-2"
                  >
                    <span className="text-sm">{date}</span>
                    <span className="font-medium">{count}件</span>
                  </div>
                ))}
              {Object.keys(data.dailyAnalysis).length === 0 && (
                <p className="text-sm text-gray-500">データがありません</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>日別新規登録数</CardTitle>
            <CardDescription>過去30日間の推移</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {Object.entries(data.dailyUsers)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([date, count]) => (
                  <div
                    key={date}
                    className="flex items-center justify-between border-b pb-2"
                  >
                    <span className="text-sm">{date}</span>
                    <span className="font-medium">{count}人</span>
                  </div>
                ))}
              {Object.keys(data.dailyUsers).length === 0 && (
                <p className="text-sm text-gray-500">データがありません</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
