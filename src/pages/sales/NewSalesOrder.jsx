import dayjs from 'dayjs'
import { ArrowLeft, CheckCircle2, PackagePlus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { DISCOUNT_POLICY } from '@/constants/discountPolicy'
import { inventoryService } from '@/services/api/inventoryService'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'

const emptyDraftLine = {
  productId: '',
  productName: '',
  productSku: '',
  unitId: '',
  unitCode: '',
  mrp: 0,
  categoryDiscountPercent: 0,
  skuDiscountAvailable: false,
  skuDiscountMax: 0,
  skuDiscountPercent: '',
  specialDiscountAvailable: false,
  specialDiscountMax: 0,
  specialDiscountPercent: '',
  quantity: 1,
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function getOrderId(response) {
  if (typeof response === 'string' || typeof response === 'number') return String(response)
  return (
    response?.id ?? response?.value ?? response?.data?.id ?? response?.data?.value ?? response?.data
  )
}

function getProductCategoryId(product) {
  return product?.categoryId || product?.category?.id || ''
}

function getProductUnitId(product) {
  return product?.smallestUnitId || product?.unitId || product?.baseUomId || product?.uomBase || ''
}

function getProductUnitCode(product) {
  return (
    product?.smallestUnitName ||
    product?.smallestUnitCode ||
    product?.unitCode ||
    product?.uomBase ||
    product?.baseUom ||
    ''
  )
}

function getLineAmounts(line) {
  const quantity = toNumber(line.quantity)
  const mrp = toNumber(line.mrp)
  const categoryDiscountPercent = toNumber(line.categoryDiscountPercent)
  const skuDiscountPercent = toNumber(line.skuDiscountPercent)
  const specialDiscountPercent = toNumber(line.specialDiscountPercent)
  const gross = mrp * quantity
  const categoryDiscountAmount = gross * (categoryDiscountPercent / 100)
  const skuDiscountAmount = gross * (skuDiscountPercent / 100)
  const specialDiscountAmount = gross * (specialDiscountPercent / 100)
  const unitPrice = mrp * (1 - (categoryDiscountPercent + skuDiscountPercent) / 100)
  const net = gross - categoryDiscountAmount - skuDiscountAmount - specialDiscountAmount

  return { gross, categoryDiscountAmount, skuDiscountAmount, specialDiscountAmount, unitPrice, net }
}

const returnReasonOptions = [
  { value: '1', label: 'Damage' },
  { value: '2', label: 'Expire' },
  { value: '3', label: 'Short Expiry' },
  { value: '4', label: 'Others' },
]

const emptyReturnDraftLine = {
  productId: '',
  productName: '',
  productSku: '',
  lastInvoiceId: '',
  lastInvoiceLineId: '',
  mrp: 0,
  discountPercent: '',
  reason: '1',
  quantity: 1,
  maxReturnableQty: 0,
  totalInvoicedQty: 0,
  totalReturnedQty: 0,
}

function getReturnLineAmounts(line) {
  const quantity = toNumber(line.quantity)
  const mrp = toNumber(line.mrp)
  const discountPercent = toNumber(line.discountPercent)
  const gross = mrp * quantity
  const discountAmount = gross * (discountPercent / 100)
  const creditAmount = gross - discountAmount

  return { gross, discountAmount, creditAmount }
}

export default function NewSalesOrder() {
  const navigate = useNavigate()
  const [orderId, setOrderId] = useState(null)
  const [, setOrderNumber] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null)
  const [salesRouteName, setSalesRouteName] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [draftLine, setDraftLine] = useState(emptyDraftLine)
  const [lines, setLines] = useState([])
  const [summary, setSummary] = useState({
    grossAmount: 0,
    totalCategoryDiscountAmount: 0,
    totalSkuDiscountAmount: 0,
    totalSpecialDiscountAmount: 0,
    vatAmount: 0,
    netAmount: 0,
  })
  const [productById, setProductById] = useState({})
  const [availableQty, setAvailableQty] = useState(null)
  const [orderSkuDiscountAmount, setOrderSkuDiscountAmount] = useState('')
  const [orderSpecialDiscountAmount, setOrderSpecialDiscountAmount] = useState('')
  const [addItemMode, setAddItemMode] = useState('sale')
  const [returnProducts, setReturnProducts] = useState([])
  const [returnDraftLine, setReturnDraftLine] = useState(emptyReturnDraftLine)
  const [returnCrnId, setReturnCrnId] = useState('')
  const [returnCrnInvoiceId, setReturnCrnInvoiceId] = useState('')
  const [isLoadingReturnProducts, setIsLoadingReturnProducts] = useState(false)
  const [returnLoadError, setReturnLoadError] = useState('')
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingReturn, setIsSavingReturn] = useState(false)

  useEffect(() => {
    let isCurrent = true

    async function loadCustomers() {
      setIsLoadingCustomers(true)
      try {
        const customerResult = await salesService.listAllCustomers({
          pageSize: 100,
          isActive: true,
        })
        if (isCurrent) setCustomers(customerResult || [])
      } catch (error) {
        if (!isCurrent) return
        setCustomers([])
        setLoadError((current) => current || error.message || 'Unable to load active customers.')
      } finally {
        if (isCurrent) setIsLoadingCustomers(false)
      }
    }

    async function loadProducts() {
      setIsLoadingProducts(true)
      try {
        const productResult = await masterService.listAllProducts({
          pageSize: 100,
          status: 'Active',
        })
        if (isCurrent) setProducts(productResult || [])
      } catch (error) {
        if (!isCurrent) return
        setProducts([])
        setLoadError((current) => current || error.message || 'Unable to load active products.')
      } finally {
        if (isCurrent) setIsLoadingProducts(false)
      }
    }

    setLoadError('')
    loadCustomers()
    loadProducts()
    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    const customer = customers.find((item) => item.id === customerId) || null
    setSelectedCustomer(customer)
  }, [customerId, customers])

  useEffect(() => {
    let isCurrent = true

    setAddItemMode('sale')
    setReturnProducts([])
    setReturnDraftLine(emptyReturnDraftLine)
    setReturnCrnId('')
    setReturnCrnInvoiceId('')
    setReturnLoadError('')

    if (!customerId) {
      setIsLoadingReturnProducts(false)
      return () => {
        isCurrent = false
      }
    }

    async function loadReturnProducts() {
      setIsLoadingReturnProducts(true)
      try {
        const soldProducts = await salesService.getProductsSoldToCustomer(customerId)
        if (!isCurrent) return

        setReturnProducts(
          (soldProducts || []).map((product) => ({
            id: product.productId,
            productId: product.productId,
            productSku: product.productSku || product.productId,
            productName: product.productName || product.productId,
            lastMrp: Number(product.lastMrp || 0),
            lastDiscountPercent: Number(product.lastDiscountPercent || 0),
            lastInvoiceId: product.lastInvoiceId || '',
            lastInvoiceLineId: product.lastInvoiceLineId || '',
            lastSoldOn: product.lastSoldOn || null,
            totalInvoicedQty: Number(product.totalInvoicedQty || 0),
            totalReturnedQty: Number(product.totalReturnedQty || 0),
            maxReturnableQty: Number(product.maxReturnableQty || 0),
          }))
        )
      } catch (error) {
        if (!isCurrent) return
        setReturnProducts([])
        setReturnLoadError(error.message || 'Unable to load products sold to this customer.')
      } finally {
        if (isCurrent) setIsLoadingReturnProducts(false)
      }
    }

    loadReturnProducts()

    return () => {
      isCurrent = false
    }
  }, [customerId])

  useEffect(() => {
    let isCurrent = true

    async function loadSelectedCustomerDetails() {
      if (!customerId) {
        setSelectedCustomerDetails(null)
        return
      }

      setSelectedCustomerDetails(null)

      try {
        const customer = await salesService.getCustomer(customerId)
        if (isCurrent) setSelectedCustomerDetails(customer)
      } catch {
        if (isCurrent) setSelectedCustomerDetails(null)
      }
    }

    loadSelectedCustomerDetails()

    return () => {
      isCurrent = false
    }
  }, [customerId])

  useEffect(() => {
    let isCurrent = true
    const routeId = selectedCustomer?.salesRouteId || selectedCustomerDetails?.salesRouteId || ''

    async function loadSalesRouteName() {
      if (!routeId) {
        setSalesRouteName('')
        return
      }

      setSalesRouteName('')

      try {
        if (selectedCustomerDetails?.salesRouteName) {
          if (isCurrent) setSalesRouteName(selectedCustomerDetails.salesRouteName)
          return
        }

        const route = await masterService.getSalesRoute(routeId)
        if (isCurrent) setSalesRouteName(route?.name || '')
      } catch {
        if (isCurrent) setSalesRouteName('')
      }
    }

    loadSalesRouteName()

    return () => {
      isCurrent = false
    }
  }, [selectedCustomer?.salesRouteId, selectedCustomerDetails])

  function updateSummary(order) {
    setSummary({
      grossAmount: toNumber(order?.grossAmount),
      totalCategoryDiscountAmount: toNumber(order?.totalCategoryDiscountAmount),
      totalSkuDiscountAmount: toNumber(order?.totalSkuDiscountAmount),
      totalSpecialDiscountAmount: toNumber(order?.totalSpecialDiscountAmount),
      vatAmount: toNumber(order?.vatAmount),
      netAmount: toNumber(order?.netAmount),
    })
  }

  async function refreshOrder(currentOrderId) {
    const updated = await salesService.getSalesOrder(currentOrderId)
    setLines(updated.lines || [])
    setOrderNumber(updated.orderNumber || '')
    updateSummary(updated)

    const productIds = Array.from(
      new Set((updated.lines || []).map((line) => line.productId).filter(Boolean))
    )
    const missingIds = productIds.filter((id) => !productById[id])
    if (!missingIds.length) return

    const responses = await Promise.allSettled(missingIds.map((id) => masterService.getProduct(id)))
    const loadedProducts = responses.flatMap((response) =>
      response.status === 'fulfilled' && response.value ? [response.value] : []
    )
    if (loadedProducts.length) {
      setProductById((current) => ({
        ...current,
        ...loadedProducts.reduce((map, product) => {
          map[product.id] = product
          return map
        }, {}),
      }))
    }
  }

  async function handleProductSelect(productId) {
    if (!productId) {
      setDraftLine(emptyDraftLine)
      setAvailableQty(null)
      return
    }

    try {
      const cachedProduct = products.find((product) => product.id === productId)
      const product =
        cachedProduct && getProductCategoryId(cachedProduct)
          ? cachedProduct
          : await masterService.getProduct(productId)
      const categoryId = getProductCategoryId(product)
      const unitId = getProductUnitId(product)
      const unitCode = getProductUnitCode(product)

      const [categoryDiscount, skuInfo, specialMax, stock, prices] = await Promise.all([
        categoryId ? masterService.getActiveCategoryDiscount(categoryId).catch(() => null) : null,
        masterService.getSkuDiscountInfo(product.id).catch(() => null),
        categoryId ? masterService.getActiveSpecialDiscount(categoryId).catch(() => null) : null,
        unitId
          ? salesService.checkSalesOrderStock({ productId: product.id, unitId }).catch(() => null)
          : null,
        inventoryService.getLastPrices(product.id).catch(() => null),
      ])

      setProductById((current) => ({ ...current, [product.id]: product }))
      setAvailableQty(stock?.availableQuantity ?? stock?.sellable ?? stock?.totalAvailable ?? null)
      setDraftLine({
        productId: product.id,
        productName: product.name || product.productName || '',
        productSku: product.sku || product.productSku || '',
        unitId,
        unitCode,
        mrp: Number(product.mrp || prices?.lastMrp || product.sellingPrice || 0),
        categoryDiscountPercent: categoryDiscount ?? 0,
        skuDiscountAvailable: skuInfo?.hasSkuDiscount ?? false,
        skuDiscountMax: skuInfo?.maxSkuDiscountPercent ?? 0,
        skuDiscountPercent: '',
        specialDiscountAvailable: specialMax !== null,
        specialDiscountMax: specialMax ?? 0,
        specialDiscountPercent: '',
        quantity: 1,
      })
    } catch (error) {
      toast.error(error.message || 'Unable to load product discounts.')
    }
  }

  function updateDraftLine(field, value) {
    setDraftLine((current) => ({ ...current, [field]: value }))
  }

  function updateSkuDiscountPercent(value) {
    const max = toNumber(draftLine.skuDiscountMax)
    const requested = toNumber(value)

    if (value !== '' && requested > max) {
      toast.error(`SKU discount cannot exceed ${max.toFixed(2)}% for this product.`)
      setDraftLine((current) => ({ ...current, skuDiscountPercent: String(max) }))
      return
    }

    updateDraftLine('skuDiscountPercent', value)
  }

  function updateOrderSkuDiscountAmount(value) {
    setOrderSkuDiscountAmount(value)
  }

  function updateOrderSpecialDiscountAmount(value) {
    setOrderSpecialDiscountAmount(value)
  }

  function updateReturnDraftLine(field, value) {
    setReturnDraftLine((current) => ({ ...current, [field]: value }))
  }

  function handleReturnProductSelect(productId) {
    if (!productId) {
      setReturnDraftLine(emptyReturnDraftLine)
      return
    }

    const selected = returnProducts.find((product) => product.id === productId)
    if (!selected) return

    if (returnCrnInvoiceId && selected.lastInvoiceId && selected.lastInvoiceId !== returnCrnInvoiceId) {
      toast.error('Return items must stay within the same invoice.')
      return
    }

    const nextInvoiceId = returnCrnInvoiceId || selected.lastInvoiceId || ''

    if (returnCrnId && nextInvoiceId && nextInvoiceId !== returnCrnInvoiceId) {
      toast.error('Return items must stay within the same invoice.')
      return
    }

    if (!returnCrnInvoiceId && selected.lastInvoiceId) {
      setReturnCrnInvoiceId(selected.lastInvoiceId)
    }

    setReturnDraftLine({
      productId: selected.productId,
      productName: selected.productName || '',
      productSku: selected.productSku || '',
      lastInvoiceId: selected.lastInvoiceId || '',
      lastInvoiceLineId: selected.lastInvoiceLineId || '',
      mrp: Number(selected.lastMrp || 0),
      discountPercent: String(
        Math.min(Number(selected.lastDiscountPercent || 0), DISCOUNT_POLICY.MAX_DISCOUNT_PERCENT)
      ),
      reason: '1',
      quantity: 1,
      maxReturnableQty: Number(selected.maxReturnableQty || 0),
      totalInvoicedQty: Number(selected.totalInvoicedQty || 0),
      totalReturnedQty: Number(selected.totalReturnedQty || 0),
    })
  }

  function updateReturnDiscountPercent(value) {
    const requested = toNumber(value)

    if (value !== '' && requested > DISCOUNT_POLICY.MAX_DISCOUNT_PERCENT) {
      toast.error(`Maximum discount is ${DISCOUNT_POLICY.MAX_DISCOUNT_PERCENT}%`)
      updateReturnDraftLine('discountPercent', String(DISCOUNT_POLICY.MAX_DISCOUNT_PERCENT))
      return
    }

    updateReturnDraftLine('discountPercent', value)
  }

  function updateReturnReason(value) {
    updateReturnDraftLine('reason', value)
  }

  async function handleAddReturnLine() {
    if (!selectedCustomer) {
      toast.error('Select a customer first.')
      return
    }

    if (!returnDraftLine.productId) {
      toast.error('Select a previously sold product.')
      return
    }

    if (toNumber(returnDraftLine.quantity) <= 0) {
      toast.error('Quantity must be greater than zero.')
      return
    }

    if (toNumber(returnDraftLine.quantity) > toNumber(returnDraftLine.maxReturnableQty)) {
      toast.error(
        `Quantity exceeds returnable balance (${Number(returnDraftLine.maxReturnableQty || 0).toLocaleString()}).`
      )
      return
    }

    const discountPercent = toNumber(returnDraftLine.discountPercent)
    if (discountPercent < 0) {
      toast.error('Discount cannot be negative.')
      return
    }
    if (discountPercent > DISCOUNT_POLICY.MAX_DISCOUNT_PERCENT) {
      toast.error(`Maximum discount is ${DISCOUNT_POLICY.MAX_DISCOUNT_PERCENT}%`)
      return
    }

    setIsSavingReturn(true)
    try {
      let currentCrnId = returnCrnId
      const invoiceId = returnCrnInvoiceId || returnDraftLine.lastInvoiceId

      if (!currentCrnId) {
        if (!invoiceId) {
          toast.error('Unable to determine the invoice for this return item.')
          return
        }

        const created = await salesService.createCrn({
          customerId: selectedCustomer.id,
          invoiceId,
          notes: null,
        })
        currentCrnId = getOrderId(created)
        setReturnCrnId(currentCrnId)
        setReturnCrnInvoiceId(invoiceId)
      }

      if (!invoiceId) {
        toast.error('Unable to determine the invoice for this return item.')
        return
      }

      await salesService.addCrnLine(currentCrnId, {
        productId: returnDraftLine.productId,
        quantity: toNumber(returnDraftLine.quantity),
        mrp: toNumber(returnDraftLine.mrp),
        discountPercent,
        reason: Number(returnDraftLine.reason),
        invoiceLineId: returnDraftLine.lastInvoiceLineId || null,
      })

      toast.success('Return item saved to draft.')
      setReturnDraftLine(emptyReturnDraftLine)
    } catch (error) {
      toast.error(error.message || 'Unable to save return item.')
    } finally {
      setIsSavingReturn(false)
    }
  }

  async function handleAddLine(event) {
    event.preventDefault()

    if (!selectedCustomer) {
      toast.error('Select a customer first.')
      return
    }

    if (addItemMode === 'return') {
      await handleAddReturnLine()
      return
    }

    if (!draftLine.productId) {
      toast.error('Select a product.')
      return
    }
    if (toNumber(draftLine.quantity) <= 0) {
      toast.error('Quantity must be greater than zero.')
      return
    }

    setIsSaving(true)
    try {
      let currentOrderId = orderId

      if (!currentOrderId) {
        const created = await salesService.createSalesOrder({
          customerId: selectedCustomer.id,
          deliveryDate: deliveryDate ? dayjs(deliveryDate).toISOString() : null,
          notes: null,
        })
        currentOrderId = getOrderId(created)
        setOrderId(currentOrderId)
      }

      await salesService.addSalesOrderLine(currentOrderId, {
        productId: draftLine.productId,
        quantity: toNumber(draftLine.quantity),
        skuDiscountPercent: Math.min(
          toNumber(draftLine.skuDiscountPercent),
          toNumber(draftLine.skuDiscountMax)
        ),
        specialDiscountPercent: draftLine.specialDiscountAvailable
          ? Math.min(
              (toNumber(orderSpecialDiscountAmount) /
                Math.max(toNumber(draftLine.mrp) * toNumber(draftLine.quantity), 1)) *
                100,
              toNumber(draftLine.specialDiscountMax)
            )
          : 0,
      })

      await refreshOrder(currentOrderId)
      setDraftLine(emptyDraftLine)
      setAvailableQty(null)
      toast.success('Item saved to draft.')
    } catch (error) {
      toast.error(error.message || 'Unable to save item.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemoveLine(lineId) {
    if (!orderId) return

    setIsSaving(true)
    try {
      await salesService.removeSalesOrderLine(orderId, lineId)
      await refreshOrder(orderId)
      toast.success('Item removed.')
    } catch (error) {
      toast.error(error.message || 'Unable to remove item.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirm() {
    if (!orderId || lines.length === 0) {
      toast.error('Add at least one item before confirming.')
      return
    }

    setIsSaving(true)
    try {
      await salesService.confirmSalesOrder(orderId)
      toast.success('Order confirmed.')
      navigate('/sales/orders')
    } catch (error) {
      toast.error(error.message || 'Unable to confirm order.')
    } finally {
      setIsSaving(false)
    }
  }

  const draftPreview = getLineAmounts(draftLine)
  const computedSummary = useMemo(() => {
    const totals = lines.reduce(
      (sum, line) => {
        const gross = toNumber(
          line.grossAmount || toNumber(line.mrp || line.unitPrice) * line.quantity
        )
        const categoryDiscountAmount =
          line.categoryDiscountAmount ?? gross * (toNumber(line.categoryDiscountPercent) / 100)
        const skuDiscountAmount =
          line.skuDiscountAmount ?? gross * (toNumber(line.skuDiscountPercent) / 100)
        const specialDiscountAmount =
          line.specialDiscountAmount ?? gross * (toNumber(line.specialDiscountPercent) / 100)

        return {
          grossAmount: sum.grossAmount + gross,
          totalCategoryDiscountAmount: sum.totalCategoryDiscountAmount + categoryDiscountAmount,
          totalSkuDiscountAmount: sum.totalSkuDiscountAmount + skuDiscountAmount,
          totalSpecialDiscountAmount: sum.totalSpecialDiscountAmount + specialDiscountAmount,
        }
      },
      {
        grossAmount: 0,
        totalCategoryDiscountAmount: 0,
        totalSkuDiscountAmount: 0,
        totalSpecialDiscountAmount: 0,
      }
    )
    const grossAmount = lines.length ? totals.grossAmount : summary.grossAmount
    const categoryDiscountAmount = lines.length
      ? totals.totalCategoryDiscountAmount
      : summary.totalCategoryDiscountAmount
    const fallbackSkuDiscountAmount = lines.length
      ? totals.totalSkuDiscountAmount
      : summary.totalSkuDiscountAmount
    const fallbackSpecialDiscountAmount = lines.length
      ? totals.totalSpecialDiscountAmount
      : summary.totalSpecialDiscountAmount
    const skuDiscountAmount =
      orderSkuDiscountAmount === '' ? fallbackSkuDiscountAmount : toNumber(orderSkuDiscountAmount)
    const specialDiscountAmount =
      orderSpecialDiscountAmount === ''
        ? fallbackSpecialDiscountAmount
        : toNumber(orderSpecialDiscountAmount)
    const discountTotal = categoryDiscountAmount + skuDiscountAmount + specialDiscountAmount
    const vatBase = grossAmount - discountTotal
    const vatAmount =
      selectedCustomerDetails?.isVatRegistered || selectedCustomer?.isVatRegistered
        ? Math.round(vatBase * 18) / 100
        : 0

    return {
      grossAmount,
      totalCategoryDiscountAmount: categoryDiscountAmount,
      totalSkuDiscountAmount: skuDiscountAmount,
      totalSpecialDiscountAmount: specialDiscountAmount,
      vatAmount: lines.length ? vatAmount : summary.vatAmount,
      netAmount: lines.length ? vatBase + vatAmount : summary.netAmount,
    }
  }, [
    lines,
    orderSkuDiscountAmount,
    orderSpecialDiscountAmount,
    selectedCustomer,
    selectedCustomerDetails,
    summary,
  ])
  const confirmDisabled = isSaving || !orderId || lines.length === 0
  const skuDiscountInputValue =
    orderSkuDiscountAmount === ''
      ? Number(computedSummary.totalSkuDiscountAmount || 0).toFixed(2)
      : orderSkuDiscountAmount
  const specialDiscountInputValue =
    orderSpecialDiscountAmount === ''
      ? Number(computedSummary.totalSpecialDiscountAmount || 0).toFixed(2)
      : orderSpecialDiscountAmount
  const returnDraftPreview = useMemo(
    () => getReturnLineAmounts(returnDraftLine),
    [returnDraftLine]
  )
  const returnProductOptions = useMemo(() => {
    const productsForMode = returnProducts.filter((product) =>
      returnCrnInvoiceId ? product.lastInvoiceId === returnCrnInvoiceId : true
    )

    return productsForMode.filter((product) => Number(product.maxReturnableQty || 0) > 0)
  }, [returnCrnInvoiceId, returnProducts])
  const selectedReturnProduct =
    returnProductOptions.find((product) => product.id === returnDraftLine.productId) || null
  const returnSectionDisabled =
    isSavingReturn || isLoadingReturnProducts || !selectedCustomer || addItemMode !== 'return'

  return (
    <div
      className="flex h-[calc(100svh-var(--spacing-layout-topbar)-56px)] min-h-0 flex-col overflow-hidden max-lg:h-[calc(100svh-var(--spacing-layout-topbar)-32px)] max-sm:h-[calc(100svh-var(--spacing-layout-topbar)-24px)]"
      style={{ color: 'var(--color-text-primary)' }}
    >
      <div
        className="mx-auto flex min-h-0 w-full max-w-[1680px] flex-1 flex-col overflow-hidden"
        style={{ paddingTop: 0 }}
      >
        <button
          type="button"
          className="button-ghost self-start"
          onClick={() => navigate('/sales/orders')}
          style={{ height: 32, padding: 0, width: 'fit-content', color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft style={{ width: 15, height: 15 }} />
          Back
        </button>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight">Create Sales Order</h1>
        {loadError ? (
          <div className="panel mt-4 p-4 text-sm" style={{ color: 'var(--color-danger)' }}>
            {loadError}
          </div>
        ) : null}

        <div className="mt-2 flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 overflow-hidden max-xl:overflow-y-auto max-xl:pr-1 2xl:overflow-hidden 2xl:pr-0">
          <section className="panel w-full min-w-0" style={panelPaddingStyle}>
            <h2 style={panelTitleStyle}>Order Header</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Customer">
                <SearchablePicker
                  disabled={isLoadingCustomers || isSaving || Boolean(orderId)}
                  emptyLabel="No customers found"
                  getLabel={(customer) =>
                    [customer.code, customer.name].filter(Boolean).join(' - ') || customer.id
                  }
                  getMeta={(customer) =>
                    [
                      customer.salesRouteName,
                      customer.contacts?.find((contact) => contact.isPrimary)?.phone,
                    ]
                      .filter(Boolean)
                      .join(' - ')
                  }
                  getSearchText={(customer) =>
                    [
                      customer.code,
                      customer.name,
                      customer.registrationNumber,
                      customer.taxNumber,
                      customer.salesRouteName,
                      customer.contacts?.map((contact) => contact.phone).join(' '),
                      customer.id,
                    ]
                      .filter(Boolean)
                      .join(' ')
                  }
                  onChange={setCustomerId}
                  options={customers}
                  placeholder={
                    isLoadingCustomers
                      ? 'Loading customers...'
                      : customers.length
                        ? 'Type customer name or code...'
                        : 'No active customers available'
                  }
                  value={customerId}
                />
              </Field>

              <Field label="Sales Route">
                <ReadOnlyDisplay>
                  {salesRouteName ||
                    (selectedCustomer?.salesRouteId
                      ? 'Loading route...'
                      : 'Select a customer first')}
                </ReadOnlyDisplay>
              </Field>

              <Field label="Delivery Date">
                <input
                  className="form-input"
                  disabled={isSaving || Boolean(orderId)}
                  type="date"
                  value={deliveryDate}
                  onChange={(event) => setDeliveryDate(event.target.value)}
                  style={{ height: 40 }}
                />
              </Field>
            </div>
          </section>

          <form
            className="panel w-full min-w-0 overflow-visible"
            style={{ ...panelPaddingStyle, position: 'relative', zIndex: 30 }}
            onSubmit={handleAddLine}
          >
            <div className="mb-3 flex flex-col gap-1">
              <div>
                <h2 style={panelTitleStyle}>Add Item</h2>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {addItemMode === 'return'
                    ? 'Search previously sold products and draft a customer return note.'
                    : 'Select a product, review pricing, then add it to the draft.'}
                </p>
              </div>
            </div>

            <div className="w-full min-w-0 overflow-visible pb-1">
              <div
                className={
                  addItemMode === 'return'
                    ? 'grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[minmax(280px,2.15fr)_minmax(96px,0.62fr)_minmax(96px,0.62fr)_minmax(82px,0.52fr)_minmax(120px,0.8fr)_104px]'
                    : 'grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[minmax(280px,2.15fr)_minmax(82px,0.5fr)_minmax(96px,0.62fr)_minmax(78px,0.4fr)_minmax(96px,0.62fr)_minmax(82px,0.52fr)_minmax(78px,0.4fr)_104px]'
                }
              >
                <div className="min-w-0 sm:col-span-2 md:col-span-3 xl:col-span-1">
                  <Field
                    label="Product"
                    labelRight={
                      addItemMode === 'return' ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              border: '1px solid rgba(32, 212, 191, 0.35)',
                              background: 'rgba(32, 212, 191, 0.1)',
                              color: 'var(--color-teal)',
                            }}
                          >
                            RETURN
                          </span>
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => {
                              setAddItemMode('sale')
                              setReturnDraftLine(emptyReturnDraftLine)
                            }}
                            style={{ height: 26, padding: '0 8px', fontSize: 10 }}
                          >
                            Back to Sale
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => setAddItemMode('return')}
                          disabled={isLoadingReturnProducts || !selectedCustomer}
                          style={{ height: 26, padding: '0 8px', fontSize: 10 }}
                        >
                          + RETURN
                        </button>
                      )
                    }
                  >
                    <SearchablePicker
                      disabled={
                        addItemMode === 'return'
                          ? isLoadingReturnProducts || isSavingReturn
                          : isLoadingProducts || isSaving
                      }
                      emptyLabel={
                        addItemMode === 'return'
                          ? 'No returnable products found'
                          : 'No products found'
                      }
                      getLabel={(product) =>
                        addItemMode === 'return'
                          ? [product.productSku, product.productName].filter(Boolean).join(' - ') ||
                            product.id
                          : [product.sku, product.name].filter(Boolean).join(' - ') || product.id
                      }
                      getMeta={(product) =>
                        addItemMode === 'return'
                          ? [
                              `Sold ${Number(product.totalInvoicedQty || 0).toLocaleString()}`,
                              `Returned ${Number(product.totalReturnedQty || 0).toLocaleString()}`,
                              `Returnable ${Number(product.maxReturnableQty || 0).toLocaleString()}`,
                              product.lastSoldOn ? dayjs(product.lastSoldOn).format('DD MMM YYYY') : '',
                            ]
                              .filter(Boolean)
                              .join(' - ')
                          : [product.uomBase || product.baseUom, product.category?.name]
                              .filter(Boolean)
                              .join(' - ')
                      }
                      getSearchText={(product) =>
                        addItemMode === 'return'
                          ? [
                              product.productSku,
                              product.productName,
                              product.id,
                              product.lastInvoiceId,
                              product.lastInvoiceLineId,
                            ]
                              .filter(Boolean)
                              .join(' ')
                          : [
                              product.sku,
                              product.name,
                              product.barcode,
                              product.category?.name,
                              product.id,
                            ]
                              .filter(Boolean)
                              .join(' ')
                      }
                      onChange={
                        addItemMode === 'return' ? handleReturnProductSelect : handleProductSelect
                      }
                      options={addItemMode === 'return' ? returnProductOptions : products}
                      placeholder={
                        addItemMode === 'return'
                          ? isLoadingReturnProducts
                            ? 'Loading sold products...'
                            : returnProductOptions.length
                              ? 'Search previously sold product...'
                              : 'No returnable products available'
                          : isLoadingProducts
                            ? 'Loading products...'
                            : products.length
                              ? 'Type SKU or product name...'
                              : 'No active products available'
                      }
                      value={
                        addItemMode === 'return' ? returnDraftLine.productId : draftLine.productId
                      }
                    />
                  </Field>
                </div>

                {addItemMode === 'return' ? (
                  <>
                    <Field label="MRP">
                      <ReadOnlyDisplay>
                        <span className="mono tabular-nums">
                          {Number(returnDraftLine.mrp || 0).toFixed(2)}
                        </span>
                      </ReadOnlyDisplay>
                    </Field>

                    <Field label="Discount %">
                      <input
                        className="form-input mono"
                        max={DISCOUNT_POLICY.MAX_DISCOUNT_PERCENT}
                        min="0"
                        step="0.01"
                        type="number"
                        value={returnDraftLine.discountPercent}
                        onChange={(event) => updateReturnDiscountPercent(event.target.value)}
                        style={{ height: 40 }}
                      />
                    </Field>

                    <Field label="Qty" labelRight={
                      selectedReturnProduct
                        ? `${Number(selectedReturnProduct.maxReturnableQty || 0).toLocaleString()} returnable`
                        : null
                    } labelRightColor={
                      Number(selectedReturnProduct?.maxReturnableQty) <= 0
                        ? 'var(--color-danger)'
                        : 'var(--color-teal)'
                    }>
                      <input
                        className="form-input mono"
                        min="0"
                        max={selectedReturnProduct?.maxReturnableQty ?? undefined}
                        type="number"
                        value={returnDraftLine.quantity}
                        onChange={(event) =>
                          updateReturnDraftLine('quantity', event.target.value)
                        }
                        style={{ height: 40 }}
                      />
                    </Field>

                    <Field label="Reason">
                      <select
                        className="form-input"
                        disabled={!selectedReturnProduct}
                        value={returnDraftLine.reason}
                        onChange={(event) => updateReturnReason(event.target.value)}
                        style={{ height: 40 }}
                      >
                        {returnReasonOptions.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Credit">
                      <ReadOnlyDisplay>
                        <span className="mono tabular-nums">
                          {money(returnDraftPreview.creditAmount)}
                        </span>
                      </ReadOnlyDisplay>
                    </Field>

                    <button
                      type="submit"
                      className="button-secondary w-full sm:col-span-2 md:col-span-3 xl:col-span-1"
                      disabled={returnSectionDisabled || !returnDraftLine.productId}
                      style={{ height: 40 }}
                    >
                      <PackagePlus style={{ width: 14, height: 14 }} />
                      Add Return Item
                    </button>
                  </>
                ) : (
                  <>
                    <Field label="Unit">
                      <ReadOnlyDisplay>
                        <span className="mono tabular-nums">{draftLine.unitCode || '-'}</span>
                      </ReadOnlyDisplay>
                    </Field>

                    <Field label="MRP">
                      <ReadOnlyDisplay>
                        <span className="mono tabular-nums">
                          {Number(draftLine.mrp || 0).toFixed(2)}
                        </span>
                      </ReadOnlyDisplay>
                    </Field>

                    <Field label="Cat. Disc %">
                      <ReadOnlyDisplay>
                        <span className="mono tabular-nums">
                          {Number(draftLine.categoryDiscountPercent || 0).toFixed(2)}%
                        </span>
                      </ReadOnlyDisplay>
                    </Field>

                    <Field label="Unit Price">
                      <ReadOnlyDisplay>
                        <span className="mono tabular-nums">
                          {Number(draftPreview.unitPrice || 0).toFixed(2)}
                        </span>
                      </ReadOnlyDisplay>
                    </Field>

                    <Field
                      label="Qty"
                      labelRight={
                        availableQty !== null
                          ? `${Number(availableQty).toLocaleString()} available`
                          : null
                      }
                      labelRightColor={
                        Number(availableQty) <= 0
                          ? 'var(--color-danger)'
                          : 'var(--color-teal)'
                      }
                    >
                      <input
                        className="form-input mono"
                        min="0"
                        max={availableQty ?? undefined}
                        type="number"
                        value={draftLine.quantity}
                        onChange={(event) =>
                          updateDraftLine('quantity', event.target.value)
                        }
                        style={{ height: 40 }}
                      />
                    </Field>

                    <Field label="SKU Disc %">
                      {draftLine.skuDiscountAvailable ? (
                        <input
                          className="form-input mono"
                          max={draftLine.skuDiscountMax || 0}
                          min="0"
                          step="0.01"
                          type="number"
                          value={draftLine.skuDiscountPercent}
                          onChange={(event) => updateSkuDiscountPercent(event.target.value)}
                          style={{ height: 40 }}
                        />
                      ) : (
                        <ReadOnlyDisplay>-</ReadOnlyDisplay>
                      )}
                    </Field>
                    <button
                      type="submit"
                      className="button-secondary w-full sm:col-span-2 md:col-span-3 xl:col-span-1"
                      disabled={isSaving || !draftLine.productId}
                      style={{ height: 40 }}
                    >
                      <PackagePlus style={{ width: 14, height: 14 }} />
                      Add Item
                    </button>
                  </>
                )}
              </div>
              {addItemMode === 'return' && returnLoadError ? (
                <div className="mt-3 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger)' }}>
                  {returnLoadError}
                </div>
              ) : null}
            </div>
          </form>

          <div className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 items-stretch gap-3 xl:overflow-y-auto xl:pr-1 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] 2xl:overflow-visible 2xl:pr-0">
            <section
              className="panel flex min-h-0 min-w-0 flex-col overflow-hidden"
              style={{ ...panelPaddingStyle }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 style={panelTitleStyle}>Order Lines ({lines.length})</h2>
                </div>
                {/* <span
                  className="mono hidden text-xs sm:inline"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Preview {money(draftPreview.net)}
                </span> */}
              </div>

              {lines.length ? (
                <>
                  <div className="hidden flex-1 overflow-auto md:block" style={{ minHeight: 0 }}>
                    <table
                        className="data-table w-full table-fixed"
                        style={{
                          minWidth: 820,
                          width: '100%',
                          tableLayout: 'fixed',
                        }}
                      >
                        <colgroup>
                          <col style={{ width: '17%' }} />
                          <col style={{ width: '9%' }} />
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '14%' }} />
                          <col style={{ width: '14%' }} />
                          <col style={{ width: '14%' }} />
                          <col style={{ width: '16%' }} />
                          <col style={{ width: '8%' }} />
                        </colgroup>

                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Product</th>
                            <th style={{ textAlign: 'left' }}>Unit</th>
                            <th style={{ textAlign: 'right' }}>Qty</th>
                            <th style={{ textAlign: 'right' }}>MRP</th>
                            <th style={{ textAlign: 'right' }}>Cat. Disc %</th>
                            <th style={{ textAlign: 'right' }}>SKU Disc %</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                            <th aria-label="Actions" />
                          </tr>
                        </thead>
                      <tbody>
                        {lines.map((line) => {
                          const product = productById[line.productId]
                          const name = product?.name || product?.productName || line.productId
                          const sku = product?.sku || product?.productSku || ''

                          return (
                            <tr key={line.id}>
                              <td>
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{name}</div>
                                  {sku ? (
                                    <div
                                      className="mono mt-1 text-xs"
                                      style={{ color: 'var(--color-text-muted)' }}
                                    >
                                      {sku}
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                              <td className="mono">
                                {line.smallestUnitCode || line.unitId || 'PCS'}
                              </td>
                              <td className="mono text-right">{line.quantity}</td>
                              <td className="mono text-right">
                                {money(line.mrp || line.unitPrice)}
                              </td>
                              <td className="mono text-right">
                                {Number(line.categoryDiscountPercent || 0).toFixed(2)}%
                              </td>
                              <td className="mono text-right">
                                {Number(line.skuDiscountPercent || 0).toFixed(2)}%
                              </td>
                              <td className="mono text-right font-semibold">
                                {money(line.lineTotal)}
                              </td>
                              <td className="text-right">
                                <button
                                  className="icon-button"
                                  disabled={isSaving}
                                  onClick={() => handleRemoveLine(line.id)}
                                  type="button"
                                  style={{ height: 32, width: 32 }}
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

                  <div className="grid gap-3 md:hidden">
                    {lines.map((line) => {
                      const product = productById[line.productId]
                      const name = product?.name || product?.productName || line.productId
                      const sku = product?.sku || product?.productSku || ''

                      return (
                        <div
                          key={line.id}
                          className="rounded-lg border p-3"
                          style={{
                            borderColor: 'var(--color-border)',
                            background: 'var(--color-bg-hover)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{name}</p>
                              {sku ? (
                                <p
                                  className="mono mt-1 text-xs"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  {sku}
                                </p>
                              ) : null}
                            </div>
                            <button
                              className="icon-button shrink-0"
                              disabled={isSaving}
                              onClick={() => handleRemoveLine(line.id)}
                              type="button"
                              style={{ height: 32, width: 32 }}
                            >
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <MobileMetric
                              label="Unit"
                              value={line.smallestUnitCode || line.unitId || 'PCS'}
                            />
                            <MobileMetric label="Qty" value={line.quantity} />
                            <MobileMetric label="MRP" value={money(line.mrp || line.unitPrice)} />
                            <MobileMetric
                              label="Cat. Disc"
                              value={`${Number(line.categoryDiscountPercent || 0).toFixed(2)}%`}
                            />
                            <MobileMetric
                              label="SKU Disc"
                              value={`${Number(line.skuDiscountPercent || 0).toFixed(2)}%`}
                            />
                            <MobileMetric label="Total" strong value={money(line.lineTotal)} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div
                  className="grid min-h-0 flex-1 place-items-center rounded-lg border border-dashed px-4 py-6 text-center"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex max-w-sm flex-col items-center gap-3">
                    <div
                      className="grid h-11 w-11 place-items-center rounded-lg border"
                      style={{
                        borderColor: 'var(--color-border)',
                        background: 'var(--color-bg-elevated)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <PackagePlus style={{ width: 18, height: 18 }} />
                    </div>
                    <p className="text-sm font-semibold">No items added</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Add the first item to create and save the draft order.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <aside
              className="panel flex h-full w-full min-w-0 flex-col overflow-hidden rounded-lg border"
              style={{
                ...panelPaddingStyle,
                background: 'var(--color-bg-surface)',
                borderColor: 'var(--color-border)',
                top: 92,
              }}
            >
              <h2 style={panelTitleStyle}>Order Summary</h2>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                <SummaryRow label="Gross" value={money(computedSummary.grossAmount)} />
                {/* <SummaryRow
                  label="Category Discount"
                  value={money(computedSummary.totalCategoryDiscountAmount)}
                /> */}
                <SummaryEditableRow
                  label="SKU Discount"
                  value={skuDiscountInputValue}
                  onChange={updateOrderSkuDiscountAmount}
                />

                <SummaryEditableRow
                  label="Special Discount"
                  value={specialDiscountInputValue}
                  onChange={updateOrderSpecialDiscountAmount}
                />
                <SummaryRow label="VAT" value={money(computedSummary.vatAmount)} />
                <div style={{ borderTop: '1px solid var(--color-border)', margin: '2px 0' }} />
                <SummaryRow label="Net" strong value={money(computedSummary.netAmount)} />
              </div>

              <button
                className="button-primary mt-auto hidden w-full lg:flex"
                disabled={confirmDisabled}
                onClick={handleConfirm}
                type="button"
              >
                <CheckCircle2 style={{ width: 15, height: 15 }} />
                {isSaving ? 'Saving...' : 'Confirm Order'}
              </button>
            </aside>
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t p-3 lg:hidden"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-surface)',
          boxShadow: '0 -10px 24px rgba(15, 23, 42, 0.12)',
        }}
      >
        <button
          className="button-primary w-full"
          disabled={confirmDisabled}
          onClick={handleConfirm}
          type="button"
        >
          <CheckCircle2 style={{ width: 15, height: 15 }} />
          {isSaving ? 'Saving...' : 'Confirm Order'}
        </button>
      </div>
    </div>
  )
}

function MobileMetric({ label, value, strong = false }) {
  return (
    <div>
      <p className="form-label" style={{ fontSize: 10 }}>
        {label}
      </p>
      <p
        className="mono tabular-nums"
        style={{
          color: strong ? 'var(--color-teal)' : 'var(--color-text-primary)',
          fontWeight: strong ? 800 : 600,
        }}
      >
        {value}
      </p>
    </div>
  )
}

function Field({
  label,
  labelRight,
  labelRightColor = 'var(--color-teal)',
  children,
}) {
  return (
    <label className="block w-full min-w-0" style={{ fontSize: 10 }}>
      <span
        className="form-label"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: 12,
          fontSize: 10,
        }}
      >
        <span>{label}</span>

        {labelRight !== null && labelRight !== undefined ? (
          <span
            className="normal-case whitespace-nowrap"
            style={{
              marginLeft: 'auto',
              textAlign: 'right',
              color: labelRightColor,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {labelRight}
          </span>
        ) : null}
      </span>

      {children}
    </label>
  )
}

function ReadOnlyDisplay({ children }) {
  return (
    <div className="form-input w-full min-w-0" style={readOnlyDisplayStyle}>
      {children}
    </div>
  )
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span
        className="min-w-0"
        style={{
          color: strong ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          fontWeight: strong ? 800 : 500,
        }}
      >
        {label}
      </span>
      <span
        className="mono shrink-0 whitespace-nowrap tabular-nums"
        style={{
          color: strong ? 'var(--color-teal)' : 'var(--color-text-primary)',
          fontWeight: strong ? 900 : 600,
        }}
      >
        {value}
      </span>
    </div>
  )
}

function SummaryEditableRow({ label, value, onChange }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span
        className="min-w-0"
        style={{
          color: 'var(--color-text-muted)',
          fontWeight: 500,
        }}
      >
        {label}
      </span>

      <div
        className="flex shrink-0 items-center gap-1"
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          background: 'var(--color-bg-surface)',
          padding: '0 10px',
          height: 32,
        }}
      >
        <span
          className="mono shrink-0 whitespace-nowrap tabular-nums"
          style={{
            color: 'var(--color-text-muted)',
            fontWeight: 700,
          }}
        >
          Rs.
        </span>
        <input
          className="mono"
          inputMode="decimal"
          min="0"
          step="0.01"
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{
            width: 88,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
            textAlign: 'right',
            color: 'var(--color-text-primary)',
            fontWeight: 700,
          }}
        />
      </div>
    </div>
  )
}

function SearchablePicker({
  value,
  onChange,
  options,
  getLabel,
  getMeta = () => '',
  getSearchText,
  placeholder,
  emptyLabel = 'No matches found',
  disabled = false,
}) {
  const containerRef = useRef(null)
  const selectedOption = options.find((option) => option.id === value) || null
  const selectedLabel = selectedOption ? getLabel(selectedOption) : ''
  const [query, setQuery] = useState(selectedLabel)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  useEffect(() => {
    if (!isOpen) setQuery(selectedLabel)
  }, [isOpen, selectedLabel])

  useEffect(() => {
    if (!isOpen) return undefined

    function handleOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase()
    const matchedOptions = search
      ? options.filter((option) => {
          const searchText = getSearchText
            ? getSearchText(option)
            : `${getLabel(option)} ${getMeta(option)} ${option.id}`

          return searchText.toLowerCase().includes(search)
        })
      : options

    return matchedOptions.slice(0, 60)
  }, [getLabel, getMeta, getSearchText, options, query])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query])

  function selectOption(option) {
    onChange(option.id)
    setQuery(getLabel(option))
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
        className="form-input h-10"
        autoComplete="off"
        disabled={disabled}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
          if (value) onChange('')
        }}
        onFocus={(event) => {
          setIsOpen(true)
          event.target.select()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            if (isOpen && filteredOptions[highlightedIndex])
              selectOption(filteredOptions[highlightedIndex])
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            setIsOpen(true)
            setHighlightedIndex((current) =>
              Math.min(current + 1, Math.max(filteredOptions.length - 1, 0))
            )
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setHighlightedIndex((current) => Math.max(current - 1, 0))
          } else if (event.key === 'Escape') {
            setIsOpen(false)
            setQuery(selectedLabel)
          }
        }}
        placeholder={placeholder}
        role="combobox"
        type="text"
        value={query}
        style={{ width: '100%', paddingLeft: 32 }}
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
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => {
              const isHighlighted = index === highlightedIndex
              const meta = getMeta(option)

              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    selectOption(option)
                  }}
                  style={{
                    display: 'grid',
                    gap: 3,
                    width: '100%',
                    padding: '10px 12px',
                    border: 0,
                    borderBottom: '1px solid var(--color-border)',
                    background: isHighlighted ? 'rgba(125, 224, 232, 0.12)' : 'transparent',
                    color: 'var(--color-text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{getLabel(option)}</span>
                  {meta ? (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{meta}</span>
                  ) : null}
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

const panelPaddingStyle = {
  padding: '14px 20px',
}

const panelTitleStyle = {
  color: 'var(--color-text-primary)',
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.25,
}

const readOnlyDisplayStyle = {
  alignItems: 'center',
  backgroundColor: 'var(--color-bg-hover)',
  color: 'var(--color-text-muted)',
  display: 'flex',
  height: 40,
}
