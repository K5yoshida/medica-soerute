// ===========================================
// Keywords Stats API
// キーワード品質統計を取得する
// GET /api/admin/keywords/stats
// ===========================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface StatsResponse {
  success: boolean
  data?: {
    total_keywords: number
    verified_count: number
    verification_rate: number
    unverified_ai_count: number
    by_source: {
      rule: number
      ai: number
      manual: number
      unknown: number
    }
    by_intent: {
      branded: number
      transactional: number
      informational: number
      b2b: number
      unknown: number
    }
  }
  error?: {
    message: string
  }
}

export async function GET(): Promise<NextResponse<StatsResponse>> {
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

    // 全キーワード数を取得
    const { count: totalCount, error: totalError } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      throw new Error(`Total count error: ${totalError.message}`)
    }

    // 検証済みキーワード数を取得
    const { count: verifiedCount, error: verifiedError } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true)

    if (verifiedError) {
      throw new Error(`Verified count error: ${verifiedError.message}`)
    }

    // 未検証のAI分類キーワード数を取得
    const { count: unverifiedAiCount, error: unverifiedAiError } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', false)
      .eq('classification_source', 'ai')

    if (unverifiedAiError) {
      throw new Error(`Unverified AI count error: ${unverifiedAiError.message}`)
    }

    // 分類ソース別集計
    const { count: ruleCount } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('classification_source', 'rule')

    const { count: aiCount } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('classification_source', 'ai')

    const { count: manualCount } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('classification_source', 'manual')

    const { count: unknownSourceCount } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('classification_source', 'unknown')

    // 意図別集計
    const { count: brandedCount } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('intent', 'branded')

    const { count: transactionalCount } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('intent', 'transactional')

    const { count: informationalCount } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('intent', 'informational')

    const { count: b2bCount } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('intent', 'b2b')

    const { count: unknownIntentCount } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('intent', 'unknown')

    const total = totalCount || 0
    const verified = verifiedCount || 0

    return NextResponse.json({
      success: true,
      data: {
        total_keywords: total,
        verified_count: verified,
        verification_rate: total > 0 ? Math.round((verified / total) * 1000) / 10 : 0,
        unverified_ai_count: unverifiedAiCount || 0,
        by_source: {
          rule: ruleCount || 0,
          ai: aiCount || 0,
          manual: manualCount || 0,
          unknown: unknownSourceCount || 0,
        },
        by_intent: {
          branded: brandedCount || 0,
          transactional: transactionalCount || 0,
          informational: informationalCount || 0,
          b2b: b2bCount || 0,
          unknown: unknownIntentCount || 0,
        },
      },
    })
  } catch (error) {
    console.error('Keywords stats error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : '統計の取得に失敗しました' },
      },
      { status: 500 }
    )
  }
}
