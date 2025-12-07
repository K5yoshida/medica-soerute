// ===========================================
// Claude API Client
// ===========================================

import Anthropic from '@anthropic-ai/sdk'
import type { JobRequirements, MatchedMedia, AnalysisDetail, MediaMaster, PesoDiagnosisData } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

// ----- 媒体マッチング分析 -----
export async function analyzeMediaMatch(
  jobRequirements: JobRequirements,
  mediaList: MediaMaster[]
): Promise<{
  matchedMedia: MatchedMedia[]
  analysisDetail: AnalysisDetail
}> {
  const systemPrompt = `あなたは医療・介護業界の求人媒体選定の専門家です。
求人条件と媒体情報を分析し、最適な求人媒体をマッチングスコアと共に推薦してください。

分析の観点：
1. 職種・業界との適合性
2. ターゲット層との一致度
3. 地域・エリアでの強み
4. コストパフォーマンス
5. 採用緊急度との整合性

回答は必ず以下のJSON形式で返してください：
{
  "matchedMedia": [
    {
      "mediaId": "媒体ID",
      "mediaName": "媒体名",
      "matchScore": 0-100の数値,
      "matchReasons": ["マッチング理由1", "理由2"],
      "strengths": ["この求人での強み1", "強み2"],
      "considerations": ["注意点1", "注意点2"],
      "estimatedCost": "想定費用感",
      "recommendedPeriod": "推奨掲載期間"
    }
  ],
  "analysisDetail": {
    "overallAssessment": "総合評価コメント",
    "marketAnalysis": "市場分析",
    "competitorAnalysis": "競合分析（あれば）",
    "recommendations": ["推奨アクション1", "推奨アクション2"]
  }
}`

  const userPrompt = `以下の求人条件に最適な媒体を分析してください。

【求人条件】
${JSON.stringify(jobRequirements, null, 2)}

【利用可能な媒体一覧】
${JSON.stringify(mediaList.map(m => ({
  id: m.id,
  name: m.name,
  category: m.category,
  description: m.description,
  features: m.features,
  strengths: m.strengths,
  weaknesses: m.weaknesses,
  price_range: m.price_range,
  target_audience: m.target_audience,
})), null, 2)}`

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  // JSONをパース
  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse response JSON')
  }

  return JSON.parse(jsonMatch[0])
}

// ----- PESO診断分析 -----
export async function analyzePeso(diagnosisData: PesoDiagnosisData): Promise<{
  scores: {
    paid: number
    earned: number
    shared: number
    owned: number
  }
  analysis: string
  recommendations: string[]
}> {
  const systemPrompt = `あなたは採用マーケティングのPESO分析の専門家です。
クライアントの現在の採用活動を分析し、PESOフレームワークに基づいてスコアリングと改善提案を行ってください。

PESO とは：
- Paid（有料メディア）: 求人広告、ジョブボード等
- Earned（獲得メディア）: PR、メディア露出、口コミ等
- Shared（共有メディア）: SNS、コミュニティ等
- Owned（自社メディア）: 採用サイト、ブログ等

分析時の考慮事項：
- 企業情報（業界、規模、所在地）に応じた適切な施策を提案
- コンテンツ深度（写真・テキストの充実度）を評価に反映
- 業界特性に合わせた具体的なアドバイスを提供

回答は必ず以下のJSON形式で返してください：
{
  "scores": {
    "paid": 0-100,
    "earned": 0-100,
    "shared": 0-100,
    "owned": 0-100
  },
  "analysis": "全体の分析コメント",
  "recommendations": ["改善提案1", "改善提案2", "改善提案3"]
}`

  // ユーザープロンプトを構築
  const promptParts: string[] = ['以下の採用活動状況をPESOフレームワークで分析してください。']

  // GAP-016: 企業情報を含める
  if (diagnosisData.companyInfo) {
    const { company_name, industry, employee_size, prefecture } = diagnosisData.companyInfo
    promptParts.push(`
【企業情報】
- 企業名: ${company_name || '未入力'}
- 業界: ${industry || '未選択'}
- 従業員規模: ${employee_size || '未選択'}
- 所在地: ${prefecture || '未選択'}`)
  }

  // コンテンツ深度を含める
  if (diagnosisData.contentDepth) {
    const { photo, text } = diagnosisData.contentDepth
    // 写真レベルのラベルマッピング
    const photoLabels: Record<string, string> = {
      none: 'Lv.0 写真なし',
      free: 'Lv.1 フリー素材使用',
      original: 'Lv.2 自社撮影写真',
      edited: 'Lv.3 加工・編集写真',
      ab_test: 'Lv.4 A/Bテスト実施中',
    }
    // テキストレベルのラベルマッピング
    const textLabels: Record<string, string> = {
      basic: 'Lv.0 基本情報のみ',
      detailed: 'Lv.1 詳細記載',
      interview: 'Lv.2 従業員の声あり',
      competitive: 'Lv.3 競合分析反映',
      ab_test: 'Lv.4 A/Bテスト実施中',
    }
    promptParts.push(`
【コンテンツ深度評価】
- 写真コンテンツ: ${photo ? photoLabels[photo] || photo : '未選択'}
- テキストコンテンツ: ${text ? textLabels[text] || text : '未選択'}`)
  }

  // 現在の活動状況
  promptParts.push(`
【現在のPESO活動状況】
${JSON.stringify(diagnosisData.currentActivities, null, 2)}`)

  // 予算情報があれば追加
  if (diagnosisData.budget) {
    promptParts.push(`
【予算情報】
${JSON.stringify(diagnosisData.budget, null, 2)}`)
  }

  // 目標があれば追加
  if (diagnosisData.goals && diagnosisData.goals.length > 0) {
    promptParts.push(`
【目標】
${diagnosisData.goals.join('\n')}`)
  }

  const userPrompt = promptParts.join('\n')

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse response JSON')
  }

  return JSON.parse(jsonMatch[0])
}

