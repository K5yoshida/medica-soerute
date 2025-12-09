// ===========================================
// Query Intent Classification
// クエリ（検索キーワード）の意図を分類するロジック
//
// 設計原則:
// 1. ハードコードを完全排除
// 2. ルールは「確実に判定できるもの」のみ
// 3. それ以外は全てAI判定（Web検索で実際のSERPを確認）
// 4. 媒体名リストに依存しない
// 5. 実際のGoogle検索結果（SERP）を見て判断 = 永続的に正しい判定
// ===========================================

import Anthropic from '@anthropic-ai/sdk'

/**
 * クエリ意図の種類（4カテゴリ）
 * - branded: 指名検索（サービス名・媒体名・企業名を直接検索）
 * - transactional: 応募意図（求人・転職など応募意図が明確）
 * - informational: 情報収集（知識・ハウツー・一般情報・条件比較含む）
 * - b2b: 法人向け（採用担当者・人事向けの情報）
 */
export type QueryIntent = 'branded' | 'transactional' | 'informational' | 'b2b'

/**
 * SEO標準のクエリタイプ（Do/Know/Go/Buy）
 */
export type QueryType = 'Do' | 'Know' | 'Go' | 'Buy'

/**
 * 意図分類の結果
 */
export interface IntentClassification {
  intent: QueryIntent
  confidence: 'high' | 'medium' | 'low'
  reason: string
  queryType?: QueryType
  serpVerified?: boolean  // SERP検証済みフラグ
}

/**
 * ルールベース分類の結果（AI判定が必要かどうかを含む）
 */
interface RuleBasedResult {
  classification: IntentClassification | null  // nullならAI判定が必要
  needsAI: boolean
}

/**
 * 確実にルールで判定できるパターンのみ分類
 *
 * ルール判定対象:
 * - 「求人」「転職」「募集」を含む → transactional
 * - 「採用」+ B2Bワード → b2b
 *
 * それ以外（branded含む）は全てAI + SERP検証
 */
function classifyByRule(keyword: string): RuleBasedResult {
  const k = keyword.toLowerCase().trim()

  // 空文字チェック
  if (!k) {
    return {
      classification: { intent: 'informational', confidence: 'low', reason: '空のキーワード' },
      needsAI: false,
    }
  }

  // ===========================================
  // 1. 応募意図チェック（確実なパターン）
  // ===========================================
  if (/求人|転職|募集/.test(k)) {
    return {
      classification: {
        intent: 'transactional',
        confidence: 'high',
        reason: '求人・転職関連キーワードを含む',
      },
      needsAI: false,
    }
  }

  // ===========================================
  // 2. B2Bチェック（確実なパターン）
  // ===========================================
  // 「採用」+ 明確なB2Bワードの組み合わせ
  if (/採用/.test(k)) {
    const b2bModifiers = ['費用', '管理', '担当', 'ログイン', '辞退', '代行', 'コスト', '単価', '掲載', '料金']
    const hasB2BModifier = b2bModifiers.some(mod => k.includes(mod))
    if (hasB2BModifier) {
      return {
        classification: {
          intent: 'b2b',
          confidence: 'high',
          reason: '採用 + 法人向けワードの組み合わせ',
        },
        needsAI: false,
      }
    }
  }

  // ===========================================
  // 3. それ以外は全てAI + SERP検証が必要
  // branded判定も含めて実際の検索結果で判断
  // ===========================================
  return {
    classification: null,
    needsAI: true,
  }
}

/**
 * クエリ意図を分類する（同期版・ルールベースのみ）
 * AI判定が必要な場合はinformationalをデフォルトで返す
 *
 * バッチ処理ではclassifyWithHybrid()を使用すること
 */
export function classifyQueryIntent(keyword: string): IntentClassification {
  const result = classifyByRule(keyword)

  if (result.classification) {
    return result.classification
  }

  // AI判定が必要だがここでは呼べない → デフォルト返却
  return {
    intent: 'informational',
    confidence: 'low',
    reason: 'AI判定が必要',
  }
}

/**
 * バッチ処理用：複数キーワードを一括分類（ルールのみ）
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
  transactional: '応募意図',
  informational: '情報収集',
  b2b: '法人向け',
}

/**
 * 意図別の説明
 */
export const INTENT_DESCRIPTIONS: Record<QueryIntent, string> = {
  branded: 'サービス名や媒体名を直接検索している',
  transactional: '求人への応募意欲が高い状態',
  informational: '一般的な情報や知識を求めている（条件比較含む）',
  b2b: '採用担当者・人事が検索している',
}

/**
 * クエリタイプのラベル（日本語表示用）
 */
