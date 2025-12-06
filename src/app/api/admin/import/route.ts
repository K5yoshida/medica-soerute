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

    // ファイル内容を読み取り
    const content = await file.text()

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
 * ラッコキーワードCSVをインポート
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

  // データ行を処理
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      // CSVパース（クォート対応）
      const values = parseCSVLine(line, delimiter)

      const keyword = values[keywordIndex]?.replace(/^["']|["']$/g, '').trim()
      if (!keyword) continue

      // 意図分類を実行
      const intentResult = classifyQueryIntent(keyword)

      // query_masterにUPSERT
      const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, ' ').trim()

      const { data: queryData, error: queryError } = await supabase
        .from('query_master')
        .upsert(
          {
            keyword,
            keyword_normalized: normalizedKeyword,
            intent: intentResult.intent,
            intent_confidence: intentResult.confidence,
            intent_reason: intentResult.reason,
            intent_updated_at: new Date().toISOString(),
            max_monthly_search_volume: searchVolumeIndex !== -1 ? parseNumber(values[searchVolumeIndex]) : null,
            max_cpc: cpcIndex !== -1 ? parseFloat(values[cpcIndex]?.replace(/[^0-9.]/g, '') || '0') || null : null,
          },
          { onConflict: 'keyword_normalized' }
        )
        .select('id')
        .single()

      if (queryError) {
        throw new Error(`query_master upsert failed: ${queryError.message}`)
      }

      // media_idが指定されている場合はmedia_query_dataも作成
      if (mediaId && queryData) {
        const { error: mediaQueryError } = await supabase.from('media_query_data').upsert(
          {
            query_id: queryData.id,
            media_id: mediaId,
            ranking_position: searchRankIndex !== -1 ? parseNumber(values[searchRankIndex]) : null,
            monthly_search_volume: searchVolumeIndex !== -1 ? parseNumber(values[searchVolumeIndex]) : null,
            estimated_traffic: trafficIndex !== -1 ? parseNumber(values[trafficIndex]) : null,
            cpc: cpcIndex !== -1 ? parseFloat(values[cpcIndex]?.replace(/[^0-9.]/g, '') || '0') || null : null,
            competition_level: competitionIndex !== -1 ? parseNumber(values[competitionIndex]) : null,
            seo_difficulty: seoDifficultyIndex !== -1 ? parseNumber(values[seoDifficultyIndex]) : null,
            landing_url: urlIndex !== -1 ? values[urlIndex]?.replace(/^["']|["']$/g, '').trim() || null : null,
            source_file: fileName,
          },
          { onConflict: 'media_id,query_id' }
        )

        if (mediaQueryError) {
          console.warn(`media_query_data upsert warning: ${mediaQueryError.message}`)
        }
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
