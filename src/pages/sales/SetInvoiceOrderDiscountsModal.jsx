import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Modal from '@components/ui/Modal'
import { salesService } from '@/services/api/salesService'

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function SetInvoiceOrderDiscountsModal({ isOpen, onClose, invoice, onDone }) {
  const [skuAmount, setSkuAmount] = useState('')
  const [specialAmount, setSpecialAmount] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !invoice) return
    setSkuAmount(String(invoice.totalSkuDiscountAmount ?? 0))
    setSpecialAmount(String(invoice.totalSpecialDiscountAmount ?? 0))
    setReason('')
  }, [isOpen, invoice])

  async function submit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await salesService.setInvoiceOrderDiscounts(invoice.id, {
        reason: reason.trim() || null,
        skuDiscountAmount: skuAmount,
        specialDiscountAmount: specialAmount,
      })
      toast.success('Order-level discounts updated.')
      onDone?.()
      onClose()
    } catch (error) {
      toast.error(error.message || 'Unable to update discounts.')
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
      title="Set Order-Level Discounts"
      description="Directly set the SKU/Special discount Rs amount for this invoice — use this to restore or correct a discount that isn't reflecting correctly."
      maxWidth="560px"
      showHeader={false}
      contentStyle={{ padding: 0, overflow: 'hidden' }}
    >
      <form onSubmit={submit}>
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: 'var(--color-text-primary)' }}>
            Set Order-Level Discounts
          </h2>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
            Invoice {invoice?.invoiceNumber || invoice?.serialNumber} — directly sets the SKU and
            Special discount rupee amounts (same as the boxes when the invoice was drafted). Use this
            to restore a discount that was lost or is showing incorrectly.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 14, padding: 24 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="form-label">SKU Discount Amount (Rs)</span>
            <input
              className="form-input mono"
              type="number"
              min="0"
              step="0.01"
              value={skuAmount}
              onChange={(event) => setSkuAmount(event.target.value)}
              style={{ height: 40 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="form-label">Special Discount Amount (Rs)</span>
            <input
              className="form-input mono"
              type="number"
              min="0"
              step="0.01"
              value={specialAmount}
              onChange={(event) => setSpecialAmount(event.target.value)}
              style={{ height: 40 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="form-label">Reason (optional, kept for audit)</span>
            <textarea
              className="form-input"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. restoring discount lost when the draft was finalized"
              style={{ minHeight: 56, paddingTop: 8, resize: 'vertical' }}
            />
          </label>
          {invoice ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: 'var(--color-text-muted)',
                paddingTop: 4,
              }}
            >
              <span>Current Net / Outstanding</span>
              <span className="mono">
                {money(invoice.netAmount)} / {money(invoice.outstandingAmount)}
              </span>
            </div>
          ) : null}
        </div>

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
            disabled={isSubmitting}
            style={{ height: 38, minWidth: 140 }}
          >
            {isSubmitting ? 'Saving...' : 'Save Discounts'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
