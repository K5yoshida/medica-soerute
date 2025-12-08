import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface HistoryItem {
  id: string
  type: 'matching' | 'peso'
  summary: string
  created_at: string
}

interface MatchingResult {
  id: string
  job_requirements: {
    prefecture?: string
    job_category?: string
    employment_type?: string
  } | null
  matched_media: Array<{ name?: string }> | null
  created_at: string
}

interface PesoDiagnosis {
  id: string
  diagnosis_data: {
    company_name?: string
  } | null
  scores: {
    paid?: number
    earned?: number
    shared?: number
    owned?: number
    total?: number
  } | null
  created_at: string
}

/**
 * GET /api/user/history
 * 利用履歴取得API
 *
 * マッチング分析とPESO診断の履歴を取得
 */
export async function GET(request: NextRequest) {
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

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'matching' | 'peso' | null (両方)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '20', 10), 100) // 最大100件

    const offset = (page - 1) * perPage
    const history: HistoryItem[] = []
    let totalCount = 0

    // マッチング履歴を取得
    if (!type || type === 'matching') {
      const { data: matchingData, error: matchingError, count: matchingCount } = await supabase
        .from('matching_results')
        .select('id, job_requirements, matched_media, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + perPage - 1)

      if (matchingError) {
        console.error('Matching history error:', matchingError)
      } else if (matchingData) {
        const matchingResults = matchingData as unknown as MatchingResult[]
        matchingResults.forEach((item) => {
          const requirements = item.job_requirements || {}
          const topMedia = Array.isArray(item.matched_media) && item.matched_media[0]?.name
            ? item.matched_media[0].name
            : '分析中'

          const parts = [
            requirements.prefecture || '',
            requirements.job_category || '',
            requirements.employment_type || '',
          ].filter(Boolean)

          history.push({
            id: item.id,
            type: 'matching',
            summary: parts.length > 0
              ? `${parts.join('/')} → ${topMedia}推奨`
              : `マッチング分析 → ${topMedia}推奨`,
            created_at: item.created_at,
          })
        })
        totalCount += matchingCount || 0
      }
    }

    // PESO履歴を取得
    if (!type || type === 'peso') {
      const { data: pesoData, error: pesoError, count: pesoCount } = await supabase
        .from('peso_diagnoses')
        .select('id, diagnosis_data, scores, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + perPage - 1)

      if (pesoError) {
        console.error('PESO history error:', pesoError)
      } else if (pesoData) {
        const pesoResults = pesoData as unknown as PesoDiagnosis[]
        pesoResults.forEach((item) => {
          const diagnosisData = item.diagnosis_data || {}
          const scores = item.scores || {}

          const companyPart = diagnosisData.company_name || 'PESO診断'
          const scorePart = scores.total !== undefined
            ? `総合スコア ${scores.total}点`
            : '診断完了'

          history.push({
            id: item.id,
            type: 'peso',
            summary: `${companyPart} → ${scorePart}`,
            created_at: item.created_at,
          })
        })
        totalCount += pesoCount || 0
      }
    }

    // 日付順でソート（両方取得した場合）
    history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // ページネーション用に切り詰め
    const paginatedHistory = history.slice(0, perPage)
    const totalPages = Math.ceil(totalCount / perPage)

    return NextResponse.json({
      success: true,
      data: {
        history: paginatedHistory,
        pagination: {
          current_page: page,
          per_page: perPage,
          total_pages: totalPages,
          total_count: totalCount,
        },
      },
    })
  } catch (error) {
    console.error('Get history error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
