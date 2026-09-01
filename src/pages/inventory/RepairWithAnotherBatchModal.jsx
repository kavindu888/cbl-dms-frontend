import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Modal from '@components/ui/Modal'
import { inventoryService } from '@/services/api/inventoryService'
import { formatDate } from '@/utils'

const emptyStateStyle = {
  padding: 26,
  textAlign: 'center',
  color: 'var(--color-text-muted)',
  border: '1px dashed var(--color-border)',
  borderRadius: 14,
  background: 'color-mix(in srgb, var(--color-bg-elevated) 32%, transparent)',
}

export default function RepairWithAnotherBatchModal({ isOpen, onClose, failedLine, onFixed }) {
  const [batches, setBatches] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !failedLine?.productId || !failedLine?.mainLocationId) return
    setSelectedBatchId('')
    setIsLoading(true)
    inventoryService
      .listStockBatches(failedLine.productId, { locationId: failedLine.mainLocationId })
      .then((items) => setBatches((items || []).filter((item) => Number(item.qtyAvailable) > 0)))
      .catch((error) => toast.error(error.message || 'Unable to load stock batches.'))
      .finally(() => setIsLoading(false))
  }, [isOpen, failedLine?.productId, failedLine?.mainLocationId])

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId)
  const shortfall = Number(failedLine?.qtySmallest || 0)

  async function submit(event) {
    event.preventDefault()
    if (!selectedBatch) return toast.error('Select a replacement batch.')
    if (Number(selectedBatch.qtyAvailable) < shortfall) {
      return toast.error(`Batch only has ${selectedBatch.qtyAvailable} available.`)
    }

    setIsSubmitting(true)
    try {
      await inventoryService.adminAddAppliedLoadingLine(failedLine.loadingId, {
        productId: failedLine.productId,
        productSku: failedLine.productSku,
        sourceBatchId: selectedBatch.id,
        qtySmallest: shortfall,
      })
      // The original line that failed repair never got its stock effects (that's why it failed),
      // so it must be removed now that the replacement line covers it — otherwise it stays flagged
      // as needing repair forever, and clicking "fix" again would double up the stock.
      if (failedLine.lineId) {
        try {
          await inventoryService.adminRemoveAppliedLoadingLine(failedLine.loadingId, failedLine.lineId)
        } catch (cleanupError) {
          toast.error(
            `Replacement batch added, but the original line couldn't be removed automatically: ${
              cleanupError.message || 'unknown error'
            }. Remove it manually from the loading detail page.`,
            { duration: 15000 }
          )
        }
      }
      toast.success(`${failedLine.productSku}: fixed from batch ${selectedBatch.batchNo}.`)
      onFixed?.()
      onClose()
    } catch (error) {
      toast.error(error.message || 'Unable to fix this line.')
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
      title="Fix With Another Batch"
      description="The original batch no longer has enough stock. Pick a replacement batch to cover the shortfall."
      maxWidth="720px"
      showHeader={false}
      contentStyle={{ padding: 0, overflow: 'hidden' }}
    >
      <form onSubmit={submit}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 18,
            padding: '22px 24px 18px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: 'var(--color-text-primary)' }}>
              Fix With Another Batch
            </h2>
            <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
              {failedLine?.loadingNo} — needs {shortfall.toLocaleString()} more of{' '}
              {failedLine?.productSku}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, padding: 24 }}>
          {isLoading ? (
            <div style={emptyStateStyle}>Loading batches...</div>
          ) : batches.length ? (
            batches.map((batch) => {
              const isSelected = selectedBatchId === batch.id
              const insufficient = Number(batch.qtyAvailable) < shortfall
              return (
                <button
                  key={batch.id}
                  type="button"
                  disabled={insufficient}
                  onClick={() => setSelectedBatchId(batch.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.4fr) 150px 150px',
                    alignItems: 'center',
                    gap: 16,
                    width: '100%',
                    padding: '14px 16px',
                    border: `1px solid ${
                      isSelected
                        ? 'color-mix(in srgb, var(--color-teal) 42%, var(--color-border))'
                        : 'var(--color-border)'
                    }`,
                    borderRadius: 14,
                    background: isSelected
                      ? 'linear-gradient(135deg, color-mix(in srgb, var(--color-teal) 15%, transparent), color-mix(in srgb, var(--color-bg-elevated) 82%, transparent))'
                      : 'color-mix(in srgb, var(--color-bg-elevated) 48%, transparent)',
                    color: insufficient ? 'var(--color-text-dim)' : 'var(--color-text-primary)',
                    textAlign: 'left',
                    cursor: insufficient ? 'not-allowed' : 'pointer',
                    opacity: insufficient ? 0.55 : 1,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>Batch No</div>
                    <div className="mono" style={{ color: 'var(--color-amber)', fontWeight: 850 }}>
                      {batch.batchNo || '-'}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>Expiry</div>
                    <div className="mono">{formatDate(batch.expiryDate)}</div>
                  </div>
                  <div style={{ minWidth: 0, textAlign: 'right' }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>Available</div>
                    <div className="mono" style={{ fontWeight: 850 }}>
                      {Number(batch.qtyAvailable).toLocaleString()} {batch.smallestUnitCode || ''}
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <div style={emptyStateStyle}>No other batches with stock at this location.</div>
          )}
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
            disabled={!selectedBatch || isSubmitting}
            style={{ height: 38, minWidth: 136 }}
          >
            {isSubmitting ? 'Fixing...' : 'Fix Line'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
