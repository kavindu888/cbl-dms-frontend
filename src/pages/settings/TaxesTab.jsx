import { Pencil, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'
import { useAuthStore } from '@stores/authStore'
import { Role } from '@/types/auth.types'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'

const pageSize = 8

const emptyForm = {
  code: '',
  name: '',
  rate: '',
  isDefault: false,
}

export default function TaxesTab() {
  const user = useAuthStore((state) => state.user)
  const canManage =
    user?.roles?.includes(Role.Admin) || userHasPermission(user, PERMISSIONS.masterData.taxManage)

  const [taxes, setTaxes] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingTax, setEditingTax] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadTaxes() {
    setIsLoading(true)
    setError('')

    try {
      setTaxes(await masterService.listTaxes())
    } catch (loadError) {
      setError(loadError.message || 'Unable to load taxes.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTaxes()
  }, [])

  const filteredTaxes = useMemo(() => {
    const query = search.trim().toLowerCase()

    return taxes.filter((tax) => {
      const matchesSearch =
        !query || tax.code.toLowerCase().includes(query) || tax.name.toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && tax.isActive) ||
        (statusFilter === 'Inactive' && !tax.isActive)

      return matchesSearch && matchesStatus
    })
  }, [search, statusFilter, taxes])

  const pagedTaxes = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredTaxes.slice(start, start + pageSize)
  }, [filteredTaxes, page])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredTaxes.length / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [filteredTaxes.length, page])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setEditingTax(null)
    setForm(emptyForm)
  }

  function editTax(tax) {
    setEditingTax(tax)
    setForm({
      code: tax.code,
      name: tax.name,
      rate: String(tax.rate),
      isDefault: tax.isDefault,
    })
  }

  async function saveTax(event) {
    event.preventDefault()

    const code = form.code.trim()
    const name = form.name.trim()
    const rate = Number(form.rate)

    if (!code || !name || form.rate === '') {
      toast.error('Code, name, and rate are required.')
      return
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error('Tax rate must be between 0 and 100.')
      return
    }

    setIsSaving(true)

    try {
      const payload = { code, name, rate, isDefault: form.isDefault }
      const savedTax = editingTax
        ? await masterService.updateTax(editingTax.id, payload)
        : await masterService.createTax(payload)

      setTaxes((current) => {
        const withoutSavedTax = current.filter((tax) => tax.id !== savedTax.id)
        const updatedTaxes = [savedTax, ...withoutSavedTax]

        if (!savedTax.isDefault) return updatedTaxes
        return updatedTaxes.map((tax) =>
          tax.id === savedTax.id ? tax : { ...tax, isDefault: false }
        )
      })

      toast.success(editingTax ? 'Tax updated.' : 'Tax created.')
      resetForm()
    } catch (saveError) {
      toast.error(saveError.message || 'Unable to save tax.')
    } finally {
      setIsSaving(false)
    }
  }

  async function deactivateTax(tax) {
    if (!window.confirm(`Deactivate ${tax.code} - ${tax.name}?`)) return

    try {
      const updatedTax = await masterService.deactivateTax(tax.id)
      setTaxes((current) => current.map((item) => (item.id === updatedTax.id ? updatedTax : item)))
      if (editingTax?.id === updatedTax.id) resetForm()
      toast.success('Tax deactivated.')
    } catch (deactivateError) {
      toast.error(deactivateError.message || 'Unable to deactivate tax.')
    }
  }

  return (
    <div
      style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div className="panel" style={{ padding: 16, display: 'flex', gap: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              width: 16,
              height: 16,
              color: 'var(--color-text-dim)',
              transform: 'translateY(-50%)',
            }}
          />
          <input
            className="form-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tax code or name..."
            style={{ width: '100%', height: 40, paddingLeft: 36 }}
          />
        </div>
        <select
          className="form-input"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{ width: 160, height: 40 }}
        >
          <option value="All">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: canManage ? 'minmax(0, 1fr) 360px' : '1fr',
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        <section
          className="panel"
          style={{
            padding: '18px 20px',
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr) auto',
            gap: 14,
            overflow: 'hidden',
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Taxes
            </h2>
            <p style={{ marginTop: 3, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Tax definitions are scoped to the organisation in the signed-in user token.
            </p>
          </div>

          <div style={{ minHeight: 0, overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th className="text-right">Rate</th>
                  <th>Default</th>
                  <th>Status</th>
                  {canManage ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={canManage ? 6 : 5}
                      className="py-12 text-center text-sm text-text-muted"
                    >
                      Loading taxes...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={canManage ? 6 : 5}
                      className="py-12 text-center text-sm text-danger"
                    >
                      {error}
                    </td>
                  </tr>
                ) : pagedTaxes.length ? (
                  pagedTaxes.map((tax) => (
                    <tr key={tax.id}>
                      <td>
                        <span className="product-sku-badge mono">{tax.code}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {tax.name}
                      </td>
                      <td className="mono text-right">{tax.rate.toFixed(2)}%</td>
                      <td>
                        {tax.isDefault ? (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--color-teal)',
                              background: 'rgba(142, 232, 240, 0.1)',
                            }}
                          >
                            DEFAULT
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-dim)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={tax.status} />
                      </td>
                      {canManage ? (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              type="button"
                              className="icon-button"
                              title="Edit tax"
                              onClick={() => editTax(tax)}
                              style={{ width: 28, height: 28 }}
                            >
                              <Pencil style={{ width: 13, height: 13 }} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title="Deactivate tax"
                              onClick={() => deactivateTax(tax)}
                              disabled={!tax.isActive}
                              style={{ width: 28, height: 28, color: 'var(--color-danger)' }}
                            >
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={canManage ? 6 : 5}
                      className="py-12 text-center text-sm text-text-muted"
                    >
                      No taxes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <SimplePagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredTaxes.length}
            onPageChange={setPage}
            itemLabel="taxes"
          />
        </section>

        {canManage ? (
          <form
            onSubmit={saveTax}
            className="panel"
            style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {editingTax ? 'Edit Tax' : 'Add New Tax'}
              </h2>
              <p style={{ marginTop: 3, fontSize: 12, color: 'var(--color-text-muted)' }}>
                {editingTax && !editingTax.isActive
                  ? 'This tax remains inactive unless it is saved as the default tax.'
                  : 'Enter the tax code, display name, and percentage rate.'}
              </p>
            </div>

            <FormField label="Code">
              <input
                className="form-input"
                value={form.code}
                onChange={(event) => updateField('code', event.target.value.toUpperCase())}
                maxLength={20}
                placeholder="e.g. VAT18"
              />
            </FormField>

            <FormField label="Name">
              <input
                className="form-input"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                maxLength={100}
                placeholder="e.g. Standard VAT 18%"
              />
            </FormField>

            <FormField label="Rate (%)">
              <input
                className="form-input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.rate}
                onChange={(event) => updateField('rate', event.target.value)}
                placeholder="0.00"
              />
            </FormField>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) => updateField('isDefault', event.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--color-amber)' }}
              />
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                Use as the default tax
              </span>
            </label>
            <p style={{ marginTop: -8, fontSize: 11, color: 'var(--color-text-dim)' }}>
              Setting this as default automatically clears the previous default tax.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 'auto',
                paddingTop: 14,
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <button
                type="button"
                className="button-secondary"
                onClick={resetForm}
                disabled={isSaving}
                style={{ flex: 1 }}
              >
                Clear
              </button>
              <button
                type="submit"
                className="button-primary"
                disabled={isSaving}
                style={{ flex: 1 }}
              >
                {isSaving ? 'Saving...' : editingTax ? 'Save Changes' : 'Create Tax'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <label>
      <span className="form-label">{label}</span>
      {children}
    </label>
  )
}