export const QUERY_TYPE_LABELS: Record<QueryType, string> = {
  Do: 'Do',
  Know: 'Know',
  Go: 'Go',
  Buy: 'Buy',
}

/**
 * クエリタイプの説明
 */
export const QUERY_TYPE_DESCRIPTIONS: Record<QueryType, string> = {
  Do: '行動したい（応募・登録）',
  Know: '知りたい（情報収集）',
  Go: '特定サイトへ行きたい',
  Buy: '購入/比較検討したい',
}

/**
 * SEOクエリタイプを分類する
 */
export function classifyQueryType(keyword: string): QueryType {
  const k = keyword.toLowerCase().trim()

  if (!k) {
    return 'Know'
  }

  // ログイン、マイページなど明確な移動意図
  if (/ログイン|マイページ|会員登録|公式/.test(k)) {
    return 'Go'
  }

  // 行動系キーワード
  if (/応募|登録|申し込み|申込|エントリー|面接|履歴書|職務経歴書/.test(k)) {
    return 'Do'
  }

  // 「〜したい」パターン
  if (/したい|しよう|始める|なりたい|なる方法/.test(k)) {
    return 'Do'
  }

  // 比較・選定キーワード
  if (/おすすめ|オススメ|ランキング|比較|vs|選び方|選ぶ|人気|評判|口コミ|レビュー/.test(k)) {
    return 'Buy'
  }

  // 「どこがいい」「どれがいい」パターン
  if (/どこがいい|どれがいい|どっちが|ベスト|トップ/.test(k)) {
    return 'Buy'
  }

  // 明確な情報収集キーワード
  if (/とは|意味|方法|やり方|仕方|違い|メリット|デメリット/.test(k)) {
    return 'Know'
  }

  // 疑問系
  if (/\?|？|なぜ|なに|どう|いくら|何歳|何年/.test(k)) {
    return 'Know'
  }

  // 年収、給料、条件などの情報系
  if (/年収|給料|給与|月給|時給|平均|相場|資格|条件|休日|残業|夜勤/.test(k)) {
    return 'Know'
  }

  // デフォルトはKnow（情報収集）
  return 'Know'
}

/**
 * バッチ処理用：複数キーワードのクエリタイプを一括分類
 */
export function classifyQueryTypes(keywords: string[]): Map<string, QueryType> {
  const results = new Map<string, QueryType>()
  for (const keyword of keywords) {
    results.set(keyword, classifyQueryType(keyword))
  }
  return results
}

/**
 * @deprecated intentからqueryTypeを導出（非推奨：独立分類を使用すること）
 */
export function getQueryTypeFromIntent(intent: QueryIntent): QueryType | null {
  switch (intent) {
    case 'branded':
      return 'Go'
    case 'transactional':
      return 'Do'
    case 'informational':
    case 'b2b':
      return 'Know'
  }
}

// ===========================================
// Claude API + Web検索を使った分類
// ===========================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Claude APIをWeb検索付きで呼び出してキーワードを分類する
 *
 * 処理フロー:
 * 1. キーワードをGoogleで検索（Web検索ツール使用）
 * 2. SERPの上位結果を確認
 * 3. 特定のサービス/企業の公式サイトが上位を占めているか確認
 * 4. 占めていればbranded、それ以外は内容に応じて分類
 *
 * これにより「グリーン歯科」vs「グリーン（転職サイト）」の判別が可能
 */
