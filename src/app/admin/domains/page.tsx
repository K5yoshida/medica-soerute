'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  Plus,
  Globe,
  Building,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Check,
  AlertCircle,
  Trash2,
  Edit2,
} from 'lucide-react'

/**
 * SC-903: ドメイン管理画面
 *
 * 機能:
 * - 許可ドメイン一覧表示（ページネーション付き）
 * - 検索・フィルター
 * - 新規ドメイン追加
 * - ドメイン編集・削除
 */

type DomainPlan = 'medica' | 'enterprise'

interface AllowedDomain {
  id: string
  domain: string
  plan: DomainPlan
  organization_name: string | null
  max_users: number | null
  created_at: string
  updated_at: string
}

type PlanFilter = 'all' | DomainPlan

const ITEMS_PER_PAGE = 10

export default function DomainsPage() {
  const [domains, setDomains] = useState<AllowedDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Add modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addDomain, setAddDomain] = useState('')
  const [addPlan, setAddPlan] = useState<DomainPlan>('enterprise')
  const [addOrgName, setAddOrgName] = useState('')
  const [addMaxUsers, setAddMaxUsers] = useState<string>('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)

  // Edit modal
  const [editingDomain, setEditingDomain] = useState<AllowedDomain | null>(null)
  const [editPlan, setEditPlan] = useState<DomainPlan>('enterprise')
  const [editOrgName, setEditOrgName] = useState('')
  const [editMaxUsers, setEditMaxUsers] = useState<string>('')
  const [editLoading, setEditLoading] = useState(false)

  // Delete confirmation
  const [deletingDomain, setDeletingDomain] = useState<AllowedDomain | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchDomains = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(planFilter !== 'all' && { plan: planFilter }),
      })

      const res = await fetch(`/api/admin/domains?${params}`)
      const data = await res.json()

      if (data.success) {
        setDomains(data.data.domains)
        setTotalCount(data.data.total)
      }
    } catch (error) {
      console.error('Failed to fetch domains:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, planFilter])

  useEffect(() => {
    fetchDomains()
  }, [fetchDomains])

  const handleAdd = async () => {
    if (!addDomain) return

    setAddLoading(true)
    setAddError(null)

    try {
      const res = await fetch('/api/admin/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: addDomain,
          plan: addPlan,
          organization_name: addOrgName || null,
          max_users: addMaxUsers ? parseInt(addMaxUsers) : null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setAddSuccess(true)
        setTimeout(() => {
          setIsAddModalOpen(false)
          setAddDomain('')
          setAddPlan('enterprise')
          setAddOrgName('')
          setAddMaxUsers('')
          setAddSuccess(false)
          fetchDomains()
        }, 1500)
      } else {
        setAddError(data.error?.message || 'ドメインの追加に失敗しました')
      }
    } catch {
      setAddError('通信エラーが発生しました')
    } finally {
      setAddLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!editingDomain) return

    setEditLoading(true)

    try {
      const res = await fetch(`/api/admin/domains/${editingDomain.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: editPlan,
          organization_name: editOrgName || null,
          max_users: editMaxUsers ? parseInt(editMaxUsers) : null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setEditingDomain(null)
        fetchDomains()
      }
    } catch (error) {
      console.error('Failed to update domain:', error)
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingDomain) return

    setDeleteLoading(true)

    try {
      const res = await fetch(`/api/admin/domains/${deletingDomain.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (data.success) {
        setDeletingDomain(null)
        fetchDomains()
      }
    } catch (error) {
      console.error('Failed to delete domain:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  const openEditModal = (domain: AllowedDomain) => {
    setEditingDomain(domain)
    setEditPlan(domain.plan)
    setEditOrgName(domain.organization_name || '')
    setEditMaxUsers(domain.max_users?.toString() || '')
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'medica':
        return { label: 'Medica', bg: '#EDE9FE', color: '#6D28D9' }
      case 'enterprise':
        return { label: 'Enterprise', bg: '#FEF3C7', color: '#92400E' }
      default:
        return { label: plan, bg: '#F4F4F5', color: '#71717A' }
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
              ドメイン管理
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#A1A1AA',
                marginTop: '2px',
                fontWeight: 400,
              }}
            >
              許可ドメインの登録・編集・削除
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
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
            ドメインを追加
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
              placeholder="ドメインまたは組織名で検索"
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
                <th style={{ ...thStyle, width: '30%' }}>ドメイン</th>
                <th style={{ ...thStyle, width: '20%' }}>組織名</th>
                <th style={{ ...thStyle, width: '15%' }}>プラン</th>
                <th style={{ ...thStyle, width: '15%' }}>ユーザー上限</th>
                <th style={{ ...thStyle, width: '10%' }}>登録日</th>
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
              ) : domains.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#A1A1AA' }}>
                    ドメインが見つかりません
                  </td>
                </tr>
              ) : (
                domains.map((domain) => {
                  const planBadge = getPlanBadge(domain.plan)

                  return (
                    <tr key={domain.id} style={{ borderBottom: '1px solid #F4F4F5' }}>
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
                            }}
                          >
                            <Globe className="h-4 w-4" />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: '#18181B' }}>
                              {domain.domain}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {domain.organization_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building className="h-3.5 w-3.5" style={{ color: '#A1A1AA' }} />
                            <span style={{ fontSize: '13px', color: '#18181B' }}>
                              {domain.organization_name}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#D4D4D8' }}>未設定</span>
                        )}
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
                          {planBadge.label}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {domain.max_users ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#18181B' }}>
                            <Users className="h-3.5 w-3.5" style={{ color: '#A1A1AA' }} />
                            <span style={{ fontSize: '13px' }}>{domain.max_users}人</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#D4D4D8' }}>無制限</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '12px', color: '#A1A1AA' }}>
                          {new Date(domain.created_at).toLocaleDateString('ja-JP')}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => openEditModal(domain)}
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
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingDomain(domain)}
                            style={{
                              padding: '6px',
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: '#A1A1AA',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#FEF2F2'
                              e.currentTarget.style.color = '#EF4444'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.color = '#A1A1AA'
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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

      {/* Add Modal */}
      {isAddModalOpen && (
        <div
          onClick={() => setIsAddModalOpen(false)}
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
                  <Globe className="h-5 w-5" style={{ color: '#7C3AED' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                    ドメインを追加
                  </h2>
                  <p style={{ fontSize: '12px', color: '#A1A1AA', margin: 0 }}>
                    新しい許可ドメインを登録します
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
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
              {addSuccess ? (
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
                    ドメインを追加しました
                  </p>
                </div>
              ) : (
                <>
                  {addError && (
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
                      <span style={{ fontSize: '13px', color: '#991B1B' }}>{addError}</span>
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                      ドメイン <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={addDomain}
                      onChange={(e) => setAddDomain(e.target.value)}
                      placeholder="example.co.jp"
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

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                      組織名
                    </label>
                    <input
                      type="text"
                      value={addOrgName}
                      onChange={(e) => setAddOrgName(e.target.value)}
                      placeholder="株式会社サンプル"
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
                        プラン
                      </label>
                      <select
                        value={addPlan}
                        onChange={(e) => setAddPlan(e.target.value as DomainPlan)}
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
                        <option value="medica">Medica</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                        ユーザー上限
                      </label>
                      <input
                        type="number"
                        value={addMaxUsers}
                        onChange={(e) => setAddMaxUsers(e.target.value)}
                        placeholder="無制限"
                        min="1"
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
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!addSuccess && (
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
                  onClick={() => setIsAddModalOpen(false)}
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
                  onClick={handleAdd}
                  disabled={!addDomain || addLoading}
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
                    cursor: addLoading || !addDomain ? 'not-allowed' : 'pointer',
                    opacity: addLoading || !addDomain ? 0.7 : 1,
                  }}
                >
                  {addLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  追加
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingDomain && (
        <div
          onClick={() => setEditingDomain(null)}
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
                ドメインを編集
              </h2>
              <button
                onClick={() => setEditingDomain(null)}
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
                  ドメイン
                </label>
                <input
                  type="text"
                  value={editingDomain.domain}
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                  組織名
                </label>
                <input
                  type="text"
                  value={editOrgName}
                  onChange={(e) => setEditOrgName(e.target.value)}
                  placeholder="株式会社サンプル"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                    プラン
                  </label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value as DomainPlan)}
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
                    <option value="medica">Medica</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525B', marginBottom: '6px' }}>
                    ユーザー上限
                  </label>
                  <input
                    type="number"
                    value={editMaxUsers}
                    onChange={(e) => setEditMaxUsers(e.target.value)}
                    placeholder="無制限"
                    min="1"
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
                onClick={() => setEditingDomain(null)}
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
                onClick={handleEdit}
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

      {/* Delete Confirmation Modal */}
      {deletingDomain && (
        <div
          onClick={() => setDeletingDomain(null)}
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
              maxWidth: '400px',
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
                    background: '#FEF2F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 className="h-5 w-5" style={{ color: '#EF4444' }} />
                </div>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', margin: 0 }}>
                  ドメインを削除
                </h2>
              </div>
              <button
                onClick={() => setDeletingDomain(null)}
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
              <p style={{ fontSize: '13px', color: '#52525B', margin: 0 }}>
                <strong style={{ color: '#18181B' }}>{deletingDomain.domain}</strong> を削除しますか？
              </p>
              <p style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '8px' }}>
                このドメインのユーザーは新規登録時に内部ユーザーとして認識されなくなります。
              </p>
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
                onClick={() => setDeletingDomain(null)}
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
                onClick={handleDelete}
                disabled={deleteLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#EF4444',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#FFFFFF',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  opacity: deleteLoading ? 0.7 : 1,
                }}
              >
                {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                削除
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
