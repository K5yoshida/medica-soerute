/**
 * メール送信モジュール
 *
 * 設計書: 19_エラーカタログと監視ポリシー - GAP-057 決済失敗時通知
 *
 * Resendを使用してトランザクショナルメールを送信する
 */

import { Resend } from 'resend'

// Resendクライアントの初期化
let resend: Resend | null = null

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set')
    }
    resend = new Resend(apiKey)
  }
  return resend
}

// 送信元メールアドレス（ドメイン認証が必要）
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@medica-soerute.jp'
const FROM_NAME = 'MEDICA SOERUTE'

// メール送信結果
interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * 汎用メール送信関数
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<EmailResult> {
  try {
    const client = getResend()

    const { data, error } = await client.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    })

    if (error) {
      console.error('Failed to send email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 決済失敗通知メールを送信
 */
export async function sendPaymentFailedNotification({
  email,
  userName,
  invoiceId,
  amount,
  currency = 'jpy',
}: {
  email: string
  userName?: string
  invoiceId: string
  amount: number
  currency?: string
}): Promise<EmailResult> {
  const formattedAmount = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100) // Stripeは最小通貨単位（円は1円）

  const displayName = userName || 'お客様'

  const subject = '【重要】お支払いに失敗しました - MEDICA SOERUTE'

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #18181B; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 20px;">MEDICA SOERUTE</h1>
  </div>

  <div style="background: white; border: 1px solid #E4E4E7; border-top: none; padding: 32px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">${displayName}様</p>

    <p>いつもMEDICA SOERUTEをご利用いただきありがとうございます。</p>

    <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #DC2626; font-weight: 600;">
        お支払いの処理に失敗しました
      </p>
      <p style="margin: 8px 0 0 0; color: #991B1B; font-size: 14px;">
        ご登録のお支払い方法での決済が完了できませんでした。
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <tr>
        <td style="padding: 8px 0; color: #71717A; font-size: 14px;">請求金額</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedAmount}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #71717A; font-size: 14px;">請求ID</td>
        <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${invoiceId}</td>
      </tr>
    </table>

    <p style="font-size: 14px;">サービスを継続してご利用いただくため、以下のいずれかの対応をお願いいたします：</p>

    <ul style="font-size: 14px; padding-left: 20px;">
      <li>ご登録のカード情報をご確認ください</li>
      <li>カードの有効期限が切れていないかご確認ください</li>
      <li>カードの利用限度額をご確認ください</li>
      <li>別のお支払い方法をご登録ください</li>
    </ul>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/billing" style="display: inline-block; background: #18181B; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 500;">
        支払い情報を更新する
      </a>
    </div>

    <p style="font-size: 13px; color: #71717A;">
      ご不明な点がございましたら、お気軽にサポートまでお問い合わせください。
    </p>
  </div>

  <div style="text-align: center; padding: 24px; color: #A1A1AA; font-size: 12px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} MEDICA SOERUTE. All rights reserved.</p>
    <p style="margin: 8px 0 0 0;">
      このメールは自動送信されています。
    </p>
  </div>
</body>
</html>
`

  const text = `${displayName}様

いつもMEDICA SOERUTEをご利用いただきありがとうございます。

【重要】お支払いの処理に失敗しました

ご登録のお支払い方法での決済が完了できませんでした。

請求金額: ${formattedAmount}
請求ID: ${invoiceId}

サービスを継続してご利用いただくため、以下のいずれかの対応をお願いいたします：

- ご登録のカード情報をご確認ください
- カードの有効期限が切れていないかご確認ください
- カードの利用限度額をご確認ください
- 別のお支払い方法をご登録ください

支払い情報の更新: ${process.env.NEXT_PUBLIC_APP_URL}/settings/billing

ご不明な点がございましたら、お気軽にサポートまでお問い合わせください。

© ${new Date().getFullYear()} MEDICA SOERUTE
`

  return sendEmail({ to: email, subject, html, text })
}

/**
 * トライアル期間終了通知メールを送信
 * 設計書: GAP-009 トライアル期間終了通知スケジュール
 *
 * @param daysRemaining - 残り日数（7, 3, 1, 0）
 */
export async function sendTrialExpirationNotification({
  email,
  userName,
  daysRemaining,
  trialEndsAt,
}: {
  email: string
  userName?: string
  daysRemaining: number
  trialEndsAt: string
}): Promise<EmailResult> {
  const displayName = userName || 'お客様'
  const endDate = new Date(trialEndsAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // 残り日数に応じたメッセージ
  const urgencyMessages: Record<number, { subject: string; urgency: string; color: string }> = {
    7: {
      subject: 'トライアル期間終了まで1週間です - MEDICA SOERUTE',
      urgency: 'トライアル期間終了まで残り7日',
      color: '#3B82F6', // blue
    },
    3: {
      subject: 'トライアル期間終了まで3日です - MEDICA SOERUTE',
      urgency: 'トライアル期間終了まで残り3日',
      color: '#F59E0B', // amber
    },
    1: {
      subject: '【重要】明日トライアル期間が終了します - MEDICA SOERUTE',
      urgency: 'トライアル期間は明日終了します',
      color: '#EF4444', // red
    },
    0: {
      subject: '【重要】本日トライアル期間が終了します - MEDICA SOERUTE',
      urgency: 'トライアル期間は本日終了します',
      color: '#DC2626', // dark red
    },
  }

  const config = urgencyMessages[daysRemaining] || urgencyMessages[7]

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #18181B; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 20px;">MEDICA SOERUTE</h1>
  </div>

  <div style="background: white; border: 1px solid #E4E4E7; border-top: none; padding: 32px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">${displayName}様</p>

    <p>いつもMEDICA SOERUTEをご利用いただきありがとうございます。</p>

    <div style="background: ${config.color}10; border: 1px solid ${config.color}40; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: ${config.color}; font-weight: 600; font-size: 18px;">
        ${config.urgency}
      </p>
      <p style="margin: 8px 0 0 0; color: #71717A; font-size: 14px;">
        終了日: ${endDate}
      </p>
    </div>

    <p style="font-size: 14px;">
      トライアル期間終了後もサービスを継続してご利用いただくには、有料プランへのアップグレードが必要です。
    </p>

    <h3 style="font-size: 16px; margin-top: 24px;">有料プランの特典</h3>
    <ul style="font-size: 14px; padding-left: 20px;">
      <li>すべての分析機能が無制限で利用可能</li>
      <li>PESO診断レポートの生成</li>
      <li>マッチング結果のエクスポート</li>
      <li>優先サポート</li>
    </ul>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/billing" style="display: inline-block; background: #18181B; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 500;">
        プランをアップグレード
      </a>
    </div>

    <p style="font-size: 13px; color: #71717A;">
      ご不明な点がございましたら、お気軽にサポートまでお問い合わせください。
    </p>
  </div>

  <div style="text-align: center; padding: 24px; color: #A1A1AA; font-size: 12px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} MEDICA SOERUTE. All rights reserved.</p>
    <p style="margin: 8px 0 0 0;">
      このメールは自動送信されています。
    </p>
  </div>
</body>
</html>
`

  const text = `${displayName}様

いつもMEDICA SOERUTEをご利用いただきありがとうございます。

${config.urgency}
終了日: ${endDate}

トライアル期間終了後もサービスを継続してご利用いただくには、有料プランへのアップグレードが必要です。

■ 有料プランの特典
- すべての分析機能が無制限で利用可能
- PESO診断レポートの生成
- マッチング結果のエクスポート
- 優先サポート

プランのアップグレードはこちら:
${process.env.NEXT_PUBLIC_APP_URL}/settings/billing

ご不明な点がございましたら、お気軽にサポートまでお問い合わせください。

© ${new Date().getFullYear()} MEDICA SOERUTE
`

  return sendEmail({ to: email, subject: config.subject, html, text })
}

/**
 * HTMLタグを除去してプレーンテキストに変換
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
