import dayjs from 'dayjs'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import { masterService } from '@services/api/masterService'
import { purchasingService } from '@services/api/purchasingService'

const linePageSize = 5

const emptyHeader = {
  supplierId: '',
  businessUnitId: '',
  paymentTermId: '',
  taxId: '',
  orderDate: dayjs().format('YYYY-MM-DD'),
  expectedDeliveryDate: '',
  notes: '',
}

const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')

function createEmptyLine() {
  return {
    key: crypto.randomUUID(),
    productId: '',
    bigBoxQty: '1',
    unitCostSmallest: '0',
    notes: '',
  }
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getUnitsPerBigBox(product) {
  if (!product) return 0

  let currentUom = product.uomBase
  let unitsPerBox = 1
  const visited = new Set([currentUom])

  for (let index = 0; index < 5; index += 1) {
    const conversion = product.uomConversions?.find((item) => item.fromUom === currentUom)
    if (!conversion || conversion.factor <= 0 || visited.has(conversion.toUom)) break

    unitsPerBox *= Number(conversion.factor)
    currentUom = conversion.toUom
    visited.add(currentUom)
  }

  return unitsPerBox
}

export default function PlacePurchaseOrderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const editPoId = location.state?.editPoId
  const [header, setHeader] = useState(emptyHeader)
  const [lines, setLines] = useState([createEmptyLine()])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [taxes, setTaxes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [linePage, setLinePage] = useState(1)

  const loadFormData = useCallback(async () => {
    setIsLoading(true)
    setLookupError('')

    const [supplierResult, productResult, businessUnitResult, , taxResult] =
      await Promise.allSettled([
        purchasingService.listSuppliers({ page: 1, pageSize: 100, status: 1 }),
        masterService.listProducts({
          page: 1,
          pageSize: 100,
          status: 'Active',
          sortBy: 'name',
          sortDir: 'asc',
        }),
        masterService.listBusinessUnits(),
        masterService.listPaymentTerms(),
        masterService.listTaxes(),
      ])

    const messages = []
    let preselectedSupplierId = ''
    let preselectedBUId = ''

    if (supplierResult.status === 'fulfilled') {
      const list = supplierResult.value?.items || []
      setSuppliers(list)
      if (list.length === 1) {
        preselectedSupplierId = list[0].id
      }
    } else {
      setSuppliers([])
      messages.push(`Suppliers: ${supplierResult.reason.message}`)
    }

    if (productResult.status === 'fulfilled') {
      const productItems = productResult.value?.items || []
      const detailedProducts = await Promise.all(
        productItems.map(async (product) => {
          try {
            return await masterService.getProduct(product.id)
          } catch {
            return product
          }
        })
      )
      setProducts(detailedProducts)
    } else {
      setProducts([])
      messages.push(`Products: ${productResult.reason.message}`)
    }

    if (businessUnitResult.status === 'fulfilled') {
      const activeBUs = businessUnitResult.value.filter((item) => item.isActive)
      if (activeBUs.length === 1) {
        preselectedBUId = activeBUs[0].id
      }
    }

    if (taxResult.status === 'fulfilled') {
      const activeTaxes = taxResult.value.filter((item) => item.isActive)
      setTaxes(activeTaxes)
      setHeader((current) => ({
        ...current,
        taxId: current.taxId || activeTaxes.find((item) => item.isDefault)?.id || '',
      }))
    } else {
      setTaxes([])
    }

    let editPoDetail = null
    if (editPoId) {
      try {
        editPoDetail = await purchasingService.getPurchaseOrder(editPoId)
      } catch (err) {
        messages.push(`Purchase Order Details: ${err.message}`)
      }
    }

    if (editPoDetail) {
      setHeader({
        supplierId: editPoDetail.supplierId || '',
        businessUnitId: editPoDetail.businessUnitId || '',
        paymentTermId: editPoDetail.paymentTermId || '',
        taxId: editPoDetail.taxId || '',
        orderDate: dayjs(editPoDetail.orderDate).format('YYYY-MM-DD'),
        expectedDeliveryDate: editPoDetail.expectedDeliveryDate
          ? dayjs(editPoDetail.expectedDeliveryDate).format('YYYY-MM-DD')
          : '',
        notes: editPoDetail.notes || '',
      })

      const loadedLines =
        editPoDetail.lines?.map((line) => ({
          key: crypto.randomUUID(),
          id: line.id,
          productId: line.productId || '',
          bigBoxQty: String(line.qtyBaseUnit ?? '1'),
          unitCostSmallest: String(line.unitCostSmallest ?? '0'),
          notes: line.notes || '',
        })) || []

      setLines(loadedLines.length ? loadedLines : [createEmptyLine()])
    } else {
      setHeader((current) => {
        const next = { ...current }
        if (preselectedSupplierId) next.supplierId = preselectedSupplierId
        if (preselectedBUId) next.businessUnitId = preselectedBUId
        return next
      })
    }

    setLookupError(messages.join(' '))
    setIsLoading(false)
  }, [editPoId])

  useEffect(() => {
    loadFormData()
  }, [loadFormData])

  const totals = useMemo(() => {
    const selectedTax = taxes.find((tax) => tax.id === header.taxId)
    const vatRate = selectedTax?.rate || 0

    const subtotal = lines.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.productId)
      const lineSubtotal =
        Number(line.bigBoxQty || 0) *
        getUnitsPerBigBox(product) *
        Number(line.unitCostSmallest || 0)

      return sum + lineSubtotal
    }, 0)
    const vat = subtotal * (vatRate / 100)

    return {
      subtotal,
      vat,
      total: subtotal + vat,
    }
  }, [header.taxId, lines, products, taxes])

  const pagedLines = useMemo(() => {
    const start = (linePage - 1) * linePageSize
    return lines.slice(start, start + linePageSize)
  }, [linePage, lines])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(lines.length / linePageSize))
    if (linePage > totalPages) setLinePage(totalPages)
  }, [linePage, lines.length])

  function addLine() {
    setLines((current) => {
      const updatedLines = [...current, createEmptyLine()]
      setLinePage(Math.ceil(updatedLines.length / linePageSize))
      return updatedLines
    })
  }

  function updateHeader(event) {
    setHeader((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function updateLine(key, field, value) {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line

        if (field === 'productId') {
          return {
            ...line,
            productId: value,
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
      if (Number(line.bigBoxQty) <= 0) return 'Every big-box quantity must be greater than zero.'
      if (Number(line.unitCostSmallest) < 0) return 'Smallest-unit cost cannot be negative.'
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
      // Create a brand new PO with the modified form details
      createdOrder = await purchasingService.createPurchaseOrder({
        supplierId: header.supplierId,
        businessUnitId: header.businessUnitId || null,
        paymentTermId: header.paymentTermId || null,
        taxId: header.taxId || null,
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
          bigBoxQty: Number(line.bigBoxQty),
          unitCostSmallest: Number(line.unitCostSmallest),
          notes: line.notes.trim() || null,
        })
      }

      await purchasingService.submitPurchaseOrder(createdOrder.id)

      // If we are in edit mode, cancel the original rejected PO to maintain clean history
      if (editPoId) {
        try {
          await purchasingService.cancelPurchaseOrder(
            editPoId,
            `Re-edited and replaced by purchase order ${createdOrder.poNumber}.`
          )
        } catch (cancelError) {
          console.warn('Unable to cancel the original purchase order:', cancelError)
        }
      }

      toast.success(
        editPoId
          ? `Purchase order updated and resubmitted as ${createdOrder.poNumber} for approval.`
          : `Purchase order ${createdOrder.poNumber} placed for approval.`
      )
      navigate('/purchasing/approvals')
    } catch (requestError) {
      if (createdOrder) {
        try {
          await purchasingService.cancelPurchaseOrder(
            createdOrder.id,
            'Cancelled automatically because the purchase order could not be completed.'
          )
          setError(`${requestError.message} The new incomplete draft was cancelled.`)
        } catch {
          setError(
            `${requestError.message} New draft ${createdOrder.poNumber} could not be completed.`
          )
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
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      <header style={{ flexShrink: 0 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {editPoId ? 'Edit Purchase Order' : 'Purchase Order'}
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          {editPoId
            ? 'Update the purchase order and resubmit it for approval.'
            : 'Build the purchase order and send it to the approval queue.'}
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
        style={{ gap: 16, alignItems: 'stretch', flex: 1, minHeight: 0, overflow: 'hidden' }}
      >
        <section
          className="panel"
          style={{
            overflow: 'hidden',
            minWidth: 0,
            minHeight: 0,
            height: '100%',
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr) auto',
          }}
        >
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
                Enter big-box quantities and the cost per smallest unit.
              </p>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={addLine}
              disabled={isLoading || isSaving}
              style={{ height: 36, display: 'flex', alignItems: 'center', gap: 7 }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add Product
            </button>
          </div>

          <div style={{ minHeight: 0, overflowX: 'auto', overflowY: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Big Box UOM</th>
                  <th>Big Box Qty</th>
                  <th>Smallest Unit Cost</th>
                  <th style={{ textAlign: 'right' }}>Estimated Subtotal</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {pagedLines.map((line) => {
                  const product = products.find((item) => item.id === line.productId)
                  const subtotal =
                    Number(line.bigBoxQty || 0) *
                    getUnitsPerBigBox(product) *
                    Number(line.unitCostSmallest || 0)

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
                          value={line.bigBoxQty}
                          onChange={(event) =>
                            updateLine(line.key, 'bigBoxQty', event.target.value)
                          }
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
                          value={line.unitCostSmallest}
                          onChange={(event) =>
                            updateLine(line.key, 'unitCostSmallest', event.target.value)
                          }
                          disabled={isSaving}
                        />
                      </td>
                      <td className="mono text-right font-medium">{formatMoney(subtotal)}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="icon-button"
                          title="Remove product"
                          onClick={() => {
                            setLines((current) => current.filter((item) => item.key !== line.key))
                          }}
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

          {lines.length ? (
            <div style={{ padding: '0 12px 10px' }}>
              <SimplePagination
                page={linePage}
                pageSize={linePageSize}
                totalItems={lines.length}
                onPageChange={setLinePage}
                itemLabel="products"
              />
            </div>
          ) : null}
        </section>

        <aside
          className="panel"
          style={{
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
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
              {suppliers.length !== 1 && (
                <option value="">
                  {isLoading
                    ? 'Loading suppliers...'
                    : suppliers.length
                      ? 'Select a supplier'
                      : 'No active suppliers available'}
                </option>
              )}
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.code} - {supplier.name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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

          <label style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 100 }}>
            <span className="form-label">Notes</span>
            <textarea
              className="form-input w-full"
              name="notes"
              value={header.notes}
              onChange={updateHeader}
              placeholder="Optional purchasing instructions"
              disabled={isSaving}
              style={{ resize: 'none', paddingTop: 10, flex: 1, minHeight: 60 }}
            />
          </label>

          <div
            style={{
              padding: 14,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '9px 20px',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--color-text-muted)' }}>Products</span>
            <span className="mono text-right">{lines.length}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
            <span className="mono text-right">{formatMoney(totals.subtotal)}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              VAT ({taxes.find((tax) => tax.id === header.taxId)?.rate || 0}%)
            </span>
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
              justifyContent: 'center',
              paddingTop: 14,
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <button
              type="submit"
              className="button-primary"
              disabled={isLoading || isSaving || !suppliers.length || !products.length}
              style={{ padding: '0 32px', height: 38, fontSize: 13 }}
            >
              {isSaving
                ? editPoId
                  ? 'Saving...'
                  : 'Placing...'
                : editPoId
                  ? 'Save & Resubmit'
                  : 'Place Order'}
            </button>
          </div>
        </aside>
      </div>
    </form>
  )
}
