import { Edit, Trash2 } from 'lucide-react'
import { formatMoney, toNumber } from '../returnNoteHelpers'

function SourceBadge({ staged }) {
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        padding: '3px 7px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.06em',
        color: staged ? 'var(--color-amber)' : 'var(--color-text-muted)',
        background: staged
          ? 'color-mix(in srgb, var(--color-amber) 14%, transparent)'
          : 'rgba(255,255,255,0.06)',
        border: `1px solid ${
          staged ? 'color-mix(in srgb, var(--color-amber) 35%, transparent)' : 'var(--color-border)'
        }`,
      }}
    >
      {staged ? 'STAGED' : 'MANUAL'}
    </span>
  )
}

export default function ReturnItemsTable({ items = [], editable = false, onEdit, onRemove }) {
  return (
    <section
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <strong style={{ fontSize: 13 }}>Return Items</strong>
        <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="responsive-table-shell" style={{ overflowX: 'auto' }}>
        <table className="data-table product-table-compact" style={{ minWidth: 960 }}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Source</th>
              <th>Batch</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Unit Cost</th>
              <th style={{ textAlign: 'right' }}>Supplier Refund</th>
              <th>Reason</th>
              {editable ? <th style={{ width: 110 }} /> : null}
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="product-sku-badge mono">{item.productSku || item.productId}</span>
                    <div className="product-info-sub" style={{ marginTop: 4 }}>
                      {item.productName || item.productId}
                    </div>
                  </td>
                  <td>
                    <SourceBadge staged={Boolean(item.stockReturnEntryId)} />
                  </td>
                  <td className="mono">{item.batchNo || '-'}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {item.qtySmallestUnit} {item.smallestUomCode || ''}
                  </td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {formatMoney(item.unitCostSmallest)}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatMoney(toNumber(item.supplierRefundAmount ?? item.unitCostSmallest * item.qtySmallestUnit))}
                  </td>
                  <td>{item.returnReason || '-'}</td>
                  {editable ? (
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button type="button" className="icon-button" onClick={() => onEdit?.(item)} title="Edit item">
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => onRemove?.(item.id)}
                          title="Remove item"
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={editable ? 8 : 7}
                  style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 28 }}
                >
                  No return items added.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
