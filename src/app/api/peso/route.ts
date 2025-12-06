import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzePeso } from '@/lib/claude/client'
import type { PesoDiagnosisData, User } from '@/types'

export async function POST(request: Request) {
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

    // ユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' } },
        { status: 404 }
      )
    }

    const typedUserData = userData as User

    // トライアル期限切れチェック
    if (typedUserData.plan === 'trial' && typedUserData.trial_ends_at) {
      const trialEndsAt = new Date(typedUserData.trial_ends_at)
      if (trialEndsAt < new Date()) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TRIAL_EXPIRED',
              message: 'トライアル期間が終了しました。有料プランへアップグレードしてください。',
            },
          },
          { status: 403 }
        )
      }
    }

    // リクエストボディを取得
    const body = await request.json()
    const diagnosisData: PesoDiagnosisData = body

    // Claude APIでPESO分析を実行
    const pesoResult = await analyzePeso(diagnosisData)

    // 診断結果をDBに保存
    const { data: savedResult, error: saveError } = await supabase
      .from('peso_diagnoses')
      .insert({
        user_id: user.id,
        diagnosis_data: diagnosisData,
        scores: pesoResult.scores,
        recommendations: pesoResult.recommendations,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save PESO diagnosis:', saveError)
      // 保存に失敗しても結果は返す
    }

    // 使用ログを記録
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action_type: 'peso_diagnosis',
      metadata: {
        diagnosis_id: savedResult?.id,
        scores: pesoResult.scores,
      },
    })

    return NextResponse.json({
      success: true,
      data: pesoResult,
    })
  } catch (error) {
    console.error('PESO diagnosis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DIAGNOSIS_ERROR',
          message: error instanceof Error ? error.message : 'PESO診断中にエラーが発生しました',
        },
      },
      { status: 500 }
    )
  }
}

// PESO診断履歴の取得
export async function GET() {
  try {
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

    const { data, error } = await supabase
      .from('peso_diagnoses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'データの取得に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Get PESO history error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
