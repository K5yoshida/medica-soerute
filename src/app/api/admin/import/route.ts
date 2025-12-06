import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { classifyQueryIntent } from '@/lib/query-intent'

/**
 * CSVインポートAPI
 * POST /api/admin/import
 *
 * 対応フォーマット:
 * - rakko_keywords: ラッコキーワードのCSV
 * - similarweb: SimilarWebのCSV
 */

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: { message: '認証が必要です' } }, { status: 401 })
    }

    // admin権限チェック
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ success: false, error: { message: '管理者権限が必要です' } }, { status: 403 })
    }

    // FormData取得
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const importType = formData.get('type') as string | null
    const mediaId = formData.get('media_id') as string | null

    if (!file || !importType) {
      return NextResponse.json(
        { success: false, error: { message: 'ファイルとインポートタイプは必須です' } },
        { status: 400 }
      )
    }

    // ファイル内容を読み取り（UTF-16LE対応）
    let content = await file.text()

    // UTF-16LE BOM除去とエンコーディング検出
    // ブラウザのFileReaderはUTF-16LEを自動検出しないため、arrayBufferで読んで変換
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // UTF-16LE BOM (FF FE) を検出
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      // UTF-16LEとしてデコード
      const decoder = new TextDecoder('utf-16le')
      content = decoder.decode(buffer)
    } else if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      // UTF-8 BOM
      const decoder = new TextDecoder('utf-8')
      content = decoder.decode(buffer)
    }

    // BOM文字を除去
    content = content.replace(/^\uFEFF/, '')

    // Service clientを使用（RLSをバイパス）
    const serviceClient = createServiceClient()

    let result
    if (importType === 'rakko_keywords') {
      result = await importRakkoKeywords(serviceClient, content, mediaId, file.name)
    } else if (importType === 'similarweb') {
      result = await importSimilarWeb(serviceClient, content, file.name)
    } else {
      return NextResponse.json(
        { success: false, error: { message: '不明なインポートタイプです' } },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'インポートに失敗しました' },
      },
      { status: 500 }
    )
  }
}

/**
 * ラッコキーワードCSVをインポート（バッチ処理版）
 */
