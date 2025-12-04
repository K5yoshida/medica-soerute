import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import type { User } from '@/types'

// プラン別の価格ID（Stripeで設定したPrice ID）
const PRICE_IDS: Record<string, string> = {
  light: process.env.STRIPE_PRICE_LIGHT || '',
  standard: process.env.STRIPE_PRICE_STANDARD || '',
  premium: process.env.STRIPE_PRICE_PREMIUM || '',
}

const PLAN_LIMITS: Record<string, number> = {
  light: 10,
  standard: 30,
  premium: -1, // 無制限
}

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

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' } },
        { status: 404 }
      )
    }

    const typedUserData = userData as User

    const body = await request.json()
    const { planId } = body

    if (!planId || !PRICE_IDS[planId]) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PLAN', message: '無効なプランです' } },
        { status: 400 }
      )
    }

    // 既存のStripe顧客IDがあればそれを使用、なければ新規作成
    let customerId = typedUserData.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: typedUserData.email,
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id

      // Supabaseに顧客IDを保存
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Checkout Sessionを作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[planId],
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: {
        userId: user.id,
        planId,
        planLimit: PLAN_LIMITS[planId].toString(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CHECKOUT_ERROR',
          message: error instanceof Error ? error.message : 'チェックアウトの作成に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}
