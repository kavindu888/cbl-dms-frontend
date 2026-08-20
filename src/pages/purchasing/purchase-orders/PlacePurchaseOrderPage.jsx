import dayjs from 'dayjs'
import { Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import { masterService } from '@services/api/masterService'
import { purchasingService } from '@services/api/purchasingService'
import { inventoryService } from '@services/api/inventoryService'
import { PurchaseOrderStatus } from '@/types/purchasing.types'

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
    baseUomCode: '',
    smallestUomCode: '',
    baseToSmallest: 1,
  }
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function productLabel(product) {
  if (!product) return ''
  return [product.sku, product.name].filter(Boolean).join(' - ') || product.id || ''
}

function ProductSearchSelect({
  value,
  onChange,
  products,
  disabled = false,
  placeholder = 'Type SKU or product name...',
  emptyLabel = 'No matching active products',
}) {
  const containerRef = useRef(null)
  const selectedProduct = products.find((product) => product.id === value) || null
  const selectedLabel = productLabel(selectedProduct)
  const [query, setQuery] = useState(selectedLabel)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedLabel)
    }
  }, [isOpen, selectedLabel])

  useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  const filteredProducts = useMemo(() => {
    const text = query.trim().toLowerCase()
    const matchedProducts = text
      ? products.filter((product) =>
          [
            product.sku,
            product.name,
            product.barcode,
            product.category?.name,
            product.id,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(text)
        )
      : products

    return matchedProducts.slice(0, 50)
  }, [products, query])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query])

  function selectProduct(product) {
    const nextLabel = productLabel(product)
    onChange(product.id)
    setQuery(nextLabel)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <Search
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 11,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 14,
          height: 14,
          color: 'var(--color-text-muted)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <input
        className="form-input w-full"
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onFocus={(event) => {
          setIsOpen(true)
          event.target.select()
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
          if (value) onChange('')
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            if (isOpen && filteredProducts[highlightedIndex]) {
              selectProduct(filteredProducts[highlightedIndex])
            }
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            setIsOpen(true)
            setHighlightedIndex((current) =>
              Math.min(current + 1, Math.max(filteredProducts.length - 1, 0))
            )
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setHighlightedIndex((current) => Math.max(current - 1, 0))
          } else if (event.key === 'Escape') {
            setIsOpen(false)
            setQuery(selectedLabel)
          }
        }}
        style={{ height: 38, fontSize: 13, paddingLeft: 32 }}
      />

      {isOpen && !disabled ? (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 80,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 280,
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            background: 'var(--color-bg-surface)',
            boxShadow: '0 16px 34px rgba(0, 0, 0, 0.45)',
          }}
        >
          {filteredProducts.length ? (
            filteredProducts.map((product, index) => {
              const isHighlighted = index === highlightedIndex
              const label = productLabel(product)

              return (
                <button
                  key={product.id}
                  type="button"
                  role="option"
                  aria-selected={product.id === value}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    selectProduct(product)
                  }}
                  style={{
                    display: 'grid',
                    gap: 3,
                    width: '100%',
                    padding: '9px 12px',
                    border: 0,
                    borderBottom: '1px solid var(--color-border)',
                    background: isHighlighted ? 'rgba(125, 224, 232, 0.12)' : 'transparent',
                    color: 'var(--color-text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{label}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {[product.baseUom || product.uomBase, product.category?.name]
                      .filter(Boolean)
                      .join(' • ') || 'Active product'}
                  </span>
                </button>
              )
            })
          ) : (
            <div style={{ padding: 12, color: 'var(--color-text-muted)', fontSize: 12 }}>
              {emptyLabel}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function PlacePurchaseOrderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routePoId } = useParams()
  const editPoId = routePoId || location.state?.editPoId
  const [header, setHeader] = useState(emptyHeader)

  const supplierRef = useRef(null)
  const orderDateRef = useRef(null)
  const expectedDeliveryRef = useRef(null)
  const notesRef = useRef(null)
  const [lines, setLines] = useState([createEmptyLine()])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [taxes, setTaxes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [linePage, setLinePage] = useState(1)
  const [editingOrderStatus, setEditingOrderStatus] = useState(null)
  const originalLineProductByIdRef = useRef(new Map())

  const fetchProductDetailIfNeeded = useCallback(async (productId) => {
    if (!productId) return
    const product = products.find((item) => item.id === productId)
    if (!product || product.uomConversions) return // already detailed
    try {
      const detailed = await masterService.getProduct(productId)
      setProducts((current) =>
        current.some((item) => item.id === productId)
          ? current.map((item) => (item.id === productId ? detailed : item))
          : [...current, detailed]
      )
    } catch (err) {
      console.error('Error fetching product detail:', err)
    }
  }, [products])

  const loadFormData = useCallback(async () => {
    setIsLoading(true)
    setLookupError('')

    const [supplierResult, productResult, businessUnitResult, , taxResult] =
      await Promise.allSettled([
        purchasingService.listSuppliers({ page: 1, pageSize: 100, status: 1 }),
        masterService.listAllProducts({
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
    let defaultTaxId = ''

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
      const productItems = Array.isArray(productResult.value)
        ? productResult.value
        : productResult.value?.items || []
      setProducts(productItems)
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
      defaultTaxId = activeTaxes.find((item) => item.isDefault)?.id || ''
      setTaxes(activeTaxes)
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
      setEditingOrderStatus(Number(editPoDetail.status))
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
          baseUomCode: line.baseUomCode || '',
          smallestUomCode: line.smallestUomCode || '',
          baseToSmallest: line.qtyBaseUnit > 0 ? (line.qtySmallestUnit / line.qtyBaseUnit) : 1,
        })) || []

      setLines(loadedLines.length ? loadedLines : [createEmptyLine()])
      originalLineProductByIdRef.current = new Map(
        loadedLines.filter((line) => line.id).map((line) => [line.id, line.productId])
      )

      // Fetch details for any initial lines in edit mode
      loadedLines.forEach((line) => {
        if (line.productId) {
          masterService.getProduct(line.productId)
            .then((detailed) => {
              setProducts((current) =>
                current.some((item) => item.id === line.productId)
                  ? current.map((item) => (item.id === line.productId ? detailed : item))
                  : [...current, detailed]
              )
            })
            .catch((err) => console.error('Error fetching initial product detail:', err))
        }
      })
    } else {
      setEditingOrderStatus(null)
      originalLineProductByIdRef.current = new Map()
      setHeader({
        ...emptyHeader,
        supplierId: preselectedSupplierId,
        businessUnitId: preselectedBUId,
        taxId: defaultTaxId,
        orderDate: dayjs().format('YYYY-MM-DD'),
      })
      setLines([createEmptyLine()])
      setLinePage(1)
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
      const unitsPerBase = Number(line.baseToSmallest || 1)
      const lineSubtotal =
        Number(line.bigBoxQty || 0) * unitsPerBase * Number(line.unitCostSmallest || 0)

      return sum + lineSubtotal
    }, 0)
    const vat = subtotal * (vatRate / 100)

    return {
      subtotal,
      vat,
      total: subtotal + vat,
    }
  }, [header.taxId, lines, taxes])

  const isDraftEdit =
    Boolean(editPoId) && Number(editingOrderStatus) === Number(PurchaseOrderStatus.Draft)

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
    const value =
      event.target.name === 'notes'
        ? event.target.value.replace(/[^a-zA-Z0-9\s-]/g, '')
        : event.target.value
    setHeader((current) => ({ ...current, [event.target.name]: value }))
  }

  function updateLine(key, field, value) {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line

        if (field === 'productId') {
          if (value) {
            void fetchProductDetailIfNeeded(value)

            inventoryService.getLastBatchCost(value)
              .then((cost) => {
                if (cost !== null && cost !== undefined) {
                  setLines((prev) =>
                    prev.map((l) =>
                      l.key === key
                        ? {
                            ...l,
                            unitCostSmallest: String(cost),
                            lastCostReference: cost,
                          }
                        : l
                    )
                  )
                }
              })
              .catch((err) => console.error('Error fetching last batch cost:', err))

            masterService.getProductUomChain(value)
              .then((chain) => {
                setLines((prev) =>
                  prev.map((l) =>
                    l.key === key
                      ? {
                          ...l,
                          baseUomCode: chain.baseUomCode,
                          smallestUomCode: chain.smallestUomCode,
                          baseToSmallest: chain.baseToSmallest,
                        }
                      : l
                  )
                )
              })
              .catch((err) => console.error('Error fetching UOM chain:', err))
          }

          return {
            ...line,
            productId: value,
            unitCostSmallest: '',
            lastCostReference: undefined,
            baseUomCode: '',
            smallestUomCode: '',
            baseToSmallest: 1,
          }
        }

        return { ...line, [field]: value }
      })
    )
  }

  function validateDraftHeader() {
    if (!suppliers.length) return 'No active suppliers are available.'
    if (!header.supplierId) return 'Select a supplier.'
    if (header.expectedDeliveryDate && header.expectedDeliveryDate < tomorrow) {
      return 'Expected delivery date must be in the future.'
    }
    if (!header.taxId) return 'Select a tax rate.'
    return ''
  }

  function validateLines() {
    if (!products.length) return 'No active products are available.'
    if (!lines.length) return 'Add at least one product.'

    const selectedProductIds = new Set()
    for (const line of lines.filter((item) => item.productId || Number(item.bigBoxQty) > 0)) {
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

  function validateSubmit() {
    return validateDraftHeader() || validateLines()
  }

  async function persistDraft() {
    const validLines = lines.filter((line) => line.productId && Number(line.bigBoxQty) > 0)
    const isDraftEdit =
      editPoId && Number(editingOrderStatus) === Number(PurchaseOrderStatus.Draft)

    let savedOrder = null
    if (isDraftEdit) {
      savedOrder = await purchasingService.updatePurchaseOrder(editPoId, {
        businessUnitId: header.businessUnitId || null,
        paymentTermId: header.paymentTermId || null,
        orderDate: header.orderDate || null,
        expectedDeliveryDate: header.expectedDeliveryDate || null,
        notes: header.notes.trim() || null,
      })
    } else {
      savedOrder = await purchasingService.createPurchaseOrder({
        supplierId: header.supplierId,
        businessUnitId: header.businessUnitId || null,
        paymentTermId: header.paymentTermId || null,
        taxId: header.taxId || null,
        orderDate: header.orderDate || null,
        expectedDeliveryDate: header.expectedDeliveryDate || null,
        notes: header.notes.trim() || null,
      })
    }

    const poId = savedOrder.id
    const remainingOriginalLineIds = new Set(originalLineProductByIdRef.current.keys())

    for (const line of validLines) {
      const product = products.find((item) => item.id === line.productId)
      if (!product) continue

      if (isDraftEdit && line.id) {
        remainingOriginalLineIds.delete(line.id)
        const originalProductId = originalLineProductByIdRef.current.get(line.id)
        if (originalProductId === line.productId) {
          await purchasingService.updatePurchaseOrderLine(poId, line.id, {
            bigBoxQty: Number(line.bigBoxQty),
            unitCostSmallest: Number(line.unitCostSmallest),
            notes: line.notes.trim() || null,
          })
          continue
        }

        await purchasingService.removePurchaseOrderLine(poId, line.id)
      }

      await purchasingService.addPurchaseOrderLine(poId, {
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        bigBoxQty: Number(line.bigBoxQty),
        unitCostSmallest: Number(line.unitCostSmallest),
        notes: line.notes.trim() || null,
      })
    }

    if (isDraftEdit) {
      for (const lineId of remainingOriginalLineIds) {
        await purchasingService.removePurchaseOrderLine(poId, lineId)
      }
    }

    const detail = await purchasingService.getPurchaseOrder(poId)
    setEditingOrderStatus(Number(detail.status))
    originalLineProductByIdRef.current = new Map(
      (detail.lines || []).map((line) => [line.id, line.productId])
    )

    return detail
  }

  async function saveDraft() {
    const validationError = validateDraftHeader()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const draft = await persistDraft()
      toast.success(`Draft purchase order ${draft.poNumber} saved.`)
      if (!routePoId) {
        navigate(`/purchasing/place-order/${draft.id}/edit`, { replace: true })
      } else {
        await loadFormData()
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function placePurchaseOrder(event) {
    event.preventDefault()
    const validationError = validateSubmit()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError('')
    let savedOrder = null

    try {
      if (editPoId && Number(editingOrderStatus) !== Number(PurchaseOrderStatus.Draft)) {
        savedOrder = await persistDraft()
      } else {
        savedOrder = await persistDraft()
      }

      await purchasingService.submitPurchaseOrder(savedOrder.id)

      // If we are in edit mode, cancel the original rejected PO to maintain clean history
      if (editPoId && Number(editingOrderStatus) !== Number(PurchaseOrderStatus.Draft)) {
        try {
          await purchasingService.cancelPurchaseOrder(
            editPoId,
            `Re-edited and replaced by purchase order ${savedOrder.poNumber}.`
          )
        } catch (cancelError) {
          console.warn('Unable to cancel the original purchase order:', cancelError)
        }
      }

      toast.success(
        editPoId
          ? `Purchase order ${savedOrder.poNumber} submitted for approval.`
          : `Purchase order ${savedOrder.poNumber} submitted for approval.`
      )

      if (routePoId || editPoId) {
        navigate('/purchasing/all-orders', { replace: true })
      } else {
        await loadFormData()
      }
    } catch (requestError) {
      if (savedOrder && !routePoId) {
        try {
          await purchasingService.cancelPurchaseOrder(
            savedOrder.id,
            'Cancelled automatically because the purchase order could not be completed.'
          )
          setError(`${requestError.message} The new incomplete draft was cancelled.`)
        } catch {
          setError(
            `${requestError.message} New draft ${savedOrder.poNumber} could not be completed.`
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
          {isDraftEdit ? 'Edit Draft Purchase Order' : editPoId ? 'Edit Purchase Order' : 'New Purchase Order'}
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          {isDraftEdit
            ? 'Changes stay in draft until the purchase order is submitted for approval.'
            : editPoId
            ? 'Update the purchase order and resubmit it for approval.'
            : 'Build the purchase order, save it as draft, or submit it for approval.'}
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
                Enter the quantity in the product's base UOM. Converted quantities and totals are
                previews; the backend recalculates them when the order is saved.
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

          <div style={{ minHeight: 0, overflowX: 'auto', overflowY: 'visible' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Base UOM</th>
                  <th>Ordered Qty</th>
                  <th style={{ textAlign: 'right' }}>Smallest Qty</th>
                  <th>Cost / Smallest UOM</th>
                  <th style={{ textAlign: 'right' }}>Estimated Subtotal</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                 {pagedLines.map((line) => {
                  const purchaseUom = line.baseUomCode || '-'
                  const smallestUom = line.smallestUomCode || ''
                  const unitsPerBase = Number(line.baseToSmallest || 1)
                  const smallestQty = Number(line.bigBoxQty || 0) * unitsPerBase
                  const subtotal = smallestQty * Number(line.unitCostSmallest || 0)

                  return (
                    <tr key={line.key}>
                      <td style={{ minWidth: 340 }}>
                        <ProductSearchSelect
                          value={line.productId}
                          onChange={(productId) => updateLine(line.key, 'productId', productId)}
                          products={products}
                          disabled={isLoading || isSaving}
                          placeholder={
                            isLoading
                              ? 'Loading products...'
                              : products.length
                                ? 'Type SKU or product name...'
                                : 'No active products available'
                          }
                        />
                      </td>
                      <td className="mono" style={{ color: 'var(--color-text-muted)' }}>
                        {purchaseUom || '-'}
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.preventDefault()
                          }}
                        />
                      </td>
                      <td className="text-right">
                        <span className="mono">
                          {smallestQty.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 4,
                          })}
                        </span>{' '}
                        {smallestUom ? <span className="uom-badge">{smallestUom}</span> : null}
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.preventDefault()
                          }}
                        />
                        {smallestUom ? (
                          <div className="product-info-sub" style={{ marginTop: 4 }}>
                            per {smallestUom}
                          </div>
                        ) : null}
                        {line.lastCostReference !== undefined ? (
                          <div className="product-info-sub" style={{ color: 'var(--color-emerald)', marginTop: 2, fontSize: 11 }}>
                            Last: Rs. {Number(line.lastCostReference).toFixed(2)}
                          </div>
                        ) : null}
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
              Complete the header before saving or submitting this order.
            </p>
          </div>

          <label>
            <span className="form-label">Supplier *</span>
            <select
              ref={supplierRef}
              className="form-input w-full"
              name="supplierId"
              value={header.supplierId}
              onChange={updateHeader}
              disabled={isLoading || isSaving || isDraftEdit}
              style={{ height: 40 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  orderDateRef.current?.focus()
                }
              }}
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
                ref={orderDateRef}
                className="form-input w-full"
                type="date"
                name="orderDate"
                value={header.orderDate}
                onChange={updateHeader}
                disabled={isSaving}
                style={{ height: 40 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    expectedDeliveryRef.current?.focus()
                  }
                }}
              />
            </label>

            <label>
              <span className="form-label">Expected Delivery</span>
              <input
                ref={expectedDeliveryRef}
                className="form-input w-full"
                type="date"
                name="expectedDeliveryDate"
                min={tomorrow}
                value={header.expectedDeliveryDate}
                onChange={updateHeader}
                disabled={isSaving}
                style={{ height: 40 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    notesRef.current?.focus()
                  }
                }}
              />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 100 }}>
            <span className="form-label">Notes</span>
            <textarea
              ref={notesRef}
              className="form-input w-full"
              name="notes"
              value={header.notes}
              onChange={updateHeader}
              placeholder="Optional purchasing instructions"
              disabled={isSaving}
              style={{ resize: 'none', paddingTop: 10, flex: 1, minHeight: 60 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  placePurchaseOrder(e)
                }
              }}
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
              display: 'grid',
              gridTemplateColumns: !editPoId || isDraftEdit ? '1fr 1fr' : '1fr',
              gap: 10,
              paddingTop: 14,
              borderTop: '1px solid var(--color-border)',
            }}
          >
            {!editPoId || isDraftEdit ? (
              <button
                type="button"
                className="button-secondary"
                disabled={isLoading || isSaving || !suppliers.length}
                onClick={saveDraft}
                style={{ height: 38, fontSize: 13 }}
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
            ) : null}
            <button
              type="submit"
              className="button-primary"
              disabled={isLoading || isSaving || !suppliers.length || !products.length}
              style={{ height: 38, fontSize: 13 }}
            >
              {isSaving
                ? editPoId
                  ? 'Saving...'
                  : 'Submitting...'
                : isDraftEdit
                  ? 'Submit for Approval'
                  : editPoId
                    ? 'Save & Resubmit'
                    : 'Submit for Approval'}
            </button>
          </div>
        </aside>
      </div>
    </form>
  )
}
