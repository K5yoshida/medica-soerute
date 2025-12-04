'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Lock, CreditCard, FileText, CheckCircle2 } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '0',
    current: true,
    features: ['媒体マッチング 3回/月', 'PESO診断 無制限'],
  },
  {
    name: 'Starter',
    price: '9,800',
    current: false,
    features: ['媒体マッチング 10回/月', 'PESO診断 無制限', 'CSVエクスポート'],
  },
  {
    name: 'Professional',
    price: '19,800',
    current: false,
    features: ['媒体マッチング 50回/月', 'PESO診断 無制限', 'CSVエクスポート', '優先サポート'],
  },
]

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    // 保存処理をシミュレート
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSaving(false)
    setMessage({ type: 'success', text: '設定を保存しました' })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">設定</h1>
        <p className="text-muted-foreground mt-1">
          アカウント情報やプランの管理
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            プロフィール
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            セキュリティ
          </TabsTrigger>
          <TabsTrigger value="plan" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            プラン管理
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            請求履歴
          </TabsTrigger>
        </TabsList>

        {/* プロフィール */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">プロフィール情報</CardTitle>
              <CardDescription>
                アカウントの基本情報を編集できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {message && (
                <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">表示名</Label>
                  <Input
                    id="displayName"
                    placeholder="山田 太郎"
                    defaultValue=""
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">会社名</Label>
                  <Input
                    id="companyName"
                    placeholder="株式会社〇〇"
                    defaultValue=""
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  defaultValue=""
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  メールアドレスの変更はサポートまでお問い合わせください
                </p>
              </div>

              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? '保存中...' : '保存する'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* セキュリティ */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">パスワード変更</CardTitle>
              <CardDescription>
                パスワードを変更できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">現在のパスワード</Label>
                <Input
                  id="currentPassword"
                  type="password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">新しいパスワード</Label>
                <Input
                  id="newPassword"
                  type="password"
                />
                <p className="text-xs text-muted-foreground">
                  8文字以上、英大文字・英小文字・数字を含む
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                />
              </div>
              <Button>パスワードを変更</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* プラン管理 */}
        <TabsContent value="plan">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">現在のプラン</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">Free</span>
                      <Badge>現在のプラン</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      ¥0/月
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={plan.current ? 'border-primary' : ''}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">¥{plan.price}</span>
                      <span className="text-muted-foreground">/月</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.current ? 'outline' : 'default'}
                      className="w-full"
                      disabled={plan.current}
                    >
                      {plan.current ? '現在のプラン' : 'アップグレード'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 請求履歴 */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">請求履歴</CardTitle>
              <CardDescription>
                過去の請求書を確認できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>請求履歴はありません</p>
                <p className="text-sm mt-1">
                  有料プランにアップグレードすると、ここに請求書が表示されます
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