export async function classifyWithWebSearch(
  keywords: string[],
  batchSize: number = 20  // Web検索はコストがかかるため小バッチ
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()

  if (keywords.length === 0) return results

  // バッチに分割
  const batches: string[][] = []
  for (let i = 0; i < keywords.length; i += batchSize) {
    batches.push(keywords.slice(i, i + batchSize))
  }

  // 順次処理（Web検索のレート制限を考慮）
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    console.log(`[classifyWithWebSearch] Batch ${i + 1}/${batches.length}: ${batch.length}件`)

    const batchResults = await classifyBatchWithWebSearch(batch)

    batchResults.forEach((classification, keyword) => {
      results.set(keyword, classification)
    })

    // レート制限対策: バッチ間で少し待機
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

/**
 * バッチ単位でClaude API + Web検索を呼び出す
 */
async function classifyBatchWithWebSearch(
  keywords: string[]
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()

  if (keywords.length === 0) return results

  const keywordList = keywords.map((k, i) => `${i + 1}. ${k}`).join('\n')

  const systemPrompt = `あなたは求人・転職関連の検索クエリを分析する専門家です。
Web検索ツールを使って実際のGoogle検索結果（SERP）を確認し、キーワードの意図を正確に分類してください。

## 分類カテゴリ

### 1. branded（指名検索）
特定のサービス名・媒体名・企業名・施設名を直接検索している。

**判定方法**: Web検索で確認し、SERPの上位3件が同一サービス/企業の公式ページで占められている場合。

例:
- 「ジョブメドレー」→ SERPにジョブメドレー公式が並ぶ → branded
- 「マイナビ看護師」→ SERPにマイナビ看護師公式が並ぶ → branded
- 「聖路加国際病院」→ SERPに病院公式サイトが並ぶ → branded

**重要**:
- 「グリーン歯科」→ SERPに各地の「〇〇グリーン歯科」が並ぶ → informational（一般名詞として使われている）
- 「Green 転職」→ SERPにGreen（転職サイト）公式が並ぶ → branded

### 2. transactional（応募意図）
求人への応募・転職意図が明確。
- 「〇〇 求人」「〇〇 転職」「〇〇 募集」
- 応募行動に直結するキーワード

### 3. informational（情報収集）
一般的な情報・知識・ハウツー・条件比較を求めている。
- 職種の説明、条件・待遇、ハウツー、比較・おすすめ
- 一般的な職種名単体（応募意図なし）
- SERPに多様なサイトが並ぶ（特定サービスが独占していない）

### 4. b2b（法人向け）
採用担当者・人事が検索するキーワード。
- 採用コスト・費用、採用管理・システム、人材紹介手数料

## 作業手順

1. 各キーワードについて、Web検索ツールで実際に検索
2. SERPの上位結果を確認
3. 上位が特定サービス/企業の公式で独占されているか確認
4. 独占されていればbranded、そうでなければ内容に応じて分類

## 出力形式

必ず以下のJSON形式で返してください：
[
  {"keyword": "キーワード1", "intent": "branded|transactional|informational|b2b", "reason": "分類理由（SERP確認結果を含む、30文字以内）"},
  ...
]`

  const userPrompt = `以下の${keywords.length}件のキーワードを、Web検索で実際のSERPを確認して分類してください。

キーワード:
${keywordList}

各キーワードをWeb検索し、SERPの上位結果に基づいて正確に分類してください。
JSON配列のみを返してください。`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: Math.min(keywords.length, 30),  // 1キーワードあたり最大1回のWeb検索（バッチ30件なら最大30回）
      }],
    })

    // レスポンスからテキストを取得
    // Web検索ツールを使用した場合、contentは複数のブロックになる可能性がある
    let responseText = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text
      }
    }

    // JSONをパース
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('[classifyBatchWithWebSearch] JSON not found in response:', responseText.slice(0, 500))
      throw new Error('JSON not found in response')
    }

    const classifications = JSON.parse(jsonMatch[0]) as Array<{
      keyword: string
      intent: string
      reason: string
    }>

    for (const item of classifications) {
      const intent = item.intent as QueryIntent
      if (['branded', 'transactional', 'informational', 'b2b'].includes(intent)) {
        results.set(item.keyword, {
          intent,
          confidence: 'high',
          reason: item.reason,
          serpVerified: true,
        })
      }
    }

    // 分類されなかったキーワードにデフォルト値を設定
    for (const keyword of keywords) {
      if (!results.has(keyword)) {
        results.set(keyword, {
          intent: 'informational',
          confidence: 'low',
          reason: 'AI分類失敗',
          serpVerified: false,
        })
      }
    }

    // 使用状況をログ
    if (response.usage) {
      const serverToolUse = (response.usage as { server_tool_use?: { web_search_requests?: number } }).server_tool_use
      console.log(`[classifyBatchWithWebSearch] Web検索回数: ${serverToolUse?.web_search_requests || 0}`)
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[classifyBatchWithWebSearch] Error:', errorMessage)

    // エラー時はすべてinformationalに
    for (const keyword of keywords) {
      results.set(keyword, {
        intent: 'informational',
        confidence: 'low',
        reason: `分類エラー: ${errorMessage.slice(0, 30)}`,
        serpVerified: false,
      })
    }
  }

  return results
}

/**
 * Web検索なしのClaude API呼び出し（コスト節約用）
 * ルールで確定できないがWeb検索までは不要な場合に使用
 */
