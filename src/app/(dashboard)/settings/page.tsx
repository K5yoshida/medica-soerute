'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Save, User, Building, Mail, Lock } from 'lucide-react'

const profileSchema = z.object({
  companyName: z.string().optional(),
  email: z.string().email('有効なメールアドレスを入力してください'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  newPassword: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  confirmPassword: z.string().min(8, 'パスワードは8文字以上で入力してください'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const { toast } = useToast()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsUpdatingProfile(true)
    setProfileError(null)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'プロフィールの更新に失敗しました')
      }

      toast({
        title: '保存完了',
        description: 'プロフィールを更新しました',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'プロフィールの更新に失敗しました'
      setProfileError(message)
      toast({
        title: 'エラー',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsUpdatingPassword(true)
    setPasswordError(null)

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'パスワードの更新に失敗しました')
      }

      toast({
        title: '保存完了',
        description: 'パスワードを更新しました',
      })
      resetPassword()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'パスワードの更新に失敗しました'
      setPasswordError(message)
      toast({
        title: 'エラー',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-gray-600">
          アカウント情報とセキュリティ設定を管理します
        </p>
      </div>

      {/* プロフィール設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            プロフィール
          </CardTitle>
          <CardDescription>
            アカウントの基本情報を変更します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
            {profileError && (
              <Alert variant="destructive">
                <AlertDescription>{profileError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                メールアドレス
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@company.com"
                {...registerProfile('email')}
              />
              {profileErrors.email && (
                <p className="text-sm text-red-500">{profileErrors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                会社名（任意）
              </Label>
              <Input
                id="companyName"
                placeholder="株式会社〇〇"
                {...registerProfile('companyName')}
              />
            </div>

            <Button type="submit" disabled={isUpdatingProfile}>
              <Save className="h-4 w-4 mr-2" />
              {isUpdatingProfile ? '保存中...' : '変更を保存'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* パスワード変更 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            パスワード変更
          </CardTitle>
          <CardDescription>
            セキュリティのため定期的なパスワード変更を推奨します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            {passwordError && (
              <Alert variant="destructive">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">現在のパスワード</Label>
              <Input
                id="currentPassword"
                type="password"
                {...registerPassword('currentPassword')}
              />
              {passwordErrors.currentPassword && (
                <p className="text-sm text-red-500">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="newPassword">新しいパスワード</Label>
              <Input
                id="newPassword"
                type="password"
                {...registerPassword('newPassword')}
              />
              {passwordErrors.newPassword && (
                <p className="text-sm text-red-500">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...registerPassword('confirmPassword')}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-red-500">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isUpdatingPassword}>
              <Lock className="h-4 w-4 mr-2" />
              {isUpdatingPassword ? '更新中...' : 'パスワードを変更'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
