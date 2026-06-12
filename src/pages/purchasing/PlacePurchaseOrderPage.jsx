import dayjs from 'dayjs'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { masterService } from '@services/api/masterService'
import { purchasingService } from '@services/api/purchasingService'

const emptyHeader = {
  supplierId: '',
  orderDate: dayjs().format('YYYY-MM-DD'),
  expectedDeliveryDate: '',
  notes: '',
}

const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')

function createEmptyLine() {
  return {
    key: crypto.randomUUID(),
    productId: '',
    qty: '1',
    unitCost: '0',
    vatRate: '0',
    notes: '',
  }
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function PlacePurchaseOrderPage() {
  const navigate = useNavigate()
  const [header, setHeader] = useState(emptyHeader)
  const [lines, setLines] = useState([createEmptyLine()])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [lookupError, setLookupError] = useState('')

  const loadFormData = useCallback(async () => {
    setIsLoading(true)
    setLookupError('')

    const [supplierResult, productResult] = await Promise.allSettled([
      purchasingService.listSuppliers({ page: 1, pageSize: 100, status: 1 }),
      masterService.listProducts({
        page: 1,
        pageSize: 100,
        status: 'Active',
        sortBy: 'name',
        sortDir: 'asc',
      }),
    ])

    const messages = []

    if (supplierResult.status === 'fulfilled') {
      setSuppliers(supplierResult.value?.items || [])
    } else {
      setSuppliers([])
      messages.push(`Suppliers: ${supplierResult.reason.message}`)
    }

    if (productResult.status === 'fulfilled') {
      setProducts(productResult.value?.items || [])
    } else {
      setProducts([])
      messages.push(`Products: ${productResult.reason.message}`)
    }

    setLookupError(messages.join(' '))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadFormData()
  }, [loadFormData])

  const totals = useMemo(() => {
    return lines.reduce(
      (result, line) => {
        const subtotal = Number(line.qty || 0) * Number(line.unitCost || 0)
        const vat = subtotal * (Number(line.vatRate || 0) / 100)
        return {
          subtotal: result.subtotal + subtotal,
          vat: result.vat + vat,
          total: result.total + subtotal + vat,
        }
      },
      { subtotal: 0, vat: 0, total: 0 }
    )
  }, [lines])

  function updateHeader(event) {
    setHeader((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function updateLine(key, field, value) {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line

        if (field === 'productId') {
          const product = products.find((item) => item.id === value)
          return {
            ...line,
            productId: value,
            unitCost: product ? String(product.unitCost || 0) : line.unitCost,
          }
        }

        return { ...line, [field]: value }
      })
    )
  }

  function validateForm() {
    if (!suppliers.length) return 'No active suppliers are available.'
    if (!products.length) return 'No active products are available.'
    if (!header.supplierId) return 'Select a supplier.'
    if (header.expectedDeliveryDate && header.expectedDeliveryDate < tomorrow) {
      return 'Expected delivery date must be in the future.'
    }
    if (!lines.length) return 'Add at least one product.'

    const selectedProductIds = new Set()
    for (const line of lines) {
      if (!line.productId) return 'Select a product for every line.'
      if (selectedProductIds.has(line.productId)) {
        return 'Each product should appear only once. Update its quantity instead.'
      }
      selectedProductIds.add(line.productId)
      if (Number(line.qty) <= 0) return 'Every quantity must be greater than zero.'
      if (Number(line.unitCost) < 0) return 'Unit cost cannot be negative.'
      if (Number(line.vatRate) < 0 || Number(line.vatRate) > 100) {
        return 'VAT rate must be between 0 and 100.'
      }
    }

    return ''
  }

  async function placePurchaseOrder(event) {
    event.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError('')
    let createdOrder = null

    try {
      createdOrder = await purchasingService.createPurchaseOrder({
        supplierId: header.supplierId,
        businessUnitId: null,
        paymentTermId: null,
        orderDate: header.orderDate || null,
        expectedDeliveryDate: header.expectedDeliveryDate || null,
        notes: header.notes.trim() || null,
      })

      for (const line of lines) {
        const product = products.find((item) => item.id === line.productId)
        await purchasingService.addPurchaseOrderLine(createdOrder.id, {
          productId: product.id,
          productSku: product.sku,
          productName: product.name,
          unitOfMeasure: product.uomBase,
          qty: Number(line.qty),
          unitCost: Number(line.unitCost),
          vatRate: Number(line.vatRate),
          notes: line.notes.trim() || null,
        })
      }

      await purchasingService.submitPurchaseOrder(createdOrder.id)
      toast.success(`Purchase order ${createdOrder.poNumber} placed for approval.`)
      navigate('/purchasing/approvals')
    } catch (requestError) {
      if (createdOrder) {
        try {
          await purchasingService.cancelPurchaseOrder(
            createdOrder.id,
            'Cancelled automatically because the purchase order could not be completed.'
          )
          setError(`${requestError.message} The incomplete draft was cancelled.`)
        } catch {
          setError(`${requestError.message} Draft ${createdOrder.poNumber} could not be completed.`)
        }
      } else {
        setError(requestError.message)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={placePurchaseOrder}
      style={{
        minHeight: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <header style={{ flexShrink: 0 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Place Purchase Order
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Build the purchase order and send it to the approval queue.
        </p>
      </header>

      {error ? (
        <div className="panel" style={{ padding: 12, color: 'var(--color-danger)', fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      {lookupError ? (
        <div
          className="panel"
          style={{
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{lookupError}</p>
          <button
            type="button"
            className="button-secondary"
            onClick={loadFormData}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, height: 36 }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
            Retry
          </button>
        </div>
      ) : null}

      <div
        className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]"
        style={{ gap: 16, alignItems: 'start', flex: 1, minHeight: 0 }}
      >
        <section className="panel" style={{ overflow: 'hidden', minWidth: 0 }}>
          <div
            style={{
              minHeight: 68,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Purchase Order Products
              </h2>
              <p style={{ marginTop: 3, fontSize: 12, color: 'var(--color-text-muted)' }}>
                Add products and enter the requested quantities and costs.
              </p>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setLines((current) => [...current, createEmptyLine()])}
              disabled={isLoading || isSaving}
              style={{ height: 36, display: 'flex', alignItems: 'center', gap: 7 }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add Product
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>UOM</th>
                  <th>Quantity</th>
                  <th>Unit Cost</th>
                  <th>VAT %</th>
                  <th className="text-right">Line Total</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const product = products.find((item) => item.id === line.productId)
                  const subtotal = Number(line.qty || 0) * Number(line.unitCost || 0)
                  const lineTotal = subtotal + subtotal * (Number(line.vatRate || 0) / 100)

                  return (
                    <tr key={line.key}>
                      <td style={{ minWidth: 260 }}>
                        <select
                          className="form-input w-full"
                          value={line.productId}
                          onChange={(event) =>
                            updateLine(line.key, 'productId', event.target.value)
                          }
                          disabled={isLoading || isSaving}
                          style={{ height: 38, fontSize: 13 }}
                        >
                          <option value="">
                            {isLoading
                              ? 'Loading products...'
                              : products.length
                                ? 'Select a product'
                                : 'No active products available'}
                          </option>
                          {products.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.sku} - {item.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="mono" style={{ color: 'var(--color-text-muted)' }}>
                        {product?.uomBase || '-'}
                      </td>
                      <td>
                        <input
                          className="form-input"
                          style={{ width: 92, height: 38, fontSize: 13 }}
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          value={line.qty}
                          onChange={(event) => updateLine(line.key, 'qty', event.target.value)}
                          disabled={isSaving}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          style={{ width: 112, height: 38, fontSize: 13 }}
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitCost}
                          onChange={(event) => updateLine(line.key, 'unitCost', event.target.value)}
                          disabled={isSaving}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          style={{ width: 76, height: 38, fontSize: 13 }}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={line.vatRate}
                          onChange={(event) => updateLine(line.key, 'vatRate', event.target.value)}
                          disabled={isSaving}
                        />
                      </td>
                      <td className="mono text-right font-medium">{formatMoney(lineTotal)}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="icon-button"
                          title="Remove product"
                          onClick={() =>
                            setLines((current) => current.filter((item) => item.key !== line.key))
                          }
                          disabled={isSaving}
                          style={{ width: 30, height: 30, color: 'var(--color-danger)' }}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!lines.length ? (
            <div
              style={{
                padding: '56px 20px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 13,
              }}
            >
              No products added. Select Add Product to begin.
            </div>
          ) : null}
        </section>

        <aside
          className="panel"
          style={{
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            position: 'sticky',
            top: 12,
          }}
        >
          <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Order Details
            </h2>
            <p style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Complete the header before placing this order.
            </p>
          </div>

          <label>
            <span className="form-label">Supplier *</span>
            <select
              className="form-input w-full"
              name="supplierId"
              value={header.supplierId}
              onChange={updateHeader}
              disabled={isLoading || isSaving}
              style={{ height: 40 }}
            >
              <option value="">
                {isLoading
                  ? 'Loading suppliers...'
                  : suppliers.length
                    ? 'Select a supplier'
                    : 'No active suppliers available'}
              </option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.code} - {supplier.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <label>
              <span className="form-label">Order Date</span>
              <input
                className="form-input w-full"
                type="date"
                name="orderDate"
                value={header.orderDate}
                onChange={updateHeader}
                disabled={isSaving}
                style={{ height: 40 }}
              />
            </label>

            <label>
              <span className="form-label">Expected Delivery</span>
              <input
                className="form-input w-full"
                type="date"
                name="expectedDeliveryDate"
                min={tomorrow}
                value={header.expectedDeliveryDate}
                onChange={updateHeader}
                disabled={isSaving}
                style={{ height: 40 }}
              />
            </label>
          </div>

          <label>
            <span className="form-label">Notes</span>
            <textarea
              className="form-input w-full"
              name="notes"
              rows={4}
              value={header.notes}
              onChange={updateHeader}
              placeholder="Optional purchasing instructions"
              disabled={isSaving}
              style={{ resize: 'vertical', paddingTop: 10 }}
            />
          </label>

          <div
            style={{
              padding: 14,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '9px 20px',
              background: 'rgba(0,0,0,0.10)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--color-text-muted)' }}>Products</span>
            <span className="mono text-right">{lines.length}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
            <span className="mono text-right">{formatMoney(totals.subtotal)}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>VAT</span>
            <span className="mono text-right">{formatMoney(totals.vat)}</span>
            <span
              style={{
                paddingTop: 9,
                borderTop: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontWeight: 700,
              }}
            >
              Estimated Total
            </span>
            <span
              className="mono text-right"
              style={{
                paddingTop: 9,
                borderTop: '1px solid var(--color-border)',
                color: 'var(--color-amber)',
                fontWeight: 800,
              }}
            >
              {formatMoney(totals.total)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              paddingTop: 14,
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <button
              type="button"
              className="button-secondary"
              onClick={() => navigate('/purchasing/approvals')}
              disabled={isSaving}
              style={{ flex: 1, height: 38, fontSize: 13 }}
            >
              Approval Queue
            </button>
            <button
              type="submit"
              className="button-primary"
              disabled={isLoading || isSaving || !suppliers.length || !products.length}
              style={{ flex: 1, height: 38, fontSize: 13 }}
            >
              {isSaving ? 'Placing...' : 'Place Order'}
            </button>
          </div>
        </aside>
      </div>
    </form>
  )
}
