'use client'

import { useEffect, useState } from 'react'
import {
  FileText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Download,
  RefreshCw,
  Clock,
  User,
  Globe,
  Server,
} from 'lucide-react'

/**
 * SC-909: システムログ画面
 *
 * Design spec: 09_画面一覧.md - SC-909
 *
 * Features:
 * - システムログ一覧表示
 * - レベル別フィルタリング（info, warn, error）
 * - カテゴリ別フィルタリング
 * - 日時範囲フィルタリング
 * - ログ詳細表示
 * - ログエクスポート
 */

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  category: 'auth' | 'api' | 'system' | 'billing' | 'user'
  message: string
  userId?: string
  userName?: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

interface LogStats {
  total: number
  info: number
  warn: number
  error: number
  todayTotal: number
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('24h')
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchLogs()
  }, [currentPage, levelFilter, categoryFilter, dateRange, searchQuery])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      // TODO: 実際のAPIに接続
      // const res = await fetch(`/api/admin/logs?page=${currentPage}&level=${levelFilter}&category=${categoryFilter}&range=${dateRange}&q=${searchQuery}`)
      // const data = await res.json()

      // Mock data
      setStats({
        total: 12847,
        info: 10234,
        warn: 2156,
        error: 457,
        todayTotal: 342,
      })

      setLogs([
        {
          id: 'log_001',
          timestamp: '2024-01-15T10:35:22Z',
          level: 'info',
          category: 'auth',
          message: 'ユーザーがログインしました',
          userId: 'usr_123',
          userName: '山田 太郎',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          metadata: { method: 'email', sessionId: 'sess_abc123' },
        },
        {
          id: 'log_002',
          timestamp: '2024-01-15T10:30:15Z',
          level: 'warn',
          category: 'api',
          message: 'APIレート制限に近づいています',
          userId: 'usr_124',
          userName: '鈴木 花子',
          ip: '192.168.1.101',
          metadata: { endpoint: '/api/matching', remaining: 5, limit: 100 },
        },
        {
          id: 'log_003',
          timestamp: '2024-01-15T10:25:08Z',
          level: 'error',
          category: 'system',
          message: 'データベース接続エラーが発生しました',
          metadata: { error: 'Connection timeout', retryCount: 3, duration: '5.2s' },
        },
        {
          id: 'log_004',
          timestamp: '2024-01-15T10:20:00Z',
          level: 'info',
          category: 'billing',
          message: '新規サブスクリプションが作成されました',
          userId: 'usr_125',
          userName: '田中 一郎',
          metadata: { plan: 'Professional', amount: 19800, stripeId: 'sub_xyz789' },
        },
        {
          id: 'log_005',
          timestamp: '2024-01-15T10:15:45Z',
          level: 'info',
          category: 'user',
          message: 'ユーザープロフィールが更新されました',
          userId: 'usr_126',
          userName: '佐藤 美咲',
          ip: '192.168.1.102',
          metadata: { fields: ['displayName', 'company'] },
        },
        {
          id: 'log_006',
          timestamp: '2024-01-15T10:10:30Z',
          level: 'warn',
          category: 'auth',
          message: 'ログイン試行が失敗しました（パスワード不一致）',
          ip: '192.168.1.200',
          metadata: { email: 'unknown@example.com', attempts: 2 },
        },
        {
          id: 'log_007',
          timestamp: '2024-01-15T10:05:12Z',
          level: 'error',
          category: 'api',
          message: '外部APIへの接続に失敗しました',
          metadata: { service: 'SimilarWeb', statusCode: 503, duration: '30.1s' },
        },
        {
          id: 'log_008',
          timestamp: '2024-01-15T10:00:00Z',
          level: 'info',
          category: 'system',
          message: 'スケジュールタスクが正常に完了しました',
          metadata: { task: 'daily_report', duration: '12.5s', recordsProcessed: 1250 },
        },
      ])

      setTotalPages(15)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchLogs()
    setIsRefreshing(false)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return <Info style={{ width: 14, height: 14, color: '#3B82F6' }} />
      case 'warn':
        return <AlertTriangle style={{ width: 14, height: 14, color: '#F59E0B' }} />
      case 'error':
        return <AlertCircle style={{ width: 14, height: 14, color: '#EF4444' }} />
      case 'debug':
        return <CheckCircle style={{ width: 14, height: 14, color: '#6B7280' }} />
    }
  }

  const getLevelStyle = (level: LogEntry['level']) => {
    const styles = {
      info: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
      warn: { bg: 'rgba(245, 158, 11, 0.1)', text: '#D97706' },
      error: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' },
      debug: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6B7280' },
    }
    return styles[level]
  }

  const getCategoryLabel = (category: LogEntry['category']) => {
    const labels = {
      auth: '認証',
      api: 'API',
      system: 'システム',
      billing: '課金',
      user: 'ユーザー',
    }
    return labels[category]
  }

  const getCategoryIcon = (category: LogEntry['category']) => {
    switch (category) {
      case 'auth':
        return <User style={{ width: 12, height: 12 }} />
      case 'api':
        return <Globe style={{ width: 12, height: 12 }} />
      case 'system':
        return <Server style={{ width: 12, height: 12 }} />
      case 'billing':
        return <FileText style={{ width: 12, height: 12 }} />
      case 'user':
        return <User style={{ width: 12, height: 12 }} />
    }
  }

  return (
    <>
      {/* Header */}
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E4E4E7',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#18181B',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              システムログ
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
                fontWeight: 400,
              }}
            >
              アプリケーションのアクティビティログ
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#18181B',
                cursor: 'pointer',
                opacity: isRefreshing ? 0.6 : 1,
              }}
            >
              <RefreshCw
                style={{
                  width: 14,
                  height: 14,
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                }}
              />
              更新
            </button>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#18181B',
                cursor: 'pointer',
              }}
            >
              <Download style={{ width: 14, height: 14 }} />
              エクスポート
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <StatCard
            icon={<FileText style={{ width: 16, height: 16, color: '#7C3AED' }} />}
            iconBg="rgba(124, 58, 237, 0.1)"
            label="総ログ数"
            value={stats?.total.toLocaleString() || '-'}
          />
          <StatCard
            icon={<Info style={{ width: 16, height: 16, color: '#3B82F6' }} />}
            iconBg="rgba(59, 130, 246, 0.1)"
            label="Info"
            value={stats?.info.toLocaleString() || '-'}
          />
          <StatCard
            icon={<AlertTriangle style={{ width: 16, height: 16, color: '#F59E0B' }} />}
            iconBg="rgba(245, 158, 11, 0.1)"
            label="Warning"
            value={stats?.warn.toLocaleString() || '-'}
          />
          <StatCard
            icon={<AlertCircle style={{ width: 16, height: 16, color: '#EF4444' }} />}
            iconBg="rgba(239, 68, 68, 0.1)"
            label="Error"
            value={stats?.error.toLocaleString() || '-'}
          />
          <StatCard
            icon={<Clock style={{ width: 16, height: 16, color: '#0D9488' }} />}
            iconBg="rgba(13, 148, 136, 0.1)"
            label="本日"
            value={stats?.todayTotal.toLocaleString() || '-'}
          />
        </div>

        {/* Filters */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <div style={{ padding: '16px 20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 14,
                    height: 14,
                    color: '#A1A1AA',
                  }}
                />
                <input
                  type="text"
                  placeholder="メッセージ、ユーザー名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '6px',
                    border: '1px solid #E4E4E7',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Level Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter style={{ width: 14, height: 14, color: '#A1A1AA' }} />
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E4E4E7',
                    fontSize: '13px',
                    color: '#18181B',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">すべてのレベル</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                  <option value="debug">Debug</option>
                </select>
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E4E4E7',
                  fontSize: '13px',
                  color: '#18181B',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <option value="all">すべてのカテゴリ</option>
                <option value="auth">認証</option>
                <option value="api">API</option>
                <option value="system">システム</option>
                <option value="billing">課金</option>
                <option value="user">ユーザー</option>
              </select>

              {/* Date Range */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E4E4E7',
                  fontSize: '13px',
                  color: '#18181B',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <option value="1h">過去1時間</option>
                <option value="24h">過去24時間</option>
                <option value="7d">過去7日間</option>
                <option value="30d">過去30日間</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: '8px',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E4E4E7' }}>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                      width: '140px',
                    }}
                  >
                    日時
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                      width: '80px',
                    }}
                  >
                    レベル
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                      width: '100px',
                    }}
                  >
                    カテゴリ
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                    }}
                  >
                    メッセージ
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                      width: '120px',
                    }}
                  >
                    ユーザー
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>
                      <div style={{ color: '#A1A1AA', fontSize: '13px' }}>読み込み中...</div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>
                      <div style={{ color: '#A1A1AA', fontSize: '13px' }}>
                        ログが見つかりませんでした
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const levelStyle = getLevelStyle(log.level)
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        style={{
                          borderBottom: '1px solid #F4F4F5',
                          cursor: 'pointer',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#FAFAFA'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <td
                          style={{
                            padding: '12px 20px',
                            fontSize: '12px',
                            color: '#71717A',
                            fontFamily: 'monospace',
                          }}
                        >
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: levelStyle.bg,
                              color: levelStyle.text,
                              fontSize: '11px',
                              fontWeight: 500,
                              textTransform: 'uppercase',
                            }}
                          >
                            {getLevelIcon(log.level)}
                            {log.level}
                          </span>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              color: '#71717A',
                            }}
                          >
                            {getCategoryIcon(log.category)}
                            {getCategoryLabel(log.category)}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '12px 20px',
                            fontSize: '13px',
                            color: '#18181B',
                            maxWidth: '400px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {log.message}
                        </td>
                        <td
                          style={{
                            padding: '12px 20px',
                            fontSize: '12px',
                            color: '#71717A',
                          }}
                        >
                          {log.userName || '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #E4E4E7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '13px', color: '#71717A' }}>
                {totalPages}ページ中 {currentPage}ページ目
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E4E4E7',
                    background: '#FFFFFF',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  <ChevronLeft style={{ width: 16, height: 16, color: '#71717A' }} />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E4E4E7',
                    background: '#FFFFFF',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  <ChevronRight style={{ width: 16, height: 16, color: '#71717A' }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              margin: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E4E4E7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                ログ詳細
              </h2>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#A1A1AA',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Level & Category */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: getLevelStyle(selectedLog.level).bg,
                    color: getLevelStyle(selectedLog.level).text,
                    fontSize: '12px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                  }}
                >
                  {getLevelIcon(selectedLog.level)}
                  {selectedLog.level}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: '#F4F4F5',
                    color: '#71717A',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {getCategoryIcon(selectedLog.category)}
                  {getCategoryLabel(selectedLog.category)}
                </span>
              </div>

              {/* Message */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#71717A',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  メッセージ
                </label>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#18181B',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {selectedLog.message}
                </p>
              </div>

              {/* Details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '20px',
                }}
              >
                <DetailItem label="日時" value={formatTimestamp(selectedLog.timestamp)} />
                <DetailItem label="ログID" value={selectedLog.id} mono />
                {selectedLog.userName && (
                  <DetailItem label="ユーザー" value={selectedLog.userName} />
                )}
                {selectedLog.userId && (
                  <DetailItem label="ユーザーID" value={selectedLog.userId} mono />
                )}
                {selectedLog.ip && <DetailItem label="IPアドレス" value={selectedLog.ip} mono />}
              </div>

              {/* User Agent */}
              {selectedLog.userAgent && (
                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    User Agent
                  </label>
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#71717A',
                      margin: 0,
                      fontFamily: 'monospace',
                      background: '#FAFAFA',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      wordBreak: 'break-all',
                    }}
                  >
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#71717A',
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    メタデータ
                  </label>
                  <pre
                    style={{
                      fontSize: '12px',
                      margin: 0,
                      fontFamily: 'monospace',
                      background: '#1E1B4B',
                      color: '#E4E4E7',
                      padding: '12px 16px',
                      borderRadius: '6px',
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '8px',
        padding: '16px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '6px',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: '12px', color: '#71717A' }}>{label}</span>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 600, color: '#18181B' }}>{value}</div>
    </div>
  )
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <label
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: '#71717A',
          display: 'block',
          marginBottom: '4px',
        }}
      >
        {label}
      </label>
      <p
        style={{
          fontSize: '13px',
          color: '#18181B',
          margin: 0,
          fontFamily: mono ? 'monospace' : 'inherit',
        }}
      >
        {value}
      </p>
    </div>
  )
}
