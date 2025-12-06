'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Shield,
  CreditCard,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react'

/**
 * SC-902: ユーザー管理画面
 *
 * 機能:
 * - ユーザー一覧表示（ページネーション付き）
 * - 検索・フィルター
 * - 新規ユーザー招待
 * - ロール・プラン変更
 */

// ロール: admin=システム管理者, internal=社内/法人ユーザー, user=外部個人ユーザー
type UserRole = 'admin' | 'internal' | 'user'
// プラン: medica=社内, enterprise=法人契約, trial=14日間無料, starter/professional=有料プラン
type PlanType = 'medica' | 'enterprise' | 'trial' | 'starter' | 'professional'

interface User {
  id: string
  email: string
  company_name: string | null
  role: UserRole
  plan: PlanType
  trial_ends_at: string | null
  monthly_analysis_count: number
  monthly_analysis_limit: number
  created_at: string
  last_login_at: string | null
}

type RoleFilter = 'all' | UserRole
type PlanFilter = 'all' | PlanType

// ロールとプランの組み合わせ制約
const VALID_PLANS_FOR_ROLE: Record<UserRole, PlanType[]> = {
  admin: ['medica', 'enterprise', 'trial', 'starter', 'professional'], // 任意
  internal: ['medica', 'enterprise'],
  user: ['trial', 'starter', 'professional'],
}

