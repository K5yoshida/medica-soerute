// ===========================================
// Billing Dashboard API
// 課金ダッシュボードデータ取得
// GET /api/admin/billing/dashboard
// 設計書: 13_APIエンドポイント一覧.md - 13.8 管理者API
// 画面: SC-906 課金管理画面
// ===========================================

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { PlanType } from '@/types/database'

// ===== 型定義 =====

interface PlanBreakdown {
  medica: number
  enterprise: number
  trial: number
  starter: number
  professional: number
}

interface BillingDashboardData {
  mrr: number
  arr: number
  active_subscriptions: number
  trial_count: number
  plan_breakdown: PlanBreakdown
  churn_rate: number
  user_growth: {
    this_month: number
    last_month: number
    growth_rate: number
  }
}

interface BillingDashboardResponse {
  success: boolean
  data?: BillingDashboardData
  error?: {
    code?: string
    message: string
  }
}

// ===== プラン別月額料金（設計書に基づく） =====

const PLAN_PRICES: Record<PlanType, number> = {
  medica: 0, // 社内利用（無料）
  enterprise: 50000, // 要見積もり（仮）
  trial: 0,
  starter: 9800,
  professional: 29800,
}

// ===== メインハンドラー =====

export async function GET(): Promise<NextResponse<BillingDashboardResponse>> {
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

    // 3.1 プラン別ユーザー数を取得
    const { data: users, error: usersError } = await serviceClient
      .from('users')
      .select('plan, created_at')

    if (usersError) {
      console.error('Users query error:', usersError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'ユーザーデータの取得に失敗しました' } },
        { status: 500 }
      )
    }

    // 4. 集計処理
    const planBreakdown: PlanBreakdown = {
      medica: 0,
      enterprise: 0,
      trial: 0,
      starter: 0,
      professional: 0,
    }

    let mrr = 0
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    let thisMonthNewUsers = 0
    let lastMonthNewUsers = 0

    if (users) {
      users.forEach((u: { plan: PlanType; created_at: string }) => {
        // プラン別カウント
        if (u.plan in planBreakdown) {
          planBreakdown[u.plan]++
        }

        // MRR計算（有料プランのみ）
        if (u.plan in PLAN_PRICES) {
          mrr += PLAN_PRICES[u.plan]
        }

        // 新規ユーザー数計算
        const createdAt = new Date(u.created_at)
        if (createdAt >= thisMonthStart) {
          thisMonthNewUsers++
        } else if (createdAt >= lastMonthStart && createdAt <= lastMonthEnd) {
          lastMonthNewUsers++
        }
      })
    }

    // 5. 指標計算
    const totalUsers = users?.length || 0
    const trialCount = planBreakdown.trial
    const activeSubscriptions = totalUsers - trialCount
    const arr = mrr * 12

    // 成長率計算
    const growthRate = lastMonthNewUsers > 0
      ? Number((((thisMonthNewUsers - lastMonthNewUsers) / lastMonthNewUsers) * 100).toFixed(1))
      : thisMonthNewUsers > 0 ? 100 : 0

    // チャーン率は現時点で計算不可（解約データがないため0を返す）
    const churnRate = 0

    // 6. レスポンス返却
    return NextResponse.json({
      success: true,
      data: {
        mrr,
        arr,
        active_subscriptions: activeSubscriptions,
        trial_count: trialCount,
        plan_breakdown: planBreakdown,
        churn_rate: churnRate,
        user_growth: {
          this_month: thisMonthNewUsers,
          last_month: lastMonthNewUsers,
          growth_rate: growthRate,
        },
      },
    })
  } catch (error) {
    console.error('Billing dashboard error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : '課金ダッシュボードの取得に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}
