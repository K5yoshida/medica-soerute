'use client'

import { useState, useEffect } from 'react'

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed'

export function AdminMain({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved === 'true') {
      setSidebarCollapsed(true)
    }

    const handleSidebarToggle = (e: CustomEvent<{ collapsed: boolean }>) => {
      setSidebarCollapsed(e.detail.collapsed)
    }

    window.addEventListener('admin-sidebar-toggle', handleSidebarToggle as EventListener)
    return () => {
      window.removeEventListener('admin-sidebar-toggle', handleSidebarToggle as EventListener)
    }
  }, [])

  const marginLeft = mounted ? (sidebarCollapsed ? '64px' : '220px') : '220px'

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
