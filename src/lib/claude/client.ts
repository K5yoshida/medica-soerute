// ===========================================
// Claude API Client
// ===========================================

import Anthropic from '@anthropic-ai/sdk'
import type { JobRequirements, MatchedMedia, AnalysisDetail, MediaMaster } from '@/types'

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
export async function analyzePeso(diagnosisData: {
  currentActivities: {
    paid: string[]
    earned: string[]
    shared: string[]
    owned: string[]
  }
  budget?: {
    total: number
    breakdown?: Record<string, number>
  }
  goals?: string[]
}): Promise<{
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

  const userPrompt = `以下の採用活動状況をPESOフレームワークで分析してください。

【現在の活動状況】
${JSON.stringify(diagnosisData, null, 2)}`

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

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse response JSON')
  }

  return JSON.parse(jsonMatch[0])
}
