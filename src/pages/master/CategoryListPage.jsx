import { Pencil, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'

const emptyForm = {
  code: '',
  name: '',
  parentCategoryId: '',
  description: '',
  sortOrder: 0,
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

function getDescendantIds(category) {
  if (!category) return []

  return (category.children || []).flatMap((child) => [child.id, ...getDescendantIds(child)])
}

function toApiPayload(values) {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    parentCategoryId: values.parentCategoryId || null,
    description: values.description.trim() || null,
    sortOrder: Number(values.sortOrder) || 0,
  }
}

export default function CategoryListPage() {
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const flatCategories = useMemo(() => flattenCategories(categories), [categories])

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const items = await masterService.listCategories()
      setCategories(items)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load categories.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase()

    return flatCategories.filter((category) => {
      if (!query) return true

      return [category.code, category.name, category.description, category.parentCategory?.name]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [flatCategories, search])

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / pageSize))
  const pagedCategories = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredCategories.slice(start, start + pageSize)
  }, [filteredCategories, page])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const parentOptions = useMemo(() => {
    const blockedIds = new Set([editingCategory?.id, ...getDescendantIds(editingCategory)])
    return flatCategories.filter((category) => !blockedIds.has(category.id))
  }, [editingCategory, flatCategories])

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function resetForm() {
    setEditingCategory(null)
    setForm(emptyForm)
  }

  function openEdit(category) {
    setEditingCategory(category)
    setForm({
      code: category.code,
      name: category.name,
      parentCategoryId: category.parentCategoryId || '',
      description: category.description || '',
      sortOrder: category.sortOrder || 0,
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

      if (editingCategory) {
        await masterService.updateCategory(editingCategory.id, payload)
        toast.success('Category updated.')
      } else {
        await masterService.createCategory(payload)
        toast.success('Category created.')
      }

      await loadCategories()
      resetForm()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to save category.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeactivate(category) {
    if (!window.confirm(`Deactivate ${category.name}?`)) return

    try {
      await masterService.deleteCategory(category.id)
      toast.success('Category deactivated.')
      await loadCategories()
      if (editingCategory?.id === category.id) {
        resetForm()
      }
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Unable to deactivate category.'))
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        gap: 14,
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            Product Categories
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage product category codes, hierarchy, and sort order.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 400px',
          gap: 16,
          alignItems: 'stretch',
          minHeight: 0,
        }}
      >
        <div
          className="panel"
          style={{
            padding: '14px 16px',
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr) auto',
            minHeight: 0,
          }}
        >
          <div style={{ position: 'relative', marginBottom: 12 }}>
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
              placeholder="Search categories..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: '100%', height: 36, paddingLeft: 36, background: 'rgba(0,0,0,0.15)' }}
            />
          </div>

          <div className="overflow-x-auto" style={{ minHeight: 0, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Parent</th>
                  <th>Description</th>
                  <th>Sort</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-sm text-[var(--color-text-muted)]"
                    >
                      Loading categories...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-sm text-[var(--color-danger)]"
                    >
                      {error}
                    </td>
                  </tr>
                ) : filteredCategories.length ? (
                  pagedCategories.map((category) => (
                    <tr key={category.id}>
                      <td>
                        <span
                          className="mono text-xs font-semibold"
                          style={{ color: 'var(--color-amber)' }}
                        >
                          {category.code}
                        </span>
                      </td>
                      <td
                        className="text-sm font-medium"
                        style={{
                          color: 'var(--color-text-primary)',
                          paddingLeft: 10 + category.level * 18,
                        }}
                      >
                        {category.name}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {category.parentCategory?.name || '-'}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        <span
                          style={{
                            display: 'block',
                            maxWidth: 220,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={category.description || '-'}
                        >
                          {category.description || '-'}
                        </span>
                      </td>
                      <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {category.sortOrder}
                      </td>
                      <td>
                        <StatusBadge status={category.status} />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit category"
                          style={{ width: 28, height: 28, marginRight: 6 }}
                          onClick={() => openEdit(category)}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Deactivate category"
                          disabled={!category.isActive}
                          style={{ width: 28, height: 28, opacity: category.isActive ? 1 : 0.45 }}
                          onClick={() => handleDeactivate(category)}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-sm text-[var(--color-text-muted)]"
                    >
                      No categories found.
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
              paddingTop: 12,
              borderTop: '1px solid var(--color-border)',
              marginTop: 12,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
              Showing {pagedCategories.length} of {filteredCategories.length} categories
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
            padding: '16px 20px',
            display: 'grid',
            gridTemplateRows: editingCategory
              ? 'auto auto auto auto minmax(52px, 1fr) auto auto'
              : 'auto auto auto auto minmax(52px, 1fr) auto',
            gap: 10,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 650, color: 'var(--color-text-primary)' }}>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </p>
              {editingCategory ? (
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
              Keep category details clear for product setup.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 112px', gap: 12 }}>
            <div>
              <label className="form-label" style={{ fontSize: 10 }}>
                CODE
              </label>
              <input
                className="form-input"
                placeholder="e.g. BISCUITS"
                value={form.code}
                onChange={(event) => updateField('code', event.target.value)}
                style={{ height: 38 }}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: 10 }}>
                SORT
              </label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={form.sortOrder}
                onChange={(event) => updateField('sortOrder', event.target.value)}
                style={{ height: 38 }}
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              NAME
            </label>
            <input
              className="form-input"
              placeholder="e.g. Biscuits"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              style={{ height: 38 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              PARENT CATEGORY
            </label>
            <select
              className="form-input"
              value={form.parentCategoryId}
              onChange={(event) => updateField('parentCategoryId', event.target.value)}
              style={{ height: 38, cursor: 'pointer' }}
            >
              <option value="">None</option>
              {parentOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {'--'.repeat(category.level)} {category.name} ({category.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 10 }}>
              DESCRIPTION
            </label>
            <textarea
              className="form-input"
              placeholder="Optional description"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              style={{ width: '100%', height: 'calc(100% - 20px)', paddingTop: 10, resize: 'none' }}
            />
          </div>

          {editingCategory ? (
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
              Status is controlled by the backend deactivate endpoint.
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
              {isSaving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
