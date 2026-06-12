import { Pencil, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'

const emptyForm = {
  businessUnitId: '',
  code: '',
  name: '',
  description: '',
  isActive: true,
}

const pageSize = 8

function getErrorMessage(error, fallback = 'Something went wrong') {
  return error?.message || fallback
}

function toApiPayload(values) {
  return {
    businessUnitId: values.businessUnitId,
    code: values.code.trim(),
    name: values.name.trim(),
    description: values.description.trim() || null,
  }
}

export default function TerritoriesTab() {
  const [territories, setTerritories] = useState([])
  const [businessUnits, setBusinessUnits] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [editingTerritory, setEditingTerritory] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setError('')

      try {
        const [territoryItems, businessUnitItems] = await Promise.all([
          masterService.listTerritories(),
          masterService.listBusinessUnits(),
        ])

        setTerritories(territoryItems)
        setBusinessUnits(businessUnitItems)
        setForm((currentForm) => ({
          ...currentForm,
          businessUnitId: currentForm.businessUnitId || businessUnitItems[0]?.id || '',
        }))
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load territories.'))
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredTerritories = useMemo(() => {
    const query = search.trim().toLowerCase()

    return territories.filter((territory) => {
      const matchesSearch =
        !query ||
        [
          territory.code,
          territory.name,
          territory.description,
          territory.businessUnit?.code,
          territory.businessUnit?.name,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && territory.isActive) ||
        (statusFilter === 'Inactive' && !territory.isActive)

      return matchesSearch && matchesStatus
    })
  }, [territories, search, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredTerritories.length / pageSize))
  const pagedTerritories = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredTerritories.slice(start, start + pageSize)
  }, [filteredTerritories, page])

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
    setEditingTerritory(null)
    setForm({
      ...emptyForm,
      businessUnitId: businessUnits[0]?.id || '',
    })
  }

  function openEdit(territory) {
    setEditingTerritory(territory)
    setForm({
      businessUnitId: territory.businessUnitId,
      code: territory.code,
      name: territory.name,
      description: territory.description,
      isActive: territory.isActive,
    })
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!form.businessUnitId || !form.code || !form.name) {
      toast.error('Business Unit, Code, and Name are required.')
      return
    }

    setIsSaving(true)

    try {
      const payload = toApiPayload(form)
      const savedTerritory = editingTerritory
        ? await masterService.updateTerritory(editingTerritory.id, payload)
        : await masterService.createTerritory(payload)

      const finalTerritory = form.isActive
        ? savedTerritory
        : await masterService.deactivateTerritory(savedTerritory.id)

      setTerritories((currentItems) => {
        const exists = currentItems.some((item) => item.id === finalTerritory.id)
        if (exists) {
          return currentItems.map((item) => (item.id === finalTerritory.id ? finalTerritory : item))
        }
        return [finalTerritory, ...currentItems]
      })

      toast.success(editingTerritory ? 'Territory updated.' : 'Territory created.')
      resetForm()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to save territory.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(event) {
    const nextIsActive = event.target.checked

    if (nextIsActive && editingTerritory && !editingTerritory.isActive) {
      toast.error('This backend does not provide an activate territory endpoint.')
      return
    }

    updateField('isActive', nextIsActive)

    if (!editingTerritory || nextIsActive) return

    try {
      const updatedTerritory = await masterService.deactivateTerritory(editingTerritory.id)
      setTerritories((currentItems) =>
        currentItems.map((item) => (item.id === updatedTerritory.id ? updatedTerritory : item))
      )
      setEditingTerritory(updatedTerritory)
      setForm((currentForm) => ({ ...currentForm, isActive: false }))
      toast.success('Territory deactivated.')
    } catch (statusError) {
      updateField('isActive', true)
      toast.error(getErrorMessage(statusError, 'Unable to deactivate territory.'))
    }
  }

  function handleEnterToNext(event) {
    if (event.key !== 'Enter' || event.shiftKey) return

    event.preventDefault()

    const currentField = event.currentTarget
    const formElement = currentField.form
    if (!formElement) return

    const orderedFields = Array.from(formElement.querySelectorAll('[data-enter-field]'))
    const currentIndex = orderedFields.indexOf(currentField)
    const nextField = orderedFields[currentIndex + 1]

    if (nextField) {
      nextField.focus()
      return
    }

    formElement.querySelector('#save-territory-button')?.focus()
  }

  const enterKeyProps = {
    'data-enter-field': true,
    onKeyDown: handleEnterToNext,
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        minHeight: 0,
      }}
    >
      {/* ── Filter Bar ── */}
      <div
        className="panel"
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
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
            placeholder="Search territories..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{
              width: '100%',
              height: 40,
              paddingLeft: 36,
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ position: 'relative', width: 160 }}>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '100%',
              height: 40,
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              fontSize: 14,
              cursor: 'pointer',
              appearance: 'none',
              paddingLeft: 12,
              paddingRight: 36,
            }}
          >
            <option value="All" style={{ background: 'var(--color-bg-elevated)' }}>
              All Statuses
            </option>
            <option value="Active" style={{ background: 'var(--color-bg-elevated)' }}>
              Active
            </option>
            <option value="Inactive" style={{ background: 'var(--color-bg-elevated)' }}>
              Inactive
            </option>
          </select>
          <div
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-dim)',
            }}
          >
            <svg style={{ width: 14, height: 14, fill: 'currentColor' }} viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        <div
          className="panel"
          style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Territories
            </p>
          </div>

          <div className="overflow-x-auto" style={{ marginTop: 4 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Business Unit</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-sm text-text-muted"
                    >
                      Loading territories...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-sm text-danger"
                    >
                      {error}
                    </td>
                  </tr>
                ) : filteredTerritories.length ? (
                  pagedTerritories.map((territory) => (
                    <tr key={territory.id}>
                      <td>
                        <span
                          className="mono text-xs font-semibold"
                          style={{ color: 'var(--color-amber)' }}
                        >
                          {territory.code}
                        </span>
                      </td>
                      <td
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {territory.name}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {territory.businessUnit?.name || '-'}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {territory.description || '-'}
                      </td>
                      <td>
                        <StatusBadge status={territory.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="icon-button"
                          style={{ width: 26, height: 26 }}
                          onClick={() => openEdit(territory)}
                        >
                          <Pencil style={{ width: 12, height: 12 }} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-sm text-text-muted"
                    >
                      No territories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredTerritories.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                paddingTop: 10,
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
                Showing {pagedTerritories.length} of {filteredTerritories.length} territories
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
          )}
        </div>

        <form
          onSubmit={handleSave}
          className="panel"
          style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {editingTerritory ? 'Edit Territory' : 'Add New Territory'}
            </p>
            {editingTerritory ? (
              <button
                type="button"
                className="button-ghost"
                onClick={resetForm}
                style={{ padding: '4px 8px', height: 'auto', fontSize: 12 }}
              >
                Clear
              </button>
            ) : null}
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              BUSINESS UNIT
            </label>
            <select
              {...enterKeyProps}
              className="form-input"
              value={form.businessUnitId}
              onChange={(event) => updateField('businessUnitId', event.target.value)}
              style={{ height: 38, cursor: 'pointer' }}
            >
              <option value="">Select business unit</option>
              {businessUnits.map((businessUnit) => (
                <option key={businessUnit.id} value={businessUnit.id}>
                  {businessUnit.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              CODE
            </label>
            <input
              {...enterKeyProps}
              className="form-input"
              placeholder="e.g. NWP"
              value={form.code}
              onChange={(event) => updateField('code', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              NAME
            </label>
            <input
              {...enterKeyProps}
              className="form-input"
              placeholder="e.g. North Western Province"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              DESCRIPTION
            </label>
            <textarea
              {...enterKeyProps}
              className="form-input"
              placeholder="Optional description"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              style={{ minHeight: 76, paddingTop: 10, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <input
              {...enterKeyProps}
              type="checkbox"
              id="isActiveTerritory"
              checked={form.isActive}
              onChange={handleStatusChange}
              style={{ width: 16, height: 16, accentColor: 'var(--color-amber)' }}
            />
            <label
              htmlFor="isActiveTerritory"
              style={{ fontSize: 13, color: 'var(--color-text-primary)', cursor: 'pointer' }}
            >
              Active Territory
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 16 }}>
            <button
              type="button"
              className="button-ghost"
              onClick={resetForm}
              style={{ flex: 1, height: 36, fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              id="save-territory-button"
              type="submit"
              className="button-primary"
              disabled={isSaving}
              style={{ flex: 1, height: 36, fontSize: 13 }}
            >
              {isSaving ? 'Saving...' : editingTerritory ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
