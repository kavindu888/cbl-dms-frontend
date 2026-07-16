import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Modal from '@components/ui/Modal'
import { inventoryService } from '@/services/api/inventoryService'
import { useFlagStockForReturn } from '@/hooks/useReturnStock'
import { formatDate } from '@/utils'

const reasonValues = { Expired: 1, ShortExpiry: 2, Damaged: 3, Other: 4 }

const emptyStateStyle = {
  padding: 26,
  textAlign: 'center',
  color: 'var(--color-text-muted)',
  border: '1px dashed var(--color-border)',
  borderRadius: 14,
  background: 'color-mix(in srgb, var(--color-bg-elevated) 32%, transparent)',
}

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
      description="Select the batch and quantity that should move into supplier-return staging."
      maxWidth="820px"
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
            padding: '24px 26px 20px',
            borderBottom: '1px solid var(--color-border)',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--color-bg-elevated) 72%, transparent), color-mix(in srgb, var(--color-bg-surface) 92%, transparent))',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 850, color: 'var(--color-text-primary)' }}>
              Flag Stock for Supplier Return
            </h2>
            <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
              Select a stock batch, then enter the quantity and reason to stage it for return.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gap: 4,
              justifyItems: 'end',
              flex: '0 0 auto',
              padding: '9px 12px',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              background: 'color-mix(in srgb, var(--color-bg-base) 50%, transparent)',
            }}
          >
            <span className="product-sku-badge mono">{product?.sku}</span>
            <strong style={{ maxWidth: 220, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {product?.name}
            </strong>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 22, padding: 24 }}>
          <section style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 850, color: 'var(--color-text-primary)' }}>
                  Available batches
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Pick the exact batch that should be moved into supplier-return staging.
                </p>
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                {isLoading ? 'Loading...' : `${batches.length} available`}
              </span>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {isLoading ? (
                <div style={emptyStateStyle}>Loading batches...</div>
              ) : batches.length ? batches.map((batch) => {
                const isSelected = selectedBatch?.id === batch.id

                return (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => {
                      setSelectedBatch(batch)
                      setQty('')
                    }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1.4fr) 150px 170px 110px',
                      alignItems: 'center',
                      gap: 16,
                      width: '100%',
                      padding: '15px 16px',
                      border: `1px solid ${
                        isSelected
                          ? 'color-mix(in srgb, var(--color-teal) 42%, var(--color-border))'
                          : 'var(--color-border)'
                      }`,
                      borderRadius: 14,
                      background: isSelected
                        ? 'linear-gradient(135deg, color-mix(in srgb, var(--color-teal) 15%, transparent), color-mix(in srgb, var(--color-bg-elevated) 82%, transparent))'
                        : 'color-mix(in srgb, var(--color-bg-elevated) 48%, transparent)',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 14px 30px rgba(0, 0, 0, 0.22)' : 'none',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="form-label" style={{ marginBottom: 4 }}>Batch No</div>
                      <div className="mono" style={{ color: 'var(--color-amber)', fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {batch.batchNo || '-'}
                      </div>
                    </div>
                    <BatchStat label="Expiry" value={formatDate(batch.expiryDate)} />
                    <BatchStat
                      align="right"
                      label="Available"
                      value={`${formatQty(batch.qtyAvailable)} ${batch.smallestUnitCode || ''}`.trim()}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          minHeight: 24,
                          padding: '0 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 800,
                          color: 'var(--color-teal)',
                          background: 'color-mix(in srgb, var(--color-teal) 10%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--color-teal) 24%, transparent)',
                        }}
                      >
                        {batch.status}
                      </span>
                    </div>
                  </button>
                )
              }) : (
                <div style={emptyStateStyle}>No available batches.</div>
              )}
            </div>
          </section>

          {selectedBatch ? (
            <section
              style={{
                display: 'grid',
                gridTemplateColumns: '260px minmax(0, 1fr)',
                gap: 18,
                padding: 18,
                border: '1px solid var(--color-border)',
                borderRadius: 16,
                background: 'color-mix(in srgb, var(--color-bg-elevated) 48%, transparent)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  alignContent: 'start',
                  gap: 12,
                  padding: 16,
                  borderRadius: 13,
                  background: 'color-mix(in srgb, var(--color-bg-base) 36%, transparent)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 850, color: 'var(--color-text-primary)' }}>
                    Selected batch
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Stock will be staged from this batch only.
                  </div>
                </div>
                <ReadOnly label="Batch No" value={selectedBatch.batchNo || '-'} />
                <ReadOnly label="Expiry Date" value={formatDate(selectedBatch.expiryDate)} />
                <ReadOnly
                  label="Available Qty"
                  value={`${formatQty(selectedBatch.qtyAvailable)} ${selectedBatch.smallestUnitCode || ''}`.trim()}
                />
              </div>

              <div style={{ display: 'grid', alignContent: 'start', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 850, color: 'var(--color-text-primary)' }}>
                    Return details
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Enter the return quantity and reason for the supplier-return staging log.
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span className="form-label">Qty to Flag *</span>
                    <input
                      className="form-input mono"
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={selectedBatch.qtyAvailable}
                      required
                      value={qty}
                      onChange={(event) => setQty(event.target.value)}
                      placeholder="Enter quantity"
                      style={{ height: 42 }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span className="form-label">Reason *</span>
                    <select
                      className="form-input"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      style={{ height: 42 }}
                    >
                      <option value="Expired">Expired</option>
                      <option value="ShortExpiry">Short Expiry</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span className="form-label">Notes</span>
                  <textarea
                  className="form-input"
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional notes"
                    style={{ minHeight: 88, paddingTop: 10, resize: 'vertical' }}
                  />
                </label>
              </div>
            </section>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border)',
            background: 'color-mix(in srgb, var(--color-bg-elevated) 34%, transparent)',
          }}
        >
          <button type="button" className="button-secondary" onClick={onClose} style={{ height: 38, minWidth: 92 }}>
            Cancel
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={!selectedBatch || mutation.isPending}
            style={{ height: 38, minWidth: 136 }}
          >
            {mutation.isPending ? 'Flagging...' : 'Flag for Return'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ReadOnly({ label, value }) {
  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
      <span className="form-label">{label}</span>
      <div
        className="form-input mono"
        style={{
          display: 'flex',
          alignItems: 'center',
          minHeight: 38,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={String(value || '-')}
      >
        {value}
      </div>
    </div>
  )
}

function BatchStat({ label, value, align = 'left' }) {
  return (
    <div style={{ minWidth: 0, textAlign: align }}>
      <div className="form-label" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontWeight: 850,
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={String(value || '-')}
      >
        {value || '-'}
      </div>
    </div>
  )
}

function formatQty(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })
}
