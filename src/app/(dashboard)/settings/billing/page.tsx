'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  CreditCard,
  Check,
  Zap,
  Crown,
  Building2,
  ExternalLink,
  Loader2,
} from 'lucide-react'

interface Plan {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  highlighted?: boolean
  icon: React.ReactNode
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'フリー',
    price: 0,
    description: '個人での利用や試用に最適',
    features: [
      '月3回の媒体分析',
      '基本的な分析レポート',
      'メールサポート',
    ],
    icon: <Zap className="h-6 w-6" />,
  },
  {
    id: 'light',
    name: 'ライト',
    price: 4980,
    description: '小規模チームでの活用に',
    features: [
      '月10回の媒体分析',
      'PESO診断機能',
      '施策提案機能',
      'メールサポート',
    ],
    icon: <Zap className="h-6 w-6 text-blue-600" />,
  },
  {
    id: 'standard',
    name: 'スタンダード',
    price: 9980,
    description: '中規模組織での本格活用に',
    highlighted: true,
    features: [
      '月30回の媒体分析',
      'PESO診断機能',
      '施策提案機能',
      'PDFエクスポート',
      '優先サポート',
    ],
    icon: <Crown className="h-6 w-6 text-yellow-600" />,
  },
  {
    id: 'premium',
    name: 'プレミアム',
    price: 29800,
    description: '大規模組織・代理店向け',
    features: [
      '無制限の媒体分析',
      'PESO診断機能',
      '施策提案機能',
      'PDFエクスポート',
      'カスタムレポート',
      '専任サポート',
    ],
    icon: <Building2 className="h-6 w-6 text-purple-600" />,
  },
]

function BillingContent() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)

  // URLパラメータからの通知処理
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success === 'true') {
      toast({
        title: 'お支払い完了',
        description: 'プランのアップグレードが完了しました',
      })
    } else if (canceled === 'true') {
      toast({
        title: 'キャンセル',
        description: 'お支払いがキャンセルされました',
        variant: 'destructive',
      })
    }
  }, [searchParams, toast])

  // ユーザー情報を取得
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          setCurrentPlan(data.data?.plan || 'free')
        }
      } catch (error) {
        console.error('Failed to fetch user:', error)
      }
    }
    fetchUser()
  }, [])

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free' || planId === currentPlan) return

    setIsLoading(true)
    setLoadingPlanId(planId)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'チェックアウトの作成に失敗しました')
      }

      const { data } = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'エラーが発生しました'
      toast({
        title: 'エラー',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setLoadingPlanId(null)
    }
  }

  const handleManageSubscription = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'ポータルの作成に失敗しました')
      }

      const { data } = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'エラーが発生しました'
      toast({
        title: 'エラー',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">プラン・請求</h1>
        <p className="text-gray-600">
          プランの変更や請求情報を管理します
        </p>
      </div>

      {/* 現在のプラン */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            現在のプラン
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold capitalize">{currentPlan}プラン</p>
              <p className="text-sm text-gray-500">
                {currentPlan === 'free'
                  ? '月3回まで分析可能'
                  : currentPlan === 'premium'
                  ? '無制限で分析可能'
                  : `月${currentPlan === 'light' ? '10' : '30'}回まで分析可能`}
              </p>
            </div>
            {currentPlan !== 'free' && (
              <Button variant="outline" onClick={handleManageSubscription} disabled={isLoading}>
                <ExternalLink className="h-4 w-4 mr-2" />
                請求管理
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* プラン一覧 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">プランを選択</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.highlighted ? 'border-blue-500 border-2' : ''
              } ${currentPlan === plan.id ? 'bg-blue-50' : ''}`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600">
                  おすすめ
                </Badge>
              )}
              {currentPlan === plan.id && (
                <Badge className="absolute -top-3 right-4 bg-green-600">
                  現在のプラン
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">{plan.icon}</div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <span className="text-3xl font-bold">
                    ¥{plan.price.toLocaleString()}
                  </span>
                  <span className="text-gray-500">/月</span>
                </div>

                <Separator />

                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={currentPlan === plan.id ? 'outline' : 'default'}
                  disabled={
                    isLoading ||
                    currentPlan === plan.id ||
                    (plan.id === 'free' && currentPlan !== 'free')
                  }
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {loadingPlanId === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      処理中...
                    </>
                  ) : currentPlan === plan.id ? (
                    '現在のプラン'
                  ) : plan.id === 'free' ? (
                    'フリープラン'
                  ) : (
                    'このプランに変更'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 注意事項 */}
      <Alert>
        <AlertDescription>
          プランの変更は即座に反映されます。アップグレードの場合は日割り計算で請求され、ダウングレードの場合は次回請求日から新しいプランが適用されます。
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  )
}
