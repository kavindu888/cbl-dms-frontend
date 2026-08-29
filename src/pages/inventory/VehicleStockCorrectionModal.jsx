import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Modal from '@components/ui/Modal'
import { inventoryService } from '@/services/api/inventoryService'

const emptyStateStyle = {
  padding: 26,
  textAlign: 'center',
  color: 'var(--color-text-muted)',
  border: '1px dashed var(--color-border)',
  borderRadius: 14,
  background: 'color-mix(in srgb, var(--color-bg-elevated) 32%, transparent)',
}

export default function VehicleStockCorrectionModal({ isOpen, onClose, loading, onApplied }) {
  const [preview, setPreview] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!isOpen || !loading?.id) return
    setPreview(null)
    setLoadError('')
    setIsLoading(true)
    inventoryService
      .previewVehicleStockCorrection(loading.id)
      .then((result) => setPreview(result))
      .catch((error) => setLoadError(error.message || 'Unable to preview vehicle stock correction.'))
      .finally(() => setIsLoading(false))
  }, [isOpen, loading?.id])

  async function apply() {
    if (!loading?.id) return
    setIsApplying(true)
    try {
      const result = await inventoryService.applyVehicleStockCorrection(loading.id)
      if (!result.lines?.length) {
        toast.success(`${loading.loadingNo}: nothing needed correcting.`)
      } else {
        toast.success(
          `${loading.loadingNo}: ${result.lines.length} product(s) corrected across ${result.invoicesCorrected} invoice(s).`
        )
        if (result.skippedProducts?.length) {
          toast.error(
            `Could not correct (insufficient vehicle stock): ${result.skippedProducts.join(', ')}`,
            { duration: 12000 }
          )
        }
      }
      onApplied?.()
      onClose()
    } catch (error) {
      toast.error(error.message || 'Unable to apply vehicle stock correction.')
    } finally {
      setIsApplying(false)
    }
  }

  const lines = preview?.lines || []

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Correct Invoiced Stock"
      description="Move stock back from Main to the vehicle for invoices that should have been deducted from it."
      maxWidth="760px"
      showHeader={false}
      contentStyle={{ padding: 0, overflow: 'hidden' }}
    >
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
            Correct Invoiced Stock
          </h2>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
            {loading?.loadingNo} — invoices already deducted from Main that should have come off this vehicle.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10, padding: 24, maxHeight: '52vh', overflowY: 'auto' }}>
        {isLoading ? (
          <div style={emptyStateStyle}>Checking for wrongly-deducted invoices...</div>
        ) : loadError ? (
          <div style={emptyStateStyle}>{loadError}</div>
        ) : lines.length === 0 ? (
          <div style={emptyStateStyle}>
            Nothing to correct — every invoice for this loading's delivery run was already deducted
            from the vehicle.
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
              {preview.invoicesAffected} invoice(s) affected across {lines.length} product(s).
            </p>
            {lines.map((line) => (
              <div
                key={line.productId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.4fr) 120px',
                  alignItems: 'start',
                  gap: 16,
                  padding: '14px 16px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 14,
                  background: 'color-mix(in srgb, var(--color-bg-elevated) 48%, transparent)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ color: 'var(--color-amber)', fontWeight: 850 }}>
                    {line.productSku}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Invoices: {line.invoiceNumbers.join(', ')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>Qty to move</div>
                  <div className="mono" style={{ fontWeight: 850 }}>
                    {Number(line.qtyToMove).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </>
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
          type="button"
          className="button-primary"
          disabled={isLoading || isApplying || lines.length === 0}
          onClick={apply}
          style={{ height: 38, minWidth: 150 }}
        >
          {isApplying ? 'Applying...' : 'Apply Correction'}
        </button>
      </div>
    </Modal>
  )
}
