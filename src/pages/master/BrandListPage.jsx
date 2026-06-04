import { Pencil, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'

const initialBrands = [
  { id: 'brd-001', code: 'BRD-001', name: 'Munchee', productCount: 45, isActive: true },
  { id: 'brd-002', code: 'BRD-002', name: 'Ritzbury', productCount: 28, isActive: true },
  { id: 'brd-003', code: 'BRD-003', name: 'Tiara', productCount: 12, isActive: true },
  { id: 'brd-004', code: 'BRD-004', name: 'Samaposha', productCount: 5, isActive: true },
  { id: 'brd-005', code: 'BRD-005', name: 'Lanka Soy', productCount: 15, isActive: false },
]

const emptyForm = {
  code: '',
  name: '',
  isActive: true,
}

const pageSize = 10

function toBrandCode(value) {
  return value.trim().toUpperCase()
}

export default function BrandListPage() {
  const [brands, setBrands] = useState(initialBrands)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [editingBrand, setEditingBrand] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [page, setPage] = useState(1)

  const filteredBrands = useMemo(() => {
    const query = search.trim().toLowerCase()

    return brands.filter((brand) => {
      const matchesSearch =
        !query || [brand.code, brand.name].join(' ').toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && brand.isActive) ||
        (statusFilter === 'Inactive' && !brand.isActive)
      return matchesSearch && matchesStatus
    })
  }, [brands, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / pageSize))
  const pagedBrands = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredBrands.slice(start, start + pageSize)
  }, [filteredBrands, page])

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
    setEditingBrand(null)
    setForm(emptyForm)
  }

  function openEdit(brand) {
    setEditingBrand(brand)
    setForm({
      code: brand.code,
      name: brand.name,
      isActive: brand.isActive,
    })
  }

  async function handleSave(event) {
    event.preventDefault()

    const code = toBrandCode(form.code)
    const name = form.name.trim()

    if (!code || !name) {
      toast.error('Brand code and name are required.')
      return
    }

    const isDuplicate = brands.some(
      (brand) =>
        brand.id !== editingBrand?.id &&
        (brand.code.toLowerCase() === code.toLowerCase() ||
          brand.name.toLowerCase() === name.toLowerCase())
    )

    if (isDuplicate) {
      toast.error('A brand with this code or name already exists.')
      return
    }

    setIsSaving(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 300))

      if (editingBrand) {
        setBrands((currentBrands) =>
          currentBrands.map((brand) =>
            brand.id === editingBrand.id
              ? {
                  ...brand,
                  code,
                  name,
                  isActive: form.isActive,
                }
              : brand
          )
        )
        toast.success('Brand updated.')
      } else {
        setBrands((currentBrands) => [
          {
            id: `brd-${Date.now()}`,
            code,
            name,
            productCount: 0,
            isActive: form.isActive,
          },
          ...currentBrands,
        ])
        toast.success('Brand created.')
      }

      resetForm()
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

  function handleDeactivate(brand) {
    if (!brand.isActive) return
    if (!window.confirm(`Deactivate ${brand.name}?`)) return

    setBrands((currentBrands) =>
      currentBrands.map((item) => (item.id === brand.id ? { ...item, isActive: false } : item))
    )

    if (editingBrand?.id === brand.id) {
      resetForm()
    }

    toast.success('Brand deactivated.')
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
            Brands
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage product brands and portfolio labels.
          </p>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div
        className="panel"
        style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16 }}
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
            placeholder="Search brands..."
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
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
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
                  <th>Brand Name</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedBrands.length ? (
                  pagedBrands.map((brand) => (
                    <tr key={brand.id}>
                      <td>
                        <span
                          className="mono text-xs font-semibold"
                          style={{ color: 'var(--color-amber)' }}
                        >
                          {brand.code}
                        </span>
                      </td>
                      <td
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {brand.name}
                      </td>
                      <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {brand.productCount}
                      </td>
                      <td>
                        <StatusBadge status={brand.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit brand"
                          style={{ width: 28, height: 28, marginRight: 6 }}
                          onClick={() => openEdit(brand)}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Deactivate brand"
                          disabled={!brand.isActive}
                          style={{ width: 28, height: 28, opacity: brand.isActive ? 1 : 0.45 }}
                          onClick={() => handleDeactivate(brand)}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-text-muted">
                      No brands found.
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
              Showing {pagedBrands.length} of {filteredBrands.length} brands
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
                {editingBrand ? 'Edit Brand' : 'Add New Brand'}
              </p>
              {editingBrand ? (
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
              Keep brand codes short and unique.
            </p>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              BRAND CODE
            </label>
            <input
              className="form-input"
              placeholder="e.g. MUN"
              value={form.code}
              maxLength={20}
              onChange={(event) => updateField('code', event.target.value.toUpperCase())}
              style={{ height: 38, textTransform: 'uppercase' }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              BRAND NAME
            </label>
            <input
              className="form-input"
              placeholder="e.g. Munchee"
              value={form.name}
              maxLength={150}
              onChange={(event) => updateField('name', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 2,
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => updateField('isActive', event.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--color-amber)' }}
            />
            Active Brand
          </label>

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
              id="brand-save-button"
              type="submit"
              className="button-primary"
              disabled={isSaving}
              style={{ flex: 1, height: 38, fontSize: 13 }}
            >
              {isSaving ? 'Saving...' : editingBrand ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
