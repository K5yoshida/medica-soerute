import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/server'
import type { User } from '@/types'

interface InvoiceData {
  id: string
  number: string | null
  amount: number
  tax: number
  status: string
  created_at: string
  paid_at: string | null
  pdf_url: string | null
}

/**
 * GET /api/payments/invoices
 * 請求履歴取得API
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

    // ユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
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
      // Stripe顧客IDがない場合は空の履歴を返す
      return NextResponse.json({
        success: true,
        data: {
          invoices: [],
        },
      })
    }

    // Stripeから請求履歴を取得
    const stripe = getStripe()
    const invoices = await stripe.invoices.list({
      customer: typedUserData.stripe_customer_id,
      limit: 100,
    })

    const formattedInvoices: InvoiceData[] = invoices.data.map((invoice) => {
      // Stripe SDK型の互換性のためキャスト
      const inv = invoice as unknown as {
        id: string
        number: string | null
        amount_paid: number
        status: string | null
        created: number
        status_transitions?: { paid_at: number | null }
        invoice_pdf?: string | null
      }
      return {
        id: inv.id,
        number: inv.number,
        amount: inv.amount_paid,
        tax: 0, // 消費税は別途計算が必要な場合に対応
        status: inv.status || 'unknown',
        created_at: new Date(inv.created * 1000).toISOString(),
        paid_at: inv.status_transitions?.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
          : null,
        pdf_url: inv.invoice_pdf || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        invoices: formattedInvoices,
      },
    })
  } catch (error) {
    console.error('Get invoices error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
