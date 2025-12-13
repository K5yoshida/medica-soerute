// ===========================================
// Import Validate API
// CSVファイルをプレビュー用にパースして返す
// POST /api/admin/import/validate
//
// v2更新: URL列からドメインを抽出し、media_masterと照合して
// 媒体を自動特定する機能を追加（ヒューマンエラー防止）
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * 自動検出された媒体情報
 */
interface DetectedMedia {
  id: string
  name: string
  domain: string
}

/**
 * CSVプレビューレスポンス
 */
interface ValidateResponse {
  success: boolean
  data?: {
    totalRows: number
    previewRows: PreviewRow[]
    columns: string[]
    // v2: 自動検出された媒体情報
    detectedMedia: DetectedMedia | null
    detectedDomain: string | null
  }
  error?: {
    message: string
    code?: string // MEDIA_NOT_FOUND などのエラーコード
  }
}

interface PreviewRow {
  keyword: string
  searchVolume: number | null
  cpc: number | null
  competition: number | null
  seoDifficulty: number | null
  searchRank: number | null
  estimatedTraffic: number | null
  url: string | null
}

export async function POST(request: NextRequest): Promise<NextResponse<ValidateResponse>> {
  try {
    // 認証チェック
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: '認証が必要です' } },
        { status: 401 }
      )
    }

    // admin権限チェック
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { message: '管理者権限が必要です' } },
        { status: 403 }
      )
    }

    // FormData取得
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const importType = formData.get('type') as string | null

    if (!file || !importType) {
      return NextResponse.json(
        { success: false, error: { message: 'ファイルとインポートタイプは必須です' } },
        { status: 400 }
      )
    }

    // ファイルサイズチェック（50MB上限）
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: { message: 'ファイルサイズは50MB以下にしてください' } },
        { status: 400 }
      )
    }

    // ファイル内容を読み取り
    let content = await file.text()

    // UTF-16LE BOM対応
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      const decoder = new TextDecoder('utf-16le')
      content = decoder.decode(buffer)
    } else if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      const decoder = new TextDecoder('utf-8')
      content = decoder.decode(buffer)
    }

    content = content.replace(/^\uFEFF/, '')

    // CSVをパース（Windows形式のCRLF改行に対応するため\rを除去）
    const lines = content
      .split('\n')
      .map((line) => line.replace(/\r$/, ''))
      .filter((line) => line.trim())
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: { message: 'CSVにデータがありません' } },
        { status: 400 }
      )
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ','
    const headers = lines[0]
      .split(delimiter)
      .map((h) => h.replace(/^["']|["']$/g, '').trim())

    // カラムマッピング
    const columnMap: Record<string, string> = {
      キーワード: 'keyword',
      月間検索数: 'search_volume',
      'cpc ($)': 'cpc',
      'CPC ($)': 'cpc',
      競合性: 'competition',
      'seo難易度': 'seo_difficulty',
      'SEO難易度': 'seo_difficulty',
      検索順位: 'search_rank',
      推定流入数: 'estimated_traffic',
      url: 'url',
      URL: 'url',
      keyword: 'keyword',
      search_volume: 'search_volume',
      cpc: 'cpc',
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

    const actualKeywordIndex = findColumnIndex('keyword')
    const actualSearchVolumeIndex = findColumnIndex('search_volume')
    const actualCpcIndex = findColumnIndex('cpc')
    const actualCompetitionIndex = findColumnIndex('competition')
    const actualSeoDifficultyIndex = findColumnIndex('seo_difficulty')
    const actualSearchRankIndex = findColumnIndex('search_rank')
    const actualEstimatedTrafficIndex = findColumnIndex('estimated_traffic')
    const actualUrlIndex = findColumnIndex('url')

    if (actualKeywordIndex === -1) {
      return NextResponse.json(
        { success: false, error: { message: 'キーワード列が見つかりません' } },
        { status: 400 }
      )
    }

    // プレビュー用に最初の50行をパース
    const previewRows: PreviewRow[] = []
    const maxPreviewRows = 50

    for (let i = 1; i < Math.min(lines.length, maxPreviewRows + 1); i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        const values = parseCSVLine(line, delimiter)
        const keyword = values[actualKeywordIndex]?.replace(/^["']|["']$/g, '').trim()
        if (!keyword) continue

        previewRows.push({
          keyword,
          searchVolume:
            actualSearchVolumeIndex !== -1
              ? parseNumber(values[actualSearchVolumeIndex])
              : null,
          cpc:
            actualCpcIndex !== -1
              ? parseFloat(values[actualCpcIndex]?.replace(/[^0-9.]/g, '') || '0') || null
              : null,
          competition:
            actualCompetitionIndex !== -1
              ? parseNumber(values[actualCompetitionIndex])
              : null,
          seoDifficulty:
            actualSeoDifficultyIndex !== -1
              ? parseNumber(values[actualSeoDifficultyIndex])
              : null,
          searchRank:
            actualSearchRankIndex !== -1
              ? parseNumber(values[actualSearchRankIndex])
              : null,
          estimatedTraffic:
            actualEstimatedTrafficIndex !== -1
              ? parseNumber(values[actualEstimatedTrafficIndex])
              : null,
          url:
            actualUrlIndex !== -1
              ? values[actualUrlIndex]?.replace(/^["']|["']$/g, '').trim() || null
              : null,
        })
      } catch {
        // パースエラーはスキップ
      }
    }

    // 総行数をカウント
    let totalRows = 0
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) totalRows++
    }

    // v2: URL列からドメインを抽出し、media_masterと照合
    let detectedMedia: DetectedMedia | null = null
    let detectedDomain: string | null = null

    if (actualUrlIndex !== -1 && previewRows.length > 0) {
      // 最初のURL行からドメインを抽出
      const firstUrl = previewRows.find((r) => r.url)?.url
      if (firstUrl) {
        detectedDomain = extractDomain(firstUrl)

        if (detectedDomain) {
          // media_masterからドメインで検索
          const serviceClient = createServiceClient()
          const { data: mediaData } = await serviceClient
            .from('media_master')
            .select('id, name, domain')
            .eq('is_active', true)

          if (mediaData && mediaData.length > 0) {
            // ドメインマッチング（完全一致、またはwww.除去後の一致）
            const normalizedDetected = normalizeDomain(detectedDomain)
            const matchedMedia = mediaData.find((m: { id: string; name: string; domain: string | null }) => {
              if (!m.domain) return false
              const normalizedMedia = normalizeDomain(m.domain)
              return normalizedMedia === normalizedDetected
            })

            if (matchedMedia) {
              detectedMedia = {
                id: matchedMedia.id,
                name: matchedMedia.name,
                domain: matchedMedia.domain,
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRows,
        previewRows,
        columns: headers,
        detectedMedia,
        detectedDomain,
      },
    })
  } catch (error) {
    console.error('Validate error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'バリデーションに失敗しました' },
      },
      { status: 500 }
    )
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

/**
 * URLからドメインを抽出
 * 例: https://www.baitoru.com/kanto/tokyo/ → www.baitoru.com
 */
function extractDomain(url: string): string | null {
  try {
    // URLが相対パスの場合はnull
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // プロトコルなしの場合、httpsを付けて試す
      if (url.includes('.')) {
        url = 'https://' + url
      } else {
        return null
      }
    }

    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return null
  }
}

/**
 * ドメインを正規化（比較用）
 * - www. を除去
 * - 小文字化
 * 例: www.baitoru.com → baitoru.com
 */
function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^www\./, '')
    .trim()
}