async function importRakkoKeywords(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  content: string,
  mediaId: string | null,
  fileName: string
) {
  // CSVをパース（タブ区切りとカンマ区切りの両方に対応）
  const lines = content.split('\n').filter((line) => line.trim())
  if (lines.length < 2) {
    throw new Error('CSVにデータがありません')
  }

  // 区切り文字を判定
  const delimiter = lines[0].includes('\t') ? '\t' : ','

  // ヘッダー行をパース（ダブルクォート除去）
  const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase())

  // カラムマッピング（日本語対応）
  const columnMap: Record<string, string> = {
    // 日本語ヘッダー
    キーワード: 'keyword',
    月間検索数: 'search_volume',
    'cpc ($)': 'cpc',
    競合性: 'competition',
    seo難易度: 'seo_difficulty',
    検索順位: 'search_rank',
    推定流入数: 'estimated_traffic',
    url: 'url',
    // 英語ヘッダー
    keyword: 'keyword',
    search_volume: 'search_volume',
    cpc: 'cpc',
    competition: 'competition',
    seo_difficulty: 'seo_difficulty',
    search_rank: 'search_rank',
    estimated_traffic: 'estimated_traffic',
  }

  // ヘッダーインデックスを取得
  const keywordIndex = headers.findIndex((h) => columnMap[h] === 'keyword')
  const searchVolumeIndex = headers.findIndex((h) => columnMap[h] === 'search_volume')
  const cpcIndex = headers.findIndex((h) => columnMap[h] === 'cpc')
  const competitionIndex = headers.findIndex((h) => columnMap[h] === 'competition')
  const seoDifficultyIndex = headers.findIndex((h) => columnMap[h] === 'seo_difficulty')
  const searchRankIndex = headers.findIndex((h) => columnMap[h] === 'search_rank')
  const trafficIndex = headers.findIndex((h) => columnMap[h] === 'estimated_traffic')
  const urlIndex = headers.findIndex((h) => columnMap[h] === 'url')

  if (keywordIndex === -1) {
    throw new Error('キーワード列が見つかりません')
  }

  let successCount = 0
  let errorCount = 0
  const errors: string[] = []

  // データ行をパースしてバッチ用配列を作成
  const BATCH_SIZE = 100
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryBatch: any[] = []

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
    lineNum: number
  }
  const parsedRows: ParsedRow[] = []

  // まず全行をパース
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      const values = parseCSVLine(line, delimiter)
      const keyword = values[keywordIndex]?.replace(/^["']|["']$/g, '').trim()
      if (!keyword) continue

      const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, ' ').trim()
      const intentResult = classifyQueryIntent(keyword)

      queryBatch.push({
        keyword,
        keyword_normalized: normalizedKeyword,
        intent: intentResult.intent,
        intent_confidence: intentResult.confidence,
        intent_reason: intentResult.reason,
        intent_updated_at: new Date().toISOString(),
        max_monthly_search_volume: searchVolumeIndex !== -1 ? parseNumber(values[searchVolumeIndex]) : null,
        max_cpc: cpcIndex !== -1 ? parseFloat(values[cpcIndex]?.replace(/[^0-9.]/g, '') || '0') || null : null,
      })

      parsedRows.push({
        keyword,
        normalizedKeyword,
        searchVolume: searchVolumeIndex !== -1 ? parseNumber(values[searchVolumeIndex]) : null,
        cpc: cpcIndex !== -1 ? parseFloat(values[cpcIndex]?.replace(/[^0-9.]/g, '') || '0') || null : null,
        competition: competitionIndex !== -1 ? parseNumber(values[competitionIndex]) : null,
        seoDifficulty: seoDifficultyIndex !== -1 ? parseNumber(values[seoDifficultyIndex]) : null,
        searchRank: searchRankIndex !== -1 ? parseNumber(values[searchRankIndex]) : null,
        traffic: trafficIndex !== -1 ? parseNumber(values[trafficIndex]) : null,
        url: urlIndex !== -1 ? values[urlIndex]?.replace(/^["']|["']$/g, '').trim() || null : null,
        lineNum: i + 1,
      })
    } catch (err) {
      errorCount++
      if (errors.length < 5) {
        errors.push(`行${i + 1}: ${err instanceof Error ? err.message : 'パースエラー'}`)
      }
    }
  }

  // query_masterにバッチupsert
  for (let i = 0; i < queryBatch.length; i += BATCH_SIZE) {
    const batch = queryBatch.slice(i, i + BATCH_SIZE)
    const { error: batchError } = await supabase
      .from('query_master')
      .upsert(batch, { onConflict: 'keyword_normalized', ignoreDuplicates: false })

    if (batchError) {
      console.error('Batch upsert error:', batchError)
      errorCount += batch.length
      if (errors.length < 5) {
        errors.push(`バッチ${Math.floor(i / BATCH_SIZE) + 1}: ${batchError.message}`)
      }
    } else {
      successCount += batch.length
    }
  }

  // media_idが指定されている場合はmedia_query_dataも作成
  if (mediaId && parsedRows.length > 0) {
    // まずquery_masterからIDを取得
    const normalizedKeywords = parsedRows.map((r) => r.normalizedKeyword)
    const { data: queryIds } = await supabase
      .from('query_master')
      .select('id, keyword_normalized')
      .in('keyword_normalized', normalizedKeywords)

    if (queryIds && queryIds.length > 0) {
      const keywordToId = new Map(queryIds.map((q: { id: string; keyword_normalized: string }) => [q.keyword_normalized, q.id]))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mediaQueryBatch: any[] = []
      for (const row of parsedRows) {
        const queryId = keywordToId.get(row.normalizedKeyword)
        if (queryId) {
          mediaQueryBatch.push({
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
          })
        }
      }

      // media_query_dataにバッチupsert
      for (let i = 0; i < mediaQueryBatch.length; i += BATCH_SIZE) {
        const batch = mediaQueryBatch.slice(i, i + BATCH_SIZE)
        const { error: mediaError } = await supabase
          .from('media_query_data')
          .upsert(batch, { onConflict: 'media_id,query_id', ignoreDuplicates: false })

        if (mediaError) {
          console.warn('media_query_data batch error:', mediaError.message)
        }
      }
    }
  }

  return {
    successCount,
    errorCount,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * SimilarWeb CSVをインポート（既存のtraffic_dataテーブルに保存）
 */
async function importSimilarWeb(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  content: string,
  fileName: string
) {
  const lines = content.split('\n').filter((line) => line.trim())
  if (lines.length < 2) {
    throw new Error('CSVにデータがありません')
  }

  const delimiter = lines[0].includes('\t') ? '\t' : ','
  const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase())

  // ヘッダーインデックス
  const domainIndex = headers.findIndex((h) => h === 'domain')
  const periodIndex = headers.findIndex((h) => h === 'period')
  const visitsIndex = headers.findIndex((h) => h === 'monthly_visits')

  if (domainIndex === -1) {
    throw new Error('domain列が見つかりません')
  }

  let successCount = 0
  let errorCount = 0
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      const values = parseCSVLine(line, delimiter)
      const domain = values[domainIndex]?.replace(/^["']|["']$/g, '').trim()
      if (!domain) continue

      // media_masterからmedia_idを取得（ドメインでマッチング）
      const { data: mediaData } = await supabase
        .from('media_master')
        .select('id')
        .ilike('name', `%${domain.replace(/\..+$/, '')}%`)
        .limit(1)
        .single()

      if (mediaData) {
        // traffic_dataに保存
        const { error } = await supabase.from('traffic_data').upsert(
          {
            media_id: mediaData.id,
            period: periodIndex !== -1 ? values[periodIndex]?.replace(/^["']|["']$/g, '').trim() : 'monthly',
            monthly_visits: visitsIndex !== -1 ? parseNumber(values[visitsIndex]) : null,
            source_file: fileName,
          },
          { onConflict: 'media_id,period' }
        )

        if (error) throw error
      }

      successCount++
    } catch (err) {
      errorCount++
      if (errors.length < 5) {
        errors.push(`行${i + 1}: ${err instanceof Error ? err.message : '不明なエラー'}`)
      }
    }
  }

  return {
    successCount,
    errorCount,
    errors: errors.length > 0 ? errors : undefined,
  }
}

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
