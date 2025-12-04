import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import type { User } from '@/types'

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
    redirect('/login')
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
        plan: 'free',
        monthly_analysis_count: 0,
        monthly_analysis_limit: 3,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create user:', insertError)
      // ユーザー作成に失敗した場合でも、基本情報でダミーユーザーを作成
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
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={finalUser as User} />
      <div className="flex flex-1">
        <Sidebar user={finalUser as User} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="container py-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
