import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { User } from '@/types'

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

  const typedUser = user as User

  // 管理者権限チェック
  if (typedUser.role !== 'admin' && typedUser.role !== 'super_admin') {
    redirect('/analysis')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 管理者ヘッダー */}
      <header className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-bold text-lg">
              MEDICA SOERUTE Admin
            </Link>
            <nav className="flex gap-4 ml-8">
              <Link
                href="/admin"
                className="text-gray-300 hover:text-white transition-colors"
              >
                ダッシュボード
              </Link>
              <Link
                href="/admin/users"
                className="text-gray-300 hover:text-white transition-colors"
              >
                ユーザー管理
              </Link>
              <Link
                href="/admin/media"
                className="text-gray-300 hover:text-white transition-colors"
              >
                媒体管理
              </Link>
              <Link
                href="/admin/analytics"
                className="text-gray-300 hover:text-white transition-colors"
              >
                分析レポート
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{typedUser.email}</span>
            <Link
              href="/analysis"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ユーザー画面へ
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