export async function classifyWithClaude(
  keywords: string[],
  batchSize: number = 100
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()

  if (keywords.length === 0) return results

  // バッチに分割
  const batches: string[][] = []
  for (let i = 0; i < keywords.length; i += batchSize) {
    batches.push(keywords.slice(i, i + batchSize))
  }

  // 最大3バッチを並列で処理
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
 * バッチ単位でClaude APIを呼び出す（Web検索なし）
 */
async function classifyBatchWithClaude(
  keywords: string[]
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()

  if (keywords.length === 0) return results

  const keywordList = keywords.map((k, i) => `${i + 1}. ${k}`).join('\n')

  const systemPrompt = `あなたは求人・転職関連の検索クエリを分析する専門家です。
医療・介護・福祉業界を中心に、あらゆる職種の求人検索キーワードを分析できます。

検索キーワードを以下の4つの意図カテゴリに分類してください：

## 1. branded（指名検索）
特定のサービス名・媒体名・企業名・施設名を直接検索している。
- 求人媒体: マイナビ、リクナビ、Indeed、ジョブメドレー、ナース人材バンク等
- 企業名: ○○株式会社、○○法人、○○グループ等
- 施設名: ○○病院、○○クリニック等（具体的な固有名詞）

**重要**: 一般名詞（「病院」「クリニック」単体）はbrandedではない。

## 2. transactional（応募意図）
求人への応募・転職意図が明確。

## 3. informational（情報収集）
一般的な情報・知識・ハウツー・条件比較を求めている。

## 4. b2b（法人向け）
採用担当者・人事が検索するキーワード。

回答は必ず以下のJSON形式で返してください：
[
  {"keyword": "キーワード1", "intent": "branded|transactional|informational|b2b", "reason": "分類理由（20文字以内）"},
  ...
]`

  const userPrompt = `以下の${keywords.length}件のキーワードを分類してください：

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

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

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
      if (['branded', 'transactional', 'informational', 'b2b'].includes(intent)) {
        results.set(item.keyword, {
          intent,
          confidence: 'high',
          reason: item.reason,
          serpVerified: false,
        })
      }
    }

    for (const keyword of keywords) {
      if (!results.has(keyword)) {
        results.set(keyword, {
          intent: 'informational',
          confidence: 'low',
          reason: 'AI分類失敗',
          serpVerified: false,
        })
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[classifyBatchWithClaude] Error:', errorMessage)

    for (const keyword of keywords) {
      results.set(keyword, {
        intent: 'informational',
        confidence: 'low',
        reason: `分類エラー: ${errorMessage.slice(0, 30)}`,
        serpVerified: false,
      })
    }
  }

  return results
}

/**
 * ハイブリッド分類：ルールベース → AI + SERP検証
 *
 * フロー:
 * 1. 全キーワードをルールでチェック
 * 2. 「求人」「転職」「募集」を含む → transactional確定
 * 3. 「採用」+ B2Bワード → b2b確定
 * 4. それ以外はAI + Web検索でSERPを確認して分類
 *    - branded候補は実際のSERPで検証
 *    - 特定サービスが上位を独占していればbranded確定
 */
export async function classifyWithHybrid(
  keywords: string[]
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()
  const needAIKeywords: string[] = []

  // まずルールベースで分類
  for (const keyword of keywords) {
    const ruleResult = classifyByRule(keyword)

    if (ruleResult.classification && !ruleResult.needsAI) {
      // ルールで確定
      results.set(keyword, ruleResult.classification)
    } else {
      // AI + SERP検証が必要
      needAIKeywords.push(keyword)
    }
  }

  console.log(`[classifyWithHybrid] ルール確定: ${results.size}件, AI+SERP検証必要: ${needAIKeywords.length}件`)

  // AI + Web検索でSERPを確認して分類
  if (needAIKeywords.length > 0) {
    const aiResults = await classifyWithWebSearch(needAIKeywords)

    aiResults.forEach((classification, keyword) => {
      results.set(keyword, classification)
    })
  }

  return results
}

// ===========================================
// 後方互換性のための非推奨関数
// ===========================================

/**
 * @deprecated 媒体名リストは使用しない設計に変更
 */
export function loadMediaNames(): Promise<never[]> {
  console.warn('loadMediaNames is deprecated. Media name detection is now handled by AI + Web Search.')
  return Promise.resolve([])
}

/**
 * @deprecated 媒体名リストは使用しない設計に変更
 */
export function getMediaNamesSync(): never[] {
  console.warn('getMediaNamesSync is deprecated. Media name detection is now handled by AI + Web Search.')
  return []
}

/**
 * @deprecated 媒体名リストは使用しない設計に変更
 */
export function clearMediaNameCache(): void {
  console.warn('clearMediaNameCache is deprecated. No cache exists.')
}

/**
 * @deprecated 媒体名リストは使用しない設計に変更
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function addMediaName(name: string): void {
  console.warn('addMediaName is deprecated. Media name detection is now handled by AI + Web Search.')
}

/**
 * @deprecated 媒体名リストは使用しない設計に変更
 */
export function getMediaNames(): string[] {
  console.warn('getMediaNames is deprecated. Media name detection is now handled by AI + Web Search.')
  return []
}
