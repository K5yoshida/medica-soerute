import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import type { User } from '@/types'

export async function POST() {
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

    if (!typedUserData.stripe_customer_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_SUBSCRIPTION',
            message: '有料プランに加入していません',
          },
        },
        { status: 400 }
      )
    }

    // Billing Portal Sessionを作成
    const session = await stripe.billingPortal.sessions.create({
      customer: typedUserData.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    })

    return NextResponse.json({
      success: true,
      data: {
        url: session.url,
      },
    })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PORTAL_ERROR',
          message: error instanceof Error ? error.message : 'ポータルの作成に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}
