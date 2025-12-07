// ===========================================
// Inngest Client
// 非同期ジョブキュー用のInngestクライアント設定
// ===========================================

import { Inngest, EventSchemas } from 'inngest'

/**
 * インポートジョブのイベントスキーマ
 */
type ImportJobEvents = {
  'import/csv.started': {
    data: {
      jobId: string
      fileUrl: string
      fileName: string
      importType: 'rakko_keywords' | 'similarweb'
      mediaId?: string
      userId: string
    }
  }
  'import/csv.cancelled': {
    data: {
      jobId: string
    }
  }
}

/**
 * トライアル通知のイベントスキーマ
 * 設計書: GAP-009 トライアル期間終了通知スケジュール
 */
type TrialNotificationEvents = {
  'trial/check.scheduled': {
    data: Record<string, never>
  }
  'trial/notification.send': {
    data: {
      userId: string
      email: string
      userName?: string
      daysRemaining: number
      trialEndsAt: string
    }
  }
}

/**
 * 統合イベント型
 */
type AllEvents = ImportJobEvents & TrialNotificationEvents

/**
 * Inngestクライアント
 *
 * 環境変数:
 * - INNGEST_SIGNING_KEY: Webhookの署名検証用（本番環境で必須）
 * - INNGEST_EVENT_KEY: イベント送信用（本番環境で必須）
 */
export const inngest = new Inngest({
  id: 'medica-soerute',
  schemas: new EventSchemas().fromRecord<AllEvents>(),
})
