'use client'

/**
 * SC-902: ユーザー管理画面
 * 設計書: 09_画面一覧.md
 * パス: /admin/users
 * 認証: Admin権限必須
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Filter,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Shield,
  CreditCard,
} from 'lucide-react'

// ===== 設定 =====
// 設計書 12_DB一覧.md に準拠した正式な値

const ROLE_CONFIG = {
  admin: { label: '管理者', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  internal: { label: '社内ユーザー', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  user: { label: '一般ユーザー', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
} as const

const PLAN_CONFIG = {
  medica: { label: 'Medica', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  enterprise: { label: 'Enterprise', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  trial: { label: 'Trial', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)' },
  starter: { label: 'Starter', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
  professional: { label: 'Professional', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
} as const

type UserRole = keyof typeof ROLE_CONFIG
type PlanType = keyof typeof PLAN_CONFIG

interface User {
  id: string
  email: string
  company_name: string | null
  role: UserRole
  plan: PlanType
  monthly_analysis_count: number
  monthly_analysis_limit: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

interface Pagination {
  current_page: number
  per_page: number
  total_pages: number
  total_count: number
}

// ===== ユーティリティ関数 =====

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// ===== メインコンポーネント =====

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)

  // フィルター状態
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const perPage = 20

  // 検索実行（デバウンス用）
  const [searchTerm, setSearchTerm] = useState('')

  // 編集モーダル状態
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('user')
  const [editPlan, setEditPlan] = useState<PlanType>('trial')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // データ取得
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      })
      if (searchTerm) params.set('q', searchTerm)
      if (roleFilter !== 'all') params.set('role', roleFilter)
      if (planFilter !== 'all') params.set('plan', planFilter)

      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      if (data.success) {
        setUsers(data.data.users)
        setPagination(data.data.pagination)
      } else {
        console.error('Failed to fetch users:', data.error?.message)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm, roleFilter, planFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // 検索デバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // 編集モーダルを開く
  const openEditModal = (user: User) => {
    setEditingUser(user)
    setEditRole(user.role)
    setEditPlan(user.plan)
    setSaveError(null)
  }

  // 編集モーダルを閉じる
  const closeEditModal = () => {
    setEditingUser(null)
    setSaveError(null)
  }

  // ユーザー更新
  const handleSave = async () => {
    if (!editingUser) return

    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          plan: editPlan,
        }),
      })
      const data = await res.json()
      if (data.success) {
        closeEditModal()
        fetchUsers()
      } else {
        setSaveError(data.error?.message || '更新に失敗しました')
      }
    } catch (error) {
      console.error('Failed to update user:', error)
      setSaveError('更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // ページ変更
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo(0, 0)
  }

  // 統計計算
  const stats = {
    total: pagination?.total_count || 0,
    admins: users.filter(u => u.role === 'admin' || u.role === 'internal').length,
    premium: users.filter(u => u.plan === 'enterprise' || u.plan === 'professional' || u.plan === 'medica').length,
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
          ユーザー管理
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          登録ユーザーの一覧表示・ロール・プラン管理
        </p>
      </div>

      {/* 統計カード */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', padding: '8px' }}>
              <Users size={20} color="#3B82F6" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>総ユーザー数</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>{stats.total}</div>
            </div>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', padding: '8px' }}>
              <Shield size={20} color="#10B981" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>管理者</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>{stats.admins}</div>
            </div>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', padding: '8px' }}>
              <CreditCard size={20} color="#F59E0B" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>有料プラン</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>{stats.premium}</div>
            </div>
          </div>
        </div>
      </div>

      {/* フィルターバー */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        border: '1px solid #E5E7EB',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {/* 検索 */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="メールアドレス・会社名で検索..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* ロールフィルター */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="#6B7280" />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            style={{
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            <option value="all">全ロール</option>
            {Object.entries(ROLE_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
        </div>

        {/* プランフィルター */}
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
          style={{
            padding: '8px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '14px',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          <option value="all">全プラン</option>
          {Object.entries(PLAN_CONFIG).map(([value, config]) => (
            <option key={value} value={value}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* ユーザーテーブル */}
      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <Loader2 size={32} color="#6B7280" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '12px', color: '#6B7280' }}>読み込み中...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
            ユーザーが見つかりません
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>メールアドレス</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>会社名</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>ロール</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>プラン</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>分析利用</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>登録日</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.user
                const planConfig = PLAN_CONFIG[user.plan] || PLAN_CONFIG.trial
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280' }}>
                      {user.company_name || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: roleConfig.color,
                        background: roleConfig.bg,
                      }}>
                        {roleConfig.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: planConfig.color,
                        background: planConfig.bg,
                      }}>
                        {planConfig.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280' }}>
                      {user.monthly_analysis_count} / {user.monthly_analysis_limit}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280' }}>
                      {formatDate(user.created_at)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => openEditModal(user)}
                        style={{
                          padding: '6px',
                          border: 'none',
                          borderRadius: '4px',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#6B7280',
                        }}
                        title="編集"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* ページネーション */}
        {pagination && pagination.total_pages > 1 && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>
              {pagination.total_count}件中 {(page - 1) * perPage + 1}-{Math.min(page * perPage, pagination.total_count)}件表示
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ChevronLeft size={16} />
                前へ
              </button>
              <span style={{ fontSize: '14px', color: '#374151' }}>
                {page} / {pagination.total_pages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === pagination.total_pages}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: page === pagination.total_pages ? 'not-allowed' : 'pointer',
                  opacity: page === pagination.total_pages ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                次へ
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '480px',
            margin: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>ユーザー編集</h2>
              <button
                onClick={closeEditModal}
                style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={20} color="#6B7280" />
              </button>
            </div>

            {/* メールアドレス（読み取り専用） */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                メールアドレス
              </label>
              <input
                type="text"
                value={editingUser.email}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: '#F9FAFB',
                  color: '#6B7280',
                }}
              />
            </div>

            {/* 会社名（メールドメインから自動取得、読み取り専用） */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                会社名
              </label>
              <input
                type="text"
                value={editingUser.company_name || '（未設定）'}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: '#F9FAFB',
                  color: '#6B7280',
                }}
              />
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                メールドメインに基づいて自動設定されます
              </p>
            </div>

            {/* ロール */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                ロール
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer',
                }}
              >
                {Object.entries(ROLE_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* プラン */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                プラン
              </label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value as PlanType)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer',
                }}
              >
                {Object.entries(PLAN_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* エラーメッセージ */}
            {saveError && (
              <div style={{
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '6px',
                marginBottom: '16px',
                color: '#DC2626',
                fontSize: '14px',
              }}>
                {saveError}
              </div>
            )}

            {/* ボタン */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeEditModal}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  background: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#3B82F6',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for spinner animation */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
