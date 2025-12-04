import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Users, FileSearch, BarChart3, CreditCard } from 'lucide-react'

async function getStats() {
  const supabase = await createClient()

  // ユーザー数
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  // 今月の分析数
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: analysisCount } = await supabase
    .from('analysis_results')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString())

  // 有料ユーザー数
  const { count: paidUserCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .neq('plan', 'free')

  // PESO診断数
  const { count: pesoCount } = await supabase
    .from('peso_diagnoses')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString())

  return {
    userCount: userCount || 0,
    analysisCount: analysisCount || 0,
    paidUserCount: paidUserCount || 0,
    pesoCount: pesoCount || 0,
  }
}

interface RecentUser {
  id: string
  email: string
  plan: string
  created_at: string
}

interface RecentAnalysis {
  id: string
  user_id: string
  status: string
  created_at: string
}

async function getRecentActivity(): Promise<{
  recentUsers: RecentUser[]
  recentAnalysis: RecentAnalysis[]
}> {
  const supabase = await createClient()

  const { data: recentUsers } = await supabase
    .from('users')
    .select('id, email, plan, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentAnalysis } = await supabase
    .from('analysis_results')
    .select('id, user_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    recentUsers: (recentUsers as RecentUser[]) || [],
    recentAnalysis: (recentAnalysis as RecentAnalysis[]) || [],
  }
}

export default async function AdminDashboard() {
  const stats = await getStats()
  const { recentUsers, recentAnalysis } = await getRecentActivity()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理ダッシュボード</h1>
        <p className="text-gray-600">システム全体の状況を確認できます</p>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userCount}</div>
            <p className="text-xs text-gray-500">登録ユーザー</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">有料ユーザー</CardTitle>
            <CreditCard className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paidUserCount}</div>
            <p className="text-xs text-gray-500">
              転換率:{' '}
              {stats.userCount > 0
                ? ((stats.paidUserCount / stats.userCount) * 100).toFixed(1)
                : 0}
              %
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今月の分析数</CardTitle>
            <FileSearch className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.analysisCount}</div>
            <p className="text-xs text-gray-500">媒体マッチング分析</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今月のPESO診断</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pesoCount}</div>
            <p className="text-xs text-gray-500">PESO分析実行数</p>
          </CardContent>
        </Card>
      </div>

      {/* 最近のアクティビティ */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近の登録ユーザー</CardTitle>
            <CardDescription>直近5件の新規登録</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      user.plan === 'free'
                        ? 'bg-gray-100'
                        : user.plan === 'premium'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {user.plan}
                  </span>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className="text-sm text-gray-500">データがありません</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近の分析</CardTitle>
            <CardDescription>直近5件の分析実行</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAnalysis.map((analysis) => (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      ID: {analysis.id.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(analysis.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      analysis.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : analysis.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {analysis.status}
                  </span>
                </div>
              ))}
              {recentAnalysis.length === 0 && (
                <p className="text-sm text-gray-500">データがありません</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
