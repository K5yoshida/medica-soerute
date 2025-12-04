'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import type { MatchedMedia, AnalysisDetail } from '@/types'

const analysisSchema = z.object({
  jobType: z.string().min(1, '職種を選択してください'),
  employmentType: z.string().min(1, '雇用形態を選択してください'),
  location: z.string().min(1, '勤務地を入力してください'),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  qualifications: z.string().optional(),
  experience: z.string().optional(),
  urgency: z.string().optional(),
  additionalInfo: z.string().optional(),
})

type AnalysisFormData = z.infer<typeof analysisSchema>

const jobTypes = [
  { value: 'nurse', label: '看護師' },
  { value: 'care_worker', label: '介護職' },
  { value: 'pharmacist', label: '薬剤師' },
  { value: 'dental_hygienist', label: '歯科衛生士' },
  { value: 'pt', label: '理学療法士' },
  { value: 'ot', label: '作業療法士' },
  { value: 'st', label: '言語聴覚士' },
  { value: 'medical_clerk', label: '医療事務' },
  { value: 'other', label: 'その他' },
]

const employmentTypes = [
  { value: 'full_time', label: '正社員' },
  { value: 'part_time', label: 'パート・アルバイト' },
  { value: 'contract', label: '契約社員' },
  { value: 'dispatch', label: '派遣社員' },
]

const urgencyLevels = [
  { value: 'low', label: '低（3ヶ月以上）' },
  { value: 'medium', label: '中（1-3ヶ月）' },
  { value: 'high', label: '高（1ヶ月以内）' },
]

export default function AnalysisPage() {
  const { toast } = useToast()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<{
    matchedMedia: MatchedMedia[]
    analysisDetail: AnalysisDetail
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisSchema),
  })

  const onSubmit = async (data: AnalysisFormData) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobType: jobTypes.find((j) => j.value === data.jobType)?.label,
          employmentType: employmentTypes.find((e) => e.value === data.employmentType)?.label,
          location: data.location,
          salary: {
            min: data.salaryMin ? parseInt(data.salaryMin) : undefined,
            max: data.salaryMax ? parseInt(data.salaryMax) : undefined,
          },
          qualifications: data.qualifications?.split(',').map((q) => q.trim()).filter(Boolean),
          experience: data.experience,
          urgency: data.urgency as 'low' | 'medium' | 'high' | undefined,
          additionalInfo: data.additionalInfo,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || '分析に失敗しました')
      }

      const result = await response.json()
      setResults(result.data)
      toast({
        title: '分析完了',
        description: `${result.data.matchedMedia.length}件の媒体がマッチしました`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '分析に失敗しました'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">媒体分析</h1>
        <p className="text-gray-600">
          求人条件を入力して、最適な求人媒体を分析します
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 入力フォーム */}
        <Card>
          <CardHeader>
            <CardTitle>求人条件</CardTitle>
            <CardDescription>
              募集する求人の条件を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>職種 *</Label>
                  <Select onValueChange={(value) => setValue('jobType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.jobType && (
                    <p className="text-sm text-red-500">{errors.jobType.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>雇用形態 *</Label>
                  <Select onValueChange={(value) => setValue('employmentType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {employmentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.employmentType && (
                    <p className="text-sm text-red-500">{errors.employmentType.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>勤務地 *</Label>
                <Input
                  placeholder="例: 東京都渋谷区"
                  {...register('location')}
                />
                {errors.location && (
                  <p className="text-sm text-red-500">{errors.location.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>給与下限（万円）</Label>
                  <Input
                    type="number"
                    placeholder="例: 300"
                    {...register('salaryMin')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>給与上限（万円）</Label>
                  <Input
                    type="number"
                    placeholder="例: 500"
                    {...register('salaryMax')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>必要資格（カンマ区切り）</Label>
                <Input
                  placeholder="例: 正看護師, 准看護師"
                  {...register('qualifications')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>経験年数</Label>
                  <Input
                    placeholder="例: 3年以上"
                    {...register('experience')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>採用緊急度</Label>
                  <Select onValueChange={(value) => setValue('urgency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {urgencyLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>その他の条件・希望</Label>
                <Textarea
                  placeholder="その他、媒体選定に考慮してほしい条件があれば入力してください"
                  {...register('additionalInfo')}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isAnalyzing}>
                {isAnalyzing ? '分析中...' : '分析を実行'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 分析結果 */}
        <div className="space-y-4">
          {results ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>分析結果</CardTitle>
                  <CardDescription>
                    {results.matchedMedia.length}件の媒体がマッチしました
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    {results.analysisDetail.overallAssessment}
                  </p>
                  {results.analysisDetail.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">推奨アクション</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                        {results.analysisDetail.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {results.matchedMedia.map((media, index) => (
                <Card key={media.mediaId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="text-blue-600">#{index + 1}</span>
                          {media.mediaName}
                        </CardTitle>
                      </div>
                      <Badge
                        variant={
                          media.matchScore >= 80
                            ? 'default'
                            : media.matchScore >= 60
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        マッチ度 {media.matchScore}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">マッチング理由</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {media.matchReasons.map((reason, i) => (
                          <li key={i}>- {reason}</li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-medium mb-1 text-green-600">
                          強み
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {media.strengths.map((s, i) => (
                            <li key={i}>- {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1 text-orange-600">
                          注意点
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {media.considerations.map((c, i) => (
                            <li key={i}>- {c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {(media.estimatedCost || media.recommendedPeriod) && (
                      <>
                        <Separator />
                        <div className="flex gap-4 text-sm">
                          {media.estimatedCost && (
                            <div>
                              <span className="text-gray-500">想定費用: </span>
                              <span className="font-medium">
                                {media.estimatedCost}
                              </span>
                            </div>
                          )}
                          {media.recommendedPeriod && (
                            <div>
                              <span className="text-gray-500">
                                推奨掲載期間:{' '}
                              </span>
                              <span className="font-medium">
                                {media.recommendedPeriod}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center text-gray-500">
                <p>左のフォームから求人条件を入力して</p>
                <p>分析を実行してください</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
