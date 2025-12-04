'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  BarChart3,
  Megaphone,
  Share2,
  Home,
  Loader2,
  Download,
} from 'lucide-react'

type Step = 1 | 2 | 3 | 'analyzing' | 'result'

interface PESOResult {
  paid: { score: number; status: 'active' | 'low' | 'inactive' }
  earned: { score: number; status: 'active' | 'low' | 'inactive' }
  shared: { score: number; status: 'active' | 'low' | 'inactive' }
  owned: { score: number; status: 'active' | 'low' | 'inactive' }
  totalScore: number
}

const pesoCategories = [
  { key: 'paid', name: 'Paid', icon: Megaphone, color: 'bg-blue-100 text-blue-700' },
  { key: 'earned', name: 'Earned', icon: BarChart3, color: 'bg-amber-100 text-amber-700' },
  { key: 'shared', name: 'Shared', icon: Share2, color: 'bg-pink-100 text-pink-700' },
  { key: 'owned', name: 'Owned', icon: Home, color: 'bg-green-100 text-green-700' },
]

const step1Channels = {
  paid: [
    { id: 'p1', label: '求人媒体（有料掲載）' },
    { id: 'p2', label: 'Indeed広告' },
    { id: 'p3', label: 'Google広告' },
    { id: 'p4', label: 'SNS広告' },
    { id: 'p5', label: '人材紹介会社' },
  ],
  earned: [
    { id: 'e1', label: '口コミサイト' },
    { id: 'e2', label: 'プレスリリース' },
    { id: 'e3', label: 'メディア掲載' },
    { id: 'e4', label: '表彰・認定' },
  ],
  shared: [
    { id: 's1', label: 'Twitter/X' },
    { id: 's2', label: 'Instagram' },
    { id: 's3', label: 'Facebook' },
    { id: 's4', label: 'LINE' },
    { id: 's5', label: 'YouTube' },
  ],
  owned: [
    { id: 'o1', label: '採用サイト' },
    { id: 'o2', label: 'コーポレートサイト' },
    { id: 'o3', label: 'ブログ・オウンドメディア' },
    { id: 'o4', label: 'メールマガジン' },
  ],
}

const depthLevels = [
  { value: '0', title: 'Lv.0', label: '未実施', desc: '実施していない' },
  { value: '1', title: 'Lv.1', label: '基本', desc: '最低限の対応' },
  { value: '2', title: 'Lv.2', label: '発展', desc: '工夫を加えて実施' },
  { value: '3', title: 'Lv.3', label: '高度', desc: '戦略的に活用' },
  { value: '4', title: 'Lv.4', label: '最適化', desc: 'データ活用・A/Bテスト' },
]

