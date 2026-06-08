import dayjs from 'dayjs'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Pencil, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import StatusBadge from '@components/ui/StatusBadge'
import { mockPurchaseOrders, mockSuppliers } from '@data/mockPurchaseOrders'
import { PurchaseOrderStatus } from '@/types/purchasing.types'
const STATUS_OPTIONS = ['All', ...Object.values(PurchaseOrderStatus)]
const listPageSize = 8
function formatLKR(value) {
  return `Rs. ${value.toLocaleString()}`
}
/* ── Form Modal ─────────────────────────────────────────────── */
const poSchema = z.object({
  supplierName: z.string().min(1, 'Supplier is required'),
  expectedDate: z.string().min(1, 'Expected date is required'),
  notes: z.string().optional(),
})
function PurchaseOrderFormModal({ open, po, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(poSchema),
    defaultValues: {
      supplierName: '',
      expectedDate: '',
      notes: '',
    },
  })
  useEffect(() => {
    if (open) {
      if (po) {
        reset({
          supplierName: po.supplierName,
          expectedDate: po.expectedDate.split('T')[0],
          notes: po.notes || '',
        })
      } else {
        reset({
          supplierName: '',
          expectedDate: '',
          notes: '',
        })
      }
      // Auto-focus Supplier on open
      setTimeout(() => {
        const firstInput = document.querySelector('select[name="supplierName"]')
        if (firstInput) firstInput.focus()
      }, 50)
    }
  }, [open, po, reset])
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.closest('form')
      if (!form) return
      const elements = Array.from(
        form.querySelectorAll('input, select, textarea, button[type="submit"]')
      ).filter(
        (el) =>
          !el.hasAttribute('disabled') && el.tabIndex !== -1 && !el.hasAttribute('data-skip-focus')
      )
      const index = elements.indexOf(e.currentTarget)
      if (index > -1 && index < elements.length - 1) {
        elements[index + 1].focus()
      } else if (index === elements.length - 1) {
        if (elements[index] instanceof HTMLButtonElement) {
          elements[index].click()
        }
      }
    }
  }
  async function onSubmit(values) {
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 600))
    if (po) {
      const updatedPO = {
        ...po,
        supplierName: values.supplierName,
        expectedDate: new Date(values.expectedDate).toISOString(),
        notes: values.notes,
      }
      onSaved(updatedPO)
      toast.success(`Purchase Order ${updatedPO.poNumber} updated.`)
      onClose()
    } else {
      const newPO = {
        id: `po_${Date.now()}`,
        poNumber: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
        supplierName: values.supplierName,
        orderDate: new Date().toISOString(),
        expectedDate: new Date(values.expectedDate).toISOString(),
        status: PurchaseOrderStatus.Draft,
        totalAmount: 0,
        notes: values.notes,
        createdBy: 'Admin User',
        lines: [],
      }
      onSaved(newPO)
      toast.success(`Purchase Order ${newPO.poNumber} created.`)
      reset({
        supplierName: '',
        expectedDate: '',
        notes: '',
      })
      setTimeout(() => {
        const firstInput = document.querySelector('select[name="supplierName"]')
        if (firstInput) firstInput.focus()
      }, 50)
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
            maxWidth: 500,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '32px 32px 24px 32px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Dialog.Title
                style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)' }}
              >
                {po ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </Dialog.Title>
              <Dialog.Description
                style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}
              >
                {po
                  ? 'Update draft properties for this PO.'
                  : 'Initialize a new draft PO. Line items can be added on the detail page.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '50%',
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{
              padding: '0 32px 32px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            {/* Supplier Name */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                SUPPLIER
              </label>
              <select
                className={`form-input ${errors.supplierName ? 'error' : ''}`}
                style={{
                  width: '100%',
                  height: 44,
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  padding: '0 16px',
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
                autoFocus
                onKeyDown={handleKeyDown}
                {...register('supplierName')}
              >
                <option
                  value=""
                  disabled
                  style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-dim)' }}
                >
                  Select a supplier...
                </option>
                {mockSuppliers.map((s) => (
                  <option
                    key={s.id}
                    value={s.name}
                    style={{
                      background: 'var(--color-bg-elevated)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.supplierName && (
                <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>
                  {errors.supplierName.message}
                </p>
              )}
            </div>

            {/* Expected Date */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                EXPECTED DELIVERY DATE
              </label>
              <input
                type="date"
                className={`form-input ${errors.expectedDate ? 'error' : ''}`}
                style={{
                  width: '100%',
                  height: 44,
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  padding: '0 16px',
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
                onKeyDown={handleKeyDown}
                {...register('expectedDate')}
              />
              {errors.expectedDate && (
                <p className="form-error mt-1" style={{ fontSize: 12, color: 'var(--color-red)' }}>
                  {errors.expectedDate.message}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                NOTES (OPTIONAL)
              </label>
              <textarea
                className={`form-input ${errors.notes ? 'error' : ''}`}
                style={{
                  width: '100%',
                  minHeight: 80,
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  padding: '12px 16px',
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                  resize: 'vertical',
                }}
                placeholder="E.g. Fast delivery requested."
                onKeyDown={handleKeyDown}
                {...register('notes')}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                className="button-secondary"
                onClick={onClose}
                data-skip-focus="true"
                style={{ height: 40, padding: '0 24px', fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary"
                onKeyDown={handleKeyDown}
                style={{ height: 40, padding: '0 24px', fontSize: 14 }}
              >
                {po ? 'Save Changes' : 'Create Draft PO'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
/* ── Page Component ─────────────────────────────────────────────── */
export default function PurchaseOrderListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [supplierFilter, setSupplierFilter] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPO, setEditingPO] = useState(null)
  const [purchaseOrders, setPurchaseOrders] = useState(mockPurchaseOrders)
  const [page, setPage] = useState(1)
  const uniqueSuppliers = useMemo(
    () => ['All', ...Array.from(new Set(purchaseOrders.map((po) => po.supplierName)))],
    [purchaseOrders]
  )
  const filtered = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchSearch =
        !search ||
        po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'All' || po.status === statusFilter
      const matchSupplier = supplierFilter === 'All' || po.supplierName === supplierFilter
      return matchSearch && matchStatus && matchSupplier
    })
  }, [search, statusFilter, supplierFilter, purchaseOrders])
  const totalPages = Math.max(1, Math.ceil(filtered.length / listPageSize))
  const pagedPurchaseOrders = useMemo(() => {
    const start = (page - 1) * listPageSize
    return filtered.slice(start, start + listPageSize)
  }, [filtered, page])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, supplierFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const handlePOSaved = (savedPO) => {
    const isExisting = purchaseOrders.some((po) => po.id === savedPO.id)
    if (isExisting) {
      setPurchaseOrders(purchaseOrders.map((po) => (po.id === savedPO.id ? savedPO : po)))
    } else {
      setPurchaseOrders([savedPO, ...purchaseOrders])
    }
  }
  const openNewPOModal = () => {
    setEditingPO(null)
    setIsModalOpen(true)
  }
  const openEditPOModal = (po, e) => {
    e.stopPropagation()
    setEditingPO(po)
    setIsModalOpen(true)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            Purchase Orders
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Create and manage purchase orders to your suppliers.
          </p>
        </div>
        <button
          className="button-primary"
          onClick={openNewPOModal}
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
          New Purchase Order
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              placeholder="Search PO number or supplier..."
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
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: 180,
              height: 40,
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              padding: '0 16px',
              color: 'var(--color-text-primary)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option
                key={s}
                value={s}
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {s === 'All' ? 'All Statuses' : s}
              </option>
            ))}
          </select>
          <select
            className="form-input"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            style={{
              width: 220,
              height: 40,
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              padding: '0 16px',
              color: 'var(--color-text-primary)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {uniqueSuppliers.map((s) => (
              <option
                key={s}
                value={s}
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {s === 'All' ? 'All Suppliers' : s}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="panel overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: 'var(--color-bg-elevated)' }}
              >
                <Search className="h-6 w-6" style={{ color: 'var(--color-text-dim)' }} />
              </div>
              <div className="text-center">
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  No purchase orders found
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Try adjusting your filters or create a new purchase order
                </p>
              </div>
              <button className="button-primary flex items-center gap-2" onClick={openNewPOModal}>
                <Plus className="h-4 w-4" />
                New Purchase Order
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO #</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Expected</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th className="text-right">Total</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPurchaseOrders.map((po) => (
                    <tr
                      key={po.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/purchasing/${po.id}`)}
                    >
                      <td>
                        <span
                          className="mono text-sm font-semibold"
                          style={{ color: 'var(--color-amber)' }}
                        >
                          {po.poNumber}
                        </span>
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {dayjs(po.orderDate).format('DD MMM YYYY')}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {po.supplierName}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {dayjs(po.expectedDate).format('DD MMM YYYY')}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <StatusBadge status={po.status} />
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {po.lines.length}
                      </td>
                      <td className="text-right">
                        <span
                          className="mono text-sm font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {formatLKR(po.totalAmount)}
                        </span>
                      </td>
                      <td
                        style={{ padding: '12px 10px', textAlign: 'right' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="icon-button"
                          title="Edit PO header"
                          style={{ width: 28, height: 28 }}
                          onClick={(e) => openEditPOModal(po, e)}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary row */}
        {filtered.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
              Showing {pagedPurchaseOrders.length} of {filtered.length} purchase orders
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

      <PurchaseOrderFormModal
        open={isModalOpen}
        po={editingPO}
        onClose={() => setIsModalOpen(false)}
        onSaved={handlePOSaved}
      />
    </div>
  )
}
