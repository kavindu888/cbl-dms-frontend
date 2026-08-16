import { Pencil, Route, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'

const emptyForm = {
  code: '',
  name: '',
  description: '',
}

const pageSize = 8

function getErrorMessage(error, fallback = 'Something went wrong') {
  return error?.message || fallback
}

function buildPayload(form) {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim() || null,
  }
}

export default function DeliveryRunListPage() {
  const [runs, setRuns] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [editingRun, setEditingRun] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const activeOnly = statusFilter === 'Active'

  const filteredRuns = useMemo(() => {
    if (statusFilter !== 'Inactive') return runs
    return runs.filter((run) => !run.isActive)
  }, [runs, statusFilter])

  const loadRuns = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const result = await masterService.listDeliveryRuns({
        page,
        pageSize,
        search: search.trim() || undefined,
        activeOnly,
      })

      setRuns(result.items || [])
      setTotalItems(result.totalItems || 0)
      setTotalPages(Math.max(1, result.totalPages || 1))
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load delivery runs.'))
    } finally {
      setIsLoading(false)
    }
  }, [activeOnly, page, search])

  useEffect(() => {
    loadRuns()
  }, [loadRuns])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function resetForm() {
    setEditingRun(null)
    setForm(emptyForm)
  }

  function openEdit(run) {
    setEditingRun(run)
    setForm({
      code: run.code,
      name: run.name,
      description: run.description || '',
    })
  }

  async function handleSave(event) {
    event.preventDefault()

    const payload = buildPayload(form)
    if (!payload.code || !payload.name) {
      toast.error('Delivery run code and name are required.')
      return
    }

    setIsSaving(true)

    try {
      if (editingRun) {
        await masterService.updateDeliveryRun(editingRun.id, payload)
        toast.success('Delivery run updated.')
      } else {
        await masterService.createDeliveryRun(payload)
        toast.success('Delivery run created.')
      }

      await loadRuns()
      resetForm()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to save delivery run.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeactivate(run) {
    if (!run.isActive) return
    if (!(await window.confirm(`Deactivate ${run.name}?`))) return

    try {
      await masterService.deactivateDeliveryRun(run.id)
      toast.success('Delivery run deactivated.')
      await loadRuns()

      if (editingRun?.id === run.id) resetForm()
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Unable to deactivate delivery run.'))
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Delivery Runs
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage CBL delivery run names used for loading and invoice routing.
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
            placeholder="Search delivery runs..."
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
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-text-muted">
                      Loading delivery runs...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-danger">
                      {error}
                    </td>
                  </tr>
                ) : filteredRuns.length ? (
                  filteredRuns.map((run) => (
                    <tr key={run.id}>
                      <td>
                        <span
                          className="mono text-xs font-semibold"
                          style={{ color: 'var(--color-amber)' }}
                        >
                          {run.code}
                        </span>
                      </td>
                      <td
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {run.name}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {run.description || '-'}
                      </td>
                      <td>
                        <StatusBadge status={run.status} />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit delivery run"
                          style={{ width: 28, height: 28, marginRight: 6 }}
                          onClick={() => openEdit(run)}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Deactivate delivery run"
                          disabled={!run.isActive}
                          style={{ width: 28, height: 28, opacity: run.isActive ? 1 : 0.45 }}
                          onClick={() => handleDeactivate(run)}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-text-muted">
                      No delivery runs found.
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
              Showing {filteredRuns.length} of {totalItems} delivery runs
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
                {editingRun ? 'Edit Delivery Run' : 'Add New Delivery Run'}
              </p>
              {editingRun ? (
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
              Use the same run codes that appear on CBL bill copies.
            </p>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              RUN CODE
            </label>
            <div style={{ position: 'relative' }}>
              <Route
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: 'var(--color-amber)',
                  pointerEvents: 'none',
                }}
              />
              <input
                autoFocus
                className="form-input"
                placeholder="e.g. RATHNAPURA2-A"
                value={form.code}
                maxLength={30}
                onChange={(event) => updateField('code', event.target.value)}
                style={{ height: 38, paddingLeft: 36 }}
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              RUN NAME
            </label>
            <input
              className="form-input"
              placeholder="e.g. Rathnapura2 - A"
              value={form.name}
              maxLength={100}
              onChange={(event) => updateField('name', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              DESCRIPTION
            </label>
            <textarea
              className="form-input"
              placeholder="Optional notes"
              value={form.description}
              maxLength={500}
              onChange={(event) => updateField('description', event.target.value)}
              style={{ minHeight: 96, resize: 'vertical' }}
            />
          </div>

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
              {isSaving ? 'Saving...' : editingRun ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
