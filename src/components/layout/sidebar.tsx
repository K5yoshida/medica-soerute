'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  FileSearch,
  LayoutGrid,
  Lightbulb,
  Settings,
  CreditCard,
} from 'lucide-react'
import type { User } from '@/types'

interface SidebarProps {
  user: User
}

const navigationItems = [
  {
    title: '媒体分析',
    href: '/analysis',
    icon: FileSearch,
    description: '求人条件から最適な媒体を分析',
  },
  {
    title: '媒体一覧',
    href: '/media',
    icon: LayoutGrid,
    description: '登録されている媒体情報を確認',
  },
  {
    title: 'PESO診断',
    href: '/peso',
    icon: BarChart3,
    description: '採用活動のPESO分析',
  },
  {
    title: '施策提案',
    href: '/recommendations',
    icon: Lightbulb,
    description: '分析結果に基づく施策提案',
  },
]

const settingsItems = [
  {
    title: '設定',
    href: '/settings',
    icon: Settings,
  },
  {
    title: 'プラン・請求',
    href: '/settings/billing',
    icon: CreditCard,
  },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-gray-50/50">
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3 space-y-1">
          <div className="mb-4">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              分析機能
            </p>
          </div>
          {navigationItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            )
          })}

          <div className="pt-6 mb-4">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              アカウント
            </p>
          </div>
          {settingsItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* ユーザー情報 */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {user.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.company_name || user.email}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user.plan}プラン</p>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>今月の分析回数</span>
            <span>
              {user.monthly_analysis_count} /{' '}
              {user.monthly_analysis_limit === -1
                ? '無制限'
                : user.monthly_analysis_limit}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
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
      </div>
    </aside>
  )
}
