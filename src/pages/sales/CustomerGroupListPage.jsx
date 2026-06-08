import { Pencil, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { salesService } from '@services/api/salesService'

const emptyForm = {
  code: '',
  name: '',
  defaultCreditDays: '0',
  defaultCreditLimit: '0',
}

const pageSize = 8

function getErrorMessage(error, fallback = 'Something went wrong') {
  return error?.message || fallback
}

function toGroupCode(value) {
  return value.trim().toUpperCase()
}

function toNumber(value) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function buildPayload(form) {
  return {
    code: toGroupCode(form.code),
    name: form.name.trim(),
    defaultCreditDays: Math.max(0, Math.trunc(toNumber(form.defaultCreditDays))),
    defaultCreditLimit: Math.max(0, toNumber(form.defaultCreditLimit)),
  }
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function CustomerGroupListPage() {
  const [groups, setGroups] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [editingGroup, setEditingGroup] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const filteredGroups = useMemo(() => {
    if (statusFilter === 'All') return groups

    return groups.filter((group) => (statusFilter === 'Active' ? group.isActive : !group.isActive))
  }, [groups, statusFilter])

  const loadGroups = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const result = await salesService.listCustomerGroups({
        page,
        pageSize,
        search: search.trim() || undefined,
      })

      setGroups(result.items || [])
      setTotalItems(result.totalItems || 0)
      setTotalPages(Math.max(1, result.totalPages || 1))
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load customer groups.'))
    } finally {
      setIsLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function resetForm() {
    setEditingGroup(null)
    setForm(emptyForm)
  }

  function openEdit(group) {
    setEditingGroup(group)
    setForm({
      code: group.code,
      name: group.name,
      defaultCreditDays: String(group.defaultCreditDays),
      defaultCreditLimit: String(group.defaultCreditLimit),
    })
  }

  async function handleSave(event) {
    event.preventDefault()

    const payload = buildPayload(form)
    if (!payload.code || !payload.name) {
      toast.error('Group code and name are required.')
      return
    }

    setIsSaving(true)

    try {
      if (editingGroup) {
        await salesService.updateCustomerGroup(editingGroup.id, payload)
        toast.success('Customer group updated.')
      } else {
        await salesService.createCustomerGroup(payload)
        toast.success('Customer group created.')
      }

      await loadGroups()
      resetForm()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to save customer group.'))
    } finally {
      setIsSaving(false)
    }
  }

  function handleFormKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) return

    const target = event.target
    if (target.tagName === 'BUTTON') return

    event.preventDefault()

    const focusable = Array.from(
      event.currentTarget.querySelectorAll(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]):not([data-skip-focus="true"])'
      )
    )
    const currentIndex = focusable.indexOf(target)

    if (currentIndex > -1 && currentIndex < focusable.length - 1) {
      focusable[currentIndex + 1].focus()
    }
  }

  async function handleDeactivate(group) {
    if (!group.isActive) return
    if (!window.confirm(`Deactivate ${group.name}?`)) return

    try {
      await salesService.deactivateCustomerGroup(group.id)
      toast.success('Customer group deactivated.')
      await loadGroups()

      if (editingGroup?.id === group.id) {
        resetForm()
      }
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Unable to deactivate customer group.'))
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            Customer Groups
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage customer credit defaults for the current organisation.
          </p>
        </div>
      </div>

      <div
        className="panel"
        style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 160px', gap: 16 }}
      >
        <div style={{ position: 'relative' }}>
          <Search
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              color: 'var(--color-text-dim)',
            }}
          />
          <input
            className="form-input"
            placeholder="Search customer groups..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: '100%', height: 40, paddingLeft: 36 }}
          />
        </div>

        <select
          className="form-input"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{ height: 40 }}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 16,
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          className="panel"
          style={{
            padding: '14px 16px',
            display: 'grid',
            gridTemplateRows: 'minmax(0, 1fr) auto',
            minHeight: 0,
          }}
        >
          <div className="overflow-x-auto" style={{ minHeight: 0, overflowY: 'hidden' }}>
            <table className="data-table master-table-compact">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Credit Days</th>
                  <th>Credit Limit</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                      Loading customer groups...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-danger">
                      {error}
                    </td>
                  </tr>
                ) : filteredGroups.length ? (
                  filteredGroups.map((group) => (
                    <tr key={group.id}>
                      <td>
                        <span
                          className="mono text-xs font-semibold"
                          style={{ color: 'var(--color-amber)' }}
                        >
                          {group.code}
                        </span>
                      </td>
                      <td
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {group.name}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {group.defaultCreditDays}
                      </td>
                      <td className="text-sm mono" style={{ color: 'var(--color-text-muted)' }}>
                        {formatMoney(group.defaultCreditLimit)}
                      </td>
                      <td>
                        <StatusBadge status={group.status} />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit customer group"
                          style={{ width: 28, height: 28, marginRight: 6 }}
                          onClick={() => openEdit(group)}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Deactivate customer group"
                          disabled={!group.isActive}
                          style={{ width: 28, height: 28, opacity: group.isActive ? 1 : 0.45 }}
                          onClick={() => handleDeactivate(group)}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                      No customer groups found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              paddingTop: 10,
              borderTop: '1px solid var(--color-border)',
              marginTop: 10,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
              Showing {filteredGroups.length} of {totalItems} groups
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className="button-secondary"
                disabled={page <= 1}
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                style={{ height: 32, padding: '0 12px', fontSize: 12 }}
              >
                Previous
              </button>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="button-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                style={{ height: 32, padding: '0 12px', fontSize: 12 }}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          onKeyDown={handleFormKeyDown}
          className="panel"
          style={{
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 650, color: 'var(--color-text-primary)' }}>
                {editingGroup ? 'Edit Customer Group' : 'Add New Customer Group'}
              </p>
              {editingGroup ? (
                <button
                  type="button"
                  className="button-ghost"
                  onClick={resetForm}
                  style={{ padding: '5px 10px', height: 'auto', fontSize: 12 }}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <p style={{ marginTop: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Organisation is taken from the signed-in user token.
            </p>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              GROUP CODE
            </label>
            <input
              autoFocus
              className="form-input"
              placeholder="e.g. RETAIL"
              value={form.code}
              maxLength={20}
              onChange={(event) => updateField('code', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              GROUP NAME
            </label>
            <input
              className="form-input"
              placeholder="e.g. Retail Customers"
              value={form.name}
              maxLength={100}
              onChange={(event) => updateField('name', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              DEFAULT CREDIT DAYS
            </label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="1"
              value={form.defaultCreditDays}
              onChange={(event) => updateField('defaultCreditDays', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              DEFAULT CREDIT LIMIT
            </label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              value={form.defaultCreditLimit}
              onChange={(event) => updateField('defaultCreditLimit', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          {editingGroup ? (
            <p
              style={{
                padding: '9px 10px',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.08)',
                fontSize: 12,
                color: 'var(--color-text-muted)',
                lineHeight: 1.45,
              }}
            >
              This backend provides deactivate only. Inactive groups cannot be reactivated here.
            </p>
          ) : null}

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: 'flex',
              gap: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <button
              type="button"
              data-skip-focus="true"
              className="button-ghost"
              onClick={resetForm}
              style={{ flex: 1, height: 38, fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button-primary"
              disabled={isSaving}
              style={{ flex: 1, height: 38, fontSize: 13 }}
            >
              {isSaving ? 'Saving...' : editingGroup ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
