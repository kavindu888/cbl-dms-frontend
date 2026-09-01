import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PackageSearch, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useApplyVehicleLoading,
  useApplyVehicleUnloading,
  useCreateVehicleLoading,
  useCreateVehicleUnloading,
  useVehicleLoading,
  useVehicleUnloading,
  useVehicles,
} from '@/hooks/useVehicle'
import { inventoryService } from '@/services/api/inventoryService'
import { masterService } from '@/services/api/masterService'
import { formatDate } from '@/utils/formatDate'
import { formatLKR } from '@/utils/formatCurrency'
import {
  calculateVehicleSellingPrice,
  calculateVehicleSellingValue,
  calculateVehicleUnitCostValue,
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
  const navigate = useNavigate()
  const { id: routeDraftId } = useParams()
  const queryClient = useQueryClient()
  const isEditingDraft = Boolean(routeDraftId)
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
  const [draftId, setDraftId] = useState(routeDraftId || '')
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
  const [isSoftRefreshingBatches, setIsSoftRefreshingBatches] = useState(false)
  const [isAddingLine, setIsAddingLine] = useState(false)
  const [batchRefreshToken, setBatchRefreshToken] = useState(0)
  const [deliveryRuns, setDeliveryRuns] = useState([])
  const [appliedLoadings, setAppliedLoadings] = useState([])
  const [hydrateLinesFromServer, setHydrateLinesFromServer] = useState(Boolean(routeDraftId))
  const skipResetForVehicleLoadingIdRef = useRef(null)
  const [allActiveBatches, setAllActiveBatches] = useState([])
  const [isLoadingAllBatches, setIsLoadingAllBatches] = useState(false)
  const [selectedRemainingIds, setSelectedRemainingIds] = useState(() => new Set())
  const [isBulkAdding, setIsBulkAdding] = useState(false)

  const { data: resumedLoading, isFetching: isFetchingLoading } = useVehicleLoading(
    !isUnloading && hydrateLinesFromServer ? draftId : undefined
  )
  const { data: resumedUnloading, isFetching: isFetchingUnloading } = useVehicleUnloading(
    isUnloading && hydrateLinesFromServer ? draftId : undefined
  )

  useEffect(() => {
    if (routeDraftId) {
      setDraftId(routeDraftId)
      setHydrateLinesFromServer(true)
    }
  }, [routeDraftId])

  useEffect(() => {
    const movement = isUnloading ? resumedUnloading : resumedLoading
    if (!hydrateLinesFromServer || !movement) return
    if (isAddingLine || (isUnloading ? isFetchingUnloading : isFetchingLoading)) return
    if (isUnloading) {
      skipResetForVehicleLoadingIdRef.current = movement.vehicleLoadingId || ''
      setVehicleLoadingId(movement.vehicleLoadingId || '')
      setUnloadingDate(String(movement.unloadingDate || '').slice(0, 10) || todayInputValue())
    } else {
      setVehicleId(movement.vehicleLocationId || '')
      setDeliveryRunId(movement.deliveryRunId || '')
      setLoadingDate(String(movement.loadingDate || '').slice(0, 10) || todayInputValue())
    }
    setNotes(movement.notes || '')
    setLines(
      (movement.lines || []).map((line) => ({
        id: line.id,
        productId: line.productId,
        // The loading/unloading line DTO doesn't carry a product name (only sku/id) — resolved
        // against the loaded product catalog at render time instead, see resolveLineProductName.
        productName: line.productName || '',
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
  }, [
    hydrateLinesFromServer,
    isAddingLine,
    isFetchingLoading,
    isFetchingUnloading,
    isUnloading,
    resumedLoading,
    resumedUnloading,
  ])

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
    if (!isUnloading) return undefined

    let active = true
    async function loadAllActiveBatches() {
      setIsLoadingAllBatches(true)
      try {
        const rows = await inventoryService.listActiveStockBatches()
        if (active) setAllActiveBatches(rows || [])
      } catch (error) {
        if (active) {
          setAllActiveBatches([])
          toast.error(error.message || 'Unable to load vehicle stock.')
        }
      } finally {
        if (active) setIsLoadingAllBatches(false)
      }
    }
    loadAllActiveBatches()

    return () => {
      active = false
    }
  }, [isUnloading, batchRefreshToken])

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
  }, [appliedLoadings, isUnloading, selectedProductId, vehicleId, vehicleLoadingId, batchRefreshToken])

  // Manual + periodic refresh that only updates the numbers — unlike the effect above, this never
  // resets selectedBatchId/qty, so it's safe to call while the user has a batch picked and is mid-way
  // through typing a quantity. Lets staff see another concurrent user's reservation/deduction show up
  // without losing their in-progress input.
  // Uses its own loading flag (not isLoadingBatches) so this background/periodic refresh doesn't
  // blank the table's rows out to a "Loading batches..." row every 15s — that flag is reserved for
  // the initial fetch, where replacing the table is expected.
  async function refreshBatches() {
    if (!selectedProductId || (isUnloading && !vehicleId)) return
    setIsSoftRefreshingBatches(true)
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
          ? availableRows.filter((batch) => String(batch.batchNo || '').startsWith(loadingBatchPrefix))
          : availableRows
      setBatches(scopedRows)
    } catch (error) {
      toast.error(error.message || 'Unable to refresh batches.')
    } finally {
      setIsSoftRefreshingBatches(false)
    }
  }

  async function refreshAllActiveBatches() {
    if (!isUnloading) return
    try {
      const rows = await inventoryService.listActiveStockBatches()
      setAllActiveBatches(rows || [])
    } catch {
      /* Keep showing the last known list on a transient refresh failure. */
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      refreshBatches()
      refreshAllActiveBatches()
    }, 15000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnloading, selectedProductId, vehicleId, vehicleLoadingId, appliedLoadings])

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
    setSelectedRemainingIds(new Set())
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
  // Repeated unloading creates a fresh batch each time, so the same product/MRP fragments into
  // many near-identical rows (same price, different batch no). Group by MRP for picking — a
  // group's "Free Qty" is the sum across its batches, and adding a line draws across them (FEFO
  // by expiry) until the requested quantity is covered, so the picker acts like one combined
  // batch even though each resulting stock line still references its real source batch.
  const groupedBatches = useMemo(() => {
    const groups = new Map()
    for (const batch of batches) {
      const key = Number(getMrp(batch)).toFixed(2)
      if (!groups.has(key)) groups.set(key, { mrp: getMrp(batch), batches: [] })
      groups.get(key).batches.push(batch)
    }
    return Array.from(groups.entries())
      .map(([key, group]) => {
        const available = group.batches.reduce((sum, b) => sum + getQtyAvailable(b), 0)
        const reserved = group.batches.reduce((sum, b) => sum + getQtyReserved(b), 0)
        const free = group.batches.reduce((sum, b) => sum + getQtyFree(b), 0)
        const costs = new Set(group.batches.map((b) => getUnitCost(b)))
        const expiry = group.batches.reduce(
          (earliest, b) =>
            b.expiryDate && (!earliest || new Date(b.expiryDate) < new Date(earliest))
              ? b.expiryDate
              : earliest,
          null
        )
        return {
          id: `mrp-${key}`,
          batchNo:
            group.batches.length > 1
              ? `${group.batches.length} batches`
              : group.batches[0].batchNo,
          batchNos: group.batches.map((b) => b.batchNo).join(', '),
          qtyAvailable: available,
          qtyReserved: reserved,
          sellableQty: free,
          unitCostSmallest: costs.size === 1 ? [...costs][0] : null,
          unitCostVaries: costs.size > 1,
          mrp: group.mrp,
          expiryDate: expiry,
          batches: group.batches,
        }
      })
      .sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''))
  }, [batches])
  const selectedBatch = groupedBatches.find((group) => group.id === selectedBatchId)
  const productById = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, product])),
    [products]
  )
  const productBySku = useMemo(
    () => Object.fromEntries(products.map((product) => [product.sku, product])),
    [products]
  )
  function resolveLineProductName(line) {
    return (
      line.productName ||
      (line.productId && productById[line.productId]?.name) ||
      productBySku[line.productSku]?.name ||
      line.productSku
    )
  }
  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    if (!term) return products.slice(0, 30)
    return products
      .filter((product) =>
        `${product.name} ${product.sku} ${product.barcode || ''}`.toLowerCase().includes(term)
      )
      .slice(0, 30)
  }, [productSearch, products])

  const remainingVehicleItems = useMemo(() => {
    if (!isUnloading || !vehicleId) return []

    const loadingBatchPrefix = selectedVehicleLoading?.loadingNo
      ? `VL-${selectedVehicleLoading.loadingNo}-`
      : ''
    const addedBatchNos = new Set(lines.map((line) => line.sourceBatchNo).filter(Boolean))

    return allActiveBatches
      .filter((batch) => batch.stockLocationId === vehicleId)
      .filter((batch) => getQtyAvailable(batch) > 0)
      .filter((batch) =>
        loadingBatchPrefix ? String(batch.batchNo || '').startsWith(loadingBatchPrefix) : true
      )
      .filter((batch) => !addedBatchNos.has(batch.batchNo))
      .map((batch) => ({
        ...batch,
        productName: products.find((product) => product.id === batch.productId)?.name || batch.productSku,
      }))
      .sort((a, b) => (a.productName || '').localeCompare(b.productName || ''))
  }, [isUnloading, vehicleId, allActiveBatches, selectedVehicleLoading, lines, products])

  const allRemainingSelected =
    remainingVehicleItems.length > 0 &&
    remainingVehicleItems.every((item) => selectedRemainingIds.has(item.id))

  function toggleSelectAllRemaining() {
    setSelectedRemainingIds(
      allRemainingSelected ? new Set() : new Set(remainingVehicleItems.map((item) => item.id))
    )
  }

  function toggleRemainingItem(id) {
    setSelectedRemainingIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalQty = lines.reduce((sum, line) => sum + Number(line.qtySmallest || 0), 0)
  const totalSellingValue = lines.reduce(
    (sum, line) =>
      sum + calculateVehicleSellingValue(line.unitCostSmallest, line.qtySmallest),
    0
  )
  const totalUnitCostValue = lines.reduce(
    (sum, line) =>
      sum + calculateVehicleUnitCostValue(line.unitCostSmallest, line.qtySmallest),
    0
  )
  const normalCount = lines.filter(
    (line) => unloadingTypeLabel(line.unloadingType) === 'Normal'
  ).length
  const labelledCount = lines.length - normalCount

  function invalidateMovementQueries(id = draftId) {
    const movementKey = isUnloading ? 'vehicle-unloadings' : 'vehicle-loadings'
    queryClient.invalidateQueries({ queryKey: ['inventory', movementKey] })
    if (id) queryClient.invalidateQueries({ queryKey: ['inventory', movementKey, id] })
    queryClient.invalidateQueries({ queryKey: ['inventory', 'stock'] })
  }

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
    navigate(`${basePath}/${id}/edit`, { replace: true })
    return id
  }

  async function handleAddLine() {
    if (!selectedVehicle || !selectedProduct || !selectedBatch)
      return toast.error('Select a vehicle, product, and batch first.')
    const requestedQty = Number(qty)
    if (requestedQty <= 0) return toast.error('Enter a quantity greater than zero.')
    if (requestedQty > getQtyFree(selectedBatch))
      return toast.error('Quantity cannot exceed sellable (available minus reserved) batch quantity.')
    if (isUnloading && unloadingType === 2 && !returnReason)
      return toast.error('Labelled unloading requires a return reason.')

    setIsAddingLine(true)
    try {
      const id = await ensureDraft()

      // The picker shows one merged row per MRP, but each backend line still needs a single real
      // batch — draw across the group's underlying batches (soonest-expiry first) until the
      // requested quantity is covered. Each resulting line keeps its own batch's true cost/MRP.
      const sortedBatches = [...selectedBatch.batches].sort((a, b) => {
        if (!a.expiryDate) return 1
        if (!b.expiryDate) return -1
        return new Date(a.expiryDate) - new Date(b.expiryDate)
      })

      let remaining = requestedQty
      const addedLines = []
      let anyFailed = false
      for (const batch of sortedBatches) {
        if (remaining <= 0) break
        const drawQty = Math.min(remaining, getQtyFree(batch))
        if (drawQty <= 0) continue

        const payload = {
          productId: selectedProduct.id,
          productSku: selectedProduct.sku,
          sourceBatchId: batch.id,
          qtySmallest: drawQty,
          ...(isUnloading
            ? { unloadingType, returnReason: unloadingType === 2 ? Number(returnReason) : null }
            : {}),
        }
        try {
          const result = isUnloading
            ? await inventoryService.addVehicleUnloadingLine(id, payload)
            : await inventoryService.addVehicleLoadingLine(id, payload)
          const lineId = resultId(result) || `${batch.id}-${Date.now()}`
          addedLines.push({
            id: lineId,
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            productSku: selectedProduct.sku,
            sourceBatchNo: batch.batchNo,
            qtySmallest: drawQty,
            unitCostSmallest: getUnitCost(batch),
            mrp: getMrp(batch),
            unloadingType,
            returnReason: unloadingType === 2 ? Number(returnReason) : null,
          })
          remaining -= drawQty
        } catch (batchError) {
          anyFailed = true
          toast.error(
            `${batch.batchNo || 'A batch'}: ${batchError.message || 'failed to add.'}`,
            { duration: 8000 }
          )
        }
      }

      if (addedLines.length) {
        setLines((current) => [...current, ...addedLines])
        setHydrateLinesFromServer(false)
        invalidateMovementQueries(id)
      }

      if (addedLines.length && !anyFailed && remaining <= 0) {
        toast.success(
          addedLines.length > 1
            ? `Added across ${addedLines.length} batches.`
            : isUnloading
              ? 'Unloading line added.'
              : 'Stock line added.'
        )
      } else if (addedLines.length && remaining > 0) {
        toast.warning(
          `Only ${formatNumber(requestedQty - remaining)} of ${formatNumber(requestedQty)} could be added — refresh and try the rest again.`
        )
      } else if (!addedLines.length) {
        toast.error(`Unable to add ${kind.toLowerCase()} line.`)
      }

      setSelectedBatchId('')
      setQty('')
      setReturnReason('')
      setUnloadingType(1)
      setBatchRefreshToken((token) => token + 1)
    } catch (error) {
      toast.error(error.message || `Unable to add ${kind.toLowerCase()} line.`)
    } finally {
      setIsAddingLine(false)
    }
  }

  async function handleBulkAddRemaining() {
    if (!selectedRemainingIds.size) return toast.error('Select at least one item to unload.')

    setIsBulkAdding(true)
    let succeeded = 0
    let failed = 0
    try {
      const id = await ensureDraft()
      const itemsToAdd = remainingVehicleItems.filter((item) => selectedRemainingIds.has(item.id))
      const newLines = []

      for (const batch of itemsToAdd) {
        // Sellable, not full available — a batch that's partly reserved for a pending sales order
        // must not have that reserved portion swept up in a bulk unload.
        const requestedQty = getQtyFree(batch)
        if (requestedQty <= 0) continue

        try {
          const payload = {
            productId: batch.productId,
            productSku: batch.productSku,
            sourceBatchId: batch.id,
            qtySmallest: requestedQty,
            unloadingType: 1,
            returnReason: null,
          }
          const result = await inventoryService.addVehicleUnloadingLine(id, payload)
          const lineId = resultId(result) || `${batch.id}-${Date.now()}`
          newLines.push({
            id: lineId,
            productId: batch.productId,
            productName: batch.productName,
            productSku: batch.productSku,
            sourceBatchNo: batch.batchNo,
            qtySmallest: requestedQty,
            unitCostSmallest: getUnitCost(batch),
            mrp: getMrp(batch),
            unloadingType: 1,
            returnReason: null,
          })
          succeeded += 1
        } catch {
          failed += 1
        }
      }

      if (newLines.length) {
        setLines((current) => [...current, ...newLines])
        setHydrateLinesFromServer(false)
        invalidateMovementQueries(id)
      }
      setSelectedRemainingIds(new Set())
      setBatchRefreshToken((token) => token + 1)

      if (succeeded && !failed) {
        toast.success(`Added ${succeeded} line${succeeded === 1 ? '' : 's'} for unloading.`)
      } else if (succeeded && failed) {
        toast.warning(`Added ${succeeded} line${succeeded === 1 ? '' : 's'}, ${failed} failed — try those again.`)
      } else {
        toast.error('Unable to add the selected lines.')
      }
    } catch (error) {
      toast.error(error.message || 'Unable to unload selected items.')
    } finally {
      setIsBulkAdding(false)
    }
  }

  async function handleRemoveLine(lineId) {
    try {
      if (isUnloading) await inventoryService.removeVehicleUnloadingLine(draftId, lineId)
      else await inventoryService.removeVehicleLoadingLine(draftId, lineId)
      setLines((current) => current.filter((line) => line.id !== lineId))
      invalidateMovementQueries(draftId)
      toast.success('Stock line removed.')
      setBatchRefreshToken((token) => token + 1)
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
            {isEditingDraft ? 'Edit Draft Vehicle' : 'New Vehicle'} {kind}
          </h1>
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

          {isUnloading ? (
            <section className="panel" style={{ padding: 16 }}>
              <div
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 800 }}>
                    Remaining Items in Vehicle
                  </h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>
                    Everything still loaded on this vehicle from this loading. Select what to unload,
                    or select all, instead of searching one by one.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={refreshAllActiveBatches}
                    title="Refresh stock availability"
                    style={{ height: 32, whiteSpace: 'nowrap' }}
                  >
                    Refresh
                  </button>
                  {remainingVehicleItems.length ? (
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={toggleSelectAllRemaining}
                      style={{ height: 32, whiteSpace: 'nowrap' }}
                    >
                      {allRemainingSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto" style={{ marginTop: 14 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}></th>
                      <th>Product</th>
                      <th>Batch No</th>
                      <th className="text-right">Available Qty</th>
                      <th className="text-right">Reserved Qty</th>
                      <th className="text-right">Unit Cost</th>
                      <th className="text-right">MRP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!vehicleId ? (
                      <tr>
                        <td colSpan={7}>Select an applied loading first.</td>
                      </tr>
                    ) : isLoadingAllBatches ? (
                      <tr>
                        <td colSpan={7}>Loading vehicle stock...</td>
                      </tr>
                    ) : remainingVehicleItems.length ? (
                      remainingVehicleItems.map((item) => (
                        <tr
                          key={item.id}
                          style={{
                            boxShadow: selectedRemainingIds.has(item.id)
                              ? 'inset 3px 0 var(--color-teal)'
                              : 'none',
                          }}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedRemainingIds.has(item.id)}
                              onChange={() => toggleRemainingItem(item.id)}
                            />
                          </td>
                          <td>
                            <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>
                              {item.productName}
                            </strong>
                            <span className="product-sku-badge mono">{item.productSku}</span>
                          </td>
                          <td className="mono">{item.batchNo || '—'}</td>
                          <td className="mono text-right">{formatNumber(getQtyAvailable(item))}</td>
                          <td
                            className="mono text-right"
                            style={{
                              color: getQtyReserved(item) ? 'var(--color-amber)' : 'var(--color-text-muted)',
                            }}
                          >
                            {formatNumber(getQtyReserved(item))}
                          </td>
                          <td className="mono text-right">{formatLKR(getUnitCost(item))}</td>
                          <td className="mono text-right">{formatLKR(getMrp(item))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7}>
                          Nothing left in this vehicle for this loading — everything has already
                          been unloaded or added below.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p style={{ color: 'var(--color-text-dim)', fontSize: 11, marginTop: 8 }}>
                Bulk-adding unloads the sellable quantity (available minus reserved) so a batch
                reserved for a pending sales order isn't pulled off the vehicle.
              </p>

              {remainingVehicleItems.length ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button
                    type="button"
                    className="button-primary"
                    disabled={!selectedRemainingIds.size || isBulkAdding}
                    onClick={handleBulkAddRemaining}
                    style={{ height: 38 }}
                  >
                    {isBulkAdding
                      ? 'Adding...'
                      : selectedRemainingIds.size
                        ? `Add ${selectedRemainingIds.size} Selected Line${selectedRemainingIds.size === 1 ? '' : 's'}`
                        : 'Add Selected Lines'}
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

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
                  <div
                    style={{
                      alignItems: 'center',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginBottom: 8,
                    }}
                  >
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={refreshBatches}
                      disabled={isLoadingBatches || isSoftRefreshingBatches}
                      title="Refresh stock availability"
                      style={{ height: 28, fontSize: 12 }}
                    >
                      Refresh
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
                          <th className="text-right">Reserved Qty</th>
                          <th className="text-right">Free Qty</th>
                          <th className="text-right">Unit Cost</th>
                          <th className="text-right">MRP</th>
                          <th>Expiry</th>
                          <th className="text-right">Select</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingBatches ? (
                          <tr>
                            <td colSpan={8}>Loading batches...</td>
                          </tr>
                        ) : groupedBatches.length ? (
                          groupedBatches.map((group) => (
                            <tr
                              key={group.id}
                              style={{
                                boxShadow:
                                  selectedBatchId === group.id
                                    ? 'inset 3px 0 var(--color-teal)'
                                    : 'none',
                              }}
                            >
                              <td className="mono" title={group.batchNos}>
                                {group.batchNo || '—'}
                              </td>
                              <td className="mono text-right">
                                {formatNumber(getQtyAvailable(group))}
                              </td>
                              <td
                                className="mono text-right"
                                style={{
                                  color: getQtyReserved(group)
                                    ? 'var(--color-amber)'
                                    : 'var(--color-text-muted)',
                                }}
                              >
                                {formatNumber(getQtyReserved(group))}
                              </td>
                              <td
                                className="mono text-right"
                                style={{ color: 'var(--color-teal)' }}
                              >
                                {formatNumber(getQtyFree(group))}
                              </td>
                              <td className="mono text-right">
                                {group.unitCostVaries ? 'Varies' : formatLKR(getUnitCost(group))}
                              </td>
                              <td className="mono text-right">{formatLKR(getMrp(group))}</td>
                              <td className="mono">{formatDate(group.expiryDate)}</td>
                              <td className="text-right">
                                <button
                                  type="button"
                                  className={
                                    selectedBatchId === group.id
                                      ? 'button-primary'
                                      : 'button-secondary'
                                  }
                                  onClick={() => setSelectedBatchId(group.id)}
                                  style={{ height: 30 }}
                                >
                                  Select
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8}>
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
                      max={getQtyFree(selectedBatch)}
                      value={qty}
                      onChange={(event) => setQty(event.target.value)}
                    />
                    <small className="mono" style={{ color: 'var(--color-text-muted)' }}>
                      Available: {formatNumber(getQtyAvailable(selectedBatch))} | Reserved:{' '}
                      {formatNumber(getQtyReserved(selectedBatch))} | Free:{' '}
                      {formatNumber(getQtyFree(selectedBatch))}
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
                <table className="data-table" style={{ minWidth: 1100 }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit Cost</th>
                      <th className="text-right">Selling Price</th>
                      <th className="text-right">MRP</th>
                      <th className="text-right">Selling Value</th>
                      <th className="text-right">Unit Cost Value</th>
                      <th className="text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>
                            {resolveLineProductName(line)}
                          </strong>
                          <span className="product-sku-badge mono">{line.productSku}</span>
                          {isUnloading ? (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${unloadingTypeLabel(line.unloadingType) === 'Labelled' ? 'border-amber-700/50 bg-amber-500/10 text-amber-400' : 'border-gray-700 bg-gray-800 text-gray-300'}`}
                              style={{ display: 'inline-flex', marginLeft: 6 }}
                              title={returnReasonLabel(line.returnReason)}
                            >
                              {unloadingTypeLabel(line.unloadingType).toUpperCase()}
                            </span>
                          ) : null}
                        </td>
                        <td className="mono text-right">{formatNumber(line.qtySmallest)}</td>
                        <td className="mono text-right">{formatLKR(line.unitCostSmallest)}</td>
                        <td className="mono text-right">
                          {formatLKR(calculateVehicleSellingPrice(line.unitCostSmallest))}
                        </td>
                        <td className="mono text-right">{formatLKR(line.mrp)}</td>
                        <td className="mono text-right">
                          {formatLKR(
                            calculateVehicleSellingValue(
                              line.unitCostSmallest,
                              line.qtySmallest
                            )
                          )}
                        </td>
                        <td className="mono text-right">
                          {formatLKR(
                            calculateVehicleUnitCostValue(
                              line.unitCostSmallest,
                              line.qtySmallest
                            )
                          )}
                        </td>
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
          <SummaryRow
            label="Total Selling Value"
            value={formatLKR(totalSellingValue)}
            mono
          />
          <SummaryRow
            label="Total Unit Cost Value"
            value={formatLKR(totalUnitCostValue)}
            mono
          />
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