// ----- SimilarWeb画像からのデータ抽出 -----
export interface SimilarWebData {
  domain?: string
  monthly_visits?: number
  bounce_rate?: number
  pages_per_visit?: number
  avg_visit_duration?: number // 秒単位
  traffic_sources?: {
    direct?: number
    referral?: number
    search?: number
    social?: number
    mail?: number
    display?: number
  }
  geography?: Array<{
    country: string
    percentage: number
  }>
  confidence?: 'high' | 'medium' | 'low'
  raw_text?: string
}

export async function extractSimilarWebData(
  images: Array<{ base64: string; mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' }>
): Promise<SimilarWebData> {
  const systemPrompt = `あなたはSimilarWebのスクリーンショット画像からデータを抽出する専門家です。
画像から以下の情報を正確に読み取ってJSON形式で返してください。

抽出対象:
1. ドメイン名 (domain)
2. 月間訪問数 (monthly_visits) - 数値のみ。"10.5M"なら10500000、"1.2K"なら1200に変換
3. 直帰率 (bounce_rate) - パーセント値（小数）。"45.5%"なら45.5
4. 平均ページ閲覧数 (pages_per_visit) - 小数
5. 平均滞在時間 (avg_visit_duration) - 秒数に変換。"00:02:30"なら150秒
6. トラフィックソース (traffic_sources) - 各チャネルのパーセント値
   - direct: 直接流入
   - referral: 参照流入
   - search: 検索流入（オーガニック+有料）
   - social: ソーシャル
   - mail: メール
   - display: ディスプレイ広告
7. 地域分布 (geography) - 上位の国と割合

読み取れなかった項目はnullとしてください。
複数画像がある場合、すべての画像から情報を統合してください。

回答は必ず以下のJSON形式のみで返してください（説明文不要）:
{
  "domain": "example.com",
  "monthly_visits": 10500000,
  "bounce_rate": 45.5,
  "pages_per_visit": 3.2,
  "avg_visit_duration": 150,
  "traffic_sources": {
    "direct": 25.5,
    "referral": 10.2,
    "search": 45.0,
    "social": 12.3,
    "mail": 2.0,
    "display": 5.0
  },
  "geography": [
    {"country": "Japan", "percentage": 85.5},
    {"country": "United States", "percentage": 5.2}
  ],
  "confidence": "high",
  "raw_text": "画像から読み取った生テキスト（デバッグ用）"
}`

  // 複数画像をコンテンツとして構築
  const imageContents = images.map((img) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: img.mediaType,
      data: img.base64,
    },
  }))

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContents,
          {
            type: 'text' as const,
            text: 'これらのSimilarWebスクリーンショットからデータを抽出してください。',
          },
        ],
      },
    ],
    system: systemPrompt,
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  // JSONをパース
  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse response JSON')
  }

  return JSON.parse(jsonMatch[0])
}

