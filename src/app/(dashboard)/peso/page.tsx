'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { DollarSign, Share2, MessageSquare, Home, ArrowRight } from 'lucide-react'
import type { PesoScores } from '@/types'

const pesoSchema = z.object({
  // Paid
  paid_job_sites: z.boolean(),
  paid_recruitment_agency: z.boolean(),
  paid_advertising: z.boolean(),
  paid_other: z.string().optional(),

  // Earned
  earned_media_coverage: z.boolean(),
  earned_awards: z.boolean(),
  earned_reviews: z.boolean(),
  earned_other: z.string().optional(),

  // Shared
  shared_sns: z.boolean(),
  shared_referral: z.boolean(),
  shared_community: z.boolean(),
  shared_other: z.string().optional(),

  // Owned
  owned_website: z.boolean(),
  owned_blog: z.boolean(),
  owned_newsletter: z.boolean(),
  owned_other: z.string().optional(),

  // Budget
  budget_total: z.string().optional(),
  budget_paid: z.string().optional(),
  budget_owned: z.string().optional(),

  // Goals
  goals: z.string().optional(),
})

type PesoFormData = z.infer<typeof pesoSchema>

interface PesoResult {
  scores: PesoScores
  recommendations: {
    paid: string[]
    earned: string[]
    shared: string[]
    owned: string[]
    overall: string
  }
  analysis: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
  }
}

const paidActivities = [
  { id: 'paid_job_sites', label: '求人媒体への掲載（有料）' },
  { id: 'paid_recruitment_agency', label: '人材紹介会社の利用' },
  { id: 'paid_advertising', label: '広告出稿（Web広告、交通広告等）' },
]

const earnedActivities = [
  { id: 'earned_media_coverage', label: 'メディア掲載・取材' },
  { id: 'earned_awards', label: '受賞歴・認定' },
  { id: 'earned_reviews', label: '口コミ・評判サイト' },
]

const sharedActivities = [
  { id: 'shared_sns', label: 'SNS運用（Instagram, Twitter, Facebook等）' },
  { id: 'shared_referral', label: '社員紹介制度' },
  { id: 'shared_community', label: 'コミュニティ活動・イベント参加' },
]

const ownedActivities = [
  { id: 'owned_website', label: '採用サイト・コーポレートサイト' },
  { id: 'owned_blog', label: 'ブログ・オウンドメディア' },
  { id: 'owned_newsletter', label: 'メールマガジン・ニュースレター' },
]

