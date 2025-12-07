/**
 * GET /api/peso/results/{id}
 * PESO診断結果の詳細取得
 * 設計書: GAP-013 分析結果詳細取得API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: diagnosisId } = await params
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

    // PESO診断結果を取得（所有者のみアクセス可能）
    const { data: diagnosisResult, error: fetchError } = await supabase
      .from('peso_diagnoses')
      .select('*')
      .eq('id', diagnosisId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: '診断結果が見つかりません' } },
          { status: 404 }
        )
      }
      console.error('Fetch PESO diagnosis error:', fetchError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'データの取得に失敗しました' } },
        { status: 500 }
      )
    }

    if (!diagnosisResult) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '診断結果が見つかりません' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: diagnosisResult.id,
        diagnosis_data: diagnosisResult.diagnosis_data,
        scores: diagnosisResult.scores,
        recommendations: diagnosisResult.recommendations,
        created_at: diagnosisResult.created_at,
      },
    })
  } catch (error) {
    console.error('Get PESO diagnosis error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
