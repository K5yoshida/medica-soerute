'use client'

import { useState, useEffect } from 'react'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 初期状態をlocalStorageから取得
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved === 'true') {
      setSidebarCollapsed(true)
    }

    // サイドバーのトグルイベントをリッスン
    const handleSidebarToggle = (e: CustomEvent<{ collapsed: boolean }>) => {
      setSidebarCollapsed(e.detail.collapsed)
    }

    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener)
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener)
    }
  }, [])

  // マウント前は初期状態でレンダリング
  const marginLeft = mounted ? (sidebarCollapsed ? '64px' : '240px') : '240px'

  return (
    <main
      className="transition-all duration-300"
      style={{
        flex: 1,
        marginLeft,
        minHeight: '100vh',
      }}
    >
      {children}
    </main>
  )
}
