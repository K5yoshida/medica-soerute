/**
 * SLO/SLI定義とエラーバジェット計算
 *
 * 設計書: 19_エラーカタログと監視ポリシー - 19.10 SLO/SLI定義
 *
 * サービスレベル目標（SLO）の定義とエラーバジェット管理を提供。
 */
import { startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns'
import { logger } from './logger'

/**
 * SLI定義
 *
 * 設計書: 19.10.1 SLI（Service Level Indicator）定義
 */
export interface SLIDefinition {
  id: string
  name: string
  description: string
  unit: string
  calculationMethod: string
}

/**
 * SLO定義
 *
 * 設計書: 19.10.2 SLO（Service Level Objective）定義
 */
export interface SLODefinition {
  id: string
  sliId: string
  name: string
  target: number
  unit: 'percentage' | 'milliseconds' | 'seconds'
  period: 'daily' | 'weekly' | 'monthly'
  tier: 1 | 2 | 3 | 4
}

/**
 * エラーバジェット
 *
 * 設計書: 19.10.4 エラーバジェット管理
 */
export interface ErrorBudget {
  sloId: string
  periodStart: Date
  periodEnd: Date
  totalBudgetMinutes: number
  consumedMinutes: number
  remainingMinutes: number
  consumptionRate: number
  status: 'healthy' | 'warning' | 'critical'
}

/**
 * SLI定義一覧
 *
 * 設計書: 19.10.1
 */
export const SLI_DEFINITIONS: SLIDefinition[] = [
  {
    id: 'SLI-001',
    name: '可用性',
    description: '正常なHTTPレスポンス（2xx, 3xx）の割合',
    unit: '%',
    calculationMethod: '成功リクエスト数 / 全リクエスト数 × 100',
  },
  {
    id: 'SLI-002',
    name: 'レイテンシ',
    description: 'APIレスポンス時間のパーセンタイル',
    unit: 'ms',
    calculationMethod: 'p50, p95, p99の計測',
  },
  {
    id: 'SLI-003',
    name: 'エラー率',
    description: '5xxエラーレスポンスの割合',
    unit: '%',
    calculationMethod: '5xxレスポンス数 / 全リクエスト数 × 100',
  },
  {
    id: 'SLI-004',
    name: 'スループット',
    description: '1秒あたりの処理リクエスト数',
    unit: 'RPS',
    calculationMethod: 'Requests Per Second',
  },
  {
    id: 'SLI-005',
    name: 'AI分析成功率',
    description: 'Claude API呼び出しの成功率',
    unit: '%',
    calculationMethod: '成功応答数 / 全呼び出し数 × 100',
  },
  {
    id: 'SLI-006',
    name: '決済成功率',
    description: 'Stripe決済処理の成功率',
    unit: '%',
    calculationMethod: '成功決済数 / 全決済試行数 × 100',
  },
]

/**
 * SLO定義一覧
 *
 * 設計書: 19.10.2
 */
export const SLO_DEFINITIONS: SLODefinition[] = [
  {
    id: 'SLO-001',
    sliId: 'SLI-001',
    name: '可用性',
    target: 99.9,
    unit: 'percentage',
    period: 'monthly',
    tier: 1,
  },
  {
    id: 'SLO-002',
    sliId: 'SLI-002',
    name: 'レイテンシ（p50）',
    target: 200,
    unit: 'milliseconds',
    period: 'weekly',
    tier: 2,
  },
  {
    id: 'SLO-003',
    sliId: 'SLI-002',
    name: 'レイテンシ（p95）',
    target: 1000,
    unit: 'milliseconds',
    period: 'weekly',
    tier: 2,
  },
  {
    id: 'SLO-004',
    sliId: 'SLI-002',
    name: 'レイテンシ（p99）',
    target: 3000,
    unit: 'milliseconds',
    period: 'weekly',
    tier: 2,
  },
  {
    id: 'SLO-005',
    sliId: 'SLI-003',
    name: 'エラー率',
    target: 0.1,
    unit: 'percentage',
    period: 'daily',
    tier: 1,
  },
  {
    id: 'SLO-006',
    sliId: 'SLI-005',
    name: 'AI分析成功率',
    target: 99,
    unit: 'percentage',
    period: 'weekly',
    tier: 2,
  },
  {
    id: 'SLO-007',
    sliId: 'SLI-006',
    name: '決済成功率',
    target: 99.5,
    unit: 'percentage',
    period: 'monthly',
    tier: 1,
  },
  {
    id: 'SLO-008',
    sliId: 'SLI-002',
    name: 'AI分析レイテンシ',
    target: 30000,
    unit: 'milliseconds',
    period: 'weekly',
    tier: 2,
  },
]

/**
 * SLOティア定義
 *
 * 設計書: 19.10.3 SLOティア定義
 */
export const SLO_TIERS = {
  1: {
    name: 'Tier 1',
    description: '認証・決済',
    availabilitySLO: 99.99,
    latencySLO: 500, // p99 < 500ms
    supportResponse: '即時（15分）',
  },
  2: {
    name: 'Tier 2',
    description: 'コア機能（マッチング、PESO）',
    availabilitySLO: 99.9,
    latencySLO: 3000, // p99 < 3s
    supportResponse: '1時間以内',
  },
  3: {
    name: 'Tier 3',
    description: '補助機能（カタログ、レポート）',
    availabilitySLO: 99.5,
    latencySLO: 5000, // p99 < 5s
    supportResponse: '4時間以内',
  },
  4: {
    name: 'Tier 4',
    description: 'バッチ処理（エクスポート、集計）',
    availabilitySLO: 99.0,
    latencySLO: 600000, // 完了まで10分
    supportResponse: '翌営業日',
  },
} as const

/**
 * SLO定義を取得
 */
export function getSLODefinition(sloId: string): SLODefinition | undefined {
  return SLO_DEFINITIONS.find((slo) => slo.id === sloId)
}

/**
 * SLI定義を取得
 */
export function getSLIDefinition(sliId: string): SLIDefinition | undefined {
  return SLI_DEFINITIONS.find((sli) => sli.id === sliId)
}

/**
 * エラーバジェットを計算
 *
 * 設計書: 19.10.4 エラーバジェット管理
 *
 * @param sloId SLO ID
 * @param downtimeMinutes 消費済みダウンタイム（分）
 * @param referenceDate 基準日（デフォルト: 現在）
 */
export function calculateErrorBudget(
  sloId: string,
  downtimeMinutes: number,
  referenceDate: Date = new Date()
): ErrorBudget | null {
  const slo = getSLODefinition(sloId)
  if (!slo) {
    logger.warn('SLO definition not found', { slo_id: sloId })
    return null
  }

  const periodStart = startOfMonth(referenceDate)
  const periodEnd = endOfMonth(referenceDate)

  // 月間の総時間（分）
  const totalMinutesInMonth = differenceInMinutes(periodEnd, periodStart)

  // エラーバジェット（分）= 総時間 × (100% - 目標%)
  // 例: 99.9%の可用性の場合、0.1%がエラーバジェット
  const errorBudgetPercentage = 100 - slo.target
  const totalBudgetMinutes = totalMinutesInMonth * (errorBudgetPercentage / 100)

  // 残りエラーバジェット
  const remainingMinutes = Math.max(0, totalBudgetMinutes - downtimeMinutes)

  // 消費率
  const consumptionRate =
    totalBudgetMinutes > 0 ? (downtimeMinutes / totalBudgetMinutes) * 100 : 0

  // ステータス判定
  let status: ErrorBudget['status'] = 'healthy'
  if (consumptionRate >= 90) {
    status = 'critical'
  } else if (consumptionRate >= 75) {
    status = 'warning'
  }

  return {
    sloId,
    periodStart,
    periodEnd,
    totalBudgetMinutes,
    consumedMinutes: downtimeMinutes,
    remainingMinutes,
    consumptionRate,
    status,
  }
}

/**
 * エラーバジェットアラートをチェック
 *
 * 設計書: 19.10.4 エラーバジェット管理
 *
 * @param budget エラーバジェット
 * @returns アラートが必要な場合はアラート情報を返す
 */
export function checkErrorBudgetAlert(budget: ErrorBudget): {
  level: 'warning' | 'critical'
  message: string
} | null {
  if (budget.consumptionRate >= 90) {
    return {
      level: 'critical',
      message: `エラーバジェット危機: ${budget.sloId} が${budget.consumptionRate.toFixed(1)}%消費`,
    }
  }

  if (budget.consumptionRate >= 75) {
    return {
      level: 'warning',
      message: `エラーバジェット警告: ${budget.sloId} が${budget.consumptionRate.toFixed(1)}%消費`,
    }
  }

  return null
}

/**
 * SLO達成状況を計算
 *
 * @param sloId SLO ID
 * @param currentValue 現在の計測値
 * @returns SLO達成の場合はtrue
 */
export function isSLOMet(sloId: string, currentValue: number): boolean {
  const slo = getSLODefinition(sloId)
  if (!slo) {
    return false
  }

  // 可用性・成功率系（目標以上であればOK）
  if (slo.unit === 'percentage' && slo.target > 50) {
    return currentValue >= slo.target
  }

  // エラー率系（目標以下であればOK）
  if (slo.unit === 'percentage' && slo.target <= 50) {
    return currentValue <= slo.target
  }

  // レイテンシ系（目標以下であればOK）
  if (slo.unit === 'milliseconds' || slo.unit === 'seconds') {
    return currentValue <= slo.target
  }

  return false
}

/**
 * SLO違反時の対応レベルを取得
 *
 * 設計書: 19.10.7 SLO違反時の対応フロー
 *
 * @param budget エラーバジェット
 * @returns 対応レベル
 */
export function getResponseLevel(budget: ErrorBudget): {
  level: 'normal' | 'priority' | 'emergency'
  action: string
} {
  const remainingPercentage = 100 - budget.consumptionRate

  if (remainingPercentage < 25) {
    return {
      level: 'emergency',
      action: '緊急対応: 即時対応、新機能開発を完全停止、全員で信頼性改善に集中',
    }
  }

  if (remainingPercentage < 50) {
    return {
      level: 'priority',
      action: '優先対応: 今スプリントで対応、機能追加を一時停止検討',
    }
  }

  return {
    level: 'normal',
    action: '通常対応: チケット作成、次スプリントで対応',
  }
}

/**
 * 月間許容ダウンタイムを計算
 *
 * @param availabilityTarget 可用性目標（%）
 * @param daysInMonth 月の日数（デフォルト: 30）
 * @returns 許容ダウンタイム（分）
 */
export function calculateAllowedDowntime(
  availabilityTarget: number,
  daysInMonth: number = 30
): { minutes: number; hours: number; display: string } {
  const totalMinutesInMonth = daysInMonth * 24 * 60
  const allowedMinutes = totalMinutesInMonth * ((100 - availabilityTarget) / 100)
  const allowedHours = allowedMinutes / 60

  let display: string
  if (allowedMinutes < 60) {
    display = `${allowedMinutes.toFixed(1)}分`
  } else {
    display = `${allowedHours.toFixed(1)}時間`
  }

  return {
    minutes: allowedMinutes,
    hours: allowedHours,
    display,
  }
}
