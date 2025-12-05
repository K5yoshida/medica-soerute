'use client'

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
} from 'lucide-react'
import type { User } from '@/types'
import { createClient } from '@/lib/supabase/client'

/**
 * Dashboard Sidebar
 *
 * Design spec: 03_ブランディングとデザインガイド.md - 3.9 サイドバー詳細仕様
 *
 * Structure:
 * - width: 240px (var(--sidebar-width))
 * - bg: #18181B (var(--sidebar-bg))
 * - position: fixed
 * - border-right: 1px solid rgba(255,255,255,0.06)
 *
 * Header: padding 20px 16px
 * - Logo icon: 32x32, bg: primary, radius: 6px
 * - Text: 14px, weight: 600, color: #FAFAFA
 * - Sub text: 11px, weight: 400, color: #A1A1AA
 *
 * Nav: padding 12px 8px
 * - Section title: 11px, uppercase, letter-spacing: 0.04em
 * - Nav item: 13px, padding: 8px 12px, radius: 6px
 * - Divider: height: 1px, bg: rgba(255,255,255,0.06)
 *
 * Footer: padding 16px
 * - Avatar: 28x28, radius: 50%
 * - Name: 13px, weight: 500, color: #FAFAFA
 * - Role: 11px, color: #A1A1AA
 *
 * Nav States:
 * - normal: bg transparent, color #A1A1AA, weight 400
 * - hover: bg rgba(255,255,255,0.04), color #FAFAFA
 * - active: bg rgba(13,148,136,0.12), color #0D9488, weight 500
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

  return (
    <aside
      className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-50"
      style={{
        width: '240px',
        background: '#18181B',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header - padding: 20px 16px */}
      <div
        style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link href="/dashboard" className="flex items-center gap-3 no-underline">
          {/* Logo icon: 32x32, bg: primary, radius: 6px */}
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
            }}
          >
            M
          </div>
          <div>
            {/* Text: 14px, weight: 600, color: #FAFAFA, letter-spacing: -0.02em */}
            <div
              style={{
                color: '#FAFAFA',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              MEDICA SOERUTE
            </div>
            {/* Sub text: 11px, weight: 400, color: #A1A1AA */}
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
        </Link>
      </div>

      {/* Navigation - padding: 12px 8px */}
      <nav
        style={{
          flex: 1,
          padding: '12px 8px',
          overflowY: 'auto',
        }}
      >
        {/* 分析セクション */}
        <div style={{ marginBottom: '20px' }}>
          {/* Section title: 11px, uppercase, letter-spacing: 0.04em */}
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
          {analysisNavItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
          ))}
        </div>

        {/* Divider: height: 1px, bg: rgba(255,255,255,0.06), margin: 12px */}
        <div
          style={{
            height: '1px',
            background: 'rgba(255,255,255,0.06)',
            margin: '12px 12px',
          }}
        />

        {/* 管理セクション */}
        <div style={{ marginBottom: '20px' }}>
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
          {manageNavItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'rgba(255,255,255,0.06)',
            margin: '12px 12px',
          }}
        />

        {/* 設定 */}
        <NavLink
          item={{ title: '設定', href: '/dashboard/settings', icon: Settings }}
          isActive={isActive('/dashboard/settings')}
        />
      </nav>

      {/* Footer - padding: 16px */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Avatar: 28x28, radius: 50% */}
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
            }}
          >
            {user.company_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            {/* Name: 13px, weight: 500, color: #FAFAFA */}
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
            {/* Role: 11px, color: #A1A1AA */}
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
        </div>
      </div>
    </aside>
  )
}

/**
 * Nav Link Component
 *
 * States:
 * - normal: bg transparent, color #A1A1AA, weight 400
 * - hover: bg rgba(255,255,255,0.04), color #FAFAFA
 * - active: bg rgba(13,148,136,0.12), color #0D9488, weight 500
 *
 * Style:
 * - padding: 8px 12px
 * - border-radius: 6px
 * - font-size: 13px
 * - gap: 12px
 * - margin-bottom: 2px
 */
interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className="flex items-center no-underline transition-all"
      style={{
        gap: '12px',
        padding: '8px 12px',
        borderRadius: '6px',
        color: isActive ? '#0D9488' : '#A1A1AA',
        background: isActive ? 'rgba(13,148,136,0.12)' : 'transparent',
        marginBottom: '2px',
        fontSize: '13px',
        fontWeight: isActive ? 500 : 400,
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
      <span>{item.title}</span>
    </Link>
  )
}
