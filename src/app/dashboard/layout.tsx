import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar'
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
  let finalUser = user
  if (!user) {
    const serviceClient = createServiceClient()
    const { data: newUser, error: insertError } = await serviceClient
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email || '',
        role: 'user',
        plan: 'free',
        monthly_analysis_count: 0,
        monthly_analysis_limit: 3,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create user:', insertError)
      finalUser = {
        id: authUser.id,
        email: authUser.email || '',
        plan: 'free',
        monthly_analysis_count: 0,
        monthly_analysis_limit: 3,
        role: 'user',
        company_name: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
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
      {/* Sidebar (fixed, 240px) */}
      <DashboardSidebar user={finalUser as User} />

      {/* Main content (margin-left: 240px) */}
      <main
        style={{
          flex: 1,
          marginLeft: '240px',
          minHeight: '100vh',
        }}
      >
        {children}
      </main>
    </div>
  )
}
