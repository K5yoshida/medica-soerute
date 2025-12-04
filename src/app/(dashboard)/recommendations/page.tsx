'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  Lightbulb,
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  RefreshCw,
  ArrowRight,
  FileSearch,
  BarChart3,
  CheckCircle2,
} from 'lucide-react'

interface Recommendation {
  id: string
  title: string
  description: string
  category: 'paid' | 'earned' | 'shared' | 'owned' | 'process' | 'branding'
  priority: 'high' | 'medium' | 'low'
  estimatedImpact: string
  estimatedCost: string
  timeframe: string
  steps: string[]
}

interface RecommendationsData {
  hasData: boolean
  message?: string
  recommendations: Recommendation[]
  basedOn?: {
    analysisCount: number
    pesoCount: number
  }
}

const categoryConfig = {
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-800', icon: DollarSign },
  earned: { label: 'Earned', color: 'bg-green-100 text-green-800', icon: TrendingUp },
  shared: { label: 'Shared', color: 'bg-purple-100 text-purple-800', icon: Target },
  owned: { label: 'Owned', color: 'bg-orange-100 text-orange-800', icon: Lightbulb },
  process: { label: 'プロセス改善', color: 'bg-gray-100 text-gray-800', icon: RefreshCw },
  branding: { label: 'ブランディング', color: 'bg-pink-100 text-pink-800', icon: Target },
}

const priorityConfig = {
  high: { label: '高優先度', color: 'bg-red-100 text-red-800' },
  medium: { label: '中優先度', color: 'bg-yellow-100 text-yellow-800' },
  low: { label: '低優先度', color: 'bg-gray-100 text-gray-800' },
}

export default function RecommendationsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<RecommendationsData | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchRecommendations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/recommendations')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || '施策提案の取得に失敗しました')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : '施策提案の取得に失敗しました'
      setError(message)
      toast({
        title: 'エラー',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">施策提案</h1>
          <p className="text-gray-600">
            分析結果に基づいた採用活動の改善提案
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">施策提案</h1>
          <p className="text-gray-600">
            分析結果に基づいた採用活動の改善提案
          </p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchRecommendations}>
          <RefreshCw className="h-4 w-4 mr-2" />
          再試行
        </Button>
      </div>
    )
  }

  if (!data?.hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">施策提案</h1>
          <p className="text-gray-600">
            分析結果に基づいた採用活動の改善提案
          </p>
        </div>
        <Card className="py-12">
          <CardContent className="text-center">
            <div className="flex justify-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <FileSearch className="h-8 w-8 text-blue-600" />
              </div>
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            <p className="text-gray-600 mb-6">{data?.message}</p>
            <div className="flex justify-center gap-4">
              <Link href="/analysis">
                <Button>
                  <FileSearch className="h-4 w-4 mr-2" />
                  媒体分析を実行
                </Button>
              </Link>
              <Link href="/peso">
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  PESO診断を実行
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">施策提案</h1>
          <p className="text-gray-600">
            分析結果に基づいた採用活動の改善提案
          </p>
        </div>
        <Button variant="outline" onClick={fetchRecommendations}>
          <RefreshCw className="h-4 w-4 mr-2" />
          更新
        </Button>
      </div>

      {/* 基準情報 */}
      {data.basedOn && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span>分析データに基づく提案:</span>
              <div className="flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                媒体分析 {data.basedOn.analysisCount}件
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                PESO診断 {data.basedOn.pesoCount}件
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 施策カード */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.recommendations.map((rec) => {
          const category = categoryConfig[rec.category]
          const priority = priorityConfig[rec.priority]
          const CategoryIcon = category.icon
          const isExpanded = expandedId === rec.id

          return (
            <Card
              key={rec.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => toggleExpand(rec.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${category.color}`}>
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{rec.title}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge className={category.color}>{category.label}</Badge>
                        <Badge className={priority.color}>{priority.label}</Badge>
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription>{rec.description}</CardDescription>

                {/* メトリクス */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-gray-500">期待効果</p>
                      <p className="font-medium">{rec.estimatedImpact}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-gray-500">想定コスト</p>
                      <p className="font-medium">{rec.estimatedCost}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-gray-500">期間</p>
                      <p className="font-medium">{rec.timeframe}</p>
                    </div>
                  </div>
                </div>

                {/* 展開時の詳細 */}
                {isExpanded && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        実行ステップ
                      </h4>
                      <ul className="space-y-2">
                        {rec.steps.map((step, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {data.recommendations.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center text-gray-500">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>現時点で提案できる施策はありません</p>
            <p className="text-sm mt-2">
              より多くの分析を実行すると、詳細な提案が生成されます
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
