import dayjs from 'dayjs'
import { Plus, Search, X, Pencil } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { InvoiceStatus, PaymentType } from '@/types/sales.types'
import { mockCustomers } from '@/data/mockCustomers'
const mockInvoices = [
  {
    id: 'INV-2026-0148',
    customer: 'Perera Stores',
    date: '2026-04-29',
    due: '2026-05-13',
    amount: 43380,
    paid: 0,
    type: PaymentType.Credit,
    status: InvoiceStatus.Posted,
  },
  {
    id: 'INV-2026-0147',
    customer: 'Silva Mart',
    date: '2026-04-29',
    due: '2026-04-29',
    amount: 28900,
    paid: 28900,
    type: PaymentType.Cash,
    status: InvoiceStatus.Posted,
  },
  {
    id: 'INV-2026-0146',
    customer: 'Dissanayake SM',
    date: '2026-04-28',
    due: '2026-05-05',
    amount: 61200,
    paid: 0,
    type: PaymentType.Credit,
    status: InvoiceStatus.Posted,
  },
  {
    id: 'INV-2026-0145',
    customer: 'Fernando Grocery',
    date: '2026-04-28',
    due: '2026-04-28',
    amount: 12750,
    paid: 12750,
    type: PaymentType.Cash,
    status: InvoiceStatus.Posted,
  },
  {
    id: 'INV-2026-0144',
    customer: 'Jayawardena Pvt',
    date: '2026-04-27',
    due: '2026-05-11',
    amount: 94500,
    paid: 0,
    type: PaymentType.Credit,
    status: InvoiceStatus.Posted,
  },
  {
    id: 'INV-2026-0143',
    customer: 'Bandara Traders',
    date: '2026-04-26',
    due: '2026-04-26',
    amount: 18600,
    paid: 18600,
    type: PaymentType.Cash,
    status: InvoiceStatus.Posted,
  },
  {
    id: 'INV-2026-0142',
    customer: 'Perera Stores',
    date: '2026-04-25',
    due: '2026-05-09',
    amount: 37800,
    paid: 0,
    type: PaymentType.Credit,
    status: InvoiceStatus.Posted,
  },
  {
    id: 'INV-2026-0141',
    customer: 'Silva Mart',
    date: '2026-04-24',
    due: '2026-04-24',
    amount: 55200,
    paid: 55200,
    type: PaymentType.Cash,
    status: InvoiceStatus.Posted,
  },
]
function deriveDisplayStatus(inv) {
  if (inv.status === InvoiceStatus.Draft) return 'DRAFT'
  if (inv.paid >= inv.amount && inv.amount > 0) return 'PAID'
  const overdue = dayjs().isAfter(dayjs(inv.due))
  return overdue ? 'OVERDUE' : 'PENDING'
}
const STATUS_OPTIONS = ['All', 'DRAFT', 'PENDING', 'PAID', 'OVERDUE']
const TYPE_OPTIONS = ['All', PaymentType.Cash, PaymentType.Credit]
const listPageSize = 8
const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  paymentType: z.nativeEnum(PaymentType),
  notes: z.string().optional(),
})
function InvoiceFormModal({ open, invoice, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      invoiceDate: dayjs().format('YYYY-MM-DD'),
      dueDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      paymentType: PaymentType.Credit,
      notes: '',
    },
  })
  useEffect(() => {
    if (open) {
      if (invoice) {
        const foundCustomer = mockCustomers.find((c) => c.name === invoice.customer)
        reset({
          customerId: foundCustomer ? foundCustomer.id : '',
          invoiceDate: dayjs(invoice.date).format('YYYY-MM-DD'),
          dueDate: dayjs(invoice.due).format('YYYY-MM-DD'),
          paymentType: invoice.type || PaymentType.Credit,
          notes: invoice.notes || '',
        })
      } else {
        reset({
          customerId: '',
          invoiceDate: dayjs().format('YYYY-MM-DD'),
          dueDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
          paymentType: PaymentType.Credit,
          notes: '',
        })
      }
      setTimeout(() => {
        const firstInput = document.querySelector('select[name="customerId"]')
        if (firstInput) firstInput.focus()
      }, 50)
    }
  }, [open, invoice, reset])
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
    await new Promise((r) => setTimeout(r, 600))
    const customer = mockCustomers.find((c) => c.id === values.customerId)
    if (invoice) {
      const updatedInvoice = {
        ...invoice,
        customer: customer ? customer.name : 'Unknown Customer',
        date: values.invoiceDate,
        due: values.dueDate,
        type: values.paymentType,
        notes: values.notes,
      }
      onSaved(updatedInvoice)
      toast.success(`Invoice ${updatedInvoice.id} updated.`)
      onClose()
    } else {
      const newInvoice = {
        id: `INV-2026-0${Math.floor(150 + Math.random() * 850)}`,
        customer: customer ? customer.name : 'Unknown Customer',
        date: values.invoiceDate,
        due: values.dueDate,
        amount: 0,
        paid: 0,
        type: values.paymentType,
        status: InvoiceStatus.Draft,
        notes: values.notes,
      }
      onSaved(newInvoice)
      toast.success(`Draft Invoice ${newInvoice.id} created.`)
      onClose()
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
                {invoice ? 'Edit Invoice' : 'Create Draft Invoice'}
              </Dialog.Title>
              <Dialog.Description
                style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}
              >
                {invoice
                  ? 'Update the details for this invoice.'
                  : 'Initialize a new draft invoice. Line items can be added on the detail page.'}
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

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{
              padding: '0 32px 32px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
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
                CUSTOMER
              </label>
              <select
                className={`form-input ${errors.customerId ? 'error' : ''}`}
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
                {...register('customerId')}
              >
                <option
                  value=""
                  disabled
                  style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-dim)' }}
                >
                  Select a customer...
                </option>
                {mockCustomers.map((c) => (
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
              {errors.customerId && (
                <p
                  className="form-error mt-1"
                  style={{ fontSize: 12, color: 'var(--color-danger)' }}
                >
                  {errors.customerId.message}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
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
                  INVOICE DATE
                </label>
                <input
                  type="date"
                  className={`form-input ${errors.invoiceDate ? 'error' : ''}`}
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
                  {...register('invoiceDate')}
                />
                {errors.invoiceDate && (
                  <p
                    className="form-error mt-1"
                    style={{ fontSize: 12, color: 'var(--color-danger)' }}
                  >
                    {errors.invoiceDate.message}
                  </p>
                )}
              </div>
              <div style={{ flex: 1 }}>
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
                  DUE DATE
                </label>
                <input
                  type="date"
                  className={`form-input ${errors.dueDate ? 'error' : ''}`}
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
                  {...register('dueDate')}
                />
                {errors.dueDate && (
                  <p
                    className="form-error mt-1"
                    style={{ fontSize: 12, color: 'var(--color-danger)' }}
                  >
                    {errors.dueDate.message}
                  </p>
                )}
              </div>
            </div>

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
                PAYMENT TYPE
              </label>
              <select
                className={`form-input ${errors.paymentType ? 'error' : ''}`}
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
                {...register('paymentType')}
              >
                <option value={PaymentType.Cash} style={{ background: 'var(--color-bg-elevated)' }}>
                  Cash
                </option>
                <option
                  value={PaymentType.Credit}
                  style={{ background: 'var(--color-bg-elevated)' }}
                >
                  Credit
                </option>
              </select>
            </div>

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
                placeholder="E.g. Delivery requested in the morning."
                onKeyDown={handleKeyDown}
                {...register('notes')}
              />
            </div>

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
                {invoice ? 'Save Changes' : 'Create Draft Invoice'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
export default function InvoiceListPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState(mockInvoices)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatus] = useState('All')
  const [typeFilter, setType] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const displayStatus = deriveDisplayStatus(inv)
      const matchSearch =
        !search ||
        inv.id.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'All' || displayStatus === statusFilter
      const matchType = typeFilter === 'All' || inv.type === typeFilter
      return matchSearch && matchStatus && matchType
    })
  }, [invoices, search, statusFilter, typeFilter])
  const totalPages = Math.max(1, Math.ceil(filtered.length / listPageSize))
  const pagedInvoices = useMemo(() => {
    const start = (page - 1) * listPageSize
    return filtered.slice(start, start + listPageSize)
  }, [filtered, page])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, typeFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const handleInvoiceSaved = (savedInv) => {
    const isExisting = invoices.some((i) => i.id === savedInv.id)
    if (isExisting) {
      setInvoices(invoices.map((i) => (i.id === savedInv.id ? savedInv : i)))
    } else {
      setInvoices([savedInv, ...invoices])
    }
  }
  const openNewInvoiceModal = () => {
    setEditingInvoice(null)
    setIsModalOpen(true)
  }
  const openEditInvoiceModal = (inv, e) => {
    e.stopPropagation()
    setEditingInvoice(inv)
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
            Sales — Invoices
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            {invoices.length} invoices this month
          </p>
        </div>
        <button
          className="button-primary"
          onClick={openNewInvoiceModal}
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
          New Invoice
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
              placeholder="Search invoice # or customer..."
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
            onChange={(e) => setStatus(e.target.value)}
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
            value={typeFilter}
            onChange={(e) => setType(e.target.value)}
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
            {TYPE_OPTIONS.map((t) => (
              <option
                key={t}
                value={t}
                style={{
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {t === 'All' ? 'All Types' : t}
              </option>
            ))}
          </select>
        </div>

        {/* ── Table ── */}
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Due</th>
                  <th className="text-right">Amount</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedInvoices.map((inv) => {
                  const displayStatus = deriveDisplayStatus(inv)
                  return (
                    <tr
                      key={inv.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/sales/invoices/${inv.id}`)}
                    >
                      <td>
                        <span
                          className="mono text-sm font-semibold"
                          style={{ color: 'var(--color-amber)' }}
                        >
                          {inv.id}
                        </span>
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {inv.customer}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {dayjs(inv.date).format('DD MMM YYYY')}
                      </td>
                      <td
                        className="text-sm"
                        style={{
                          color:
                            displayStatus === 'OVERDUE'
                              ? 'var(--color-danger)'
                              : 'var(--color-text-muted)',
                        }}
                      >
                        {dayjs(inv.due).format('DD MMM YYYY')}
                      </td>
                      <td
                        className="text-right mono text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        Rs. {inv.amount.toLocaleString()}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {inv.type}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <StatusBadge status={displayStatus} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="icon-button"
                          title="Edit invoice"
                          style={{ width: 28, height: 28 }}
                          onClick={(e) => openEditInvoiceModal(inv, e)}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

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
              Showing {pagedInvoices.length} of {filtered.length} invoices
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

      <InvoiceFormModal
        open={isModalOpen}
        invoice={editingInvoice}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleInvoiceSaved}
      />
    </div>
  )
}