// ----- 施策レコメンド -----
export async function getRecommendations(context: {
  analysisResults?: unknown[]
  pesoScores?: {
    paid: number
    earned: number
    shared: number
    owned: number
  }
  budget?: number
  timeline?: string
}): Promise<{
  shortTerm: string[]
  midTerm: string[]
  longTerm: string[]
  priorityActions: string[]
}> {
  const systemPrompt = `あなたは採用戦略コンサルタントです。
クライアントの分析結果を基に、具体的で実行可能な施策を提案してください。

提案は以下の観点を含めてください：
- 短期（1-3ヶ月）で実施可能な施策
- 中期（3-6ヶ月）で取り組むべき施策
- 長期（6ヶ月以上）の戦略的施策
- 最優先で着手すべきアクション

回答は必ず以下のJSON形式で返してください：
{
  "shortTerm": ["短期施策1", "短期施策2"],
  "midTerm": ["中期施策1", "中期施策2"],
  "longTerm": ["長期施策1", "長期施策2"],
  "priorityActions": ["最優先アクション1", "最優先アクション2"]
}`

  const userPrompt = `以下の情報を基に、採用活動の改善施策を提案してください。

【コンテキスト情報】
${JSON.stringify(context, null, 2)}`

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  const recommendJsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!recommendJsonMatch) {
    throw new Error('Failed to parse response JSON')
  }

  return JSON.parse(recommendJsonMatch[0])
}

// ----- AIクエリ提案 (GAP-012) -----
export interface KeywordSuggestion {
  keyword: string
  category: 'related' | 'competitor' | 'longtail'
  relevanceScore: number
  reason: string
}

export interface KeywordSuggestionsResult {
  keywords: KeywordSuggestion[]
  suggestedCategories: string[]
  searchTips: string[]
}

export async function suggestRelatedKeywords(params: {
  jobType?: string
  area?: string
  conditions?: string[]
  currentKeywords?: string[]
  suggestionType?: 'related' | 'competitor' | 'longtail' | 'all'
}): Promise<KeywordSuggestionsResult> {
  const { jobType, area, conditions, currentKeywords, suggestionType = 'all' } = params

  const systemPrompt = `あなたは医療・介護業界の求人検索キーワードの専門家です。
ユーザーの入力に基づいて、効果的な検索キーワードを提案してください。

提案するキーワードは以下の3カテゴリに分類してください：
1. **related（関連キーワード）**: 直接関連する検索ワード
2. **competitor（競合キーワード）**: 競合他社や類似サービスに関するキーワード
3. **longtail（ロングテールキーワード）**: より具体的で競合が少ないニッチなキーワード

各キーワードには以下を付与してください：
- relevanceScore: 1-100の関連度スコア
- reason: なぜこのキーワードを提案するかの理由（20文字以内）

また、追加で以下も提案してください：
- suggestedCategories: 検索を拡張できるカテゴリ（例：「夜勤」「日勤のみ」など条件面）
- searchTips: より効果的な検索のためのアドバイス

回答は必ず以下のJSON形式で返してください：
{
  "keywords": [
    {"keyword": "キーワード1", "category": "related", "relevanceScore": 95, "reason": "理由"},
    {"keyword": "キーワード2", "category": "competitor", "relevanceScore": 80, "reason": "理由"},
    {"keyword": "キーワード3", "category": "longtail", "relevanceScore": 70, "reason": "理由"}
  ],
  "suggestedCategories": ["カテゴリ1", "カテゴリ2"],
  "searchTips": ["アドバイス1", "アドバイス2"]
}`

  const userPromptParts: string[] = ['以下の条件に基づいて、効果的な検索キーワードを提案してください。']

  if (jobType) {
    userPromptParts.push(`【職種】${jobType}`)
  }
  if (area) {
    userPromptParts.push(`【エリア】${area}`)
  }
  if (conditions && conditions.length > 0) {
    userPromptParts.push(`【条件】${conditions.join(', ')}`)
  }
  if (currentKeywords && currentKeywords.length > 0) {
    userPromptParts.push(`【現在のキーワード】${currentKeywords.join(', ')}`)
    userPromptParts.push('上記のキーワードと重複しない、新しいキーワードを提案してください。')
  }

  if (suggestionType !== 'all') {
    userPromptParts.push(`【提案タイプ】${suggestionType}カテゴリのキーワードのみを提案してください。`)
  }

  const userPrompt = userPromptParts.join('\n\n')

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  const suggestJsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!suggestJsonMatch) {
    throw new Error('Failed to parse response JSON')
  }

  return JSON.parse(suggestJsonMatch[0])
}
