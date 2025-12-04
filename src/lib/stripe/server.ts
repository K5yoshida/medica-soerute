// ===========================================
// Stripe Server Client
// ===========================================

import Stripe from 'stripe'

// 遅延初期化のためのシングルトン
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

// 後方互換性のためのエクスポート（ビルド時には使用しない）
export const stripe = {
  get customers() {
    return getStripe().customers
  },
  get checkout() {
    return getStripe().checkout
  },
  get billingPortal() {
    return getStripe().billingPortal
  },
  get subscriptions() {
    return getStripe().subscriptions
  },
  get webhooks() {
    return getStripe().webhooks
  },
}

// プランのPrice ID
export const STRIPE_PRICES = {
  light: process.env.STRIPE_PRICE_LIGHT || '',
  standard: process.env.STRIPE_PRICE_STANDARD || '',
  premium: process.env.STRIPE_PRICE_PREMIUM || '',
} as const

// Checkout Session作成
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
}: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
}) {
  return getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: 14, // 14日間の無料トライアル
    },
  })
}

// Customer Portal Session作成
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  return getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

// Customer作成
export async function createCustomer({
  email,
  userId,
  companyName,
}: {
  email: string
  userId: string
  companyName?: string
}) {
  return getStripe().customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
    name: companyName,
  })
}

// Subscription取得
export async function getSubscription(subscriptionId: string) {
  return getStripe().subscriptions.retrieve(subscriptionId)
}

// Subscription解約
export async function cancelSubscription(subscriptionId: string) {
  return getStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}
