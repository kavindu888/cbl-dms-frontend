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

function billReturnReasonLabel(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === '1' || normalized === 'damage' || normalized === 'damaged') return 'DAMAGE:'
  if (normalized === '2' || normalized === 'expiry' || normalized === 'expired') return 'EXPIRY:'
  if (normalized === '3' || normalized === 'short expiry' || normalized === 'shortexpiry') {
    return 'SHORT EXPIRY:'
  }
  if (normalized === '4' || normalized === 'overstock' || normalized === 'unwanted') {
    return 'OVERSTOCK:'
  }
  return value ? String(value) : 'RETURNS:'
}

function InfoItem({ label, value, subValue, isCode = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span
        className="form-label"
        style={{
          marginBottom: 0,
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
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
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            wordBreak: 'break-word',
            lineHeight: 1.2,
          }}
        >
          {value || '-'}
        </span>
        {subValue ? (
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--color-text-muted)',
              marginTop: 2,
              wordBreak: 'break-all',
            }}
          >
            {subValue}
          </span>
        ) : null}
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
        {negative ? `- ${money(value)}` : money(value)}
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
    return products.reduce((map, product) => {
      map[product.id] = product
      return map
    }, {})
  }, [products])

  const normalInvoiceLines = useMemo(() => {
    return (invoice?.lines || []).filter((line) => !line.isReturnLine)
  }, [invoice])

  async function loadInvoice() {
    setIsLoading(true)
    setError('')

    try {
      const result = await salesService.getInvoice(id)
      console.log('Invoice return sections:', result?.returnSections)
      setInvoice(result)

      if (result?.customerId) {
        salesService
          .getCustomer(result.customerId)
          .then((customer) => setCustomerName(customer?.name || ''))
          .catch(() => setCustomerName(''))
      } else {
        setCustomerName('')
      }

      if (result?.salesRouteId) {
        masterService
          .getSalesRoute(result.salesRouteId)
          .then((route) => setSalesRouteName(route?.name || ''))
          .catch(() => setSalesRouteName(''))
      } else {
        setSalesRouteName('')
      }

      const productIds = Array.from(
        new Set((result?.lines || []).map((line) => line.productId).filter(Boolean))
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
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Ordered Items
              </h2>
            </div>
            <div className="overflow-x-auto" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <table className="data-table" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>UNIT</th>
                    <th className="text-right">QTY</th>
                    <th className="text-right">RATE</th>
                    <th className="text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {normalInvoiceLines.map((line) => {
                    const product = productById[line.productId]
                    const productSku = line.productSku || product?.sku || line.productId
                    const productName = line.productName || product?.name || 'Unknown Product'

                    return (
                      <tr key={line.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div className="mono" style={{ fontSize: 12, color: 'var(--color-accent)' }}>
                              {productSku}
                            </div>
                            <div style={{ fontWeight: 700 }}>{productName}</div>
                            <div className="mono" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                              MRP: {money(line.mrp)}
                            </div>
                          </div>
                        </td>
                        <td className="mono">{line.smallestUnitCode || line.unitId || '-'}</td>
                        <td className="mono text-right">{line.quantity}</td>
                        <td className="mono text-right">{money(line.unitPrice)}</td>
                        <td className="mono text-right" style={{ fontWeight: 800 }}>
                          {money(line.lineTotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderTop: '1px solid var(--color-border)',
                  fontWeight: 800,
                }}
              >
                <span>NET TOTAL B/F RETURN</span>
                <span className="mono">{money(invoice.grossAmount)}</span>
              </div>

              {(invoice.returnSections || []).map((section) => (
                <div key={section.reasonLabel} style={{ marginTop: 12 }}>
                  <div
                    style={{
                      padding: '0 12px 6px',
                      color: 'var(--color-amber)',
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {billReturnReasonLabel(section.reasonLabel)}
                  </div>
                  <table className="data-table" style={{ minWidth: 760 }}>
                    <tbody>
                      {(section.lines || []).map((line, index) => (
                        <tr
                          key={`${section.reasonLabel}-${line.productId}-${index}`}
                          style={{
                            color: 'var(--color-text-muted)',
                            textDecoration: 'line-through',
                          }}
                        >
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <div style={{ fontWeight: 700 }}>{line.productName || line.productId}</div>
                              <div className="mono" style={{ fontSize: 11 }}>
                                MRP: {money(line.mrp)}
                              </div>
                            </div>
                          </td>
                          <td className="mono">{line.unitCode || '-'}</td>
                          <td className="mono text-right">{line.quantity}</td>
                          <td className="mono text-right">{money(line.sellingPrice)}</td>
                          <td className="mono text-right">{money(line.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      color: 'var(--color-amber)',
                      fontSize: 13,
                    }}
                  >
                    <span>Subtotal</span>
                    <span className="mono">{money(section.sectionTotal)}</span>
                  </div>
                </div>
              ))}

              {Number(invoice.totalReturnAmount || 0) > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    color: 'var(--color-text-muted)',
                    fontSize: 13,
                  }}
                >
                  <span>REVERSE GRTS</span>
                  <span className="mono">(0.00)</span>
                </div>
              ) : null}
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
              {Number(invoice.totalDiscountAmount || 0) > 0 ? (
                <AmountRow label="SkuDiscount" value={invoice.totalDiscountAmount} />
              ) : null}
              {Number(invoice.totalReturnAmount || 0) > 0 ? (
                <AmountRow label="Returns" value={invoice.totalReturnAmount} />
              ) : null}
              <div style={{ borderTop: '1px solid var(--color-border)', margin: '3px 0' }} />
              <AmountRow label="Net(Rs)" value={invoice.netAmount} strong />
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
