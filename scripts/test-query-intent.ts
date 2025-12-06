/**
 * クエリ意図分類のテストスクリプト
 * 実行: npx ts-node scripts/test-query-intent.ts
 */

// ロジックをインラインで定義（テスト用）
type QueryIntent = 'branded' | 'transactional' | 'commercial' | 'informational' | 'unknown'

interface IntentClassification {
  intent: QueryIntent
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

const KNOWN_MEDIA_NAMES = [
  'ジョブメドレー', 'jobmedley', 'job-medley', 'マイナビ', 'リクナビ',
  'indeed', 'インディード', 'エン転職', 'doda', 'ナース人材バンク',
]

const JOB_KEYWORDS = [
  '看護師', 'ナース', '介護', 'ヘルパー', '介護福祉士', 'ケアマネ',
  '薬剤師', '保育士', '歯科衛生士', '歯科助手', '理学療法士', '作業療法士',
  '医療事務', '管理栄養士', '放射線技師', '介護士',
]

const CONDITION_KEYWORDS = [
  '年収', '給料', '給与', '月給', '時給', '賞与',
  '年間休日', '休日', '残業', '夜勤',
]

function classifyQueryIntent(keyword: string): IntentClassification {
  const k = keyword.toLowerCase().trim()
  if (!k) return { intent: 'unknown', confidence: 'low', reason: '空のキーワード' }

  // 1. 指名検索
  for (const mediaName of KNOWN_MEDIA_NAMES) {
    if (k.includes(mediaName.toLowerCase())) {
      return { intent: 'branded', confidence: 'high', reason: `媒体名「${mediaName}」を含む` }
    }
  }

  // 2. 応募直前
  if (/求人|転職|募集|採用|応募|中途/.test(k)) {
    return { intent: 'transactional', confidence: 'high', reason: '求人・転職関連キーワードを含む' }
  }

  // 3. 情報収集 - ハウツー/解説
  if (/とは$|とは\s|書き方|意味|方法|やり方|平均|相場|違いは/.test(k)) {
    return { intent: 'informational', confidence: 'high', reason: '解説・ハウツー系キーワードを含む' }
  }

  // 4. 比較検討 - 具体的数値
  if (/\d+日|\d+万|\d+円/.test(k)) {
    return { intent: 'commercial', confidence: 'high', reason: '具体的な数値条件を含む' }
  }

  // 5. 比較検討 - 比較系
  if (/比較|ランキング|おすすめ|オススメ|人気|評判|口コミ|vs/.test(k)) {
    return { intent: 'commercial', confidence: 'high', reason: '比較・評価系キーワードを含む' }
  }

  // 6. 職種 × 条件
  const hasJob = JOB_KEYWORDS.some(job => k.includes(job.toLowerCase()))
  const hasCondition = CONDITION_KEYWORDS.some(cond => k.includes(cond.toLowerCase()))

  if (hasJob && hasCondition) {
    return { intent: 'commercial', confidence: 'medium', reason: '職種と条件の組み合わせ' }
  }
  if (hasCondition && !hasJob) {
    return { intent: 'informational', confidence: 'medium', reason: '条件キーワード単体（一般情報）' }
  }
  if (hasJob && !hasCondition) {
    return { intent: 'unknown', confidence: 'low', reason: '職種キーワード単体（意図不明）' }
  }

  return { intent: 'unknown', confidence: 'low', reason: 'ルールベースで判定不能' }
}

const INTENT_LABELS: Record<QueryIntent, string> = {
  branded: '指名検索',
  transactional: '応募直前',
  commercial: '比較検討',
  informational: '情報収集',
  unknown: '未分類',
}

// テスト用キーワード（JobMedley CSVから抽出）
const testKeywords = [
  // 指名検索
  'ジョブメドレー',
  'ジョブメドレーログイン',
  'job',

  // 応募直前
  '看護師 求人',
  '歯科衛生士 求人',
  '介護求人',
  '保育士求人',
  '転職看護師',
  '医療事務求人',

  // 比較検討
  '年間休日120日',
  '看護師 年収',
  '理学療法士 年収',
  '介護士 給料',

  // 情報収集
  '年間休日',
  '年間休日平均',
  '履歴書 書き方',
  '職務経歴書 書き方',
  '御中',
  '忌引き',
  'ご教示',
  '当直とは',
  'hcuとは',
  '年収',

  // 判定難しいケース
  '看護師',
  '介護',
  '療養型病院',
  'ナーシングホーム',
  '放課後ディサービス',
  '医心館',
  'すみだ水族館',
]

console.log('=== クエリ意図分類テスト ===\n')

const results = {
  branded: [] as string[],
  transactional: [] as string[],
  commercial: [] as string[],
  informational: [] as string[],
  unknown: [] as string[],
}

for (const keyword of testKeywords) {
  const result = classifyQueryIntent(keyword)
  results[result.intent].push(keyword)

  console.log(`「${keyword}」`)
  console.log(`  → ${INTENT_LABELS[result.intent]} (${result.confidence})`)
  console.log(`     理由: ${result.reason}`)
  console.log()
}

console.log('\n=== 分類結果サマリ ===\n')
for (const [intent, keywords] of Object.entries(results)) {
  console.log(`【${INTENT_LABELS[intent as keyof typeof INTENT_LABELS]}】 ${keywords.length}件`)
  keywords.forEach(k => console.log(`  - ${k}`))
  console.log()
}
