// ===========================================
// Import Job Preview API
// ジョブの結果プレビューを取得する
// GET /api/admin/import/jobs/[id]/preview
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PreviewItem {
  keyword: string
  intent: string
  intent_reason: string
  search_volume: number | null
}

interface PreviewResponse {
  success: boolean
  data?: {
    items: PreviewItem[]
    total: number
  }
  error?: {
    message: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<PreviewResponse>> {
  try {
    const { id: jobId } = await params

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

    // ジョブの存在確認
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('id, status, completed_at')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: { message: 'ジョブが見つかりません' } },
        { status: 404 }
      )
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: { message: 'ジョブが完了していません' } },
        { status: 400 }
      )
    }

    // クエリパラメータ
    const { searchParams } = new URL(request.url)
    const intent = searchParams.get('intent') // フィルタ用
    const limitParam = searchParams.get('limit')
    // limit=0 または指定なしの場合は全件取得（最大10000件）
    const limit = limitParam === '0' || !limitParam ? 10000 : parseInt(limitParam, 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // query_masterから最近更新されたキーワードを取得
    // ジョブ完了時刻の前後1分を許容
    const completedAt = new Date(job.completed_at)
    const startTime = new Date(completedAt.getTime() - 60 * 1000).toISOString()
    const endTime = new Date(completedAt.getTime() + 60 * 1000).toISOString()

    let query = supabase
      .from('keywords')
      .select('keyword, intent, intent_reason, max_monthly_search_volume', { count: 'exact' })
      .gte('intent_updated_at', startTime)
      .lte('intent_updated_at', endTime)
      .order('max_monthly_search_volume', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (intent && intent !== 'all') {
      query = query.eq('intent', intent)
    }

    const { data: keywords, error: queryError, count } = await query

    if (queryError) {
      console.error('Preview query error:', queryError)
      return NextResponse.json(
        { success: false, error: { message: 'プレビューの取得に失敗しました' } },
        { status: 500 }
      )
    }

    const items: PreviewItem[] = (keywords || []).map((k: {
      keyword: string
      intent: string | null
      intent_reason: string | null
      max_monthly_search_volume: number | null
    }) => ({
      keyword: k.keyword,
      intent: k.intent || 'unknown',
      intent_reason: k.intent_reason || '',
      search_volume: k.max_monthly_search_volume,
    }))

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'プレビューの取得に失敗しました' },
      },
      { status: 500 }
    )
  }
}
