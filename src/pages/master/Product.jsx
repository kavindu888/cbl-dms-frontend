import { zodResolver } from '@hookform/resolvers/zod'
import { Package, Pencil, Plus, Search, Trash2, Copy } from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'
import { useAuthStore } from '@stores/authStore'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'

// ── Validation Schema ───────────────────────────────────────────────────
const productSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required'),
  barcode: z.string().trim().optional().or(z.literal('')),
  name: z.string().trim().min(1, 'Product name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  uomBase: z.string().trim().min(1, 'Base UOM is required'),
  unitCost: z.coerce.number().min(0, 'Unit cost must be non-negative'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be non-negative'),
  minValue: z.coerce.number().optional().nullable(),
  maxValue: z.coerce.number().optional().nullable(),
  imageUrl: z.string().trim().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
})

const productPageSize = 8

// Helper to robustly extract only leaf categories (subcategories only, which have a parent and no children)
function getLeafCategories(categoriesList) {
  // 1. Flatten all categories in case it's a tree structure
  const allCategories = []
  function flatten(category) {
    if (!category) return
    allCategories.push(category)
    if (category.children && category.children.length > 0) {
      category.children.forEach(flatten)
    }
  }
  categoriesList.forEach(flatten)

  // 2. Filter duplicates by ID (e.g. if root categories and children are returned in a flat array)
  const uniqueCategories = []
  const seenIds = new Set()
  allCategories.forEach((c) => {
    if (c.id && !seenIds.has(c.id)) {
      seenIds.add(c.id)
      uniqueCategories.push(c)
    }
  })

  // 3. Identify all category IDs that act as a parent
  const parentIds = new Set()
  uniqueCategories.forEach((c) => {
    if (c.parentCategoryId) {
      parentIds.add(c.parentCategoryId)
    }
  })

  // 4. Map categories for fast lookup to build hierarchical path
  const categoryMap = new Map(uniqueCategories.map((c) => [c.id, c]))

  function getCategoryPath(c) {
    const parts = [c.name]
    let current = c
    while (current.parentCategoryId && categoryMap.has(current.parentCategoryId)) {
      current = categoryMap.get(current.parentCategoryId)
      parts.unshift(current.name)
    }
    return parts.join(' > ')
  }

  // 5. Filter for categories that:
  // - have a parent category (is a subcategory)
  // - do not have any child categories (is a leaf)
  const leafList = []
  uniqueCategories.forEach((c) => {
    const isParent = parentIds.has(c.id) || (c.children && c.children.length > 0)
    const hasParent = !!c.parentCategoryId || !!c.parentCategory
    if (!isParent && hasParent) {
      leafList.push({
        ...c,
        displayName: getCategoryPath(c),
      })
    }
  })

  return leafList
}

