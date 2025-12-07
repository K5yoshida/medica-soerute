// ===========================================
// Import Start API
// 非同期インポートジョブを開始する
// POST /api/admin/import/start
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

/**
 * ジョブ開始レスポンス
 */
interface StartResponse {
  success: boolean
  data?: {
    jobId: string
    status: string
  }
  error?: {
    message: string
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<StartResponse>> {
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
    const mediaId = formData.get('media_id') as string | null

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

    // インポートタイプのバリデーション
    // 注: similarwebはCSVインポートから削除（媒体マスター側で管理）
    if (importType !== 'rakko_keywords') {
      return NextResponse.json(
        { success: false, error: { message: 'ラッコキーワードCSVのみインポート可能です' } },
        { status: 400 }
      )
    }

    // 媒体選択は必須（キーワードと媒体の紐付けが必要）
    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: { message: '対象媒体の選択は必須です' } },
        { status: 400 }
      )
    }

    const serviceClient = createServiceClient()

    // ファイルをSupabase Storageにアップロード
    const fileName = `${Date.now()}_${file.name}`
    const filePath = `imports/${user.id}/${fileName}`

    const { error: uploadError } = await serviceClient.storage
      .from('import-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    // バケットが存在しない場合は作成を試みる
    if (uploadError?.message?.includes('Bucket not found')) {
      // バケットが存在しない場合のエラーハンドリング
      // 本番環境ではバケットは事前に作成しておく必要がある
      return NextResponse.json(
        { success: false, error: { message: 'ストレージバケットが設定されていません。管理者に連絡してください。' } },
        { status: 500 }
      )
    }

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: { message: 'ファイルのアップロードに失敗しました' } },
        { status: 500 }
      )
    }

    // 署名付きURLを取得（24時間有効）
    const { data: signedUrlData, error: signedUrlError } = await serviceClient.storage
      .from('import-files')
      .createSignedUrl(filePath, 60 * 60 * 24)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError)
      return NextResponse.json(
        { success: false, error: { message: 'ファイルURLの取得に失敗しました' } },
        { status: 500 }
      )
    }

    // import_jobsにジョブを作成
    const { data: jobData, error: jobError } = await serviceClient
      .from('import_jobs')
      .insert({
        status: 'pending',
        file_name: file.name,
        file_url: signedUrlData.signedUrl,
        import_type: importType,
        media_id: mediaId || null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (jobError || !jobData) {
      console.error('Job creation error:', jobError)
      return NextResponse.json(
        { success: false, error: { message: 'ジョブの作成に失敗しました' } },
        { status: 500 }
      )
    }

    // Inngestにイベントを送信してジョブを開始
    await inngest.send({
      name: 'import/csv.started',
      data: {
        jobId: jobData.id,
        fileUrl: signedUrlData.signedUrl,
        fileName: file.name,
        importType: importType as 'rakko_keywords' | 'similarweb',
        mediaId: mediaId || undefined,
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        jobId: jobData.id,
        status: 'pending',
      },
    })
  } catch (error) {
    console.error('Start import error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'ジョブの開始に失敗しました' },
      },
      { status: 500 }
    )
  }
}
