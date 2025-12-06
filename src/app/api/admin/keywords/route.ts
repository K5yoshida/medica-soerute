// ===========================================
// Keywords List API
// キーワード一覧を取得する
// GET /api/admin/keywords
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { QueryIntentType, ClassificationSourceType } from '@/types/database'

interface KeywordItem {
  id: string
  keyword: string
  keyword_normalized: string
  intent: QueryIntentType
  intent_confidence: string | null
  intent_reason: string | null
  max_monthly_search_volume: number | null
  max_cpc: number | null
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
  classification_source: ClassificationSourceType
  created_at: string
  updated_at: string
}

interface KeywordsResponse {
  success: boolean
  data?: {
    keywords: KeywordItem[]
    total: number
  }
  error?: {
    message: string
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<KeywordsResponse>> {
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

    // クエリパラメータ
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const intent = searchParams.get('intent')
    const verified = searchParams.get('verified')
    const source = searchParams.get('source')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = (page - 1) * limit

    // キーワード一覧を取得
    let query = supabase
      .from('query_master')
      .select(
        `
        id,
        keyword,
        keyword_normalized,
        intent,
        intent_confidence,
        intent_reason,
        max_monthly_search_volume,
        max_cpc,
        is_verified,
        verified_by,
        verified_at,
        classification_source,
        created_at,
        updated_at
      `,
        { count: 'exact' }
      )
      .order('max_monthly_search_volume', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    // 検索フィルター（キーワード部分一致）
    if (search) {
      query = query.ilike('keyword', `%${search}%`)
    }

    // 意図フィルター
    if (intent && intent !== 'all') {
      query = query.eq('intent', intent)
    }

    // 検証状態フィルター
    if (verified !== null && verified !== 'all') {
      query = query.eq('is_verified', verified === 'true')
    }

    // 分類ソースフィルター
    if (source && source !== 'all') {
      query = query.eq('classification_source', source)
    }

    const { data: keywords, error: queryError, count } = await query

    if (queryError) {
      console.error('Keywords query error:', queryError)
      return NextResponse.json(
        { success: false, error: { message: 'キーワード一覧の取得に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        keywords: (keywords || []) as KeywordItem[],
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('Keywords list error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'キーワード一覧の取得に失敗しました' },
      },
      { status: 500 }
    )
  }
}
