import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPaymentFailedNotification } from '@/lib/email'
import { logger } from '@/lib/monitoring'
import Stripe from 'stripe'

// 新プラン体系: starter(月20回), professional(無制限)
// medica/enterprise/trialは無制限(-1)
const PLAN_LIMITS: Record<string, number> = {
  starter: 20,
  professional: -1,
  medica: -1,
  enterprise: -1,
  trial: -1,
}

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const planId = session.metadata?.planId
        const subscriptionId = session.subscription as string

        if (userId && planId) {
          await supabase
            .from('users')
            .update({
              plan: planId,
              monthly_analysis_limit: PLAN_LIMITS[planId] || 10,
              stripe_subscription_id: subscriptionId,
            })
            .eq('id', userId)

          // ログを記録
          await supabase.from('usage_logs').insert({
            user_id: userId,
            action_type: 'subscription_created',
            metadata: {
              plan: planId,
              subscription_id: subscriptionId,
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // 顧客IDからユーザーを取得
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .limit(1)

        if (users && users.length > 0) {
          const userId = users[0].id

          // サブスクリプションのステータスに応じて更新
          if (subscription.status === 'active') {
            // プランを更新（価格IDからプランを特定）
            const priceId = subscription.items.data[0]?.price.id
            let planId = 'starter'

            if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL) {
              planId = 'professional'
            }

            await supabase
              .from('users')
              .update({
                plan: planId,
                monthly_analysis_limit: PLAN_LIMITS[planId],
              })
              .eq('id', userId)
          }

          await supabase.from('usage_logs').insert({
            user_id: userId,
            action_type: 'subscription_updated',
            metadata: {
              status: subscription.status,
              subscription_id: subscription.id,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: users } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .limit(1)

        if (users && users.length > 0) {
          const userId = users[0].id

          // サブスクリプション解約時はtrialに戻す（ただし期限切れ状態）
          await supabase
            .from('users')
            .update({
              plan: 'trial',
              monthly_analysis_limit: -1,
              stripe_subscription_id: null,
              trial_ends_at: new Date().toISOString(), // 即座に期限切れ
            })
            .eq('id', userId)

          await supabase.from('usage_logs').insert({
            user_id: userId,
            action_type: 'subscription_canceled',
            metadata: {
              subscription_id: subscription.id,
            },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: users } = await supabase
          .from('users')
          .select('id, email, display_name')
          .eq('stripe_customer_id', customerId)
          .limit(1)

        if (users && users.length > 0) {
          const user = users[0]

          // ログを記録
          await supabase.from('usage_logs').insert({
            user_id: user.id,
            action_type: 'payment_failed',
            metadata: {
              invoice_id: invoice.id,
              amount: invoice.amount_due,
            },
          })

          // 決済失敗通知メールを送信
          if (user.email) {
            const emailResult = await sendPaymentFailedNotification({
              email: user.email,
              userName: user.display_name,
              invoiceId: invoice.id,
              amount: invoice.amount_due,
              currency: invoice.currency,
            })

            if (emailResult.success) {
              logger.info('Payment failed notification sent', {
                category: 'billing',
                action: 'payment_failed_notification',
                userId: user.id,
                metadata: {
                  invoice_id: invoice.id,
                  email_message_id: emailResult.messageId,
                },
              })
            } else {
              logger.error('Failed to send payment failed notification', {
                category: 'billing',
                action: 'payment_failed_notification',
                userId: user.id,
                errorMessage: emailResult.error,
                metadata: {
                  invoice_id: invoice.id,
                },
              })
            }
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
