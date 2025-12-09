import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

type MediaMaster = Database['public']['Tables']['media_master']['Row']

/**
 * Admin API: 媒体マスター管理
 *
 * GET  - 媒体一覧取得
 * POST - 媒体追加
 */

// 媒体一覧取得
export async function GET(request: Request) {
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

    // admin権限チェック
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const showInactiveOnly = searchParams.get('show_inactive_only') === 'true'

    const serviceClient = createServiceClient()

    // クエリ構築
    let query = serviceClient
      .from('media_master')
      .select('*', { count: 'exact' })

    // フィルター
    if (search) {
      query = query.or(`name.ilike.%${search}%,domain.ilike.%${search}%`)
    }

    // 非アクティブを表示がチェックされたら非アクティブのみ、そうでなければアクティブのみ
    if (showInactiveOnly) {
      query = query.eq('is_active', false)
    } else {
      query = query.eq('is_active', true)
    }

    // ソート
    query = query.order('name', { ascending: true })

    const { data: mediaList, error: mediaError, count } = await query

    if (mediaError) {
      console.error('Failed to fetch media:', mediaError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: '媒体一覧の取得に失敗しました' } },
        { status: 500 }
      )
    }

    // 各媒体のキーワード数を取得（count集計を使用）
    const mediaIds = (mediaList || []).map((m: MediaMaster) => m.id)

    const keywordCounts: Record<string, number> = {}
    if (mediaIds.length > 0) {
      // 各媒体ごとにカウントを取得（全件取得ではなくcount集計）
      for (const mediaId of mediaIds) {
        const { count } = await serviceClient
          .from('media_keywords')
          .select('id', { count: 'exact', head: true })
          .eq('media_id', mediaId)

        keywordCounts[mediaId] = count || 0
      }
    }

    // 各媒体の最新トラフィックソースデータを取得
    type TrafficData = {
      media_id: string
      search_pct: number | null
      direct_pct: number | null
      referral_pct: number | null
      display_pct: number | null
      social_pct: number | null
      email_pct: number | null
    }
    const trafficDataMap: Record<string, TrafficData> = {}
    if (mediaIds.length > 0) {
      const { data: trafficData } = await serviceClient
        .from('traffic_data')
        .select('media_id, search_pct, direct_pct, referral_pct, display_pct, social_pct, email_pct')
        .in('media_id', mediaIds)
        .order('created_at', { ascending: false })

      if (trafficData) {
        // 各媒体の最新データのみ取得（重複時は最初の1件を使用）
        trafficData.forEach((t: TrafficData) => {
          if (!trafficDataMap[t.media_id]) {
            trafficDataMap[t.media_id] = t
          }
        })
      }
    }

    // 各媒体の最新CSVインポート日を取得
    type ImportJob = { media_id: string; completed_at: string }
    const lastImportMap: Record<string, string> = {}
    if (mediaIds.length > 0) {
      const { data: importJobs } = await serviceClient
        .from('import_jobs')
        .select('media_id, completed_at')
        .in('media_id', mediaIds)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (importJobs) {
        importJobs.forEach((j: ImportJob) => {
          if (j.media_id && !lastImportMap[j.media_id]) {
            lastImportMap[j.media_id] = j.completed_at
          }
        })
      }
    }

    // キーワード数・トラフィックソース・最終インポート日を付加
    const enrichedData = (mediaList || []).map((media: MediaMaster) => ({
      ...media,
      keyword_count: keywordCounts[media.id] || 0,
      traffic_sources: trafficDataMap[media.id] || null,
      last_csv_import_at: lastImportMap[media.id] || null,
    }))

    return NextResponse.json({
      success: true,
      data: enrichedData,
      total: count || 0,
    })
  } catch (error) {
    console.error('Get media error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

// 媒体追加
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

    // admin権限チェック
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, domain: rawDomain, monthly_visits, is_active } = body

    // バリデーション
    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '媒体名は必須です' } },
        { status: 400 }
      )
    }

    // ドメインの正規化（https://, http://, 末尾スラッシュを除去）
    const normalizedDomain = rawDomain
      ? rawDomain
          .replace(/^https?:\/\//i, '')  // https:// または http:// を除去
          .replace(/\/+$/, '')            // 末尾のスラッシュを除去
          .trim()
      : null

    const serviceClient = createServiceClient()

    // 重複チェック（名前 or ドメイン）
    const { data: existing } = await serviceClient
      .from('media_master')
      .select('id, name, domain')
      .or(`name.eq.${name}${normalizedDomain ? `,domain.eq.${normalizedDomain}` : ''}`)
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: '同名の媒体またはドメインが既に登録されています' } },
        { status: 409 }
      )
    }

    // 登録
    const { data: newMedia, error: insertError } = await serviceClient
      .from('media_master')
      .insert({
        name,
        domain: normalizedDomain,
        monthly_visits: monthly_visits || null,
        is_active: is_active !== false,
        category: 'general', // デフォルトカテゴリ（enum: general, nursing, pharmacy, dental, welfare, rehabilitation）
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert media:', insertError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: '媒体の登録に失敗しました' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { ...newMedia, keyword_count: 0 },
    })
  } catch (error) {
    console.error('Create media error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
