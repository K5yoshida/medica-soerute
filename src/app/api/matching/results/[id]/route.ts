/**
 * GET /api/matching/results/{id}
 * マッチング分析結果の詳細取得
 * 設計書: GAP-013 分析結果詳細取得API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
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

    // 分析結果を取得（所有者のみアクセス可能）
    const { data: analysisResult, error: fetchError } = await supabase
      .from('matching_results')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: '分析結果が見つかりません' } },
          { status: 404 }
        )
      }
      console.error('Fetch analysis result error:', fetchError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'データの取得に失敗しました' } },
        { status: 500 }
      )
    }

    if (!analysisResult) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '分析結果が見つかりません' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: analysisResult.id,
        job_requirements: analysisResult.job_requirements,
        status: analysisResult.status,
        matched_media: analysisResult.matched_media,
        analysis_detail: analysisResult.analysis_detail,
        recommendations: analysisResult.recommendations,
        created_at: analysisResult.created_at,
        updated_at: analysisResult.updated_at,
      },
    })
  } catch (error) {
    console.error('Get matching result error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
