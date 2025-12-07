import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/user/usage
 * 利用状況取得API
 *
 * マッチング分析とPESO診断それぞれの使用回数・上限・残り回数を返す
 */
export async function GET() {
  try {
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

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('plan, monthly_analysis_count, monthly_analysis_limit, monthly_peso_count, monthly_peso_limit')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' } },
        { status: 404 }
      )
    }

    // 今月の期間を計算
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // マッチングとPESOの使用状況を計算
    const matchingUsed = userData.monthly_analysis_count ?? 0
    const matchingLimit = userData.monthly_analysis_limit ?? 20
    const pesoUsed = userData.monthly_peso_count ?? 0
    const pesoLimit = userData.monthly_peso_limit ?? 10

    return NextResponse.json({
      success: true,
      data: {
        plan: userData.plan,
        matching: {
          used: matchingUsed,
          limit: matchingLimit,
          remaining: Math.max(0, matchingLimit - matchingUsed),
        },
        peso: {
          used: pesoUsed,
          limit: pesoLimit,
          remaining: Math.max(0, pesoLimit - pesoUsed),
        },
        period: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('Get usage error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
