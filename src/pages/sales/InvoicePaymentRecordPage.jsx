import dayjs from 'dayjs'
import { CreditCard, RefreshCw, Search, ArrowLeft, FileText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import SimplePagination from '@components/ui/SimplePagination'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'
import { usersService } from '@/services/api/usersService'
import { formatDate as formatSriLankaDate } from '@/utils'

const paymentMethods = [
  { value: 1, label: 'Cash' },
  { value: 2, label: 'Cheque' },
  { value: 4, label: 'Credit note' },
]

const invoicePageSize = 5

const emptyPayment = {
  paymentMethod: 1,
  amount: '',
  paidDate: dayjs().format('YYYY-MM-DD'),
  chequeNumber: '',
  chequeDate: '',
  bankName: '',
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value) {
  return formatSriLankaDate(value)
}

function invoiceStatusLabel(status) {
  return String(status || '').replace(/([a-z])([A-Z])/g, '$1 $2')
}

function DetailItem({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <span className="form-label" style={{ marginBottom: 5 }}>
        {label}
      </span>
      <div
        className="form-input"
        style={{
          height: 38,
          display: 'flex',
          alignItems: 'center',
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={String(value || '-')}
      >
        {value || '-'}
      </div>
    </div>
  )
}

function AmountLine({ label, value, strong = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
      <span style={{ color: strong ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontWeight: strong ? 800 : 600,
          color: strong ? 'var(--color-amber)' : 'var(--color-text-primary)',
        }}
      >
        {formatMoney(value)}
      </span>
    </div>
  )
}

export default function InvoicePaymentRecordPage() {
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null)
  const [search, setSearch] = useState('')
  const [invoicePage, setInvoicePage] = useState(1)
  const [payment, setPayment] = useState(emptyPayment)
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingInvoiceDetail, setIsLoadingInvoiceDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // Custom states for view layout and detail metadata
  const [viewDetail, setViewDetail] = useState(false)
  const [salesRouteName, setSalesRouteName] = useState('')
  const [salesPersonName, setSalesPersonName] = useState('')

  const selectedInvoiceSummary =
    invoices.find((invoice) => invoice.id === selectedInvoiceId) || null
  const selectedInvoice =
    selectedInvoiceDetail?.id === selectedInvoiceId ? selectedInvoiceDetail : selectedInvoiceSummary
  const customerNameById = useMemo(() => {
    return customers.reduce((map, customer) => {
      map[customer.id] = customer.name
      return map
    }, {})
  }, [customers])
  const productById = useMemo(() => {
    return products.reduce((map, product) => {
      map[product.id] = product
      return map
    }, {})
  }, [products])
  const isChequePayment = Number(payment.paymentMethod) === 2
  const canRecordPayment =
    selectedInvoice &&
    selectedInvoice.status !== 'Cancelled' &&
    selectedInvoice.status !== 'Paid' &&
    Number(selectedInvoice.outstandingAmount) > 0

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase()

    return invoices
      .filter((invoice) => Number(invoice.outstandingAmount) > 0 && invoice.status !== 'Cancelled')
      .filter((invoice) => {
        if (!query) return true

        return (
          invoice.invoiceNumber?.toLowerCase().includes(query) ||
          customerNameById[invoice.customerId]?.toLowerCase().includes(query) ||
          invoice.customerId?.toLowerCase().includes(query) ||
          invoice.id?.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
  }, [customerNameById, invoices, search])
  const pagedInvoices = useMemo(() => {
    const startIndex = (invoicePage - 1) * invoicePageSize
    return filteredInvoices.slice(startIndex, startIndex + invoicePageSize)
  }, [filteredInvoices, invoicePage])

  async function loadInvoiceDetail(invoiceId) {
    if (!invoiceId) {
      setSelectedInvoiceDetail(null)
      setSalesRouteName('')
      setSalesPersonName('')
      return null
    }

    setIsLoadingInvoiceDetail(true)
    try {
      const invoiceDetail = await salesService.getInvoice(invoiceId)
      setSelectedInvoiceDetail(invoiceDetail)

      // Resolve sales route name
      if (invoiceDetail.salesRouteId) {
        masterService
          .getSalesRoute(invoiceDetail.salesRouteId)
          .then((r) => setSalesRouteName(r?.name || ''))
          .catch(() => setSalesRouteName(''))
      } else {
        setSalesRouteName('')
      }

      // Resolve sales person name
      if (invoiceDetail.salesPersonId) {
        usersService
          .getUser(invoiceDetail.salesPersonId)
          .then((u) => setSalesPersonName(u?.username || u?.email || ''))
          .catch(() => setSalesPersonName(''))
      } else {
        setSalesPersonName('')
      }

      const productIds = Array.from(
        new Set((invoiceDetail.lines || []).map((line) => line.productId).filter(Boolean))
      )
      const productResults = await Promise.allSettled(
        productIds.map((productId) => masterService.getProduct(productId))
      )
      setProducts(
        productResults.flatMap((result) =>
          result.status === 'fulfilled' && result.value ? [result.value] : []
        )
      )

      return invoiceDetail
    } catch (requestError) {
      setSelectedInvoiceDetail(null)
      setSalesRouteName('')
      setSalesPersonName('')
      setProducts([])
      toast.error(requestError.message || 'Unable to load invoice lines.')
      return null
    } finally {
      setIsLoadingInvoiceDetail(false)
    }
  }
  async function loadInvoices() {
    setIsLoading(true)
    setError('')

    try {
      // Load invoices once for the organisation. The previous implementation issued one
      // outstanding-invoice request per customer, which exhausted the global rate limit.
      const [activeCustomers, organisationInvoices] = await Promise.all([
        salesService.listAllCustomers({
          pageSize: 100,
          isActive: true,
        }),
        salesService.listInvoices({ page: 1, pageSize: 1000 }),
      ])

      const outstandingInvoices = organisationInvoices
        .filter(
          (invoice) => Number(invoice.outstandingAmount) > 0 && invoice.status !== 'Cancelled'
        )
        .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))

      setCustomers(activeCustomers)
      setInvoices(outstandingInvoices)
      setSelectedInvoiceId((currentId) => {
        if (outstandingInvoices.some((invoice) => invoice.id === currentId)) return currentId
        return outstandingInvoices[0]?.id || ''
      })
    } catch (requestError) {
      setError(requestError.message || 'Unable to load invoices.')
      setCustomers([])
      setInvoices([])
      setSelectedInvoiceId('')
      setSelectedInvoiceDetail(null)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [])
  useEffect(() => {
    loadInvoiceDetail(selectedInvoiceId)
  }, [selectedInvoiceId])
  useEffect(() => {
    setInvoicePage(1)
  }, [search])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / invoicePageSize))
    if (invoicePage > totalPages) setInvoicePage(totalPages)
  }, [filteredInvoices.length, invoicePage])

  function updatePayment(field, value) {
    setPayment((current) => ({ ...current, [field]: value }))
  }

  async function submitPayment(event) {
    event.preventDefault()

    if (!selectedInvoice) {
      toast.error('Select an invoice before recording payment.')
      return
    }

    const amount = Number(payment.amount)
    if (!amount || amount <= 0) {
      toast.error('Payment amount must be greater than zero.')
      return
    }

    if (amount > Number(selectedInvoice.outstandingAmount)) {
      toast.error('Payment amount cannot exceed the outstanding amount.')
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

    setIsSaving(true)
    try {
      await salesService.addInvoicePayment(selectedInvoice.id, payload)
      toast.success('Payment recorded successfully.')
      setPayment(emptyPayment)
      // Auto return back to list view on payment success if no longer outstanding
      setViewDetail(false)
      await loadInvoices()
      await loadInvoiceDetail(selectedInvoice.id)
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to record payment.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="responsive-page"
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        paddingBottom: 16,
      }}
    >
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>
          Invoice Payment Record
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Select an outstanding invoice and record the customer payment.
        </p>
      </div>

      <div
        className="responsive-master-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 14,
          flex: 1,
          minHeight: 0,
        }}
      >
        <main style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {!viewDetail ? (
            <>
              <section className="panel" style={{ padding: 14 }}>
                <div
                  className="grn-filter-search"
                  style={{ position: 'relative', maxWidth: 420, minWidth: 0 }}
                >
                  <Search
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      width: 16,
                      height: 16,
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-dim)',
                    }}
                  />
                  <input
                    className="form-input"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search invoice or customer"
                    style={{ paddingLeft: 38 }}
                  />
                </div>
              </section>

              <section
                className="panel"
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <h2 style={{ fontSize: 15, fontWeight: 800 }}>Outstanding Invoices</h2>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {filteredInvoices.length} invoice{filteredInvoices.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div
                  className="responsive-table-shell"
                  style={{ overflow: 'auto', flex: 1, minHeight: 0 }}
                >
                  {isLoading ? (
                    <div style={{ padding: 16, color: 'var(--color-text-muted)' }}>
                      Loading invoices...
                    </div>
                  ) : error ? (
                    <div style={{ padding: 16, color: 'var(--color-danger)' }}>{error}</div>
                  ) : filteredInvoices.length ? (
                    <table className="data-table product-table-compact" style={{ minWidth: 760 }}>
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Net</th>
                          <th style={{ textAlign: 'right' }}>Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedInvoices.map((invoice) => {
                          const isSelected = invoice.id === selectedInvoiceId

                          return (
                            <tr
                              key={invoice.id}
                              onClick={() => {
                                setSelectedInvoiceId(invoice.id)
                                setViewDetail(true)
                              }}
                              style={{
                                cursor: 'pointer',
                                background: isSelected
                                  ? 'color-mix(in srgb, var(--color-amber) 10%, transparent)'
                                  : undefined,
                              }}
                            >
                              <td>
                                <span className="mono" style={{ fontWeight: 700 }}>
                                  {invoice.invoiceNumber}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontWeight: 700 }}>
                                    {customerNameById[invoice.customerId] ||
                                      invoice.customerId ||
                                      '-'}
                                  </span>
                                  {customerNameById[invoice.customerId] ? (
                                    <span
                                      className="mono"
                                      style={{ fontSize: 11, color: 'var(--color-text-dim)' }}
                                    >
                                      {invoice.customerId}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td>{formatDate(invoice.invoiceDate)}</td>
                              <td>
                                <StatusBadge status={invoiceStatusLabel(invoice.status)} />
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {formatMoney(invoice.netAmount)}
                              </td>
                              <td
                                className="mono"
                                style={{ textAlign: 'right', color: 'var(--color-amber)' }}
                              >
                                {formatMoney(invoice.outstandingAmount)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: 16, color: 'var(--color-text-muted)' }}>
                      No outstanding invoices found.
                    </div>
                  )}
                </div>
                {filteredInvoices.length ? (
                  <div style={{ padding: '0 12px 10px', flexShrink: 0 }}>
                    <SimplePagination
                      page={invoicePage}
                      pageSize={invoicePageSize}
                      totalItems={filteredInvoices.length}
                      onPageChange={setInvoicePage}
                      itemLabel="invoices"
                    />
                  </div>
                ) : null}
              </section>
            </>
          ) : (
            <>
              {selectedInvoice ? (
                <>
                  <section
                    className="panel"
                    style={{
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          onClick={() => setViewDetail(false)}
                          className="button-secondary"
                          style={{
                            height: 34,
                            padding: '0 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontWeight: 600,
                          }}
                        >
                          <ArrowLeft size={15} /> Back
                        </button>
                        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>
                          Invoice Details:{' '}
                          <span className="mono" style={{ color: 'var(--color-amber)' }}>
                            {selectedInvoice.invoiceNumber}
                          </span>
                        </h2>
                      </div>
                      <StatusBadge status={invoiceStatusLabel(selectedInvoice.status)} />
                    </div>

                    <hr
                      style={{
                        border: 'none',
                        borderBottom: '1px solid var(--color-border)',
                        margin: 0,
                      }}
                    />

                    <div
                      className="responsive-field-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                        gap: 10,
                      }}
                    >
                      <DetailItem label="Invoice No" value={selectedInvoice.invoiceNumber} />
                      <DetailItem
                        label="Customer"
                        value={
                          customerNameById[selectedInvoice.customerId] || selectedInvoice.customerId
                        }
                      />
                      <DetailItem
                        label="Invoice Date"
                        value={formatDate(selectedInvoice.invoiceDate)}
                      />
                      <DetailItem label="Due Date" value={formatDate(selectedInvoice.dueDate)} />
                      <DetailItem
                        label="Sales Route"
                        value={salesRouteName || selectedInvoice.salesRouteId}
                      />
                      <DetailItem label="Vehicle" value={selectedInvoice.vehicleId} />
                      <DetailItem
                        label="Sales Person"
                        value={salesPersonName || selectedInvoice.salesPersonId}
                      />
                      <DetailItem label="Tax Invoice No" value={selectedInvoice.taxInvoiceNumber} />
                    </div>
                  </section>

                  <section
                    className="panel"
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--color-border)',
                        background: 'var(--color-bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={16} color="var(--color-teal)" />
                      <h3 style={{ fontSize: 15, fontWeight: 800 }}>Invoice Lines</h3>
                    </div>
                    <div className="responsive-table-shell" style={{ overflow: 'auto', flex: 1 }}>
                      <table className="data-table" style={{ minWidth: 800 }}>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Batch</th>
                            <th style={{ textAlign: 'right' }}>Qty</th>
                            <th style={{ textAlign: 'right' }}>Unit Price</th>
                            <th style={{ textAlign: 'right' }}>MRP</th>
                            <th style={{ textAlign: 'right' }}>Disc %</th>
                            <th style={{ textAlign: 'right' }}>VAT</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isLoadingInvoiceDetail ? (
                            <tr>
                              <td
                                colSpan={8}
                                style={{
                                  color: 'var(--color-text-muted)',
                                  textAlign: 'center',
                                  padding: 24,
                                }}
                              >
                                Loading invoice lines...
                              </td>
                            </tr>
                          ) : (selectedInvoice.lines || []).length ? (
                            (selectedInvoice.lines || []).map((line) => {
                              const product = productById[line.productId]
                              const productSku = product?.sku || line.productId
                              const productName = product?.name || 'Unknown Product'

                              return (
                                <tr key={line.id}>
                                  <td>
                                    <div
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 3,
                                        alignItems: 'flex-start',
                                      }}
                                    >
                                      <span
                                        className="product-sku-badge mono"
                                        style={{ fontSize: 10 }}
                                      >
                                        {productSku}
                                      </span>
                                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                                        {productName}
                                      </span>
                                    </div>
                                  </td>
                                  <td
                                    className="mono text-xs text-cyan-600"
                                    style={{
                                      textAlign: 'left',
                                      verticalAlign: 'middle',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {line.batchNo}
                                  </td>
                                  <td
                                    className="mono"
                                    style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                                  >
                                    {line.quantity}{' '}
                                    <span
                                      style={{ fontSize: 11, color: 'var(--color-text-muted)' }}
                                    >
                                      {line.smallestUnitCode || line.unitId}
                                    </span>
                                  </td>
                                  <td
                                    className="mono"
                                    style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                                  >
                                    {formatMoney(line.unitPrice)}
                                  </td>
                                  <td
                                    className="mono"
                                    style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                                  >
                                    {formatMoney(line.mrp)}
                                  </td>
                                  <td
                                    className="mono"
                                    style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                                  >
                                    {line.discountPercent}%
                                  </td>
                                  <td
                                    className="mono"
                                    style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                                  >
                                    {formatMoney(line.vatAmount)}
                                  </td>
                                  <td
                                    className="mono"
                                    style={{
                                      textAlign: 'right',
                                      whiteSpace: 'nowrap',
                                      fontWeight: 800,
                                    }}
                                  >
                                    {formatMoney(line.lineTotal)}
                                  </td>
                                </tr>
                              )
                            })
                          ) : (
                            <tr>
                              <td
                                colSpan={7}
                                style={{
                                  color: 'var(--color-text-muted)',
                                  textAlign: 'center',
                                  padding: 24,
                                }}
                              >
                                No invoice lines found for this invoice.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              ) : (
                <div className="panel" style={{ padding: 20 }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                    No invoice selected. Click Back to select an invoice.
                  </p>
                </div>
              )}
            </>
          )}
        </main>

        <aside
          className="panel"
          style={{
            padding: 14,
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <section>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Billing</h2>
            {selectedInvoice ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AmountLine label="Gross" value={selectedInvoice.grossAmount} />
                <AmountLine label="Discount" value={selectedInvoice.totalDiscountAmount} />
                <AmountLine
                  label="Supplier Discount"
                  value={selectedInvoice.totalSupplierDiscountAmount}
                />
                <AmountLine
                  label="Distributor Discount"
                  value={selectedInvoice.totalDistributorDiscountAmount}
                />
                <AmountLine label="Returns" value={selectedInvoice.totalReturnAmount} />
                <AmountLine label="VAT" value={selectedInvoice.vatAmount} />
                <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                <AmountLine label="Net" value={selectedInvoice.netAmount} strong />
                <AmountLine label="Paid" value={selectedInvoice.paidAmount} />
                <AmountLine label="Outstanding" value={selectedInvoice.outstandingAmount} strong />
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                Choose an invoice from the left side.
              </p>
            )}
          </section>

          <form
            onSubmit={submitPayment}
            style={{ paddingTop: 14, borderTop: '1px solid var(--color-border)' }}
          >
            <h3
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              <CreditCard style={{ width: 16, height: 16 }} />
              Record Payment Form
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label>
                <span className="form-label">Method</span>
                <select
                  className="form-input"
                  value={payment.paymentMethod}
                  onChange={(event) => updatePayment('paymentMethod', event.target.value)}
                  disabled={!canRecordPayment}
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="form-label">Amount</span>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payment.amount}
                  onChange={(event) => updatePayment('amount', event.target.value)}
                  placeholder="0.00"
                  disabled={!canRecordPayment}
                />
              </label>

              <label style={{ gridColumn: isChequePayment ? 'auto' : '1 / -1' }}>
                <span className="form-label">Paid Date</span>
                <input
                  className="form-input"
                  type="date"
                  value={payment.paidDate}
                  onChange={(event) => updatePayment('paidDate', event.target.value)}
                  disabled={!canRecordPayment}
                />
              </label>

              {isChequePayment ? (
                <>
                  <label>
                    <span className="form-label">Cheque Date</span>
                    <input
                      className="form-input"
                      type="date"
                      value={payment.chequeDate}
                      onChange={(event) => updatePayment('chequeDate', event.target.value)}
                      disabled={!canRecordPayment}
                    />
                  </label>
                  <label>
                    <span className="form-label">Cheque No</span>
                    <input
                      className="form-input"
                      value={payment.chequeNumber}
                      onChange={(event) => updatePayment('chequeNumber', event.target.value)}
                      disabled={!canRecordPayment}
                    />
                  </label>
                  <label>
                    <span className="form-label">Bank Name</span>
                    <input
                      className="form-input"
                      value={payment.bankName}
                      onChange={(event) => updatePayment('bankName', event.target.value)}
                      disabled={!canRecordPayment}
                    />
                  </label>
                </>
              ) : null}

              <button
                className="button-primary"
                type="submit"
                disabled={!canRecordPayment || isSaving}
                style={{ gridColumn: '1 / -1', height: 42, marginTop: 4 }}
              >
                <RefreshCw style={{ width: 15, height: 15 }} />
                {isSaving ? 'Submitting...' : 'Submit Payment'}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  )
}
