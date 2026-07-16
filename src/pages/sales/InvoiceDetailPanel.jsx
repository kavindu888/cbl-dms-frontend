import { Package } from 'lucide-react'

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function amountTone(value) {
  return Number(value || 0) > 0 ? 'var(--color-amber)' : 'var(--color-teal)'
}

export default function InvoiceDetailPanel({ invoice, productById }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 0,
      }}
    >
      <div
        style={{
          minHeight: 150,
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <Package style={{ width: 15, height: 15, color: 'var(--color-teal)' }} />
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Invoice Lines
          </h3>
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
            {invoice.lines?.length || 0} item{invoice.lines?.length === 1 ? '' : 's'}
          </span>
        </div>
        <div
          className="responsive-table-shell"
          style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
        >
          <table className="data-table product-table-compact">
            <thead>
              <tr>
                <th>Item</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>MRP</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Disc %</th>
                <th style={{ textAlign: 'right' }}>Selling Price</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lines || []).map((line) => {
                const product = productById[line.productId]
                return (
                  <tr key={line.id}>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 3,
                        }}
                      >
                        <span className="product-sku-badge mono">
                          {product?.sku || line.productId}
                        </span>
                        <span className="product-info-sub">
                          {product?.name || 'Unknown Product'}
                        </span>
                      </div>
                    </td>
                    <td className="mono">{line.smallestUnitCode || line.unitId || '-'}</td>
                    <td className="mono text-right">{formatMoney(line.mrp)}</td>
                    <td className="mono text-right">{line.quantity}</td>
                    <td className="mono text-right">{line.discountPercent}%</td>
                    <td className="mono text-right">{formatMoney(line.unitPrice)}</td>
                    <td className="mono text-right font-semibold">{formatMoney(line.lineTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          padding: 14,
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          background: 'var(--color-bg-elevated)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <SummaryRow label="Gross" value={formatMoney(invoice.grossAmount)} />
        {Number(invoice.totalDiscountAmount || 0) > 0 && (
          <SummaryRow label="Discount" value={formatMoney(invoice.totalDiscountAmount)} />
        )}
        {Number(invoice.totalSupplierDiscountAmount || 0) > 0 && (
          <SummaryRow
            label="Supplier Discount"
            value={formatMoney(invoice.totalSupplierDiscountAmount)}
          />
        )}
        {Number(invoice.totalDistributorDiscountAmount || 0) > 0 && (
          <SummaryRow
            label="Distributor Discount"
            value={formatMoney(invoice.totalDistributorDiscountAmount)}
          />
        )}
        {Number(invoice.vatAmount || 0) > 0 && (
          <SummaryRow label="VAT" value={formatMoney(invoice.vatAmount)} />
        )}
        {Number(invoice.totalReturnAmount || 0) > 0 && (
          <SummaryRow label="Returns" value={formatMoney(invoice.totalReturnAmount)} />
        )}
        <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 3, paddingTop: 10 }}>
          <SummaryRow label="Net" value={formatMoney(invoice.netAmount)} strong />
        </div>
        <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 3, paddingTop: 10 }}>
          <SummaryRow label="Paid" value={formatMoney(invoice.paidAmount)} />
        </div>
        <SummaryRow
          label="Outstanding"
          value={formatMoney(invoice.outstandingAmount)}
          strong
          valueColor={amountTone(invoice.outstandingAmount)}
        />
      </div>
    </div>
  )
}

function SummaryRow({ label, value, strong = false, valueColor }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        fontSize: 12,
      }}
    >
      <span
        style={{
          fontWeight: strong ? 700 : 500,
          color: strong ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        }}
      >
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: strong ? 14 : 12,
          fontWeight: strong ? 800 : 500,
          color: valueColor || (strong ? 'var(--color-text-primary)' : 'var(--color-text-primary)'),
        }}
      >
        {value}
      </span>
    </div>
  )
}
