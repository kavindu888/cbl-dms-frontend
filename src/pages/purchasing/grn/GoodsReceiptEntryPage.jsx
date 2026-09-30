import dayjs from 'dayjs'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Package,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import ProductSearchSelect from '@components/ui/ProductSearchSelect'
import { masterService } from '@services/api/masterService'
import { createReceiptLine, loadReceiptLines, saveReceiptLines } from './grnWorkspace'
import { purchasingService } from '@services/api/purchasingService'
import { inventoryService } from '@services/api/inventoryService'
import { GrnStatus, PurchaseOrderStatus } from '@/types/purchasing.types'
import { formatDate } from '@/utils'
import { useLocation, useNavigate } from 'react-router-dom'

const orderPageSize = 3
const itemPageSize = 5
const defaultGrnVatRate = 18

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function SelectChevron() {
  return (
    <div
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--color-text-dim)',
      }}
    >
      <svg style={{ width: 14, height: 14, fill: 'currentColor' }} viewBox="0 0 20 20">
        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
      </svg>
    </div>
  )
}

function getStatusText(status, grnQueueStatus = '') {
  if (grnQueueStatus === 'Draft') return 'Draft'

  const statusNumber = Number(status)

  if (statusNumber === PurchaseOrderStatus.PartiallyReceived) return 'Partially Received'
  if (statusNumber === PurchaseOrderStatus.Approved) return 'Approved'
  return 'Receivable'
}

function getStatusColor(status, grnQueueStatus = '') {
  if (grnQueueStatus === 'Draft') return 'var(--color-text-muted)'

  return Number(status) === PurchaseOrderStatus.PartiallyReceived
    ? 'var(--color-amber)'
    : 'var(--color-green)'
}

function getLifoDate(order) {
  return dayjs(order.createdAt || order.orderDate)
}

function today() {
  return dayjs().format('YYYY-MM-DD')
}

function toNumber(value) {
  const number = parseFloat(value)
  return Number.isFinite(number) ? number : 0
}

function toIsoDate(value, includeTime = false) {
  if (!value) return null
  let d = dayjs(value)
  if (includeTime) {
    const now = dayjs()
    d = d.hour(now.hour()).minute(now.minute()).second(now.second()).millisecond(now.millisecond())
  }
  return d.toISOString()
}

function normalizeText(value) {
  const text = String(value || '').trim()
  return text || null
}

function getReceiptPurchaseOrderId(receipt) {
  return receipt?.purchaseOrderId || receipt?.poId || receipt?.purchaseOrder?.id || ''
}

async function ensureReceiptPurchaseOrderIds(receipts) {
  return Promise.all(
    (receipts || []).map(async (receipt) => {
      if (getReceiptPurchaseOrderId(receipt)) return receipt

      try {
        return await purchasingService.getGoodsReceipt(receipt.id)
      } catch (requestError) {
        console.error('Unable to load GRN detail for PO filtering:', requestError)
        return receipt
      }
    })
  )
}

function estimateReceiptLineSubtotal(line) {
  return (
    toNumber(line.qtyBaseUnit) *
    toNumber(line.qtyPerBaseUnit || 1) *
    toNumber(line.unitCostSmallest)
  )
}

function getAcceptedQty(line) {
  return toNumber(line.qtyBaseUnit) - toNumber(line.rejectedQtyBase)
}

function getReceiptLineError(line) {
  const qtyBaseUnit = toNumber(line.qtyBaseUnit)

  if (!line.productId) return 'Select a product or remove the empty row.'
  if (!Number.isFinite(Number(line.qtyBaseUnit)))
    return `${line.productSku}: enter a valid quantity.`
  if (!Number.isFinite(Number(line.unitCostSmallest)) || Number(line.unitCostSmallest) < 0)
    return `${line.productSku}: enter a valid unit cost.`
  if (!Number.isFinite(Number(line.mrp)) || Number(line.mrp) < 0)
    return `${line.productSku}: enter a valid MRP.`
  if (qtyBaseUnit < 0) return `${line.productSku}: received quantity cannot be negative.`
  if (line.purchaseOrderLineId && getAcceptedQty(line) > toNumber(line.remainingQty)) {
    return `${line.productSku}: received quantity cannot exceed remaining quantity.`
  }

  return ''
}

function createEmptyReceiptLine() {
  return {
    key: crypto.randomUUID(),
    isNewRow: true,
    grnLineId: '',
    purchaseOrderLineId: null,
    productId: '',
    productSku: '',
    productName: '',
    qtyBaseUnit: 1,
    qtyPerBaseUnit: 1,
    baseUomCode: '',
    smallestUomCode: '',
    unitCostSmallest: 0,
    mrp: 0,
    remainingQty: null,
    expiryDate: '',
    notes: '',
    rejectedQtyBase: 0,
  }
}

function getReceiptLinePayload(line) {
  return {
    purchaseOrderLineId: line.purchaseOrderLineId,
    productId: line.productId,
    productSku: line.productSku,
    productName: line.productName,
    qtyBaseUnit: toNumber(line.qtyBaseUnit),
    unitCostSmallest: toNumber(line.unitCostSmallest),
    mrp: toNumber(line.mrp),
    rejectedQtyBase: toNumber(line.rejectedQtyBase),
    rejectionReason: line.rejectionReason || null,
    batchNo: line.batchNo || null,
    expiryDate: toIsoDate(line.expiryDate),
    notes: normalizeText(line.notes),
  }
}

function getReceiptHeaderPayload(selectedOrder, receiptHeader) {
  return {
    purchaseOrderId: selectedOrder.id,
    receiptDate: toIsoDate(receiptHeader.receiptDate, true),
    discount: toNumber(receiptHeader.discount),
    supplierInvoiceNo: normalizeText(receiptHeader.supplierInvoiceNo),
    notes: normalizeText(receiptHeader.notes),
    adjustmentAmount: toNumber(receiptHeader.adjustmentAmount),
  }
}

