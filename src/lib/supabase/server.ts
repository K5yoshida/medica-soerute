// ===========================================
// Supabase Client (Server)
// ===========================================

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// 型定義なしで使用（実行時はSupabaseのスキーマに依存）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Componentから呼び出された場合は無視
          }
        },
      },
    }
  )
}

// Service Role Client (管理者操作用・Inngestなどバックグラウンドジョブ用)
// @supabase/supabase-jsを直接使用（@supabase/ssrはNext.jsのRequest/Responseサイクル用）
export function createServiceClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
