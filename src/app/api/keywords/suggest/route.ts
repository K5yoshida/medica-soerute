/**
 * POST /api/keywords/suggest
 * AIによるクエリ（キーワード）提案API
 * 設計書: GAP-012 AIクエリ提案API実装
 *
 * ユーザーの入力に基づいて、関連するキーワードを提案する
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@/types'
import { suggestRelatedKeywords } from '@/lib/claude/client'
import { withFallback, getDefaultKeywordSuggestions } from '@/lib/claude/fallback'

interface SuggestKeywordsRequest {
  // 職種
  jobType?: string
  // エリア
  area?: string
  // 条件キーワード
  conditions?: string[]
  // 現在のキーワード（追加提案のため）
  currentKeywords?: string[]
  // 提案タイプ
  suggestionType?: 'related' | 'competitor' | 'longtail' | 'all'
}

export async function POST(request: NextRequest) {
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
      .select('plan, trial_ends_at')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' } },
        { status: 404 }
      )
    }

    const typedUserData = userData as Pick<User, 'plan' | 'trial_ends_at'>

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
    const body: SuggestKeywordsRequest = await request.json()

    // 入力バリデーション
    if (!body.jobType && !body.currentKeywords?.length) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: '職種または現在のキーワードを指定してください',
          },
        },
        { status: 400 }
      )
    }

    // F-EXT-001: Claude APIでキーワードを提案（フォールバック付き）
    const result = await withFallback(
      () => suggestRelatedKeywords({
        jobType: body.jobType,
        area: body.area,
        conditions: body.conditions,
        currentKeywords: body.currentKeywords,
        suggestionType: body.suggestionType || 'all',
      }),
      () => getDefaultKeywordSuggestions(body.jobType)
    )

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'E-EXT-401',
            message: 'AIサービスが一時的に利用できません',
          },
        },
        { status: 503 }
      )
    }

    // 使用ログを記録
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action_type: 'keyword_suggest',
      metadata: {
        job_type: body.jobType,
        area: body.area,
        suggestion_count: result.data.keywords.length,
        used_fallback: result.usedFallback,
        retry_count: result.retryCount,
      },
    })

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        usedFallback: result.usedFallback,
        fallbackReason: result.fallbackReason,
      },
    })
  } catch (error) {
    console.error('Keyword suggestion error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SUGGESTION_ERROR',
          message: error instanceof Error ? error.message : 'キーワード提案中にエラーが発生しました',
        },
      },
      { status: 500 }
    )
  }
}
