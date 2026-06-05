import { Pencil, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'

const emptyForm = {
  code: '',
  name: '',
  category: '',
  description: '',
}

const pageSize = 10

function getErrorMessage(error, fallback = 'Something went wrong') {
  return error?.message || fallback
}

function toApiPayload(values) {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    category: values.category.trim() || null,
    description: values.description.trim() || null,
  }
}

export default function UnitOfMeasureListPage() {
  const [units, setUnits] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [editingUnit, setEditingUnit] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const loadUnits = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const items = await masterService.listUnitsOfMeasure({
        category: categoryFilter === 'All' ? undefined : categoryFilter,
      })
      setUnits(items)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load units of measure.'))
    } finally {
      setIsLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => {
    loadUnits()
  }, [loadUnits])

  const categories = useMemo(() => {
    const unitCategories = units.flatMap((unit) => (unit.category ? [unit.category] : []))
    return [...new Set(unitCategories)].sort((a, b) => a.localeCompare(b))
  }, [units])

  const filteredUnits = useMemo(() => {
    const query = search.trim().toLowerCase()

    return units.filter((unit) => {
      const matchesSearch =
        !query ||
        [unit.code, unit.name, unit.category, unit.description]
          .join(' ')
          .toLowerCase()
          .includes(query)
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && unit.isActive) ||
        (statusFilter === 'Inactive' && !unit.isActive)
      return matchesSearch && matchesStatus
    })
  }, [units, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / pageSize))
  const pagedUnits = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredUnits.slice(start, start + pageSize)
  }, [filteredUnits, page])

  useEffect(() => {
    setPage(1)
  }, [search, categoryFilter, statusFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function resetForm() {
    setEditingUnit(null)
    setForm(emptyForm)
  }

  function openEdit(unit) {
    setEditingUnit(unit)
    setForm({
      code: unit.code,
      name: unit.name,
      category: unit.category || '',
      description: unit.description || '',
    })
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and Name are required.')
      return
    }

    setIsSaving(true)

    try {
      const payload = toApiPayload(form)

      if (editingUnit) {
        await masterService.updateUnitOfMeasure(editingUnit.id, payload)
        toast.success('Unit of measure updated.')
      } else {
        await masterService.createUnitOfMeasure(payload)
        toast.success('Unit of measure created.')
      }

      await loadUnits()
      resetForm()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to save unit of measure.'))
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

  async function handleDeactivate(unit) {
    if (!unit.isActive) return
    if (!window.confirm(`Deactivate ${unit.name}?`)) return

    try {
      await masterService.deactivateUnitOfMeasure(unit.id)
      toast.success('Unit of measure deactivated.')
      await loadUnits()

      if (editingUnit?.id === unit.id) {
        resetForm()
      }
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Unable to deactivate unit of measure.'))
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
            Units of Measure
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage product measurement codes, names, and categories.
          </p>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div
        className="panel"
        style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16 }}
      >
        {/* Search Input */}
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
            placeholder="Search units..."
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

        {/* Category Filter */}
        <div style={{ position: 'relative', width: 200 }}>
          <select
            className="form-input"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
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
              All Categories
            </option>
            {categories.map((category) => (
              <option
                key={category}
                value={category}
                style={{ background: 'var(--color-bg-elevated)' }}
              >
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
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
        </div>
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
                  <th>Category</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                      Loading units of measure...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-danger">
                      {error}
                    </td>
                  </tr>
                ) : filteredUnits.length ? (
                  pagedUnits.map((unit) => (
                    <tr key={unit.id}>
                      <td>
                        <span
                          className="mono text-xs font-semibold"
                          style={{ color: 'var(--color-amber)' }}
                        >
                          {unit.code}
                        </span>
                      </td>
                      <td
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {unit.name}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {unit.category || '-'}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        <span
                          style={{
                            display: 'block',
                            maxWidth: 280,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={unit.description || '-'}
                        >
                          {unit.description || '-'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={unit.status} />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit unit of measure"
                          style={{ width: 28, height: 28, marginRight: 6 }}
                          onClick={() => openEdit(unit)}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Deactivate unit of measure"
                          disabled={!unit.isActive}
                          style={{ width: 28, height: 28, opacity: unit.isActive ? 1 : 0.45 }}
                          onClick={() => handleDeactivate(unit)}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                      No units of measure found.
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
              Showing {pagedUnits.length} of {filteredUnits.length} units
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
            overflow: 'hidden',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 650, color: 'var(--color-text-primary)' }}>
                {editingUnit ? 'Edit Unit' : 'Add New Unit'}
              </p>
              {editingUnit ? (
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
              Codes are saved by the backend in uppercase.
            </p>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              CODE
            </label>
            <input
              className="form-input"
              placeholder="e.g. PCS"
              value={form.code}
              maxLength={20}
              onChange={(event) => updateField('code', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              NAME
            </label>
            <input
              className="form-input"
              placeholder="e.g. Pieces"
              value={form.name}
              maxLength={150}
              onChange={(event) => updateField('name', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              CATEGORY
            </label>
            <input
              className="form-input"
              placeholder="e.g. Count"
              value={form.category}
              maxLength={100}
              list="uom-category-options"
              onChange={(event) => updateField('category', event.target.value)}
              style={{ height: 38 }}
            />
            <datalist id="uom-category-options">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <div style={{ flex: 1, minHeight: 120 }}>
            <label className="form-label" style={{ fontSize: 10 }}>
              DESCRIPTION
            </label>
            <textarea
              className="form-input"
              placeholder="Optional description"
              value={form.description}
              maxLength={500}
              onChange={(event) => updateField('description', event.target.value)}
              style={{ width: '100%', height: 'calc(100% - 20px)', paddingTop: 10, resize: 'none' }}
            />
          </div>

          {editingUnit ? (
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
              This backend provides deactivate only. Inactive units cannot be reactivated here.
            </p>
          ) : null}

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
              id="unit-save-button"
              type="submit"
              className="button-primary"
              disabled={isSaving}
              style={{ flex: 1, height: 38, fontSize: 13 }}
            >
              {isSaving ? 'Saving...' : editingUnit ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
