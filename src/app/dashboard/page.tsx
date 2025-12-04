import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Target, BarChart3, ArrowRight, Clock } from 'lucide-react'

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

  // 最近の履歴を取得（実際のテーブルができたら有効化）
  // const { data: recentHistory } = await supabase
  //   .from('analysis_history')
  //   .select('*')
  //   .eq('user_id', authUser?.id)
  //   .order('created_at', { ascending: false })
  //   .limit(3)

  const displayName = user?.company_name || user?.email?.split('@')[0] || 'ユーザー'

  const quickActions = [
    {
      title: '媒体カタログを見る',
      description: '登録されている媒体情報を確認',
      href: '/dashboard/catalog',
      icon: BookOpen,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: '媒体マッチングを始める',
      description: '求人条件から最適な媒体を分析',
      href: '/dashboard/matching',
      icon: Target,
      color: 'bg-teal-50 text-teal-600',
    },
    {
      title: 'PESO診断を始める',
      description: '採用活動のPESO分析',
      href: '/dashboard/peso',
      icon: BarChart3,
      color: 'bg-amber-50 text-amber-600',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ウェルカムメッセージ */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          こんにちは、{displayName}さん
        </h1>
        <p className="text-muted-foreground mt-1">
          採用媒体の分析・診断を始めましょう
        </p>
      </div>

      {/* クイックアクセス */}
      <div>
        <h2 className="text-lg font-semibold mb-4">クイックアクセス</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-2`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{action.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{action.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* 利用状況サマリー */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              媒体マッチング
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{user?.monthly_analysis_count || 0}</span>
              <span className="text-muted-foreground">
                / {user?.monthly_analysis_limit === -1 ? '無制限' : user?.monthly_analysis_limit || 3}回
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">今月の使用回数</p>
            <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width:
                    user?.monthly_analysis_limit === -1
                      ? '0%'
                      : `${Math.min(
                          ((user?.monthly_analysis_count || 0) /
                            (user?.monthly_analysis_limit || 3)) *
                            100,
                          100
                        )}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              PESO診断
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">0</span>
              <span className="text-muted-foreground">/ 無制限</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">今月の診断回数</p>
            <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '0%' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近の履歴 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">最近の履歴</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/history" className="flex items-center gap-1">
              すべて見る
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>まだ履歴がありません</p>
              <p className="text-sm mt-1">媒体マッチングやPESO診断を実行すると、ここに履歴が表示されます</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
