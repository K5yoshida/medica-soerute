import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * ヘルスチェックAPI
 *
 * 設計書: 19_エラーカタログと監視ポリシー
 *
 * 監視ツール（UptimeRobot等）から定期的に呼び出され、
 * サービスの正常性を確認する。
 *
 * 認証不要（外部監視ツールからのアクセスを許可）
 */

interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  version: string
  checks: {
    database: 'ok' | 'error'
    api: 'ok'
  }
  responseTime?: number
}

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const startTime = Date.now()

  let dbStatus: 'ok' | 'error' = 'ok'

  try {
    // データベース接続チェック
    const supabase = await createClient()
    const { error } = await supabase
      .from('media_master')
      .select('id')
      .limit(1)
      .single()

    // エラーがあってもPGRST116（行が見つからない）は正常
    if (error && error.code !== 'PGRST116') {
      console.error('Health check: Database connection failed', error)
      dbStatus = 'error'
    }
  } catch (error) {
    console.error('Health check: Database check exception', error)
    dbStatus = 'error'
  }

  const responseTime = Date.now() - startTime
  const overallStatus = dbStatus === 'ok' ? 'ok' : 'degraded'

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: dbStatus,
      api: 'ok',
    },
    responseTime,
  }

  // degradedの場合は503を返す（監視ツールがアラートを発報できるように）
  const statusCode = overallStatus === 'ok' ? 200 : 503

  return NextResponse.json(response, { status: statusCode })
}
