// ===========================================
// Keyword Update API
// キーワードの意図分類・検証状態を更新する
// PATCH /api/admin/keywords/[id]
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { QueryIntentType } from '@/types/database'

interface UpdateRequest {
  intent?: QueryIntentType
  intent_reason?: string
  is_verified?: boolean
}

interface UpdateResponse {
  success: boolean
  data?: {
    keyword: {
      id: string
      keyword: string
      intent: QueryIntentType
      intent_reason: string | null
      is_verified: boolean
      verified_by: string | null
      verified_at: string | null
      classification_source: string
    }
  }
  error?: {
    message: string
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UpdateResponse>> {
  try {
    const { id: keywordId } = await params

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
    const body: UpdateRequest = await request.json()

    // バリデーション（6カテゴリ + unknown）
    const validIntents: QueryIntentType[] = [
      'branded_media', 'branded_customer', 'branded_ambiguous',
      'transactional', 'informational', 'b2b', 'unknown'
    ]
    if (body.intent && !validIntents.includes(body.intent)) {
      return NextResponse.json(
        { success: false, error: { message: '無効な意図分類です' } },
        { status: 400 }
      )
    }

    if (body.intent_reason && body.intent_reason.length > 500) {
      return NextResponse.json(
        { success: false, error: { message: '分類理由は500文字以内にしてください' } },
        { status: 400 }
      )
    }

    // キーワードの存在確認
    const { data: existingKeyword, error: findError } = await supabase
      .from('keywords')
      .select('id, keyword')
      .eq('id', keywordId)
      .single()

    if (findError || !existingKeyword) {
      return NextResponse.json(
        { success: false, error: { message: 'キーワードが見つかりません' } },
        { status: 404 }
      )
    }

    // 更新データを構築
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // 意図分類を変更する場合
    if (body.intent !== undefined) {
      updateData.intent = body.intent
      updateData.intent_updated_at = new Date().toISOString()
      updateData.classification_source = 'manual' // 手動変更なのでmanualに
    }

    // 分類理由を変更する場合
    if (body.intent_reason !== undefined) {
      updateData.intent_reason = body.intent_reason
    }

    // 検証状態を変更する場合
    if (body.is_verified !== undefined) {
      updateData.is_verified = body.is_verified
      if (body.is_verified) {
        updateData.verified_by = user.id
        updateData.verified_at = new Date().toISOString()
      } else {
        updateData.verified_by = null
        updateData.verified_at = null
      }
    }

    // 更新実行
    const { data: updatedKeyword, error: updateError } = await supabase
      .from('keywords')
      .update(updateData)
      .eq('id', keywordId)
      .select('id, keyword, intent, intent_reason, is_verified, verified_by, verified_at, classification_source')
      .single()

    if (updateError) {
      console.error('Keyword update error:', updateError)
      return NextResponse.json(
        { success: false, error: { message: 'キーワードの更新に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        keyword: updatedKeyword,
      },
    })
  } catch (error) {
    console.error('Keyword update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'キーワードの更新に失敗しました' },
      },
      { status: 500 }
    )
  }
}
