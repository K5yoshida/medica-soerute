/**
 * メトリクス収集ライブラリ
 *
 * 設計書: 19_エラーカタログと監視ポリシー - 19.7.2 監視メトリクス収集
 *
 * アプリケーション全体のメトリクス収集を提供。
 * SLI/SLO計測の基盤となる。
 */
import * as Sentry from '@sentry/nextjs'
import { logger } from './logger'

/**
 * メトリクスデータ
 */
interface Metric {
  name: string
  value: number
  tags: Record<string, string>
  timestamp: Date
}

/**
 * メトリクスバッファ設定
 */
interface MetricsConfig {
  /** バッファサイズ上限 */
  maxBufferSize: number
  /** フラッシュ間隔（ミリ秒） */
  flushIntervalMs: number
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: MetricsConfig = {
  maxBufferSize: 1000,
  flushIntervalMs: 60000, // 1分
}

/**
 * MetricsCollector クラス
 *
 * 設計書: 19.7.2 監視メトリクス収集
 *
 * メトリクスをバッファリングし、定期的にフラッシュ。
 * 本番環境ではSentryのカスタムメトリクスとしても送信。
 */
class MetricsCollector {
  private metrics: Metric[] = []
  private config: MetricsConfig
  private flushTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * メトリクスを記録
   *
   * @param name メトリクス名
   * @param value 値
   * @param tags タグ（オプション）
   */
  record(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: Metric = {
      name,
      value,
      tags,
      timestamp: new Date(),
    }

    this.metrics.push(metric)

    // バッファサイズ上限に達したらフラッシュ
    if (this.metrics.length >= this.config.maxBufferSize) {
      this.flush()
    }

    // Sentryにブレッドクラムとして記録（本番環境）
    if (process.env.NODE_ENV === 'production') {
      Sentry.addBreadcrumb({
        category: 'metrics',
        message: name,
        level: 'info',
        data: { value, ...tags },
      })
    }
  }

  /**
   * API呼び出し時間を計測
   *
   * @param name API名
   * @param fn 実行する関数
   * @returns 関数の戻り値
   */
  async measureApiCall<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const durationMs = Date.now() - start
      this.record(`api.${name}.duration`, durationMs, { status: 'success' })
      this.record(`api.${name}.success`, 1)
      return result
    } catch (error) {
      const durationMs = Date.now() - start
      this.record(`api.${name}.duration`, durationMs, { status: 'error' })
      this.record(`api.${name}.error`, 1)
      throw error
    }
  }

  /**
   * 外部サービス呼び出し時間を計測
   *
   * @param service サービス名（claude, stripe等）
   * @param operation 操作名
   * @param fn 実行する関数
   * @returns 関数の戻り値
   */
  async measureExternalCall<T>(
    service: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const durationMs = Date.now() - start
      this.record(`external.${service}.${operation}.duration`, durationMs, {
        status: 'success',
      })
      this.record(`external.${service}.${operation}.success`, 1)

      logger.externalCall(service, operation, true, durationMs)
      return result
    } catch (error) {
      const durationMs = Date.now() - start
      this.record(`external.${service}.${operation}.duration`, durationMs, {
        status: 'error',
      })
      this.record(`external.${service}.${operation}.error`, 1)

      logger.externalCall(service, operation, false, durationMs)
      throw error
    }
  }

  /**
   * 利用状況を記録
   *
   * @param feature 機能名
   * @param userId ユーザーID
   */
  recordUsage(feature: string, userId: string): void {
    this.record(`usage.${feature}`, 1, { user_id: userId })
  }

  /**
   * エラーを記録
   *
   * @param errorCode エラーコード
   */
  recordError(errorCode: string): void {
    this.record('error.count', 1, { code: errorCode })
  }

  /**
   * HTTPリクエストメトリクスを記録
   *
   * @param method HTTPメソッド
   * @param path パス
   * @param statusCode ステータスコード
   * @param durationMs レスポンス時間（ミリ秒）
   */
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number
  ): void {
    const statusCategory = Math.floor(statusCode / 100) * 100

    this.record('http.request.duration', durationMs, {
      method,
      path,
      status: String(statusCode),
      status_category: String(statusCategory),
    })

    this.record('http.request.count', 1, {
      method,
      path,
      status: String(statusCode),
      status_category: String(statusCategory),
    })

    // 5xxエラーは別途カウント
    if (statusCode >= 500) {
      this.record('http.server_error', 1, {
        method,
        path,
        status: String(statusCode),
      })
    }

    // 4xxエラーも別途カウント
    if (statusCode >= 400 && statusCode < 500) {
      this.record('http.client_error', 1, {
        method,
        path,
        status: String(statusCode),
      })
    }
  }

  /**
   * バッファをフラッシュ
   *
   * 収集したメトリクスをログ出力しバッファをクリア。
   */
  flush(): void {
    if (this.metrics.length === 0) {
      return
    }

    // メトリクスサマリーをログ出力
    const summary = this.aggregateMetrics()

    logger.info('Metrics flushed', {
      action: 'metrics.flush',
      metrics_count: this.metrics.length,
      summary: JSON.stringify(summary),
    })

    // バッファをクリア
    this.metrics = []
  }

  /**
   * メトリクスを集計
   */
  private aggregateMetrics(): Record<string, { count: number; sum: number; avg: number }> {
    const aggregated: Record<string, { count: number; sum: number }> = {}

    for (const metric of this.metrics) {
      if (!aggregated[metric.name]) {
        aggregated[metric.name] = { count: 0, sum: 0 }
      }
      aggregated[metric.name].count++
      aggregated[metric.name].sum += metric.value
    }

    const result: Record<string, { count: number; sum: number; avg: number }> = {}
    for (const [name, data] of Object.entries(aggregated)) {
      result[name] = {
        count: data.count,
        sum: data.sum,
        avg: data.sum / data.count,
      }
    }

    return result
  }

  /**
   * 定期フラッシュを開始
   */
  startPeriodicFlush(): void {
    if (this.flushTimer) {
      return
    }

    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushIntervalMs)
  }

  /**
   * 定期フラッシュを停止
   */
  stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * 現在のバッファサイズを取得
   */
  getBufferSize(): number {
    return this.metrics.length
  }
}

/**
 * シングルトンインスタンス
 */
export const metrics = new MetricsCollector()
