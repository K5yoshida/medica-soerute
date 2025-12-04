'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, Target, BarChart3, ExternalLink } from 'lucide-react'

// サンプルデータ（実際はAPIから取得）
const sampleHistory = [
  {
    id: '1',
    type: 'matching',
    summary: '看護師 × 東京都',
    createdAt: '2024-01-15 14:30',
    status: 'completed',
  },
  {
    id: '2',
    type: 'peso',
    summary: 'PESO診断',
    createdAt: '2024-01-14 10:00',
    status: 'completed',
  },
  {
    id: '3',
    type: 'matching',
    summary: '介護職 × 大阪府',
    createdAt: '2024-01-12 16:45',
    status: 'completed',
  },
]

export default function HistoryPage() {
  const [filter, setFilter] = useState<'all' | 'matching' | 'peso'>('all')

  const filteredHistory = sampleHistory.filter((item) => {
    if (filter === 'all') return true
    return item.type === filter
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">利用履歴</h1>
        <p className="text-muted-foreground mt-1">
          過去の分析・診断履歴を確認
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="matching">
            <Target className="h-4 w-4 mr-2" />
            媒体マッチング
          </TabsTrigger>
          <TabsTrigger value="peso">
            <BarChart3 className="h-4 w-4 mr-2" />
            PESO診断
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {filteredHistory.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日時</TableHead>
                      <TableHead>種別</TableHead>
                      <TableHead>サマリー</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">
                          {item.createdAt}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {item.type === 'matching' ? (
                              <><Target className="h-3 w-3 mr-1" />媒体マッチング</>
                            ) : (
                              <><BarChart3 className="h-3 w-3 mr-1" />PESO診断</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.summary}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            詳細
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>履歴がありません</p>
                  <p className="text-sm mt-1">
                    媒体マッチングやPESO診断を実行すると、ここに履歴が表示されます
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
