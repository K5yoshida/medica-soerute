// ===========================================
// Admin Dashboard Stats API
// 管理ダッシュボード用KPI統計情報を取得
// GET /api/admin/stats
// 設計書: 13_APIエンドポイント一覧.md - 13.8 管理者API
// 画面: SC-901 管理ダッシュボード
// ===========================================

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ===== 型定義 =====

interface RecentLogin {
  id: string
  email: string
  loginAt: string
}

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  paidUsers: number
  mrr: number
  totalMedia: number
  totalKeywords: number
  userChange: number      // 先月比ユーザー増減
  paidUserChange: number  // 先月比有料ユーザー増減
  mrrChange: number       // 先月比MRR増減率（%）
  recentLogins: RecentLogin[]
}

interface StatsResponse {
  success: boolean
  data?: DashboardStats
  error?: {
    code?: string
    message: string
  }
}

// ===== メインハンドラー =====

export async function GET(): Promise<NextResponse<StatsResponse>> {
  try {
    // 1. 認証チェック
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      )
    }

    // 2. admin権限チェック
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } },
        { status: 403 }
      )
    }

    // 3. Service Clientでデータ取得
    const serviceClient = createServiceClient()

    // 日付計算
    const now = new Date()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // 3.1 総ユーザー数を取得
    const { count: totalUsers } = await serviceClient
      .from('users')
      .select('id', { count: 'exact', head: true })

    // 3.2 今週のアクティブユーザー数（system_logsからログインアクションを集計）
    let activeUsers = 0
    const { data: activeUserData } = await serviceClient
      .from('system_logs')
      .select('user_id')
      .eq('action', 'login')
      .gte('timestamp', oneWeekAgo.toISOString())

    if (activeUserData) {
      const uniqueUserIds = new Set(activeUserData.map((log: { user_id: string | null }) => log.user_id).filter(Boolean))
      activeUsers = uniqueUserIds.size
    }

    // 3.3 有料ユーザー数（plan != 'free'）
    const { count: paidUsers } = await serviceClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .neq('plan', 'free')

    // 3.4 先月の有料ユーザー数（先月末時点で作成された有料ユーザー）
    const { count: lastMonthPaidUsers } = await serviceClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .neq('plan', 'free')
      .lte('created_at', lastMonthEnd.toISOString())

    // 3.5 先月のユーザー数
    const { count: lastMonthUsers } = await serviceClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .lte('created_at', lastMonthEnd.toISOString())

    // 3.6 MRR計算（プラン別の月額料金）
    const planPrices: Record<string, number> = {
      free: 0,
      starter: 9800,
      professional: 29800,
      enterprise: 98000,
    }

    const { data: usersByPlan } = await serviceClient
      .from('users')
      .select('plan')

    let mrr = 0
    if (usersByPlan) {
      usersByPlan.forEach((u: { plan: string }) => {
        mrr += planPrices[u.plan] || 0
      })
    }

    // 先月のMRR
    const { data: lastMonthUsersByPlan } = await serviceClient
      .from('users')
      .select('plan')
      .lte('created_at', lastMonthEnd.toISOString())

    let lastMonthMrr = 0
    if (lastMonthUsersByPlan) {
      lastMonthUsersByPlan.forEach((u: { plan: string }) => {
        lastMonthMrr += planPrices[u.plan] || 0
      })
    }

    // 3.7 媒体数
    const { count: totalMedia } = await serviceClient
      .from('media_master')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    // 3.8 キーワード数
    const { count: totalKeywords } = await serviceClient
      .from('keywords')
      .select('id', { count: 'exact', head: true })

    // 3.9 最近のログイン（直近10件）
    const { data: loginLogs } = await serviceClient
      .from('system_logs')
      .select('user_id, timestamp')
      .eq('action', 'login')
      .order('timestamp', { ascending: false })
      .limit(10)

    // ユーザー情報を取得
    const recentLogins: RecentLogin[] = []
    if (loginLogs && loginLogs.length > 0) {
      const userIds = Array.from(new Set(loginLogs.map((log: { user_id: string | null }) => log.user_id).filter(Boolean))) as string[]

      if (userIds.length > 0) {
        const { data: users } = await serviceClient
          .from('users')
          .select('id, email')
          .in('id', userIds)

        const userMap: Record<string, string> = {}
        if (users) {
          users.forEach((u: { id: string; email: string }) => {
            userMap[u.id] = u.email
          })
        }

        loginLogs.forEach((log: { user_id: string | null; timestamp: string }) => {
          if (log.user_id && userMap[log.user_id] && recentLogins.length < 5) {
            // 既にこのユーザーがリストにあるかチェック
            if (!recentLogins.find(l => l.email === userMap[log.user_id!])) {
              recentLogins.push({
                id: log.user_id,
                email: userMap[log.user_id],
                loginAt: formatRelativeTime(new Date(log.timestamp)),
              })
            }
          }
        })
      }
    }

    // 4. 変化率を計算
    const userChange = (totalUsers || 0) - (lastMonthUsers || 0)
    const paidUserChange = (paidUsers || 0) - (lastMonthPaidUsers || 0)
    const mrrChange = lastMonthMrr > 0 ? Math.round(((mrr - lastMonthMrr) / lastMonthMrr) * 100 * 10) / 10 : 0

    // 5. レスポンス返却
    return NextResponse.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        activeUsers,
        paidUsers: paidUsers || 0,
        mrr,
        totalMedia: totalMedia || 0,
        totalKeywords: totalKeywords || 0,
        userChange,
        paidUserChange,
        mrrChange,
        recentLogins,
      },
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : '統計情報の取得に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}

// 相対時間をフォーマット
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) {
    return 'たった今'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分前`
  } else if (diffHours < 24) {
    return `${diffHours}時間前`
  } else {
    return `${diffDays}日前`
  }
}
