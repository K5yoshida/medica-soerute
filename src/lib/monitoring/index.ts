/**
 * 監視・ロギングモジュール
 *
 * 設計書: 19_エラーカタログと監視ポリシー
 *
 * アプリケーション全体の監視機能を提供するモジュール。
 * - 構造化ログ出力
 * - メトリクス収集
 * - SLO/SLI管理
 */

// Logger
export { logger } from './logger'
export type { LogContext } from './logger'

// Metrics
export { metrics } from './metrics'

// SLO/SLI
export {
  SLI_DEFINITIONS,
  SLO_DEFINITIONS,
  SLO_TIERS,
  getSLODefinition,
  getSLIDefinition,
  calculateErrorBudget,
  checkErrorBudgetAlert,
  isSLOMet,
  getResponseLevel,
  calculateAllowedDowntime,
} from './slo'
export type { SLIDefinition, SLODefinition, ErrorBudget } from './slo'