function UomConversionsManager({
  productId,
  conversions = [],
  onRefresh,
  canManage = false,
  unitsOfMeasure = [],
}) {
  const [fromUom, setFromUom] = useState('')
  const [toUom, setToUom] = useState('')
  const [factor, setFactor] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [editFromUom, setEditFromUom] = useState('')
  const [editToUom, setEditToUom] = useState('')
  const [editFactor, setEditFactor] = useState(1)
  const [isUpdating, setIsUpdating] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!fromUom || !toUom || factor <= 0) {
      toast.error('All conversion fields are required, and factor must be positive.')
      return
    }

    setIsAdding(true)
    try {
      await masterService.addUomConversion(productId, {
        fromUom: fromUom.trim(),
        toUom: toUom.trim(),
        conversionFactor: Number(factor),
      })
      toast.success('UOM Conversion added.')
      setFromUom('')
      setToUom('')
      setFactor(1)
      onRefresh()
    } catch (err) {
      toast.error(err.message || 'Unable to add UOM conversion.')
    } finally {
      setIsAdding(false)
    }
  }

  function startEdit(conversion) {
    setEditingId(conversion.id)
    setEditFromUom(conversion.fromUom)
    setEditToUom(conversion.toUom)
    setEditFactor(conversion.factor)
  }

  function cancelEdit() {
    setEditingId('')
    setEditFromUom('')
    setEditToUom('')
    setEditFactor(1)
  }

  async function handleUpdate(conversionId) {
    if (!editFromUom || !editToUom || Number(editFactor) <= 0) {
      toast.error('All conversion fields are required, and factor must be positive.')
      return
    }

    setIsUpdating(true)
    try {
      await masterService.updateUomConversion(productId, conversionId, {
        fromUom: editFromUom.trim(),
        toUom: editToUom.trim(),
        conversionFactor: Number(editFactor),
      })
      toast.success('UOM Conversion updated.')
      cancelEdit()
      onRefresh()
    } catch (err) {
      toast.error(err.message || 'Unable to update UOM conversion.')
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleDelete(conversionId) {
    try {
      await masterService.removeUomConversion(productId, conversionId)
      toast.success('UOM Conversion removed.')
      if (editingId === conversionId) {
        cancelEdit()
      }
      onRefresh()
    } catch (err) {
      toast.error(err.message || 'Unable to remove UOM conversion.')
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 16 }}>
      <label className="form-label" style={{ fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
        UOM CONVERSIONS
      </label>

      {/* List of current conversions */}
      {conversions.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-dim)', marginBottom: 12 }}>
          No unit conversions defined for this product yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {conversions.map((conv) => (
            <div
              key={conv.id}
              style={{
                display: 'grid',
                gridTemplateColumns: editingId === conv.id ? '1.2fr 1.2fr 0.6fr auto' : '1fr auto',
                alignItems: 'end',
                gap: 12,
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.12)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
              }}
            >
              {editingId === conv.id ? (
                <>
                  <select
                    className="form-input"
                    value={editFromUom}
                    onChange={(e) => setEditFromUom(e.target.value)}
                    style={{
                      height: 38,
                      fontSize: 13,
                      backgroundColor: 'rgba(0,0,0,0.15)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                    aria-label="From UOM"
                  >
                    <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
                      Select UOM
                    </option>
                    {editFromUom && !unitsOfMeasure.some((unit) => unit.code === editFromUom) && (
                      <option
                        value={editFromUom}
                        style={{
                          background: 'var(--color-bg-elevated)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {editFromUom}
                      </option>
                    )}
                    {unitsOfMeasure.map((unit) => (
                      <option
                        key={unit.id}
                        value={unit.code}
                        style={{
                          background: 'var(--color-bg-elevated)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {unit.code}
                      </option>
                    ))}
                  </select>
                  <select
                    className="form-input"
                    value={editToUom}
                    onChange={(e) => setEditToUom(e.target.value)}
                    style={{
                      height: 38,
                      fontSize: 13,
                      backgroundColor: 'rgba(0,0,0,0.15)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                    aria-label="To UOM"
                  >
                    <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
                      Select UOM
                    </option>
                    {editToUom && !unitsOfMeasure.some((unit) => unit.code === editToUom) && (
                      <option
                        value={editToUom}
                        style={{
                          background: 'var(--color-bg-elevated)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {editToUom}
                      </option>
                    )}
                    {unitsOfMeasure.map((unit) => (
                      <option
                        key={unit.id}
                        value={unit.code}
                        style={{
                          background: 'var(--color-bg-elevated)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {unit.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="form-input"
                    value={editFactor}
                    onChange={(e) => setEditFactor(e.target.value)}
                    style={{ height: 38, fontSize: 13 }}
                    aria-label="Conversion factor"
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => handleUpdate(conv.id)}
                      disabled={isUpdating}
                      style={{ height: 38, padding: '0 12px', fontSize: 12 }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={cancelEdit}
                      disabled={isUpdating}
                      style={{ height: 38, padding: '0 12px', fontSize: 12 }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    1 {conv.fromUom} = {conv.factor} {conv.toUom}
                  </span>
                  {canManage ? (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => startEdit(conv)}
                        title="Edit conversion"
                        style={{ width: 28, height: 28 }}
                      >
                        <Pencil style={{ width: 14, height: 14 }} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDelete(conv.id)}
                        title="Remove conversion"
                        style={{ color: 'var(--color-red)', width: 28, height: 28 }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Conversion Form */}
      {canManage ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.2fr 0.6fr auto',
            gap: 12,
            alignItems: 'end',
            background: 'rgba(0,0,0,0.06)',
            padding: 12,
            borderRadius: 8,
            border: '1px dashed var(--color-border)',
          }}
        >
          <div>
            <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>
              FROM UOM
            </label>
            <select
              className="form-input w-full"
              value={fromUom}
              onChange={(e) => setFromUom(e.target.value)}
              style={{
                height: 38,
                fontSize: 13,
                backgroundColor: 'rgba(0,0,0,0.15)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
                Select UOM
              </option>
              {fromUom && !unitsOfMeasure.some((unit) => unit.code === fromUom) && (
                <option
                  value={fromUom}
                  style={{
                    background: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {fromUom}
                </option>
              )}
              {unitsOfMeasure.map((unit) => (
                <option
                  key={unit.id}
                  value={unit.code}
                  style={{
                    background: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {unit.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>
              TO UOM
            </label>
            <select
              className="form-input w-full"
              value={toUom}
              onChange={(e) => setToUom(e.target.value)}
              style={{
                height: 38,
                fontSize: 13,
                backgroundColor: 'rgba(0,0,0,0.15)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
                Select UOM
              </option>
              {toUom && !unitsOfMeasure.some((unit) => unit.code === toUom) && (
                <option
                  value={toUom}
                  style={{
                    background: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {toUom}
                </option>
              )}
              {unitsOfMeasure.map((unit) => (
                <option
                  key={unit.id}
                  value={unit.code}
                  style={{
                    background: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {unit.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>
              FACTOR
            </label>
            <input
              type="number"
              className="form-input"
              value={factor}
              onChange={(e) => setFactor(e.target.value)}
              style={{ height: 38, fontSize: 13 }}
            />
          </div>
          <button
            type="button"
            className="button-primary"
            onClick={handleAdd}
            disabled={isAdding}
            style={{ height: 38, padding: '0 16px', fontSize: 13 }}
          >
            {isAdding ? 'Adding...' : 'Add'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

// ── Form Modal Component ──────────────────────────────────────────────────
function NewProductUomConversionsManager({
  conversions,
  onChange,
  onAfterAdd,
  canManage = false,
  unitsOfMeasure = [],
}) {
  const [fromUom, setFromUom] = useState('')
  const [toUom, setToUom] = useState('')
  const [factor, setFactor] = useState(1)
  const [editingId, setEditingId] = useState('')
  const [editFromUom, setEditFromUom] = useState('')
  const [editToUom, setEditToUom] = useState('')
  const [editFactor, setEditFactor] = useState(1)

  function hasDuplicate(from, to, ignoredId = '') {
    return conversions.some(
      (item) =>
        item.id !== ignoredId &&
        item.fromUom.toUpperCase() === from.toUpperCase() &&
        item.toUom.toUpperCase() === to.toUpperCase()
    )
  }

  function handleAdd() {
    const nextFromUom = fromUom.trim().toUpperCase()
    const nextToUom = toUom.trim().toUpperCase()
    const nextFactor = Number(factor)

    if (!nextFromUom || !nextToUom || nextFactor <= 0) {
      toast.error('All conversion fields are required, and factor must be positive.')
      return
    }

    if (hasDuplicate(nextFromUom, nextToUom)) {
      toast.error('This UOM conversion is already added.')
      return
    }

    onChange([
      ...conversions,
      {
        id: `${Date.now()}-${nextFromUom}-${nextToUom}`,
        fromUom: nextFromUom,
        toUom: nextToUom,
        factor: nextFactor,
      },
    ])
    setFromUom('')
    setToUom('')
    setFactor(1)
    onAfterAdd?.()
  }

  function startEdit(conversion) {
    setEditingId(conversion.id)
    setEditFromUom(conversion.fromUom)
    setEditToUom(conversion.toUom)
    setEditFactor(conversion.factor)
  }

  function cancelEdit() {
    setEditingId('')
    setEditFromUom('')
    setEditToUom('')
    setEditFactor(1)
  }

  function handleUpdate(conversionId) {
    const nextFromUom = editFromUom.trim().toUpperCase()
    const nextToUom = editToUom.trim().toUpperCase()
    const nextFactor = Number(editFactor)

    if (!nextFromUom || !nextToUom || nextFactor <= 0) {
      toast.error('All conversion fields are required, and factor must be positive.')
      return
    }

    if (hasDuplicate(nextFromUom, nextToUom, conversionId)) {
      toast.error('This UOM conversion is already added.')
      return
    }

    onChange(
      conversions.map((item) =>
        item.id === conversionId
          ? { ...item, fromUom: nextFromUom, toUom: nextToUom, factor: nextFactor }
          : item
      )
    )
    cancelEdit()
  }

  function handleDelete(conversionId) {
    onChange(conversions.filter((item) => item.id !== conversionId))
    if (editingId === conversionId) {
      cancelEdit()
    }
  }

  if (!canManage) return null

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
      <label className="form-label" style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
        UOM CONVERSIONS
      </label>

      {conversions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {conversions.map((conv) => (
            <div
              key={conv.id}
              style={{
                display: 'grid',
                gridTemplateColumns: editingId === conv.id ? '1.2fr 1.2fr 0.6fr auto' : '1fr auto',
                alignItems: 'end',
                gap: 12,
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.12)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
              }}
            >
              {editingId === conv.id ? (
                <>
                  <select
                    className="form-input"
                    value={editFromUom}
                    onChange={(e) => setEditFromUom(e.target.value)}
                    style={{
                      height: 38,
                      fontSize: 13,
                      backgroundColor: 'rgba(0,0,0,0.15)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                    aria-label="From UOM"
                  >
                    <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
                      Select UOM
                    </option>
                    {editFromUom && !unitsOfMeasure.some((unit) => unit.code === editFromUom) && (
                      <option
                        value={editFromUom}
                        style={{
                          background: 'var(--color-bg-elevated)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {editFromUom}
                      </option>
                    )}
                    {unitsOfMeasure.map((unit) => (
                      <option
                        key={unit.id}
                        value={unit.code}
                        style={{
                          background: 'var(--color-bg-elevated)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {unit.code}
                      </option>
                    ))}
                  </select>
                  <select
                    className="form-input"
                    value={editToUom}
                    onChange={(e) => setEditToUom(e.target.value)}
                    style={{
                      height: 38,
                      fontSize: 13,
                      backgroundColor: 'rgba(0,0,0,0.15)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                    aria-label="To UOM"
                  >
                    <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
                      Select UOM
                    </option>
                    {editToUom && !unitsOfMeasure.some((unit) => unit.code === editToUom) && (
                      <option
                        value={editToUom}
                        style={{
                          background: 'var(--color-bg-elevated)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {editToUom}
                      </option>
                    )}
                    {unitsOfMeasure.map((unit) => (
                      <option
                        key={unit.id}
                        value={unit.code}
                        style={{
                          background: 'var(--color-bg-elevated)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {unit.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="form-input"
                    value={editFactor}
                    onChange={(e) => setEditFactor(e.target.value)}
                    style={{ height: 38, fontSize: 13 }}
                    aria-label="Conversion factor"
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => handleUpdate(conv.id)}
                      style={{ height: 38, padding: '0 12px', fontSize: 12 }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={cancelEdit}
                      style={{ height: 38, padding: '0 12px', fontSize: 12 }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    1 {conv.fromUom} = {conv.factor} {conv.toUom}
                  </span>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => startEdit(conv)}
                      title="Edit conversion"
                      style={{ width: 28, height: 28 }}
                    >
                      <Pencil style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDelete(conv.id)}
                      title="Remove conversion"
                      style={{ color: 'var(--color-red)', width: 28, height: 28 }}
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.2fr 0.6fr auto',
          gap: 12,
          alignItems: 'end',
          background: 'rgba(0,0,0,0.06)',
          padding: 12,
          borderRadius: 8,
          border: '1px dashed var(--color-border)',
        }}
      >
        <div>
          <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>
            FROM UOM
          </label>
          <select
            className="form-input w-full"
            value={fromUom}
            onChange={(e) => setFromUom(e.target.value)}
            style={{
              height: 38,
              fontSize: 13,
              backgroundColor: 'rgba(0,0,0,0.15)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
              Select UOM
            </option>
            {fromUom && !unitsOfMeasure.some((unit) => unit.code === fromUom) && (
              <option
                value={fromUom}
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {fromUom}
              </option>
            )}
            {unitsOfMeasure.map((unit) => (
              <option
                key={unit.id}
                value={unit.code}
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {unit.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>
            TO UOM
          </label>
          <select
            className="form-input w-full"
            value={toUom}
            onChange={(e) => setToUom(e.target.value)}
            style={{
              height: 38,
              fontSize: 13,
              backgroundColor: 'rgba(0,0,0,0.15)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
              Select UOM
            </option>
            {toUom && !unitsOfMeasure.some((unit) => unit.code === toUom) && (
              <option
                value={toUom}
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {toUom}
              </option>
            )}
            {unitsOfMeasure.map((unit) => (
              <option
                key={unit.id}
                value={unit.code}
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {unit.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>
            FACTOR
          </label>
          <input
            type="number"
            className="form-input"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            style={{ height: 38, fontSize: 13 }}
          />
        </div>
        <button
          type="button"
          className="button-primary"
          onClick={handleAdd}
          style={{ height: 38, padding: '0 16px', fontSize: 13 }}
        >
          Add
        </button>
      </div>
    </div>
  )
}

function ProductForm({
  product,
  categories,
  unitsOfMeasure,
  canManageCategory,
  canManageUom,
  onCancel,
  onSaved,
  onCategoryCreated,
  onUomCreated,
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState({ code: '', name: '' })
  const [showUomForm, setShowUomForm] = useState(false)
  const [isSavingUom, setIsSavingUom] = useState(false)
  const [newUom, setNewUom] = useState({ code: '', name: '', category: 'General' })
  const [newUomConversions, setNewUomConversions] = useState([])
  const defaultUom = unitsOfMeasure[0]?.code || ''

  const leafCategories = useMemo(() => {
    const leaves = getLeafCategories(categories)
    if (product?.category && !leaves.some((c) => c.id === product.category.id)) {
      leaves.push({
        ...product.category,
        displayName: product.category.name,
      })
    }
    return leaves
  }, [categories, product])

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      barcode: '',
      name: '',
      categoryId: '',
      uomBase: '',
      unitCost: 0,
      unitPrice: 0,
      minValue: null,
      maxValue: null,
      imageUrl: '',
      isActive: true,
    },
  })

  useEffect(() => {
    setNewUomConversions([])
    setShowCategoryForm(false)
    setShowUomForm(false)
    setNewCategory({ code: '', name: '' })
    setNewUom({ code: '', name: '', category: 'General' })
    if (product) {
      reset({
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        categoryId: product.category?.id || '',
        uomBase: product.uomBase,
        unitCost: product.unitCost,
        unitPrice: product.unitPrice,
        minValue: product.minValue,
        maxValue: product.maxValue,
        imageUrl: product.imageUrl || '',
        isActive: product.isActive,
      })
    } else {
      reset({
        sku: '',
        barcode: '',
        name: '',
        categoryId: leafCategories[0]?.id || '',
        uomBase: defaultUom,
        unitCost: 0,
        unitPrice: 0,
        minValue: null,
        maxValue: null,
        imageUrl: '',
        isActive: true,
      })
    }

    window.setTimeout(() => setFocus('sku'), 0)
  }, [product, leafCategories, defaultUom, reset, setFocus])

  async function handleCreateCategory() {
    const code = newCategory.code.trim().toUpperCase()
    const name = newCategory.name.trim()

    if (!code || !name) {
      toast.error('Category code and name are required.')
      return
    }

    setIsSavingCategory(true)

    try {
      const savedCategory = await masterService.createCategory({
        code,
        name,
        parentCategoryId: null,
        description: null,
        sortOrder: 0,
      })

      onCategoryCreated(savedCategory)
      setValue('categoryId', savedCategory.id, { shouldValidate: true })
      setNewCategory({ code: '', name: '' })
      setShowCategoryForm(false)
      toast.success('Category added.')
    } catch (err) {
      toast.error(err.message || 'Unable to add category.')
    } finally {
      setIsSavingCategory(false)
    }
  }

  async function handleCreateUom() {
    const code = newUom.code.trim().toUpperCase()
    const name = newUom.name.trim()
    const category = newUom.category.trim() || 'General'

    if (!code || !name) {
      toast.error('UOM code and name are required.')
      return
    }

    setIsSavingUom(true)

    try {
      const savedUom = await masterService.createUnitOfMeasure({
        code,
        name,
        description: null,
        category,
      })

      onUomCreated(savedUom)
      setValue('uomBase', savedUom.code, { shouldValidate: true })
      setNewUom({ code: '', name: '', category: 'General' })
      setShowUomForm(false)
      toast.success('Base UOM added.')
    } catch (err) {
      toast.error(err.message || 'Unable to add base UOM.')
    } finally {
      setIsSavingUom(false)
    }
  }

  async function onSubmit(values) {
    setIsSaving(true)
    try {
      const payload = {
        sku: values.sku.trim(),
        name: values.name.trim(),
        barcode: values.barcode?.trim() || null,
        categoryId: values.categoryId,
        baseUom: values.uomBase.trim(),
        costPrice: Number(values.unitCost),
        sellingPrice: Number(values.unitPrice),
        minValue:
          values.minValue !== null && values.minValue !== undefined && values.minValue !== ''
            ? Number(values.minValue)
            : null,
        maxValue:
          values.maxValue !== null && values.maxValue !== undefined && values.maxValue !== ''
            ? Number(values.maxValue)
            : null,
        description: null,
        imageUrl: values.imageUrl?.trim() || null,
      }

      let savedProduct
      if (product) {
        savedProduct = await masterService.updateProduct(product.id, payload)
        if (product.isActive !== values.isActive) {
          savedProduct = await masterService.updateProductStatus(product.id, values.isActive)
        }
        toast.success(`Product updated successfully.`)
        onSaved(savedProduct)
      } else {
        savedProduct = await masterService.createProduct(payload)
        for (const conversion of newUomConversions) {
          await masterService.addUomConversion(savedProduct.id, {
            fromUom: conversion.fromUom,
            toUom: conversion.toUom,
            conversionFactor: Number(conversion.factor),
          })
        }
        if (newUomConversions.length > 0) {
          savedProduct = await masterService.getProduct(savedProduct.id)
        }
        if (!values.isActive) {
          savedProduct = await masterService.updateProductStatus(savedProduct.id, false)
        }
        toast.success(`Product ${values.name} created successfully.`)
        onSaved(savedProduct)
        reset({
          sku: '',
          barcode: '',
          name: '',
          categoryId: values.categoryId || leafCategories[0]?.id || '',
          uomBase: values.uomBase || defaultUom,
          unitCost: 0,
          unitPrice: 0,
          minValue: null,
          maxValue: null,
          imageUrl: '',
          isActive: true,
        })
        setNewUomConversions([])
        setTimeout(() => setFocus('sku'), 0)
      }
    } catch (err) {
      toast.error(err.message || 'Unable to save product.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter') {
      const target = e.target
      if (target.tagName === 'BUTTON' || (target.tagName === 'TEXTAREA' && e.shiftKey)) {
        return
      }
      e.preventDefault()
      const form = e.currentTarget
      const focusable = Array.from(
        form.querySelectorAll(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]):not([data-skip-focus="true"])'
        )
      )
      const index = focusable.indexOf(target)
      if (index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus()
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={handleFormKeyDown}
      className="panel"
      style={{
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 0,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          paddingBottom: 10,
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 650, color: 'var(--color-text-primary)' }}>
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <p
            style={{
              marginTop: 4,
              fontSize: 12,
              color: 'var(--color-text-muted)',
              lineHeight: 1.35,
            }}
          >
            {product
              ? 'Modify details and unit conversions for this catalog product.'
              : 'Register a new product in the system catalog.'}
          </p>
        </div>
        {product ? (
          <button
            type="button"
            className="button-ghost"
            onClick={onCancel}
            style={{ padding: '5px 10px', height: 'auto', fontSize: 12 }}
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* SKU and Barcode */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="form-label" style={{ fontSize: 10 }}>
            SKU CODE
          </label>
          <input
            {...register('sku', {
              setValueAs: (v) => v.toUpperCase(),
            })}
            className="form-input w-full"
            placeholder="e.g. CBL-MCK-001"
            style={{ background: 'rgba(0,0,0,0.15)', height: 38, textTransform: 'uppercase' }}
          />
          {errors.sku && (
            <p style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 4 }}>
              {errors.sku.message}
            </p>
          )}
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>
            BARCODE
          </label>
          <input
            {...register('barcode', {
              setValueAs: (v) => v?.toUpperCase(),
            })}
            className="form-input w-full"
            placeholder="e.g. 4891234567890"
            style={{ background: 'rgba(0,0,0,0.15)', height: 38, textTransform: 'uppercase' }}
          />
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="form-label" style={{ fontSize: 10 }}>
          PRODUCT NAME
        </label>
        <input
          {...register('name', {
            setValueAs: (v) => v?.toUpperCase(),
          })}
          className="form-input w-full"
          placeholder="e.g. CBL MUNCHEE COCONUT CRUNCH 200G"
          style={{ background: 'rgba(0,0,0,0.15)', height: 38, textTransform: 'uppercase' }}
        />
        {errors.name && (
          <p style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 4 }}>
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Category and Base UOM */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
              marginBottom: 4,
            }}
          >
            <label className="form-label" style={{ fontSize: 10, marginBottom: 0 }}>
              CATEGORY
            </label>
            {/* {canManageCategory ? (
              <button
                type="button"
                className="icon-button"
                title="Add category"
                onClick={() => setShowCategoryForm((current) => !current)}
                style={{ width: 22, height: 22, borderRadius: 4 }}
              >
                <Plus style={{ width: 12, height: 12 }} />
              </button>
            ) : null} */}
          </div>

          <select
            {...register('categoryId')}
            className="form-input w-full"
            style={{
              backgroundColor: 'rgba(0,0,0,0.15)',
              height: 38,
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
              Select Category
            </option>
            {leafCategories.map((c) => (
              <option
                key={c.id}
                value={c.id}
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {c.displayName}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 4 }}>
              {errors.categoryId.message}
            </p>
          )}
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
              marginBottom: 4,
            }}
          >
            <label className="form-label" style={{ fontSize: 10, marginBottom: 0 }}>
              BASE UOM
            </label>
            {/* {canManageUom ? (
              <button
                type="button"
                className="icon-button"
                title="Add base UOM"
                onClick={() => setShowUomForm((current) => !current)}
                style={{ width: 22, height: 22, borderRadius: 4 }}
              >
                <Plus style={{ width: 12, height: 12 }} />
              </button>
            ) : null} */}
          </div>

          <select
            {...register('uomBase')}
            className="form-input w-full"
            style={{
              backgroundColor: 'rgba(0,0,0,0.15)',
              height: 38,
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
              Select UOM
            </option>
            {product?.uomBase && !unitsOfMeasure.some((unit) => unit.code === product.uomBase) ? (
              <option
                value={product.uomBase}
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {product.uomBase}
              </option>
            ) : null}
            {unitsOfMeasure.map((unit) => (
              <option
                key={unit.id}
                value={unit.code}
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {unit.code}
              </option>
            ))}
          </select>
          {errors.uomBase && (
            <p style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 4 }}>
              {errors.uomBase.message}
            </p>
          )}
        </div>
      </div>

      {/* Category Inline Addition */}
      {showCategoryForm && canManageCategory && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr auto',
            gap: 8,
            padding: 10,
            border: '1px dashed var(--color-border)',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.08)',
          }}
        >
          <input
            className="form-input"
            placeholder="Code"
            value={newCategory.code}
            maxLength={30}
            onChange={(event) =>
              setNewCategory((current) => ({
                ...current,
                code: event.target.value.toUpperCase(),
              }))
            }
            style={{ height: 34, fontSize: 12 }}
          />
          <input
            className="form-input"
            placeholder="Name"
            value={newCategory.name}
            maxLength={200}
            onChange={(event) =>
              setNewCategory((current) => ({ ...current, name: event.target.value }))
            }
            style={{ height: 34, fontSize: 12 }}
          />
          <button
            type="button"
            className="button-primary"
            disabled={isSavingCategory}
            onClick={handleCreateCategory}
            style={{ height: 34, padding: '0 12px', fontSize: 12 }}
          >
            {isSavingCategory ? '...' : 'Add'}
          </button>
        </div>
      )}

      {/* UOM Inline Addition */}
      {showUomForm && canManageUom && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '0.8fr 1.2fr 0.8fr auto',
            gap: 8,
            padding: 10,
            border: '1px dashed var(--color-border)',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.08)',
          }}
        >
          <input
            className="form-input"
            placeholder="Code"
            value={newUom.code}
            maxLength={20}
            onChange={(event) =>
              setNewUom((current) => ({
                ...current,
                code: event.target.value.toUpperCase(),
              }))
            }
            style={{ height: 34, fontSize: 12 }}
          />
          <input
            className="form-input"
            placeholder="Name"
            value={newUom.name}
            maxLength={100}
            onChange={(event) => setNewUom((current) => ({ ...current, name: event.target.value }))}
            style={{ height: 34, fontSize: 12 }}
          />
          <input
            className="form-input"
            placeholder="Category"
            value={newUom.category}
            maxLength={50}
            onChange={(event) =>
              setNewUom((current) => ({ ...current, category: event.target.value }))
            }
            style={{ height: 34, fontSize: 12 }}
          />
          <button
            type="button"
            className="button-primary"
            disabled={isSavingUom}
            onClick={handleCreateUom}
            style={{ height: 34, padding: '0 12px', fontSize: 12 }}
          >
            {isSavingUom ? '...' : 'Add'}
          </button>
        </div>
      )}

      {/* Pricing and Limits (2x2 Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* <div>
          <label className="form-label" style={{ fontSize: 10 }}>
            UNIT COST (RS.)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('unitCost')}
            className="form-input w-full mono"
            style={{ background: 'rgba(0,0,0,0.15)', height: 38 }}
          />
          {errors.unitCost && (
            <p style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 4 }}>
              {errors.unitCost.message}
            </p>
          )}
        </div> */}

        {/* <div>
          <label className="form-label" style={{ fontSize: 10 }}>
            UNIT PRICE (RS.)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('unitPrice')}
            className="form-input w-full mono"
            style={{ background: 'rgba(0,0,0,0.15)', height: 38 }}
          />
          {errors.unitPrice && (
            <p style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 4 }}>
              {errors.unitPrice.message}
            </p>
          )}
        </div> */}

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>
            MIN VALUE
          </label>
          <input
            type="number"
            step="0.01"
            {...register('minValue', {
              setValueAs: (value) => (value === '' ? null : Number(value)),
            })}
            className="form-input w-full mono"
            placeholder="Optional"
            style={{ background: 'rgba(0,0,0,0.15)', height: 38 }}
          />
          {errors.minValue && (
            <p style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 4 }}>
              {errors.minValue.message}
            </p>
          )}
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>
            MAX VALUE
          </label>
          <input
            type="number"
            step="0.01"
            {...register('maxValue', {
              setValueAs: (value) => (value === '' ? null : Number(value)),
            })}
            className="form-input w-full mono"
            placeholder="Optional"
            style={{ background: 'rgba(0,0,0,0.15)', height: 38 }}
          />
          {errors.maxValue && (
            <p style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 4 }}>
              {errors.maxValue.message}
            </p>
          )}
        </div>
      </div>

      {/* UOM Conversions section */}
      {product ? (
        <UomConversionsManager
          productId={product.id}
          conversions={product.uomConversions || []}
          canManage={canManageUom}
          unitsOfMeasure={unitsOfMeasure}
          onRefresh={async () => {
            try {
              const updated = await masterService.getProduct(product.id)
              onSaved(updated)
            } catch (err) {
              console.error('Failed to reload product for UOM update:', err)
            }
          }}
        />
      ) : (
        <NewProductUomConversionsManager
          conversions={newUomConversions}
          canManage={canManageUom}
          unitsOfMeasure={unitsOfMeasure}
          onChange={setNewUomConversions}
          onAfterAdd={() => {
            window.setTimeout(() => {
              document.getElementById('product-submit-button')?.focus()
            }, 0)
          }}
        />
      )}

      {/* Form Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--color-border)',
          marginTop: 'auto',
        }}
      >
        <button
          type="button"
          data-skip-focus="true"
          className="button-secondary"
          onClick={onCancel}
          style={{ flex: 1, height: 38, fontSize: 13 }}
        >
          Cancel
        </button>
        <button
          id="product-submit-button"
          type="submit"
          className="button-primary"
          disabled={isSaving}
          style={{ flex: 1, height: 38, fontSize: 13 }}
        >
          {isSaving ? 'Saving...' : product ? 'Save Changes' : 'Save'}
        </button>
      </div>
    </form>
  )
}

// ── Main Page Component ──────────────────────────────────────────────────
export default function Product() {
  const currentUser = useAuthStore((state) => state.user)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [unitsOfMeasure, setUnitsOfMeasure] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [activeFilter, setActiveFilter] = useState('All') // 'All' | 'Active' | 'Discontinued'

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Loading / Error
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // State
  const [editingProduct, setEditingProduct] = useState(undefined)
  const canManageProducts = userHasPermission(currentUser, PERMISSIONS.masterData.productManage)
  const canManageCategory = userHasPermission(currentUser, PERMISSIONS.masterData.categoryManage)
  const canManageUom = userHasPermission(currentUser, PERMISSIONS.masterData.uomManage)

  // Fetch form reference data on mount
  useEffect(() => {
    async function loadFormData() {
      try {
        const [categoryList, unitList] = await Promise.all([
          masterService.listCategories(),
          masterService.listUnitsOfMeasure(),
        ])

        setCategories(categoryList)
        setUnitsOfMeasure(unitList.filter((unit) => unit.isActive))
      } catch (err) {
        console.error('Failed to load product form data:', err)
      }
    }
    loadFormData()
  }, [])

  // Fetch Products on Mount and filter change
  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const selectedCategory = categories.find((c) => c.name === category)
      const result = await masterService.listProducts({
        page,
        pageSize: productPageSize,
        search: search.trim() || undefined,
        categoryId: selectedCategory ? selectedCategory.id : undefined,
        status: activeFilter,
        sortBy: 'createdAt',
        sortDir: 'asc',
      })
      const listItems = result.items || []
      const detailedItems = await Promise.all(
        listItems.map(async (item) => {
          try {
            return await masterService.getProduct(item.id)
          } catch {
            return item
          }
        })
      )
      setProducts(detailedItems)
      setTotalPages(Math.max(1, result.totalPages || 1))
      setTotalItems(result.totalItems || 0)
    } catch (err) {
      setError(err.message || 'Unable to load products.')
    } finally {
      setIsLoading(false)
    }
  }, [categories, category, page, search, activeFilter])

  // Reload when search, filters, or page updates
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadProducts()
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [loadProducts])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, category, activeFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  function handleAdd() {
    if (!canManageProducts) return
    setEditingProduct(undefined)
    window.setTimeout(() => {
      document.querySelector('input[name="sku"]')?.focus()
    }, 0)
  }

  async function handleEdit(p) {
    if (!canManageProducts) return

    setIsLoading(true)
    try {
      // Get complete product details (with conversions list)
      const fullProduct = await masterService.getProduct(p.id)
      setEditingProduct(fullProduct)
      window.setTimeout(() => {
        document.querySelector('input[name="sku"]')?.focus()
      }, 0)
    } catch (err) {
      toast.error('Failed to load product details.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleCancel() {
    setEditingProduct(undefined)
  }

  function handleSave(savedProduct) {
    if (editingProduct && savedProduct?.id) {
      setEditingProduct(savedProduct)
    } else {
      setEditingProduct(undefined)
    }
    loadProducts()
  }

  function handleCategoryCreated(savedCategory) {
    setCategories((currentCategories) => {
      const exists = currentCategories.some((categoryItem) => categoryItem.id === savedCategory.id)
      return exists
        ? currentCategories.map((categoryItem) =>
            categoryItem.id === savedCategory.id ? savedCategory : categoryItem
          )
        : [...currentCategories, savedCategory]
    })
  }

  function handleUomCreated(savedUom) {
    setUnitsOfMeasure((currentUnits) => {
      const exists = currentUnits.some((unit) => unit.id === savedUom.id)
      return exists
        ? currentUnits.map((unit) => (unit.id === savedUom.id ? savedUom : unit))
        : [...currentUnits, savedUom]
    })
  }

  return (
    <div
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      {/* ── Page Header ── */}
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
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            Products
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage catalog items, barcodes, prices, and unit conversions.
          </p>
        </div>
      </div>

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
            placeholder="Search by SKU, Barcode, or Product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

        {/* Category Dropdown */}
        <div style={{ position: 'relative', width: 200 }}>
          <select
            className="form-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
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
            {categories.map((c) => (
              <option
                key={c.id}
                value={c.name}
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {c.name}
              </option>
            ))}
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

        {/* Active Status Dropdown */}
        <div style={{ position: 'relative', width: 160 }}>
          <select
            className="form-input"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
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
            <option value="Discontinued" style={{ background: 'var(--color-bg-elevated)' }}>
              Discontinued
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

      {/* Main Content Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: canManageProducts ? 'minmax(0, 1fr) 460px' : '1fr',
          gap: 16,
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          className="panel"
          style={{
            padding: 12,
            display: 'grid',
            gridTemplateRows: 'minmax(0, 1fr) auto',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* ── Table ── */}
          <div style={{ minHeight: 0, overflow: 'hidden' }}>
            {isLoading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '64px 0',
                  color: 'var(--color-text-muted)',
                }}
              >
                Loading products...
              </div>
            ) : error ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '64px 0',
                  color: 'var(--color-red)',
                }}
              >
                {error}
              </div>
            ) : products.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '64px 0',
                  gap: 12,
                }}
              >
                <Package style={{ width: 40, height: 40, color: 'var(--color-text-dim)' }} />
                <p style={{ color: 'var(--color-text-muted)' }}>No products match your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table product-table-compact">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product Name & Info</th>
                      <th>Category</th>
                      <th>Base UOM</th>
                      <th>Conversions</th>
                      <th>MIN VALUE</th>
                      <th>MAX VALUE</th>
                      <th>Status</th>
                      {canManageProducts ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      return (
                        <tr key={p.id}>
                          {/* SKU */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span className="product-sku-badge mono">{p.sku}</span>
                              <button
                                type="button"
                                className="copy-btn"
                                title="Copy SKU"
                                onClick={() => {
                                  navigator.clipboard.writeText(p.sku)
                                  toast.success(`SKU "${p.sku}" copied to clipboard`)
                                }}
                              >
                                <Copy style={{ width: 12, height: 12 }} />
                              </button>
                            </div>
                          </td>

                          {/* Product Name & Info */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span className="product-name-title">{p.name}</span>
                              {p.description && (
                                <span className="product-info-sub" title={p.description}>
                                  {p.description}
                                </span>
                              )}
                              {p.barcode && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <span
                                    className="product-info-sub mono"
                                    title={`Barcode: ${p.barcode}`}
                                  >
                                    UPC: {p.barcode}
                                  </span>
                                  <button
                                    type="button"
                                    className="copy-btn"
                                    title="Copy Barcode"
                                    style={{ padding: 1 }}
                                    onClick={() => {
                                      navigator.clipboard.writeText(p.barcode)
                                      toast.success(`Barcode "${p.barcode}" copied to clipboard`)
                                    }}
                                  >
                                    <Copy style={{ width: 10, height: 10 }} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            {p.category?.name || (
                              <span style={{ color: 'var(--color-text-dim)' }}>—</span>
                            )}
                          </td>

                          {/* Base UOM */}
                          <td>
                            <span className="uom-badge">{p.uomBase}</span>
                          </td>

                          {/* Conversions */}
                          <td>
                            <div className="uom-conversions-list">
                              {p.uomConversions && p.uomConversions.length > 0 ? (
                                p.uomConversions.map((conv) => (
                                  <span key={conv.id} className="uom-conversion-pill">
                                    1 {conv.fromUom} = {conv.factor} {conv.toUom}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: 'var(--color-text-dim)', fontSize: 12 }}>
                                  —
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Min Value */}
                          <td
                            className="text-sm mono"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {p.minValue !== null && p.minValue !== undefined ? p.minValue : '—'}
                          </td>

                          {/* Max Value */}
                          <td
                            className="text-sm mono"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {p.maxValue !== null && p.maxValue !== undefined ? p.maxValue : '—'}
                          </td>

                          {/* Status */}
                          <td>
                            <StatusBadge status={p.status} />
                          </td>

                          {/* Actions */}
                          {canManageProducts ? (
                            <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                              <button
                                className="icon-button"
                                title="Edit product"
                                style={{ width: 28, height: 28 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEdit(p)
                                }}
                              >
                                <Pencil style={{ width: 13, height: 13 }} />
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Section */}
          {products.length > 0 && (
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
                Showing {products.length} of {totalItems} items
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

        {canManageProducts && (
          <ProductForm
            product={editingProduct}
            categories={categories}
            unitsOfMeasure={unitsOfMeasure}
            canManageCategory={canManageCategory}
            canManageUom={canManageUom}
            onCancel={handleCancel}
            onSaved={handleSave}
            onCategoryCreated={handleCategoryCreated}
            onUomCreated={handleUomCreated}
          />
        )}
      </div>
    </div>
  )
}
