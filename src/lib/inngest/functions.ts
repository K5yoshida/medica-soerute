// ===========================================
// Inngest Functions
// CSVインポート非同期ジョブの実装
// ===========================================

import { inngest } from './client'
import { createServiceClient } from '@/lib/supabase/server'
import {
  classifyQueryIntent,
  classifyWithClaude,
  IntentClassification,
} from '@/lib/query-intent'

/**
 * 進捗更新の間隔（行数）
 * DBへの過度な書き込みを防ぐため500行ごとに更新
 */
const PROGRESS_UPDATE_INTERVAL = 500

/**
 * バッチ処理のサイズ
 */
const DB_BATCH_SIZE = 500
const AI_BATCH_SIZE = 100

/**
 * CSVインポートジョブ
 *
 * 5つのステップで構成:
 * 1. parse: CSVパース
 * 2. rule_classification: ルールベース分類
 * 3. ai_classification: AI分類（unknownのみ）
 * 4. db_insert: DB挿入
 * 5. finalize: 完了処理
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
    const supabase = createServiceClient()

    // ジョブを processing に更新
    await supabase
      .from('import_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        current_step: 'parse',
      })
      .eq('id', jobId)

    // Step 1: CSVをパース
    const parsedData = await step.run('parse-csv', async () => {
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

      let content = await response.text()

      // BOM除去
      content = content.replace(/^\uFEFF/, '')

      // CSVをパース
      const lines = content.split('\n').filter((line) => line.trim())
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

      const rows: ParsedRow[] = []
      const parseErrors: string[] = []

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

          rows.push({
            keyword,
            normalizedKeyword,
            searchVolume:
              searchVolumeIndex !== -1
                ? parseNumber(values[searchVolumeIndex])
                : null,
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
            traffic:
              trafficIndex !== -1 ? parseNumber(values[trafficIndex]) : null,
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

      // 総行数を更新
      await supabase
        .from('import_jobs')
        .update({
          total_rows: rows.length,
          current_step: 'rule_classification',
        })
        .eq('id', jobId)

      return { rows, parseErrors }
    })

    // Step 2: ルールベース分類
    const ruleClassified = await step.run('rule-classification', async () => {
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

      for (const row of parsedData.rows) {
        const result = classifyQueryIntent(row.keyword)
        results.set(row.keyword, result)

        if (result.intent === 'unknown') {
          unknownKeywords.push(row.keyword)
        }
      }

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

    // Step 3: AI分類（unknownのみ）
    const aiClassified = await step.run('ai-classification', async () => {
      // キャンセルチェック
      const { data: job } = await supabase
        .from('import_jobs')
        .select('status')
        .eq('id', jobId)
        .single()

      if (job?.status === 'cancelled') {
        throw new Error('Job was cancelled')
      }

      const results = new Map<string, IntentClassification>(
        Object.entries(ruleClassified.results).map(([k, v]) => [
          k,
          v as IntentClassification,
        ])
      )

      if (ruleClassified.unknownKeywords.length > 0) {
        console.log(
          `AI分類対象: ${ruleClassified.unknownKeywords.length}件`
        )

        try {
          const aiResults = await classifyWithClaude(
            ruleClassified.unknownKeywords,
            AI_BATCH_SIZE
          )

          aiResults.forEach((classification, keyword) => {
            results.set(keyword, classification)
          })
        } catch (error) {
          console.error('AI分類エラー:', error)
          // AI分類失敗時はunknownのまま
        }
      }

      await supabase
        .from('import_jobs')
        .update({
          current_step: 'db_insert',
        })
        .eq('id', jobId)

      return Object.fromEntries(results)
    })

    // Step 4: DB挿入
    const insertResult = await step.run('db-insert', async () => {
      // キャンセルチェック
      const { data: job } = await supabase
        .from('import_jobs')
        .select('status')
        .eq('id', jobId)
        .single()

      if (job?.status === 'cancelled') {
        throw new Error('Job was cancelled')
      }

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      const classifications = new Map<string, IntentClassification>(
        Object.entries(aiClassified).map(([k, v]) => [
          k,
          v as IntentClassification,
        ])
      )

      // query_master用のバッチデータを作成
      const queryBatch = parsedData.rows.map((row) => {
        const classification =
          classifications.get(row.keyword) || classifyQueryIntent(row.keyword)

        return {
          keyword: row.keyword,
          keyword_normalized: row.normalizedKeyword,
          intent: classification.intent,
          intent_confidence: classification.confidence,
          intent_reason: classification.reason,
          intent_updated_at: new Date().toISOString(),
          max_monthly_search_volume: row.searchVolume,
          max_cpc: row.cpc,
        }
      })

      // バッチでupsert
      for (let i = 0; i < queryBatch.length; i += DB_BATCH_SIZE) {
        // キャンセルチェック
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
          .from('query_master')
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

      // media_idが指定されている場合はmedia_query_dataも作成
      if (mediaId && parsedData.rows.length > 0) {
        const normalizedKeywords = parsedData.rows.map((r) => r.normalizedKeyword)
        const { data: queryIds } = await supabase
          .from('query_master')
          .select('id, keyword_normalized')
          .in('keyword_normalized', normalizedKeywords)

        if (queryIds && queryIds.length > 0) {
          const keywordToId = new Map(
            queryIds.map(
              (q: { id: string; keyword_normalized: string }) => [
                q.keyword_normalized,
                q.id,
              ]
            )
          )

          const mediaQueryBatch = parsedData.rows
            .map((row) => {
              const queryId = keywordToId.get(row.normalizedKeyword)
              if (!queryId) return null

              return {
                query_id: queryId,
                media_id: mediaId,
                ranking_position: row.searchRank,
                monthly_search_volume: row.searchVolume,
                estimated_traffic: row.traffic,
                cpc: row.cpc,
                competition_level: row.competition,
                seo_difficulty: row.seoDifficulty,
                landing_url: row.url,
                source_file: fileName,
              }
            })
            .filter(Boolean)

          for (let i = 0; i < mediaQueryBatch.length; i += DB_BATCH_SIZE) {
            const batch = mediaQueryBatch.slice(i, i + DB_BATCH_SIZE)
            const { error: mediaError } = await supabase
              .from('media_query_data')
              .upsert(batch, {
                onConflict: 'media_id,query_id',
                ignoreDuplicates: false,
              })

            if (mediaError) {
              console.warn('media_query_data batch error:', mediaError.message)
            }
          }
        }
      }

      return { successCount, errorCount, errors }
    })

    // Step 5: 完了処理
    await step.run('finalize', async () => {
      // 意図分類サマリを集計
      const intentSummary = {
        branded: 0,
        transactional: 0,
        commercial: 0,
        informational: 0,
        unknown: 0,
      }

      const classifications = new Map<string, IntentClassification>(
        Object.entries(aiClassified).map(([k, v]) => [
          k,
          v as IntentClassification,
        ])
      )

      for (const row of parsedData.rows) {
        const classification = classifications.get(row.keyword)
        if (classification) {
          const intent = classification.intent as keyof typeof intentSummary
          if (intent in intentSummary) {
            intentSummary[intent]++
          }
        }
      }

      // ジョブを完了状態に更新
      await supabase
        .from('import_jobs')
        .update({
          status: 'completed',
          processed_rows: parsedData.rows.length,
          success_count: insertResult.successCount,
          error_count: insertResult.errorCount + parsedData.parseErrors.length,
          intent_summary: intentSummary,
          error_details:
            insertResult.errors.length > 0 || parsedData.parseErrors.length > 0
              ? {
                  insertErrors: insertResult.errors,
                  parseErrors: parsedData.parseErrors,
                }
              : null,
          current_step: 'finalize',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      return {
        success: true,
        totalRows: parsedData.rows.length,
        successCount: insertResult.successCount,
        errorCount: insertResult.errorCount,
        intentSummary,
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
 * すべてのInngest関数をエクスポート
 */
export const functions = [importCsvJob]
