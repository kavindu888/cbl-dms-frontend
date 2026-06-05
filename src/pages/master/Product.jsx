import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Package, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
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
  reorderLevel: z.coerce.number().optional().nullable(),
  reorderQty: z.coerce.number().optional().nullable(),
  imageUrl: z.string().trim().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
})

const productPageSize = 10

// ── UOM Conversions Manager (Inline for Edit Mode) ──────────────────────
function UomConversionsManager({ productId, conversions = [], onRefresh, canManage = false }) {
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
                gridTemplateColumns: editingId === conv.id ? '1fr 1fr 1fr auto' : '1fr auto',
                alignItems: 'end',
                gap: 10,
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.12)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
              }}
            >
              {editingId === conv.id ? (
                <>
                  <input
                    className="form-input"
                    value={editFromUom}
                    onChange={(e) => setEditFromUom(e.target.value.toUpperCase())}
                    style={{ height: 34, fontSize: 12, textTransform: 'uppercase' }}
                    aria-label="From UOM"
                  />
                  <input
                    className="form-input"
                    value={editToUom}
                    onChange={(e) => setEditToUom(e.target.value.toUpperCase())}
                    style={{ height: 34, fontSize: 12, textTransform: 'uppercase' }}
                    aria-label="To UOM"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={editFactor}
                    onChange={(e) => setEditFactor(e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                    aria-label="Conversion factor"
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => handleUpdate(conv.id)}
                      disabled={isUpdating}
                      style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={cancelEdit}
                      disabled={isUpdating}
                      style={{ height: 34, padding: '0 12px', fontSize: 12 }}
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
            gridTemplateColumns: '1fr 1fr 1fr auto',
            gap: 10,
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
            <input
              className="form-input"
              placeholder="e.g. CASE"
              value={fromUom}
              onChange={(e) => setFromUom(e.target.value.toUpperCase())}
              style={{ height: 36, fontSize: 12, textTransform: 'uppercase' }}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>
              TO UOM
            </label>
            <input
              className="form-input"
              placeholder="e.g. PACKET"
              value={toUom}
              onChange={(e) => setToUom(e.target.value.toUpperCase())}
              style={{ height: 36, fontSize: 12, textTransform: 'uppercase' }}
            />
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
              style={{ height: 36, fontSize: 12 }}
            />
          </div>
          <button
            type="button"
            className="button-primary"
            onClick={handleAdd}
            disabled={isAdding}
            style={{ height: 36, padding: '0 16px', fontSize: 12 }}
          >
            {isAdding ? 'Adding...' : 'Add'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

// ── Form Modal Component ──────────────────────────────────────────────────
function NewProductUomConversionsManager({ conversions, onChange, onAfterAdd, canManage = false }) {
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
                gridTemplateColumns: editingId === conv.id ? '1fr 1fr 1fr auto' : '1fr auto',
                alignItems: 'end',
                gap: 10,
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.12)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
              }}
            >
              {editingId === conv.id ? (
                <>
                  <input
                    className="form-input"
                    value={editFromUom}
                    onChange={(e) => setEditFromUom(e.target.value.toUpperCase())}
                    style={{ height: 34, fontSize: 12, textTransform: 'uppercase' }}
                    aria-label="From UOM"
                  />
                  <input
                    className="form-input"
                    value={editToUom}
                    onChange={(e) => setEditToUom(e.target.value.toUpperCase())}
                    style={{ height: 34, fontSize: 12, textTransform: 'uppercase' }}
                    aria-label="To UOM"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={editFactor}
                    onChange={(e) => setEditFactor(e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                    aria-label="Conversion factor"
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => handleUpdate(conv.id)}
                      style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={cancelEdit}
                      style={{ height: 34, padding: '0 12px', fontSize: 12 }}
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
          gridTemplateColumns: '1fr 1fr 1fr auto',
          gap: 20,
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
          <input
            className="form-input"
            placeholder="E.G. CASE"
            value={fromUom}
            onChange={(e) => setFromUom(e.target.value.toUpperCase())}
            style={{ height: 42, fontSize: 12, textTransform: 'uppercase' }}
          />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>
            TO UOM
          </label>
          <input
            className="form-input"
            placeholder="E.G. PACKET"
            value={toUom}
            onChange={(e) => setToUom(e.target.value.toUpperCase())}
            style={{ height: 42, fontSize: 12, textTransform: 'uppercase' }}
          />
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
            style={{ height: 42, fontSize: 12 }}
          />
        </div>
        <button
          type="button"
          className="button-primary"
          onClick={handleAdd}
          style={{ height: 42, padding: '0 16px', fontSize: 12 }}
        >
          Add
        </button>
      </div>
    </div>
  )
}

function ProductFormModal({
  open,
  product,
  categories,
  unitsOfMeasure,
  canManageCategory,
  canManageUom,
  onClose,
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
      reorderLevel: null,
      reorderQty: null,
      imageUrl: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (!open) return

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
        reorderLevel: product.reorderLevel,
        reorderQty: product.reorderQty,
        imageUrl: product.imageUrl || '',
        isActive: product.isActive,
      })
    } else {
      reset({
        sku: '',
        barcode: '',
        name: '',
        categoryId: categories[0]?.id || '',
        uomBase: defaultUom,
        unitCost: 0,
        unitPrice: 0,
        reorderLevel: null,
        reorderQty: null,
        imageUrl: '',
        isActive: true,
      })
    }

    window.setTimeout(() => setFocus('sku'), 0)
  }, [open, product, categories, defaultUom, reset, setFocus])

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
        reorderLevel: values.reorderLevel ? Number(values.reorderLevel) : null,
        reorderQty: values.reorderQty ? Number(values.reorderQty) : null,
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
        onClose()
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
          categoryId: values.categoryId || categories[0]?.id || '',
          uomBase: values.uomBase || defaultUom,
          unitCost: 0,
          unitPrice: 0,
          reorderLevel: null,
          reorderQty: null,
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
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,4,12,0.75)', backdropFilter: 'blur(2px)' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 shadow-2xl"
          style={{
            width: 'min(940px, calc(100vw - 48px))',
            height: 'auto',
            maxWidth: 940,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            maxHeight: 'min(780px, calc(100vh - 48px))',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '24px 24px 16px 24px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              borderBottom: '1px solid var(--color-border)',
              flexShrink: 0,
            }}
          >
            <div>
              <Dialog.Title
                style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}
              >
                {product ? 'Edit Product' : 'Create New Product'}
              </Dialog.Title>
              <Dialog.Description
                style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-muted)' }}
              >
                {product
                  ? 'Modify details and unit conversions for this catalog product.'
                  : 'Register a new product in the system catalog.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close" className="icon-button" style={{ width: 32, height: 32 }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={handleFormKeyDown}
            style={{
              padding: '24px 24px 24px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              minHeight: 0,
              overflowY: 'auto',
            }}
          >
            {/* SKU and Barcode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label className="form-label">SKU CODE</label>
                <input
                  {...register('sku', {
                    setValueAs: (v) => v.toUpperCase(),
                  })}
                  className="form-input w-full"
                  placeholder="e.g. CBL-MCK-001"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 42, textTransform: 'uppercase' }}
                />
                {errors.sku && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>
                    {errors.sku.message}
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">BARCODE</label>
                <input
                  {...register('barcode', {
                    setValueAs: (v) => v?.toUpperCase(),
                  })}
                  className="form-input w-full"
                  placeholder="e.g. 4891234567890"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 42, textTransform: 'uppercase' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 20 }}>
              {/* Name */}
              <div>
                <label className="form-label">PRODUCT NAME</label>
                <input
                  {...register('name', {
                    setValueAs: (v) => v?.toUpperCase(),
                  })}
                  className="form-input w-full"
                  placeholder="e.g. CBL MUNCHEE COCONUT CRUNCH 200G"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 42, textTransform: 'uppercase' }}
                />
                {errors.name && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 42,
                  marginTop: 22,
                }}
              >
                <label
                  htmlFor="isActive"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13,
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    id="isActive"
                    {...register('isActive')}
                    style={{ width: 16, height: 16, accentColor: 'var(--color-amber)' }}
                  />
                  Active Catalog Item
                </label>
              </div>
            </div>

            {/* Category and Base UOM */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    CATEGORY
                  </label>
                  {canManageCategory ? (
                    <button
                      type="button"
                      className="icon-button"
                      title="Add category"
                      onClick={() => setShowCategoryForm((current) => !current)}
                      style={{ width: 28, height: 28, borderRadius: 6 }}
                    >
                      <Plus style={{ width: 14, height: 14 }} />
                    </button>
                  ) : null}
                </div>

                <select
                  {...register('categoryId')}
                  className="form-input w-full"
                  style={{
                    background: 'rgba(0,0,0,0.15)',
                    height: 42,
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
                    Select Category
                  </option>
                  {categories.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      style={{
                        background: 'var(--color-bg-elevated)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {c.name}
                    </option>
                  ))}
                </select>

                {showCategoryForm && canManageCategory ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '0.8fr 1fr auto',
                      gap: 8,
                      marginTop: 8,
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
                      placeholder="Category name"
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
                      {isSavingCategory ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                ) : null}

                {errors.categoryId && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>
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
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    BASE UOM
                  </label>
                  {canManageUom ? (
                    <button
                      type="button"
                      className="icon-button"
                      title="Add base UOM"
                      onClick={() => setShowUomForm((current) => !current)}
                      style={{ width: 28, height: 28, borderRadius: 6 }}
                    >
                      <Plus style={{ width: 14, height: 14 }} />
                    </button>
                  ) : null}
                </div>

                <select
                  {...register('uomBase')}
                  className="form-input w-full"
                  style={{
                    background: 'rgba(0,0,0,0.15)',
                    height: 42,
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
                    Select UOM
                  </option>
                  {product?.uomBase &&
                  !unitsOfMeasure.some((unit) => unit.code === product.uomBase) ? (
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
                      {unit.code} - {unit.name}
                    </option>
                  ))}
                </select>

                {showUomForm && canManageUom ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '0.7fr 1fr 0.9fr auto',
                      gap: 8,
                      marginTop: 8,
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
                      placeholder="UOM name"
                      value={newUom.name}
                      maxLength={100}
                      onChange={(event) =>
                        setNewUom((current) => ({ ...current, name: event.target.value }))
                      }
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
                      {isSavingUom ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                ) : null}

                {errors.uomBase && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>
                    {errors.uomBase.message}
                  </p>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              <div>
                <label className="form-label">UNIT COST (RS.)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('unitCost')}
                  className="form-input w-full mono"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 42 }}
                />
                {errors.unitCost && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>
                    {errors.unitCost.message}
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">UNIT PRICE (RS.)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('unitPrice')}
                  className="form-input w-full mono"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 42 }}
                />
                {errors.unitPrice && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>
                    {errors.unitPrice.message}
                  </p>
                )}
              </div>
              <div>
                <label className="form-label">REORDER LEVEL</label>
                <input
                  type="number"
                  {...register('reorderLevel')}
                  className="form-input w-full mono"
                  placeholder="Optional"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 42 }}
                />
              </div>

              <div>
                <label className="form-label">REORDER QTY</label>
                <input
                  type="number"
                  {...register('reorderQty')}
                  className="form-input w-full mono"
                  placeholder="Optional"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 42 }}
                />
              </div>
            </div>



            {/* UOM Conversions section */}
            {product ? (
              <UomConversionsManager
                productId={product.id}
                conversions={product.uomConversions || []}
                canManage={canManageUom}
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
                gap: 12,
                paddingTop: 8,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                data-skip-focus="true"
                className="button-ghost"
                onClick={onClose}
                style={{ minWidth: 110, height: 42 }}
              >
                Cancel
              </button>
              <button
                id="product-submit-button"
                type="submit"
                className="button-primary"
                disabled={isSaving}
                style={{ minWidth: 150, height: 42 }}
              >
                {isSaving ? 'Saving...' : product ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
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
      setProducts(result.items || [])
      setTotalPages(result.totalPages || 1)
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

  function handleAdd() {
    if (!canManageProducts) return

    setEditingProduct(undefined)
    setIsModalOpen(true)
  }

  async function handleEdit(p) {
    if (!canManageProducts) return

    setIsLoading(true)
    try {
      // Get complete product details (with conversions list)
      const fullProduct = await masterService.getProduct(p.id)
      setEditingProduct(fullProduct)
      setIsModalOpen(true)
    } catch (err) {
      toast.error('Failed to load product details.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSave(savedProduct) {
    if (editingProduct && savedProduct?.id) {
      setEditingProduct(savedProduct)
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
        {canManageProducts ? (
          <button
            className="button-primary"
            onClick={handleAdd}
            style={{
              height: 40,
              padding: '0 24px',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            New Product
          </button>
        ) : null}
      </div>

      <ProductFormModal
        open={isModalOpen}
        product={editingProduct}
        categories={categories}
        unitsOfMeasure={unitsOfMeasure}
        canManageCategory={canManageCategory}
        canManageUom={canManageUom}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSave}
        onCategoryCreated={handleCategoryCreated}
        onUomCreated={handleUomCreated}
      />

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

      <div
        className="panel"
        style={{
          padding: 12,
          display: 'grid',
          gridTemplateRows: 'minmax(0, 1fr) auto',
          flex: 1,
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
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Base UOM</th>
                    <th style={{ textAlign: 'right' }}>Unit Cost</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th>Conversion</th>
                    <th>Status</th>
                    {canManageProducts ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const primaryConversion = p.uomConversions?.[0]
                    return (
                      <tr key={p.id}>
                        <td>
                          <span
                            className="mono text-xs font-medium"
                            style={{ color: 'var(--color-amber)' }}
                          >
                            {p.sku}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span
                              className="text-sm font-medium"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {p.name}
                            </span>
                            {p.description && (
                              <span
                                title={p.description}
                                style={{
                                  display: 'block',
                                  maxWidth: 340,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: 11,
                                  color: 'var(--color-text-dim)',
                                }}
                              >
                                {p.description}
                              </span>
                            )}
                            {p.barcode && (
                              <span
                                className="mono"
                                title={`Barcode: ${p.barcode}`}
                                style={{
                                  display: 'block',
                                  maxWidth: 260,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: 11,
                                  color: 'var(--color-text-dim)',
                                }}
                              >
                                Barcode: {p.barcode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {p.category?.name || '-'}
                        </td>
                        <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {p.uomBase}
                        </td>
                        <td
                          className="mono text-sm"
                          style={{ textAlign: 'right', color: 'var(--color-text-primary)' }}
                        >
                          Rs. {p.unitCost.toFixed(2)}
                        </td>
                        <td
                          className="mono text-sm"
                          style={{
                            textAlign: 'right',
                            color: 'var(--color-text-primary)',
                            fontWeight: 600,
                          }}
                        >
                          Rs. {p.unitPrice.toFixed(2)}
                        </td>
                        <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {primaryConversion ? (
                            <span>
                              1 {primaryConversion.fromUom} = {primaryConversion.factor}{' '}
                              {primaryConversion.toUom}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-dim)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
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
                onClick={() => setPage(page - 1)}
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
                onClick={() => setPage(page + 1)}
                style={{ height: 32, padding: '0 12px', fontSize: 12 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
