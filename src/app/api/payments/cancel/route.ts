import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelSubscription } from '@/lib/stripe/server'
import type { User } from '@/types'

/**
 * POST /api/payments/cancel
 * 解約申請API
 *
 * Stripeのsubscriptionをcancel_at_period_endに設定し、
 * 現在の請求期間の終わりまで利用可能にする
 */
export async function POST(request: Request) {
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

    // リクエストボディを取得（オプション）
    let reason = ''
    let feedback = ''
    try {
      const body = await request.json()
      reason = body.reason || ''
      feedback = body.feedback || ''
    } catch {
      // ボディがない場合も許容
    }

    // ユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_subscription_id, stripe_customer_id, plan')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' } },
        { status: 404 }
      )
    }

    const typedUserData = userData as User

    // 社内ユーザー（medicaプラン）は解約不可
    if (typedUserData.plan === 'medica') {
      return NextResponse.json(
        { success: false, error: { code: 'CANNOT_CANCEL', message: '社内プランは解約できません' } },
        { status: 400 }
      )
    }

    // サブスクリプションがない場合
    if (!typedUserData.stripe_subscription_id) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_SUBSCRIPTION', message: 'アクティブなサブスクリプションがありません' } },
        { status: 400 }
      )
    }

    // Stripeでサブスクリプションを解約（期間終了時）
    const subscriptionResponse = await cancelSubscription(typedUserData.stripe_subscription_id)

    // Stripe Response型からデータを取得
    const subscription = subscriptionResponse as unknown as {
      cancel_at: number | null
      current_period_end: number
    }

    // 解約理由をログに記録
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action_type: 'subscription_cancel_requested',
      metadata: {
        subscription_id: typedUserData.stripe_subscription_id,
        cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
        reason,
        feedback,
      },
    })

    // 解約予定日を計算
    const cancelAt = subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000)
      : subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : new Date()

    const formattedDate = cancelAt.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    return NextResponse.json({
      success: true,
      data: {
        cancel_at: cancelAt.toISOString(),
        message: `${formattedDate}までご利用いただけます`,
      },
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
