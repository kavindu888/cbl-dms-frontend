import { useEffect, useMemo, useState } from 'react'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@components/ui/Modal'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function AdminEditInvoiceLinesModal({ isOpen, onClose, invoice, productById, onDone }) {
  const [lineEdits, setLineEdits] = useState({}) // lineId -> { quantity, removed }
  const [newLines, setNewLines] = useState([]) // { tempId, productId, productSku, productName, quantity, mrp }
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  const normalLines = (invoice?.lines || []).filter((line) => !line.isReturnLine)

  useEffect(() => {
    if (!isOpen) return
    setLineEdits({})
    setNewLines([])
    setReason('')
  }, [isOpen, invoice?.id])

  useEffect(() => {
    if (!isOpen) return
    setIsLoadingProducts(true)
    masterService
      .listAllProducts({ pageSize: 200, status: 'Active' })
      .then((items) => setProducts(items || []))
      .catch(() => setProducts([]))
      .finally(() => setIsLoadingProducts(false))
  }, [isOpen])

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    if (!term) return []
    return products
      .filter((product) =>
        `${product.name} ${product.sku} ${product.barcode || ''}`.toLowerCase().includes(term)
      )
      .slice(0, 20)
  }, [productSearch, products])

  function editFor(lineId) {
    return lineEdits[lineId] || {}
  }

  function updateQuantity(lineId, quantity) {
    setLineEdits((current) => ({
      ...current,
      [lineId]: { ...current[lineId], quantity },
    }))
  }

  function toggleRemoved(lineId) {
    setLineEdits((current) => ({
      ...current,
      [lineId]: { ...current[lineId], removed: !current[lineId]?.removed },
    }))
  }

  function addProduct(product) {
    setNewLines((current) => [
      ...current,
      {
        tempId: `new-${Date.now()}-${product.id}`,
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        quantity: 1,
        mrp: Number(product.mrp || product.sellingPrice || 0),
      },
    ])
    setProductSearch('')
  }

  function updateNewLine(tempId, field, value) {
    setNewLines((current) =>
      current.map((line) => (line.tempId === tempId ? { ...line, [field]: value } : line))
    )
  }

  function removeNewLine(tempId) {
    setNewLines((current) => current.filter((line) => line.tempId !== tempId))
  }

  const hasChanges =
    newLines.length > 0 ||
    Object.entries(lineEdits).some(([, edit]) => edit.removed || edit.quantity !== undefined)

  async function submit(event) {
    event.preventDefault()
    if (!hasChanges) return toast.error('No changes to save.')

    const lineIdsToRemove = Object.entries(lineEdits)
      .filter(([, edit]) => edit.removed)
      .map(([lineId]) => lineId)

    const linesToUpdate = normalLines
      .filter((line) => !lineEdits[line.id]?.removed && lineEdits[line.id]?.quantity !== undefined)
      .map((line) => ({
        lineId: line.id,
        newQuantity: Number(lineEdits[line.id].quantity),
      }))
      .filter((update) => update.newQuantity > 0)

    for (const update of linesToUpdate) {
      if (!(update.newQuantity > 0)) {
        return toast.error('Quantity must be greater than zero.')
      }
    }

    const linesToAdd = newLines.map((line) => ({
      productId: line.productId,
      quantity: Number(line.quantity),
      mrp: Number(line.mrp),
    }))
    for (const line of linesToAdd) {
      if (!(line.quantity > 0)) return toast.error('New line quantity must be greater than zero.')
    }

    setIsSubmitting(true)
    try {
      await salesService.adminEditInvoiceLines(invoice.id, {
        reason: reason.trim() || null,
        linesToAdd,
        linesToUpdate,
        lineIdsToRemove,
      })
      toast.success('Invoice lines updated and stock synced.')
      onDone?.()
      onClose()
    } catch (error) {
      toast.error(error.message || 'Unable to save invoice line changes.')
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
      title="Admin Edit Invoice Lines"
      description="Add, change quantity, or remove lines on this invoice. Stock at wherever it was issued from (vehicle or main) is adjusted to match."
      maxWidth="860px"
      showHeader={false}
      contentStyle={{ padding: 0, overflow: 'hidden' }}
    >
      <form onSubmit={submit}>
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: 'var(--color-text-primary)' }}>
            Admin Edit Invoice Lines
          </h2>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
            Invoice {invoice?.invoiceNumber || invoice?.serialNumber} — stock is synced automatically:
            a further deduction if a line's quantity goes up, a credited-back batch if it goes down or a
            line is removed. Increasing beyond what's available will be rejected.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 8, padding: '18px 24px', maxHeight: 320, overflowY: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) 130px 110px 90px',
              gap: 12,
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--color-text-dim)',
              padding: '0 4px',
            }}
          >
            <span>Product</span>
            <span style={{ textAlign: 'right' }}>Current Qty</span>
            <span style={{ textAlign: 'right' }}>New Qty</span>
            <span style={{ textAlign: 'right' }}>Remove</span>
          </div>
          {normalLines.map((line) => {
            const product = productById?.[line.productId]
            const edit = editFor(line.id)
            const isRemoved = Boolean(edit.removed)
            return (
              <div
                key={line.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.6fr) 130px 110px 90px',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 4px',
                  borderTop: '1px solid var(--color-border)',
                  opacity: isRemoved ? 0.5 : 1,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>
                    {line.productSku || product?.sku || line.productId}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {line.productName || product?.name || 'Unknown product'}
                  </div>
                </div>
                <div className="mono" style={{ textAlign: 'right', fontSize: 12 }}>
                  {line.quantity}
                </div>
                <input
                  className="form-input mono"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  disabled={isRemoved}
                  value={edit.quantity ?? line.quantity}
                  onChange={(event) => updateQuantity(line.id, event.target.value)}
                  style={{ height: 32, textAlign: 'right' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => toggleRemoved(line.id)}
                    style={{
                      height: 28,
                      width: 28,
                      padding: 0,
                      color: isRemoved ? 'var(--color-teal)' : 'var(--color-danger)',
                    }}
                    aria-label={isRemoved ? 'Undo remove' : 'Remove line'}
                    title={isRemoved ? 'Undo remove' : 'Remove line'}
                  >
                    {isRemoved ? <RotateCcw size={13} /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            )
          })}
          {!normalLines.length ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No lines on this invoice.
            </div>
          ) : null}
        </div>

        {newLines.length > 0 ? (
          <div style={{ padding: '0 24px', display: 'grid', gap: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-primary)' }}>New lines</p>
            {newLines.map((line) => (
              <div
                key={line.tempId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.4fr) 110px 130px 40px',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  background: 'color-mix(in srgb, var(--color-teal) 6%, transparent)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 12 }}>{line.productSku}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{line.productName}</div>
                </div>
                <input
                  className="form-input mono"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={line.quantity}
                  onChange={(event) => updateNewLine(line.tempId, 'quantity', event.target.value)}
                  placeholder="Qty"
                  style={{ height: 32, textAlign: 'right' }}
                />
                <input
                  className="form-input mono"
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.mrp}
                  onChange={(event) => updateNewLine(line.tempId, 'mrp', event.target.value)}
                  placeholder="MRP"
                  style={{ height: 32, textAlign: 'right' }}
                />
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => removeNewLine(line.tempId)}
                  style={{ height: 28, width: 28, padding: 0, color: 'var(--color-danger)' }}
                  aria-label="Remove new line"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ padding: '14px 24px 0' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="form-label">Add a product</span>
            <input
              className="form-input"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search SKU, barcode, or product name"
            />
          </label>
          {productSearch.trim() ? (
            <div
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                marginTop: 6,
                maxHeight: 160,
                overflowY: 'auto',
              }}
            >
              {isLoadingProducts ? (
                <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading products...</div>
              ) : filteredProducts.length ? (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <Plus size={13} style={{ color: 'var(--color-teal)' }} />
                    <span className="mono" style={{ fontSize: 11, color: 'var(--color-teal)' }}>
                      {product.sku}
                    </span>
                    <strong style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>
                      {product.name}
                    </strong>
                  </button>
                ))
              ) : (
                <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>No products found.</div>
              )}
            </div>
          ) : null}
        </div>

        <div style={{ padding: '18px 24px 0' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="form-label">Reason (optional, kept for audit)</span>
            <textarea
              className="form-input"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. customer disputed 2 units, adjusted after redelivery"
              style={{ minHeight: 56, paddingTop: 8, resize: 'vertical' }}
            />
          </label>
        </div>

        {invoice ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '14px 24px 0',
              fontSize: 12,
              color: 'var(--color-text-muted)',
            }}
          >
            <span>Current Net / Outstanding</span>
            <span className="mono">
              {money(invoice.netAmount)} / {money(invoice.outstandingAmount)}
            </span>
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '16px 24px',
            marginTop: 14,
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button type="button" className="button-secondary" onClick={onClose} style={{ height: 38, minWidth: 92 }}>
            Cancel
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={isSubmitting || !hasChanges}
            style={{ height: 38, minWidth: 150 }}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
