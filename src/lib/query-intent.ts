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
 * - b2b: 法人向け（採用担当者・人事向けの情報）
 * - unknown: 判定不能（AI判定が必要）
 */
export type QueryIntent = 'branded' | 'transactional' | 'commercial' | 'informational' | 'b2b' | 'unknown'

/**
 * SEO標準のクエリタイプ（Do/Know/Go/Buy）
 * - Do: 行動したい（応募、登録など）
 * - Know: 知りたい（情報収集）
 * - Go: 特定サイトへ行きたい（指名検索）
 * - Buy: 購入/比較検討したい
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
 * 条件キーワード（求職者向け）
 */
const CONDITION_KEYWORDS = [
  '年収', '給料', '給与', '月給', '時給', '賞与', 'ボーナス',
  '年間休日', '休日', '休み', '有給', '週休',
  '残業', '夜勤', '日勤', 'オンコール',
  '福利厚生', '社会保険', '退職金',
]

/**
 * 法人向け（B2B）キーワード
 * 採用担当者・人事が検索するキーワード
 */
const B2B_KEYWORDS = [
  // 採用コスト・費用関連
  '採用コスト', '採用費用', '採用単価', '紹介手数料', '紹介料',
  '求人広告 費用', '求人広告 料金', '採用予算', '採用費',
  // 法規制・労務関連
  '最低賃金', '労働基準法', '労基法', '雇用契約', '労働契約',
  '雇用保険', '労災保険', '社会保険料', '36協定',
  '配置基準', '人員配置', '人員基準',
  // 助成金・補助金
  '助成金', '補助金', 'キャリアアップ助成金', '雇用調整助成金',
  'トライアル雇用', '特定求職者雇用開発助成金',
  // 採用・人事戦略
  '採用計画', '採用戦略', '人材確保', '人材不足', '人手不足',
  '定着率', '離職率', '採用難', '人材獲得',
  '採用成功率', '採用効率', 'ダイレクトリクルーティング',
  // 求人媒体選定（法人視点）
  '求人媒体 比較', '求人サイト 比較', '人材紹介 比較',
  '求人媒体 選び方', '採用媒体', '採用チャネル',
  // 人事・労務管理
  '人事評価', '給与計算', '勤怠管理', 'シフト管理',
  '採用管理', 'ATS', '応募者管理',
]

/**
 * 法人向け確定キーワード（これが含まれていれば確実にB2B）
 */
