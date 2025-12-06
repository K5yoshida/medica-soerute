// ===========================================
// Query Intent Classification
// クエリ（検索キーワード）の意図を分類するロジック
// ===========================================

/**
 * クエリ意図の種類
 * - branded: 指名検索（サービス名・施設名を直接検索）
 * - transactional: 応募直前（求人・転職など応募意図が明確）
 * - commercial: 比較検討（条件比較、選び方を調べている）
 * - informational: 情報収集（知識・ハウツー・一般情報）
 * - unknown: 判定不能（AI判定が必要）
 */
export type QueryIntent = 'branded' | 'transactional' | 'commercial' | 'informational' | 'unknown'

/**
 * 意図分類の結果
 */
export interface IntentClassification {
  intent: QueryIntent
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

/**
 * 既知の求人媒体名リスト
 * CSV取り込み時に動的に追加される想定
 */
const KNOWN_MEDIA_NAMES = [
  'ジョブメドレー',
  'jobmedley',
  'job-medley',
  'マイナビ',
  'リクナビ',
  'indeed',
  'インディード',
  'エン転職',
  'doda',
  'ナース人材バンク',
  'レバウェル',
  'ナースではたらこ',
  'グッピー',
  'コメディカルドットコム',
  'e介護転職',
  'カイゴジョブ',
  'きらケア',
  'かいご畑',
]

/**
 * 職種キーワード
 */
const JOB_KEYWORDS = [
  '看護師', 'ナース', '准看護師', '正看護師',
  '介護', 'ヘルパー', '介護福祉士', 'ケアマネ', 'ケアマネージャー',
  '薬剤師', '登録販売者',
  '保育士', '幼稚園教諭',
  '歯科衛生士', '歯科助手', '歯科医師',
  '理学療法士', '作業療法士', '言語聴覚士', 'PT', 'OT', 'ST',
  '医療事務', '調剤事務', '医師', 'ドクター',
  '管理栄養士', '栄養士',
  '放射線技師', '臨床検査技師', '臨床工学技士',
  'あん摩', 'マッサージ', '鍼灸', '柔道整復師',
  '社会福祉士', '精神保健福祉士',
]

/**
 * 条件キーワード
 */
const CONDITION_KEYWORDS = [
  '年収', '給料', '給与', '月給', '時給', '賞与', 'ボーナス',
  '年間休日', '休日', '休み', '有給', '週休',
  '残業', '夜勤', '日勤', 'オンコール',
  '福利厚生', '社会保険', '退職金',
]

/**
 * クエリ意図を分類する
 * ルールベースで高速に判定し、判定不能な場合はunknownを返す
 */
export function classifyQueryIntent(keyword: string): IntentClassification {
  const k = keyword.toLowerCase().trim()

  // 空文字チェック
  if (!k) {
    return { intent: 'unknown', confidence: 'low', reason: '空のキーワード' }
  }

  // 1. 指名検索 - 媒体名を含む
  for (const mediaName of KNOWN_MEDIA_NAMES) {
    if (k.includes(mediaName.toLowerCase())) {
      return {
        intent: 'branded',
        confidence: 'high',
        reason: `媒体名「${mediaName}」を含む`,
      }
    }
  }

  // 2. 応募直前 - 求人意図が明確
  if (/求人|転職|募集|採用|応募|中途/.test(k)) {
    return {
      intent: 'transactional',
      confidence: 'high',
      reason: '求人・転職関連キーワードを含む',
    }
  }

  // 3. 情報収集 - ハウツー/解説/一般知識（優先度高）
  if (/とは$|とは\s|書き方|意味|方法|やり方|平均|相場|違いは/.test(k)) {
    return {
      intent: 'informational',
      confidence: 'high',
      reason: '解説・ハウツー系キーワードを含む',
    }
  }

  // 4. 比較検討 - 具体的数値を含む
  if (/\d+日|\d+万|\d+円/.test(k)) {
    return {
      intent: 'commercial',
      confidence: 'high',
      reason: '具体的な数値条件を含む',
    }
  }

  // 5. 比較検討 - 比較系キーワード
  if (/比較|ランキング|おすすめ|オススメ|人気|評判|口コミ|vs/.test(k)) {
    return {
      intent: 'commercial',
      confidence: 'high',
      reason: '比較・評価系キーワードを含む',
    }
  }

  // 6. 職種 × 条件 の組み合わせ判定
  const hasJob = JOB_KEYWORDS.some(job => k.includes(job.toLowerCase()))
  const hasCondition = CONDITION_KEYWORDS.some(cond => k.includes(cond.toLowerCase()))

  if (hasJob && hasCondition) {
    return {
      intent: 'commercial',
      confidence: 'medium',
      reason: '職種と条件の組み合わせ',
    }
  }

  // 7. 条件キーワード単体 → 情報収集
  if (hasCondition && !hasJob) {
    return {
      intent: 'informational',
      confidence: 'medium',
      reason: '条件キーワード単体（一般情報）',
    }
  }

  // 8. 職種キーワード単体 → 判定不能（求人か情報か不明）
  if (hasJob && !hasCondition) {
    return {
      intent: 'unknown',
      confidence: 'low',
      reason: '職種キーワード単体（意図不明）',
    }
  }

  // 判定不能
  return {
    intent: 'unknown',
    confidence: 'low',
    reason: 'ルールベースで判定不能',
  }
}

/**
 * バッチ処理用：複数キーワードを一括分類
 */
export function classifyQueryIntents(keywords: string[]): Map<string, IntentClassification> {
  const results = new Map<string, IntentClassification>()
  for (const keyword of keywords) {
    results.set(keyword, classifyQueryIntent(keyword))
  }
  return results
}

/**
 * 意図別のラベル（日本語表示用）
 */
export const INTENT_LABELS: Record<QueryIntent, string> = {
  branded: '指名検索',
  transactional: '応募直前',
  commercial: '比較検討',
  informational: '情報収集',
  unknown: '未分類',
}

/**
 * 意図別の説明
 */
export const INTENT_DESCRIPTIONS: Record<QueryIntent, string> = {
  branded: 'サービス名や施設名を直接検索している',
  transactional: '求人への応募意欲が高い状態',
  commercial: '転職条件を比較検討している段階',
  informational: '一般的な情報や知識を求めている',
  unknown: 'AI分析が必要',
}

/**
 * 媒体名を追加する（動的に拡張可能）
 */
export function addMediaName(name: string): void {
  if (!KNOWN_MEDIA_NAMES.includes(name.toLowerCase())) {
    KNOWN_MEDIA_NAMES.push(name.toLowerCase())
  }
}

/**
 * 現在の媒体名リストを取得
 */
export function getMediaNames(): string[] {
  return [...KNOWN_MEDIA_NAMES]
}

// ===========================================
// Claude API を使った高精度分類
// ===========================================

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Claude APIを使ってキーワードの意図を分類する
 * コスト効率のため、バッチで一括処理（並列実行で高速化）
 */
export async function classifyWithClaude(
  keywords: string[],
  batchSize: number = 100
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()

  // バッチに分割
  const batches: string[][] = []
  for (let i = 0; i < keywords.length; i += batchSize) {
    batches.push(keywords.slice(i, i + batchSize))
  }

  // 最大3バッチを並列で処理（API制限を考慮）
  const PARALLEL_LIMIT = 3
  for (let i = 0; i < batches.length; i += PARALLEL_LIMIT) {
    const parallelBatches = batches.slice(i, i + PARALLEL_LIMIT)
    const batchPromises = parallelBatches.map(batch => classifyBatchWithClaude(batch))
    const batchResultsArray = await Promise.all(batchPromises)

    for (const batchResults of batchResultsArray) {
      batchResults.forEach((classification, keyword) => {
        results.set(keyword, classification)
      })
    }
  }

  return results
}

/**
 * バッチ単位でClaude APIを呼び出す
 */
async function classifyBatchWithClaude(
  keywords: string[]
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()

  if (keywords.length === 0) return results

  const keywordList = keywords.map((k, i) => `${i + 1}. ${k}`).join('\n')

  const systemPrompt = `あなたは医療・介護・福祉業界の求人検索クエリを分析する専門家です。

検索キーワードを以下の4つの意図カテゴリに分類してください：

1. **branded（指名検索）**: 特定のサービス名・媒体名・施設名を直接検索している
   例: 「ジョブメドレー」「マイナビ看護師」「○○病院」

2. **transactional（応募直前）**: 求人への応募・転職意図が明確
   例: 「看護師 求人」「介護士 転職」「薬剤師 募集」

3. **commercial（比較検討）**: 転職条件を比較・検討している段階
   例: 「看護師 年収 平均」「介護福祉士 年間休日120日」「薬剤師 おすすめ転職サイト」

4. **informational（情報収集）**: 一般的な情報・知識・ハウツーを求めている
   例: 「看護師とは」「介護福祉士 資格」「履歴書 書き方」「有給休暇 平均」

回答は必ず以下のJSON形式で返してください：
[
  {"keyword": "キーワード1", "intent": "branded|transactional|commercial|informational", "reason": "分類理由（20文字以内）"},
  ...
]`

  const userPrompt = `以下のキーワードを分類してください：

${keywordList}

JSON配列のみを返してください。`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    })

    // レスポンスからテキストを取得
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // JSONをパース
    const jsonMatch = content.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('JSON not found in response')
    }

    const classifications = JSON.parse(jsonMatch[0]) as Array<{
      keyword: string
      intent: string
      reason: string
    }>

    for (const item of classifications) {
      const intent = item.intent as QueryIntent
      if (['branded', 'transactional', 'commercial', 'informational'].includes(intent)) {
        results.set(item.keyword, {
          intent,
          confidence: 'high',
          reason: item.reason,
        })
      }
    }

    // 分類されなかったキーワードにデフォルト値を設定
    for (const keyword of keywords) {
      if (!results.has(keyword)) {
        results.set(keyword, {
          intent: 'unknown',
          confidence: 'low',
          reason: 'AI分類失敗',
        })
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Claude API error:', errorMessage)
    console.error('Full error:', error)
    // エラー時はすべてunknownに（エラー内容を記録）
    for (const keyword of keywords) {
      results.set(keyword, {
        intent: 'unknown',
        confidence: 'low',
        reason: `AI分類エラー: ${errorMessage.slice(0, 50)}`,
      })
    }
  }

  return results
}

/**
 * ハイブリッド分類：ルールベース → 未分類のみAI分類
 * コスト効率と精度のバランスを取る
 */
export async function classifyWithHybrid(
  keywords: string[]
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()
  const unknownKeywords: string[] = []

  // まずルールベースで分類
  for (const keyword of keywords) {
    const result = classifyQueryIntent(keyword)
    results.set(keyword, result)

    // unknownのものはAI分類対象に
    if (result.intent === 'unknown') {
      unknownKeywords.push(keyword)
    }
  }

  // 未分類が多い場合のみAI分類を実行
  if (unknownKeywords.length > 0) {
    console.log(`AI分類対象: ${unknownKeywords.length}件`)

    const aiResults = await classifyWithClaude(unknownKeywords)

    // AI結果で上書き
    aiResults.forEach((classification, keyword) => {
      results.set(keyword, classification)
    })
  }

  return results
}
