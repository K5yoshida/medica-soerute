import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface DiagnosisData {
  company_name?: string
  saved_name?: string
  saved_at?: string
  [key: string]: unknown
}

/**
 * POST /api/peso/results/{id}/save
 * PESO診断結果の保存（名前付け）
 */
export async function POST(
  request: NextRequest,
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

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: '名前を入力してください' } },
        { status: 400 }
      )
    }

    // 診断結果を取得して所有者確認
    const { data: diagnosis, error: fetchError } = await supabase
      .from('peso_diagnoses')
      .select('*')
      .eq('id', diagnosisId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !diagnosis) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '診断結果が見つかりません' } },
        { status: 404 }
      )
    }

    // 名前を保存（diagnosis_dataに含める）
    const diagnosisData = (diagnosis.diagnosis_data || {}) as DiagnosisData
    const updatedData: DiagnosisData = {
      ...diagnosisData,
      saved_name: name,
      saved_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('peso_diagnoses')
      .update({ diagnosis_data: updatedData })
      .eq('id', diagnosisId)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: { code: 'SAVE_FAILED', message: '保存に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: diagnosisId,
        name,
        saved_at: updatedData.saved_at,
      },
    })
  } catch (error) {
    console.error('Save PESO result error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
