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
  try {
    const supabase = await createClient()

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error:', authError)
      redirect('/login?error=auth_error')
    }

    if (!authUser) {
      redirect('/login')
    }

    // ユーザー情報を取得
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found (これは許容する)
      console.error('Fetch user error:', fetchError)
    }

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
        redirect('/login?error=user_creation_failed')
      }
      finalUser = newUser
    }

    if (!finalUser) {
      console.error('No user data available')
      redirect('/login?error=no_user_data')
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
  } catch (error) {
    console.error('Dashboard layout error:', error)
    redirect('/login?error=unexpected_error')
  }
}
