// ===========================================
// Inngest Functions
// CSVインポート非同期ジョブの実装
// ===========================================

import { inngest } from './client'
import { createServiceClient } from '@/lib/supabase/server'
import {
  classifyQueryIntent,
  classifyQueryType,
  classifyWithWebSearch,
  IntentClassification,
  QueryType,
} from '@/lib/query-intent'
import { sendTrialExpirationNotification } from '@/lib/email'

/**
 * バッチ処理のサイズ定数
 *
 * Vercel Pro: maxDuration 300秒に設定
 * 各step.run()内の処理が300秒以内に収まるよう設計
 */
const DB_BATCH_SIZE = 500           // DB挿入: 1バッチあたりの件数
const DB_LOOKUP_BATCH_SIZE = 200    // DB検索: 1バッチあたりの件数（日本語キーワードはURLエンコードで膨張するため小さめに設定）
const AI_BATCH_PER_STEP = 30        // AI分類: 1stepあたりの処理件数（Vercel Pro 300秒対応）
const AI_BATCH_SIZE = 30            // Claude API: 1リクエストあたりの件数
const PROGRESS_UPDATE_INTERVAL = 500 // 進捗更新間隔

/**
 * インポート条件の閾値
 * 月間検索数100以上、かつ推定流入数50以上のデータのみインポート
 */
const MIN_SEARCH_VOLUME = 100       // 月間検索数の最小値
const MIN_ESTIMATED_TRAFFIC = 50    // 推定流入数の最小値

/**
 * パース済み行データの型定義
 */
interface ParsedRow {
  keyword: string
  normalizedKeyword: string
  searchVolume: number | null
  cpc: number | null
  competition: number | null
  seoDifficulty: number | null
  searchRank: number | null
  traffic: number | null
  url: string | null
}

/**
 * CSVインポートジョブ
 *
 * 処理フロー:
 * 1. parse-csv: CSVパース
 * 2. db-lookup: DBから既存分類を取得（2回目以降のインポートを高速化）
 * 3. rule-classification: DBにないキーワードをルールベース分類
 * 4. ai-classification-{N}: それでもunknownなキーワードをAI分類（動的にstep分割）
 * 5. db-insert: DB挿入
 * 6. finalize: 完了処理
 */
