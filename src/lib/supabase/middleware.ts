// ===========================================
// Supabase Middleware Helper
// ===========================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { checkApiRateLimit } from '@/lib/rate-limiter-edge'
import {
  validateSessionEdge,
  getSessionTokenFromRequest,
} from '@/lib/auth/session-edge'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 環境変数のチェック
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error('Error getting user:', error)
  }

  const pathname = request.nextUrl.pathname

  // レート制限チェック（APIエンドポイントのみ）
  // 設計書: 23_セキュリティ設計書 - 23.6.2 Rate Limiting
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = await checkApiRateLimit(
      request,
      pathname,
      user?.id
    )
    if (rateLimitResponse) {
      return rateLimitResponse
    }
  }

  // 認証が必要なルートの保護
  const protectedRoutes = ['/dashboard']
  const authRoutes = ['/auth/login', '/auth/signup', '/auth/password']

  // 認証コールバックはスキップ
  if (pathname.startsWith('/api/auth/callback')) {
    return supabaseResponse
  }

  // 認証済みユーザーが認証ページにアクセスした場合、ダッシュボードにリダイレクト
  if (user && authRoutes.some(route => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 未認証ユーザーが保護されたルートにアクセスした場合、ログインページにリダイレクト
  if (!user && protectedRoutes.some(route => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // 管理者ルートの保護
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
  }

  // 同時ログイン制御: セッション有効性チェック
  // 設計書: 23_セキュリティ設計書 - 同時ログイン制御
  // 認証済みユーザーが保護されたルートにアクセスする場合のみチェック
  if (user && (protectedRoutes.some(route => pathname.startsWith(route)) || pathname.startsWith('/admin'))) {
    const sessionToken = getSessionTokenFromRequest(request)
    const { valid, reason } = await validateSessionEdge(sessionToken)

    // セッションが無効な場合（他デバイスでログインされた場合）
    if (!valid && reason === 'invalid') {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('reason', 'session_expired')
      url.searchParams.set('redirect', pathname)
      // Supabaseのセッションもクリア
      supabaseResponse.cookies.delete('sb-access-token')
      supabaseResponse.cookies.delete('sb-refresh-token')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
