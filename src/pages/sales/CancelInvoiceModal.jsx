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

export default function CancelInvoiceModal({ isOpen, onClose, invoice, onDone }) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const saleLineCount = (invoice?.lines || []).filter((line) => !line.isReturnLine).length

  async function submit(event) {
    event.preventDefault()
    if (!reason.trim()) return
    setIsSubmitting(true)
    try {
      await salesService.cancelInvoice(invoice.id, reason.trim())
      toast.success('Invoice cancelled — its stock has been returned to main inventory.')
      setReason('')
      onDone?.()
      onClose()
    } catch (error) {
      toast.error(error.message || 'Unable to cancel this invoice.')
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
      title="Cancel Invoice"
      description="Cancels this invoice and returns its stock to main inventory."
      maxWidth="520px"
      showHeader={false}
      contentStyle={{ padding: 0, overflow: 'hidden' }}
    >
      <form onSubmit={submit}>
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: 'var(--color-text-primary)' }}>
            Cancel Invoice
          </h2>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
            Invoice {invoice?.invoiceNumber || invoice?.serialNumber} for{' '}
            {formatMoney(invoice?.netAmount)} will be cancelled. Use this only for genuine mistakes
            such as an invoice entered twice.
          </p>
        </div>

        <div style={{ padding: '18px 24px', display: 'grid', gap: 14 }}>
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 8,
              color: 'var(--color-amber)',
              fontSize: 13,
              lineHeight: 1.6,
              padding: 12,
            }}
          >
            <strong style={{ display: 'block', marginBottom: 3 }}>This cannot be undone</strong>
            <span style={{ color: 'var(--color-text-muted)' }}>
              {saleLineCount} product line{saleLineCount === 1 ? '' : 's'} will be credited back as
              fresh stock in <strong>main inventory</strong> — not back onto the vehicle it was
              originally sold from. You'll need to re-load it onto a vehicle if it should go back
              out for delivery.
            </span>
          </div>

          <label style={{ display: 'grid', gap: 6 }}>
            <span className="form-label">
              Cancellation reason <span style={{ color: 'var(--color-danger)' }}>*</span>
            </span>
            <textarea
              className="form-input"
              required
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. duplicate entry — same delivery invoiced twice"
              style={{ minHeight: 70, paddingTop: 8, resize: 'vertical' }}
            />
          </label>
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
          <button
            type="button"
            className="button-secondary"
            onClick={onClose}
            style={{ height: 38, minWidth: 92 }}
          >
            Keep Invoice
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={isSubmitting || !reason.trim()}
            style={{
              height: 38,
              minWidth: 150,
              backgroundColor: 'var(--color-danger)',
              borderColor: 'var(--color-danger)',
            }}
          >
            {isSubmitting ? 'Cancelling...' : 'Cancel Invoice'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
