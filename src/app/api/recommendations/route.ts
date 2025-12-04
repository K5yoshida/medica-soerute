import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRecommendations } from '@/lib/claude/client'
import type { User } from '@/types'

export async function GET() {
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

    // フリープランは施策提案不可
    if (typedUserData.plan === 'free') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PLAN_RESTRICTION',
            message: '施策提案機能を利用するにはライトプラン以上へのアップグレードが必要です。',
          },
        },
        { status: 403 }
      )
    }

    // 直近の分析結果を取得
    const { data: analysisResults } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5)

    // 直近のPESO診断結果を取得
    const { data: pesoDiagnoses } = await supabase
      .from('peso_diagnoses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3)

    // データがない場合
    if ((!analysisResults || analysisResults.length === 0) &&
        (!pesoDiagnoses || pesoDiagnoses.length === 0)) {
      return NextResponse.json({
        success: true,
        data: {
          hasData: false,
          message: '施策提案を生成するには、まず媒体分析またはPESO診断を実行してください。',
          recommendations: [],
        },
      })
    }

    // Claude APIで施策提案を生成
    const latestPesoScores = pesoDiagnoses?.[0]?.scores as {
      paid: number
      earned: number
      shared: number
      owned: number
    } | undefined

    const recommendations = await getRecommendations({
      analysisResults: analysisResults || [],
      pesoScores: latestPesoScores,
    })

    // 使用ログを記録
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action_type: 'get_recommendations',
      metadata: {
        analysis_count: analysisResults?.length || 0,
        peso_count: pesoDiagnoses?.length || 0,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        hasData: true,
        recommendations,
        basedOn: {
          analysisCount: analysisResults?.length || 0,
          pesoCount: pesoDiagnoses?.length || 0,
        },
      },
    })
  } catch (error) {
    console.error('Get recommendations error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RECOMMENDATION_ERROR',
          message: error instanceof Error ? error.message : '施策提案の取得中にエラーが発生しました',
        },
      },
      { status: 500 }
    )
  }
}

// 施策の詳細を取得
export async function POST(request: Request) {
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

    const body = await request.json()
    const { recommendationId, type } = body

    // ここでは特定の施策に対する詳細情報を返す
    // 実際にはClaude APIを使って詳細を生成することも可能
    const detailResponse = {
      id: recommendationId,
      type,
      detailedSteps: [
        '施策の詳細ステップ1',
        '施策の詳細ステップ2',
        '施策の詳細ステップ3',
      ],
      estimatedImpact: {
        applicantIncrease: '10-20%',
        costReduction: '5-15%',
        timeToHire: '-2週間',
      },
      resources: [
        { title: '参考記事', url: '#' },
        { title: 'ツールガイド', url: '#' },
      ],
    }

    return NextResponse.json({
      success: true,
      data: detailResponse,
    })
  } catch (error) {
    console.error('Get recommendation detail error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
