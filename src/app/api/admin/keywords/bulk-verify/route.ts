// ===========================================
// Bulk Verify API
// 複数キーワードを一括で検証済みにする
// POST /api/admin/keywords/bulk-verify
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface BulkVerifyRequest {
  keyword_ids: string[]
  is_verified: boolean
}

interface BulkVerifyResponse {
  success: boolean
  data?: {
    updated_count: number
  }
  error?: {
    message: string
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<BulkVerifyResponse>> {
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

    // リクエストボディをパース
    const body: BulkVerifyRequest = await request.json()

    // バリデーション
    if (!body.keyword_ids || !Array.isArray(body.keyword_ids) || body.keyword_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'keyword_idsは1つ以上必要です' } },
        { status: 400 }
      )
    }

    if (body.keyword_ids.length > 1000) {
      return NextResponse.json(
        { success: false, error: { message: '一度に検証できるのは1000件までです' } },
        { status: 400 }
      )
    }

    if (typeof body.is_verified !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { message: 'is_verifiedはboolean型である必要があります' } },
        { status: 400 }
      )
    }

    // 更新データを構築
    const updateData: Record<string, unknown> = {
      is_verified: body.is_verified,
      updated_at: new Date().toISOString(),
    }

    if (body.is_verified) {
      updateData.verified_by = user.id
      updateData.verified_at = new Date().toISOString()
    } else {
      updateData.verified_by = null
      updateData.verified_at = null
    }

    // バッチ更新実行
    const { error: updateError, count } = await supabase
      .from('keywords')
      .update(updateData)
      .in('id', body.keyword_ids)

    if (updateError) {
      console.error('Bulk verify error:', updateError)
      return NextResponse.json(
        { success: false, error: { message: '一括検証に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        updated_count: count || body.keyword_ids.length,
      },
    })
  } catch (error) {
    console.error('Bulk verify error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : '一括検証に失敗しました' },
      },
      { status: 500 }
    )
  }
}