export default function GoodsReceiptEntryPage({ detailOnly = false, entryPoId = '' }) {
  const grnMode = true
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [orders, setOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'))
  const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [supplier, setSupplier] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSubmittingGrn, setIsSubmittingGrn] = useState(false)
  const [draftReceipt, setDraftReceipt] = useState(null)
  const [pendingReceipt, setPendingReceipt] = useState(null)
  const [receiptHeader, setReceiptHeader] = useState({
    receiptDate: today(),
    supplierInvoiceNo: '',
    discount: 0,
    notes: '',
    adjustmentAmount: 0,
  })
  const [receiptLines, setReceiptLines] = useState([])
  const [removedLineIds, setRemovedLineIds] = useState([])
  const [products, setProducts] = useState([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [selectingProductKey, setSelectingProductKey] = useState('')
  const workspaceVersion = useRef(0)
  const [orderPage, setOrderPage] = useState(1)
  const [itemPage, setItemPage] = useState(1)

  const location = useLocation()
  const preselectedPoId = entryPoId || location.state?.preselectedPoId
  const preselectedGrnId = location.state?.preselectedGrnId

  function resetReceiptWorkspace() {
    setSelectedId(null)
    setSelectedOrder(null)
    setReceiptHeader({
      receiptDate: today(),
      supplierInvoiceNo: '',
      discount: 0,
      notes: '',
      adjustmentAmount: 0,
    })
    setReceiptLines([])
    setRemovedLineIds([])
    workspaceVersion.current += 1
    setDraftReceipt(null)
    setPendingReceipt(null)
    setItemPage(1)
  }

  useEffect(() => {
    if (preselectedPoId) {
      setSelectedId(preselectedPoId)
    }
  }, [preselectedPoId])

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const result = await purchasingService.listSuppliers({ page: 1, pageSize: 100, status: 1 })
        setSuppliers(result?.items || [])
      } catch (requestError) {
        console.error('Failed to load suppliers:', requestError)
      }
    }

    loadSuppliers()
  }, [])

  const loadPurchaseOrders = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      if (grnMode) {
        const [approvedResult, partialResult, draftGrnResult, pendingGrnResult] = await Promise.all(
          [
            purchasingService.listPurchaseOrders({
              page: 1,
              pageSize: 100,
              status: PurchaseOrderStatus.Approved,
            }),
            purchasingService.listPurchaseOrders({
              page: 1,
              pageSize: 100,
              status: PurchaseOrderStatus.PartiallyReceived,
            }),
            purchasingService.listGoodsReceipts({
              page: 1,
              pageSize: 100,
              status: GrnStatus.Draft,
            }),
            purchasingService.listGoodsReceipts({
              page: 1,
              pageSize: 100,
              status: GrnStatus.Received,
            }),
          ]
        )

        const [draftReceipts, pendingReceipts] = await Promise.all([
          ensureReceiptPurchaseOrderIds(draftGrnResult?.items || []),
          ensureReceiptPurchaseOrderIds(pendingGrnResult?.items || []),
        ])

        const draftReceiptsByPoId = new Map(
          draftReceipts
            .map((receipt) => [getReceiptPurchaseOrderId(receipt), receipt])
            .filter(([purchaseOrderId]) => Boolean(purchaseOrderId))
        )
        const draftGrnPoIds = new Set(draftReceiptsByPoId.keys())
        const pendingGrnPoIds = new Set(
          pendingReceipts.map(getReceiptPurchaseOrderId).filter(Boolean)
        )
        const ordersById = new Map(
          [...(approvedResult?.items || []), ...(partialResult?.items || [])].map((order) => [
            order.id,
            order,
          ])
        )
        const missingDraftPoIds = [...draftGrnPoIds].filter((id) => !ordersById.has(id))
        const missingDraftOrders = await Promise.all(
          missingDraftPoIds.map(async (id) => {
            try {
              return await purchasingService.getPurchaseOrder(id)
            } catch (requestError) {
              console.error('Unable to load draft GRN purchase order:', requestError)
              return null
            }
          })
        )

        missingDraftOrders.filter(Boolean).forEach((order) => ordersById.set(order.id, order))

        setOrders(
          [...ordersById.values()]
            .filter((order) => !pendingGrnPoIds.has(order.id))
            .map((order) => {
              const draftReceipt = draftReceiptsByPoId.get(order.id)

              return {
                ...order,
                grnQueueStatus: draftReceipt ? 'Draft' : null,
                grnQueueDate: draftReceipt?.receiptDate || draftReceipt?.createdAt || null,
              }
            })
        )
        return
      }

      const result = await purchasingService.listPurchaseOrders({
        page: 1,
        pageSize: 100,
        status: PurchaseOrderStatus.Approved,
      })
      setOrders(result?.items || [])
    } catch (requestError) {
      setError(requestError.message)
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [grnMode])

  useEffect(() => {
    loadPurchaseOrders()
  }, [loadPurchaseOrders])

  useEffect(() => {
    const version = ++workspaceVersion.current
    setRemovedLineIds([])
    if (!selectedId) {
      setSelectedOrder(null)
      setReceiptHeader({
        receiptDate: today(),
        supplierInvoiceNo: '',
        discount: 0,
        notes: '',
        adjustmentAmount: 0,
      })
      setReceiptLines([])
      setDraftReceipt(null)
      setPendingReceipt(null)
      return
    }

    async function loadOrderDetail() {
      setIsLoadingDetail(true)
      try {
        const detail = await purchasingService.getPurchaseOrder(selectedId)
        setSelectedOrder(detail)
        setReceiptHeader({
          receiptDate: today(),
          supplierInvoiceNo: '',
          discount: 0,
          notes: '',
          adjustmentAmount: 0,
        })
        let draft = null
        let pending = null

        if (grnMode) {
          if (preselectedGrnId) {
            const receipt = await purchasingService.getGoodsReceipt(preselectedGrnId)
            if (Number(receipt.status) === Number(GrnStatus.Draft)) draft = receipt
            if (Number(receipt.status) === Number(GrnStatus.Received)) pending = receipt
          } else {
            const result = await purchasingService.listGoodsReceipts({
              page: 1,
              pageSize: 100,
              poId: selectedId,
            })
            const receipts = result?.items || []
            const openReceipt = receipts.find((receipt) =>
              [GrnStatus.Draft, GrnStatus.Received].includes(Number(receipt.status))
            )

            if (Number(openReceipt?.status) === Number(GrnStatus.Draft)) {
              draft = await purchasingService.getGoodsReceipt(openReceipt.id)
            }
            if (Number(openReceipt?.status) === Number(GrnStatus.Received)) {
              pending = openReceipt
            }
          }
        }

        if (pending) {
          setSelectedId(null)
          setSelectedOrder(null)
          setDraftReceipt(null)
          setPendingReceipt(null)
          setReceiptLines([])
          await loadPurchaseOrders()
          return
        }

        if (version !== workspaceVersion.current) return
        setDraftReceipt(draft)
        setPendingReceipt(pending)
        setReceiptHeader({
          receiptDate: draft?.receiptDate ? dayjs(draft.receiptDate).format('YYYY-MM-DD') : today(),
          supplierInvoiceNo: draft?.supplierInvoiceNo || '',
          discount: draft?.discount || 0,
          notes: draft?.notes || '',
          adjustmentAmount: draft?.adjustmentAmount || 0,
        })

        const initialLines = loadReceiptLines(detail, draft)
        setReceiptLines(initialLines)

        initialLines.forEach((line) => {
          const cost = Number(line.unitCostSmallest || 0)
          const mrp = Number(line.mrp || 0)
          if (cost <= 0 || mrp <= 0) {
            inventoryService
              .getLastPrices(line.productId)
              .then((prices) => {
                if (prices && version === workspaceVersion.current) {
                  setReceiptLines((prev) =>
                    prev.map((l) =>
                      l.key === line.key
                        ? {
                            ...l,
                            unitCostSmallest:
                              l.unitCostSmallest && Number(l.unitCostSmallest) > 0
                                ? l.unitCostSmallest
                                : prices.lastCost
                                  ? String(prices.lastCost)
                                  : l.unitCostSmallest,
                            mrp:
                              l.mrp && Number(l.mrp) > 0
                                ? l.mrp
                                : prices.lastMrp
                                  ? String(prices.lastMrp)
                                  : l.mrp,
                          }
                        : l
                    )
                  )
                }
              })
              .catch((err) => console.error('Error fetching last prices:', err))
          }
        })
      } catch (requestError) {
        toast.error(`Unable to load purchase order details: ${requestError.message}`)
        setSelectedOrder(null)
      } finally {
        setIsLoadingDetail(false)
      }
    }

    loadOrderDetail()
  }, [grnMode, loadPurchaseOrders, preselectedGrnId, selectedId])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = orders.filter((order) => {
      const orderDate = dayjs(order.grnQueueDate || order.orderDate).format('YYYY-MM-DD')
      const matchesSearch =
        !query ||
        order.poNumber?.toLowerCase().includes(query) ||
        order.supplierName?.toLowerCase().includes(query) ||
        order.supplierCode?.toLowerCase().includes(query)
      const matchesSupplier = !supplier || order.supplierId === supplier
      const matchesFrom = !fromDate || orderDate >= fromDate
      const matchesTo = !toDate || orderDate <= toDate

      return matchesSearch && matchesSupplier && matchesFrom && matchesTo
    })

    return [...filtered].sort((a, b) => {
      const dateA = getLifoDate(a)
      const dateB = getLifoDate(b)
      if (!dateA.isSame(dateB)) {
        return dateB.isAfter(dateA) ? 1 : -1
      }
      return b.poNumber.localeCompare(a.poNumber, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [fromDate, orders, search, supplier, toDate])

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize
    return filteredOrders.slice(start, start + orderPageSize)
  }, [filteredOrders, orderPage])

  const pagedItems = useMemo(() => {
    const lines = selectedOrder?.lines || []
    const start = (itemPage - 1) * itemPageSize
    return lines.slice(start, start + itemPageSize)
  }, [itemPage, selectedOrder])

  const pagedReceiptLines = useMemo(() => {
    const start = (itemPage - 1) * itemPageSize
    return receiptLines.slice(start, start + itemPageSize)
  }, [itemPage, receiptLines])

  const receiptTotals = useMemo(() => {
    const billTotal = receiptLines.reduce((sum, line) => sum + estimateReceiptLineSubtotal(line), 0)
    const discount = toNumber(receiptHeader.discount)
    const valueOfSupply = Math.max(billTotal - discount, 0)
    const vatRate =
      selectedOrder?.vatRate == null ? defaultGrnVatRate : toNumber(selectedOrder.vatRate)
    const vatAmount = Math.round(valueOfSupply * (vatRate / 100) * 100) / 100
    const adjustmentAmount = toNumber(receiptHeader.adjustmentAmount)

    return {
      billTotal,
      vatAmount,
      adjustmentAmount,
      netAmount: valueOfSupply + vatAmount + adjustmentAmount,
    }
  }, [receiptHeader.adjustmentAmount, receiptHeader.discount, receiptLines, selectedOrder])

  useEffect(() => {
    setOrderPage(1)
  }, [fromDate, search, supplier, toDate])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize))
    if (orderPage > totalPages) setOrderPage(totalPages)
  }, [filteredOrders.length, orderPage])

  useEffect(() => {
    setItemPage(1)
  }, [selectedId])

  useEffect(() => {
    setItemPage((page) =>
      Math.min(page, Math.max(1, Math.ceil(receiptLines.length / itemPageSize)))
    )
  }, [receiptLines.length])

  const productCandidates = useMemo(() => {
    const candidates = new Map(products.map((product) => [product.id, product]))
    for (const line of selectedOrder?.lines || []) {
      candidates.set(line.productId, {
        id: line.productId,
        sku: line.productSku,
        name: line.productName,
      })
    }
    return [...candidates.values()]
  }, [products, selectedOrder])

  async function loadProducts() {
    if (products.length || isLoadingProducts) return
    setIsLoadingProducts(true)
    try {
      const result = await masterService.listAllProducts({
        pageSize: 100,
        status: 'Active',
        sortBy: 'name',
        sortDir: 'asc',
      })
      setProducts(Array.isArray(result) ? result : result?.items || [])
    } catch (error) {
      toast.error(`Unable to load products: ${error.message}`)
    } finally {
      setIsLoadingProducts(false)
    }
  }

  function addReceiptLine() {
    const emptyLine = createEmptyReceiptLine()
    setReceiptLines((current) => {
      const next = [...current, emptyLine]
      setItemPage(Math.ceil(next.length / itemPageSize))
      return next
    })
    void loadProducts()
  }

  function productsForLine(lineKey) {
    const usedProductIds = new Set(
      receiptLines
        .filter((line) => line.key !== lineKey && line.productId)
        .map((line) => line.productId)
    )
    return productCandidates.filter((product) => {
      if (usedProductIds.has(product.id)) return false
      const poLines = selectedOrder?.lines?.filter((line) => line.productId === product.id) || []
      return !poLines.length || poLines.some((line) => Number(line.remainingQty) > 0)
    })
  }

  async function selectReceiptProduct(key, productId) {
    if (!productId) {
      setReceiptLines((current) =>
        current.map((line) =>
          line.key === key ? { ...createEmptyReceiptLine(), key, isNewRow: true } : line
        )
      )
      return
    }

    if (receiptLines.some((line) => line.key !== key && line.productId === productId)) {
      toast.error('This product is already included in the GRN.')
      return
    }

    const version = workspaceVersion.current
    setSelectingProductKey(key)
    try {
      const poLine = selectedOrder.lines?.find(
        (line) => line.productId === productId && Number(line.remainingQty) > 0
      )
      let row
      if (poLine) {
        row = { ...createReceiptLine(poLine), key, isNewRow: true }
      } else {
        const product = products.find((item) => item.id === productId)
        if (!product) throw new Error('Select an active product.')
        const [chain, prices] = await Promise.all([
          masterService.getProductUomChain(productId),
          inventoryService.getLastPrices(productId).catch(() => null),
        ])
        if (!chain) throw new Error('This product has no unit configuration.')
        row = {
          key,
          isNewRow: true,
          grnLineId: '',
          purchaseOrderLineId: null,
          productId,
          productSku: product.sku,
          productName: product.name,
          qtyBaseUnit: 1,
          qtyPerBaseUnit: Number(chain.baseToSmallest || 1),
          baseUomCode: chain.baseUomCode,
          smallestUomCode: chain.smallestUomCode,
          unitCostSmallest: prices?.lastCost ?? 0,
          mrp: prices?.lastMrp ?? 0,
          remainingQty: null,
          expiryDate: '',
          notes: '',
          rejectedQtyBase: 0,
        }
      }
      if (workspaceVersion.current !== version) return
      setReceiptLines((current) => current.map((line) => (line.key === key ? row : line)))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSelectingProductKey('')
    }
  }

  function removeReceiptLine(line) {
    if (line.grnLineId) setRemovedLineIds((current) => [...new Set([...current, line.grnLineId])])
    setReceiptLines((current) => current.filter((item) => item.key !== line.key))
  }

  function clearFilters() {
    setSearch('')
    setFromDate('')
    setToDate('')
    setSupplier('')
    setSelectedId(null)
  }

  function updateReceiptHeader(field, value) {
    const finalValue = ['supplierInvoiceNo', 'notes'].includes(field)
      ? String(value || '').replace(/[^a-zA-Z0-9\s-]/g, '')
      : value
    setReceiptHeader((current) => ({ ...current, [field]: finalValue }))
  }

  function updateReceiptLine(key, field, value) {
    const finalValue =
      field === 'rejectionReason' ? String(value || '').replace(/[^a-zA-Z0-9\s-]/g, '') : value
    setReceiptLines((current) =>
      current.map((line) => (line.key === key ? { ...line, [field]: finalValue } : line))
    )
  }

  function handleGrnFormSubmit(event) {
    event.preventDefault()
    if (!grnMode || isSubmittingGrn || pendingReceipt) return
    void submitGrn()
  }

  async function submitGrn() {
    if (!selectedOrder) return

    if (pendingReceipt) {
      toast.error(`${pendingReceipt.grNumber || 'This GRN'} is already submitted for verification.`)
      return
    }

    if (toNumber(receiptHeader.discount) < 0) {
      toast.error('Discount cannot be negative.')
      return
    }

    if (!normalizeText(receiptHeader.supplierInvoiceNo)) {
      toast.error('Supplier invoice number is required.')
      return
    }

    const linesToSave = receiptLines.filter(
      (line) => line.grnLineId || toNumber(line.qtyBaseUnit) > 0
    )
    const activeLines = linesToSave.filter((line) => toNumber(line.qtyBaseUnit) > 0)
    const validationError = receiptLines.map(getReceiptLineError).find(Boolean)

    if (validationError) {
      toast.error(validationError)
      return
    }

    if (!activeLines.length) {
      toast.error('Enter received quantity for at least one item.')
      return
    }

    setIsSubmittingGrn(true)
    try {
      let receipt = draftReceipt ? await purchasingService.getGoodsReceipt(draftReceipt.id) : null
      const headerPayload = getReceiptHeaderPayload(selectedOrder, receiptHeader)

      if (!receipt) {
        const result = await purchasingService.listGoodsReceipts({
          page: 1,
          pageSize: 100,
          poId: selectedOrder.id,
        })
        const receipts = result?.items || []
        const openReceipt = receipts.find((item) =>
          [GrnStatus.Draft, GrnStatus.Received].includes(Number(item.status))
        )

        if (Number(openReceipt?.status) === Number(GrnStatus.Received)) {
          toast.error(`${openReceipt.grNumber || 'A GRN'} is already submitted for verification.`)
          return
        }

        if (Number(openReceipt?.status) === Number(GrnStatus.Draft)) {
          receipt = await purchasingService.getGoodsReceipt(openReceipt.id)
        }
      }

      if (receipt && Number(receipt.status) !== Number(GrnStatus.Draft)) {
        throw new Error(
          'This GRN is no longer a draft. Reload the page to view its current status.'
        )
      }
      receipt = receipt
        ? await purchasingService.updateGoodsReceiptHeader(receipt.id, headerPayload)
        : await purchasingService.createGoodsReceipt(headerPayload)

      setDraftReceipt(receipt)
      receipt = await saveReceiptLines({
        receipt,
        lines: receiptLines,
        removedIds: removedLineIds,
        service: purchasingService,
        payloadFor: getReceiptLinePayload,
        onProgress: (saved, rows) => {
          setDraftReceipt(saved)
          setReceiptLines(rows)
        },
      })
      setRemovedLineIds([])

      const submitted = await purchasingService.submitGoodsReceipt(receipt.id)
      toast.success(`${submitted.grNumber} submitted for verification.`)
      resetReceiptWorkspace()
      await loadPurchaseOrders()
      if (detailOnly) {
        queryClient.invalidateQueries({ queryKey: ['purchase-orders', 'receivable'] })
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
        queryClient.invalidateQueries({ queryKey: ['grns'] })
        navigate('/purchasing/grn/new')
      }
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setIsSubmittingGrn(false)
    }
  }
  return (
    <div
      className="responsive-page grn-page"
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {detailOnly ? (
          <button
            type="button"
            className="btn-back-modern"
            onClick={() => navigate('/purchasing/grn/new')}
            style={{ marginLeft: -8, marginBottom: 8 }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Back
          </button>
        ) : null}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            lineHeight: 1.2,
          }}
        >
          {detailOnly ? 'Goods Receipt Entry' : 'New Goods Receipt Entry'}
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          {detailOnly && selectedOrder
            ? `${selectedOrder.poNumber} - ${selectedOrder.supplierName || 'Supplier not specified'}`
            : grnMode
              ? 'Select a receivable purchase order, then enter the goods received against it.'
              : 'Review receivable purchase order details.'}
        </p>
      </div>

      {!detailOnly ? (
        <div
          className="panel grn-filter-bar"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div className="grn-filter-search" style={{ flex: 1 }}>
            <Search
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: 'var(--color-text-dim)',
              }}
            />
            <input
              className="form-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by PO number or supplier..."
              style={{
                width: '100%',
                height: 40,
                paddingLeft: 36,
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-text-primary)',
                fontSize: 14,
              }}
            />
          </div>

          {/* Supplier Dropdown */}
          <div className="grn-filter-field" style={{ width: 220 }}>
            <div style={{ position: 'relative' }}>
              <select
                className="form-input"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                style={{
                  width: '100%',
                  height: 40,
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                  cursor: 'pointer',
                  appearance: 'none',
                  paddingLeft: 12,
                  paddingRight: 36,
                }}
              >
                <option value="" style={{ background: 'var(--color-bg-elevated)' }}>
                  All suppliers
                </option>
                {suppliers.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    style={{ background: 'var(--color-bg-elevated)' }}
                  >
                    {item.code} - {item.name}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>

          {/* From Date Input */}
          <div className="grn-filter-field" style={{ width: 150 }}>
            <input
              type="date"
              className="form-input"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => setFromDate(event.target.value)}
              style={{
                width: '100%',
                height: 40,
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-text-primary)',
                fontSize: 14,
              }}
            />
          </div>

          {/* To Date Input */}
          <div className="grn-filter-field" style={{ width: 150 }}>
            <input
              type="date"
              className="form-input"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => setToDate(event.target.value)}
              style={{
                width: '100%',
                height: 40,
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-text-primary)',
                fontSize: 14,
              }}
            />
          </div>

          <button
            type="button"
            className="button-secondary"
            onClick={clearFilters}
            style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <X style={{ width: 15, height: 15 }} />
            Clear
          </button>
        </div>
      ) : null}

      <div
        className="responsive-master-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: detailOnly ? 'minmax(0, 1fr)' : 'minmax(320px, 720px)',
          justifyContent: detailOnly ? 'stretch' : 'start',
          gap: 16,
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {!detailOnly ? (
          <section
            className="panel responsive-queue-panel"
            style={{
              padding: 12,
              display: 'grid',
              gridTemplateRows: 'auto minmax(0, 1fr) auto',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '4px 4px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--color-green)',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                  }}
                >
                  <CheckCircle2 style={{ width: 17, height: 17 }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Receivable Purchase Orders
                  </h2>
                  <p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-dim)' }}>
                    {grnMode
                      ? 'Newest receivable orders appear first'
                      : 'Select an order to view details'}
                  </p>
                </div>
              </div>
              <span
                style={{
                  padding: '4px 9px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-green)',
                  background: 'rgba(34, 197, 94, 0.1)',
                }}
              >
                {filteredOrders.length}
              </span>
            </div>

            <div style={{ minHeight: 0, overflow: 'hidden', paddingRight: 2 }}>
              {error ? (
                <div className="p-6 text-sm text-danger">{error}</div>
              ) : isLoading ? (
                <div
                  style={{
                    height: '100%',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: 13,
                  }}
                >
                  Loading receivable orders...
                </div>
              ) : filteredOrders.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pagedOrders.map((order) => {
                    const isSelected = order.id === selectedId

                    return (
                      <button
                        type="button"
                        key={order.id}
                        onClick={() => navigate(`/purchasing/grn/entry/${order.id}`)}
                        style={{
                          width: '100%',
                          padding: 13,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 11,
                          textAlign: 'left',
                          borderRadius: 8,
                          border: isSelected
                            ? '1px solid color-mix(in srgb, var(--color-green, #22c55e) 45%, transparent)'
                            : '1px solid var(--color-border)',
                          background: isSelected
                            ? 'color-mix(in srgb, var(--color-green, #22c55e) 10%, transparent)'
                            : 'var(--color-bg-elevated)',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <span
                            className="mono"
                            style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-amber)' }}
                          >
                            {order.poNumber}
                          </span>
                          <span
                            style={{
                              padding: '3px 7px',
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 700,
                              color: getStatusColor(order.status, order.grnQueueStatus),
                              background: 'rgba(34, 197, 94, 0.1)',
                            }}
                          >
                            {getStatusText(order.status, order.grnQueueStatus)}
                          </span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            title={order.supplierName}
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {order.supplierName}
                          </div>
                          <div
                            className="mono"
                            style={{ marginTop: 3, fontSize: 10, color: 'var(--color-text-dim)' }}
                          >
                            {order.supplierCode}
                          </div>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            paddingTop: 10,
                            borderTop: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 11,
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            <CalendarDays style={{ width: 13, height: 13 }} />
                            {formatDate(order.grnQueueDate || order.orderDate)}
                          </span>
                          <span
                            className="mono"
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {formatMoney(order.totalAmount)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div
                  style={{
                    height: '100%',
                    minHeight: 260,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <CheckCircle2 style={{ width: 34, height: 34, color: 'var(--color-text-dim)' }} />
                  <span style={{ fontSize: 13 }}>No receivable POs found.</span>
                </div>
              )}
            </div>

            <SimplePagination
              page={orderPage}
              pageSize={orderPageSize}
              totalItems={filteredOrders.length}
              onPageChange={setOrderPage}
              itemLabel="orders"
            />
          </section>
        ) : null}

        {detailOnly ? (
          <section
            className="responsive-detail-panel"
            style={{ minWidth: 0, minHeight: 0, overflow: 'hidden' }}
          >
            {isLoadingDetail ? (
              <div className="h-full flex items-center justify-center text-text-muted">
                Loading purchase order details...
              </div>
            ) : selectedOrder ? (
              <form
                className="grn-entry-layout"
                onSubmit={handleGrnFormSubmit}
                style={{
                  height: '100%',
                  minHeight: 0,
                }}
              >
                <div
                  className="grn-entry-order-context"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--color-border)',
                    background:
                      'linear-gradient(135deg, var(--color-bg-surface), var(--color-bg-elevated))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--color-amber)',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {selectedOrder.poNumber}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          color: getStatusColor(selectedOrder.status, draftReceipt ? 'Draft' : ''),
                          background: `color-mix(in srgb, ${getStatusColor(selectedOrder.status, draftReceipt ? 'Draft' : '')} 8%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${getStatusColor(selectedOrder.status, draftReceipt ? 'Draft' : '')} 18%, transparent)`,
                        }}
                      >
                        {getStatusText(
                          selectedOrder.status,
                          draftReceipt ? 'Draft' : ''
                        ).toUpperCase()}
                      </span>
                    </div>
                    <div
                      style={{
                        width: 1,
                        height: 16,
                        background: 'var(--color-border)',
                      }}
                    />
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                      Receivable order ready for GRN entry.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CalendarDays
                        style={{ width: 14, height: 14, color: 'var(--color-text-dim)' }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: 'var(--color-text-dim)',
                            letterSpacing: '0.05em',
                          }}
                        >
                          EXPECTED
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {selectedOrder.expectedDeliveryDate
                            ? formatDate(selectedOrder.expectedDeliveryDate)
                            : 'Not specified'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {grnMode ? (
                  <section className="panel grn-entry-details" style={{ padding: 16 }}>
                    <div>
                      <h2
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        Receipt Details
                      </h2>
                      <p
                        style={{
                          marginTop: 3,
                          fontSize: 12,
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        Complete the receipt header before submitting this GRN.
                      </p>
                    </div>
                    <div style={{ borderTop: '1px solid var(--color-border)' }} />
                    <div
                      className="responsive-form-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr)',
                        gap: 12,
                        minHeight: 0,
                      }}
                    >
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span className="form-label">Supplier Invoice No *</span>
                        <input
                          className="form-input"
                          required
                          disabled={isSubmittingGrn || Boolean(pendingReceipt)}
                          value={receiptHeader.supplierInvoiceNo}
                          onChange={(event) =>
                            updateReceiptHeader('supplierInvoiceNo', event.target.value)
                          }
                          placeholder="Required invoice number"
                          style={{ height: 36 }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span className="form-label">Receipt Date *</span>
                        <input
                          type="date"
                          className="form-input"
                          disabled={isSubmittingGrn || Boolean(pendingReceipt)}
                          value={receiptHeader.receiptDate}
                          onChange={(event) =>
                            updateReceiptHeader('receiptDate', event.target.value)
                          }
                          style={{ height: 36, colorScheme: 'dark' }}
                        />
                      </label>
                      <label
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          minHeight: 0,
                        }}
                      >
                        <span className="form-label">Notes</span>
                        <textarea
                          className="form-input"
                          disabled={isSubmittingGrn || Boolean(pendingReceipt)}
                          value={receiptHeader.notes}
                          onChange={(event) => updateReceiptHeader('notes', event.target.value)}
                          placeholder="Optional receiving notes"
                          style={{ minHeight: 112, resize: 'vertical' }}
                        />
                      </label>
                    </div>
                  </section>
                ) : null}

                {/* Lines Table */}
                <div
                  className="panel grn-entry-items"
                  style={{
                    minHeight: 160,
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <Package style={{ width: 15, height: 15, color: 'var(--color-teal)' }} />
                    <h3
                      style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}
                    >
                      GRN items
                    </h3>
                    <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                      {receiptLines.length} item
                      {receiptLines.length === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={addReceiptLine}
                      disabled={isSubmittingGrn || Boolean(pendingReceipt)}
                      style={{
                        marginLeft: 'auto',
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                      }}
                    >
                      <Plus style={{ width: 14, height: 14 }} /> Add Product
                    </button>
                  </div>
                  <div
                    className="responsive-table-shell"
                    style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
                  >
                    {grnMode ? (
                      <table
                        className="data-table product-table-compact grn-order-items-table"
                        style={{ minWidth: 1160 }}
                      >
                        <thead className="grn-order-items-table-head">
                          <tr>
                            <th>ITEM</th>
                            <th style={{ textAlign: 'right' }}>REMAINING</th>
                            <th style={{ width: 110 }}>RECEIVE QTY</th>
                            <th style={{ width: 120 }}>UNIT COST</th>
                            <th style={{ width: 110 }}>MRP</th>
                            <th style={{ width: 130, textAlign: 'right' }}>LINE TOTAL</th>
                            <th style={{ width: 140 }}>EXPIRY</th>
                            <th aria-label="Actions" />
                          </tr>
                        </thead>
                        <tbody>
                          {pagedReceiptLines.map((line) => {
                            return (
                              <tr key={line.key}>
                                <td>
                                  {line.isNewRow && !line.grnLineId ? (
                                    <div
                                      style={{
                                        display: 'flex',
                                        minWidth: 300,
                                        flexDirection: 'column',
                                        gap: 4,
                                      }}
                                    >
                                      <ProductSearchSelect
                                        value={line.productId}
                                        products={productsForLine(line.key)}
                                        onChange={(productId) =>
                                          void selectReceiptProduct(line.key, productId)
                                        }
                                        disabled={
                                          isSubmittingGrn ||
                                          isLoadingProducts ||
                                          selectingProductKey === line.key
                                        }
                                        placeholder={
                                          isLoadingProducts
                                            ? 'Loading products...'
                                            : 'Type SKU or product name...'
                                        }
                                      />
                                      {line.productId ? (
                                        <span
                                          style={{ fontSize: 11, color: 'var(--color-text-dim)' }}
                                        >
                                          {line.purchaseOrderLineId
                                            ? `Ordered ${line.orderedQty} ${line.baseUomCode} | Received ${line.receivedQty} ${line.baseUomCode}`
                                            : 'Additional item - not on PO'}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: 3 }}
                                    >
                                      <span className="product-sku-badge mono">
                                        {line.productSku}
                                      </span>
                                      <span className="product-info-sub">{line.productName}</span>
                                      <span
                                        style={{ fontSize: 11, color: 'var(--color-text-dim)' }}
                                      >
                                        {line.purchaseOrderLineId
                                          ? `Ordered ${line.orderedQty} ${line.baseUomCode} | Received ${line.receivedQty} ${line.baseUomCode}`
                                          : 'Additional item - not on PO'}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="mono text-right">
                                  {line.purchaseOrderLineId ? line.remainingQty : '-'}{' '}
                                  <span className="uom-badge">{line.baseUomCode}</span>
                                </td>
                                <EditableCell
                                  disabled={isSubmittingGrn || Boolean(pendingReceipt)}
                                  value={line.qtyBaseUnit}
                                  // Receive Qty is entered in the line's base unit (e.g. CASE), but
                                  // the value that actually matters is a whole SMALLEST unit (e.g.
                                  // 1 PCS) — which for most conversion factors isn't a round CASE
                                  // number (e.g. 1/150 CASE = 0.00667). A 0.01 step made those exact
                                  // amounts un-typeable ("nearest valid values are 0 and 0.01"), so
                                  // this field allows any precision — the backend already rounds the
                                  // resulting smallest-unit quantity to the nearest whole piece.
                                  step="any"
                                  onChange={(value) =>
                                    updateReceiptLine(line.key, 'qtyBaseUnit', value)
                                  }
                                />
                                <EditableCell
                                  disabled={isSubmittingGrn || Boolean(pendingReceipt)}
                                  value={line.unitCostSmallest}
                                  onChange={(value) =>
                                    updateReceiptLine(line.key, 'unitCostSmallest', value)
                                  }
                                />
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="form-input"
                                    disabled={isSubmittingGrn || Boolean(pendingReceipt)}
                                    value={line.mrp}
                                    onChange={(event) =>
                                      updateReceiptLine(line.key, 'mrp', event.target.value)
                                    }
                                    style={{ height: 34, textAlign: 'right' }}
                                  />
                                  {(() => {
                                    const poLine = selectedOrder?.lines?.find(
                                      (l) => l.id === line.purchaseOrderLineId
                                    )
                                    return poLine && Number(poLine.mrp) > 0 ? (
                                      <div
                                        className="product-info-sub"
                                        style={{
                                          textAlign: 'right',
                                          marginTop: 2,
                                          fontSize: 11,
                                          color: 'var(--color-text-muted)',
                                        }}
                                      >
                                        Last: Rs. {Number(poLine.mrp).toFixed(2)}
                                      </div>
                                    ) : null
                                  })()}
                                </td>
                                <td className="mono text-right font-semibold text-sm">
                                  {formatMoney(estimateReceiptLineSubtotal(line))}
                                </td>
                                <td>
                                  <input
                                    type="date"
                                    className="form-input"
                                    disabled={isSubmittingGrn || Boolean(pendingReceipt)}
                                    value={line.expiryDate}
                                    onChange={(event) =>
                                      updateReceiptLine(line.key, 'expiryDate', event.target.value)
                                    }
                                    style={{ height: 34, colorScheme: 'dark' }}
                                  />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="icon-button"
                                    title="Remove product"
                                    aria-label={`Remove ${line.productName || 'empty product row'}`}
                                    disabled={isSubmittingGrn || Boolean(pendingReceipt)}
                                    onClick={() => removeReceiptLine(line)}
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
                    ) : (
                      <table className="data-table product-table-compact">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th style={{ textAlign: 'right' }}>Ordered Qty</th>
                            <th style={{ textAlign: 'right' }}>Received</th>
                            <th style={{ textAlign: 'right' }}>Remaining</th>
                            <th style={{ textAlign: 'right' }}>Smallest Qty</th>
                            <th style={{ textAlign: 'right' }}>Unit Cost</th>
                            <th style={{ textAlign: 'right' }}>Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedItems.map((line) => (
                            <tr key={line.id}>
                              <td>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: 3,
                                  }}
                                >
                                  <span className="product-sku-badge mono">{line.productSku}</span>
                                  <span className="product-info-sub">{line.productName}</span>
                                </div>
                              </td>
                              <td className="text-right">
                                <span className="mono text-sm">
                                  {Number(line.qtyBaseUnit).toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 4,
                                  })}
                                </span>{' '}
                                <span className="uom-badge">{line.baseUomCode}</span>
                              </td>
                              <td className="text-right">
                                <span className="mono text-sm">
                                  {Number(line.receivedQty).toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 4,
                                  })}
                                </span>{' '}
                                <span className="uom-badge">{line.baseUomCode}</span>
                              </td>
                              <td className="text-right">
                                <span className="mono text-sm">
                                  {Number(line.remainingQty).toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 4,
                                  })}
                                </span>{' '}
                                <span className="uom-badge">{line.baseUomCode}</span>
                              </td>
                              <td className="text-right">
                                <span className="mono text-sm">
                                  {Number(line.qtySmallestUnit).toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 4,
                                  })}
                                </span>{' '}
                                <span className="uom-badge">{line.smallestUomCode}</span>
                              </td>
                              <td className="mono text-right font-semibold text-sm">
                                {formatMoney(line.unitCostSmallest)}
                                <span className="product-info-sub"> / {line.smallestUomCode}</span>
                              </td>
                              <td className="mono text-right font-semibold text-sm">
                                {formatMoney(line.lineSubtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div style={{ padding: '0 12px 8px' }}>
                    <SimplePagination
                      page={itemPage}
                      pageSize={itemPageSize}
                      totalItems={receiptLines.length}
                      onPageChange={setItemPage}
                      itemLabel="items"
                    />
                  </div>
                </div>

                <div
                  className="responsive-summary-grid grn-entry-summary"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 330px',
                    gap: 10,
                    alignItems: 'stretch',
                  }}
                >
                  <div
                    className="grn-entry-guidance"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      color: 'var(--color-text-muted)',
                      fontSize: 11,
                      lineHeight: 1.4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    Only items with a receive quantity greater than zero will be submitted. Removed
                    PO items remain outstanding. Additional items do not change the PO.
                  </div>

                  <div
                    className="grn-entry-totals"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      background: 'var(--color-bg-elevated)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Products</span>
                      <span className="mono">{receiptLines.length}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Sub total</span>
                      <span className="mono">{formatMoney(receiptTotals.billTotal)}</span>
                    </div>
                    <div
                      className="flex justify-between items-center text-xs"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span className="text-text-muted">Discount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input"
                        disabled={isSubmittingGrn || Boolean(pendingReceipt)}
                        value={receiptHeader.discount}
                        onChange={(event) => updateReceiptHeader('discount', event.target.value)}
                        style={{
                          width: '100px',
                          height: '24px',
                          padding: '0 8px',
                          textAlign: 'right',
                          fontSize: '11px',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">VAT (18%)</span>
                      <span className="mono">{formatMoney(receiptTotals.vatAmount)}</span>
                    </div>
                    <div
                      className="flex justify-between items-center text-xs"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        className="text-text-muted"
                        title="Corrects the GRN's total to match what was actually paid to the supplier."
                      >
                        Points adjustment
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        disabled={isSubmittingGrn || Boolean(pendingReceipt)}
                        value={receiptHeader.adjustmentAmount}
                        onChange={(event) =>
                          updateReceiptHeader('adjustmentAmount', event.target.value)
                        }
                        style={{
                          width: '100px',
                          height: '24px',
                          padding: '0 8px',
                          textAlign: 'right',
                          fontSize: '11px',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        paddingTop: 6,
                        marginTop: 2,
                        borderTop: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        Net amount
                      </span>
                      <span
                        className="mono"
                        style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-amber)' }}
                      >
                        {formatMoney(receiptTotals.netAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="grn-entry-actions"
                  style={{
                    paddingTop: 10,
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                    {grnMode
                      ? pendingReceipt
                        ? `${pendingReceipt.grNumber || 'This GRN'} is already waiting for verification.`
                        : draftReceipt
                          ? `Continuing draft ${draftReceipt.grNumber || 'GRN'} from this page.`
                          : 'Create and submit the GRN from this page for verification.'
                      : 'Create and submit the GRN from this page for verification.'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="submit"
                      className="button-primary"
                      disabled={isSubmittingGrn || Boolean(pendingReceipt)}
                      style={{
                        height: 40,
                        padding: '0 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Send style={{ width: 15, height: 15 }} />
                      {isSubmittingGrn ? 'Submitting...' : 'Submit GRN'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div
                style={{
                  height: '100%',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--color-text-dim)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <CheckCircle2 style={{ width: 25, height: 25 }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Select an approved purchase order
                  </p>
                  <p style={{ marginTop: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Choose an order to review its supplier, products, delivery date, and totals.
                  </p>
                </div>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  )
}
function EditableCell({ value, onChange, disabled = false, step = '0.01' }) {
  return (
    <td>
      <input
        type="number"
        min="0"
        step={step}
        className="form-input"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ height: 34, textAlign: 'right' }}
      />
    </td>
  )
}
