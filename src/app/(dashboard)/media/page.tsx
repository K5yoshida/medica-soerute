'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Filter, ExternalLink, MapPin, Briefcase, DollarSign } from 'lucide-react'
import type { MediaMaster, Json } from '@/types'

const categories = [
  { value: 'all', label: 'すべてのカテゴリ' },
  { value: 'nursing', label: '看護師' },
  { value: 'welfare', label: '介護職' },
  { value: 'pharmacy', label: '薬剤師' },
  { value: 'rehabilitation', label: 'リハビリ' },
  { value: 'dental', label: '歯科' },
  { value: 'general', label: '総合' },
]

// features JSONの型定義
interface MediaFeatures {
  url?: string
  cost_structure?: {
    base_fee?: number
    success_fee?: string
    posting_fee?: number
  }
  job_types?: string[]
  regions?: string[]
  strengths?: string[]
}

function parseFeatures(features: Json): MediaFeatures {
  if (typeof features === 'object' && features !== null && !Array.isArray(features)) {
    return features as unknown as MediaFeatures
  }
  return {}
}

export default function MediaListPage() {
  const [mediaList, setMediaList] = useState<MediaMaster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  const fetchMedia = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }
      if (showActiveOnly) {
        params.append('is_active', 'true')
      }

      const response = await fetch(`/api/media?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || '媒体データの取得に失敗しました')
      }

      const result = await response.json()
      setMediaList(result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : '媒体データの取得に失敗しました'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory, searchQuery, showActiveOnly])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchMedia()
  }

  const getCategoryLabel = (category: string) => {
    const cat = categories.find((c) => c.value === category)
    return cat?.label || category
  }

  const groupedMedia = mediaList.reduce((acc, media) => {
    const category = getCategoryLabel(media.category)
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(media)
    return acc
  }, {} as Record<string, MediaMaster[]>)

  const formatCost = (features: MediaFeatures) => {
    const costStructure = features.cost_structure
    if (!costStructure) return '要問合せ'

    const parts = []
    if (costStructure.base_fee) {
      parts.push(`基本料: ${costStructure.base_fee.toLocaleString()}円`)
    }
    if (costStructure.success_fee) {
      parts.push(`成功報酬: ${costStructure.success_fee}`)
    }
    if (costStructure.posting_fee) {
      parts.push(`掲載料: ${costStructure.posting_fee.toLocaleString()}円`)
    }

    return parts.length > 0 ? parts.join(' / ') : '要問合せ'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">媒体一覧</h1>
        <p className="text-gray-600">
          利用可能な求人媒体の一覧と詳細情報を確認できます
        </p>
      </div>

      {/* フィルター */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="search">キーワード検索</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="媒体名や説明で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-[200px] space-y-2">
              <Label>カテゴリ</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant={showActiveOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowActiveOnly(!showActiveOnly)}
              >
                <Filter className="h-4 w-4 mr-2" />
                アクティブのみ
              </Button>
              <Button type="submit">検索</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ローディング */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
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
      ) : (
        <>
          {/* 結果件数 */}
          <div className="text-sm text-gray-600">
            {mediaList.length}件の媒体が見つかりました
          </div>

          {/* 媒体一覧 */}
          {Object.keys(groupedMedia).length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center text-gray-500">
                <p>条件に一致する媒体が見つかりませんでした</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedMedia).map(([category, medias]) => (
                <div key={category}>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    {category}
                    <Badge variant="secondary">{medias.length}件</Badge>
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {medias.map((media) => {
                      const features = parseFeatures(media.features)
                      return (
                        <Card
                          key={media.id}
                          className="hover:shadow-lg transition-shadow"
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">
                                  {media.name}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {media.description}
                                </CardDescription>
                              </div>
                              {!media.is_active && (
                                <Badge variant="outline" className="text-gray-500">
                                  非アクティブ
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* ターゲット層 */}
                            {media.target_audience && (
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="text-sm">
                                  <span className="text-gray-500">対象: </span>
                                  {media.target_audience}
                                </div>
                              </div>
                            )}

                            {/* 価格帯 */}
                            {media.price_range && (
                              <div className="flex items-start gap-2">
                                <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="text-sm">
                                  <span className="text-gray-500">価格帯: </span>
                                  {media.price_range}
                                </div>
                              </div>
                            )}

                            <Separator />

                            {/* 費用構造 (featuresから) */}
                            {features.cost_structure && (
                              <div className="text-sm">
                                <span className="text-gray-500">費用構造: </span>
                                <span className="font-medium">
                                  {formatCost(features)}
                                </span>
                              </div>
                            )}

                            {/* 強み */}
                            {media.strengths && media.strengths.length > 0 && (
                              <div className="text-sm">
                                <span className="text-gray-500">強み: </span>
                                <ul className="mt-1 space-y-1">
                                  {media.strengths.slice(0, 3).map((strength, i) => (
                                    <li key={i} className="text-green-600 text-xs">
                                      • {strength}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* 注意点 */}
                            {media.weaknesses && media.weaknesses.length > 0 && (
                              <div className="text-sm">
                                <span className="text-gray-500">注意点: </span>
                                <ul className="mt-1 space-y-1">
                                  {media.weaknesses.slice(0, 2).map((weakness, i) => (
                                    <li key={i} className="text-orange-600 text-xs">
                                      • {weakness}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* リンク */}
                            {features.url && (
                              <a
                                href={features.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                              >
                                公式サイト
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
