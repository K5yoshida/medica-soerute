'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Grid2X2,
  Star,
  FileText,
  Folder,
  Clock,
  Settings,
  LogOut,
} from 'lucide-react'
import type { User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DashboardSidebarProps {
  user: User
}

const mainNavItems = [
  {
    title: 'ホーム',
    href: '/dashboard',
    icon: Home,
  },
]

const analysisNavItems = [
  {
    title: '媒体カタログ',
    href: '/dashboard/catalog',
    icon: Grid2X2,
  },
  {
    title: '媒体マッチング',
    href: '/dashboard/matching',
    icon: Star,
  },
  {
    title: 'PESO診断',
    href: '/dashboard/peso',
    icon: FileText,
  },
]

const manageNavItems = [
  {
    title: 'フォルダ',
    href: '/dashboard/folders',
    icon: Folder,
  },
  {
    title: '履歴',
    href: '/dashboard/history',
    icon: Clock,
  },
]

const settingsNavItems = [
  {
    title: 'アカウント設定',
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

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const NavLink = ({ item }: { item: { title: string; href: string; icon: React.ComponentType<{ className?: string }> } }) => {
    const active = isActive(item.href)
    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors',
          active
            ? 'bg-[rgba(13,148,136,0.12)] text-primary font-medium'
            : 'text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#FAFAFA]'
        )}
      >
        <item.icon className={cn('h-4 w-4', active && 'stroke-[2]')} />
        <span>{item.title}</span>
      </Link>
    )
  }

  return (
    <aside className="hidden md:flex w-60 flex-col bg-[#18181B] fixed top-0 left-0 h-screen z-50 border-r border-white/[0.06]">
      {/* ロゴ */}
      <div className="px-4 py-5 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white text-sm">
            🖐️
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#FAFAFA] tracking-tight">
              MEDICA SOERUTE
            </div>
            <div className="text-[11px] text-[#A1A1AA]">
              Powered by CyXen
            </div>
          </div>
        </Link>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {/* ホーム */}
        <div className="space-y-0.5">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* 区切り線 */}
        <div className="h-px bg-white/[0.06] mx-3 my-3" />

        {/* 分析ツール */}
        <div className="space-y-0.5">
          {analysisNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* 区切り線 */}
        <div className="h-px bg-white/[0.06] mx-3 my-3" />

        {/* 管理 */}
        <div className="space-y-0.5">
          {manageNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* 区切り線 */}
        <div className="h-px bg-white/[0.06] mx-3 my-3" />

        {/* 設定 */}
        <div className="space-y-0.5">
          {settingsNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* ユーザー情報 */}
      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <span className="text-[11px] font-medium text-white">
              {user.company_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[#FAFAFA] truncate">
              {user.company_name || user.email?.split('@')[0] || 'ユーザー'}
            </div>
            <div className="text-[11px] text-[#A1A1AA]">
              {user.role === 'admin' ? '管理者' : 'コンサルタント'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 rounded text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#FAFAFA] transition-colors"
            title="ログアウト"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