export const importCsvJob = inngest.createFunction(
  {
    id: 'import-csv-job',
    retries: 3,
    concurrency: {
      limit: 5,
    },
  },
  { event: 'import/csv.started' },
  async ({ event, step }) => {
    const { jobId, fileUrl, fileName, importType: _importType, mediaId } = event.data

    // ジョブを processing に更新（step.runの外なので専用のclientを作成）
    await step.run('init-job', async () => {
      const supabase = createServiceClient()
      await supabase
        .from('import_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          current_step: 'parse',
        })
        .eq('id', jobId)
    })

    // =========================================
    // Step 1: CSVパース
    // =========================================
    const parsedData = await step.run('parse-csv', async () => {
      const supabase = createServiceClient()
      // キャンセルチェック
      const { data: job } = await supabase
        .from('import_jobs')
        .select('status')
        .eq('id', jobId)
        .single()

      if (job?.status === 'cancelled') {
        throw new Error('Job was cancelled')
      }

      // ファイルを取得
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`)
      }

      // ArrayBufferで取得してエンコーディングを検出
      const buffer = await response.arrayBuffer()
      const bytes = new Uint8Array(buffer)

      let content: string

      // UTF-16LE BOM検出 (0xFF 0xFE)
      if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        const decoder = new TextDecoder('utf-16le')
        content = decoder.decode(buffer)
      }
      // UTF-8 BOM検出 (0xEF 0xBB 0xBF)
      else if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        const decoder = new TextDecoder('utf-8')
        content = decoder.decode(buffer)
      }
      // デフォルトはUTF-8
      else {
        const decoder = new TextDecoder('utf-8')
        content = decoder.decode(buffer)
      }

      // BOM除去
      content = content.replace(/^\uFEFF/, '')

      // CSVをパース（Windows形式のCRLF改行に対応するため\rを除去）
      const lines = content
        .split('\n')
        .map((line) => line.replace(/\r$/, ''))
        .filter((line) => line.trim())
      if (lines.length < 2) {
        throw new Error('CSVにデータがありません')
      }

      const delimiter = lines[0].includes('\t') ? '\t' : ','
      const headers = lines[0]
        .split(delimiter)
        .map((h) => h.replace(/^["']|["']$/g, '').trim())

      // カラムマッピング（日本語・英語両対応）
      const columnMap: Record<string, string> = {
        // 日本語
        キーワード: 'keyword',
        月間検索数: 'search_volume',
        'cpc ($)': 'cpc',
        'CPC ($)': 'cpc',
        競合性: 'competition',
        'seo難易度': 'seo_difficulty',
        'SEO難易度': 'seo_difficulty',
        検索順位: 'search_rank',
        推定流入数: 'estimated_traffic',
        // 英語
        url: 'url',
        URL: 'url',
        keyword: 'keyword',
        Keyword: 'keyword',
        search_volume: 'search_volume',
        cpc: 'cpc',
        CPC: 'cpc',
        competition: 'competition',
        seo_difficulty: 'seo_difficulty',
        search_rank: 'search_rank',
        estimated_traffic: 'estimated_traffic',
      }

      // カラムインデックスを取得する関数
      const findColumnIndex = (targetKey: string): number => {
        for (let i = 0; i < headers.length; i++) {
          const h = headers[i]
          const hLower = h.toLowerCase()
          if (columnMap[h] === targetKey || columnMap[hLower] === targetKey) {
            return i
          }
        }
        return -1
      }

      const keywordIndex = findColumnIndex('keyword')
      const searchVolumeIndex = findColumnIndex('search_volume')
      const cpcIndex = findColumnIndex('cpc')
      const competitionIndex = findColumnIndex('competition')
      const seoDifficultyIndex = findColumnIndex('seo_difficulty')
      const searchRankIndex = findColumnIndex('search_rank')
      const trafficIndex = findColumnIndex('estimated_traffic')
      const urlIndex = findColumnIndex('url')

      if (keywordIndex === -1) {
        throw new Error('キーワード列が見つかりません')
      }

      // データ行をパース
      const rows: ParsedRow[] = []
      const parseErrors: string[] = []
      let skippedByThreshold = 0  // 閾値でスキップされた件数

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        try {
          const values = parseCSVLine(line, delimiter)
          const keyword = values[keywordIndex]
            ?.replace(/^["']|["']$/g, '')
            .trim()
          if (!keyword) continue

          const normalizedKeyword = keyword
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim()

          const searchVolume = searchVolumeIndex !== -1
            ? parseNumber(values[searchVolumeIndex])
            : null
          const traffic = trafficIndex !== -1
            ? parseNumber(values[trafficIndex])
            : null

          // インポート条件のバリデーション
          // 月間検索数100以上、かつ推定流入数50以上のみインポート
          const searchVolumeOk = searchVolume !== null && searchVolume >= MIN_SEARCH_VOLUME
          const trafficOk = traffic !== null && traffic >= MIN_ESTIMATED_TRAFFIC

          if (!searchVolumeOk || !trafficOk) {
            skippedByThreshold++
            continue  // 閾値未満のデータはスキップ
          }

          rows.push({
            keyword,
            normalizedKeyword,
            searchVolume,
            cpc:
              cpcIndex !== -1
                ? parseFloat(values[cpcIndex]?.replace(/[^0-9.]/g, '') || '0') ||
                  null
                : null,
            competition:
              competitionIndex !== -1
                ? parseNumber(values[competitionIndex])
                : null,
            seoDifficulty:
              seoDifficultyIndex !== -1
                ? parseNumber(values[seoDifficultyIndex])
                : null,
            searchRank:
              searchRankIndex !== -1
                ? parseNumber(values[searchRankIndex])
                : null,
            traffic,
            url:
              urlIndex !== -1
                ? values[urlIndex]?.replace(/^["']|["']$/g, '').trim() || null
                : null,
          })
        } catch (err) {
          if (parseErrors.length < 10) {
            parseErrors.push(
              `行${i + 1}: ${err instanceof Error ? err.message : 'パースエラー'}`
            )
          }
        }
      }

      if (skippedByThreshold > 0) {
        console.log(`インポート条件でスキップ: ${skippedByThreshold}件（月間検索数<${MIN_SEARCH_VOLUME} または 推定流入数<${MIN_ESTIMATED_TRAFFIC}）`)
      }

      // 総行数を更新
      await supabase
        .from('import_jobs')
        .update({
          total_rows: rows.length,
          current_step: 'db_lookup',
        })
        .eq('id', jobId)

      return { rows, parseErrors, skippedByThreshold }
    })

    // =========================================
    // Step 2: DBから既存分類を取得
    // 既にquery_masterに登録済みのキーワードは分類結果を再利用
    // is_verified=true のキーワードは分類をスキップ（保護）
    // これにより2回目以降のインポートが大幅に高速化される
    // =========================================
    const dbLookupResult = await step.run('db-lookup', async () => {
      const supabase = createServiceClient()
      // キャンセルチェック
      const { data: job } = await supabase
        .from('import_jobs')
        .select('status')
        .eq('id', jobId)
        .single()

      if (job?.status === 'cancelled') {
        throw new Error('Job was cancelled')
      }

      // 正規化キーワードのリストを作成
      const normalizedKeywords = parsedData.rows.map((r) => r.normalizedKeyword)

      // 既存の分類をDBから取得（バッチ処理）
      const existingClassifications: Record<string, IntentClassification> = {}
      const keywordsNeedingClassification: string[] = []
      const normalizedToOriginal: Record<string, string> = {}

      // 既存レコードの正規化キーワードを記録（新規/更新判定用）
      const existingNormalizedKeywords = new Set<string>()

      // 検証済みキーワードを記録（上書き防止用）
      const verifiedNormalizedKeywords = new Set<string>()

      // 正規化キーワード → オリジナルキーワードのマッピング作成
      for (const row of parsedData.rows) {
        normalizedToOriginal[row.normalizedKeyword] = row.keyword
      }

      // バッチでDB検索
      for (let i = 0; i < normalizedKeywords.length; i += DB_LOOKUP_BATCH_SIZE) {
        // キャンセルチェック（2バッチごと）
        if (i > 0 && i % (DB_LOOKUP_BATCH_SIZE * 2) === 0) {
          const { data: checkJob } = await supabase
            .from('import_jobs')
            .select('status')
            .eq('id', jobId)
            .single()

          if (checkJob?.status === 'cancelled') {
            throw new Error('Job was cancelled')
          }
        }

        const batch = normalizedKeywords.slice(i, i + DB_LOOKUP_BATCH_SIZE)

        const { data: existingQueries, error } = await supabase
          .from('keywords')
          .select('keyword_normalized, intent, intent_confidence, intent_reason, is_verified')
          .in('keyword_normalized', batch)

        if (error) {
          console.warn('DB lookup error:', error.message)
          // エラー時はこのバッチは分類が必要なものとして扱う
          for (const normalized of batch) {
            const original = normalizedToOriginal[normalized]
            if (original) {
              keywordsNeedingClassification.push(original)
            }
          }
          continue
        }

        // 取得できたキーワードをマップに追加
        const foundNormalized = new Set<string>()
        if (existingQueries) {
          for (const q of existingQueries) {
            // 既存レコードとして記録（新規/更新判定用）
            existingNormalizedKeywords.add(q.keyword_normalized)

            // 検証済みのキーワードは分類をスキップ（保護）
            if (q.is_verified) {
              verifiedNormalizedKeywords.add(q.keyword_normalized)
              const original = normalizedToOriginal[q.keyword_normalized]
              if (original) {
                existingClassifications[original] = {
                  intent: q.intent as IntentClassification['intent'],
                  confidence: (q.intent_confidence || 'high') as IntentClassification['confidence'],
                  reason: q.intent_reason || '検証済み（保護）',
                }
                foundNormalized.add(q.keyword_normalized)
              }
              continue
            }

            // unknownでない既存分類のみ再利用
            if (q.intent && q.intent !== 'unknown') {
              const original = normalizedToOriginal[q.keyword_normalized]
              if (original) {
                existingClassifications[original] = {
                  intent: q.intent as IntentClassification['intent'],
                  confidence: (q.intent_confidence || 'medium') as IntentClassification['confidence'],
                  reason: q.intent_reason || 'DB既存分類',
                }
                foundNormalized.add(q.keyword_normalized)
              }
            }
          }
        }

        // DBにないキーワード、またはunknownのキーワードは分類が必要
        for (const normalized of batch) {
          if (!foundNormalized.has(normalized)) {
            const original = normalizedToOriginal[normalized]
            if (original && !existingClassifications[original]) {
              keywordsNeedingClassification.push(original)
            }
          }
        }
      }

      const dbHitCount = Object.keys(existingClassifications).length
      const verifiedSkippedCount = verifiedNormalizedKeywords.size
      const needClassificationCount = keywordsNeedingClassification.length

      console.log(`DB検索完了: ${dbHitCount}件がDB一致（うち${verifiedSkippedCount}件が検証済み保護）、${needClassificationCount}件が分類必要`)

      await supabase
        .from('import_jobs')
        .update({
          current_step: 'rule_classification',
        })
        .eq('id', jobId)

      return {
        existingClassifications,
        keywordsNeedingClassification,
        dbHitCount,
        verifiedSkippedCount,
        existingNormalizedKeywords: Array.from(existingNormalizedKeywords),
        verifiedNormalizedKeywords: Array.from(verifiedNormalizedKeywords),
      }
    })

    // =========================================
    // Step 3: ルールベース分類
    // DBにないキーワード、またはunknownだったキーワードのみ処理
    // =========================================
    const ruleClassified = await step.run('rule-classification', async () => {
      const supabase = createServiceClient()
      // キャンセルチェック
      const { data: job } = await supabase
        .from('import_jobs')
        .select('status')
        .eq('id', jobId)
        .single()

      if (job?.status === 'cancelled') {
        throw new Error('Job was cancelled')
      }

      const results: Map<string, IntentClassification> = new Map()
      const unknownKeywords: string[] = []

      // DB既存分類を先にセット
      for (const [keyword, classification] of Object.entries(dbLookupResult.existingClassifications)) {
        results.set(keyword, classification)
      }

      // 分類が必要なキーワードのみルールベース分類
      for (const keyword of dbLookupResult.keywordsNeedingClassification) {
        const result = classifyQueryIntent(keyword)
        results.set(keyword, result)

        // AI判定が必要なキーワード（ルールで確定できなかったもの）を収集
        // classifyQueryIntentはAI判定が必要な場合、reason: 'AI判定が必要' を返す
        if (result.reason === 'AI判定が必要') {
          unknownKeywords.push(keyword)
        }
      }

      const ruleClassifiedCount = dbLookupResult.keywordsNeedingClassification.length - unknownKeywords.length
      console.log(`ルールベース分類完了: ${ruleClassifiedCount}件が分類確定、${unknownKeywords.length}件がAI分類必要`)

      await supabase
        .from('import_jobs')
        .update({
          current_step: 'ai_classification',
        })
        .eq('id', jobId)

      return {
        results: Object.fromEntries(results),
        unknownKeywords,
      }
    })

    // =========================================
    // Step 4: AI分類（動的step分割）
    // unknownキーワードをAI_BATCH_PER_STEP件ずつ別stepで処理
    // これにより各stepが60秒以内に収まる
    // =========================================
    const batchCount = Math.ceil(ruleClassified.unknownKeywords.length / AI_BATCH_PER_STEP)
    const aiClassificationResults: Record<string, IntentClassification> = {}

    // ルールベース分類の結果をコピー
    Object.assign(aiClassificationResults, ruleClassified.results)

    // AI分類バッチを順次実行
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      const batchResult = await step.run(`ai-classification-${batchIndex}`, async () => {
        const supabase = createServiceClient()
        // キャンセルチェック
        const { data: job } = await supabase
          .from('import_jobs')
          .select('status')
          .eq('id', jobId)
          .single()

        if (job?.status === 'cancelled') {
          throw new Error('Job was cancelled')
        }

        const start = batchIndex * AI_BATCH_PER_STEP
        const end = Math.min(start + AI_BATCH_PER_STEP, ruleClassified.unknownKeywords.length)
        const keywords = ruleClassified.unknownKeywords.slice(start, end)

        console.log(`AI分類バッチ ${batchIndex + 1}/${batchCount}: ${keywords.length}件 (${start + 1}-${end})`)

        if (keywords.length === 0) {
          return {}
        }

        try {
          // Claude Web Search を使用してSERP検証付きの高精度分類を実行
          const results = await classifyWithWebSearch(keywords, AI_BATCH_SIZE)
          console.log(`AI分類バッチ ${batchIndex + 1} 完了: ${results.size}件`)
          return Object.fromEntries(results)
        } catch (error) {
          console.error(`AI分類バッチ ${batchIndex + 1} エラー:`, error)
          // エラー時はinformationalをデフォルトで返す
          const fallbackResults: Record<string, IntentClassification> = {}
          for (const kw of keywords) {
            fallbackResults[kw] = {
              intent: 'informational',
              confidence: 'low',
              reason: 'AI分類エラー',
            }
          }
          return fallbackResults
        }
      })

      // バッチ結果をマージ
      Object.assign(aiClassificationResults, batchResult)
    }

    // =========================================
    // Step 5: DB挿入
    // 検証済みキーワード（is_verified=true）は分類を上書きしない
    // classification_sourceを設定する
    // =========================================
    const insertResult = await step.run('db-insert', async () => {
      const supabase = createServiceClient()
      // キャンセルチェック
      const { data: job } = await supabase
        .from('import_jobs')
        .select('status')
        .eq('id', jobId)
        .single()

      if (job?.status === 'cancelled') {
        throw new Error('Job was cancelled')
      }

      // current_stepを更新
      await supabase
        .from('import_jobs')
        .update({
          current_step: 'db_insert',
        })
        .eq('id', jobId)

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      const classifications = new Map<string, IntentClassification>(
        Object.entries(aiClassificationResults).map(([k, v]) => [
          k,
          v as IntentClassification,
        ])
      )

      // 検証済みキーワードのセット（上書き防止）
      const verifiedSet = new Set(dbLookupResult.verifiedNormalizedKeywords)

      // 分類ソースを判定する関数
      const getClassificationSource = (keyword: string): string => {
        // DB既存分類の場合
        if (dbLookupResult.existingClassifications[keyword]) {
          const reason = dbLookupResult.existingClassifications[keyword].reason
          if (reason?.includes('検証済み')) return 'manual'
          if (reason?.includes('DB既存')) return 'unknown' // 既存はソース不明
        }
        // ルールベース分類の場合
        if (!ruleClassified.unknownKeywords.includes(keyword)) {
          return 'rule'
        }
        // AI分類の場合
        return 'ai'
      }

      // query_master用のバッチデータを作成
      // 重複キーワード（同じkeyword_normalized）は後の行を採用（Map上書き）
      // 検証済みキーワードは分類情報を更新しない
      const queryMap = new Map<string, {
        keyword: string
        keyword_normalized: string
        intent: string
        intent_confidence: string
        intent_reason: string
        intent_updated_at: string
        query_type: QueryType  // SEOクエリタイプ（独立分類）
        max_monthly_search_volume: number | null
        max_cpc: number | null
        classification_source: string
      }>()

      let duplicateCount = 0
      let verifiedSkippedCount = 0
      for (const row of parsedData.rows) {
        // 検証済みキーワードは分類を上書きしない（数値データのみ更新）
        if (verifiedSet.has(row.normalizedKeyword)) {
          verifiedSkippedCount++
          // 検証済みの場合でも検索ボリューム等の数値は更新する場合がある
          // ただし、分類情報は上書きしないのでスキップ
          continue
        }

        const classification =
          classifications.get(row.keyword) || classifyQueryIntent(row.keyword)

        // 既に同じkeyword_normalizedがあれば上書き（重複カウント）
        if (queryMap.has(row.normalizedKeyword)) {
          duplicateCount++
        }

        queryMap.set(row.normalizedKeyword, {
          keyword: row.keyword,
          keyword_normalized: row.normalizedKeyword,
          intent: classification.intent,
          intent_confidence: classification.confidence,
          intent_reason: classification.reason,
          intent_updated_at: new Date().toISOString(),
          query_type: classifyQueryType(row.keyword),  // 独立してSEOクエリタイプを分類
          max_monthly_search_volume: row.searchVolume,
          max_cpc: row.cpc,
          classification_source: getClassificationSource(row.keyword),
        })
      }

      // 重複排除後の配列
      const queryBatch = Array.from(queryMap.values())

      if (duplicateCount > 0) {
        console.log(`重複キーワード${duplicateCount}件を排除: ${parsedData.rows.length}件 → ${queryBatch.length}件`)
      }

      // バッチでupsert
      for (let i = 0; i < queryBatch.length; i += DB_BATCH_SIZE) {
        // キャンセルチェック（2バッチごと）
        if (i % (DB_BATCH_SIZE * 2) === 0) {
          const { data: checkJob } = await supabase
            .from('import_jobs')
            .select('status')
            .eq('id', jobId)
            .single()

          if (checkJob?.status === 'cancelled') {
            throw new Error('Job was cancelled')
          }
        }

        const batch = queryBatch.slice(i, i + DB_BATCH_SIZE)
        const { error: batchError } = await supabase
          .from('keywords')
          .upsert(batch, {
            onConflict: 'keyword_normalized',
            ignoreDuplicates: false,
          })

        if (batchError) {
          console.error('Batch upsert error:', batchError)
          errorCount += batch.length
          if (errors.length < 5) {
            errors.push(
              `バッチ${Math.floor(i / DB_BATCH_SIZE) + 1}: ${batchError.message}`
            )
          }
        } else {
          successCount += batch.length
        }

        // 進捗更新
        if ((i + DB_BATCH_SIZE) % PROGRESS_UPDATE_INTERVAL === 0) {
          await supabase
            .from('import_jobs')
            .update({
              processed_rows: Math.min(i + DB_BATCH_SIZE, queryBatch.length),
              success_count: successCount,
              error_count: errorCount,
            })
            .eq('id', jobId)
        }
      }

      // media_keywordsの挿入は別ステップ（insert-media-keywords）で実行
      // 同じジョブで挿入したkeywordsのIDを取得して返す（並列実行問題の解決）
      const insertedKeywordIds: Record<string, string> = {}
      const normalizedKeywordsList = queryBatch.map(q => q.keyword_normalized)

      for (let i = 0; i < normalizedKeywordsList.length; i += DB_LOOKUP_BATCH_SIZE) {
        const batch = normalizedKeywordsList.slice(i, i + DB_LOOKUP_BATCH_SIZE)
        const { data: keywordIds } = await supabase
          .from('keywords')
          .select('id, keyword_normalized')
          .in('keyword_normalized', batch)

        if (keywordIds) {
          keywordIds.forEach((k: { id: string; keyword_normalized: string }) => {
            insertedKeywordIds[k.keyword_normalized] = k.id
          })
        }
      }

      console.log(`[db-insert] ${Object.keys(insertedKeywordIds).length}件のkeyword_idを取得`)

      return { successCount, errorCount, errors, uniqueCount: queryBatch.length, duplicateCount, verifiedSkippedCount, insertedKeywordIds }
    })

    // =========================================
    // Step 5.5: media_keywords挿入（新ステップとして分離）
    // insertResult.insertedKeywordIdsを優先使用（並列実行問題の解決）
    // =========================================
    await step.run('insert-media-keywords', async () => {
      console.log(`[insert-media-keywords] 開始: mediaId=${mediaId}, rows=${parsedData.rows.length}`)

      // supabaseクライアントは先頭で初期化（upsertでも使用するため）
      const supabase = createServiceClient()

      if (!mediaId || parsedData.rows.length === 0) {
        console.log(`[insert-media-keywords] スキップ: mediaId=${mediaId}, rows=${parsedData.rows.length}`)
        return { inserted: 0, errors: 0 }
      }

      // キーワードIDマップ: 常にDBから取得（Inngestキャッシュ問題を回避）
      // insertResultに依存しない設計に変更
      const keywordToId = new Map<string, string>()

      // 全ての正規化キーワードをDBから取得
      const allNormalized = parsedData.rows.map((r) => r.normalizedKeyword)
      // 重複を排除
      const uniqueNormalized = Array.from(new Set(allNormalized))
      console.log(`[insert-media-keywords] キーワードID取得: ${uniqueNormalized.length}件（重複排除後）`)

      // 全キーワードをDBから取得（insertResultに依存しない）
      if (uniqueNormalized.length > 0) {
        const totalBatches = Math.ceil(uniqueNormalized.length / DB_LOOKUP_BATCH_SIZE)
        console.log(`[insert-media-keywords] DBからキーワードID取得: ${uniqueNormalized.length}件 (${totalBatches}バッチ)`)

        for (let i = 0; i < uniqueNormalized.length; i += DB_LOOKUP_BATCH_SIZE) {
          const batchIndex = Math.floor(i / DB_LOOKUP_BATCH_SIZE) + 1
          const batch = uniqueNormalized.slice(i, i + DB_LOOKUP_BATCH_SIZE)

          try {
            const { data: keywordIds, error: lookupError } = await supabase
              .from('keywords')
              .select('id, keyword_normalized')
              .in('keyword_normalized', batch)

            if (lookupError) {
              console.error(`[insert-media-keywords] バッチ${batchIndex}/${totalBatches} エラー:`, {
                message: lookupError.message,
                code: lookupError.code,
                details: lookupError.details,
                hint: lookupError.hint,
                batchSize: batch.length,
                sampleKeyword: batch[0]?.substring(0, 50)
              })
              continue
            }

            if (keywordIds) {
              keywordIds.forEach((q: { id: string; keyword_normalized: string }) => {
                keywordToId.set(q.keyword_normalized, q.id)
              })
              if (batchIndex % 10 === 0 || batchIndex === totalBatches) {
                console.log(`[insert-media-keywords] バッチ${batchIndex}/${totalBatches} 完了: ${keywordIds.length}件取得`)
              }
            }
          } catch (err) {
            console.error(`[insert-media-keywords] バッチ${batchIndex}/${totalBatches} 例外:`, err)
            continue
          }
        }
      }

      console.log(`[insert-media-keywords] 合計${keywordToId.size}件のキーワードIDを取得`)

      if (keywordToId.size === 0) {
        console.log(`[insert-media-keywords] keywordToIdが空のためスキップ`)
        return { inserted: 0, errors: 0 }
      }

      // 重複排除: 同じkeyword_idは後の行で上書き（CSVに同じキーワードが複数ある場合対策）
      const mediaKeywordsMap = new Map<string, {
        keyword_id: string
        media_id: string
        ranking_position: number | null
        monthly_search_volume: number | null
        estimated_traffic: number | null
        cpc: number | null
        competition_level: number | null
        seo_difficulty: number | null
        landing_url: string | null
        source_file: string
      }>()

      for (const row of parsedData.rows) {
        const keywordId = keywordToId.get(row.normalizedKeyword)
        if (!keywordId) continue

        // 同じkeyword_idがあれば上書き（後の行を採用）
        mediaKeywordsMap.set(keywordId, {
          keyword_id: keywordId,
          media_id: mediaId,
          ranking_position: row.searchRank,
          monthly_search_volume: row.searchVolume,
          estimated_traffic: row.traffic,
          cpc: row.cpc,
          competition_level: row.competition,
          seo_difficulty: row.seoDifficulty,
          landing_url: row.url,
          source_file: fileName,
        })
      }

      const mediaKeywordsBatch = Array.from(mediaKeywordsMap.values())
      console.log(`[insert-media-keywords] 重複排除後: ${mediaKeywordsBatch.length}件 (元: ${parsedData.rows.length}件)`)

      // デバッグ: 最初のデータをログ出力
      if (mediaKeywordsBatch.length > 0) {
        console.log(`[insert-media-keywords] サンプルデータ:`, JSON.stringify(mediaKeywordsBatch[0]))
      }

      let mediaKeywordsSuccess = 0
      let mediaKeywordsError = 0
      let firstErrorMessage = ''

      // 小さいバッチサイズでupsert（エラー特定のため）
      const MEDIA_KEYWORDS_BATCH_SIZE = 50

      for (let i = 0; i < mediaKeywordsBatch.length; i += MEDIA_KEYWORDS_BATCH_SIZE) {
        const batch = mediaKeywordsBatch.slice(i, i + MEDIA_KEYWORDS_BATCH_SIZE)
        const { error: mediaError } = await supabase
          .from('media_keywords')
          .upsert(batch, {
            onConflict: 'media_id,keyword_id',
            ignoreDuplicates: false,
          })

        if (mediaError) {
          console.error('[insert-media-keywords] batch error:', mediaError.message, mediaError.details, mediaError.hint)
          if (!firstErrorMessage) {
            firstErrorMessage = `${mediaError.message} | ${mediaError.details || ''} | ${mediaError.hint || ''}`
          }
          mediaKeywordsError += batch.length
        } else {
          mediaKeywordsSuccess += batch.length
        }
      }

      console.log(`[insert-media-keywords] 完了: 成功=${mediaKeywordsSuccess}, エラー=${mediaKeywordsError}`)
      return { inserted: mediaKeywordsSuccess, errors: mediaKeywordsError, firstError: firstErrorMessage || null }
    })

    // =========================================
    // Step 6: 完了処理
    // =========================================
    await step.run('finalize', async () => {
      const supabase = createServiceClient()

      // 意図分類サマリを集計（重複排除後のデータで集計）
      // 6カテゴリ + unknown
      const intentSummary = {
        branded_media: 0,
        branded_customer: 0,
        branded_ambiguous: 0,
        transactional: 0,
        informational: 0,
        b2b: 0,
        unknown: 0,
      }

      const classifications = new Map<string, IntentClassification>(
        Object.entries(aiClassificationResults).map(([k, v]) => [
          k,
          v as IntentClassification,
        ])
      )

      // 重複排除してから集計（keyword_normalizedで一意にする）
      const countedNormalized = new Set<string>()
      for (const row of parsedData.rows) {
        if (countedNormalized.has(row.normalizedKeyword)) {
          continue // 既にカウント済みの重複はスキップ
        }
        countedNormalized.add(row.normalizedKeyword)

        const classification = classifications.get(row.keyword)
        if (classification) {
          const intent = classification.intent as keyof typeof intentSummary
          if (intent in intentSummary) {
            intentSummary[intent]++
          }
        }
      }

      // 分類統計情報
      const classificationStats = {
        db_existing: dbLookupResult.dbHitCount,
        rule_classified: dbLookupResult.keywordsNeedingClassification.length - ruleClassified.unknownKeywords.length,
        ai_classified: ruleClassified.unknownKeywords.length,
        verified_skipped: insertResult.verifiedSkippedCount,
        total_input: parsedData.rows.length,
        unique_keywords: insertResult.uniqueCount,
        duplicate_keywords: insertResult.duplicateCount,
        skipped_by_threshold: parsedData.skippedByThreshold,  // 閾値でスキップされた件数
      }

      // ジョブを完了状態に更新
      await supabase
        .from('import_jobs')
        .update({
          status: 'completed',
          processed_rows: insertResult.uniqueCount, // 重複排除後の件数
          success_count: insertResult.successCount,
          error_count: insertResult.errorCount + parsedData.parseErrors.length,
          intent_summary: intentSummary,
          classification_stats: classificationStats,
          error_details:
            insertResult.errors.length > 0 || parsedData.parseErrors.length > 0 || insertResult.duplicateCount > 0
              ? {
                  insertErrors: insertResult.errors,
                  parseErrors: parsedData.parseErrors,
                  duplicateInfo: insertResult.duplicateCount > 0
                    ? `CSV内に${insertResult.duplicateCount}件の重複キーワードがありました（後の行を採用）`
                    : undefined,
                }
              : null,
          current_step: 'finalize',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      return {
        success: true,
        totalRows: parsedData.rows.length,
        uniqueRows: insertResult.uniqueCount,
        successCount: insertResult.successCount,
        errorCount: insertResult.errorCount,
        intentSummary,
        classificationStats,
      }
    })
  }
)

/**
 * CSV行をパース（クォート対応）
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"' && !inQuotes) {
      inQuotes = true
    } else if (char === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = false
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)

  return result
}

/**
 * 数値をパース
 */
function parseNumber(value: string | undefined): number | null {
  if (!value) return null
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? null : num
}

/**
 * トライアル期間終了通知スケジュールジョブ
 * 設計書: GAP-009 トライアル期間終了通知スケジュール
 *
 * 毎日09:00 JSTに実行し、トライアル終了まで7/3/1/0日のユーザーに通知メールを送信
 * 重複通知を防ぐため、upgrade_notified_at を使用して送信済みを記録
 */
export const trialNotificationScheduler = inngest.createFunction(
  {
    id: 'trial-notification-scheduler',
    retries: 2,
  },
  // 毎日00:00 UTC = 09:00 JST
  { cron: '0 0 * * *' },
  async ({ step }) => {
    // 通知対象の残り日数
    const notificationDays = [7, 3, 1, 0]

    const results = await step.run('check-trial-users', async () => {
      const supabase = createServiceClient()
      const now = new Date()

      const notificationResults: {
        daysRemaining: number
        usersFound: number
        notificationsSent: number
        errors: string[]
      }[] = []

      for (const days of notificationDays) {
        // 対象日の開始と終了を計算
        const targetDate = new Date(now)
        targetDate.setDate(targetDate.getDate() + days)
        const startOfDay = new Date(targetDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(targetDate)
        endOfDay.setHours(23, 59, 59, 999)

        // トライアルプランで、指定日に終了するユーザーを取得
        const { data: users, error } = await supabase
          .from('users')
          .select('id, email, company_name, trial_ends_at, upgrade_notified_at')
          .eq('plan', 'trial')
          .gte('trial_ends_at', startOfDay.toISOString())
          .lte('trial_ends_at', endOfDay.toISOString())

        if (error) {
          console.error(`Failed to fetch users for ${days} days:`, error)
          notificationResults.push({
            daysRemaining: days,
            usersFound: 0,
            notificationsSent: 0,
            errors: [error.message],
          })
          continue
        }

        const usersToNotify = users || []
        let notificationsSent = 0
        const errors: string[] = []

        for (const user of usersToNotify) {
          // 既に同じ日数で通知済みかチェック（24時間以内に同じ通知を送らない）
          if (user.upgrade_notified_at) {
            const lastNotified = new Date(user.upgrade_notified_at)
            const hoursSinceLastNotification = (now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60)
            if (hoursSinceLastNotification < 24) {
              continue
            }
          }

          try {
            const result = await sendTrialExpirationNotification({
              email: user.email,
              userName: user.company_name || undefined,
              daysRemaining: days,
              trialEndsAt: user.trial_ends_at!,
            })

            if (result.success) {
              // 通知送信日時を記録
              await supabase
                .from('users')
                .update({ upgrade_notified_at: now.toISOString() })
                .eq('id', user.id)
              notificationsSent++
            } else {
              errors.push(`${user.email}: ${result.error}`)
            }
          } catch (err) {
            errors.push(`${user.email}: ${err instanceof Error ? err.message : 'Unknown error'}`)
          }
        }

        notificationResults.push({
          daysRemaining: days,
          usersFound: usersToNotify.length,
          notificationsSent,
          errors,
        })
      }

      return notificationResults
    })

    console.log('Trial notification results:', JSON.stringify(results, null, 2))

    return {
      success: true,
      results,
      executedAt: new Date().toISOString(),
    }
  }
)

/**
 * すべてのInngest関数をエクスポート
 */
export const functions = [importCsvJob, trialNotificationScheduler]
