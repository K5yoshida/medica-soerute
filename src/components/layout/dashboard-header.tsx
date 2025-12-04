'use client'

import { Bell, HelpCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function DashboardHeader() {
  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      {/* 検索 */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="媒体を検索..."
            className="pl-9 bg-[hsl(var(--bg-subtle))] border-0"
          />
        </div>
      </div>

      {/* 右側アクション */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <HelpCircle className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
