/**
 * 既存キーワードのquery_typeを独立分類ロジックで再分類するスクリプト
 *
 * Usage:
 *   npx tsx scripts/reclassify-query-types.ts
 */

import { createClient } from '@supabase/supabase-js'

// Supabase設定
const SUPABASE_URL = 'https://kzsicclxjtmzbbmxotfe.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6c2ljY2x4anRtemJibXhvdGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDgyNzc2NSwiZXhwIjoyMDgwNDAzNzY1fQ.iTMbl4ZHZPxQOXHiEKJH2aJIRKnaEOlbewcSGVJLn5U'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 既知の求人媒体名リスト
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

type QueryType = 'Do' | 'Know' | 'Go' | 'Buy'

/**
 * SEOクエリタイプを独立して分類する（intentとは別軸）
 */
function classifyQueryType(keyword: string): QueryType {
  const k = keyword.toLowerCase().trim()

  if (!k) {
    return 'Know'
  }

  // Go: 特定サイト・施設・サービスに行きたい
  for (const mediaName of KNOWN_MEDIA_NAMES) {
    if (k.includes(mediaName.toLowerCase())) {
      return 'Go'
    }
  }

  // 施設名パターン
  if (/病院|クリニック|薬局|施設|センター|ホーム|園$/.test(k)) {
    if (!/求人|転職|募集|年収|給料/.test(k)) {
      return 'Go'
    }
  }

  // ログイン、マイページなど
  if (/ログイン|マイページ|会員登録|公式/.test(k)) {
    return 'Go'
  }

  // Do: 行動したい
  if (/応募|登録|申し込み|申込|エントリー|面接|履歴書|職務経歴書/.test(k)) {
    return 'Do'
  }

  if (/したい|しよう|始める|なりたい|なる方法/.test(k)) {
    return 'Do'
  }

  // Buy: 比較選定したい
  if (/おすすめ|オススメ|ランキング|比較|vs|選び方|選ぶ|人気|評判|口コミ|レビュー/.test(k)) {
    return 'Buy'
  }

  if (/どこがいい|どれがいい|どっちが|ベスト|トップ/.test(k)) {
    return 'Buy'
  }

  // Know: 情報を知りたい（デフォルト）
  if (/とは|とは$|意味|方法|やり方|仕方|違い|メリット|デメリット/.test(k)) {
    return 'Know'
  }

  if (/\?|？|なぜ|なに|どう|いくら|何歳|何年/.test(k)) {
    return 'Know'
  }

  if (/年収|給料|給与|月給|時給|平均|相場|資格|条件|休日|残業|夜勤/.test(k)) {
    return 'Know'
  }

  if (/求人|転職|募集|採用/.test(k)) {
    return 'Know'
  }

  return 'Know'
}

async function main() {
  console.log('=== Query Type 再分類スクリプト ===\n')

  // 全キーワードを取得
  const { data: keywords, error } = await supabase
    .from('query_master')
    .select('id, keyword, query_type, intent')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('キーワード取得エラー:', error)
    process.exit(1)
  }

  console.log(`取得件数: ${keywords.length}件\n`)

  // 再分類
  const updates: { id: string; keyword: string; oldType: string | null; newType: QueryType }[] = []
  const stats = { Do: 0, Know: 0, Go: 0, Buy: 0 }

  for (const kw of keywords) {
    const newType = classifyQueryType(kw.keyword)
    stats[newType]++

    if (kw.query_type !== newType) {
      updates.push({
        id: kw.id,
        keyword: kw.keyword,
        oldType: kw.query_type,
        newType,
      })
    }
  }

  console.log('=== 新分類結果 ===')
  console.log(`Do: ${stats.Do}件`)
  console.log(`Know: ${stats.Know}件`)
  console.log(`Go: ${stats.Go}件`)
  console.log(`Buy: ${stats.Buy}件`)
  console.log(`\n変更対象: ${updates.length}件\n`)

  // サンプル表示
  console.log('=== 変更サンプル（最初の20件）===')
  for (const u of updates.slice(0, 20)) {
    console.log(`  "${u.keyword}": ${u.oldType} → ${u.newType}`)
  }

  if (updates.length === 0) {
    console.log('\n変更なし。終了します。')
    return
  }

  // バッチ更新
  console.log('\n=== DB更新開始 ===')
  const BATCH_SIZE = 100
  let successCount = 0

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE)

    for (const u of batch) {
      const { error: updateError } = await supabase
        .from('query_master')
        .update({ query_type: u.newType })
        .eq('id', u.id)

      if (updateError) {
        console.error(`更新エラー (${u.keyword}):`, updateError)
      } else {
        successCount++
      }
    }

    console.log(`進捗: ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}件`)
  }

  console.log(`\n=== 完了 ===`)
  console.log(`更新成功: ${successCount}/${updates.length}件`)
}

main().catch(console.error)
