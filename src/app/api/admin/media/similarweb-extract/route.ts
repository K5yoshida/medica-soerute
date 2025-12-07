import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { extractSimilarWebData, SimilarWebData } from '@/lib/claude/client'

/**
 * Admin API: SimilarWeb画像からデータ抽出
 *
 * POST - 画像をアップロードしてSimilarWebデータを抽出
 *
 * リクエスト: FormData
 * - images: File[] (複数画像、最低2枚推奨)
 * - media_id?: string (既存媒体に紐付ける場合)
 */

interface ExtractResponse {
  success: boolean
  data?: {
    extracted: SimilarWebData
    media_id?: string
    updated?: boolean
  }
  error?: {
    code: string
    message: string
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per image
const MAX_IMAGES = 5
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export async function POST(request: NextRequest): Promise<NextResponse<ExtractResponse>> {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      )
    }

    // admin権限チェック
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } },
        { status: 403 }
      )
    }

    // FormData取得
    const formData = await request.formData()
    const imageFiles = formData.getAll('images') as File[]
    const mediaId = formData.get('media_id') as string | null

    // バリデーション
    if (!imageFiles || imageFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '画像ファイルが必要です' } },
        { status: 400 }
      )
    }

    if (imageFiles.length > MAX_IMAGES) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `画像は最大${MAX_IMAGES}枚までです` } },
        { status: 400 }
      )
    }

    // 各画像のバリデーションとbase64変換
    const images: Array<{ base64: string; mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' }> = []

    for (const file of imageFiles) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: '各画像は10MB以下にしてください' } },
          { status: 400 }
        )
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'PNG, JPEG, WebP, GIF形式のみ対応しています' } },
          { status: 400 }
        )
      }

      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      images.push({
        base64,
        mediaType: file.type as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
      })
    }

    // Claude APIで画像解析
    const extracted = await extractSimilarWebData(images)

    // media_idが指定されている場合、媒体データを更新
    let updated = false
    if (mediaId) {
      const serviceClient = createServiceClient()

      // 対象媒体のドメインを取得
      const { data: targetMedia, error: mediaError } = await serviceClient
        .from('media_master')
        .select('domain')
        .eq('id', mediaId)
        .single()

      if (mediaError || !targetMedia) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: '対象の媒体が見つかりません' } },
          { status: 404 }
        )
      }

      // ドメイン検証: 抽出したドメインと対象媒体のドメインが一致するか確認
      if (extracted.domain && targetMedia.domain) {
        // ドメインを正規化して比較（www.の有無、大文字小文字を無視）
        const normalizedExtracted = extracted.domain.toLowerCase().replace(/^www\./, '')
        const normalizedTarget = targetMedia.domain.toLowerCase().replace(/^www\./, '')

        if (normalizedExtracted !== normalizedTarget) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'DOMAIN_MISMATCH',
                message: `画像から読み取ったドメイン「${extracted.domain}」と、対象媒体のドメイン「${targetMedia.domain}」が一致しません。正しい媒体を選択してください。`,
              },
            },
            { status: 400 }
          )
        }
      }

      const updateData: Record<string, unknown> = {}
      if (extracted.domain) updateData.domain = extracted.domain
      if (extracted.monthly_visits) updateData.monthly_visits = extracted.monthly_visits
      if (extracted.bounce_rate) updateData.bounce_rate = extracted.bounce_rate
      if (extracted.pages_per_visit) updateData.pages_per_visit = extracted.pages_per_visit
      if (extracted.avg_visit_duration) updateData.avg_visit_duration = extracted.avg_visit_duration
      updateData.data_updated_at = new Date().toISOString()

      const { error: updateError } = await serviceClient
        .from('media_master')
        .update(updateData)
        .eq('id', mediaId)

      if (updateError) {
        console.error('Failed to update media:', updateError)
        // 更新失敗してもデータ抽出結果は返す
      } else {
        updated = true
      }

      // トラフィックソースデータがあれば traffic_data テーブルにも保存
      if (extracted.traffic_sources) {
        const trafficData = {
          media_id: mediaId,
          period: new Date().toISOString().slice(0, 7), // YYYY-MM形式
          search_pct: extracted.traffic_sources.search || null,
          direct_pct: extracted.traffic_sources.direct || null,
          referral_pct: extracted.traffic_sources.referral || null,
          display_pct: extracted.traffic_sources.display || null,
          email_pct: extracted.traffic_sources.mail || null,
          social_pct: extracted.traffic_sources.social || null,
        }

        // UPSERT: 同じ media_id + period があれば更新、なければ挿入
        const { error: trafficError } = await serviceClient
          .from('traffic_data')
          .upsert(trafficData, {
            onConflict: 'media_id,period',
            ignoreDuplicates: false,
          })

        if (trafficError) {
          console.error('Failed to save traffic data:', trafficError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        extracted,
        media_id: mediaId || undefined,
        updated,
      },
    })
  } catch (error) {
    console.error('SimilarWeb extract error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'データ抽出に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}
