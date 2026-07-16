import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import StatusBadge from '@components/ui/StatusBadge'
import { salesService } from '@/services/api/salesService'
import { masterService } from '@/services/api/masterService'
import { formatDate as formatSriLankaDate } from '@/utils'

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

function isReturnReason(value, name, number) {
  const normalized = String(value ?? '').toLowerCase()
  return normalized === String(number) || normalized === name.toLowerCase()
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

function AmountRow({ label, value, strong = false, tone, negative = false }) {
  const color =
    tone === 'success'
      ? 'var(--color-teal)'
      : tone === 'warning'
        ? 'var(--color-amber)'
        : strong
          ? 'var(--color-text-primary)'
          : undefined

  return (
    <div
      style={{ display: 'flex', justifyContent: 'space-between', fontWeight: strong ? 800 : 500 }}
    >
      <span style={{ color: strong ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span className="mono" style={{ color }}>
        {negative ? `− ${money(value)}` : money(value)}
      </span>
    </div>
  )
}

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [salesRouteName, setSalesRouteName] = useState('')
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')

  const productById = useMemo(() => {
    return products.reduce((map, p) => {
      map[p.id] = p
      return map
    }, {})
  }, [products])

  async function loadInvoice() {
    setIsLoading(true)
    setError('')

    try {
      const result = await salesService.getInvoice(id)
      setInvoice(result)

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
                isCode={!customerName}
              />
              <InfoItem
                label="Sales Route"
                value={salesRouteName || invoice.salesRouteId}
                isCode={!salesRouteName}
              />
              <InfoItem label="Vehicle" value={invoice.vehicleId} isCode />
              <InfoItem label="Sales Person" value={invoice.salesPersonName || 'Not assigned'} />
              <InfoItem label="Due Date" value={showDate(invoice.dueDate)} isCode />
              <InfoItem label="Customer VRN" value={invoice.customerVatTin} isCode />
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
                    <th style={{ whiteSpace: 'nowrap' }}>Smallest Unit</th>
                    <th className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      MRP
                    </th>
                    <th className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      Qty
                    </th>
                    <th className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      Disc %
                    </th>
                    <th className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      Selling Price
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
                    const isReturnLine = Boolean(line.isReturnLine)
                    const reasonIsDamaged = isReturnReason(line.returnReason, 'Damaged', 1)
                    const reasonIsExpired = isReturnReason(line.returnReason, 'Expired', 2)

                    return (
                      <tr
                        key={line.id}
                        style={
                          isReturnLine
                            ? {
                                borderTop: '1px solid rgba(245, 158, 11, 0.16)',
                                background: 'rgba(245, 158, 11, 0.06)',
                              }
                            : undefined
                        }
                      >
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
                              {isReturnLine ? (
                                <span
                                  className="mono"
                                  style={{
                                    marginLeft: 7,
                                    padding: '1px 6px',
                                    borderRadius: 999,
                                    border: '1px solid rgba(245, 158, 11, 0.48)',
                                    background: 'rgba(245, 158, 11, 0.14)',
                                    color: 'var(--color-amber)',
                                    fontSize: 10,
                                    fontWeight: 900,
                                  }}
                                >
                                  RT
                                </span>
                              ) : null}
                              {isReturnLine ? (
                                <span
                                  style={{
                                    marginLeft: 7,
                                    color: reasonIsDamaged
                                      ? '#fdba74'
                                      : reasonIsExpired
                                        ? '#fca5a5'
                                        : 'var(--color-amber)',
                                    fontSize: 11,
                                    fontWeight: 800,
                                  }}
                                >
                                  (RT)
                                </span>
                              ) : null}
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
                          {line.smallestUnitCode || line.unitId || '-'}
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
                          {line.quantity}
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
                          {money(line.unitPrice)}
                        </td>
                        <td
                          className="text-right mono"
                          style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', fontWeight: 700 }}
                        >
                          {isReturnLine ? (
                            <span style={{ color: 'var(--color-amber)', fontWeight: 900 }}>
                              −{money(line.lineTotal)}
                            </span>
                          ) : (
                            money(line.lineTotal)
                          )}
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
              {Number(invoice.totalSupplierDiscountAmount || 0) > 0 && (
                <AmountRow label="Supplier Discount" value={invoice.totalSupplierDiscountAmount} />
              )}
              {Number(invoice.totalDistributorDiscountAmount || 0) > 0 && (
                <AmountRow
                  label="Distributor Discount"
                  value={invoice.totalDistributorDiscountAmount}
                />
              )}
              {Number(invoice.totalReturnAmount || 0) > 0 && (
                <AmountRow label="Returns" value={invoice.totalReturnAmount} />
              )}
              {Number(invoice.returnCreditAmount || 0) > 0 && (
                <AmountRow
                  label="Returns Credit"
                  value={invoice.returnCreditAmount}
                  tone="warning"
                  negative
                />
              )}
              {Number(invoice.vatAmount || 0) > 0 && (
                <AmountRow label="VAT" value={invoice.vatAmount} />
              )}
              <div style={{ borderTop: '1px solid var(--color-border)', margin: '3px 0' }} />
              <AmountRow label="Net" value={invoice.netAmount} strong />
              <div style={{ borderTop: '1px solid var(--color-border)', margin: '3px 0' }} />
              <AmountRow label="Paid" value={invoice.paidAmount} />
              <AmountRow
                label="Outstanding"
                value={invoice.outstandingAmount}
                strong
                tone={Number(invoice.outstandingAmount || 0) > 0 ? 'warning' : 'success'}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
