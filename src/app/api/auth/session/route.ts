/**
 * セッション管理API
 *
 * POST /api/auth/session - ログイン時にセッション登録
 * DELETE /api/auth/session - ログアウト時にセッション無効化
 *
 * 設計書: 23_セキュリティ設計書 - 同時ログイン制御
 * GAP-003: 同時ログイン制御実装
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSession, invalidateSession } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { logAuditEvent, extractClientInfo } from '@/lib/audit'

const SESSION_COOKIE_NAME = 'app_session_token'

/**
 * セッション作成（ログイン後に呼び出し）
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 認証チェック
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

    // 2. リクエスト情報を取得
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    // 3. セッション作成（既存セッションは自動で無効化される）
    const sessionToken = await createSession({
      userId: user.id,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    })

    // 4. セッショントークンをクッキーに保存
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30日
    })

    // 5. 監査ログ記録
    await logAuditEvent({
      action: 'auth.login',
      userId: user.id,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      success: true,
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Session created' },
    })
  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SESSION_ERROR',
          message: error instanceof Error ? error.message : 'セッション作成に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * セッション無効化（ログアウト時に呼び出し）
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. クッキーからセッショントークン取得
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

    // 2. 認証情報取得（監査ログ用）
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 3. セッション無効化
    if (sessionToken) {
      await invalidateSession(sessionToken)
    }

    // 4. クッキー削除
    cookieStore.delete(SESSION_COOKIE_NAME)

    // 5. 監査ログ記録
    const clientInfo = extractClientInfo(request)
    await logAuditEvent({
      action: 'auth.logout',
      userId: user?.id,
      ...clientInfo,
      success: true,
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Session invalidated' },
    })
  } catch (error) {
    console.error('Session invalidation error:', error)
    // ログアウトは常に成功扱い
    return NextResponse.json({
      success: true,
      data: { message: 'Session invalidated' },
    })
  }
}
