import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Modal from '@components/ui/Modal'
import { inventoryService } from '@/services/api/inventoryService'
import { useFlagStockForReturn } from '@/hooks/useReturnStock'
import { formatDate } from '@/utils'

const reasonValues = { Expired: 1, ShortExpiry: 2, Damaged: 3, Other: 4 }

export default function FlagStockForReturnModal({ isOpen, onClose, product, onSuccess }) {
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('Expired')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const mutation = useFlagStockForReturn()

  useEffect(() => {
    if (!isOpen || !product?.id) return
    setSelectedBatch(null)
    setQty('')
    setReason('Expired')
    setNotes('')
    setIsLoading(true)
    inventoryService
      .listStockBatches(product.id)
      .then((items) => setBatches((items || []).filter((item) => Number(item.qtyAvailable) > 0)))
      .catch((error) => toast.error(error.message || 'Unable to load stock batches.'))
      .finally(() => setIsLoading(false))
  }, [isOpen, product?.id])

  function submit(event) {
    event.preventDefault()
    const amount = Number(qty)
    if (!selectedBatch) return toast.error('Select a batch to flag.')
    if (!amount || amount <= 0) return toast.error('Quantity must be greater than zero.')
    if (amount > Number(selectedBatch.qtyAvailable)) {
      return toast.error(`Quantity cannot exceed ${selectedBatch.qtyAvailable}.`)
    }
    mutation.mutate(
      {
        sourceBatchId: selectedBatch.id,
        qty: amount,
        reason: reasonValues[reason],
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          onSuccess?.()
          onClose()
        },
      }
    )
  }

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Flag Stock for Supplier Return"
    >
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
          <span className="product-sku-badge mono">{product?.sku}</span>{' '}
          <strong style={{ color: 'var(--color-text-primary)' }}>{product?.name}</strong>
        </div>

        <div>
          <span className="form-label">Select Batch *</span>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 7, overflow: 'auto', maxHeight: 220 }}>
            <table className="data-table product-table-compact" style={{ minWidth: 620 }}>
              <thead><tr><th>Batch No</th><th>Expiry Date</th><th style={{ textAlign: 'right' }}>Qty Available</th><th>Status</th></tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading batches...</td></tr>
                ) : batches.length ? batches.map((batch) => (
                  <tr
                    key={batch.id}
                    onClick={() => {
                      setSelectedBatch(batch)
                      setQty('')
                    }}
                    style={{
                      cursor: 'pointer',
                      background: selectedBatch?.id === batch.id
                        ? 'color-mix(in srgb, var(--color-amber) 12%, transparent)'
                        : undefined,
                    }}
                  >
                    <td className="mono" style={{ color: 'var(--color-amber)' }}>{batch.batchNo || '-'}</td>
                    <td>{formatDate(batch.expiryDate)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{batch.qtyAvailable}</td>
                    <td>{batch.status}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No available batches.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedBatch ? (
          <>
            <div className="responsive-field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <ReadOnly label="Batch No" value={selectedBatch.batchNo || '-'} />
              <ReadOnly label="Expiry Date" value={formatDate(selectedBatch.expiryDate)} />
              <ReadOnly label="Available Qty" value={selectedBatch.qtyAvailable} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label><span className="form-label">Qty to Flag *</span><input className="form-input mono" type="number" min="0.01" step="0.01" max={selectedBatch.qtyAvailable} required value={qty} onChange={(event) => setQty(event.target.value)} /></label>
              <label><span className="form-label">Reason *</span><select className="form-input" value={reason} onChange={(event) => setReason(event.target.value)}><option value="Expired">Expired</option><option value="ShortExpiry">Short Expiry</option><option value="Damaged">Damaged</option><option value="Other">Other</option></select></label>
            </div>
            <label><span className="form-label">Notes</span><textarea className="form-input" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes" style={{ paddingTop: 9, resize: 'vertical' }} /></label>
          </>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button-primary" disabled={!selectedBatch || mutation.isPending}>{mutation.isPending ? 'Flagging...' : 'Flag for Return'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ReadOnly({ label, value }) {
  return <div><span className="form-label">{label}</span><div className="form-input mono" style={{ display: 'flex', alignItems: 'center' }}>{value}</div></div>
}