const ITEMS_PER_PAGE = 10

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Invite modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('internal')
  const [invitePlan, setInvitePlan] = useState<PlanType>('medica')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Edit modal
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('user')
  const [editPlan, setEditPlan] = useState<PlanType>('trial')
  const [editLoading, setEditLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(planFilter !== 'all' && { plan: planFilter }),
      })

      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()

      if (data.success) {
        setUsers(data.data.users)
        setTotalCount(data.data.total)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, roleFilter, planFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleInvite = async () => {
    if (!inviteEmail) return

    setInviteLoading(true)
    setInviteError(null)

    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          plan: invitePlan,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setInviteSuccess(true)
        setTimeout(() => {
          setIsInviteModalOpen(false)
          setInviteEmail('')
          setInviteRole('internal')
          setInvitePlan('medica')
          setInviteSuccess(false)
          fetchUsers()
        }, 1500)
      } else {
        setInviteError(data.error?.message || '招待に失敗しました')
      }
    } catch {
      setInviteError('通信エラーが発生しました')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleEditUser = async () => {
    if (!editingUser) return

    setEditLoading(true)

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
        setEditingUser(null)
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    } finally {
      setEditLoading(false)
    }
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setEditRole(user.role)
    setEditPlan(user.plan)
  }

  // ロール変更時にプランを自動調整
  const handleRoleChange = (newRole: UserRole, isInvite: boolean) => {
    if (isInvite) {
      setInviteRole(newRole)
      const validPlans = VALID_PLANS_FOR_ROLE[newRole]
      if (!validPlans.includes(invitePlan)) {
        setInvitePlan(validPlans[0])
      }
    } else {
      setEditRole(newRole)
      const validPlans = VALID_PLANS_FOR_ROLE[newRole]
      if (!validPlans.includes(editPlan)) {
        setEditPlan(validPlans[0])
      }
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', bg: '#FEE2E2', color: '#991B1B' }
      case 'internal':
        return { label: 'Internal', bg: '#EDE9FE', color: '#6D28D9' }
      default:
        return { label: 'User', bg: '#E4E4E7', color: '#52525B' }
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'medica':
        return { label: 'Medica', bg: '#EDE9FE', color: '#6D28D9' }
      case 'enterprise':
        return { label: 'Enterprise', bg: '#FEF3C7', color: '#92400E' }
      case 'professional':
        return { label: 'Professional', bg: '#DBEAFE', color: '#1E40AF' }
      case 'starter':
        return { label: 'Starter', bg: '#D1FAE5', color: '#065F46' }
      default: // trial
        return { label: 'Trial', bg: '#F4F4F5', color: '#71717A' }
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
              ユーザー管理
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
                fontWeight: 400,
              }}
            >
              ユーザーの招待・ロール・プラン管理
            </p>
          </div>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#7C3AED',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus className="h-4 w-4" />
            新規ユーザーを招待
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
            <Search
              className="h-4 w-4"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#A1A1AA',
              }}
            />
            <input
              type="text"
              placeholder="メールアドレスまたは会社名で検索"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as RoleFilter)
              setCurrentPage(1)
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #E4E4E7',
              borderRadius: '6px',
              fontSize: '13px',
              background: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="all">すべてのロール</option>
            <option value="admin">Admin</option>
            <option value="internal">Internal</option>
            <option value="user">User</option>
          </select>

          {/* Plan filter */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value as PlanFilter)
              setCurrentPage(1)
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #E4E4E7',
              borderRadius: '6px',
              fontSize: '13px',
              background: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="all">すべてのプラン</option>
            <option value="medica">Medica</option>
            <option value="enterprise">Enterprise</option>
            <option value="trial">Trial</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
          </select>
        </div>

        {/* Table */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E4E4E7', background: '#FAFAFA' }}>
                <th style={{ ...thStyle, width: '30%' }}>ユーザー</th>
                <th style={{ ...thStyle, width: '15%' }}>ロール</th>
                <th style={{ ...thStyle, width: '15%' }}>プラン</th>
                <th style={{ ...thStyle, width: '15%' }}>利用状況</th>
                <th style={{ ...thStyle, width: '15%' }}>最終ログイン</th>
                <th style={{ ...thStyle, width: '10%' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center' }}>
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: '#A1A1AA' }} />
                    <p style={{ marginTop: '8px', color: '#A1A1AA', fontSize: '13px' }}>読み込み中...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#A1A1AA' }}>
                    ユーザーが見つかりません
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const roleBadge = getRoleBadge(user.role)
                  const planBadge = getPlanBadge(user.plan)

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid #F4F4F5' }}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#EDE9FE',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#7C3AED',
                              fontSize: '14px',
                              fontWeight: 500,
                            }}
                          >
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>
                              {user.company_name || user.email.split('@')[0]}
                            </div>
                            <div style={{ fontSize: '12px', color: '#A1A1AA' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                            background: roleBadge.bg,
                            color: roleBadge.color,
                          }}
                        >
                          <Shield className="h-3 w-3" />
                          {roleBadge.label}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                            background: planBadge.bg,
                            color: planBadge.color,
                          }}
                        >
                          <CreditCard className="h-3 w-3" />
                          {planBadge.label}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: '13px', color: '#18181B' }}>
                          {user.monthly_analysis_count} / {user.monthly_analysis_limit === -1 ? '∞' : user.monthly_analysis_limit}
                        </div>
                        <div style={{ fontSize: '11px', color: '#A1A1AA' }}>今月の分析</div>
                      </td>
                      <td style={tdStyle}>
                        {user.last_login_at ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#A1A1AA' }}>
                            <Clock className="h-3 w-3" />
                            <span style={{ fontSize: '12px' }}>
                              {new Date(user.last_login_at).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#D4D4D8' }}>未ログイン</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => openEditModal(user)}
                          style={{
                            padding: '6px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: '#A1A1AA',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F4F4F5'
                            e.currentTarget.style.color = '#18181B'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = '#A1A1AA'
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: '1px solid #E4E4E7',
                background: '#FAFAFA',
              }}
            >
              <span style={{ fontSize: '12px', color: '#A1A1AA' }}>
                {totalCount}件中 {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}件を表示
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    ...paginationButtonStyle,
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span style={{ fontSize: '13px', color: '#18181B', padding: '0 8px' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    ...paginationButtonStyle,
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div
          onClick={() => setIsInviteModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid #E4E4E7',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: '#EDE9FE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Mail className="h-5 w-5" style={{ color: '#7C3AED' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                    新規ユーザーを招待
                  </h2>
                  <p style={{ fontSize: '12px', color: '#A1A1AA', margin: 0 }}>
                    メールで招待を送信します
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#A1A1AA',
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {inviteSuccess ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '24px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#D1FAE5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <Check className="h-6 w-6" style={{ color: '#10B981' }} />
                  </div>
                  <p style={{ fontSize: '14px', color: '#18181B', fontWeight: 500 }}>
                    招待メールを送信しました
                  </p>
                </div>
              ) : (
                <>
                  {inviteError && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px',
                        background: '#FEF2F2',
                        border: '1px solid #FEE2E2',
                        borderRadius: '6px',
                        marginBottom: '16px',
                      }}
                    >
                      <AlertCircle className="h-4 w-4" style={{ color: '#EF4444' }} />
                      <span style={{ fontSize: '13px', color: '#991B1B' }}>{inviteError}</span>
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #E4E4E7',
                        borderRadius: '6px',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                        ロール
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => handleRoleChange(e.target.value as UserRole, true)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '6px',
                          fontSize: '13px',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="admin">Admin</option>
                        <option value="internal">Internal</option>
                        <option value="user">User</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                        プラン
                      </label>
                      <select
                        value={invitePlan}
                        onChange={(e) => setInvitePlan(e.target.value as PlanType)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '6px',
                          fontSize: '13px',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        {VALID_PLANS_FOR_ROLE[inviteRole].map((plan) => (
                          <option key={plan} value={plan}>
                            {plan === 'medica' ? 'Medica' : plan === 'enterprise' ? 'Enterprise' : plan === 'trial' ? 'Trial' : plan === 'starter' ? 'Starter' : 'Professional'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!inviteSuccess && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  padding: '16px 24px',
                  borderTop: '1px solid #E4E4E7',
                  background: '#FAFAFA',
                }}
              >
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#52525B',
                    cursor: 'pointer',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail || inviteLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: '#7C3AED',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#FFFFFF',
                    cursor: inviteLoading || !inviteEmail ? 'not-allowed' : 'pointer',
                    opacity: inviteLoading || !inviteEmail ? 0.7 : 1,
                  }}
                >
                  {inviteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  招待を送信
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div
          onClick={() => setEditingUser(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid #E4E4E7',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                ユーザー編集
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#A1A1AA',
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #E4E4E7',
                    borderRadius: '6px',
                    fontSize: '13px',
                    background: '#F4F4F5',
                    color: '#A1A1AA',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                    ロール
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole, false)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E4E4E7',
                      borderRadius: '6px',
                      fontSize: '13px',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="admin">Admin</option>
                    <option value="internal">Internal</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                    プラン
                  </label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value as PlanType)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E4E4E7',
                      borderRadius: '6px',
                      fontSize: '13px',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    {VALID_PLANS_FOR_ROLE[editRole].map((plan) => (
                      <option key={plan} value={plan}>
                        {plan === 'medica' ? 'Medica' : plan === 'enterprise' ? 'Enterprise' : plan === 'trial' ? 'Trial' : plan === 'starter' ? 'Starter' : 'Professional'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 24px',
                borderTop: '1px solid #E4E4E7',
                background: '#FAFAFA',
              }}
            >
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  padding: '8px 16px',
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#52525B',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleEditUser}
                disabled={editLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#7C3AED',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#FFFFFF',
                  cursor: editLoading ? 'not-allowed' : 'pointer',
                  opacity: editLoading ? 0.7 : 1,
                }}
              >
                {editLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#52525B',
  textAlign: 'left',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
}

const paginationButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  background: '#FFFFFF',
  border: '1px solid #E4E4E7',
  borderRadius: '6px',
  color: '#52525B',
}
