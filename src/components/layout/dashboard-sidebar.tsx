'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  Target,
  BarChart3,
  History,
  Settings,
  LogOut,
} from 'lucide-react'
import type { User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DashboardSidebarProps {
  user: User
}

const navigationItems = [
  {
    title: 'ダッシュボード',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: '媒体カタログ',
    href: '/dashboard/catalog',
    icon: BookOpen,
  },
  {
    title: '媒体マッチング',
    href: '/dashboard/matching',
    icon: Target,
  },
  {
    title: 'PESO診断',
    href: '/dashboard/peso',
    icon: BarChart3,
  },
  {
    title: '履歴',
    href: '/dashboard/history',
    icon: History,
  },
]

const settingsItems = [
  {
    title: '設定',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex w-60 flex-col bg-[#18181B] text-[#A1A1AA]">
      {/* ロゴ */}
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <Link href="/dashboard" className="text-lg font-semibold text-[#FAFAFA]">
          MEDICA SOERUTE
        </Link>
      </div>

      {/* ナビゲーション */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3 space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[rgba(13,148,136,0.12)] text-[#FAFAFA]'
                    : 'hover:bg-[rgba(255,255,255,0.04)] hover:text-[#FAFAFA]'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-6 px-3">
          <div className="border-t border-white/10 pt-4">
            {settingsItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-[rgba(13,148,136,0.12)] text-[#FAFAFA]'
                      : 'hover:bg-[rgba(255,255,255,0.04)] hover:text-[#FAFAFA]'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ユーザー情報 */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#FAFAFA] truncate">
              {user.company_name || user.email}
            </p>
            <p className="text-xs text-[#A1A1AA] capitalize">{user.plan}プラン</p>
          </div>
        </div>

        {/* 利用状況 */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
            <span>今月の分析回数</span>
            <span>
              {user.monthly_analysis_count} /{' '}
              {user.monthly_analysis_limit === -1
                ? '無制限'
                : user.monthly_analysis_limit}
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width:
                  user.monthly_analysis_limit === -1
                    ? '0%'
                    : `${Math.min(
                        (user.monthly_analysis_count /
                          user.monthly_analysis_limit) *
                          100,
                        100
                      )}%`,
              }}
            />
          </div>
        </div>

        {/* ログアウト */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#FAFAFA] transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>ログアウト</span>
        </button>
      </div>
    </aside>
  )
}
