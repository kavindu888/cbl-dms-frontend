import { Package, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@stores/authStore'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'
import RecalculateInvoiceDiscountsModal from './RecalculateInvoiceDiscountsModal'

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function amountTone(value) {
  return Number(value || 0) > 0 ? 'var(--color-amber)' : 'var(--color-teal)'
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

export default function InvoiceDetailPanel({ invoice, productById, onRefresh }) {
  const currentUser = useAuthStore((state) => state.user)
  const canAdjustDiscounts = userHasPermission(currentUser, PERMISSIONS.sales.invoiceAdjustDiscounts)
  const [isRecalculateOpen, setIsRecalculateOpen] = useState(false)
  const normalLines = (invoice.lines || []).filter((line) => !line.isReturnLine)
  const saleNetBeforeReturn = normalLines.reduce(
    (sum, line) => sum + Number(line.lineTotal || 0),
    0
  )
  const returnDeduction =
    Number(invoice.totalReturnAmount || 0) + Number(invoice.returnCreditAmount || 0)

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
            Ordered Items
          </h3>
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
            {normalLines.length} item{normalLines.length === 1 ? '' : 's'}
          </span>
          {canAdjustDiscounts && invoice.status !== 'Cancelled' ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() => setIsRecalculateOpen(true)}
              style={{ marginLeft: 'auto', height: 26, fontSize: 11, padding: '0 10px' }}
            >
              <Wrench size={12} /> Recalculate Discounts
            </button>
          ) : null}
        </div>
        <div
          className="responsive-table-shell"
          style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
        >
          <table className="data-table product-table-compact">
            <thead>
              <tr>
                <th>SKU</th>
                <th>UNIT</th>
                <th style={{ textAlign: 'right' }}>QTY</th>
                <th style={{ textAlign: 'right' }}>RATE</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {normalLines.map((line) => {
                const product = productById[line.productId]
                const productSku = line.productSku || product?.sku || line.productId
                const productName = line.productName || product?.name || 'Unknown Product'

                return (
                  <tr key={line.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--color-accent)' }}>
                          {productSku}
                        </span>
                        <span className="product-info-sub">{productName}</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          MRP: {formatMoney(line.mrp)}
                        </span>
                      </div>
                    </td>
                    <td className="mono">{line.smallestUnitCode || line.unitId || '-'}</td>
                    <td className="mono text-right">{line.quantity}</td>
                    <td className="mono text-right">{formatMoney(line.unitPrice)}</td>
                    <td className="mono text-right font-semibold">{formatMoney(line.lineTotal)}</td>
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
            <span className="mono">{formatMoney(saleNetBeforeReturn)}</span>
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
              <table className="data-table product-table-compact">
                <tbody>
                  {(section.lines || []).map((line, index) => (
                    <tr
                      key={`${section.reasonLabel}-${line.productId}-${index}`}
                      style={{ color: 'var(--color-text-muted)', textDecoration: 'line-through' }}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span>{line.productName || line.productId}</span>
                          <span className="mono" style={{ fontSize: 11 }}>
                            MRP: {formatMoney(line.mrp)}
                          </span>
                        </div>
                      </td>
                      <td className="mono">{line.unitCode || '-'}</td>
                      <td className="mono text-right">{line.quantity}</td>
                      <td className="mono text-right">{formatMoney(line.sellingPrice)}</td>
                      <td className="mono text-right">{formatMoney(line.lineTotal)}</td>
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
                <span className="mono">{formatMoney(section.sectionTotal)}</span>
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
        {Number(invoice.totalCategoryDiscountAmount || 0) > 0 ? (
          <SummaryRow
            label="Category Discount"
            value={formatMoney(invoice.totalCategoryDiscountAmount)}
          />
        ) : null}
        <SummaryRow
          label="Subtotal"
          value={formatMoney(
            Number(invoice.grossAmount || 0) - Number(invoice.totalCategoryDiscountAmount || 0)
          )}
        />
        {Number(invoice.totalSkuDiscountAmount || 0) > 0 ? (
          <SummaryRow label="SKU Discount" value={formatMoney(invoice.totalSkuDiscountAmount)} />
        ) : null}
        {Number(invoice.totalSpecialDiscountAmount || 0) > 0 ? (
          <SummaryRow
            label="Special Discount"
            value={formatMoney(invoice.totalSpecialDiscountAmount)}
          />
        ) : null}
        {returnDeduction > 0 ? (
          <SummaryRow label="Returns" value={formatMoney(returnDeduction)} />
        ) : null}
        {Number(invoice.vatAmount || 0) > 0 ? (
          <SummaryRow label="VAT" value={formatMoney(invoice.vatAmount)} />
        ) : null}
        <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 3, paddingTop: 10 }}>
          <SummaryRow label="Net(Rs)" value={formatMoney(invoice.netAmount)} strong />
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

      <RecalculateInvoiceDiscountsModal
        isOpen={isRecalculateOpen}
        invoice={invoice}
        onClose={() => setIsRecalculateOpen(false)}
        onDone={onRefresh}
      />
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