export default function PESOPage() {
  const [step, setStep] = useState<Step>(1)
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [depths, setDepths] = useState<Record<string, string>>({
    photo: '1',
    text: '2',
  })

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    )
  }

  const handleAnalyze = async () => {
    setStep('analyzing')
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setStep('result')
  }

  const result: PESOResult = {
    paid: { score: 75, status: 'active' },
    earned: { score: 45, status: 'low' },
    shared: { score: 30, status: 'inactive' },
    owned: { score: 60, status: 'low' },
    totalScore: 53,
  }

  const getStatusChip = (status: 'active' | 'low' | 'inactive') => {
    switch (status) {
      case 'active':
        return <span className="tactic-chip tactic-chip-active">実施中</span>
      case 'low':
        return <span className="tactic-chip tactic-chip-low">要改善</span>
      case 'inactive':
        return <span className="tactic-chip tactic-chip-inactive">未実施</span>
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">PESO診断</h1>
        <p className="text-muted-foreground mt-1">
          採用活動をPaid・Earned・Shared・Ownedの4軸で診断
        </p>
      </div>

      {/* ステップインジケーター */}
      {typeof step === 'number' && (
        <div className="peso-survey-progress">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`peso-survey-progress-step ${
                s === step ? 'current' : s < step ? 'completed' : 'pending'
              }`}
            >
              <div className="peso-survey-progress-number">
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              <span className="text-sm hidden sm:inline">
                {s === 1 ? 'チャネル選択' : s === 2 ? '詳細設定' : '確認'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Step 1: チャネル選択 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 1: 利用中のチャネルを選択</CardTitle>
            <CardDescription>
              現在利用している採用チャネルをすべて選択してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(step1Channels).map(([category, channels]) => {
              const pesoInfo = pesoCategories.find((p) => p.key === category)
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={pesoInfo?.color}>{pesoInfo?.name}</Badge>
                  </div>
                  <div className="peso-survey-grid">
                    {channels.map((channel) => (
                      <label
                        key={channel.id}
                        className={`peso-survey-item ${
                          selectedChannels.includes(channel.id) ? 'selected' : ''
                        }`}
                      >
                        <Checkbox
                          checked={selectedChannels.includes(channel.id)}
                          onCheckedChange={() => handleChannelToggle(channel.id)}
                        />
                        <span className="text-sm">{channel.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}

            <Button
              className="w-full"
              onClick={() => setStep(2)}
              disabled={selectedChannels.length === 0}
            >
              次へ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: 深度設定 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 2: 詳細設定</CardTitle>
            <CardDescription>
              各チャネルの活用度を選択してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>求人写真の活用度</Label>
              <RadioGroup
                value={depths.photo}
                onValueChange={(value) => setDepths({ ...depths, photo: value })}
                className="grid grid-cols-5 gap-2"
              >
                {depthLevels.map((level) => (
                  <label key={level.value} className="peso-survey-scale-option">
                    <RadioGroupItem value={level.value} className="sr-only" />
                    <div className="peso-survey-scale-card">
                      <div className="peso-survey-scale-level">{level.title}</div>
                      <div className="peso-survey-scale-title">{level.label}</div>
                      <div className="peso-survey-scale-desc">{level.desc}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label>求人テキストの活用度</Label>
              <RadioGroup
                value={depths.text}
                onValueChange={(value) => setDepths({ ...depths, text: value })}
                className="grid grid-cols-5 gap-2"
              >
                {depthLevels.map((level) => (
                  <label key={level.value} className="peso-survey-scale-option">
                    <RadioGroupItem value={level.value} className="sr-only" />
                    <div className="peso-survey-scale-card">
                      <div className="peso-survey-scale-level">{level.title}</div>
                      <div className="peso-survey-scale-title">{level.label}</div>
                      <div className="peso-survey-scale-desc">{level.desc}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                戻る
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                次へ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 確認 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 3: 確認</CardTitle>
            <CardDescription>
              入力内容を確認して診断を開始してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">選択したチャネル</h4>
              <div className="flex flex-wrap gap-2">
                {selectedChannels.map((id) => {
                  const channel = Object.values(step1Channels)
                    .flat()
                    .find((c) => c.id === id)
                  return (
                    <Badge key={id} variant="secondary">
                      {channel?.label}
                    </Badge>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-1">求人写真</h4>
                <p className="text-sm text-muted-foreground">
                  {depthLevels.find((l) => l.value === depths.photo)?.label}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">求人テキスト</h4>
                <p className="text-sm text-muted-foreground">
                  {depthLevels.find((l) => l.value === depths.text)?.label}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                戻る
              </Button>
              <Button onClick={handleAnalyze} className="flex-1">
                診断を開始
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分析中 */}
      {step === 'analyzing' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              <h3 className="text-lg font-semibold mb-2">診断中...</h3>
              <p className="text-muted-foreground">
                採用活動を分析しています
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 結果表示 */}
      {step === 'result' && (
        <>
          {/* 総合スコア */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>PESO診断結果</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  レポート出力
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-primary mb-2">
                  {result.totalScore}
                  <span className="text-xl text-muted-foreground">/100</span>
                </div>
                <p className="text-muted-foreground">総合スコア</p>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                {pesoCategories.map((cat) => {
                  const data = result[cat.key as keyof typeof result] as {
                    score: number
                    status: 'active' | 'low' | 'inactive'
                  }
                  return (
                    <div key={cat.key} className="text-center">
                      <div className={`w-12 h-12 mx-auto rounded-lg ${cat.color} flex items-center justify-center mb-2`}>
                        <cat.icon className="h-6 w-6" />
                      </div>
                      <div className="font-semibold">{cat.name}</div>
                      <div className="text-2xl font-bold mb-1">{data.score}</div>
                      {getStatusChip(data.status)}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 詳細 */}
          <div className="grid gap-4 md:grid-cols-2">
            {pesoCategories.map((cat) => {
              const data = result[cat.key as keyof typeof result] as {
                score: number
                status: 'active' | 'low' | 'inactive'
              }
              return (
                <Card key={cat.key}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className={`p-1 rounded ${cat.color}`}>
                          <cat.icon className="h-4 w-4" />
                        </span>
                        {cat.name}
                      </CardTitle>
                      {getStatusChip(data.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={data.score} className="mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {data.status === 'active'
                        ? 'この領域は良好に運用されています'
                        : data.status === 'low'
                        ? 'この領域の強化を検討してください'
                        : 'この領域は未着手です'}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Button onClick={() => setStep(1)} className="w-full" variant="outline">
            もう一度診断する
          </Button>
        </>
      )}
    </div>
  )
}
