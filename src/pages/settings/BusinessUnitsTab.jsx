import { Pencil, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'

const emptyForm = {
  organisationId: '',
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
    organisationId: values.organisationId,
    code: values.code.trim(),
    name: values.name.trim(),
    description: values.description.trim() || null,
  }
}

export default function BusinessUnitsTab() {
  const [businessUnits, setBusinessUnits] = useState([])
  const [organisations, setOrganisations] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [editingBusinessUnit, setEditingBusinessUnit] = useState(null)
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
        const [businessUnitItems, organisationItems] = await Promise.all([
          masterService.listBusinessUnits(),
          masterService.listOrganisations(),
        ])

        setBusinessUnits(businessUnitItems)
        setOrganisations(organisationItems)
        setForm((currentForm) => ({
          ...currentForm,
          organisationId: currentForm.organisationId || organisationItems[0]?.id || '',
        }))
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load business units.'))
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredBusinessUnits = useMemo(() => {
    const query = search.trim().toLowerCase()

    return businessUnits.filter((businessUnit) => {
      const matchesSearch =
        !query ||
        [
          businessUnit.code,
          businessUnit.name,
          businessUnit.description,
          businessUnit.type,
          organisations.find((item) => item.id === businessUnit.organisationId)?.name,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && businessUnit.isActive) ||
        (statusFilter === 'Inactive' && !businessUnit.isActive)

      return matchesSearch && matchesStatus
    })
  }, [businessUnits, organisations, search, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredBusinessUnits.length / pageSize))
  const pagedBusinessUnits = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredBusinessUnits.slice(start, start + pageSize)
  }, [filteredBusinessUnits, page])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  function getOrganisationName(organisationId) {
    return organisations.find((item) => item.id === organisationId)?.name || '-'
  }

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function resetForm() {
    setEditingBusinessUnit(null)
    setForm({
      ...emptyForm,
      organisationId: organisations[0]?.id || '',
    })
  }

  function openEdit(businessUnit) {
    setEditingBusinessUnit(businessUnit)
    setForm({
      organisationId: businessUnit.organisationId,
      code: businessUnit.code,
      name: businessUnit.name,
      description: businessUnit.description,
      isActive: businessUnit.isActive,
    })
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!form.organisationId || !form.code || !form.name) {
      toast.error('Organisation, Code, and Name are required.')
      return
    }

    setIsSaving(true)

    try {
      const payload = toApiPayload(form)
      const savedBusinessUnit = editingBusinessUnit
        ? await masterService.updateBusinessUnit(editingBusinessUnit.id, payload)
        : await masterService.createBusinessUnit(payload)

      const finalBusinessUnit = form.isActive
        ? savedBusinessUnit
        : await masterService.deactivateBusinessUnit(savedBusinessUnit.id)

      setBusinessUnits((currentItems) => {
        const exists = currentItems.some((item) => item.id === finalBusinessUnit.id)
        if (exists) {
          return currentItems.map((item) =>
            item.id === finalBusinessUnit.id ? finalBusinessUnit : item
          )
        }
        return [finalBusinessUnit, ...currentItems]
      })

      toast.success(editingBusinessUnit ? 'Business unit updated.' : 'Business unit created.')
      resetForm()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to save business unit.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(event) {
    const nextIsActive = event.target.checked

    if (nextIsActive && editingBusinessUnit && !editingBusinessUnit.isActive) {
      toast.error('This backend does not provide an activate business unit endpoint.')
      return
    }

    updateField('isActive', nextIsActive)

    if (!editingBusinessUnit || nextIsActive) return

    try {
      const updatedBusinessUnit = await masterService.deactivateBusinessUnit(editingBusinessUnit.id)
      setBusinessUnits((currentItems) =>
        currentItems.map((item) =>
          item.id === updatedBusinessUnit.id ? updatedBusinessUnit : item
        )
      )
      setEditingBusinessUnit(updatedBusinessUnit)
      setForm((currentForm) => ({ ...currentForm, isActive: false }))
      toast.success('Business unit deactivated.')
    } catch (statusError) {
      updateField('isActive', true)
      toast.error(getErrorMessage(statusError, 'Unable to deactivate business unit.'))
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

    formElement.querySelector('#save-business-unit-button')?.focus()
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
            placeholder="Search business units..."
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
              Business Units
            </p>
          </div>

          <div className="overflow-x-auto" style={{ marginTop: 4 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Organisation</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-sm text-text-muted"
                    >
                      Loading business units...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-sm text-danger"
                    >
                      {error}
                    </td>
                  </tr>
                ) : filteredBusinessUnits.length ? (
                  pagedBusinessUnits.map((businessUnit) => (
                    <tr key={businessUnit.id}>
                      <td>
                        <span
                          className="mono text-xs font-semibold"
                          style={{ color: 'var(--color-amber)' }}
                        >
                          {businessUnit.code}
                        </span>
                      </td>
                      <td
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {businessUnit.name}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {getOrganisationName(businessUnit.organisationId)}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {businessUnit.type || '-'}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {businessUnit.description || '-'}
                      </td>
                      <td>
                        <StatusBadge status={businessUnit.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="icon-button"
                          style={{ width: 26, height: 26 }}
                          onClick={() => openEdit(businessUnit)}
                        >
                          <Pencil style={{ width: 12, height: 12 }} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-sm text-text-muted"
                    >
                      No business units found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredBusinessUnits.length > 0 && (
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
                Showing {pagedBusinessUnits.length} of {filteredBusinessUnits.length} business units
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
              {editingBusinessUnit ? 'Edit Business Unit' : 'Add New Business Unit'}
            </p>
            {editingBusinessUnit ? (
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
              ORGANISATION
            </label>
            <select
              {...enterKeyProps}
              className="form-input"
              value={form.organisationId}
              onChange={(event) => updateField('organisationId', event.target.value)}
              style={{ height: 38, cursor: 'pointer' }}
            >
              <option value="">Select organisation</option>
              {organisations.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.name}
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
              placeholder="e.g. BU-MAIN"
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
              placeholder="e.g. Main Operations"
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
              id="isActiveBU"
              checked={form.isActive}
              onChange={handleStatusChange}
              style={{ width: 16, height: 16, accentColor: 'var(--color-amber)' }}
            />
            <label
              htmlFor="isActiveBU"
              style={{ fontSize: 13, color: 'var(--color-text-primary)', cursor: 'pointer' }}
            >
              Active Business Unit
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
              id="save-business-unit-button"
              type="submit"
              className="button-primary"
              disabled={isSaving}
              style={{ flex: 1, height: 36, fontSize: 13 }}
            >
              {isSaving ? 'Saving...' : editingBusinessUnit ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
