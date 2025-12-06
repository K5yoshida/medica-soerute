// ===========================================
// Import Job Detail API
// ジョブの詳細取得・キャンセル・リトライ
// GET/POST /api/admin/import/jobs/[id]
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

/**
 * ジョブ詳細レスポンス
 */
interface JobDetailResponse {
  success: boolean
  data?: ImportJobDetail
  error?: {
    message: string
  }
}

interface ImportJobDetail {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  file_name: string
  file_url: string
  import_type: 'rakko_keywords' | 'similarweb'
  media_id: string | null
  total_rows: number | null
  processed_rows: number
  success_count: number
  error_count: number
  current_step: string | null
  intent_summary: Record<string, number> | null
  error_message: string | null
  error_details: Record<string, unknown> | null
  inngest_run_id: string | null
  created_by: string
  created_at: string
  started_at: string | null
  completed_at: string | null
}

/**
 * ジョブ詳細取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<JobDetailResponse>> {
  try {
    const { id } = await params

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

    // ジョブ詳細を取得
    const { data: job, error: queryError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (queryError || !job) {
      return NextResponse.json(
        { success: false, error: { message: 'ジョブが見つかりません' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: job as ImportJobDetail,
    })
  } catch (error) {
    console.error('Job detail error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'ジョブの取得に失敗しました' },
      },
      { status: 500 }
    )
  }
}

/**
 * ジョブ操作（キャンセル・リトライ）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<JobDetailResponse>> {
  try {
    const { id } = await params
    const body = await request.json()
    const action = body.action as 'cancel' | 'retry'

    if (!['cancel', 'retry'].includes(action)) {
      return NextResponse.json(
        { success: false, error: { message: '不正なアクションです' } },
        { status: 400 }
      )
    }

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

    const serviceClient = createServiceClient()

    // ジョブを取得
    const { data: job, error: queryError } = await serviceClient
      .from('import_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (queryError || !job) {
      return NextResponse.json(
        { success: false, error: { message: 'ジョブが見つかりません' } },
        { status: 404 }
      )
    }

    if (action === 'cancel') {
      // キャンセル処理
      if (!['pending', 'processing'].includes(job.status)) {
        return NextResponse.json(
          { success: false, error: { message: 'このジョブはキャンセルできません' } },
          { status: 400 }
        )
      }

      const { error: updateError } = await serviceClient
        .from('import_jobs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json(
          { success: false, error: { message: 'キャンセルに失敗しました' } },
          { status: 500 }
        )
      }

      // Inngestにキャンセルイベントを送信
      await inngest.send({
        name: 'import/csv.cancelled',
        data: { jobId: id },
      })

      // 更新後のジョブを取得
      const { data: updatedJob } = await serviceClient
        .from('import_jobs')
        .select('*')
        .eq('id', id)
        .single()

      return NextResponse.json({
        success: true,
        data: updatedJob as ImportJobDetail,
      })
    } else {
      // リトライ処理
      if (!['failed', 'cancelled'].includes(job.status)) {
        return NextResponse.json(
          { success: false, error: { message: 'このジョブはリトライできません' } },
          { status: 400 }
        )
      }

      // ジョブをpending状態にリセット
      const { error: updateError } = await serviceClient
        .from('import_jobs')
        .update({
          status: 'pending',
          processed_rows: 0,
          success_count: 0,
          error_count: 0,
          current_step: null,
          error_message: null,
          error_details: null,
          started_at: null,
          completed_at: null,
        })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json(
          { success: false, error: { message: 'リトライに失敗しました' } },
          { status: 500 }
        )
      }

      // Inngestにジョブ開始イベントを再送信
      await inngest.send({
        name: 'import/csv.started',
        data: {
          jobId: id,
          fileUrl: job.file_url,
          fileName: job.file_name,
          importType: job.import_type as 'rakko_keywords' | 'similarweb',
          mediaId: job.media_id || undefined,
          userId: job.created_by,
        },
      })

      // 更新後のジョブを取得
      const { data: updatedJob } = await serviceClient
        .from('import_jobs')
        .select('*')
        .eq('id', id)
        .single()

      return NextResponse.json({
        success: true,
        data: updatedJob as ImportJobDetail,
      })
    }
  } catch (error) {
    console.error('Job action error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : '操作に失敗しました' },
      },
      { status: 500 }
    )
  }
}
