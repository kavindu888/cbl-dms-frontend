import { MapPinned, Pencil, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'

const emptyForm = {
  code: '',
  name: '',
  defaultEmployeeId: '',
}

const pageSize = 10

function getErrorMessage(error, fallback = 'Something went wrong') {
  return error?.message || fallback
}

function toRouteCode(value) {
  return value.trim().toUpperCase()
}

function buildPayload(form) {
  return {
    code: toRouteCode(form.code),
    name: form.name.trim(),
    defaultEmployeeId: form.defaultEmployeeId.trim() || null,
  }
}

export default function SalesRouteListPage() {
  const [territories, setTerritories] = useState([])
  const [selectedTerritoryId, setSelectedTerritoryId] = useState('')
  const [routes, setRoutes] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [editingRoute, setEditingRoute] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isLoadingTerritories, setIsLoadingTerritories] = useState(true)
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const selectedTerritory = useMemo(
    () => territories.find((territory) => territory.id === selectedTerritoryId),
    [territories, selectedTerritoryId]
  )

  const filteredRoutes = useMemo(() => {
    if (statusFilter === 'All') return routes

    return routes.filter((route) =>
      statusFilter === 'Active' ? route.isActive : !route.isActive
    )
  }, [routes, statusFilter])

  const loadTerritories = useCallback(async () => {
    setIsLoadingTerritories(true)

    try {
      const items = await masterService.listTerritories()
      setTerritories(items)

      if (items.length) {
        setSelectedTerritoryId((currentTerritoryId) => currentTerritoryId || items[0].id)
      }
    } catch (loadError) {
      toast.error(getErrorMessage(loadError, 'Unable to load territories.'))
    } finally {
      setIsLoadingTerritories(false)
    }
  }, [])

  const loadRoutes = useCallback(async () => {
    if (!selectedTerritoryId) {
      setRoutes([])
      setTotalItems(0)
      setTotalPages(1)
      return
    }

    setIsLoadingRoutes(true)
    setError('')

    try {
      const result = await masterService.listSalesRoutes({
        territoryId: selectedTerritoryId,
        page,
        pageSize,
        search: search.trim() || undefined,
      })

      setRoutes(result.items || [])
      setTotalItems(result.totalItems || 0)
      setTotalPages(Math.max(1, result.totalPages || 1))
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load sales routes.'))
    } finally {
      setIsLoadingRoutes(false)
    }
  }, [page, search, selectedTerritoryId])

  useEffect(() => {
    loadTerritories()
  }, [loadTerritories])

  useEffect(() => {
    loadRoutes()
  }, [loadRoutes])

  useEffect(() => {
    setPage(1)
  }, [selectedTerritoryId, search, statusFilter])

  useEffect(() => {
    resetForm()
  }, [selectedTerritoryId])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function resetForm() {
    setEditingRoute(null)
    setForm(emptyForm)
  }

  function openEdit(route) {
    setEditingRoute(route)
    setForm({
      code: route.code,
      name: route.name,
      defaultEmployeeId: route.defaultEmployeeId || '',
    })
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!selectedTerritoryId) {
      toast.error('Please select a territory first.')
      return
    }

    const payload = buildPayload(form)
    if (!payload.code || !payload.name) {
      toast.error('Route code and name are required.')
      return
    }

    setIsSaving(true)

    try {
      if (editingRoute) {
        await masterService.updateSalesRoute(editingRoute.id, payload)
        toast.success('Sales route updated.')
      } else {
        await masterService.createSalesRoute({
          territoryId: selectedTerritoryId,
          ...payload,
        })
        toast.success('Sales route created.')
      }

      await loadRoutes()
      resetForm()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to save sales route.'))
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

  async function handleDeactivate(route) {
    if (!route.isActive) return
    if (!window.confirm(`Deactivate ${route.name}?`)) return

    try {
      await masterService.deactivateSalesRoute(route.id)
      toast.success('Sales route deactivated.')
      await loadRoutes()

      if (editingRoute?.id === route.id) {
        resetForm()
      }
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Unable to deactivate sales route.'))
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
            Sales Routes
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage territory route codes and default sales employee assignments.
          </p>
        </div>
      </div>

      <div
        className="panel"
        style={{ padding: 16, display: 'grid', gridTemplateColumns: '260px 1fr 160px', gap: 16 }}
      >
        <select
          className="form-input"
          value={selectedTerritoryId}
          disabled={isLoadingTerritories}
          onChange={(event) => setSelectedTerritoryId(event.target.value)}
          style={{ height: 40 }}
        >
          <option value="">Select territory</option>
          {territories.map((territory) => (
            <option key={territory.id} value={territory.id}>
              {territory.name} ({territory.code})
            </option>
          ))}
        </select>

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
            placeholder="Search sales routes..."
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
          <div className="overflow-x-auto" style={{ minHeight: 0, overflowY: 'auto' }}>
            <table className="data-table master-table-compact">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Territory</th>
                  <th>Default Employee</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRoutes ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                      Loading sales routes...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-danger">
                      {error}
                    </td>
                  </tr>
                ) : !selectedTerritoryId ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                      Select a territory to view sales routes.
                    </td>
                  </tr>
                ) : filteredRoutes.length ? (
                  filteredRoutes.map((route) => (
                    <tr key={route.id}>
                      <td>
                        <span
                          className="mono text-xs font-semibold"
                          style={{ color: 'var(--color-amber)' }}
                        >
                          {route.code}
                        </span>
                      </td>
                      <td
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {route.name}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {selectedTerritory?.name || route.territoryId}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {route.defaultEmployeeId || '-'}
                      </td>
                      <td>
                        <StatusBadge status={route.status} />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit sales route"
                          style={{ width: 28, height: 28, marginRight: 6 }}
                          onClick={() => openEdit(route)}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Deactivate sales route"
                          disabled={!route.isActive}
                          style={{ width: 28, height: 28, opacity: route.isActive ? 1 : 0.45 }}
                          onClick={() => handleDeactivate(route)}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                      No sales routes found.
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
              Showing {filteredRoutes.length} of {totalItems} routes
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
                {editingRoute ? 'Edit Sales Route' : 'Add New Sales Route'}
              </p>
              {editingRoute ? (
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
              New routes are created under the selected territory.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-muted)',
              fontSize: 12,
            }}
          >
            <MapPinned style={{ width: 16, height: 16, color: 'var(--color-amber)' }} />
            <span>{selectedTerritory ? selectedTerritory.name : 'No territory selected'}</span>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              ROUTE CODE
            </label>
            <input
              autoFocus
              className="form-input"
              placeholder="e.g. CMB-01"
              value={form.code}
              maxLength={20}
              onChange={(event) => updateField('code', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              ROUTE NAME
            </label>
            <input
              className="form-input"
              placeholder="e.g. Colombo Central"
              value={form.name}
              maxLength={100}
              onChange={(event) => updateField('name', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              DEFAULT EMPLOYEE ID
            </label>
            <input
              className="form-input"
              placeholder="Optional"
              value={form.defaultEmployeeId}
              maxLength={50}
              onChange={(event) => updateField('defaultEmployeeId', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          {editingRoute ? (
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
              Territory cannot be changed from this backend endpoint. Create a new route if the
              territory is wrong.
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
              disabled={isSaving || !selectedTerritoryId}
              style={{ flex: 1, height: 38, fontSize: 13 }}
            >
              {isSaving ? 'Saving...' : editingRoute ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
