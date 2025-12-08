import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/matching/results/{id}/save
 * マッチング分析結果の保存（名前付け）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: '名前を入力してください' } },
        { status: 400 }
      )
    }

    // 分析結果を取得して所有者確認
    const { data: analysisResult, error: fetchError } = await supabase
      .from('matching_results')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !analysisResult) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '分析結果が見つかりません' } },
        { status: 404 }
      )
    }

    // 名前を保存（analysis_detailに含める）
    const updatedDetail = {
      ...(analysisResult.analysis_detail as Record<string, unknown> || {}),
      saved_name: name,
      saved_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('matching_results')
      .update({ analysis_detail: updatedDetail })
      .eq('id', analysisId)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: { code: 'SAVE_FAILED', message: '保存に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: analysisId,
        name,
        saved_at: updatedDetail.saved_at,
      },
    })
  } catch (error) {
    console.error('Save matching result error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
