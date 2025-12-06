// ===========================================
// Inngest API Route
// InngestがWebhookを受け取るエンドポイント
// ===========================================

import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { functions } from '@/lib/inngest/functions'

/**
 * Inngest Webhook エンドポイント
 *
 * 本番環境では以下の環境変数が必要:
 * - INNGEST_SIGNING_KEY: Webhookの署名検証
 * - INNGEST_EVENT_KEY: イベント送信用
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
