import { useQuery } from '@tanstack/react-query'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { masterService } from '@services/api/masterService'
import { formatDate } from '@/utils'

const emptyForm = {
  categoryId: '',
  discountPercent: '',
  effectiveFrom: '',
  effectiveTo: '',
  notes: '',
}

const pageSize = 8

function getErrorMessage(error, fallback = 'Something went wrong') {
  return error?.message || fallback
}

function flattenCategories(categories, level = 0) {
  return categories.flatMap((category) => [
    { ...category, level },
    ...flattenCategories(category.children || [], level + 1),
  ])
}

function toDateInputValue(value) {
  if (!value) return ''

  return String(value).slice(0, 10)
}

function toIsoDate(value) {
  return value ? `${value}T00:00:00.000Z` : null
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`
}

function StatusBadge({ isActive }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: isActive ? 'rgba(34, 197, 94, 0.16)' : 'rgba(148, 163, 184, 0.14)',
        color: isActive ? 'rgb(74, 222, 128)' : 'rgb(148, 163, 184)',
      }}
    >
      {isActive ? 'ACTIVE' : 'INACTIVE'}
    </span>
  )
}

export default function CategoryDiscountList() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [editingDiscount, setEditingDiscount] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)

  const {
    data: discounts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['category-discounts'],
    queryFn: () => masterService.listCategoryDiscounts(),
  })

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => masterService.listCategories(),
  })

  const flatCategories = useMemo(() => flattenCategories(categories), [categories])
  const categoryById = useMemo(
    () => Object.fromEntries(flatCategories.map((category) => [category.id, category])),
    [flatCategories]
  )

  const filteredDiscounts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return discounts.filter((discount) => {
      const categoryName =
        discount.categoryName || categoryById[discount.categoryId]?.name || discount.categoryId || ''
      const matchesSearch =
        !query ||
        [categoryName, discount.notes, discount.discountPercent]
          .join(' ')
          .toLowerCase()
          .includes(query)
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && discount.isActive) ||
        (statusFilter === 'Inactive' && !discount.isActive)

      return matchesSearch && matchesStatus
    })
  }, [categoryById, discounts, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredDiscounts.length / pageSize))
  const pagedDiscounts = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredDiscounts.slice(start, start + pageSize)
  }, [filteredDiscounts, page])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setEditingDiscount(null)
    setFormData(emptyForm)
  }

  function openEdit(discount) {
    setEditingDiscount(discount)
    setFormData({
      categoryId: discount.categoryId || '',
      discountPercent: String(discount.discountPercent ?? ''),
      effectiveFrom: toDateInputValue(discount.effectiveFrom),
      effectiveTo: toDateInputValue(discount.effectiveTo),
      notes: discount.notes || '',
    })
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

  async function handleSave(event) {
    event.preventDefault()

    if (!editingDiscount && !formData.categoryId) {
      toast.error('Category is required.')
      return
    }

    if (!formData.discountPercent || Number(formData.discountPercent) < 0) {
      toast.error('Discount percent is required.')
      return
    }

    if (!editingDiscount && !formData.effectiveFrom) {
      toast.error('Effective From is required.')
      return
    }

    setIsSaving(true)

    try {
      if (editingDiscount) {
        await masterService.updateCategoryDiscount(editingDiscount.id, {
          discountPercent: parseFloat(formData.discountPercent),
          effectiveTo: toIsoDate(formData.effectiveTo),
          notes: formData.notes.trim() || null,
        })
        toast.success('Category discount updated.')
      } else {
        await masterService.createCategoryDiscount({
          categoryId: formData.categoryId,
          discountPercent: parseFloat(formData.discountPercent),
          effectiveFrom: toIsoDate(formData.effectiveFrom),
          effectiveTo: toIsoDate(formData.effectiveTo),
          notes: formData.notes.trim() || null,
        })
        toast.success('Category discount created.')
      }

      await refetch()
      resetForm()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to save category discount.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeactivate(discount) {
    if (!(await window.confirm('Deactivate this category discount?'))) return

    try {
      await masterService.deactivateCategoryDiscount(discount.id)
      toast.success('Category discount deactivated.')
      await refetch()

      if (editingDiscount?.id === discount.id) {
        resetForm()
      }
    } catch (deactivateError) {
      toast.error(getErrorMessage(deactivateError, 'Unable to deactivate category discount.'))
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
            Category Discounts (GRTS)
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage CBL supplier promotional discounts per product category.
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
            placeholder="Search discounts..."
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
                  <th>Category</th>
                  <th>Disc %</th>
                  <th>Effective From</th>
                  <th>Effective To</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                      Loading category discounts...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-danger">
                      {getErrorMessage(error, 'Unable to load category discounts.')}
                    </td>
                  </tr>
                ) : filteredDiscounts.length ? (
                  pagedDiscounts.map((discount) => {
                    const category =
                      categoryById[discount.categoryId]?.name ||
                      discount.categoryName ||
                      discount.category?.name ||
                      discount.categoryId ||
                      '-'

                    return (
                      <tr key={discount.id} style={{ opacity: discount.isActive ? 1 : 0.58 }}>
                        <td
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {category}
                        </td>
                        <td className="mono text-xs" style={{ color: 'var(--color-amber)' }}>
                          {formatPercent(discount.discountPercent)}
                        </td>
                        <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {formatDate(discount.effectiveFrom)}
                        </td>
                        <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {discount.effectiveTo ? formatDate(discount.effectiveTo) : 'Open-ended'}
                        </td>
                        <td>
                          <StatusBadge isActive={discount.isActive} />
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {discount.isActive ? (
                            <>
                              <button
                                type="button"
                                className="icon-button"
                                title="Edit discount"
                                style={{ width: 28, height: 28, marginRight: 6 }}
                                onClick={() => openEdit(discount)}
                              >
                                <Pencil style={{ width: 13, height: 13 }} />
                              </button>
                              <button
                                type="button"
                                className="icon-button"
                                title="Deactivate discount"
                                style={{ width: 28, height: 28 }}
                                onClick={() => handleDeactivate(discount)}
                              >
                                <Trash2 style={{ width: 13, height: 13 }} />
                              </button>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                      No category discounts found.
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
              Showing {pagedDiscounts.length} of {filteredDiscounts.length} discounts
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
                {editingDiscount ? 'Edit Category Discount' : 'Add New Category Discount'}
              </p>
              {editingDiscount ? (
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
              Discounts are applied to invoice lines from the selected category.
            </p>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              CATEGORY
            </label>
            <select
              className="form-input"
              value={formData.categoryId}
              disabled={isLoadingCategories || Boolean(editingDiscount)}
              onChange={(event) => updateField('categoryId', event.target.value)}
              style={{ height: 38, cursor: editingDiscount ? 'default' : 'pointer' }}
            >
              <option value="">{isLoadingCategories ? 'Loading categories...' : 'Select category'}</option>
              {flatCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {'--'.repeat(category.level)} {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              DISCOUNT %
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              placeholder="8.00"
              value={formData.discountPercent}
              onChange={(event) => updateField('discountPercent', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              EFFECTIVE FROM
            </label>
            <input
              type="date"
              className="form-input"
              value={formData.effectiveFrom}
              disabled={Boolean(editingDiscount)}
              onChange={(event) => updateField('effectiveFrom', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              EFFECTIVE TO
            </label>
            <input
              type="date"
              className="form-input"
              value={formData.effectiveTo}
              onChange={(event) => updateField('effectiveTo', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              NOTES
            </label>
            <textarea
              className="form-input"
              placeholder="e.g. CBL Jul 2026 promo"
              value={formData.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              style={{ width: '100%', height: 84, paddingTop: 10, resize: 'none' }}
            />
          </div>

          {editingDiscount ? (
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
              Category and effective from date cannot be changed from this backend endpoint.
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
              {isSaving ? 'Saving...' : editingDiscount ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
