import dayjs from 'dayjs'
import { ArrowLeft, Ban, CreditCard, Hash, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { salesService } from '@/services/api/salesService'
import { masterService } from '@/services/api/masterService'
import { usersService } from '@/services/api/usersService'
import { useAuthStore } from '@/stores/authStore'
import { formatDate as formatSriLankaDate } from '@/utils'
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
  return formatSriLankaDate(value)
}

function invoiceStatusLabel(status) {
  return String(status || '').replace(/([a-z])([A-Z])/g, '$1 $2')
}

function InfoItem({ label, value, subValue, isCode = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span
        className="form-label"
        style={{
          marginBottom: 0,
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      <div
        className="form-input"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '8px 12px',
          height: 'auto',
          minHeight: 44,
          backgroundColor: 'var(--color-bg-base)',
          borderColor: 'var(--color-border)',
        }}
      >
        <span
          className={isCode ? 'mono' : ''}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            wordBreak: 'break-word',
            lineHeight: 1.2,
          }}
        >
          {value || '-'}
        </span>
        {subValue && (
          <span
            className="mono"
            style={{
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              marginTop: 2,
              wordBreak: 'break-all',
            }}
          >
            {subValue}
          </span>
        )}
      </div>
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

function CompactTitle({ icon: Icon, title }) {
  return (
    <h3
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        fontSize: 15,
        fontWeight: 800,
        color: 'var(--color-text-primary)',
      }}
    >
      <Icon size={15} />
      {title}
    </h3>
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
  const [customerName, setCustomerName] = useState('')
  const [salesRouteName, setSalesRouteName] = useState('')
  const [salesPersonName, setSalesPersonName] = useState('')
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')

  const productById = useMemo(() => {
    return products.reduce((map, p) => {
      map[p.id] = p
      return map
    }, {})
  }, [products])

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

      if (result) {
        if (result.customerId) {
          salesService
            .getCustomer(result.customerId)
            .then((c) => setCustomerName(c?.name || ''))
            .catch(() => setCustomerName(''))
        } else {
          setCustomerName('')
        }

        if (result.salesRouteId) {
          masterService
            .getSalesRoute(result.salesRouteId)
            .then((r) => setSalesRouteName(r?.name || ''))
            .catch(() => setSalesRouteName(''))
        } else {
          setSalesRouteName('')
        }

        if (result.salesPersonId) {
          usersService
            .getUser(result.salesPersonId)
            .then((u) => setSalesPersonName(u?.username || u?.email || ''))
            .catch(() => setSalesPersonName(''))
        } else {
          setSalesPersonName('')
        }

        const productIds = Array.from(
          new Set((result.lines || []).map((line) => line.productId).filter(Boolean))
        )

        Promise.allSettled(productIds.map((productId) => masterService.getProduct(productId)))
          .then((responses) => {
            setProducts(
              responses.flatMap((response) =>
                response.status === 'fulfilled' && response.value ? [response.value] : []
              )
            )
          })
          .catch(() => setProducts([]))
      }
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
    <div
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        paddingBottom: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Link to="/sales/invoices" className="btn-back-modern" style={{ marginLeft: -8 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Back
          </Link>
          <h1
            style={{
              marginTop: 8,
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            Invoice No: {invoice.invoiceNumber}
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            {invoice.isTaxInvoice ? 'Tax invoice' : 'Sales invoice'} issued on{' '}
            {showDate(invoice.invoiceDate)}
          </p>
        </div>
        <div style={{ alignSelf: 'end' }}>
          <StatusBadge status={invoiceStatusLabel(invoice.status)} />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(330px, 400px)',
          gap: 14,
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
        }}
      >
        <main
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            height: '100%',
            minHeight: 0,
          }}
        >
          <section className="panel" style={{ padding: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 12,
                rowGap: 14,
              }}
            >
              <InfoItem
                label="Customer"
                value={customerName || invoice.customerId}
                subValue={customerName ? invoice.customerId : ''}
                isCode={!customerName}
              />
              <InfoItem
                label="Sales Route"
                value={salesRouteName || invoice.salesRouteId}
                subValue={salesRouteName ? invoice.salesRouteId : ''}
                isCode={!salesRouteName}
              />
              <InfoItem label="Vehicle" value={invoice.vehicleId} isCode />
              <InfoItem
                label="Sales Person"
                value={salesPersonName || invoice.salesPersonId}
                subValue={salesPersonName ? invoice.salesPersonId : ''}
                isCode={!salesPersonName}
              />
              <InfoItem label="Due Date" value={showDate(invoice.dueDate)} isCode />
              <InfoItem label="Customer VAT TIN" value={invoice.customerVatTin} isCode />
              <InfoItem label="Tax Invoice No" value={invoice.taxInvoiceNumber} isCode />
              <InfoItem label="Cancelled Reason" value={invoice.cancelledReason} />
            </div>
          </section>

          <section
            className="panel overflow-hidden"
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Invoice Lines
              </h2>
            </div>
            <div className="overflow-x-auto" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <table className="data-table" style={{ minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Item</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Batch</th>
                    <th className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      Qty
                    </th>
                    <th className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      Selling Price
                    </th>
                    <th className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      MRP
                    </th>
                    <th className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      Disc %
                    </th>
                    <th className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      VAT
                    </th>
                    <th className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.lines || []).map((line) => {
                    const product = productById[line.productId]
                    const productSku = product?.sku || line.productId
                    const productName = product?.name || 'Unknown Product'

                    return (
                      <tr key={line.id}>
                        <td style={{ verticalAlign: 'middle' }}>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 3,
                              alignItems: 'flex-start',
                            }}
                          >
                            <span className="product-sku-badge mono" style={{ fontSize: 10 }}>
                              {productSku}
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--color-text-primary)',
                              }}
                            >
                              {productName}
                            </span>
                          </div>
                        </td>
                        <td
                          className="font-mono text-xs text-cyan-600"
                          style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}
                        >
                          {line.batchNo}
                        </td>
                        <td
                          className="text-right mono"
                          style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                        >
                          {line.quantity}{' '}
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--color-text-muted)',
                              fontWeight: 500,
                            }}
                          >
                            {line.smallestUnitCode || line.unitId}
                          </span>
                        </td>
                        <td
                          className="text-right mono"
                          style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                        >
                          {money(line.unitPrice)}
                        </td>
                        <td
                          className="text-right mono"
                          style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                        >
                          {money(line.mrp)}
                        </td>
                        <td
                          className="text-right mono"
                          style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                        >
                          {line.discountPercent}%
                        </td>
                        <td
                          className="text-right mono"
                          style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                        >
                          {money(line.vatAmount)}
                        </td>
                        <td
                          className="text-right mono"
                          style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', fontWeight: 700 }}
                        >
                          {money(line.lineTotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <aside
          className="panel"
          style={{
            padding: 14,
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <section>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                marginBottom: 10,
              }}
            >
              Billing
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
              <div style={{ borderTop: '1px solid var(--color-border)', margin: '3px 0' }} />
              <AmountRow label="Net" value={invoice.netAmount} strong />
              <AmountRow label="Paid" value={invoice.paidAmount} />
              <AmountRow label="Outstanding" value={invoice.outstandingAmount} strong />
            </div>
          </section>

          {canAddPayment && !isCancelled && !isPaid && (
            <form
              onSubmit={submitPayment}
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <CompactTitle icon={CreditCard} title="Add Payment" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                <select
                  className="form-input"
                  value={payment.paymentMethod}
                  onChange={(event) => updatePayment('paymentMethod', event.target.value)}
                  style={{ height: 40 }}
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
                  style={{ height: 40 }}
                />
                <input
                  className="form-input"
                  type="date"
                  value={payment.paidDate}
                  onChange={(event) => updatePayment('paidDate', event.target.value)}
                  style={{ height: 40 }}
                />
                {isChequePayment ? (
                  <>
                    <input
                      className="form-input"
                      placeholder="Cheque number"
                      value={payment.chequeNumber}
                      onChange={(event) => updatePayment('chequeNumber', event.target.value)}
                      style={{ height: 40 }}
                    />
                    <input
                      className="form-input"
                      type="date"
                      value={payment.chequeDate}
                      onChange={(event) => updatePayment('chequeDate', event.target.value)}
                      style={{ height: 40 }}
                    />
                    <input
                      className="form-input"
                      placeholder="Bank name"
                      value={payment.bankName}
                      onChange={(event) => updatePayment('bankName', event.target.value)}
                      style={{ height: 40 }}
                    />
                  </>
                ) : null}
                <button
                  className="button-primary"
                  type="submit"
                  disabled={isSavingPayment}
                  style={{ gridColumn: '1 / -1', height: 42 }}
                >
                  <RefreshCw style={{ width: 15, height: 15 }} />
                  {isSavingPayment ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          )}

          {canAssignTaxNumber && invoice.isTaxInvoice && !isCancelled && (
            <form
              onSubmit={submitTaxNumber}
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <CompactTitle icon={Hash} title="Tax Invoice Number" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input
                  className="form-input"
                  value={taxInvoiceNumber}
                  onChange={(event) => setTaxInvoiceNumber(event.target.value)}
                  placeholder="Tax invoice number"
                  style={{ height: 40 }}
                />
                <button
                  className="button-secondary"
                  type="submit"
                  disabled={isSavingTaxNumber}
                  style={{ height: 40, paddingInline: 12 }}
                >
                  {isSavingTaxNumber ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}

          {canCancel && !isCancelled && (
            <form
              onSubmit={submitCancel}
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <CompactTitle icon={Ban} title="Cancel Invoice" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <textarea
                  className="form-input"
                  rows={2}
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Reason"
                  style={{ minHeight: 50, resize: 'none', paddingTop: 10 }}
                />
                <button
                  className="button-secondary"
                  type="submit"
                  disabled={isCancelling}
                  style={{ height: 40, alignSelf: 'end', paddingInline: 12 }}
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </div>
  )
}
