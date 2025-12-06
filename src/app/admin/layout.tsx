import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminMain } from '@/components/layout/admin-layout-client'
import type { User } from '@/types'

/**
 * Admin Layout
 *
 * Design spec: 09_画面一覧.md - SC-901〜909
 *
 * Access: Admin権限必須
 * Background: #1E1B4B (deep purple/indigo)
 */

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/auth/login')
  }

  // ユーザー情報を取得
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!user) {
    redirect('/auth/login')
  }

  // Admin権限チェック（adminロールのみ管理画面アクセス可能）
  if (user.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F3FF',
        display: 'flex',
      }}
    >
      {/* Admin Sidebar */}
      <AdminSidebar user={user as User} />

      {/* Main content */}
      <AdminMain>{children}</AdminMain>
    </div>
  )
}
