// ===========================================
// PESO Analytics API
// PESO診断インサイトデータ取得
// GET /api/admin/analytics/peso
// 設計書: 13_APIエンドポイント一覧.md - 13.8 管理者API
// 画面: SC-908 PESOインサイト画面
// ===========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ===== 型定義 =====

interface PESOScores {
  paid: number
  earned: number
  shared: number
  owned: number
}

interface PESOSummary {
  total_diagnoses: number
  unique_users: number
  average_scores: PESOScores
}

interface ScoreDistribution {
  range: string
  count: number
}

interface PESOAnalyticsData {
  summary: PESOSummary
  score_distribution: {
    paid: ScoreDistribution[]
    earned: ScoreDistribution[]
    shared: ScoreDistribution[]
    owned: ScoreDistribution[]
  }
  trend: {
    date: string
    count: number
    avg_total: number
  }[]
  top_recommendations: {
    category: string
    recommendation: string
    frequency: number
  }[]
}

interface PESOAnalyticsResponse {
  success: boolean
  data?: PESOAnalyticsData
  error?: {
    code?: string
    message: string
  }
}

interface PESODiagnosisRow {
  id: string
  user_id: string
  scores: PESOScores | null
  recommendations: { category?: string; text?: string }[] | null
  created_at: string
}

// ===== ユーティリティ関数 =====

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getScoreRange(score: number): string {
  if (score >= 80) return '80-100'
  if (score >= 60) return '60-79'
  if (score >= 40) return '40-59'
  if (score >= 20) return '20-39'
  return '0-19'
}

function initializeDistribution(): ScoreDistribution[] {
  return [
    { range: '0-19', count: 0 },
    { range: '20-39', count: 0 },
    { range: '40-59', count: 0 },
    { range: '60-79', count: 0 },
    { range: '80-100', count: 0 },
  ]
}

// ===== メインハンドラー =====

export async function GET(request: NextRequest): Promise<NextResponse<PESOAnalyticsResponse>> {
  try {
    // 1. 認証チェック
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

    // 2. admin権限チェック
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '管理者権限が必要です' } },
        { status: 403 }
      )
    }

    // 3. クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')

    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    // 4. Service Clientでデータ取得
    const serviceClient = createServiceClient()

    const { data: pesoData, error: pesoError } = await serviceClient
      .from('peso_diagnoses')
      .select('id, user_id, scores, recommendations, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    if (pesoError) {
      console.error('PESO data query error:', pesoError)
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'PESO診断データの取得に失敗しました' } },
        { status: 500 }
      )
    }

    // 5. 集計処理
    const diagnosisRows = (pesoData || []) as PESODiagnosisRow[]
    const totalDiagnoses = diagnosisRows.length
    const uniqueUsers = new Set(diagnosisRows.map(p => p.user_id)).size

    // スコア集計
    let totalPaid = 0, totalEarned = 0, totalShared = 0, totalOwned = 0
    const paidDist = initializeDistribution()
    const earnedDist = initializeDistribution()
    const sharedDist = initializeDistribution()
    const ownedDist = initializeDistribution()

    // 日別トレンド
    const trendMap = new Map<string, { count: number; totalScore: number }>()

    // レコメンデーション頻度
    const recommendationFreq = new Map<string, { category: string; recommendation: string; count: number }>()

    diagnosisRows.forEach(diagnosis => {
      const scores = diagnosis.scores

      if (scores) {
        // スコア集計
        totalPaid += scores.paid || 0
        totalEarned += scores.earned || 0
        totalShared += scores.shared || 0
        totalOwned += scores.owned || 0

        // 分布集計
        const paidRange = getScoreRange(scores.paid || 0)
        const earnedRange = getScoreRange(scores.earned || 0)
        const sharedRange = getScoreRange(scores.shared || 0)
        const ownedRange = getScoreRange(scores.owned || 0)

        paidDist.find(d => d.range === paidRange)!.count++
        earnedDist.find(d => d.range === earnedRange)!.count++
        sharedDist.find(d => d.range === sharedRange)!.count++
        ownedDist.find(d => d.range === ownedRange)!.count++

        // トレンド集計
        const dateKey = formatDate(new Date(diagnosis.created_at))
        const existing = trendMap.get(dateKey) || { count: 0, totalScore: 0 }
        existing.count++
        existing.totalScore += (scores.paid + scores.earned + scores.shared + scores.owned) / 4
        trendMap.set(dateKey, existing)
      }

      // レコメンデーション集計
      const recommendations = diagnosis.recommendations
      if (recommendations && Array.isArray(recommendations)) {
        recommendations.forEach(rec => {
          if (rec.text) {
            const key = `${rec.category || 'general'}:${rec.text}`
            const existing = recommendationFreq.get(key) || {
              category: rec.category || 'general',
              recommendation: rec.text,
              count: 0,
            }
            existing.count++
            recommendationFreq.set(key, existing)
          }
        })
      }
    })

    // 平均スコア計算
    const avgCount = totalDiagnoses || 1
    const averageScores: PESOScores = {
      paid: Math.round(totalPaid / avgCount),
      earned: Math.round(totalEarned / avgCount),
      shared: Math.round(totalShared / avgCount),
      owned: Math.round(totalOwned / avgCount),
    }

    // トレンドデータを配列に変換
    const trend = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        avg_total: Math.round(data.totalScore / data.count),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // トップレコメンデーション（上位5件）
    const topRecommendations = Array.from(recommendationFreq.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(r => ({
        category: r.category,
        recommendation: r.recommendation,
        frequency: r.count,
      }))

    // 6. レスポンス返却
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_diagnoses: totalDiagnoses,
          unique_users: uniqueUsers,
          average_scores: averageScores,
        },
        score_distribution: {
          paid: paidDist,
          earned: earnedDist,
          shared: sharedDist,
          owned: ownedDist,
        },
        trend,
        top_recommendations: topRecommendations,
      },
    })
  } catch (error) {
    console.error('PESO analytics error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'PESOインサイトの取得に失敗しました',
        },
      },
      { status: 500 }
    )
  }
}
