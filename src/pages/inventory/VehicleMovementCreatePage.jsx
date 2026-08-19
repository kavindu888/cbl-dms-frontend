import { ArrowLeft, PackageSearch, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import DraftStatusBadge from '@/components/drafts/DraftStatusBadge'
import ResumeDraftModal from '@/components/drafts/ResumeDraftModal'
import { useAutosaveDraft } from '@/hooks/useAutosaveDraft'
import {
  useApplyVehicleLoading,
  useApplyVehicleUnloading,
  useCreateVehicleLoading,
  useCreateVehicleUnloading,
  useVehicleLoading,
  useVehicleUnloading,
  useVehicles,
} from '@/hooks/useVehicle'
import { draftsService } from '@/services/api/draftsService'
import { inventoryService } from '@/services/api/inventoryService'
import { masterService } from '@/services/api/masterService'
import { useDraftsStore } from '@/stores/draftsStore'
import { formatDate } from '@/utils/formatDate'
import { formatLKR } from '@/utils/formatCurrency'
import {
  formatNumber,
  getMrp,
  getQtyAvailable,
  getQtyFree,
  getQtyReserved,
  getUnitCost,
  resultId,
  returnReasonLabel,
  unloadingTypeLabel,
  vehicleLabel,
} from './vehicleMovementUtils'

function todayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function VehicleMovementCreatePage({ kind, basePath }) {
  const isUnloading = kind === 'Unloading'
  const draftType = isUnloading ? 'VehicleUnloading' : 'VehicleLoading'
  const navigate = useNavigate()
  const location = useLocation()
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useVehicles()
  const createLoading = useCreateVehicleLoading()
  const createUnloading = useCreateVehicleUnloading()
  const applyLoading = useApplyVehicleLoading()
  const applyUnloading = useApplyVehicleUnloading()

  const [vehicleId, setVehicleId] = useState('')
  const [vehicleLoadingId, setVehicleLoadingId] = useState('')
  const [deliveryRunId, setDeliveryRunId] = useState('')
  const [loadingDate, setLoadingDate] = useState(todayInputValue())
  const [unloadingDate, setUnloadingDate] = useState(todayInputValue())
  const [notes, setNotes] = useState('')
  const [draftId, setDraftId] = useState('')
  const [lines, setLines] = useState([])
  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [batches, setBatches] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [qty, setQty] = useState('')
  const [unloadingType, setUnloadingType] = useState(1)
  const [returnReason, setReturnReason] = useState('')
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingBatches, setIsLoadingBatches] = useState(false)
  const [isAddingLine, setIsAddingLine] = useState(false)
  const [deliveryRuns, setDeliveryRuns] = useState([])
  const [appliedLoadings, setAppliedLoadings] = useState([])
  const [resumeModalDraft, setResumeModalDraft] = useState(null)
  const [hydrateLinesFromServer, setHydrateLinesFromServer] = useState(false)
  const skipResetForVehicleLoadingIdRef = useRef(null)

  const { data: resumedLoading } = useVehicleLoading(
    !isUnloading && hydrateLinesFromServer ? draftId : undefined
  )
  const { data: resumedUnloading } = useVehicleUnloading(
    isUnloading && hydrateLinesFromServer ? draftId : undefined
  )

  function restoreFromDraft(entry) {
    const payload = entry?.payload || {}
    setVehicleId(payload.vehicleId || '')
    setVehicleLoadingId(payload.vehicleLoadingId || '')
    setDeliveryRunId(payload.deliveryRunId || '')
    setLoadingDate(payload.loadingDate || todayInputValue())
    setUnloadingDate(payload.unloadingDate || todayInputValue())
    setNotes(payload.notes || '')
    const pendingPicker = payload.pendingPicker || {}
    setProductSearch(pendingPicker.productSearch || '')
    setSelectedProductId(pendingPicker.selectedProductId || '')
    setSelectedBatchId(pendingPicker.selectedBatchId || '')
    setQty(pendingPicker.qty || '')
    setUnloadingType(pendingPicker.unloadingType ?? 1)
    setReturnReason(pendingPicker.returnReason || '')
    if (isUnloading && payload.vehicleLoadingId) {
      skipResetForVehicleLoadingIdRef.current = payload.vehicleLoadingId
    }
    if (entry?.referenceId) {
      setDraftId(entry.referenceId)
      setHydrateLinesFromServer(true)
    }
  }

  useEffect(() => {
    const resumeDraftId = location.state?.resumeDraftId
    if (resumeDraftId) {
      const entry = useDraftsStore.getState().drafts[resumeDraftId]
      if (entry) {
        restoreFromDraft(entry)
        toast.success('Draft resumed.')
      }
      return
    }
    const latest = useDraftsStore.getState().getLatestByType(draftType)
    if (latest) setResumeModalDraft(latest)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const movement = isUnloading ? resumedUnloading : resumedLoading
    if (!hydrateLinesFromServer || !movement) return
    setLines(
      (movement.lines || []).map((line) => ({
        id: line.id,
        productName: line.productName || line.productSku,
        productSku: line.productSku,
        sourceBatchNo: line.sourceBatchNo,
        qtySmallest: line.qtySmallest,
        unitCostSmallest: line.unitCostSmallest,
        mrp: line.mrp,
        unloadingType: line.unloadingType,
        returnReason: line.returnReason,
      }))
    )
    setHydrateLinesFromServer(false)
  }, [hydrateLinesFromServer, isUnloading, resumedLoading, resumedUnloading])

  function handleResumeDraft() {
    restoreFromDraft(resumeModalDraft)
    setResumeModalDraft(null)
    toast.success('Draft resumed.')
  }

  function handleDiscardResumeDraft() {
    const entry = resumeModalDraft
    if (entry) {
      useDraftsStore.getState().removeDraft(entry.id)
      if (entry.serverId) draftsService.deleteDraft(entry.serverId).catch(() => {})
    }
    setResumeModalDraft(null)
  }

  const selectedVehicleForLabel = vehicles.find((vehicle) => vehicle.id === vehicleId)

  const {
    status: draftStatus,
    lastSavedAt,
    discardDraft,
  } = useAutosaveDraft({
    draftType,
    referenceId: draftId,
    getSnapshot: () => ({
      vehicleId,
      vehicleLoadingId,
      deliveryRunId,
      loadingDate,
      unloadingDate,
      notes,
      pendingPicker: {
        productSearch,
        selectedProductId,
        selectedBatchId,
        qty,
        unloadingType,
        returnReason,
      },
    }),
    label: selectedVehicleForLabel ? vehicleLabel(selectedVehicleForLabel) : undefined,
    enabled: !hydrateLinesFromServer,
  })

  useEffect(() => {
    let active = true
    async function loadProducts() {
      setIsLoadingProducts(true)
      try {
        const items = await masterService.listAllProducts({ pageSize: 100, status: 'Active' })
        if (active) setProducts(items || [])
      } catch (error) {
        if (active) toast.error(error.message || 'Unable to load products.')
      } finally {
        if (active) setIsLoadingProducts(false)
      }
    }
    loadProducts()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    async function loadDeliveryRuns() {
      try {
        const items = await masterService.listAllDeliveryRuns({ activeOnly: true, pageSize: 100 })
        if (active) setDeliveryRuns(items || [])
      } catch (error) {
        if (active) toast.error(error.message || 'Unable to load delivery runs.')
      }
    }
    loadDeliveryRuns()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!isUnloading) return undefined

    let active = true
    async function loadAppliedLoadings() {
      try {
        const items = await inventoryService.listVehicleLoadings({ status: 2 })
        if (active) setAppliedLoadings(items || [])
      } catch {
        if (active) setAppliedLoadings([])
      }
    }
    loadAppliedLoadings()

    return () => {
      active = false
    }
  }, [isUnloading])

  useEffect(() => {
    if (!selectedProductId || (isUnloading && !vehicleId)) {
      setBatches([])
      setSelectedBatchId('')
      return
    }
    let active = true
    async function loadBatches() {
      setIsLoadingBatches(true)
      try {
        const rows = await inventoryService.listStockBatches(
          selectedProductId,
          isUnloading ? { locationId: vehicleId } : {}
        )
        const loading = appliedLoadings.find((item) => item.id === vehicleLoadingId)
        const loadingBatchPrefix = loading?.loadingNo ? `VL-${loading.loadingNo}-` : ''
        const availableRows = rows.filter((batch) => getQtyAvailable(batch) > 0)
        const scopedRows =
          isUnloading && loadingBatchPrefix
            ? availableRows.filter((batch) =>
                String(batch.batchNo || '').startsWith(loadingBatchPrefix)
              )
            : availableRows
        if (active) setBatches(scopedRows)
      } catch (error) {
        if (active) {
          setBatches([])
          toast.error(error.message || 'Unable to load batches.')
        }
      } finally {
        if (active) setIsLoadingBatches(false)
      }
    }
    loadBatches()
    setSelectedBatchId('')
    setQty('')
    return () => {
      active = false
    }
  }, [appliedLoadings, isUnloading, selectedProductId, vehicleId, vehicleLoadingId])

  useEffect(() => {
    if (!isUnloading) return
    const loading = appliedLoadings.find((item) => item.id === vehicleLoadingId)
    setVehicleId(loading?.vehicleLocationId || '')
  }, [appliedLoadings, isUnloading, vehicleLoadingId])

  useEffect(() => {
    if (!isUnloading) return
    setSelectedProductId('')
    setSelectedBatchId('')
    setProductSearch('')
    if (skipResetForVehicleLoadingIdRef.current === vehicleLoadingId) {
      skipResetForVehicleLoadingIdRef.current = null
      return
    }
    setLines([])
    setDraftId('')
  }, [isUnloading, vehicleLoadingId])

  const selectedVehicleLoading = appliedLoadings.find((loading) => loading.id === vehicleLoadingId)
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId)
  const selectedDeliveryRun = deliveryRuns.find((run) => run.id === deliveryRunId)
  const unloadingDeliveryRunIds = selectedVehicleLoading?.deliveryRunId
    ? [selectedVehicleLoading.deliveryRunId]
    : []
  const unloadingDeliveryRun =
    unloadingDeliveryRunIds.length === 1
      ? deliveryRuns.find((run) => run.id === unloadingDeliveryRunIds[0])
      : null
  const unloadingDeliveryRunLabel =
    unloadingDeliveryRunIds.length === 0
      ? 'No applied loading found'
      : unloadingDeliveryRunIds.length > 1
        ? 'Multiple delivery runs'
        : unloadingDeliveryRun
          ? `${unloadingDeliveryRun.code} - ${unloadingDeliveryRun.name}`
          : unloadingDeliveryRunIds[0]
  const selectedProduct = products.find((product) => product.id === selectedProductId)
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId)
  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    if (!term) return products.slice(0, 30)
    return products
      .filter((product) =>
        `${product.name} ${product.sku} ${product.barcode || ''}`.toLowerCase().includes(term)
      )
      .slice(0, 30)
  }, [productSearch, products])

  const totalQty = lines.reduce((sum, line) => sum + Number(line.qtySmallest || 0), 0)
  const normalCount = lines.filter(
    (line) => unloadingTypeLabel(line.unloadingType) === 'Normal'
  ).length
  const labelledCount = lines.length - normalCount

  async function ensureDraft() {
    if (draftId) return draftId
    if (isUnloading && !vehicleLoadingId) throw new Error('Select an applied loading first.')
    if (!vehicleId) throw new Error('Select a vehicle first.')
    if (!isUnloading && !deliveryRunId) throw new Error('Select a delivery run first.')
    if (!isUnloading && !loadingDate) throw new Error('Select a loading date first.')
    if (isUnloading && !unloadingDate) throw new Error('Select an unloading date first.')
    const result = isUnloading
      ? await createUnloading.mutateAsync({
          vehicleLoadingId,
          unloadingDate: `${unloadingDate}T00:00:00Z`,
          notes: notes.trim() || null,
        })
      : await createLoading.mutateAsync({
          vehicleLocationId: vehicleId,
          deliveryRunId,
          loadingDate: `${loadingDate}T00:00:00Z`,
          notes: notes.trim() || null,
        })
    const id = resultId(result)
    if (!id) throw new Error(`Draft saved, but the new ${kind.toLowerCase()} id was not returned.`)
    setDraftId(id)
    return id
  }

  async function handleAddLine() {
    if (!selectedVehicle || !selectedProduct || !selectedBatch)
      return toast.error('Select a vehicle, product, and batch first.')
    const requestedQty = Number(qty)
    if (requestedQty <= 0) return toast.error('Enter a quantity greater than zero.')
    if (requestedQty > getQtyAvailable(selectedBatch))
      return toast.error('Quantity cannot exceed available batch quantity.')
    if (isUnloading && unloadingType === 2 && !returnReason)
      return toast.error('Labelled unloading requires a return reason.')

    setIsAddingLine(true)
    try {
      const id = await ensureDraft()
      const payload = {
        productId: selectedProduct.id,
        productSku: selectedProduct.sku,
        sourceBatchId: selectedBatch.id,
        qtySmallest: requestedQty,
        ...(isUnloading
          ? { unloadingType, returnReason: unloadingType === 2 ? Number(returnReason) : null }
          : {}),
      }
      const result = isUnloading
        ? await inventoryService.addVehicleUnloadingLine(id, payload)
        : await inventoryService.addVehicleLoadingLine(id, payload)
      const lineId = resultId(result) || `${selectedBatch.id}-${Date.now()}`
      setLines((current) => [
        ...current,
        {
          id: lineId,
          productName: selectedProduct.name,
          productSku: selectedProduct.sku,
          sourceBatchNo: selectedBatch.batchNo,
          qtySmallest: requestedQty,
          unitCostSmallest: getUnitCost(selectedBatch),
          mrp: getMrp(selectedBatch),
          unloadingType,
          returnReason: unloadingType === 2 ? Number(returnReason) : null,
        },
      ])
      toast.success(isUnloading ? 'Unloading line added.' : 'Stock line added.')
      setSelectedBatchId('')
      setQty('')
      setReturnReason('')
      setUnloadingType(1)
    } catch (error) {
      toast.error(error.message || `Unable to add ${kind.toLowerCase()} line.`)
    } finally {
      setIsAddingLine(false)
    }
  }

  async function handleRemoveLine(lineId) {
    try {
      if (isUnloading) await inventoryService.removeVehicleUnloadingLine(draftId, lineId)
      else await inventoryService.removeVehicleLoadingLine(draftId, lineId)
      setLines((current) => current.filter((line) => line.id !== lineId))
      toast.success('Stock line removed.')
    } catch (error) {
      toast.error(error.message || 'Unable to remove stock line.')
    }
  }

  async function handleApply() {
    if (!draftId || !lines.length || !vehicleId) return
    const message = isUnloading
      ? 'Unload this stock to main inventory? This inventory movement cannot be undone.'
      : 'Load this stock to the vehicle? This inventory movement cannot be undone.'
    if (!window.confirm(message)) return
    try {
      if (isUnloading) await applyUnloading.mutateAsync(draftId)
      else await applyLoading.mutateAsync(draftId)
      discardDraft()
      navigate(basePath)
    } catch {
      /* Hook shows the error toast. */
    }
  }

  const applyPending = applyLoading.isPending || applyUnloading.isPending

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <button
          type="button"
          className="button-secondary"
          onClick={() => navigate(basePath)}
          style={{ height: 34, marginBottom: 12 }}
        >
          <ArrowLeft size={15} /> Back to List
        </button>
        <p className="eyebrow">Inventory</p>
        <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
          <h1 style={{ color: 'var(--color-text-primary)', fontSize: 24, fontWeight: 800 }}>
            New Vehicle {kind}
          </h1>
          <DraftStatusBadge status={draftStatus} lastSavedAt={lastSavedAt} />
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
          {isUnloading
            ? 'Move selected vehicle batches back to main inventory.'
            : 'Move selected main inventory batches onto a vehicle.'}
        </p>
      </header>

      <div
        style={{
          alignItems: 'start',
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'minmax(0, 1fr) minmax(340px, 380px)',
        }}
      >
        <main style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="panel" style={{ padding: 16 }}>
            <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 800 }}>
              Header Details
            </h2>
            <div
              style={{
                display: 'grid',
                gap: 14,
                gridTemplateColumns: 'minmax(240px, 1fr) minmax(240px, 1fr)',
                marginTop: 14,
              }}
            >
              {isUnloading ? (
                <>
                  <label>
                    <span className="form-label">Applied Loading *</span>
                    <select
                      className="form-input"
                      value={vehicleLoadingId}
                      disabled={lines.length > 0 || Boolean(draftId)}
                      onChange={(event) => setVehicleLoadingId(event.target.value)}
                    >
                      <option value="">Select applied loading...</option>
                      {appliedLoadings.map((loading) => {
                        const loadingVehicle = vehicles.find(
                          (vehicle) => vehicle.id === loading.vehicleLocationId
                        )
                        return (
                          <option key={loading.id} value={loading.id}>
                            {loading.loadingNo} -{' '}
                            {loadingVehicle
                              ? vehicleLabel(loadingVehicle)
                              : loading.vehicleLocationId}
                          </option>
                        )
                      })}
                    </select>
                  </label>
                  <label>
                    <span className="form-label">Vehicle</span>
                    <input
                      className="form-input"
                      value={
                        selectedVehicle ? vehicleLabel(selectedVehicle) : 'Select loading first'
                      }
                      disabled
                      readOnly
                    />
                  </label>
                </>
              ) : (
                <label>
                  <span className="form-label">Vehicle *</span>
                  <select
                    className="form-input"
                    value={vehicleId}
                    disabled={lines.length > 0 || isLoadingVehicles}
                    onChange={(event) => {
                      setVehicleId(event.target.value)
                      setSelectedProductId('')
                      setSelectedBatchId('')
                    }}
                  >
                    <option value="">Select vehicle...</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicleLabel(vehicle)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!isUnloading ? (
                <>
                  <label>
                    <span className="form-label">Delivery Run *</span>
                    <select
                      className="form-input"
                      value={deliveryRunId}
                      disabled={lines.length > 0 || Boolean(draftId)}
                      onChange={(event) => setDeliveryRunId(event.target.value)}
                    >
                      <option value="">Select delivery run...</option>
                      {deliveryRuns.map((run) => (
                        <option key={run.id} value={run.id}>
                          {run.code} - {run.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="form-label">Loading Date *</span>
                    <input
                      className="form-input"
                      type="date"
                      value={loadingDate}
                      disabled={lines.length > 0 || Boolean(draftId)}
                      onChange={(event) => setLoadingDate(event.target.value)}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    <span className="form-label">Delivery Run</span>
                    <input
                      className="form-input"
                      value={unloadingDeliveryRunLabel}
                      disabled
                      readOnly
                    />
                  </label>
                  <label>
                    <span className="form-label">Unloading Date *</span>
                    <input
                      className="form-input"
                      type="date"
                      value={unloadingDate}
                      disabled={lines.length > 0 || Boolean(draftId)}
                      onChange={(event) => setUnloadingDate(event.target.value)}
                    />
                  </label>
                </>
              )}
              <label>
                <span className="form-label">Notes</span>
                <input
                  className="form-input"
                  value={notes}
                  disabled={Boolean(draftId)}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional movement notes"
                />
              </label>
            </div>
          </section>

          <section className="panel" style={{ padding: 16 }}>
            <div>
              <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 800 }}>
                {isUnloading ? 'Add Unloading Line' : 'Add Stock Line'}
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>
                Search a product, select an available batch, then enter the quantity.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <label>
                <span className="form-label">Product</span>
                <input
                  className="form-input"
                  value={productSearch}
                  disabled={isUnloading && !vehicleId}
                  onChange={(event) => {
                    setProductSearch(event.target.value)
                    setSelectedProductId('')
                    setSelectedBatchId('')
                  }}
                  placeholder={
                    isUnloading && !vehicleId
                      ? 'Select an applied loading first'
                      : 'Search SKU, barcode, or product name'
                  }
                />
              </label>
              {!selectedProduct && productSearch.trim() ? (
                <div
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    maxHeight: 210,
                    overflowY: 'auto',
                  }}
                >
                  {isLoadingProducts ? (
                    <div style={{ color: 'var(--color-text-muted)', padding: 14 }}>
                      Loading products...
                    </div>
                  ) : filteredProducts.length ? (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setSelectedProductId(product.id)}
                        style={{
                          alignItems: 'center',
                          borderBottom: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <span>
                          <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>
                            {product.name}
                          </strong>
                          <span
                            className="mono"
                            style={{ color: 'var(--color-teal)', fontSize: 11 }}
                          >
                            {product.sku}
                          </span>
                        </span>
                        <PackageSearch size={16} />
                      </button>
                    ))
                  ) : (
                    <div style={{ color: 'var(--color-text-muted)', padding: 14 }}>
                      No products found.
                    </div>
                  )}
                </div>
              ) : null}
              {selectedProduct ? (
                <>
                  <div
                    style={{
                      alignItems: 'center',
                      background: 'var(--color-bg-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      display: 'flex',
                      gap: 12,
                      padding: '10px 12px',
                    }}
                  >
                    <span className="product-sku-badge mono">{selectedProduct.sku}</span>
                    <strong style={{ color: 'var(--color-text-primary)', flex: 1 }}>
                      {selectedProduct.name}
                    </strong>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => {
                        setSelectedProductId('')
                        setProductSearch('')
                        setSelectedBatchId('')
                      }}
                      style={{ height: 30 }}
                    >
                      Change
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Batch No</th>
                          <th className="text-right">
                            {isUnloading ? 'Available Qty' : 'Physical Qty'}
                          </th>
                          {!isUnloading ? (
                            <>
                              <th className="text-right">Reserved Qty</th>
                              <th className="text-right">Free Qty</th>
                            </>
                          ) : null}
                          <th className="text-right">Unit Cost</th>
                          <th className="text-right">MRP</th>
                          <th>Expiry</th>
                          <th className="text-right">Select</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingBatches ? (
                          <tr>
                            <td colSpan={isUnloading ? 6 : 8}>Loading batches...</td>
                          </tr>
                        ) : batches.length ? (
                          batches.map((batch) => (
                            <tr
                              key={batch.id}
                              style={{
                                boxShadow:
                                  selectedBatchId === batch.id
                                    ? 'inset 3px 0 var(--color-teal)'
                                    : 'none',
                              }}
                            >
                              <td className="mono">{batch.batchNo || '—'}</td>
                              <td className="mono text-right">
                                {formatNumber(getQtyAvailable(batch))}
                              </td>
                              {!isUnloading ? (
                                <>
                                  <td
                                    className="mono text-right"
                                    style={{
                                      color: getQtyReserved(batch)
                                        ? 'var(--color-amber)'
                                        : 'var(--color-text-muted)',
                                    }}
                                  >
                                    {formatNumber(getQtyReserved(batch))}
                                  </td>
                                  <td
                                    className="mono text-right"
                                    style={{ color: 'var(--color-teal)' }}
                                  >
                                    {formatNumber(getQtyFree(batch))}
                                  </td>
                                </>
                              ) : null}
                              <td className="mono text-right">{formatLKR(getUnitCost(batch))}</td>
                              <td className="mono text-right">{formatLKR(getMrp(batch))}</td>
                              <td className="mono">{formatDate(batch.expiryDate)}</td>
                              <td className="text-right">
                                <button
                                  type="button"
                                  className={
                                    selectedBatchId === batch.id
                                      ? 'button-primary'
                                      : 'button-secondary'
                                  }
                                  onClick={() => setSelectedBatchId(batch.id)}
                                  style={{ height: 30 }}
                                >
                                  Select
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={isUnloading ? 6 : 8}>
                              No available {isUnloading ? 'vehicle' : 'main stock'} batches found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
              {selectedBatch ? (
                <div
                  style={{
                    borderTop: '1px solid var(--color-border)',
                    display: 'grid',
                    gap: 12,
                    gridTemplateColumns: isUnloading
                      ? '150px minmax(250px, 1fr) auto'
                      : '180px auto',
                    paddingTop: 14,
                  }}
                >
                  <label>
                    <span className="form-label">Quantity *</span>
                    <input
                      className="form-input mono text-right"
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      max={getQtyAvailable(selectedBatch)}
                      value={qty}
                      onChange={(event) => setQty(event.target.value)}
                    />
                    <small className="mono" style={{ color: 'var(--color-text-muted)' }}>
                      Max physical: {formatNumber(getQtyAvailable(selectedBatch))}
                      {!isUnloading
                        ? ` | Reserved: ${formatNumber(getQtyReserved(selectedBatch))} | Free: ${formatNumber(getQtyFree(selectedBatch))}`
                        : ''}
                    </small>
                  </label>
                  {isUnloading ? (
                    <div>
                      <span className="form-label">Unloading Type *</span>
                      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
                        <button
                          type="button"
                          className={unloadingType === 1 ? 'button-primary' : 'button-secondary'}
                          onClick={() => {
                            setUnloadingType(1)
                            setReturnReason('')
                          }}
                        >
                          ✓ Normal
                        </button>
                        <button
                          type="button"
                          className={unloadingType === 2 ? 'button-primary' : 'button-secondary'}
                          onClick={() => setUnloadingType(2)}
                        >
                          ⚠ Labelled
                        </button>
                      </div>
                      {unloadingType === 2 ? (
                        <select
                          className="form-input"
                          value={returnReason}
                          onChange={(event) => setReturnReason(event.target.value)}
                          style={{ marginTop: 8 }}
                        >
                          <option value="">Select return reason...</option>
                          <option value="3">Short Expiry</option>
                          <option value="4">Unwanted</option>
                        </select>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="button-primary"
                    disabled={
                      !qty ||
                      Number(qty) <= 0 ||
                      isAddingLine ||
                      (isUnloading && unloadingType === 2 && !returnReason)
                    }
                    onClick={handleAddLine}
                    style={{ alignSelf: 'start', height: 38, marginTop: 20 }}
                  >
                    {isAddingLine ? 'Adding...' : 'Add Line'}
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ borderBottom: '1px solid var(--color-border)', padding: '14px 16px' }}>
              <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 800 }}>
                {isUnloading ? 'Unloading Lines' : 'Stock Lines'}
              </h2>
            </div>
            {lines.length ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Source Batch</th>
                      <th className="text-right">Qty</th>
                      {isUnloading ? (
                        <>
                          <th>Type</th>
                          <th>Reason</th>
                        </>
                      ) : (
                        <>
                          <th className="text-right">Unit Cost</th>
                          <th className="text-right">MRP</th>
                        </>
                      )}
                      <th className="text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>
                            {line.productName}
                          </strong>
                          <span className="product-sku-badge mono">{line.productSku}</span>
                        </td>
                        <td className="mono">{line.sourceBatchNo || '—'}</td>
                        <td className="mono text-right">{formatNumber(line.qtySmallest)}</td>
                        {isUnloading ? (
                          <>
                            <td>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${unloadingTypeLabel(line.unloadingType) === 'Labelled' ? 'border-amber-700/50 bg-amber-500/10 text-amber-400' : 'border-gray-700 bg-gray-800 text-gray-300'}`}
                              >
                                {unloadingTypeLabel(line.unloadingType).toUpperCase()}
                              </span>
                            </td>
                            <td>{returnReasonLabel(line.returnReason)}</td>
                          </>
                        ) : (
                          <>
                            <td className="mono text-right">{formatLKR(line.unitCostSmallest)}</td>
                            <td className="mono text-right">{formatLKR(line.mrp)}</td>
                          </>
                        )}
                        <td className="text-right">
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => handleRemoveLine(line.id)}
                            style={{ height: 30 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: 'var(--color-text-muted)', padding: 30, textAlign: 'center' }}>
                No stock lines added yet.
              </div>
            )}
          </section>
        </main>

        <aside
          className="panel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: 16,
            position: 'sticky',
            top: 16,
          }}
        >
          <div>
            <h2 style={{ color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 800 }}>
              Summary
            </h2>
          </div>
          <SummaryRow
            label="Vehicle"
            value={selectedVehicle ? vehicleLabel(selectedVehicle) : 'Not selected'}
          />
          {!isUnloading ? (
            <>
              <SummaryRow
                label="Delivery Run"
                value={
                  selectedDeliveryRun
                    ? `${selectedDeliveryRun.code} - ${selectedDeliveryRun.name}`
                    : 'Not selected'
                }
              />
              <SummaryRow label="Loading Date" value={loadingDate || 'Not selected'} mono />
            </>
          ) : (
            <>
              <SummaryRow
                label="Applied Loading"
                value={selectedVehicleLoading?.loadingNo || 'Not selected'}
                mono={Boolean(selectedVehicleLoading?.loadingNo)}
              />
              <SummaryRow label="Delivery Run" value={unloadingDeliveryRunLabel} />
              <SummaryRow label="Unloading Date" value={unloadingDate || 'Not selected'} mono />
            </>
          )}
          <SummaryRow label="Lines" value={lines.length} mono />
          {isUnloading ? (
            <>
              <SummaryRow label="Normal" value={normalCount} mono />
              <SummaryRow label="Labelled" value={labelledCount} mono />
            </>
          ) : (
            <SummaryRow label="Total Qty" value={formatNumber(totalQty)} mono />
          )}
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 8,
              color: 'var(--color-amber)',
              fontSize: 12,
              lineHeight: 1.5,
              padding: 12,
            }}
          >
            {isUnloading
              ? 'Labelled items will be flagged in main inventory. All stock moves from vehicle to main.'
              : 'Stock will permanently move from main inventory to vehicle on apply. Cannot be undone.'}
          </div>
          <button
            type="button"
            className="button-primary"
            disabled={
              !vehicleId ||
              (!isUnloading && (!deliveryRunId || !loadingDate)) ||
              (isUnloading && (!vehicleLoadingId || !unloadingDate)) ||
              !lines.length ||
              applyPending
            }
            onClick={handleApply}
            style={{ height: 42, marginTop: 'auto', width: '100%' }}
          >
            {applyPending
              ? 'Applying...'
              : isUnloading
                ? 'Unload to Main Inventory'
                : 'Load to Vehicle'}
          </button>
        </aside>
      </div>
      <ResumeDraftModal
        draft={resumeModalDraft}
        onResume={handleResumeDraft}
        onDiscard={handleDiscardResumeDraft}
        onClose={() => setResumeModalDraft(null)}
      />
    </div>
  )
}

function SummaryRow({ label, value, mono = false }) {
  return (
    <div
      style={{
        alignItems: 'center',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        fontSize: 12,
        justifyContent: 'space-between',
        paddingTop: 12,
      }}
    >
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span
        className={mono ? 'mono' : ''}
        style={{ color: 'var(--color-text-primary)', fontWeight: 700, textAlign: 'right' }}
      >
        {value}
      </span>
    </div>
  )
}
