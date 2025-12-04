'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Download, ExternalLink, Globe, Users } from 'lucide-react'

// サンプルデータ
const sampleMedia = [
  { id: '1', name: 'マイナビ看護師', domain: 'kango.mynavi.jp', monthlyVisits: '2,500,000' },
  { id: '2', name: 'ナース人材バンク', domain: 'nursejinzaibank.com', monthlyVisits: '1,800,000' },
  { id: '3', name: '看護roo!', domain: 'kango-roo.com', monthlyVisits: '3,200,000' },
  { id: '4', name: 'レバウェル看護', domain: 'levwell.jp', monthlyVisits: '980,000' },
  { id: '5', name: 'ジョブメドレー', domain: 'job-medley.com', monthlyVisits: '2,100,000' },
]

const sampleKeywords = [
  { keyword: '看護師 求人', intent: 'A', rank: 3, traffic: '12,000', volume: '45,000' },
  { keyword: '看護師 転職', intent: 'A', rank: 5, traffic: '8,500', volume: '38,000' },
  { keyword: '病院 看護師 募集', intent: 'B', rank: 2, traffic: '5,200', volume: '18,000' },
  { keyword: '看護師 パート', intent: 'B', rank: 7, traffic: '3,100', volume: '22,000' },
  { keyword: '准看護師 求人', intent: 'A', rank: 4, traffic: '2,800', volume: '12,000' },
  { keyword: '訪問看護 求人', intent: 'B', rank: 1, traffic: '4,500', volume: '15,000' },
  { keyword: '看護師 夜勤専従', intent: 'C', rank: 3, traffic: '1,200', volume: '5,800' },
  { keyword: '看護師 日勤のみ', intent: 'B', rank: 6, traffic: '2,100', volume: '9,500' },
]

export default function CatalogPage() {
  const [selectedMedia, setSelectedMedia] = useState<string>('')
  const [intentFilter, setIntentFilter] = useState<string>('all')
  const [searchKeyword, setSearchKeyword] = useState('')

  const filteredKeywords = sampleKeywords.filter((kw) => {
    if (intentFilter !== 'all' && kw.intent !== intentFilter) return false
    if (searchKeyword && !kw.keyword.includes(searchKeyword)) return false
    return true
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">媒体カタログ</h1>
        <p className="text-muted-foreground mt-1">
          登録されている媒体情報とキーワードデータを確認
        </p>
      </div>

      <Tabs defaultValue="media" className="space-y-6">
        <TabsList>
          <TabsTrigger value="media">媒体で絞り込み</TabsTrigger>
          <TabsTrigger value="keyword">キーワードで絞り込み</TabsTrigger>
        </TabsList>

        {/* 媒体で絞り込みモード */}
        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">検索条件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>媒体を選択</Label>
                  <Select value={selectedMedia} onValueChange={setSelectedMedia}>
                    <SelectTrigger>
                      <SelectValue placeholder="媒体を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleMedia.map((media) => (
                        <SelectItem key={media.id} value={media.id}>
                          {media.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>応募意図フィルター</Label>
                  <div className="flex gap-2">
                    {['all', 'A', 'B', 'C'].map((intent) => (
                      <Button
                        key={intent}
                        variant={intentFilter === intent ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setIntentFilter(intent)}
                      >
                        {intent === 'all' ? 'すべて' : intent}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedMedia && (
            <>
              {/* 媒体情報カード */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>
                        {sampleMedia.find((m) => m.id === selectedMedia)?.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Globe className="h-4 w-4" />
                        {sampleMedia.find((m) => m.id === selectedMedia)?.domain}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      サイトを開く
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        月間訪問数
                      </div>
                      <div className="flex items-baseline gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <span className="text-2xl font-bold">
                          {sampleMedia.find((m) => m.id === selectedMedia)?.monthlyVisits}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">
                        流入経路
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">自然検索 65%</Badge>
                        <Badge variant="secondary">広告 20%</Badge>
                        <Badge variant="secondary">直接 15%</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* キーワード一覧 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">キーワード一覧</CardTitle>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      CSVエクスポート
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>キーワード</TableHead>
                        <TableHead className="w-20 text-center">意図</TableHead>
                        <TableHead className="w-20 text-right">順位</TableHead>
                        <TableHead className="w-28 text-right">推定流入</TableHead>
                        <TableHead className="w-28 text-right">検索Vol</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredKeywords.map((kw, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{kw.keyword}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                kw.intent === 'A'
                                  ? 'border-green-500 text-green-700'
                                  : kw.intent === 'B'
                                  ? 'border-amber-500 text-amber-700'
                                  : 'border-gray-400 text-gray-600'
                              }
                            >
                              {kw.intent}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{kw.rank}位</TableCell>
                          <TableCell className="text-right">{kw.traffic}</TableCell>
                          <TableCell className="text-right">{kw.volume}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {!selectedMedia && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>媒体を選択してください</p>
                  <p className="text-sm mt-1">
                    選択した媒体のキーワードデータを表示します
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* キーワードで絞り込みモード */}
        <TabsContent value="keyword" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">キーワード検索</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="キーワードを入力..."
                    className="pl-9"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <Button>検索</Button>
              </div>
            </CardContent>
          </Card>

          {searchKeyword && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  検索結果: 「{searchKeyword}」
                </CardTitle>
                <CardDescription>
                  {filteredKeywords.length}件のキーワードが見つかりました
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>媒体名</TableHead>
                      <TableHead>キーワード</TableHead>
                      <TableHead className="w-20 text-right">順位</TableHead>
                      <TableHead className="w-28 text-right">推定流入</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKeywords.map((kw, index) => (
                      <TableRow key={index}>
                        <TableCell>マイナビ看護師</TableCell>
                        <TableCell className="font-medium">{kw.keyword}</TableCell>
                        <TableCell className="text-right">{kw.rank}位</TableCell>
                        <TableCell className="text-right">{kw.traffic}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {!searchKeyword && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>キーワードを入力してください</p>
                  <p className="text-sm mt-1">
                    そのキーワードで上位表示されている媒体を検索します
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
