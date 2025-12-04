import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { MediaMaster } from '@/types'

async function getMedia() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('media_master')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to fetch media:', error)
    return []
  }

  return (data as MediaMaster[]) || []
}

export default async function AdminMediaPage() {
  const mediaList = await getMedia()

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      nursing: '看護師',
      welfare: '介護職',
      pharmacy: '薬剤師',
      rehabilitation: 'リハビリ',
      dental: '歯科',
      general: '総合',
    }
    return labels[category] || category
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">媒体管理</h1>
          <p className="text-gray-600">登録媒体の一覧と管理</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>媒体一覧</CardTitle>
          <CardDescription>全{mediaList.length}件</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>媒体名</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead>説明</TableHead>
                <TableHead>価格帯</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>更新日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mediaList.map((media) => (
                <TableRow key={media.id}>
                  <TableCell className="font-medium">{media.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getCategoryLabel(media.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {media.description || '-'}
                  </TableCell>
                  <TableCell>{media.price_range || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={media.is_active ? 'default' : 'secondary'}>
                      {media.is_active ? 'アクティブ' : '非アクティブ'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(media.updated_at).toLocaleDateString('ja-JP')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
