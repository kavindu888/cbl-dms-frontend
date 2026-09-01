import { useState } from 'react'
import { toast } from 'sonner'
import Modal from '@components/ui/Modal'
import { salesService } from '@/services/api/salesService'

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function RecalculateInvoiceDiscountsModal({ isOpen, onClose, invoice, onDone }) {
  const [overridesByLine, setOverridesByLine] = useState({})
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const normalLines = (invoice?.lines || []).filter((line) => !line.isReturnLine)

  function setOverride(lineId, value) {
    setOverridesByLine((current) => {
      const next = { ...current }
      if (value === '') delete next[lineId]
      else next[lineId] = value
      return next
    })
  }

  async function submit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const overrides = Object.entries(overridesByLine)
        .filter(([, value]) => value !== '')
        .map(([lineId, value]) => ({ lineId, skuDiscountPercent: Number(value) }))

      await salesService.recalculateInvoiceDiscounts(invoice.id, {
        reason: reason.trim() || null,
        overrides: overrides.length ? overrides : null,
      })
      toast.success('Invoice discounts recalculated.')
      setOverridesByLine({})
      setReason('')
      onDone?.()
      onClose()
    } catch (error) {
      toast.error(error.message || 'Unable to recalculate discounts.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Recalculate Invoice Discounts"
      description="Re-derives SKU and category discount for each line using current active discount rules. Leave a line blank to auto-resolve it; type a value to set it manually."
      maxWidth="760px"
      showHeader={false}
      contentStyle={{ padding: 0, overflow: 'hidden' }}
    >
      <form onSubmit={submit}>
        <div
          style={{
            padding: '22px 24px 18px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: 'var(--color-text-primary)' }}>
            Recalculate Invoice Discounts
          </h2>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
            Invoice {invoice?.invoiceNumber || invoice?.serialNumber} — re-derives SKU and category
            discount per line using current active discount rules. Leave a line's field blank to
            auto-resolve it; type a value to set it manually.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 8, padding: '18px 24px', maxHeight: 360, overflowY: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) 110px 150px',
              gap: 12,
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--color-text-dim)',
              padding: '0 4px',
            }}
          >
            <span>Product</span>
            <span style={{ textAlign: 'right' }}>Current SKU %</span>
            <span style={{ textAlign: 'right' }}>New SKU % (blank = auto)</span>
          </div>
          {normalLines.map((line) => (
            <div
              key={line.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.6fr) 110px 150px',
                alignItems: 'center',
                gap: 12,
                padding: '8px 4px',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>
                  {line.productSku}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {line.productName}
                </div>
              </div>
              <div className="mono" style={{ textAlign: 'right', fontSize: 12 }}>
                {Number(line.skuDiscountPercent || 0)}%
              </div>
              <input
                className="form-input mono"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="Auto"
                value={overridesByLine[line.id] ?? ''}
                onChange={(event) => setOverride(line.id, event.target.value)}
                style={{ height: 34, textAlign: 'right' }}
              />
            </div>
          ))}
          {!normalLines.length ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No lines on this invoice.
            </div>
          ) : null}
        </div>

        <div style={{ padding: '0 24px 18px' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="form-label">Reason (optional, kept for audit)</span>
            <textarea
              className="form-input"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. missed SKU discount when order was created"
              style={{ minHeight: 60, paddingTop: 8, resize: 'vertical' }}
            />
          </label>
        </div>

        {invoice ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 24px',
              borderTop: '1px solid var(--color-border)',
              fontSize: 12,
              color: 'var(--color-text-muted)',
            }}
          >
            <span>Current Net</span>
            <span className="mono">{formatMoney(invoice.netAmount)}</span>
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button type="button" className="button-secondary" onClick={onClose} style={{ height: 38, minWidth: 92 }}>
            Cancel
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={isSubmitting || !normalLines.length}
            style={{ height: 38, minWidth: 160 }}
          >
            {isSubmitting ? 'Recalculating...' : 'Recalculate Discounts'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
