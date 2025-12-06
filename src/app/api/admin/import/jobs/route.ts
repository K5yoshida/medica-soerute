// ===========================================
// Import Jobs List API
// ジョブ一覧を取得する
// GET /api/admin/import/jobs
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * ジョブ一覧レスポンス
 */
interface JobsResponse {
  success: boolean
  data?: {
    jobs: ImportJob[]
    total: number
  }
  error?: {
    message: string
  }
}

interface ImportJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  file_name: string
  import_type: 'rakko_keywords' | 'similarweb'
  media_id: string | null
  total_rows: number | null
  processed_rows: number
  success_count: number
  error_count: number
  current_step: string | null
  intent_summary: Record<string, number> | null
  error_message: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export async function GET(request: NextRequest): Promise<NextResponse<JobsResponse>> {
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

    // クエリパラメータ
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // ジョブ一覧を取得
    let query = supabase
      .from('import_jobs')
      .select(
        `
        id,
        status,
        file_name,
        import_type,
        media_id,
        total_rows,
        processed_rows,
        success_count,
        error_count,
        current_step,
        intent_summary,
        error_message,
        created_at,
        started_at,
        completed_at
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: jobs, error: queryError, count } = await query

    if (queryError) {
      console.error('Jobs query error:', queryError)
      return NextResponse.json(
        { success: false, error: { message: 'ジョブ一覧の取得に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        jobs: (jobs || []) as ImportJob[],
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('Jobs list error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'ジョブ一覧の取得に失敗しました' },
      },
      { status: 500 }
    )
  }
}