export default function PesoPage() {
  const { toast } = useToast()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<PesoResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
  } = useForm<PesoFormData>({
    resolver: zodResolver(pesoSchema),
    defaultValues: {
      paid_job_sites: false,
      paid_recruitment_agency: false,
      paid_advertising: false,
      earned_media_coverage: false,
      earned_awards: false,
      earned_reviews: false,
      shared_sns: false,
      shared_referral: false,
      shared_community: false,
      owned_website: false,
      owned_blog: false,
      owned_newsletter: false,
    },
  })

  const onSubmit = async (data: PesoFormData) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      // フォームデータを変換
      const diagnosisData = {
        currentActivities: {
          paid: [
            data.paid_job_sites && '求人媒体への掲載',
            data.paid_recruitment_agency && '人材紹介会社',
            data.paid_advertising && '広告出稿',
            data.paid_other,
          ].filter(Boolean) as string[],
          earned: [
            data.earned_media_coverage && 'メディア掲載',
            data.earned_awards && '受賞・認定',
            data.earned_reviews && '口コミサイト',
            data.earned_other,
          ].filter(Boolean) as string[],
          shared: [
            data.shared_sns && 'SNS運用',
            data.shared_referral && '社員紹介制度',
            data.shared_community && 'コミュニティ活動',
            data.shared_other,
          ].filter(Boolean) as string[],
          owned: [
            data.owned_website && '採用サイト',
            data.owned_blog && 'ブログ・オウンドメディア',
            data.owned_newsletter && 'メールマガジン',
            data.owned_other,
          ].filter(Boolean) as string[],
        },
        budget: {
          total: data.budget_total ? parseInt(data.budget_total) : undefined,
          breakdown: {
            paid: data.budget_paid ? parseInt(data.budget_paid) : undefined,
            owned: data.budget_owned ? parseInt(data.budget_owned) : undefined,
          },
        },
        goals: data.goals?.split('\n').filter(Boolean),
      }

      const response = await fetch('/api/peso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(diagnosisData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'PESO診断に失敗しました')
      }

      const result = await response.json()
      setResults(result.data)
      toast({
        title: 'PESO診断完了',
        description: '診断結果を確認してください',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PESO診断に失敗しました'
      setError(message)
      toast({
        title: 'エラー',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PESO診断</h1>
        <p className="text-gray-600">
          現在の採用活動をPESOモデルで分析し、改善ポイントを特定します
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 入力フォーム */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Paid Media */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  Paid Media（有料メディア）
                </CardTitle>
                <CardDescription>
                  費用を支払って利用しているメディアや施策
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {paidActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={activity.id}
                      checked={watch(activity.id as keyof PesoFormData) as boolean}
                      onCheckedChange={(checked) =>
                        setValue(activity.id as keyof PesoFormData, checked as boolean)
                      }
                    />
                    <Label htmlFor={activity.id} className="text-sm font-normal">
                      {activity.label}
                    </Label>
                  </div>
                ))}
                <div className="pt-2">
                  <Label className="text-sm text-gray-500">その他</Label>
                  <Input
                    placeholder="その他の有料施策"
                    {...register('paid_other')}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Earned Media */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  Earned Media（獲得メディア）
                </CardTitle>
                <CardDescription>
                  第三者からの評価・口コミ・メディア露出
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {earnedActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={activity.id}
                      checked={watch(activity.id as keyof PesoFormData) as boolean}
                      onCheckedChange={(checked) =>
                        setValue(activity.id as keyof PesoFormData, checked as boolean)
                      }
                    />
                    <Label htmlFor={activity.id} className="text-sm font-normal">
                      {activity.label}
                    </Label>
                  </div>
                ))}
                <div className="pt-2">
                  <Label className="text-sm text-gray-500">その他</Label>
                  <Input
                    placeholder="その他の獲得メディア"
                    {...register('earned_other')}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shared Media */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-purple-600" />
                  Shared Media（共有メディア）
                </CardTitle>
                <CardDescription>
                  SNSや社員紹介など、共有・拡散される施策
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sharedActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={activity.id}
                      checked={watch(activity.id as keyof PesoFormData) as boolean}
                      onCheckedChange={(checked) =>
                        setValue(activity.id as keyof PesoFormData, checked as boolean)
                      }
                    />
                    <Label htmlFor={activity.id} className="text-sm font-normal">
                      {activity.label}
                    </Label>
                  </div>
                ))}
                <div className="pt-2">
                  <Label className="text-sm text-gray-500">その他</Label>
                  <Input
                    placeholder="その他の共有施策"
                    {...register('shared_other')}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Owned Media */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="h-5 w-5 text-orange-600" />
                  Owned Media（自社メディア）
                </CardTitle>
                <CardDescription>
                  自社で所有・運営しているメディア
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ownedActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={activity.id}
                      checked={watch(activity.id as keyof PesoFormData) as boolean}
                      onCheckedChange={(checked) =>
                        setValue(activity.id as keyof PesoFormData, checked as boolean)
                      }
                    />
                    <Label htmlFor={activity.id} className="text-sm font-normal">
                      {activity.label}
                    </Label>
                  </div>
                ))}
                <div className="pt-2">
                  <Label className="text-sm text-gray-500">その他</Label>
                  <Input
                    placeholder="その他の自社メディア"
                    {...register('owned_other')}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 予算・目標 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">予算・目標（任意）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>採用予算（万円/年）</Label>
                    <Input
                      type="number"
                      placeholder="例: 500"
                      {...register('budget_total')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>有料施策費（万円/年）</Label>
                    <Input
                      type="number"
                      placeholder="例: 300"
                      {...register('budget_paid')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>自社メディア費（万円/年）</Label>
                    <Input
                      type="number"
                      placeholder="例: 100"
                      {...register('budget_owned')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>採用目標・課題</Label>
                  <Textarea
                    placeholder="例: 来年度は看護師を10名採用したい&#10;応募数は多いが内定辞退が課題"
                    {...register('goals')}
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isAnalyzing}>
              {isAnalyzing ? '診断中...' : 'PESO診断を実行'}
            </Button>
          </form>
        </div>

        {/* 診断結果 */}
        <div className="space-y-4">
          {results ? (
            <>
              {/* スコアカード */}
              <Card>
                <CardHeader>
                  <CardTitle>診断結果</CardTitle>
                  <CardDescription>
                    PESOモデルに基づく採用活動の評価
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Paid */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Paid</span>
                      </div>
                      <span className={`font-bold ${getScoreColor(results.scores.paid)}`}>
                        {results.scores.paid}点
                      </span>
                    </div>
                    <Progress
                      value={results.scores.paid}
                      className={`h-2 ${getProgressColor(results.scores.paid)}`}
                    />
                  </div>

                  {/* Earned */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Earned</span>
                      </div>
                      <span className={`font-bold ${getScoreColor(results.scores.earned)}`}>
                        {results.scores.earned}点
                      </span>
                    </div>
                    <Progress
                      value={results.scores.earned}
                      className={`h-2 ${getProgressColor(results.scores.earned)}`}
                    />
                  </div>

                  {/* Shared */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Shared</span>
                      </div>
                      <span className={`font-bold ${getScoreColor(results.scores.shared)}`}>
                        {results.scores.shared}点
                      </span>
                    </div>
                    <Progress
                      value={results.scores.shared}
                      className={`h-2 ${getProgressColor(results.scores.shared)}`}
                    />
                  </div>

                  {/* Owned */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">Owned</span>
                      </div>
                      <span className={`font-bold ${getScoreColor(results.scores.owned)}`}>
                        {results.scores.owned}点
                      </span>
                    </div>
                    <Progress
                      value={results.scores.owned}
                      className={`h-2 ${getProgressColor(results.scores.owned)}`}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 分析結果 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">分析サマリー</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700">{results.recommendations.overall}</p>

                  {results.analysis.strengths.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-600 mb-2">強み</h4>
                      <ul className="space-y-1">
                        {results.analysis.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-gray-600">
                            • {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.analysis.weaknesses.length > 0 && (
                    <div>
                      <h4 className="font-medium text-orange-600 mb-2">改善点</h4>
                      <ul className="space-y-1">
                        {results.analysis.weaknesses.map((w, i) => (
                          <li key={i} className="text-sm text-gray-600">
                            • {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.analysis.opportunities.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-600 mb-2">機会</h4>
                      <ul className="space-y-1">
                        {results.analysis.opportunities.map((o, i) => (
                          <li key={i} className="text-sm text-gray-600">
                            • {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* カテゴリ別レコメンデーション */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">カテゴリ別提案</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {results.recommendations.paid.length > 0 && (
                    <div>
                      <Badge className="bg-blue-100 text-blue-800 mb-2">Paid</Badge>
                      <ul className="space-y-1">
                        {results.recommendations.paid.map((r, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.recommendations.earned.length > 0 && (
                    <div>
                      <Badge className="bg-green-100 text-green-800 mb-2">Earned</Badge>
                      <ul className="space-y-1">
                        {results.recommendations.earned.map((r, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.recommendations.shared.length > 0 && (
                    <div>
                      <Badge className="bg-purple-100 text-purple-800 mb-2">Shared</Badge>
                      <ul className="space-y-1">
                        {results.recommendations.shared.map((r, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.recommendations.owned.length > 0 && (
                    <div>
                      <Badge className="bg-orange-100 text-orange-800 mb-2">Owned</Badge>
                      <ul className="space-y-1">
                        {results.recommendations.owned.map((r, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-full min-h-[600px] flex items-center justify-center">
              <CardContent className="text-center text-gray-500">
                <div className="space-y-4">
                  <div className="flex justify-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <DollarSign className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <div className="flex justify-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                      <Share2 className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                      <Home className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                  <p className="mt-6">左のフォームから現在の採用活動を入力して</p>
                  <p>PESO診断を実行してください</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
