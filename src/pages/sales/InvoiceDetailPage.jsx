import dayjs from 'dayjs'
import { ArrowLeft, Ban, CreditCard, Hash, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { salesService } from '@/services/api/salesService'
import { useAuthStore } from '@/stores/authStore'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'

const paymentMethods = [
  { value: 1, label: 'Cash' },
  { value: 2, label: 'Cheque' },
  { value: 4, label: 'Credit note' },
]

const emptyPayment = {
  paymentMethod: 1,
  amount: '',
  paidDate: dayjs().format('YYYY-MM-DD'),
  chequeNumber: '',
  chequeDate: '',
  bankName: '',
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function showDate(value) {
  return value ? dayjs(value).format('DD MMM YYYY') : '-'
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="form-label" style={{ fontSize: 10 }}>
        {label}
      </p>
      <p style={{ marginTop: 4, color: 'var(--color-text-primary)' }}>{value || '-'}</p>
    </div>
  )
}

function AmountRow({ label, value, strong = false }) {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'space-between', fontWeight: strong ? 800 : 500 }}
    >
      <span style={{ color: strong ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span className="mono" style={{ color: strong ? 'var(--color-amber)' : undefined }}>
        {money(value)}
      </span>
    </div>
  )
}

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const currentUser = useAuthStore((state) => state.user)
  const [invoice, setInvoice] = useState(null)
  const [payment, setPayment] = useState(emptyPayment)
  const [taxInvoiceNumber, setTaxInvoiceNumber] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [isSavingTaxNumber, setIsSavingTaxNumber] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState('')

  const canAddPayment = userHasPermission(currentUser, PERMISSIONS.sales.invoiceAddPayment)
  const canCancel = userHasPermission(currentUser, PERMISSIONS.sales.invoiceCancel)
  const canAssignTaxNumber = userHasPermission(
    currentUser,
    PERMISSIONS.sales.invoiceAssignTaxNumber
  )
  const isCancelled = invoice?.status === 'Cancelled'
  const isPaid = invoice?.status === 'Paid'
  const isChequePayment = Number(payment.paymentMethod) === 2

  async function loadInvoice() {
    setIsLoading(true)
    setError('')

    try {
      const result = await salesService.getInvoice(id)
      setInvoice(result)
      setTaxInvoiceNumber(result?.taxInvoiceNumber || '')
    } catch (loadError) {
      setError(loadError.message || 'Unable to load invoice.')
      setInvoice(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInvoice()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function updatePayment(field, value) {
    setPayment((current) => ({ ...current, [field]: value }))
  }

  async function submitPayment(event) {
    event.preventDefault()

    const amount = Number(payment.amount)
    if (!amount || amount <= 0) {
      toast.error('Payment amount must be greater than zero.')
      return
    }

    if (isChequePayment && (!payment.chequeNumber || !payment.chequeDate || !payment.bankName)) {
      toast.error('Cheque number, cheque date, and bank name are required.')
      return
    }

    const payload = {
      paymentMethod: Number(payment.paymentMethod),
      amount,
      paidDate: dayjs(payment.paidDate).toISOString(),
      chequeNumber: isChequePayment ? payment.chequeNumber.trim() : null,
      chequeDate: isChequePayment ? dayjs(payment.chequeDate).toISOString() : null,
      bankName: isChequePayment ? payment.bankName.trim() : null,
    }

    setIsSavingPayment(true)
    try {
      await salesService.addInvoicePayment(id, payload)
      toast.success('Payment recorded.')
      setPayment(emptyPayment)
      await loadInvoice()
    } catch (saveError) {
      toast.error(saveError.message || 'Unable to record payment.')
    } finally {
      setIsSavingPayment(false)
    }
  }

  async function submitTaxNumber(event) {
    event.preventDefault()

    if (!taxInvoiceNumber.trim()) {
      toast.error('Tax invoice number is required.')
      return
    }

    setIsSavingTaxNumber(true)
    try {
      await salesService.assignTaxInvoiceNumber(id, taxInvoiceNumber.trim())
      toast.success('Tax invoice number saved.')
      await loadInvoice()
    } catch (saveError) {
      toast.error(saveError.message || 'Unable to save tax invoice number.')
    } finally {
      setIsSavingTaxNumber(false)
    }
  }

  async function submitCancel(event) {
    event.preventDefault()

    if (!cancelReason.trim()) {
      toast.error('Cancellation reason is required.')
      return
    }

    setIsCancelling(true)
    try {
      await salesService.cancelInvoice(id, cancelReason.trim())
      toast.success('Invoice cancelled.')
      setCancelReason('')
      await loadInvoice()
    } catch (cancelError) {
      toast.error(cancelError.message || 'Unable to cancel invoice.')
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="panel" style={{ padding: 20 }}>
        Loading invoice...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Link to="/sales/invoices" className="btn-back-modern" style={{ marginLeft: -8 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back
        </Link>
        <div className="panel" style={{ padding: 20, color: 'var(--color-danger)' }}>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 64 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Link to="/sales/invoices" className="btn-back-modern" style={{ marginLeft: -8 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Back
          </Link>
          <h1
            style={{
              marginTop: 14,
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            {invoice.invoiceNumber}
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            {invoice.isTaxInvoice ? 'Tax invoice' : 'Sales invoice'} issued on{' '}
            {showDate(invoice.invoiceDate)}
          </p>
        </div>
        <div style={{ alignSelf: 'end' }}>
          <StatusBadge status={invoice.status.toUpperCase()} />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 420px)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <main style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="panel" style={{ padding: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
              }}
            >
              <InfoItem label="Customer ID" value={invoice.customerId} />
              <InfoItem label="Sales Route ID" value={invoice.salesRouteId} />
              <InfoItem label="Vehicle ID" value={invoice.vehicleId} />
              <InfoItem label="Sales Person ID" value={invoice.salesPersonId} />
              <InfoItem label="Due Date" value={showDate(invoice.dueDate)} />
              <InfoItem label="Customer VAT TIN" value={invoice.customerVatTin} />
              <InfoItem label="Tax Invoice No" value={invoice.taxInvoiceNumber} />
              <InfoItem label="Cancelled Reason" value={invoice.cancelledReason} />
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div style={{ padding: 16, borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Invoice Lines
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table" style={{ minWidth: 980 }}>
                <thead>
                  <tr>
                    <th>Product ID</th>
                    <th>Unit ID</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">MRP</th>
                    <th className="text-right">Disc %</th>
                    <th className="text-right">VAT</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.lines || []).map((line) => (
                    <tr key={line.id}>
                      <td className="mono text-sm">{line.productId}</td>
                      <td className="mono text-sm">{line.unitId}</td>
                      <td className="text-right mono">{line.quantity}</td>
                      <td className="text-right mono">{money(line.unitPrice)}</td>
                      <td className="text-right mono">{money(line.mrp)}</td>
                      <td className="text-right mono">{line.discountPercent}%</td>
                      <td className="text-right mono">{money(line.vatAmount)}</td>
                      <td className="text-right mono">{money(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="panel" style={{ padding: 16 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                marginBottom: 12,
              }}
            >
              Amount Summary
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <AmountRow label="Gross" value={invoice.grossAmount} />
              <AmountRow label="Discount" value={invoice.totalDiscountAmount} />
              <AmountRow label="Supplier Discount" value={invoice.totalSupplierDiscountAmount} />
              <AmountRow
                label="Distributor Discount"
                value={invoice.totalDistributorDiscountAmount}
              />
              <AmountRow label="Returns" value={invoice.totalReturnAmount} />
              <AmountRow label="VAT" value={invoice.vatAmount} />
              <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
              <AmountRow label="Net" value={invoice.netAmount} strong />
              <AmountRow label="Paid" value={invoice.paidAmount} />
              <AmountRow label="Outstanding" value={invoice.outstandingAmount} strong />
            </div>
          </section>

          {canAddPayment && !isCancelled && !isPaid && (
            <form className="panel" style={{ padding: 16 }} onSubmit={submitPayment}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  marginBottom: 12,
                }}
              >
                <CreditCard
                  style={{ width: 16, height: 16, marginRight: 6, verticalAlign: 'text-bottom' }}
                />
                Add Payment
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select
                  className="form-input"
                  value={payment.paymentMethod}
                  onChange={(event) => updatePayment('paymentMethod', event.target.value)}
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount"
                  value={payment.amount}
                  onChange={(event) => updatePayment('amount', event.target.value)}
                />
                <input
                  className="form-input"
                  type="date"
                  value={payment.paidDate}
                  onChange={(event) => updatePayment('paidDate', event.target.value)}
                />
                {isChequePayment && (
                  <>
                    <input
                      className="form-input"
                      placeholder="Cheque number"
                      value={payment.chequeNumber}
                      onChange={(event) => updatePayment('chequeNumber', event.target.value)}
                    />
                    <input
                      className="form-input"
                      type="date"
                      value={payment.chequeDate}
                      onChange={(event) => updatePayment('chequeDate', event.target.value)}
                    />
                    <input
                      className="form-input"
                      placeholder="Bank name"
                      value={payment.bankName}
                      onChange={(event) => updatePayment('bankName', event.target.value)}
                    />
                  </>
                )}
                <button className="button-primary" type="submit" disabled={isSavingPayment}>
                  <RefreshCw style={{ width: 15, height: 15 }} />
                  {isSavingPayment ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          )}

          {canAssignTaxNumber && invoice.isTaxInvoice && !isCancelled && (
            <form className="panel" style={{ padding: 16 }} onSubmit={submitTaxNumber}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  marginBottom: 12,
                }}
              >
                <Hash
                  style={{ width: 16, height: 16, marginRight: 6, verticalAlign: 'text-bottom' }}
                />
                Tax Invoice Number
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  className="form-input"
                  value={taxInvoiceNumber}
                  onChange={(event) => setTaxInvoiceNumber(event.target.value)}
                  placeholder="Tax invoice number"
                />
                <button className="button-secondary" type="submit" disabled={isSavingTaxNumber}>
                  {isSavingTaxNumber ? 'Saving...' : 'Save Number'}
                </button>
              </div>
            </form>
          )}

          {canCancel && !isCancelled && (
            <form className="panel" style={{ padding: 16 }} onSubmit={submitCancel}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  marginBottom: 12,
                }}
              >
                <Ban
                  style={{ width: 16, height: 16, marginRight: 6, verticalAlign: 'text-bottom' }}
                />
                Cancel Invoice
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  className="form-input"
                  rows={3}
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Reason"
                />
                <button className="button-secondary" type="submit" disabled={isCancelling}>
                  {isCancelling ? 'Cancelling...' : 'Cancel Invoice'}
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </div>
  )
}
