import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User, PlanType } from '@/types'
import { logAuditEvent, extractClientInfo } from '@/lib/audit'
import { generatePesoPDF } from '@/lib/pdf/generator'

// プラン別のエクスポート制限
const EXPORT_PERMISSIONS: Record<PlanType, { csv: boolean; pdf: boolean }> = {
  medica: { csv: true, pdf: true },
  enterprise: { csv: true, pdf: true },
  professional: { csv: true, pdf: true },
  starter: { csv: true, pdf: false },
  trial: { csv: true, pdf: false },
}

interface PesoScores {
  paid?: number
  earned?: number
  shared?: number
  owned?: number
  total?: number
}

interface DiagnosisData {
  company_name?: string
  industry?: string
  employee_size?: string
  prefecture?: string
  saved_name?: string
}

interface Recommendation {
  priority?: number
  category?: string
  action?: string
  impact?: string
}

interface PesoDiagnosisRow {
  id: string
  diagnosis_data: DiagnosisData | null
  scores: PesoScores | null
  recommendations: Recommendation[] | null
  created_at: string
}

/**
 * GET /api/peso/results/{id}/export
 * PESO診断結果のエクスポート（CSV/PDF）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: diagnosisId } = await params
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

    // 診断結果を取得
    const { data: diagnosis, error: fetchError } = await supabase
      .from('peso_diagnoses')
      .select('*')
      .eq('id', diagnosisId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !diagnosis) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '診断結果が見つかりません' } },
        { status: 404 }
      )
    }

    const result = diagnosis as unknown as PesoDiagnosisRow

    if (format === 'csv') {
      // CSV生成
      const csvContent = generatePesoCSV(result)
      const filename = `peso_diagnosis_${diagnosisId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.csv`

      // 監査ログ記録
      const clientInfo = extractClientInfo(request)
      await logAuditEvent({
        action: 'data.exported',
        userId: user.id,
        targetResourceType: 'peso_diagnosis',
        targetResourceId: diagnosisId,
        details: { format: 'csv' },
        ...clientInfo,
        success: true,
      })

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else {
      // PDF生成（GAP-023）
      const scores = result.scores || {}
      const recommendations = result.recommendations || []

      const pdfData = {
        id: result.id,
        scores: {
          paid: scores.paid ?? 0,
          earned: scores.earned ?? 0,
          shared: scores.shared ?? 0,
          owned: scores.owned ?? 0,
        },
        recommendations: recommendations.map(rec =>
          typeof rec === 'string' ? rec : (rec.action || '')
        ),
        created_at: result.created_at,
        saved_name: result.diagnosis_data?.saved_name,
        companyInfo: result.diagnosis_data ? {
          company_name: result.diagnosis_data.company_name,
          industry: result.diagnosis_data.industry,
          employee_size: result.diagnosis_data.employee_size,
        } : undefined,
      }

      const pdfBuffer = generatePesoPDF(pdfData)
      const filename = `peso_diagnosis_${diagnosisId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`

      // 監査ログ記録
      const clientInfo = extractClientInfo(request)
      await logAuditEvent({
        action: 'data.exported',
        userId: user.id,
        targetResourceType: 'peso_diagnosis',
        targetResourceId: diagnosisId,
        details: { format: 'pdf' },
        ...clientInfo,
        success: true,
      })

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }
  } catch (error) {
    console.error('Export PESO result error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

function generatePesoCSV(result: PesoDiagnosisRow): string {
  const BOM = '\uFEFF' // Excel用UTF-8 BOM
  const lines: string[] = []

  const diagnosisData = result.diagnosis_data || {}
  const scores = result.scores || {}

  // ヘッダー
  lines.push('PESO診断結果レポート')
  lines.push(`診断日時,${new Date(result.created_at).toLocaleString('ja-JP')}`)
  if (diagnosisData.saved_name) {
    lines.push(`レポート名,${diagnosisData.saved_name}`)
  }
  lines.push('')

  // 企業情報
  lines.push('■ 企業情報')
  lines.push(`企業名,${diagnosisData.company_name || '-'}`)
  lines.push(`業種,${diagnosisData.industry || '-'}`)
  lines.push(`従業員規模,${diagnosisData.employee_size || '-'}`)
  lines.push(`所在地,${diagnosisData.prefecture || '-'}`)
  lines.push('')

  // PESOスコア
  lines.push('■ PESOスコア')
  lines.push(`総合スコア,${scores.total ?? '-'}`)
  lines.push(`Paid (有料広告),${scores.paid ?? '-'}`)
  lines.push(`Earned (口コミ・PR),${scores.earned ?? '-'}`)
  lines.push(`Shared (SNS),${scores.shared ?? '-'}`)
  lines.push(`Owned (自社メディア),${scores.owned ?? '-'}`)
  lines.push('')

  // 推奨施策
  const recommendations = result.recommendations || []
  if (recommendations.length > 0) {
    lines.push('■ 推奨施策')
    lines.push('優先度,カテゴリ,アクション,インパクト')
    recommendations.forEach((rec) => {
      lines.push(`${rec.priority || '-'},${rec.category || '-'},${rec.action || '-'},${rec.impact || '-'}`)
    })
  }

  return BOM + lines.join('\n')
}
