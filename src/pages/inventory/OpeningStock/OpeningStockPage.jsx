import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  LoaderCircle,
  PackagePlus,
  Pencil,
  Save,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getLastPrices,
  getStockBatches,
  recordOpeningStock,
  updateStockBatchPricing,
} from '@/api/inventoryApi'
import { useDebounce } from '@/hooks/useDebounce'
import { masterService } from '@/services/api/masterService'
import { formatLKR } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import styles from './OpeningStockPage.module.css'

function resultValue(response) {
  const data = response?.data?.data
  return data?.value ?? data ?? response?.data
}

function errorMessage(error, fallback = 'Failed to record opening stock.') {
  const response = error?.response?.data
  const result = response?.data
  return (
    result?.validationErrors?.[0]?.message ||
    result?.errorMessage ||
    response?.errorMessage ||
    response?.message ||
    error?.message ||
    fallback
  )
}

function makeTempId() {
  return globalThis.crypto?.randomUUID?.() ?? `opening-stock-${Date.now()}-${Math.random()}`
}

function ProductPicker({ id, search, onSearchChange, selectedProduct, onSelect, onClear }) {
  const debouncedSearch = useDebounce(search.trim(), 250)
  const productQuery = useQuery({
    queryKey: ['opening-stock', 'products', debouncedSearch],
    queryFn: () =>
      masterService.listProducts({
        page: 1,
        pageSize: 20,
        search: debouncedSearch,
        status: 'Active',
      }),
    enabled: !selectedProduct && debouncedSearch.length >= 2,
  })
  const products = productQuery.data?.items ?? []

  if (selectedProduct) {
    return (
      <div className={styles.selectedProduct}>
        <span className={`mono ${styles.skuBadge}`}>{selectedProduct.sku}</span>
        <span
          style={{
            color: 'var(--color-text-primary)',
            flex: 1,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {selectedProduct.name}
        </span>
        <span className="mono" style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
          Unit: {selectedProduct.smallestUomCode || 'PCS'}
        </span>
        <button type="button" className="button-secondary" onClick={onClear} style={{ height: 30 }}>
          Change
        </button>
      </div>
    )
  }

  return (
    <div className={styles.searchWrap}>
      <Search className={styles.searchIcon} />
      <input
        id={id}
        className={`form-input ${styles.searchInput}`}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search SKU or product name..."
        autoComplete="off"
      />

      {search.trim().length >= 2 ? (
        <div className={styles.searchResults}>
          {productQuery.isFetching ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: 14 }}>
              Searching products...
            </div>
          ) : productQuery.isError ? (
            <div style={{ color: 'var(--color-danger)', fontSize: 13, padding: 14 }}>
              {productQuery.error?.message || 'Unable to search products.'}
            </div>
          ) : products.length ? (
            products.map((product) => (
              <button
                key={product.id}
                type="button"
                className={styles.productResult}
                onClick={() => onSelect(product)}
              >
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      color: 'var(--color-text-primary)',
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 750,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {product.name}
                  </span>
                  <span className="mono" style={{ color: 'var(--color-teal)', fontSize: 11 }}>
                    {product.sku}
                  </span>
                </span>
                <span className="mono" style={{ color: 'var(--color-text-dim)', fontSize: 11 }}>
                  {product.baseUom || product.uomBase || 'PCS'}
                </span>
              </button>
            ))
          ) : (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: 14 }}>
              No active products found.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function EditableBatchRow({ batch, onSaved }) {
  const [unitCost, setUnitCost] = useState(String(batch.unitCostSmallest ?? ''))
  const [mrp, setMrp] = useState(String(batch.mrp ?? ''))
  const [isHighlighted, setIsHighlighted] = useState(false)
  const highlightTimer = useRef(null)

  useEffect(() => {
    setUnitCost(String(batch.unitCostSmallest ?? ''))
    setMrp(String(batch.mrp ?? ''))
  }, [batch.unitCostSmallest, batch.mrp])

  useEffect(() => () => clearTimeout(highlightTimer.current), [])

  const updateMutation = useMutation({
    mutationFn: (data) => updateStockBatchPricing(batch.id, data),
    onSuccess: async () => {
      toast.success('Batch pricing updated')
      setIsHighlighted(true)
      clearTimeout(highlightTimer.current)
      highlightTimer.current = setTimeout(() => setIsHighlighted(false), 1600)
      await onSaved()
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to update batch pricing.')),
  })

  const cost = Number(unitCost)
  const retailPrice = Number(mrp)
  const isValid =
    unitCost !== '' &&
    Number.isFinite(cost) &&
    cost >= 0 &&
    mrp !== '' &&
    Number.isFinite(retailPrice) &&
    retailPrice >= 0

  return (
    <tr className={isHighlighted ? styles.updatedRow : undefined}>
      <td className="mono">{batch.batchNo}</td>
      <td className="mono">{batch.expiryDate ? formatDate(batch.expiryDate) : '—'}</td>
      <td className="mono text-right">
        {Number(batch.qtyAvailable).toLocaleString('en-LK')} {batch.smallestUnitCode || 'PCS'}
      </td>
      <td>
        <input
          aria-label={`Unit cost for batch ${batch.batchNo}`}
          className={`form-input mono text-right ${styles.priceInput}`}
          type="number"
          min="0"
          step="0.01"
          value={unitCost}
          onChange={(event) => setUnitCost(event.target.value)}
        />
      </td>
      <td>
        <input
          aria-label={`MRP for batch ${batch.batchNo}`}
          className={`form-input mono text-right ${styles.priceInput}`}
          type="number"
          min="0"
          step="0.01"
          value={mrp}
          onChange={(event) => setMrp(event.target.value)}
        />
      </td>
      <td className="text-right">
        <button
          type="button"
          className="button-primary"
          disabled={!isValid || updateMutation.isPending}
          onClick={() => updateMutation.mutate({ unitCostSmallest: cost, mrp: retailPrice })}
          style={{ height: 34, minWidth: 86 }}
        >
          {updateMutation.isPending ? (
            <LoaderCircle className="animate-spin" size={15} />
          ) : (
            <Save size={15} />
          )}
          Save
        </button>
      </td>
    </tr>
  )
}

export default function OpeningStockPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('add')
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [editProductSearch, setEditProductSearch] = useState('')
  const [selectedEditProduct, setSelectedEditProduct] = useState(null)
  const [qty, setQty] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [mrp, setMrp] = useState('')
  const [batchNo, setBatchNo] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [lastPrices, setLastPrices] = useState(null)
  const [stockLines, setStockLines] = useState([])
  const [notes, setNotes] = useState('')
  const selectedProductRequest = useRef(0)

  const existingBatchesQuery = useQuery({
    queryKey: ['opening-stock', 'batches', selectedEditProduct?.id],
    queryFn: () => getStockBatches(selectedEditProduct.id),
    enabled: Boolean(selectedEditProduct),
  })

  const existingBatches = useMemo(() => {
    const value = resultValue(existingBatchesQuery.data)
    const batches = Array.isArray(value) ? value : (value?.items ?? [])
    return batches.filter(
      (batch) => batch.status === 1 || String(batch.status).toLowerCase() === 'active'
    )
  }, [existingBatchesQuery.data])

  const clearLineForm = useCallback(() => {
    selectedProductRequest.current += 1
    setSelectedProduct(null)
    setProductSearch('')
    setQty('')
    setUnitCost('')
    setMrp('')
    setBatchNo('')
    setExpiryDate('')
    setLastPrices(null)
  }, [])

  const handleProductSelect = useCallback(async (product) => {
    const requestId = selectedProductRequest.current + 1
    selectedProductRequest.current = requestId
    const fallbackUom = product.smallestUnitId || product.baseUom || product.uomBase || 'PCS'

    setSelectedProduct({ ...product, smallestUomCode: fallbackUom })
    setProductSearch('')
    setUnitCost('')
    setMrp('')
    setLastPrices(null)

    const [pricesResult, uomResult] = await Promise.allSettled([
      getLastPrices(product.id),
      masterService.getProductUomChain(product.id),
    ])

    if (selectedProductRequest.current !== requestId) return

    if (uomResult.status === 'fulfilled') {
      setSelectedProduct((current) =>
        current?.id === product.id
          ? {
              ...current,
              smallestUomCode: uomResult.value?.smallestUomCode || fallbackUom,
            }
          : current
      )
    }

    if (pricesResult.status === 'fulfilled') {
      const value = resultValue(pricesResult.value) ?? {}
      const prices = {
        lastCost: value.lastCost == null ? null : Number(value.lastCost),
        lastMrp: value.lastMrp == null ? null : Number(value.lastMrp),
      }
      setLastPrices(prices)
      if (prices.lastCost > 0) setUnitCost(String(prices.lastCost))
      if (prices.lastMrp > 0) setMrp(String(prices.lastMrp))
    }
  }, [])

  const handleEditProductSelect = useCallback((product) => {
    setSelectedEditProduct({
      ...product,
      smallestUomCode: product.smallestUnitId || product.baseUom || product.uomBase || 'PCS',
    })
    setEditProductSearch('')
  }, [])

  const submitMutation = useMutation({
    mutationFn: recordOpeningStock,
    onSuccess: async (response) => {
      const result = resultValue(response) ?? {}

      await queryClient.invalidateQueries({ queryKey: ['inventory', 'stock'] })

      toast.success(
        `Opening stock recorded — ${result.linesProcessed ?? stockLines.length} lines, ` +
          `${result.batchesCreated ?? stockLines.length} batches created.`
      )
      setStockLines([])
      setNotes('')
      clearLineForm()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const handleAddLine = () => {
    const quantity = Number(qty)
    const cost = Number(unitCost)
    const retailPrice = Number(mrp)

    if (!selectedProduct) {
      toast.error('Select a product first.')
      return
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error('Enter a whole-number quantity greater than zero.')
      return
    }
    if (unitCost === '' || !Number.isFinite(cost) || cost < 0) {
      toast.error('Enter a valid unit cost.')
      return
    }
    if (mrp === '' || !Number.isFinite(retailPrice) || retailPrice < 0) {
      toast.error('Enter a valid MRP.')
      return
    }

    setStockLines((current) => [
      ...current,
      {
        tempId: makeTempId(),
        productId: selectedProduct.id,
        productSku: selectedProduct.sku,
        productName: selectedProduct.name,
        smallestUnitCode: selectedProduct.smallestUomCode || 'PCS',
        qtySmallest: quantity,
        unitCostSmallest: cost,
        mrp: retailPrice,
        batchNo: batchNo.trim() || null,
        expiryDate: expiryDate || null,
      },
    ])

    toast.success(`${selectedProduct.sku} added to the stock list.`)
    clearLineForm()
  }

  const handleSubmit = () => {
    if (!stockLines.length) {
      toast.error('Add at least one line before submitting.')
      return
    }

    submitMutation.mutate({
      notes: notes.trim(),
      lines: stockLines.map((line) => ({
        productId: line.productId,
        productSku: line.productSku,
        qtySmallest: line.qtySmallest,
        unitCostSmallest: line.unitCostSmallest,
        mrp: line.mrp,
        batchNo: line.batchNo,
        expiryDate: line.expiryDate ? `${line.expiryDate}T00:00:00Z` : null,
      })),
    })
  }

  const summary = useMemo(
    () => ({
      products: new Set(stockLines.map((line) => line.productId)).size,
      totalUnits: stockLines.reduce((sum, line) => sum + line.qtySmallest, 0),
      totalCost: stockLines.reduce(
        (sum, line) => sum + line.qtySmallest * line.unitCostSmallest,
        0
      ),
    }),
    [stockLines]
  )

  const canAdd =
    selectedProduct &&
    Number.isInteger(Number(qty)) &&
    Number(qty) > 0 &&
    unitCost !== '' &&
    Number(unitCost) >= 0 &&
    mrp !== '' &&
    Number(mrp) >= 0

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerIcon}>
          <PackagePlus size={21} />
        </div>
        <div>
          <p className="eyebrow">Inventory</p>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 24,
              fontWeight: 800,
              marginTop: 2,
            }}
          >
            Opening Stock Entry
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
            Enter existing warehouse stock directly into the system without a purchase order or GRN.
          </p>
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Opening stock actions">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'add'}
          className={`${styles.tabButton} ${activeTab === 'add' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('add')}
        >
          <PackagePlus size={16} />
          Add Stock
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'edit'}
          className={`${styles.tabButton} ${activeTab === 'edit' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          <Pencil size={15} />
          Edit Existing
        </button>
      </div>

      <div className={styles.contentGrid} hidden={activeTab !== 'add'}>
        <main className={styles.mainColumn}>
          <section className="panel" style={{ overflow: 'visible' }}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 800 }}>
                  Add Stock Line
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>
                  Quantities and prices are entered per smallest unit.
                </p>
              </div>
              <span
                className="mono"
                style={{ color: 'var(--color-teal)', fontSize: 11, fontWeight: 800 }}
              >
                {selectedProduct?.smallestUomCode ?? 'PCS'}
              </span>
            </div>

            <div className={styles.formBody}>
              <div>
                <label className="form-label" htmlFor="opening-stock-product">
                  Product *
                </label>
                <ProductPicker
                  id="opening-stock-product"
                  search={productSearch}
                  onSearchChange={setProductSearch}
                  selectedProduct={selectedProduct}
                  onSelect={handleProductSelect}
                  onClear={clearLineForm}
                />
              </div>

              <div className={styles.formGrid}>
                <div>
                  <label className="form-label" htmlFor="opening-stock-qty">
                    Qty ({selectedProduct?.smallestUomCode ?? 'PCS'}) *
                  </label>
                  <input
                    id="opening-stock-qty"
                    className="form-input mono text-right"
                    type="number"
                    min="1"
                    step="1"
                    value={qty}
                    onChange={(event) => setQty(event.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="opening-stock-cost">
                    Unit Cost / {selectedProduct?.smallestUomCode ?? 'PCS'} *
                  </label>
                  <input
                    id="opening-stock-cost"
                    className="form-input mono text-right"
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={(event) => setUnitCost(event.target.value)}
                    placeholder="0.00"
                  />
                  {lastPrices?.lastCost != null ? (
                    <p className={`mono ${styles.hint}`}>Last: {formatLKR(lastPrices.lastCost)}</p>
                  ) : null}
                </div>
                <div>
                  <label className="form-label" htmlFor="opening-stock-mrp">
                    MRP / {selectedProduct?.smallestUomCode ?? 'PCS'} *
                  </label>
                  <input
                    id="opening-stock-mrp"
                    className="form-input mono text-right"
                    type="number"
                    min="0"
                    step="0.01"
                    value={mrp}
                    onChange={(event) => setMrp(event.target.value)}
                    placeholder="0.00"
                  />
                  {lastPrices?.lastMrp != null ? (
                    <p className={`mono ${styles.hint}`}>Last: {formatLKR(lastPrices.lastMrp)}</p>
                  ) : null}
                </div>
              </div>

              <div className={styles.metaGrid}>
                <div>
                  <label className="form-label" htmlFor="opening-stock-batch">
                    Batch No <span style={{ textTransform: 'none' }}>(optional)</span>
                  </label>
                  <input
                    id="opening-stock-batch"
                    className="form-input mono"
                    type="text"
                    value={batchNo}
                    onChange={(event) => setBatchNo(event.target.value)}
                    placeholder="Auto-generated if blank"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="opening-stock-expiry">
                    Expiry Date <span style={{ textTransform: 'none' }}>(optional)</span>
                  </label>
                  <input
                    id="opening-stock-expiry"
                    className="form-input"
                    type="date"
                    value={expiryDate}
                    onChange={(event) => setExpiryDate(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="button-primary"
                  disabled={!canAdd}
                  onClick={handleAddLine}
                  style={{ height: 39, minWidth: 150 }}
                >
                  <PackagePlus size={16} />
                  Add to List
                </button>
              </div>
            </div>
          </section>

          <section className="panel" style={{ overflow: 'hidden' }}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 800 }}>
                  Stock Lines
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>
                  Review all lines before submitting them together.
                </p>
              </div>
              <span className="mono" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                {stockLines.length} line{stockLines.length === 1 ? '' : 's'}
              </span>
            </div>

            {stockLines.length === 0 ? (
              <div className={styles.emptyState}>
                <Boxes size={31} style={{ color: 'var(--color-text-dim)', marginBottom: 10 }} />
                <p style={{ color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 700 }}>
                  No stock lines added yet
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>
                  Search for a product above to begin the opening balance.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit Cost</th>
                      <th className="text-right">MRP</th>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {stockLines.map((line) => (
                      <tr key={line.tempId}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
                              {line.productName}
                            </span>
                            <span
                              className="mono"
                              style={{ color: 'var(--color-teal)', fontSize: 11 }}
                            >
                              {line.productSku}
                            </span>
                          </div>
                        </td>
                        <td className="mono text-right">
                          {line.qtySmallest.toLocaleString('en-LK')} {line.smallestUnitCode}
                        </td>
                        <td className="mono text-right">{formatLKR(line.unitCostSmallest)}</td>
                        <td className="mono text-right">{formatLKR(line.mrp)}</td>
                        <td className="mono">
                          {line.batchNo || (
                            <span style={{ color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
                              auto-generated
                            </span>
                          )}
                        </td>
                        <td className="mono">
                          {line.expiryDate ? formatDate(line.expiryDate) : '—'}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className={styles.removeButton}
                            aria-label={`Remove ${line.productSku}`}
                            onClick={() =>
                              setStockLines((current) =>
                                current.filter((item) => item.tempId !== line.tempId)
                              )
                            }
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        <aside className={`panel ${styles.summaryPanel}`}>
          <div>
            <h2 style={{ color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 800 }}>
              Entry Summary
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>
              All lines are recorded in one operation.
            </p>
          </div>

          <div className={styles.divider} />

          <div>
            <label className="form-label" htmlFor="opening-stock-notes">
              Notes
            </label>
            <textarea
              id="opening-stock-notes"
              className="form-input"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Initial stock migration"
              maxLength={500}
              rows={3}
              style={{ minHeight: 76, resize: 'vertical' }}
            />
          </div>

          <div className={styles.divider} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className={styles.summaryRow}>
              <span style={{ color: 'var(--color-text-muted)' }}>Lines</span>
              <span
                className="mono"
                style={{ color: 'var(--color-text-primary)', fontWeight: 800 }}
              >
                {stockLines.length}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span style={{ color: 'var(--color-text-muted)' }}>Products</span>
              <span className="mono" style={{ color: 'var(--color-text-primary)' }}>
                {summary.products}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span style={{ color: 'var(--color-text-muted)' }}>Total Units</span>
              <span className="mono" style={{ color: 'var(--color-text-primary)' }}>
                {summary.totalUnits.toLocaleString('en-LK')}
              </span>
            </div>
            <div className={styles.divider} />
            <div className={styles.summaryRow}>
              <span style={{ color: 'var(--color-text-muted)' }}>Stock Value</span>
              <span className="mono" style={{ color: 'var(--color-teal)', fontWeight: 800 }}>
                {formatLKR(summary.totalCost)}
              </span>
            </div>
          </div>

          <div className={styles.warning}>
            <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              This adds stock directly to the main inventory without a purchase order or GRN. Each
              line creates a stock batch and an AdjustmentIn movement. This cannot be undone here.
            </span>
          </div>

          <button
            type="button"
            className="button-primary"
            disabled={!stockLines.length || submitMutation.isPending}
            onClick={handleSubmit}
            style={{ height: 42, width: '100%' }}
          >
            {submitMutation.isPending ? (
              <>
                <LoaderCircle className="animate-spin" size={17} />
                Recording Stock...
              </>
            ) : (
              <>
                <CheckCircle2 size={17} />
                {stockLines.length ? `Submit (${stockLines.length} lines)` : 'Submit All'}
              </>
            )}
          </button>

          {submitMutation.isSuccess ? (
            <div
              style={{
                background: 'color-mix(in srgb, var(--color-teal) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-teal) 24%, transparent)',
                borderRadius: 8,
                color: 'var(--color-teal)',
                fontSize: 12,
                padding: 10,
                textAlign: 'center',
              }}
            >
              Stock recorded successfully. Check Stock Overview to verify.
            </div>
          ) : null}
        </aside>
      </div>

      <section className="panel" hidden={activeTab !== 'edit'} style={{ overflow: 'visible' }}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 800 }}>
              Edit Existing Batches
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>
              Select a product to view its active stock batches.
            </p>
          </div>
        </div>

        <div className={styles.editBody}>
          <div>
            <label className="form-label" htmlFor="edit-stock-product">
              Product *
            </label>
            <ProductPicker
              id="edit-stock-product"
              search={editProductSearch}
              onSearchChange={setEditProductSearch}
              selectedProduct={selectedEditProduct}
              onSelect={handleEditProductSelect}
              onClear={() => {
                setSelectedEditProduct(null)
                setEditProductSearch('')
              }}
            />
          </div>

          {selectedEditProduct ? (
            <div className={styles.batchSection}>
              <div className={styles.editHint}>
                Edit unit cost and MRP for existing stock batches. Batch number and quantity cannot
                be changed here.
              </div>

              {existingBatchesQuery.isFetching ? (
                <div className={styles.emptyState}>
                  <LoaderCircle
                    className="animate-spin"
                    size={28}
                    style={{ color: 'var(--color-teal)', marginBottom: 10 }}
                  />
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                    Loading active batches...
                  </p>
                </div>
              ) : existingBatchesQuery.isError ? (
                <div className={styles.emptyState}>
                  <AlertTriangle
                    size={28}
                    style={{ color: 'var(--color-danger)', marginBottom: 10 }}
                  />
                  <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>
                    {errorMessage(existingBatchesQuery.error, 'Unable to load stock batches.')}
                  </p>
                </div>
              ) : existingBatches.length ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Batch No</th>
                        <th>Expiry</th>
                        <th className="text-right">Qty Available</th>
                        <th className="text-right">Unit Cost</th>
                        <th className="text-right">MRP</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingBatches.map((batch) => (
                        <EditableBatchRow
                          key={batch.id}
                          batch={batch}
                          onSaved={() =>
                            Promise.all([
                              existingBatchesQuery.refetch(),
                              queryClient.invalidateQueries({ queryKey: ['inventory', 'stock'] }),
                            ])
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Boxes size={31} style={{ color: 'var(--color-text-dim)', marginBottom: 10 }} />
                  <p style={{ color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 700 }}>
                    No active batches found for this product
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