const B2B_STRONG_KEYWORDS = [
  '採用コスト', '採用単価', '紹介手数料', '採用予算',
  '配置基準', '人員配置', '36協定', '助成金', '補助金',
  '採用計画', '採用戦略', '定着率', '離職率',
  '採用媒体', '採用チャネル', 'ATS', '応募者管理',
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

  // 1. 法人向け（B2B）- 強いキーワードを最優先でチェック
  for (const b2bKeyword of B2B_STRONG_KEYWORDS) {
    if (k.includes(b2bKeyword.toLowerCase())) {
      return {
        intent: 'b2b',
        confidence: 'high',
        reason: `法人向けキーワード「${b2bKeyword}」を含む`,
      }
    }
  }

  // 2. 法人向け（B2B）- 通常のB2Bキーワード
  for (const b2bKeyword of B2B_KEYWORDS) {
    if (k.includes(b2bKeyword.toLowerCase())) {
      return {
        intent: 'b2b',
        confidence: 'medium',
        reason: `採用担当向けキーワード「${b2bKeyword}」を含む`,
      }
    }
  }

  // 3. 指名検索 - 媒体名を含む
  for (const mediaName of KNOWN_MEDIA_NAMES) {
    if (k.includes(mediaName.toLowerCase())) {
      return {
        intent: 'branded',
        confidence: 'high',
        reason: `媒体名「${mediaName}」を含む`,
      }
    }
  }

  // 4. 応募直前 - 求人意図が明確（求職者視点）
  // 注: 「採用」は法人視点で使われることも多いが、「求人」「転職」「応募」は求職者視点
  if (/求人|転職|募集|応募|中途採用/.test(k)) {
    // 「採用」単体は法人視点の可能性があるので除外し、
    // 「中途採用」のような求職者視点の場合のみマッチ
    return {
      intent: 'transactional',
      confidence: 'high',
      reason: '求人・転職関連キーワードを含む',
    }
  }

  // 5. 情報収集 - ハウツー/解説/一般知識（優先度高）
  if (/とは$|とは\s|書き方|意味|方法|やり方|平均|相場|違いは/.test(k)) {
    return {
      intent: 'informational',
      confidence: 'high',
      reason: '解説・ハウツー系キーワードを含む',
    }
  }

  // 6. 比較検討 - 具体的数値を含む（求職者の条件検討）
  if (/\d+日|\d+万|\d+円/.test(k)) {
    return {
      intent: 'commercial',
      confidence: 'high',
      reason: '具体的な数値条件を含む',
    }
  }

  // 7. 比較検討 - 比較系キーワード（求職者・法人両方あり得る）
  if (/比較|ランキング|おすすめ|オススメ|人気|評判|口コミ|vs/.test(k)) {
    // 「求人媒体 比較」「採用媒体」などはB2Bで先に判定済みなので
    // ここに来るのは求職者視点の比較検討
    return {
      intent: 'commercial',
      confidence: 'high',
      reason: '比較・評価系キーワードを含む',
    }
  }

  // 8. 職種 × 条件 の組み合わせ判定
  const hasJob = JOB_KEYWORDS.some(job => k.includes(job.toLowerCase()))
  const hasCondition = CONDITION_KEYWORDS.some(cond => k.includes(cond.toLowerCase()))

  if (hasJob && hasCondition) {
    return {
      intent: 'commercial',
      confidence: 'medium',
      reason: '職種と条件の組み合わせ',
    }
  }

  // 9. 条件キーワード単体 → 情報収集
  if (hasCondition && !hasJob) {
    return {
      intent: 'informational',
      confidence: 'medium',
      reason: '条件キーワード単体（一般情報）',
    }
  }

  // 10. 職種キーワード単体 → 判定不能（求人か情報か不明）
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
  b2b: '法人向け',
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
  b2b: '採用担当者・人事が検索している',
  unknown: 'AI分析が必要',
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
 * SEOクエリタイプを独立して分類する（intentとは別軸）
 *
 * Do: 行動系（登録、応募、申し込みなど）
 * Know: 情報系（〜とは、年収、資格、方法など）
 * Go: 指名系（特定サイト・施設名）
 * Buy: 比較選定系（おすすめ、ランキング、比較など）
 */
export function classifyQueryType(keyword: string): QueryType {
  const k = keyword.toLowerCase().trim()

  if (!k) {
    return 'Know' // デフォルト
  }

  // ===========================================
  // Go: 特定サイト・施設・サービスに行きたい
  // ===========================================

  // 媒体名・サービス名を含む場合
  for (const mediaName of KNOWN_MEDIA_NAMES) {
    if (k.includes(mediaName.toLowerCase())) {
      return 'Go'
    }
  }

  // 施設名パターン（〜病院、〜クリニック、〜薬局など）
  if (/病院|クリニック|薬局|施設|センター|ホーム|園$/.test(k)) {
    // ただし「病院 求人」などは除外（情報収集的）
    if (!/求人|転職|募集|年収|給料/.test(k)) {
      return 'Go'
    }
  }

  // ログイン、マイページなど明確な移動意図
  if (/ログイン|マイページ|会員登録|公式/.test(k)) {
    return 'Go'
  }

  // ===========================================
  // Do: 行動したい（応募、登録、申し込みなど）
  // ===========================================

  // 行動系キーワード
  if (/応募|登録|申し込み|申込|エントリー|面接|履歴書|職務経歴書/.test(k)) {
    return 'Do'
  }

  // 「〜したい」パターン
  if (/したい|しよう|始める|なりたい|なる方法/.test(k)) {
    return 'Do'
  }

  // ===========================================
  // Buy: 比較選定したい（おすすめ、ランキングなど）
  // ===========================================

  // 比較・選定キーワード
  if (/おすすめ|オススメ|ランキング|比較|vs|選び方|選ぶ|人気|評判|口コミ|レビュー/.test(k)) {
    return 'Buy'
  }

  // 「どこがいい」「どれがいい」パターン
  if (/どこがいい|どれがいい|どっちが|ベスト|トップ/.test(k)) {
    return 'Buy'
  }

  // ===========================================
  // Know: 情報を知りたい（デフォルト）
  // ===========================================

  // 明確な情報収集キーワード
  if (/とは|とは$|意味|方法|やり方|仕方|違い|メリット|デメリット/.test(k)) {
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

  // 求人・転職だけでは行動に直結しない（情報収集段階）
  if (/求人|転職|募集|採用/.test(k)) {
    // 「求人 おすすめ」はBuyで先にマッチ済み
    // 「求人」単体や「看護師 求人」は情報収集
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
    case 'commercial':
      return 'Buy'
    case 'informational':
    case 'b2b':
      return 'Know'
    case 'unknown':
      return null
  }
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

検索キーワードを以下の5つの意図カテゴリに分類してください：

1. **branded（指名検索）**: 特定のサービス名・媒体名・施設名を直接検索している
   例: 「ジョブメドレー」「マイナビ看護師」「○○病院」

2. **transactional（応募直前）**: 求人への応募・転職意図が明確
   例: 「看護師 求人」「介護士 転職」「薬剤師 募集」

3. **commercial（比較検討）**: 転職条件を比較・検討している段階
   例: 「看護師 年収 平均」「介護福祉士 年間休日120日」「薬剤師 おすすめ転職サイト」

4. **informational（情報収集）**: 一般的な情報・知識・ハウツーを求めている
   例: 「看護師とは」「介護福祉士 資格」「履歴書 書き方」「有給休暇 平均」

5. **b2b（法人向け）**: 採用担当者・人事が検索するキーワード
   例: 「採用コスト」「最低賃金」「紹介手数料」「助成金」「離職率」「人手不足」「配置基準」

回答は必ず以下のJSON形式で返してください：
[
  {"keyword": "キーワード1", "intent": "branded|transactional|commercial|informational|b2b", "reason": "分類理由（20文字以内）"},
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
      if (['branded', 'transactional', 'commercial', 'informational', 'b2b'].includes(intent)) {
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
