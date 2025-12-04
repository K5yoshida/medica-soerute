import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user as User} />
      <div className="flex flex-1">
        <Sidebar user={user as User} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="container py-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
