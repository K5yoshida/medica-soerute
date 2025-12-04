'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { ArrowRight, Loader2, Target, TrendingUp, ExternalLink, Save } from 'lucide-react'

type Step = 'input' | 'analyzing' | 'result'

interface MatchResult {
  rank: number
  mediaName: string
  score: number
  matchPoints: string[]
  estimatedTraffic: string
}

const jobCategories = [
  { value: 'nurse', label: '看護師' },
  { value: 'care', label: '介護職' },
  { value: 'pt', label: '理学療法士' },
  { value: 'ot', label: '作業療法士' },
  { value: 'st', label: '言語聴覚士' },
  { value: 'pharmacist', label: '薬剤師' },
  { value: 'doctor', label: '医師' },
  { value: 'other', label: 'その他' },
]

const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

const sampleResults: MatchResult[] = [
  {
    rank: 1,
    mediaName: '看護roo!',
    score: 92,
    matchPoints: ['看護師求人で高い検索順位', '東京都の求人が豊富', 'ユーザー層がマッチ'],
    estimatedTraffic: '約 15,000',
  },
  {
    rank: 2,
    mediaName: 'マイナビ看護師',
    score: 88,
    matchPoints: ['知名度が高い', '幅広い年齢層にリーチ', '転職意欲の高いユーザー'],
    estimatedTraffic: '約 12,000',
  },
  {
    rank: 3,
    mediaName: 'ナース人材バンク',
    score: 85,
    matchPoints: ['地域密着型の強み', '中堅層へのアプローチ', 'サポート体制が充実'],
    estimatedTraffic: '約 8,500',
  },
  {
    rank: 4,
    mediaName: 'ジョブメドレー',
    score: 78,
    matchPoints: ['直接応募が多い', '幅広い職種に対応', 'コストパフォーマンス良好'],
    estimatedTraffic: '約 6,200',
  },
  {
    rank: 5,
    mediaName: 'レバウェル看護',
    score: 72,
    matchPoints: ['若年層に強い', 'LINEでの連絡が可能', '面接対策が充実'],
    estimatedTraffic: '約 4,800',
  },
]

export default function MatchingPage() {
  const [step, setStep] = useState<Step>('input')
  const [, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    jobCategory: '',
    prefecture: '',
    salary: [300000],
    employmentType: '',
    features: '',
  })

  const handleAnalyze = async () => {
    setIsLoading(true)
    setStep('analyzing')

    // 分析をシミュレート（実際はAPIを呼び出す）
    await new Promise((resolve) => setTimeout(resolve, 3000))

    setIsLoading(false)
    setStep('result')
  }

  const handleReset = () => {
    setStep('input')
    setFormData({
      jobCategory: '',
      prefecture: '',
      salary: [300000],
      employmentType: '',
      features: '',
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">媒体マッチング</h1>
        <p className="text-muted-foreground mt-1">
          求人条件を入力すると、最適な媒体をAIが分析・提案します
        </p>
      </div>

      {/* 条件入力フェーズ */}
      {step === 'input' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">求人条件を入力</CardTitle>
            <CardDescription>
              募集する求人の条件を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jobCategory">
                  職種 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.jobCategory}
                  onValueChange={(value) =>
                    setFormData({ ...formData, jobCategory: value })
                  }
                >
                  <SelectTrigger id="jobCategory">
                    <SelectValue placeholder="職種を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prefecture">
                  勤務地（都道府県） <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.prefecture}
                  onValueChange={(value) =>
                    setFormData({ ...formData, prefecture: value })
                  }
                >
                  <SelectTrigger id="prefecture">
                    <SelectValue placeholder="都道府県を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {prefectures.map((pref) => (
                      <SelectItem key={pref} value={pref}>
                        {pref}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                想定給与（月給）: ¥{formData.salary[0].toLocaleString()}
              </Label>
              <Slider
                value={formData.salary}
                onValueChange={(value) =>
                  setFormData({ ...formData, salary: value })
                }
                min={150000}
                max={600000}
                step={10000}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>¥150,000</span>
                <span>¥600,000</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentType">雇用形態</Label>
              <Select
                value={formData.employmentType}
                onValueChange={(value) =>
                  setFormData({ ...formData, employmentType: value })
                }
              >
                <SelectTrigger id="employmentType">
                  <SelectValue placeholder="雇用形態を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fulltime">正社員</SelectItem>
                  <SelectItem value="contract">契約社員</SelectItem>
                  <SelectItem value="parttime">パート・アルバイト</SelectItem>
                  <SelectItem value="dispatch">派遣</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">求人の特徴・アピールポイント</Label>
              <Textarea
                id="features"
                placeholder="例: 日勤のみ、残業少なめ、託児所あり、教育制度充実など"
                value={formData.features}
                onChange={(e) =>
                  setFormData({ ...formData, features: e.target.value })
                }
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleAnalyze}
              disabled={!formData.jobCategory || !formData.prefecture}
            >
              分析を開始
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 分析中フェーズ */}
      {step === 'analyzing' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              <h3 className="text-lg font-semibold mb-2">分析中...</h3>
              <p className="text-muted-foreground mb-6">
                求人条件に最適な媒体を分析しています
              </p>
              <Progress value={66} className="max-w-xs mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 結果表示フェーズ */}
      {step === 'result' && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    マッチング結果
                  </CardTitle>
                  <CardDescription>
                    {jobCategories.find((c) => c.value === formData.jobCategory)?.label} × {formData.prefecture}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    条件を変更
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            {sampleResults.map((result) => (
              <Card key={result.rank} className={result.rank === 1 ? 'border-primary' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        result.rank === 1
                          ? 'bg-primary text-white'
                          : result.rank === 2
                          ? 'bg-amber-100 text-amber-700'
                          : result.rank === 3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {result.rank}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{result.mediaName}</h3>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          スコア {result.score}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {result.matchPoints.map((point, i) => (
                          <Badge key={i} variant="outline">
                            {point}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          推定月間流入: {result.estimatedTraffic}
                        </p>
                        <Button variant="ghost" size="sm">
                          詳細を見る
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
