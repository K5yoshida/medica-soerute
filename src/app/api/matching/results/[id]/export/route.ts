import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User, PlanType } from '@/types'
import { generateMatchingPDF } from '@/lib/pdf/generator'

// プラン別のエクスポート制限
const EXPORT_PERMISSIONS: Record<PlanType, { csv: boolean; pdf: boolean }> = {
  medica: { csv: true, pdf: true },
  enterprise: { csv: true, pdf: true },
  professional: { csv: true, pdf: true },
  starter: { csv: true, pdf: false },
  trial: { csv: true, pdf: false },
}

interface MatchedMedia {
  name?: string
  mediaName?: string // API応答での名称
  score?: number
  matchScore?: number // API応答でのスコア
  rank?: number
  // GAP-015: 予算配分情報
  budgetAllocation?: number // 推奨予算配分率
  expectedROI?: string // 期待ROI
  recommendedBudget?: string // 推奨予算額
  estimatedCost?: string // 想定費用
}

interface JobRequirements {
  prefecture?: string
  job_category?: string
  employment_type?: string
}

interface AnalysisResultRow {
  id: string
  job_requirements: JobRequirements | null
  matched_media: MatchedMedia[] | null
  recommendations: string[] | null
  created_at: string
  analysis_detail: {
    saved_name?: string
  } | null
}

/**
 * GET /api/matching/results/{id}/export
 * マッチング分析結果のエクスポート（CSV/PDF）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params
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

    // フォーマットを取得
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    if (!['csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FORMAT', message: '無効なフォーマットです' } },
        { status: 400 }
      )
    }

    // ユーザー情報を取得してプラン確認
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' } },
        { status: 404 }
      )
    }

    const typedUserData = userData as User
    const permissions = EXPORT_PERMISSIONS[typedUserData.plan] || { csv: false, pdf: false }

    if ((format === 'csv' && !permissions.csv) || (format === 'pdf' && !permissions.pdf)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PLAN_RESTRICTION',
            message: format === 'pdf'
              ? 'PDFエクスポートはProfessionalプラン以上でご利用いただけます'
              : 'エクスポート機能はStarterプラン以上でご利用いただけます',
          },
        },
        { status: 403 }
      )
    }

    // 分析結果を取得
    const { data: analysisResult, error: fetchError } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !analysisResult) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '分析結果が見つかりません' } },
        { status: 404 }
      )
    }

    const result = analysisResult as unknown as AnalysisResultRow

    if (format === 'csv') {
      // CSV生成
      const csvContent = generateMatchingCSV(result)
      const filename = `analysis_${analysisId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.csv`

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else {
      // PDF生成（GAP-023）
      const matchedMedia = (result.matched_media || []).map((media, index) => ({
        name: media.name || media.mediaName || `媒体${index + 1}`,
        score: media.score ?? media.matchScore ?? 0,
        rank: media.rank ?? index + 1,
        budgetAllocation: media.budgetAllocation,
        expectedROI: media.expectedROI,
        recommendedBudget: media.recommendedBudget,
        matchReasons: [],
      }))

      const pdfData = {
        id: result.id,
        job_requirements: {
          location: result.job_requirements?.prefecture,
          occupation: result.job_requirements?.job_category,
          employmentType: result.job_requirements?.employment_type,
        },
        matched_media: matchedMedia,
        created_at: result.created_at,
        saved_name: result.analysis_detail?.saved_name,
      }

      const pdfBuffer = generateMatchingPDF(pdfData)
      const filename = `analysis_${analysisId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }
  } catch (error) {
    console.error('Export matching result error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

function generateMatchingCSV(result: AnalysisResultRow): string {
  const BOM = '\uFEFF' // Excel用UTF-8 BOM
  const lines: string[] = []

  // ヘッダー
  lines.push('マッチング分析結果レポート')
  lines.push(`分析日時,${new Date(result.created_at).toLocaleString('ja-JP')}`)
  lines.push('')

  // 検索条件
  lines.push('■ 検索条件')
  const requirements = result.job_requirements || {}
  lines.push(`都道府県,${requirements.prefecture || '-'}`)
  lines.push(`職種,${requirements.job_category || '-'}`)
  lines.push(`雇用形態,${requirements.employment_type || '-'}`)
  lines.push('')

  // マッチング結果（GAP-015: 予算配分列追加）
  lines.push('■ マッチング結果')
  lines.push('順位,媒体名,スコア,予算配分(%),推奨予算,期待ROI')
  const matchedMedia = result.matched_media || []
  matchedMedia.forEach((media, index) => {
    const name = media.name || media.mediaName || '-'
    const score = media.score ?? media.matchScore ?? '-'
    const budgetAlloc = media.budgetAllocation ?? '-'
    const budget = media.recommendedBudget || '-'
    const roi = media.expectedROI || '-'
    lines.push(`${index + 1},${name},${score},${budgetAlloc},${budget},${roi}`)
  })
  lines.push('')

  // 推奨事項
  if (result.recommendations && result.recommendations.length > 0) {
    lines.push('■ 推奨事項')
    result.recommendations.forEach((rec, index) => {
      lines.push(`${index + 1},${rec}`)
    })
  }

  return BOM + lines.join('\n')
}
