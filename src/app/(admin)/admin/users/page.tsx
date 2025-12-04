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
import type { User } from '@/types'

async function getUsers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Failed to fetch users:', error)
    return []
  }

  return (data as User[]) || []
}

export default async function AdminUsersPage() {
  const users = await getUsers()

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'premium':
        return 'default'
      case 'standard':
        return 'secondary'
      case 'light':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800'
      case 'admin':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ユーザー管理</h1>
        <p className="text-gray-600">登録ユーザーの一覧と管理</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
          <CardDescription>全{users.length}件</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>メールアドレス</TableHead>
                <TableHead>会社名</TableHead>
                <TableHead>プラン</TableHead>
                <TableHead>役割</TableHead>
                <TableHead>分析回数</TableHead>
                <TableHead>登録日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.company_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getPlanBadgeVariant(user.plan)}>
                      {user.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-1 rounded ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.monthly_analysis_count} /{' '}
                    {user.monthly_analysis_limit === -1
                      ? '∞'
                      : user.monthly_analysis_limit}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('ja-JP')}
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
