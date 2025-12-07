'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Upload,
  Database,
  CreditCard,
  BarChart3,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Globe,
  Tags,
  TrendingUp,
} from 'lucide-react'
import type { User } from '@/types'
import { createClient } from '@/lib/supabase/client'

/**
 * Admin Sidebar
 *
 * Design spec: 09_画面一覧.md - SC-901〜909
 */

interface AdminSidebarProps {
  user: User
}

const mainNavItems = [
  { title: 'ダッシュボード', href: '/admin', icon: LayoutDashboard },
  { title: 'ユーザー管理', href: '/admin/users', icon: Users },
  { title: 'ドメイン管理', href: '/admin/domains', icon: Globe },
  { title: 'CSVインポート', href: '/admin/import', icon: Upload },
  { title: 'キーワード管理', href: '/admin/keywords', icon: Tags },
  { title: '媒体マスター', href: '/admin/media', icon: Database },
  { title: 'トレンド分析', href: '/admin/trends', icon: TrendingUp },
]

const analyticsNavItems = [
  { title: '課金管理', href: '/admin/billing', icon: CreditCard },
  { title: '利用分析', href: '/admin/analytics', icon: BarChart3 },
  { title: 'システムログ', href: '/admin/logs', icon: FileText },
]

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed'

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

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
    window.dispatchEvent(new CustomEvent('admin-sidebar-toggle', { detail: { collapsed: newState } }))
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const sidebarWidth = isCollapsed ? '64px' : '220px'

  if (!mounted) {
    return (
      <aside
        className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-50"
        style={{
          width: '220px',
          background: '#1E1B4B',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      />
    )
  }

  return (
    <aside
      className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-50 transition-all duration-300"
      style={{
        width: sidebarWidth,
        background: '#1E1B4B',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: isCollapsed ? '20px 8px' : '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <Link href="/admin" className="no-underline">
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  background: '#7C3AED',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                A
              </div>
            </Link>
            <button
              onClick={toggleCollapse}
              title="サイドバーを展開"
              className="p-1.5 rounded transition-colors"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#A5B4FC',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = '#FAFAFA'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#A5B4FC'
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Link href="/admin" className="flex items-center gap-3 no-underline">
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  background: '#7C3AED',
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
                A
              </div>
              <div>
                <div
                  style={{
                    color: '#FAFAFA',
                    fontSize: '14px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ADMIN
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#A5B4FC',
                    marginTop: '1px',
                    fontWeight: 400,
                  }}
                >
                  管理画面
                </div>
              </div>
            </Link>
            <button
              onClick={toggleCollapse}
              title="サイドバーを畳む"
              className="flex items-center gap-2 p-1.5 rounded transition-colors w-full"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: 'none',
                color: '#A5B4FC',
                cursor: 'pointer',
                fontSize: '11px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = '#FAFAFA'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.color = '#A5B4FC'
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>サイドバーを畳む</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: '12px 8px',
          overflowY: 'auto',
        }}
      >
        {/* メインセクション */}
        <div style={{ marginBottom: '20px' }}>
          {!isCollapsed && (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: '#A5B4FC',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '0 12px',
                marginBottom: '8px',
              }}
            >
              管理
            </div>
          )}
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} isCollapsed={isCollapsed} />
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'rgba(255,255,255,0.08)',
            margin: isCollapsed ? '12px 4px' : '12px 12px',
          }}
        />

        {/* 分析セクション */}
        <div style={{ marginBottom: '20px' }}>
          {!isCollapsed && (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: '#A5B4FC',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '0 12px',
                marginBottom: '8px',
              }}
            >
              分析
            </div>
          )}
          {analyticsNavItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} isCollapsed={isCollapsed} />
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'rgba(255,255,255,0.08)',
            margin: isCollapsed ? '12px 4px' : '12px 12px',
          }}
        />

        {/* ダッシュボードに戻る */}
        <Link
          href="/dashboard"
          title={isCollapsed ? 'ダッシュボードに戻る' : undefined}
          className="flex items-center no-underline transition-all"
          style={{
            gap: isCollapsed ? '0' : '12px',
            padding: isCollapsed ? '8px' : '8px 12px',
            borderRadius: '6px',
            color: '#A5B4FC',
            background: 'transparent',
            marginBottom: '2px',
            fontSize: '13px',
            fontWeight: 400,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            e.currentTarget.style.color = '#FAFAFA'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#A5B4FC'
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          {!isCollapsed && <span>ダッシュボードに戻る</span>}
        </Link>
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: isCollapsed ? '12px 8px' : '16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#7C3AED',
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
                <div style={{ fontSize: '11px', color: '#A5B4FC' }}>
                  管理者
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="ログアウト"
                className="p-1 rounded transition-colors"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A5B4FC',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.color = '#FAFAFA'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#A5B4FC'
                }}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {isCollapsed && (
          <button
            onClick={handleLogout}
            title="ログアウト"
            className="w-full flex items-center justify-center mt-2 p-2 rounded transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A5B4FC',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = '#FAFAFA'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#A5B4FC'
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  )
}

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
        color: isActive ? '#A78BFA' : '#A5B4FC',
        background: isActive ? 'rgba(167,139,250,0.15)' : 'transparent',
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
          e.currentTarget.style.color = '#A5B4FC'
        }
      }}
    >
      <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2]' : 'stroke-[1.75]'}`} />
      {!isCollapsed && <span>{item.title}</span>}
    </Link>
  )
}
