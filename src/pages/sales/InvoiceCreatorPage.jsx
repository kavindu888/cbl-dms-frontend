import { ArrowLeft, Info, Plus, RotateCcw, Save, Search, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import DraftStatusBadge from '@/components/drafts/DraftStatusBadge'
import { inventoryService } from '@/services/api/inventoryService'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'
import { DISCOUNT_POLICY } from '@/constants/discountPolicy'
import { formatDate } from '@/utils'
import SimplePagination from '@components/ui/SimplePagination'
import {
  toNumber,
  getReturnDiscountPercent,
  getReturnCreditAmount,
  calculateSalesOrderSummary,
} from '@/utils/salesOrderCalculations'

const emptyLine = {
  productId: '',
  unitId: '',
  unitName: '',
  quantity: 1,
  mrp: 0,
  categoryDiscountPercent: 0,
  skuDiscountAvailable: false,
  skuDiscountMax: 0,
  skuDiscountPercent: 0,
  specialDiscountAvailable: false,
  specialDiscountMax: 0,
  specialDiscountPercent: 0,
}

function createDefaultValues() {
  return {
    customerId: '',
    salesRouteId: '',
    lines: [{ ...emptyLine }],
  }
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function fieldError(message) {
  return message ? <p className="form-error">{message}</p> : null
}

function getLineAmounts(line) {
  const mrp = Number(line?.mrp || 0)
  const quantity = Number(line?.quantity || 0)
  const categoryDiscountPercent = Number(line?.categoryDiscountPercent || 0)
  const skuDiscountPercent = Number(line?.skuDiscountPercent || 0)
  const specialDiscountPercent = Number(line?.specialDiscountPercent || 0)
  const totalDiscountPercent =
    categoryDiscountPercent + skuDiscountPercent + specialDiscountPercent
  const gross = mrp * quantity
  const categoryDiscountAmount = gross * (categoryDiscountPercent / 100)
  const skuDiscountAmount = gross * (skuDiscountPercent / 100)
  const specialDiscountAmount = gross * (specialDiscountPercent / 100)
  const discountAmount = categoryDiscountAmount + skuDiscountAmount + specialDiscountAmount
  const unitPrice = mrp * (1 - totalDiscountPercent / 100)
  const lineTotal = unitPrice * quantity

  return {
    gross,
    categoryDiscountAmount,
    skuDiscountAmount,
    specialDiscountAmount,
    discountAmount,
    unitPrice,
    lineTotal,
  }
}

function getInvoiceId(response) {
  if (typeof response === 'string' || typeof response === 'number') return String(response)

  return response?.id ?? response?.value ?? response?.data?.id ?? response?.data?.value ?? response?.data
}

const readOnlyDisplayStyle = {
  alignItems: 'center',
  backgroundColor: 'var(--color-bg-hover)',
  color: 'var(--color-text-muted)',
  cursor: 'default',
  display: 'flex',
  minHeight: 34,
  userSelect: 'none',
}

const returnReasonOptions = [
  { value: 1, label: 'Damaged' },
  { value: 2, label: 'Expired' },
  { value: 3, label: 'Short Expiry' },
  { value: 4, label: 'Unwanted' },
]

function todayInputDate() {
  return new Date().toISOString().slice(0, 10)
}

function toCalendarDateTimeOffset(dateValue) {
  return `${dateValue || todayInputDate()}T00:00:00.000Z`
}

function toInputDate(value) {
  if (!value) return ''
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

function returnReasonValue(value) {
  if (value === null || value === undefined || value === '') return 4
  if (!Number.isNaN(Number(value))) return Number(value)
  const normalized = String(value).toLowerCase()
  if (normalized === 'damaged') return 1
  if (normalized === 'expired') return 2
  if (normalized === 'shortexpiry' || normalized === 'short expiry') return 3
  return 4
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
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
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
          : `${getLabel(option)} ${getMeta(option)}`

        return searchText.toLowerCase().includes(search)
      })
      : options

    return matchedOptions.slice(0, 50)
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
        className="form-input"
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
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
            if (isOpen && filteredOptions[highlightedIndex]) {
              selectOption(filteredOptions[highlightedIndex])
            }
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
        style={{ width: '100%', height: 38, fontSize: 13, paddingLeft: 32 }}
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
                    padding: '9px 12px',
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

export default function InvoiceCreatorPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id: routeInvoiceId } = useParams()
  const orderState = location.state
  const isFromSalesOrder = orderState?.fromSalesOrder === true
  const isEditingDraftInvoice = Boolean(routeInvoiceId) && !isFromSalesOrder
  const hasPrefilledFromSalesOrder = useRef(false)
  const hasHydratedDraftInvoice = useRef(false)
  const draftSaveTimeout = useRef(null)
  const lastDraftPayloadRef = useRef('')
  const isHydratingDraftRef = useRef(false)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [salesRouteName, setSalesRouteName] = useState('')
  const [deliveryRunId, setDeliveryRunId] = useState('')
  const [deliveryRunName, setDeliveryRunName] = useState('')
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null)
  const [serialNumber, setSerialNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(todayInputDate())
  const [serialNumberWarning, setSerialNumberWarning] = useState(false)
  const [serialNumberChecking, setSerialNumberChecking] = useState(false)
  const [returnLines, setReturnLines] = useState([])
  const [returnDraftLine, setReturnDraftLine] = useState({
    productId: '',
    quantity: 1,
    reason: 4,
    mrp: 0,
    categoryDiscountPercent: 0,
    discountPercent: 0,
  })
  const [manualSkuDiscountAmount, setManualSkuDiscountAmount] = useState('')
  const [manualSpecialDiscountAmount, setManualSpecialDiscountAmount] = useState('')
  const [sourceOrderSummary, setSourceOrderSummary] = useState(null)
  const [draftInvoiceId, setDraftInvoiceId] = useState(routeInvoiceId || '')
  const [draftStatus, setDraftStatus] = useState(routeInvoiceId ? 'saved' : 'idle')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const serialCheckTimeout = useRef(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: createDefaultValues(),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const selectedCustomerId = useWatch({ control, name: 'customerId' })
  const selectedSalesRouteId = useWatch({ control, name: 'salesRouteId' })
  const watchedLines = useWatch({ control, name: 'lines' })
  const lines = useMemo(() => watchedLines || [], [watchedLines])
  const selectedCustomer = useMemo(() => {
    return customers.find((item) => item.id === selectedCustomerId) || null
  }, [customers, selectedCustomerId])
  const isCustomerVatRegistered = Boolean(selectedCustomerDetails?.isVatRegistered)

  const [linePage, setLinePage] = useState(1)
  const linePageSize = 5

  const pagedFields = useMemo(() => {
    const start = (linePage - 1) * linePageSize
    return fields.map((field, index) => ({ field, index })).slice(start, start + linePageSize)
  }, [fields, linePage])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(fields.length / linePageSize))
    if (linePage > totalPages) setLinePage(totalPages)
  }, [linePage, fields.length])

  const productById = useMemo(() => {
    return products.reduce((map, product) => {
      map[product.id] = product
      return map
    }, {})
  }, [products])

  const totals = useMemo(() => {
    const normalSubtotal = lines.reduce(
      (sum, line) => {
        const amounts = getLineAmounts(line)

        return {
          gross: sum.gross + amounts.gross,
          categoryDiscount: sum.categoryDiscount + amounts.categoryDiscountAmount,
          skuDiscount: sum.skuDiscount + amounts.skuDiscountAmount,
          specialDiscount: sum.specialDiscount + amounts.specialDiscountAmount,
          discount: sum.discount + amounts.discountAmount,
        }
      },
      { gross: 0, categoryDiscount: 0, skuDiscount: 0, specialDiscount: 0, discount: 0 }
    )

    const sourceSkuDiscount =
      sourceOrderSummary?.skuDiscount ??
      (manualSkuDiscountAmount === ''
        ? normalSubtotal.skuDiscount
        : Math.max(0, Number(manualSkuDiscountAmount || 0)))

    const sourceSpecialDiscount =
      sourceOrderSummary?.specialDiscount ??
      (manualSpecialDiscountAmount === ''
        ? normalSubtotal.specialDiscount
        : Math.max(0, Number(manualSpecialDiscountAmount || 0)))

    const returnTotal = returnLines.reduce(
      (sum, line) => sum + getReturnCreditAmount(line),
      0
    )

    const gross =
      isFromSalesOrder && sourceOrderSummary
        ? sourceOrderSummary.gross
        : normalSubtotal.gross

    const calculatedVat = isCustomerVatRegistered
      ? Math.round(Math.max(0, normalSubtotal.gross - normalSubtotal.categoryDiscount - sourceSkuDiscount - sourceSpecialDiscount - returnTotal) * 18) / 100
      : 0

    const vat =
      isFromSalesOrder && sourceOrderSummary
        ? sourceOrderSummary.vat
        : calculatedVat

    const net =
      gross -
      normalSubtotal.categoryDiscount -
      sourceSkuDiscount -
      sourceSpecialDiscount -
      returnTotal +
      vat

    return {
      gross,
      categoryDiscount: normalSubtotal.categoryDiscount,
      skuDiscount: sourceSkuDiscount,
      specialDiscount: sourceSpecialDiscount,
      returnTotal,
      vat,
      net,
    }
  }, [
    lines,
    returnLines,
    sourceOrderSummary,
    isFromSalesOrder,
    isCustomerVatRegistered,
    manualSkuDiscountAmount,
    manualSpecialDiscountAmount,
  ])

  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true)
      setLoadError('')

      try {
        const [customerPage, productPage] = await Promise.all([
          salesService.listAllCustomers({ pageSize: 100, isActive: true }),
          masterService.listAllProducts({ pageSize: 100, status: 'Active' }),
        ])

        setCustomers(customerPage || [])
        setProducts(productPage || [])
      } catch (error) {
        setLoadError(error.message)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    return () => {
      if (serialCheckTimeout.current) clearTimeout(serialCheckTimeout.current)
    }
  }, [])

  useEffect(() => {
    if (!isFromSalesOrder || !orderState || hasPrefilledFromSalesOrder.current) return

    hasPrefilledFromSalesOrder.current = true
    setSerialNumber('')
    setSerialNumberWarning(false)
    setSerialNumberChecking(false)

    async function fetchAndPrefillOrder() {
      setIsLoadingData(true)
      try {
        const order = await salesService.getSalesOrder(orderState.salesOrderId)
        const normalizedSummary = calculateSalesOrderSummary(order)
        setSourceOrderSummary(normalizedSummary)

        setSelectedCustomerDetails({
          id: order.customerId,
          name: order.customerName,
          salesRouteId: order.salesRouteId,
          salesRouteName: order.salesRouteName,
          isVatRegistered: Boolean(order.isVatApplicable),
          taxNumber: order.customerVatTin || '',
        })
        setSalesRouteName(order.salesRouteName || '')
        const orderLines = order.lines || []
        const normalLines = orderLines.filter((line) => !line.isReturnLine)
        const orderReturnLines = orderLines.filter((line) => line.isReturnLine)

        setReturnLines(orderReturnLines)

        const prefilledLines = normalLines.map((line) => ({
          productId: line.productId || '',
          unitId: line.unitId || line.smallestUnitCode || line.smallestUnitName || line.unitName || '',
          unitName: line.smallestUnitName || line.smallestUnitCode || line.unitName || '',
          quantity: Number(line.quantity || 0),
          mrp: Number(line.mrp || 0),
          categoryDiscountPercent: Number(line.categoryDiscountPercent || 0),
          skuDiscountAvailable: Number(line.skuDiscountPercent || 0) > 0,
          skuDiscountMax: Number(line.skuDiscountPercent || 0),
          skuDiscountPercent: Number(line.skuDiscountPercent || 0),
          specialDiscountAvailable: Number(line.specialDiscountPercent || 0) > 0,
          specialDiscountMax: Number(line.specialDiscountPercent || 0),
          specialDiscountPercent: Number(line.specialDiscountPercent || 0),
        }))

        reset({
          customerId: order.customerId || '',
          salesRouteId: order.salesRouteId || '',
          lines: prefilledLines.length ? prefilledLines : [{ ...emptyLine }],
        })
        setLinePage(1)
      } catch (err) {
        toast.error('Unable to fetch latest Sales Order detail.')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchAndPrefillOrder()
  }, [isFromSalesOrder, orderState, reset])

  useEffect(() => {
    setValue('salesRouteId', selectedCustomer?.salesRouteId || '')
  }, [selectedCustomer, setValue])

  useEffect(() => {
    let isCurrent = true

    async function loadSelectedCustomerDetails() {
      if (!selectedCustomerId) {
        setSelectedCustomerDetails(null)
        return
      }

      setSelectedCustomerDetails(null)

      try {
        const customer = await salesService.getCustomer(selectedCustomerId)
        if (isCurrent) setSelectedCustomerDetails(customer)
      } catch {
        if (isCurrent) setSelectedCustomerDetails(null)
      }
    }

    loadSelectedCustomerDetails()

    return () => {
      isCurrent = false
    }
  }, [selectedCustomerId])

  useEffect(() => {
    if (!routeInvoiceId || isFromSalesOrder || hasHydratedDraftInvoice.current) return
    hasHydratedDraftInvoice.current = true
    isHydratingDraftRef.current = true

    async function hydrateDraftInvoice() {
      setIsLoadingData(true)
      try {
        const invoice = await salesService.getInvoice(routeInvoiceId)
        if (invoice.status !== 'Draft') {
          toast.error('Only draft invoices can be edited.')
          navigate(`/sales/invoices/${routeInvoiceId}`, { replace: true })
          return
        }

        const normalLines = (invoice.lines || []).filter((line) => !line.isReturnLine)
        const invoiceReturnLines = (invoice.lines || []).filter((line) => line.isReturnLine)

        reset({
          customerId: invoice.customerId || '',
          salesRouteId: invoice.salesRouteId || '',
          lines: normalLines.length
            ? normalLines.map((line) => ({
                productId: line.productId || '',
                unitId: line.unitId || line.smallestUnitCode || '',
                unitName: line.smallestUnitCode || line.unitId || '',
                quantity: Number(line.quantity || 0),
                mrp: Number(line.mrp || 0),
                categoryDiscountPercent: Number(line.categoryDiscountPercent || 0),
                skuDiscountAvailable: Number(line.skuDiscountPercent || 0) > 0,
                skuDiscountMax: Math.max(Number(line.skuDiscountPercent || 0), 5),
                skuDiscountPercent: Number(line.skuDiscountPercent || 0),
                specialDiscountAvailable: Number(line.specialDiscountPercent || 0) > 0,
                specialDiscountMax: Math.max(Number(line.specialDiscountPercent || 0), 10),
                specialDiscountPercent: Number(line.specialDiscountPercent || 0),
              }))
            : [{ ...emptyLine }],
        })

        setSerialNumber(invoice.serialNumber || '')
        setInvoiceDate(toInputDate(invoice.invoiceDate) || todayInputDate())
        setReturnLines(
          invoiceReturnLines.map((line) => ({
            id: line.id,
            productId: line.productId,
            quantity: Number(line.quantity || 0),
            reason: returnReasonValue(line.returnReason),
            returnReason: returnReasonValue(line.returnReason),
            mrp: Number(line.mrp || 0),
            categoryDiscountPercent: Number(line.categoryDiscountPercent || 0),
            discountPercent: Number(line.totalDiscountPercent || 0),
            skuDiscountPercent: 0,
            specialDiscountPercent: 0,
            isReturnLine: true,
          }))
        )
        setManualSkuDiscountAmount(
          Number(invoice.totalSkuDiscountAmount || 0) > 0
            ? String(Number(invoice.totalSkuDiscountAmount || 0))
            : ''
        )
        setManualSpecialDiscountAmount(
          Number(invoice.totalSpecialDiscountAmount || 0) > 0
            ? String(Number(invoice.totalSpecialDiscountAmount || 0))
            : ''
        )
        setDraftInvoiceId(invoice.id)
        setDraftStatus('saved')
        setLastSavedAt(invoice.updatedAt || invoice.invoiceDate || null)
        setLinePage(1)
        lastDraftPayloadRef.current = ''
      } catch (error) {
        toast.error(error?.message || 'Unable to load draft invoice.')
      } finally {
        isHydratingDraftRef.current = false
        setIsLoadingData(false)
      }
    }

    hydrateDraftInvoice()
  }, [isFromSalesOrder, navigate, reset, routeInvoiceId])

  useEffect(() => {
    let isCurrent = true

    async function loadSalesRouteName() {
      if (!selectedSalesRouteId) {
        setSalesRouteName('')
        setDeliveryRunId('')
        setDeliveryRunName('')
        return
      }

      setSalesRouteName('')
      setDeliveryRunId('')
      setDeliveryRunName('')

      try {
        if (selectedCustomerDetails?.salesRouteName) {
          if (isCurrent) setSalesRouteName(selectedCustomerDetails.salesRouteName)
        }

        const route = await masterService.getSalesRoute(selectedSalesRouteId)
        if (isCurrent) {
          setSalesRouteName(selectedCustomerDetails?.salesRouteName || route?.name || '')
          setDeliveryRunId(route?.defaultDeliveryRunId || '')
          setDeliveryRunName(route?.defaultDeliveryRunName || '')
        }
      } catch {
        if (isCurrent) {
          setSalesRouteName('')
          setDeliveryRunId('')
          setDeliveryRunName('')
        }
      }
    }

    loadSalesRouteName()

    return () => {
      isCurrent = false
    }
  }, [selectedSalesRouteId, selectedCustomerDetails])

  async function handleProductChange(index, productId) {
    if (!productId) {
      setValue(`lines.${index}.unitId`, '', { shouldDirty: true })
      setValue(`lines.${index}.unitName`, '', { shouldDirty: true })
      setValue(`lines.${index}.mrp`, 0, { shouldDirty: true })
      setValue(`lines.${index}.categoryDiscountPercent`, 0, { shouldDirty: true })
      setValue(`lines.${index}.skuDiscountAvailable`, false, { shouldDirty: true })
      setValue(`lines.${index}.skuDiscountMax`, 0, { shouldDirty: true })
      setValue(`lines.${index}.skuDiscountPercent`, 0, { shouldDirty: true })
      setValue(`lines.${index}.specialDiscountAvailable`, false, { shouldDirty: true })
      setValue(`lines.${index}.specialDiscountMax`, 0, { shouldDirty: true })
      setValue(`lines.${index}.specialDiscountPercent`, 0, { shouldDirty: true })
      return
    }

    try {
      const [product, uomChain, prices] = await Promise.all([
        masterService.getProduct(productId),
        masterService.getProductUomChain(productId).catch(() => null),
        inventoryService.getLastPrices(productId).catch(() => null),
      ])
      const categoryId = product.categoryId || product.category?.id || ''
      const [categoryDiscount, skuDiscountInfo, specialDiscount] = await Promise.all([
        categoryId ? masterService.getActiveCategoryDiscount(categoryId).catch(() => null) : null,
        masterService.getSkuDiscountInfo(product.id).catch(() => null),
        categoryId ? masterService.getActiveSpecialDiscount(categoryId).catch(() => null) : null,
      ])
      const smallestUnit =
        uomChain?.smallestUomCode ||
        product.smallestUnitName ||
        product.smallestUnitId ||
        product.uomBase

      setValue(`lines.${index}.unitId`, product.smallestUnitId || smallestUnit || '', {
        shouldDirty: true,
      })
      setValue(`lines.${index}.unitName`, smallestUnit || '', { shouldDirty: true })
      setValue(
        `lines.${index}.mrp`,
        Number(product.mrp || prices?.lastMrp || product.sellingPrice || 0),
        {
          shouldDirty: true,
        }
      )
      setValue(`lines.${index}.categoryDiscountPercent`, categoryDiscount ?? 0, {
        shouldDirty: true,
      })
      setValue(`lines.${index}.skuDiscountAvailable`, skuDiscountInfo?.hasSkuDiscount ?? false, {
        shouldDirty: true,
      })
      setValue(`lines.${index}.skuDiscountMax`, skuDiscountInfo?.maxSkuDiscountPercent ?? 0, {
        shouldDirty: true,
      })
      setValue(`lines.${index}.skuDiscountPercent`, 0, { shouldDirty: true })
      setValue(`lines.${index}.specialDiscountAvailable`, specialDiscount !== null, {
        shouldDirty: true,
      })
      setValue(`lines.${index}.specialDiscountMax`, specialDiscount ?? 0, { shouldDirty: true })
      setValue(`lines.${index}.specialDiscountPercent`, 0, { shouldDirty: true })
    } catch (error) {
      toast.error(error?.message || 'Unable to load product details.')
      const product = productById[productId]
      setValue(`lines.${index}.unitId`, product?.smallestUnitId || product?.uomBase || '', {
        shouldDirty: true,
      })
      setValue(`lines.${index}.unitName`, product?.smallestUnitName || product?.uomBase || '', {
        shouldDirty: true,
      })
      setValue(`lines.${index}.mrp`, Number(product?.mrp || product?.sellingPrice || 0), {
        shouldDirty: true,
      })
    }
  }

  async function handleReturnProductChange(productId) {
    if (!productId) {
      setReturnDraftLine({
        productId: '',
        quantity: 1,
        reason: 4,
        mrp: 0,
        categoryDiscountPercent: 0,
        discountPercent: 0,
      })
      return
    }

    try {
      const [product, prices] = await Promise.all([
        masterService.getProduct(productId),
        inventoryService.getLastPrices(productId).catch(() => null),
      ])
      const categoryId = product.categoryId || product.category?.id || ''
      const categoryDiscount = categoryId
        ? await masterService.getActiveCategoryDiscount(categoryId).catch(() => null)
        : null

      setReturnDraftLine((current) => ({
        ...current,
        productId,
        mrp: Number(product.mrp || prices?.lastMrp || product.sellingPrice || 0),
        categoryDiscountPercent: Number(categoryDiscount || 0),
        discountPercent: Number(categoryDiscount || 0),
      }))
    } catch (error) {
      toast.error(error?.message || 'Unable to load return product details.')
      const product = productById[productId]
      setReturnDraftLine((current) => ({
        ...current,
        productId,
        mrp: Number(product?.mrp || product?.sellingPrice || 0),
        categoryDiscountPercent: 0,
        discountPercent: 0,
      }))
    }
  }

  function handleAddReturnLine() {
    if (!returnDraftLine.productId) {
      toast.error('Return product is required.')
      return
    }

    if (Number(returnDraftLine.quantity) <= 0) {
      toast.error('Return quantity must be greater than zero.')
      return
    }

    const returnLine = {
      id: `return-${Date.now()}`,
      productId: returnDraftLine.productId,
      quantity: Number(returnDraftLine.quantity),
      mrp: Number(returnDraftLine.mrp || 0),
      categoryDiscountPercent: Number(returnDraftLine.categoryDiscountPercent || 0),
      discountPercent: Number(returnDraftLine.categoryDiscountPercent || 0),
      skuDiscountPercent: 0,
      specialDiscountPercent: 0,
      isReturnLine: true,
      returnReason: Number(returnDraftLine.reason || 4),
    }

    setReturnLines((current) => [...current, returnLine])
    setReturnDraftLine({
      productId: '',
      quantity: 1,
      reason: 4,
      mrp: 0,
      categoryDiscountPercent: 0,
      discountPercent: 0,
    })
  }

  function handleSerialNumberChange(value) {
    // Allow only English letters and numbers
    const cleanedValue = value.replace(/[^a-zA-Z0-9]/g, '')

    setSerialNumber(cleanedValue)
    setSerialNumberWarning(false)
    setSerialNumberChecking(false)

    if (serialCheckTimeout.current) {
      clearTimeout(serialCheckTimeout.current)
    }

    if (!cleanedValue) return

    serialCheckTimeout.current = setTimeout(async () => {
      setSerialNumberChecking(true)

      try {
        const result = await salesService.checkSerialNumberExists(cleanedValue)
        setSerialNumberWarning(Boolean(result.exists))
      } catch (error) {
        console.error('Serial number check failed:', error)
      } finally {
        setSerialNumberChecking(false)
      }
    }, 600)
  }

  function handleClear() {
    if (serialCheckTimeout.current) clearTimeout(serialCheckTimeout.current)
    setSerialNumber('')
    setInvoiceDate(todayInputDate())
    setSerialNumberWarning(false)
    setSerialNumberChecking(false)
    reset(createDefaultValues())
    setReturnLines([])
    setDeliveryRunId('')
    setDeliveryRunName('')
    setReturnDraftLine({
      productId: '',
      quantity: 1,
      reason: 4,
      mrp: 0,
      categoryDiscountPercent: 0,
      discountPercent: 0,
    })
    setManualSkuDiscountAmount('')
    setManualSpecialDiscountAmount('')
  }

  function validate(values) {
    const cleanedSerialNumber = serialNumber.trim()
    if (!cleanedSerialNumber) {
      return 'Serial Number is required.'
    }

    if (!/^[a-zA-Z0-9]+$/.test(cleanedSerialNumber)) {
      return 'Serial Number can contain only letters and numbers.'
    }

    if (!values.customerId) {
      return 'Customer is required.'
    }

    if (!values.salesRouteId) {
      return 'Selected customer does not have a sales route.'
    }

    if (!invoiceDate) {
      return 'Invoice date is required.'
    }

    const invalidLine = values.lines.find(
      (line) =>
        !line.productId ||
        Number(line.quantity) <= 0 ||
        Number(line.skuDiscountPercent || 0) < 0 ||
        Number(line.skuDiscountPercent || 0) > Number(line.skuDiscountMax || 0) ||
        Number(line.specialDiscountPercent || 0) < 0 ||
        Number(line.specialDiscountPercent || 0) >
        Number(line.specialDiscountMax || 0) ||
        Number(line.categoryDiscountPercent || 0) +
        Number(line.skuDiscountPercent || 0) +
        Number(line.specialDiscountPercent || 0) >
        DISCOUNT_POLICY.MAX_DISCOUNT_PERCENT
    )

    if (invalidLine) {
      return 'Each line needs a product, quantity, and discounts within their allowed maximums.'
    }

    const maxManualDiscount = Math.max(0, totals.gross - totals.categoryDiscount)
    if (totals.skuDiscount + totals.specialDiscount > maxManualDiscount) {
      return 'SKU discount and special discount cannot exceed the gross amount after category discount.'
    }

    return ''
  }

  async function resolveVehicleLocationForDirectInvoice() {
    if (isFromSalesOrder) return null

    if (!deliveryRunId) {
      throw new Error('Selected route does not have a delivery run assigned.')
    }

    const appliedLoadings = await inventoryService.listVehicleLoadings({ status: 2 })
    const matchingLoadings = appliedLoadings.filter(
      (loading) =>
        loading.deliveryRunId === deliveryRunId &&
        toInputDate(loading.loadingDate) === invoiceDate
    )

    if (matchingLoadings.length === 0) {
      throw new Error(
        `No applied vehicle loading found for ${deliveryRunName || 'this delivery run'} on ${invoiceDate}.`
      )
    }

    const vehicleLocationIds = Array.from(
      new Set(matchingLoadings.map((loading) => loading.vehicleLocationId).filter(Boolean))
    )

    if (vehicleLocationIds.length !== 1) {
      throw new Error(
        `Multiple vehicles are loaded for ${deliveryRunName || 'this delivery run'} on ${invoiceDate}. Select the correct vehicle before invoicing.`
      )
    }

    return vehicleLocationIds[0]
  }

  function buildInvoicePayload(values, vehicleLocationId = null) {
    return {
      customerId: values.customerId,
      salesRouteId: values.salesRouteId,
      serialNumber: serialNumber.trim(),
      invoiceDate: toCalendarDateTimeOffset(invoiceDate),
      dueDate: null,
      isTaxInvoice: isCustomerVatRegistered,
      customerVatTin: selectedCustomerDetails?.taxNumber || null,
      notes: null,
      vehicleLocationId,
      manualSkuDiscountAmount: totals.skuDiscount,
      manualSpecialDiscountAmount: totals.specialDiscount,
      lines: [
        ...values.lines
          .filter((line) => line.productId && Number(line.quantity) > 0)
          .map((line) => ({
            productId: line.productId,
            quantity: Number(line.quantity),
            skuDiscountPercent: Number(line.skuDiscountPercent || 0),
            specialDiscountPercent: Number(line.specialDiscountPercent || 0),
          })),
        ...returnLines
          .filter((line) => line.productId && Number(line.quantity) > 0)
          .map((line) => ({
            productId: line.productId,
            quantity: Math.abs(Number(line.quantity || 0)),
            skuDiscountPercent: 0,
            specialDiscountPercent: 0,
            isReturnLine: true,
            returnReason: returnReasonValue(line.returnReason || line.reason),
          })),
      ],
    }
  }

  async function saveInvoiceDraft(values = getValues(), { immediate = false } = {}) {
    if (isFromSalesOrder || !values.customerId || !values.salesRouteId) return draftInvoiceId
    if (isHydratingDraftRef.current) return draftInvoiceId

    const payload = buildInvoicePayload(values)
    const payloadJson = JSON.stringify(payload)
    if (payloadJson === lastDraftPayloadRef.current && draftInvoiceId) return draftInvoiceId

    async function persist() {
      setDraftStatus('saving')
      try {
        let id = draftInvoiceId
        if (!id) {
          const response = await salesService.createInvoiceDraft(payload)
          id = getInvoiceId(response)
          setDraftInvoiceId(id)
          if (!routeInvoiceId && id) {
            navigate(`/sales/invoices/${id}/edit`, { replace: true })
          }
        }
        if (id) {
          await salesService.updateInvoiceDraft(id, payload)
          lastDraftPayloadRef.current = payloadJson
          setLastSavedAt(new Date().toISOString())
          setDraftStatus('saved')
        }
        return id
      } catch (error) {
        setDraftStatus('error')
        if (immediate) throw error
        return draftInvoiceId
      }
    }

    if (immediate) return persist()

    if (draftSaveTimeout.current) clearTimeout(draftSaveTimeout.current)
    draftSaveTimeout.current = setTimeout(() => {
      persist().catch(() => {})
    }, 1200)
    setDraftStatus('saving')
    return draftInvoiceId
  }

  useEffect(() => {
    if (isFromSalesOrder || isHydratingDraftRef.current) return undefined
    if (!selectedCustomerId || !selectedSalesRouteId) return undefined

    saveInvoiceDraft()

    return () => {
      if (draftSaveTimeout.current) clearTimeout(draftSaveTimeout.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCustomerId,
    selectedSalesRouteId,
    serialNumber,
    invoiceDate,
    lines,
    returnLines,
    manualSkuDiscountAmount,
    manualSpecialDiscountAmount,
    isCustomerVatRegistered,
    selectedCustomerDetails?.taxNumber,
  ])

  async function onSubmit(values) {
    const validationMessage = validate(values)
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }

    let vehicleLocationId = null
    try {
      vehicleLocationId = await resolveVehicleLocationForDirectInvoice()
    } catch (error) {
      toast.error(error.message)
      return
    }

    const payload = buildInvoicePayload(values, vehicleLocationId)

    setIsSaving(true)
    try {
      const response = isFromSalesOrder
        ? await salesService.convertSalesOrderToInvoice(orderState.salesOrderId, {
            serialNumber: serialNumber.trim(),
            notes: null,
          })
        : await (async () => {
            const id = await saveInvoiceDraft(values, { immediate: true })
            await salesService.finalizeInvoiceDraft(id, { vehicleLocationId: payload.vehicleLocationId })
            return id
          })()
      console.log('Create invoice response:', response)
      console.log('Type:', typeof response)
      const invoiceId = getInvoiceId(response)
      handleClear()
      setSelectedCustomerDetails(null)
      setSalesRouteName('')
      setLinePage(1)
      if (isFromSalesOrder) {
        toast.success('Sales order converted to invoice.')
        navigate(invoiceId ? `/sales/invoices/${invoiceId}` : '/sales/invoices/new', { replace: true })
      } else {
        toast.success('Invoice created successfully.')
        navigate(invoiceId ? `/sales/invoices/${invoiceId}` : '/sales/invoices', { replace: true })
      }
    } catch (error) {
      toast.error(error?.message || 'Invoice could not be created.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflow: 'hidden',
      }}
    >
      <div>
        {isFromSalesOrder ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
              border: 0,
              background: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: 13,
              padding: 0,
            }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Back to Sales Order
          </button>
        ) : null}
        <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {isFromSalesOrder
              ? 'Convert to Invoice'
              : isEditingDraftInvoice
                ? 'Edit Draft Invoice'
                : 'Create Invoice'}
          </h1>
          {!isFromSalesOrder ? (
            <DraftStatusBadge status={draftStatus} lastSavedAt={lastSavedAt} />
          ) : null}
        </div>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          {isFromSalesOrder
            ? `Converting Sales Order ${orderState.salesOrderNumber || ''}. You can adjust before saving.`
            : isEditingDraftInvoice
              ? 'Changes stay as a draft until the invoice is finalized.'
              : `Backend creates the invoice with today's server date: ${formatDate(new Date())}.`}
        </p>
      </div>

      {isFromSalesOrder ? (
        <div
          className="panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderColor: 'rgba(125, 224, 232, 0.3)',
            background: 'rgba(125, 224, 232, 0.08)',
            color: 'var(--color-accent)',
          }}
        >
          <Info style={{ width: 16, height: 16, flex: '0 0 auto' }} />
          <p style={{ margin: 0, fontSize: 13 }}>
            Pre-filled from Sales Order{' '}
            <span className="mono" style={{ fontWeight: 800 }}>
              {orderState.salesOrderNumber}
            </span>
            . Review and adjust before saving.
          </p>
        </div>
      ) : null}

      {loadError && (
        <div className="panel" style={{ padding: 16, color: 'var(--color-danger)' }}>
          {loadError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 440px)',
          alignItems: 'stretch',
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        <section
          className="panel"
          style={{
            padding: 14,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Invoice Lines
              </h2>
              <p style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-muted)' }}>
                Add products, quantities, pricing, and discounts.
              </p>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                append({ ...emptyLine })
                const nextCount = fields.length + 1
                setLinePage(Math.ceil(nextCount / linePageSize))
              }}
              style={{ height: 34 }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add Item
            </button>
          </div>

          {!isFromSalesOrder ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(240px, 1fr) 90px 130px 130px 120px',
                gap: 10,
                alignItems: 'end',
                marginBottom: 14,
                padding: 12,
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'rgba(32, 212, 191, 0.04)',
              }}
            >
              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Return Product
                </label>
                <SearchablePicker
                  value={returnDraftLine.productId}
                  onChange={handleReturnProductChange}
                  options={products}
                  getLabel={(product) =>
                    [product.sku, product.name].filter(Boolean).join(' - ') ||
                    product.id ||
                    ''
                  }
                  getMeta={(product) =>
                    [product.baseUom || product.uomBase, product.category?.name]
                      .filter(Boolean)
                      .join(' - ')
                  }
                  placeholder="Type SKU or product name..."
                  emptyLabel="No matching active products"
                  disabled={isLoadingData || isSaving}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Qty
                </label>
                <input
                  className="form-input mono text-right"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={returnDraftLine.quantity}
                  onChange={(event) =>
                    setReturnDraftLine((current) => ({
                      ...current,
                      quantity: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Reason
                </label>
                <select
                  className="form-input"
                  value={returnDraftLine.reason}
                  onChange={(event) =>
                    setReturnDraftLine((current) => ({
                      ...current,
                      reason: Number(event.target.value),
                    }))
                  }
                  style={{ height: 38 }}
                >
                  {returnReasonOptions.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Credit
                </label>
                <div
                  className="form-input mono text-right"
                  style={{
                    ...readOnlyDisplayStyle,
                    justifyContent: 'flex-end',
                    padding: '0 10px',
                  }}
                >
                  {money(getReturnCreditAmount(returnDraftLine))}
                </div>
              </div>
              <button
                type="button"
                className="button-secondary"
                onClick={handleAddReturnLine}
                disabled={isSaving || !returnDraftLine.productId}
                style={{ height: 38 }}
              >
                <Plus style={{ width: 14, height: 14 }} />
                Return
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto" style={{ flex: 1, overflowY: 'visible', minHeight: 0 }}>
            <table
              className="data-table"
              style={{
                width: '100%',
                minWidth: 980,
                tableLayout: 'fixed',
              }}
            >
              <colgroup>
                <col style={{ width: 280 }} /> {/* Product */}
                <col style={{ width: 120 }} /> {/* Smallest Unit */}
                <col style={{ width: 90 }} />  {/* MRP */}
                <col style={{ width: 80 }} />  {/* QTY */}
                <col style={{ width: 110 }} /> {/* Category Discount */}
                <col style={{ width: 120 }} /> {/* Selling Price */}
                <col style={{ width: 130 }} /> {/* Total */}
                <col style={{ width: 50 }} />  {/* Delete */}
              </colgroup>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Smallest Unit</th>
                  <th className="text-right">MRP</th>
                  <th className="text-right">Qty</th>
                  <th style={{ textAlign: 'right', paddingRight: 16 }}>
                    Cat. Disc %
                  </th>

                  <th style={{ textAlign: 'right', paddingRight: 16 }}>
                    Selling Price
                  </th>

                  <th style={{ textAlign: 'right', paddingRight: 16 }}>
                    Total
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagedFields.map(({ field, index }) => {
                  const line = lines[index] || emptyLine
                  const { unitPrice, lineTotal } = getLineAmounts(line)

                  return (
                    <tr key={field.id}>
                      <td>
                        <input type="hidden" {...register(`lines.${index}.productId`)} />
                        <SearchablePicker
                          value={line.productId}
                          onChange={(productId) => {
                            setValue(`lines.${index}.productId`, productId, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                            handleProductChange(index, productId)
                          }}
                          options={products}
                          getLabel={(product) =>
                            [product.sku, product.name].filter(Boolean).join(' - ') ||
                            product.id ||
                            ''
                          }
                          getMeta={(product) =>
                            [product.baseUom || product.uomBase, product.category?.name]
                              .filter(Boolean)
                              .join(' • ')
                          }
                          getSearchText={(product) =>
                            [
                              product.sku,
                              product.name,
                              product.barcode,
                              product.category?.name,
                              product.id,
                            ]
                              .filter(Boolean)
                              .join(' ')
                          }
                          placeholder={
                            isLoadingData
                              ? 'Loading products...'
                              : products.length
                                ? 'Type SKU or product name...'
                                : 'No active products available'
                          }
                          emptyLabel="No matching active products"
                          disabled={isLoadingData || isSaving}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          {...register(`lines.${index}.unitName`)}
                          readOnly
                          tabIndex={-1}
                          style={readOnlyDisplayStyle}
                        />
                        <input type="hidden" {...register(`lines.${index}.unitId`)} />
                      </td>
                      <td style={{ paddingLeft: 8, paddingRight: 8 }}>
                        <div
                          className="form-input mono text-right"
                          style={{
                            ...readOnlyDisplayStyle,
                            width: '100%',
                            minWidth: 0,
                            boxSizing: 'border-box',
                            justifyContent: 'flex-end',
                            padding: '0 8px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                          }}
                        >
                          {Number(line.mrp || 0).toFixed(2)}
                        </div>
                      </td>
                      <td style={{ paddingLeft: 8, paddingRight: 8 }}>
                        <input
                          className="form-input mono text-right"
                          type="number"
                          step="0.01"
                          {...register(`lines.${index}.quantity`)}
                          style={{
                            width: '100%',
                            minWidth: 0,
                            boxSizing: 'border-box',
                            paddingLeft: 8,
                            paddingRight: 8,
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 16 }}>
                        <span
                          className="mono"
                          style={{
                            color: 'var(--color-text-muted)',
                            display: 'block',
                            width: '100%',
                            textAlign: 'right',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {Number(line.categoryDiscountPercent || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td
                        className="mono"
                        style={{
                          color: 'var(--color-text-muted)',
                          textAlign: 'right',
                          paddingRight: 16,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {money(unitPrice)}
                      </td>

                      <td
                        className="mono"
                        style={{
                          textAlign: 'right',
                          paddingRight: 16,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {money(lineTotal)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          style={{ width: 32, height: 32 }}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                 {returnLines.map((line) => {
                  const product = productById[line.productId] || null
                  const sku = product?.sku || product?.productSku || line.productId
                  const name = product?.name || product?.productName || 'Unknown Product'
                  const mrp = toNumber(line.mrp ?? line.unitPrice ?? 0)
                  const quantity = Math.abs(toNumber(line.quantity))
                  const discountPercent = getReturnDiscountPercent(line)
                  const unitPrice = mrp * (1 - discountPercent / 100)
                  const totalCredit = getReturnCreditAmount(line)

                  return (
                    <tr key={line.id} style={{ opacity: 0.85, background: 'rgba(32, 212, 191, 0.03)' }}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="mono" style={{ fontSize: 12, fontWeight: 'bold' }}>{sku}</span>
                            <span
                              style={{
                                padding: '1px 5px',
                                borderRadius: 4,
                                border: '1px solid rgba(32, 212, 191, 0.35)',
                                background: 'rgba(32, 212, 191, 0.1)',
                                color: 'var(--color-teal)',
                                fontSize: 9,
                                fontWeight: 'bold'
                              }}
                            >
                              RETURN
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{name}</span>
                        </div>
                      </td>
                      <td className="mono" style={{ color: 'var(--color-text-muted)' }}>RET</td>
                      <td className="mono text-right" style={{ color: 'var(--color-text-muted)' }}>{mrp.toFixed(2)}</td>
                      <td className="mono text-right" style={{ color: 'var(--color-text-muted)' }}>-{quantity}</td>
                      <td className="mono text-right" style={{ color: 'var(--color-text-muted)' }}>{discountPercent.toFixed(2)}%</td>
                      <td className="mono text-right" style={{ color: 'var(--color-text-muted)' }}>{unitPrice.toFixed(2)}</td>
                      <td className="mono text-right font-semibold" style={{ color: 'var(--color-teal)' }}>-{totalCredit.toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() =>
                            setReturnLines((current) =>
                              current.filter((item) => item.id !== line.id)
                            )
                          }
                          disabled={isSaving}
                          style={{ width: 32, height: 32 }}
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

          {fields.length > linePageSize ? (
            <div style={{ padding: '12px 14px 10px', borderTop: '1px solid var(--color-border)' }}>
              <SimplePagination
                page={linePage}
                pageSize={linePageSize}
                totalItems={fields.length}
                onPageChange={setLinePage}
                itemLabel="items"
              />
            </div>
          ) : null}
        </section>

        <aside
          className="panel"
          style={{
            padding: 16,
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Add New Invoice
            </h2>
            <p style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Route is taken from the selected customer.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
            <p className="form-label" style={{ fontSize: 10 }}>
              Basic Information
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Serial Number *
                </label>
                <input
                  className="form-input"
                  type="text"
                  required
                  maxLength={20}
                  pattern="[A-Za-z0-9]+"
                  title="Serial Number can contain only letters and numbers."
                  value={serialNumber}
                  onChange={(event) => handleSerialNumberChange(event.target.value)}
                  placeholder="Enter CBL POS serial number"
                  disabled={isSaving}
                  style={{ width: '100%', height: 38, fontSize: 13 }}
                />
                {serialNumberWarning ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                      marginTop: 6,
                      color: 'var(--color-amber)',
                    }}
                  >
                    <TriangleAlert
                      aria-hidden="true"
                      style={{ width: 13, height: 13, marginTop: 1, flex: '0 0 auto' }}
                    />
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.35 }}>
                      Serial number {serialNumber} has already been used on another invoice. You
                      can still save.
                    </p>
                  </div>
                ) : null}
                {serialNumberChecking ? (
                  <p style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Checking...
                  </p>
                ) : null}
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Invoice Date *
                </label>
                <input
                  className="form-input"
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(event) => setInvoiceDate(event.target.value)}
                  disabled={isSaving || isFromSalesOrder}
                  style={{ width: '100%', height: 38, fontSize: 13 }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Customer *
                </label>
                <input type="hidden" {...register('customerId')} />
                <SearchablePicker
                  value={selectedCustomerId}
                  onChange={(customerId) => {
                    setValue('customerId', customerId, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }}
                  options={customers}
                  getLabel={(customer) =>
                    [customer.code, customer.name].filter(Boolean).join(' - ') ||
                    customer.id ||
                    ''
                  }
                  getMeta={(customer) =>
                    [
                      customer.salesRouteName,
                      customer.contacts?.find((contact) => contact.isPrimary)?.phone,
                      customer.taxNumber ? `VRN: ${customer.taxNumber}` : '',
                    ]
                      .filter(Boolean)
                      .join(' • ')
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
                  placeholder={
                    isLoadingData
                      ? 'Loading customers...'
                      : customers.length
                        ? 'Type customer name or code...'
                        : 'No active customers available'
                  }
                  emptyLabel="No matching active customers"
                  disabled={isLoadingData || isSaving}
                />
                {selectedCustomer && (
                  <p style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    VRN:{' '}
                    {selectedCustomerDetails?.taxNumber ||
                      selectedCustomer.taxNumber ||
                      'Not assigned'}
                  </p>
                )}
                {fieldError(errors.customerId?.message)}
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Sales Route
                </label>
                <div
                  className="form-input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: 38,
                    color: salesRouteName ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  }}
                >
                  {salesRouteName ||
                    (selectedSalesRouteId ? 'Loading route...' : 'Select a customer first')}
                </div>
                <input type="hidden" {...register('salesRouteId')} />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Delivery Run
                </label>
                <div
                  className="form-input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: 38,
                    color: deliveryRunName
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {deliveryRunName ||
                    (selectedSalesRouteId ? 'Not assigned to route' : 'Select a customer first')}
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
            <p className="form-label" style={{ fontSize: 10 }}>
              Invoice Summary
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Gross</span>
                <span className="mono">{money(totals.gross)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Category Discount</span>
                <span className="mono">{money(totals.categoryDiscount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
                <span className="mono">
                  {money(totals.gross - totals.categoryDiscount)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>SKU Discount</span>
                {isFromSalesOrder ? (
                  <span className="mono">{money(totals.skuDiscount)}</span>
                ) : (
                  <input
                    className="form-input mono text-right"
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualSkuDiscountAmount}
                    onChange={(event) => setManualSkuDiscountAmount(event.target.value)}
                    placeholder="0.00"
                    style={{ width: 140, height: 32 }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Special Discount</span>
                {isFromSalesOrder ? (
                  <span className="mono">{money(totals.specialDiscount)}</span>
                ) : (
                  <input
                    className="form-input mono text-right"
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualSpecialDiscountAmount}
                    onChange={(event) => setManualSpecialDiscountAmount(event.target.value)}
                    placeholder="0.00"
                    style={{ width: 140, height: 32 }}
                  />
                )}
              </div>
              {totals.returnTotal > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-amber)' }}>Returns</span>
                  <span className="mono" style={{ color: 'var(--color-amber)' }}>
                    - {money(totals.returnTotal)}
                  </span>
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>VAT</span>
                <span className="mono">{money(totals.vat)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>Net</span>
                <span className="mono" style={{ color: 'var(--color-amber)' }}>
                  {money(totals.net)}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            <button
              type="button"
              className="button-secondary"
              onClick={handleClear}
            >
              <RotateCcw style={{ width: 15, height: 15 }} />
              Clear
            </button>
            <button className="button-primary" type="submit"
              disabled={isSaving || isLoadingData || serialNumberChecking || !serialNumber.trim()
              }
            >
              <Save style={{ width: 15, height: 15 }} />
              {isSaving ? 'Saving...' : 'Finalize Invoice'}
            </button>
          </div>
        </aside>
      </form>
    </div>
  )
}
