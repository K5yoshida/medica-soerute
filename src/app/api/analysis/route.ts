import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeMediaMatch } from '@/lib/claude/client'
import type { JobRequirements, MediaMaster, User } from '@/types'

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

    // 分析回数の制限チェック
    if (
      typedUserData.monthly_analysis_limit !== -1 &&
      typedUserData.monthly_analysis_count >= typedUserData.monthly_analysis_limit
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LIMIT_EXCEEDED',
            message: '今月の分析回数上限に達しました。プランをアップグレードしてください。',
          },
        },
        { status: 403 }
      )
    }

    // リクエストボディを取得
    const body = await request.json()
    const jobRequirements: JobRequirements = body

    // アクティブな媒体を取得
    const { data: mediaList, error: mediaError } = await supabase
      .from('media_master')
      .select('*')
      .eq('is_active', true)

    if (mediaError) {
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: '媒体データの取得に失敗しました' } },
        { status: 500 }
      )
    }

    // Claude APIで分析を実行
    const analysisResult = await analyzeMediaMatch(
      jobRequirements,
      mediaList as MediaMaster[]
    )

    // 分析結果をDBに保存
    const { data: savedResult, error: saveError } = await supabase
      .from('analysis_results')
      .insert({
        user_id: user.id,
        job_requirements: jobRequirements,
        status: 'completed',
        matched_media: analysisResult.matchedMedia,
        analysis_detail: analysisResult.analysisDetail,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save analysis result:', saveError)
      // 保存に失敗しても結果は返す
    }

    // 分析回数をインクリメント
    await supabase.rpc('increment_analysis_count', { p_user_id: user.id })

    // 使用ログを記録
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action_type: 'analysis',
      metadata: {
        analysis_id: savedResult?.id,
        job_type: jobRequirements.jobType,
        matched_count: analysisResult.matchedMedia.length,
      },
    })

    return NextResponse.json({
      success: true,
      data: analysisResult,
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : '分析中にエラーが発生しました',
        },
      },
      { status: 500 }
    )
  }
}

// 分析履歴の取得
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
      .from('analysis_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

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
    console.error('Get analysis history error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
