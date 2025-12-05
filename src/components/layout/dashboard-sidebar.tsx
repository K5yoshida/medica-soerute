'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Grid2X2,
  Star,
  FileText,
  Folder,
  Clock,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { User } from '@/types'
import { createClient } from '@/lib/supabase/client'

/**
 * Dashboard Sidebar
 *
 * Design spec: 03_ブランディングとデザインガイド.md - 3.9 サイドバー詳細仕様
 *
 * Structure:
 * - width: 240px (var(--sidebar-width)) / 64px (collapsed)
 * - bg: #18181B (var(--sidebar-bg))
 * - position: fixed
 * - border-right: 1px solid rgba(255,255,255,0.06)
 */

interface DashboardSidebarProps {
  user: User
}

const analysisNavItems = [
  { title: 'ホーム', href: '/dashboard', icon: Home },
  { title: '媒体カタログ', href: '/dashboard/catalog', icon: Grid2X2 },
  { title: '媒体マッチング', href: '/dashboard/matching', icon: Star },
  { title: 'PESO診断', href: '/dashboard/peso', icon: FileText },
]

const manageNavItems = [
  { title: 'フォルダ', href: '/dashboard/folders', icon: Folder },
  { title: '履歴', href: '/dashboard/history', icon: Clock },
]

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // クライアントサイドでlocalStorageから状態を復元
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState))
    // カスタムイベントを発火してレイアウトに通知
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: newState } }))
  }

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

  const sidebarWidth = isCollapsed ? '64px' : '240px'

  // マウント前は初期状態でレンダリング（ハイドレーションエラー防止）
  if (!mounted) {
    return (
      <aside
        className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-50"
        style={{
          width: '240px',
          background: '#18181B',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      />
    )
  }

  return (
    <aside
      className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-50 transition-all duration-300"
      style={{
        width: sidebarWidth,
        background: '#18181B',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: isCollapsed ? '20px 12px' : '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 no-underline flex-1 min-w-0">
            {/* Logo icon */}
            <div
              style={{
                width: '32px',
                height: '32px',
                background: '#0D9488',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px',
                flexShrink: 0,
              }}
            >
              M
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div
                  style={{
                    color: '#FAFAFA',
                    fontSize: '14px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  MEDICA SOERUTE
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#A1A1AA',
                    marginTop: '1px',
                    fontWeight: 400,
                  }}
                >
                  採用メディア分析
                </div>
              </div>
            )}
          </Link>
          {/* Toggle Button */}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'サイドバーを展開' : 'サイドバーを畳む'}
            className="p-1.5 rounded transition-colors flex-shrink-0"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A1A1AA',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.color = '#FAFAFA'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#A1A1AA'
            }}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: isCollapsed ? '12px 8px' : '12px 8px',
          overflowY: 'auto',
        }}
      >
        {/* 分析セクション */}
        <div style={{ marginBottom: '20px' }}>
          {!isCollapsed && (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: '#A1A1AA',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '0 12px',
                marginBottom: '8px',
              }}
            >
              分析
            </div>
          )}
          {analysisNavItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} isCollapsed={isCollapsed} />
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'rgba(255,255,255,0.06)',
            margin: isCollapsed ? '12px 4px' : '12px 12px',
          }}
        />

        {/* 管理セクション */}
        <div style={{ marginBottom: '20px' }}>
          {!isCollapsed && (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: '#A1A1AA',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '0 12px',
                marginBottom: '8px',
              }}
            >
              管理
            </div>
          )}
          {manageNavItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} isCollapsed={isCollapsed} />
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'rgba(255,255,255,0.06)',
            margin: isCollapsed ? '12px 4px' : '12px 12px',
          }}
        />

        {/* 設定 */}
        <NavLink
          item={{ title: '設定', href: '/dashboard/settings', icon: Settings }}
          isActive={isActive('/dashboard/settings')}
          isCollapsed={isCollapsed}
        />
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: isCollapsed ? '12px 8px' : '16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          {/* Avatar */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#0D9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '11px',
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {user.company_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || '?'}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#FAFAFA',
                  }}
                  className="truncate"
                >
                  {user.company_name || user.email?.split('@')[0] || 'ユーザー'}
                </div>
                <div style={{ fontSize: '11px', color: '#A1A1AA' }}>
                  {user.role === 'admin' ? '管理者' : 'コンサルタント'}
                </div>
              </div>
              {/* Logout button */}
              <button
                onClick={handleLogout}
                title="ログアウト"
                className="p-1 rounded transition-colors"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A1A1AA',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.color = '#FAFAFA'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#A1A1AA'
                }}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {/* Collapsed logout */}
        {isCollapsed && (
          <button
            onClick={handleLogout}
            title="ログアウト"
            className="w-full flex items-center justify-center mt-2 p-2 rounded transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A1A1AA',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = '#FAFAFA'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#A1A1AA'
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  )
}

/**
 * Nav Link Component
 */
interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

function NavLink({ item, isActive, isCollapsed }: { item: NavItem; isActive: boolean; isCollapsed: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      title={isCollapsed ? item.title : undefined}
      className="flex items-center no-underline transition-all"
      style={{
        gap: isCollapsed ? '0' : '12px',
        padding: isCollapsed ? '8px' : '8px 12px',
        borderRadius: '6px',
        color: isActive ? '#0D9488' : '#A1A1AA',
        background: isActive ? 'rgba(13,148,136,0.12)' : 'transparent',
        marginBottom: '2px',
        fontSize: '13px',
        fontWeight: isActive ? 500 : 400,
        justifyContent: isCollapsed ? 'center' : 'flex-start',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.color = '#FAFAFA'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#A1A1AA'
        }
      }}
    >
      <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2]' : 'stroke-[1.75]'}`} />
      {!isCollapsed && <span>{item.title}</span>}
    </Link>
  )
}
