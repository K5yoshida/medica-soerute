import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 施策マスターのスキーマ定義
// 実際のプロダクションでは、これをDBに保存して管理画面から編集可能にする
interface TacticFormField {
  name: string
  type: 'text' | 'number' | 'select' | 'checkbox' | 'multiselect'
  label: string
  options?: string[]
  required?: boolean
}

interface TacticDefinition {
  code: string
  name: string
  category: string
  peso_category: 'paid' | 'earned' | 'shared' | 'owned'
  form_schema: {
    fields: TacticFormField[]
  }
}

// 施策マスターデータ
const TACTICS_MASTER: TacticDefinition[] = [
  // Paid Media (有料広告)
  {
    code: 'indeed',
    name: 'Indeed',
    category: '求人媒体',
    peso_category: 'paid',
    form_schema: {
      fields: [
        { name: 'plan', type: 'select', label: 'プラン', options: ['無料掲載', 'Indeed PLUS', 'スポンサー求人'], required: true },
        { name: 'cost', type: 'number', label: '月額費用（円）' },
        { name: 'hours', type: 'number', label: '運用工数（時間/月）' },
      ],
    },
  },
  {
    code: 'jobmedley',
    name: 'ジョブメドレー',
    category: '求人媒体',
    peso_category: 'paid',
    form_schema: {
      fields: [
        { name: 'plan', type: 'select', label: 'プラン', options: ['成功報酬型', '掲載課金型'], required: true },
        { name: 'cost', type: 'number', label: '月額費用（円）' },
      ],
    },
  },
  {
    code: 'mynavi',
    name: 'マイナビ転職',
    category: '求人媒体',
    peso_category: 'paid',
    form_schema: {
      fields: [
        { name: 'plan', type: 'select', label: 'プラン', options: ['ライト', 'スタンダード', 'プレミアム'], required: true },
        { name: 'cost', type: 'number', label: '掲載費用（円）' },
      ],
    },
  },
  {
    code: 'rikunabi',
    name: 'リクナビNEXT',
    category: '求人媒体',
    peso_category: 'paid',
    form_schema: {
      fields: [
        { name: 'plan', type: 'select', label: 'プラン', options: ['N1', 'N2', 'N3', 'N4', 'N5'], required: true },
        { name: 'cost', type: 'number', label: '掲載費用（円）' },
      ],
    },
  },
  {
    code: 'google_ads',
    name: 'Google広告',
    category: '広告',
    peso_category: 'paid',
    form_schema: {
      fields: [
        { name: 'type', type: 'multiselect', label: '広告タイプ', options: ['検索', 'ディスプレイ', '動画'], required: true },
        { name: 'budget', type: 'number', label: '月間予算（円）' },
      ],
    },
  },
  // Earned Media (口コミ・PR)
  {
    code: 'google_review',
    name: 'Googleクチコミ',
    category: '口コミ',
    peso_category: 'earned',
    form_schema: {
      fields: [
        { name: 'rating', type: 'number', label: '平均評価' },
        { name: 'review_count', type: 'number', label: 'クチコミ数' },
        { name: 'reply_rate', type: 'select', label: '返信対応', options: ['全て返信', '一部返信', '未対応'] },
      ],
    },
  },
  {
    code: 'press_release',
    name: 'プレスリリース',
    category: 'PR',
    peso_category: 'earned',
    form_schema: {
      fields: [
        { name: 'frequency', type: 'select', label: '配信頻度', options: ['月1回以上', '四半期1回', '年1回', '未実施'] },
        { name: 'service', type: 'select', label: '配信サービス', options: ['PR TIMES', '@Press', 'その他', '未利用'] },
      ],
    },
  },
  // Shared Media (SNS)
  {
    code: 'instagram',
    name: 'Instagram',
    category: 'SNS',
    peso_category: 'shared',
    form_schema: {
      fields: [
        { name: 'types', type: 'multiselect', label: '投稿タイプ', options: ['フィード投稿', 'ストーリーズ', 'リール'], required: true },
        { name: 'operation', type: 'select', label: '運用形態', options: ['自社運用', '外部委託', '併用'], required: true },
        { name: 'frequency', type: 'select', label: '投稿頻度', options: ['毎日', '週3回以上', '週1回', '月1回以下'] },
        { name: 'hours', type: 'number', label: '運用工数（時間/月）' },
      ],
    },
  },
  {
    code: 'twitter',
    name: 'X (Twitter)',
    category: 'SNS',
    peso_category: 'shared',
    form_schema: {
      fields: [
        { name: 'operation', type: 'select', label: '運用形態', options: ['自社運用', '外部委託', '併用'], required: true },
        { name: 'frequency', type: 'select', label: '投稿頻度', options: ['毎日', '週3回以上', '週1回', '月1回以下'] },
      ],
    },
  },
  {
    code: 'facebook',
    name: 'Facebook',
    category: 'SNS',
    peso_category: 'shared',
    form_schema: {
      fields: [
        { name: 'operation', type: 'select', label: '運用形態', options: ['自社運用', '外部委託', '併用'], required: true },
        { name: 'frequency', type: 'select', label: '投稿頻度', options: ['毎日', '週3回以上', '週1回', '月1回以下'] },
      ],
    },
  },
  {
    code: 'tiktok',
    name: 'TikTok',
    category: 'SNS',
    peso_category: 'shared',
    form_schema: {
      fields: [
        { name: 'operation', type: 'select', label: '運用形態', options: ['自社運用', '外部委託', '併用'], required: true },
        { name: 'frequency', type: 'select', label: '投稿頻度', options: ['毎日', '週3回以上', '週1回', '月1回以下'] },
      ],
    },
  },
  {
    code: 'youtube',
    name: 'YouTube',
    category: 'SNS',
    peso_category: 'shared',
    form_schema: {
      fields: [
        { name: 'channel_type', type: 'select', label: 'チャンネル種別', options: ['企業チャンネル', '採用専用チャンネル'] },
        { name: 'frequency', type: 'select', label: '投稿頻度', options: ['週1回以上', '月2回', '月1回', '不定期'] },
      ],
    },
  },
  // Owned Media (自社メディア)
  {
    code: 'career_site',
    name: '採用サイト',
    category: '自社メディア',
    peso_category: 'owned',
    form_schema: {
      fields: [
        { name: 'type', type: 'select', label: 'サイト種別', options: ['専用採用サイト', 'コーポレートサイト内', 'LP'], required: true },
        { name: 'update_frequency', type: 'select', label: '更新頻度', options: ['週1回以上', '月1回', '四半期1回', '年1回以下'] },
        { name: 'features', type: 'multiselect', label: '機能', options: ['社員インタビュー', 'ブログ/オウンドメディア', '動画コンテンツ', '募集要項'] },
      ],
    },
  },
  {
    code: 'owned_blog',
    name: 'オウンドメディア/ブログ',
    category: '自社メディア',
    peso_category: 'owned',
    form_schema: {
      fields: [
        { name: 'platform', type: 'select', label: 'プラットフォーム', options: ['自社サイト', 'note', 'Wantedly', 'その他'] },
        { name: 'frequency', type: 'select', label: '更新頻度', options: ['週1回以上', '月2回', '月1回', '不定期'] },
      ],
    },
  },
]

/**
 * GET /api/master/tactics
 * 施策マスター取得API
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

    return NextResponse.json({
      success: true,
      data: {
        tactics: TACTICS_MASTER,
      },
    })
  } catch (error) {
    console.error('Get tactics error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
