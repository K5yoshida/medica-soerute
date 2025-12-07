// ===========================================
// Upgrade Notification API
// 法人プランアップグレード通知の確認
// POST /api/user/notification/upgrade
// ===========================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 法人プランアップグレード通知を確認済みにする
 * upgrade_notified_at を現在時刻で更新
 */
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

    // upgrade_notified_at を現在時刻で更新
    const { error: updateError } = await supabase
      .from('users')
      .update({
        upgrade_notified_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update upgrade_notified_at:', updateError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: '通知確認の更新に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '通知を確認しました',
    })
  } catch (error) {
    console.error('Upgrade notification error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
