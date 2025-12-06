import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar'
import { DashboardMain } from '@/components/layout/dashboard-layout-client'
import type { User } from '@/types'

/**
 * Dashboard Layout
 *
 * Design spec: 03_ブランディングとデザインガイド.md - 3.14 レイアウト
 *
 * Structure:
 * - Sidebar: 240px (fixed, left)
 * - Main content: margin-left: 240px
 * - Background: #FAFAFA (var(--bg-page))
 */

export default async function DashboardLayout({
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

  // ユーザーがusersテーブルに存在しない場合は作成
  // 通常はauth.usersへの登録時にhandle_new_user()トリガーで自動作成されるが、
  // 何らかの理由で存在しない場合のfallback
  let finalUser = user
  if (!user) {
    const serviceClient = createServiceClient()
    const { data: newUser, error: insertError } = await serviceClient
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email || '',
        role: 'user',
        plan: 'trial',
        monthly_analysis_count: 0,
        monthly_analysis_limit: -1, // trialは無制限
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14日間
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create user:', insertError)
      finalUser = {
        id: authUser.id,
        email: authUser.email || '',
        plan: 'trial',
        monthly_analysis_count: 0,
        monthly_analysis_limit: -1,
        role: 'user',
        company_name: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    } else {
      finalUser = newUser
    }
  }

  if (!finalUser) {
    redirect('/auth/login')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAFAFA',
        display: 'flex',
      }}
    >
      {/* Sidebar (fixed, 240px or 64px when collapsed) */}
      <DashboardSidebar user={finalUser as User} />

      {/* Main content (margin adjusts with sidebar) */}
      <DashboardMain>{children}</DashboardMain>
    </div>
  )
}
