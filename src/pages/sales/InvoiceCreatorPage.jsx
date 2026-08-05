import { ArrowLeft, Info, Plus, RotateCcw, Save, Search, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { inventoryService } from '@/services/api/inventoryService'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'
import { DISCOUNT_POLICY } from '@/constants/discountPolicy'
import { formatDate } from '@/utils'
import SimplePagination from '@components/ui/SimplePagination'

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
  const orderState = location.state
  const isFromSalesOrder = orderState?.fromSalesOrder === true
  const hasPrefilledFromSalesOrder = useRef(false)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [salesRouteName, setSalesRouteName] = useState('')
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null)
  const [serialNumber, setSerialNumber] = useState('')
  const [serialNumberWarning, setSerialNumberWarning] = useState(false)
  const [serialNumberChecking, setSerialNumberChecking] = useState(false)
  const [returnLines, setReturnLines] = useState([])
  const serialCheckTimeout = useRef(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
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
    const subtotal = lines.reduce(
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

    const returnTotal = returnLines.reduce((sum, line) => {
      const mrp = Number(line.mrp || line.unitPrice || 0)
      const discountPercent = Number(line.totalDiscountPercent ?? line.discountPercent ?? 0)
      const quantity = Number(line.quantity || 0)
      return sum + mrp * (1 - discountPercent / 100) * quantity
    }, 0)
    const netBeforeVat = subtotal.gross - subtotal.discount - returnTotal
    const vat = isCustomerVatRegistered ? Math.round(netBeforeVat * 18) / 100 : 0

    return {
      ...subtotal,
      returnTotal,
      vat,
      net: netBeforeVat + vat,
    }
  }, [isCustomerVatRegistered, lines, returnLines])

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
    setSelectedCustomerDetails({
      id: orderState.customerId,
      name: orderState.customerName,
      salesRouteId: orderState.salesRouteId,
      salesRouteName: orderState.salesRouteName,
      isVatRegistered: Boolean(orderState.isVatApplicable),
      taxNumber: orderState.customerVatTin || '',
    })
    setSalesRouteName(orderState.salesRouteName || '')
    const orderLines = orderState.lines || []
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
      customerId: orderState.customerId || '',
      salesRouteId: orderState.salesRouteId || '',
      lines: prefilledLines.length ? prefilledLines : [{ ...emptyLine }],
    })
    setLinePage(1)
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
    let isCurrent = true

    async function loadSalesRouteName() {
      if (!selectedSalesRouteId) {
        setSalesRouteName('')
        return
      }

      setSalesRouteName('')

      try {
        if (selectedCustomerDetails?.salesRouteName) {
          if (isCurrent) setSalesRouteName(selectedCustomerDetails.salesRouteName)
          return
        }

        const route = await masterService.getSalesRoute(selectedSalesRouteId)
        if (isCurrent) setSalesRouteName(route?.name || '')
      } catch {
        if (isCurrent) setSalesRouteName('')
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

  function handleSerialNumberChange(value) {
    setSerialNumber(value)
    setSerialNumberWarning(false)
    setSerialNumberChecking(false)

    if (serialCheckTimeout.current) {
      clearTimeout(serialCheckTimeout.current)
    }

    if (!value.trim()) return

    serialCheckTimeout.current = setTimeout(async () => {
      setSerialNumberChecking(true)
      try {
        const result = await salesService.checkSerialNumberExists(value.trim())
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
    setSerialNumberWarning(false)
    setSerialNumberChecking(false)
    reset(createDefaultValues())
    setReturnLines([])
  }

  function validate(values) {
    if (!values.customerId) return 'Customer is required.'
    if (!values.salesRouteId) return 'Selected customer does not have a sales route.'
    const invalidLine = values.lines.find(
      (line) =>
        !line.productId ||
        Number(line.quantity) <= 0 ||
        Number(line.skuDiscountPercent || 0) < 0 ||
        Number(line.skuDiscountPercent || 0) > Number(line.skuDiscountMax || 0) ||
        Number(line.specialDiscountPercent || 0) < 0 ||
        Number(line.specialDiscountPercent || 0) > Number(line.specialDiscountMax || 0) ||
        Number(line.categoryDiscountPercent || 0) +
          Number(line.skuDiscountPercent || 0) +
          Number(line.specialDiscountPercent || 0) >
          DISCOUNT_POLICY.MAX_DISCOUNT_PERCENT
    )

    if (invalidLine) {
      return `Each line needs a product, quantity, and discounts within their allowed maximums.`
    }

    return ''
  }

  async function onSubmit(values) {
    const validationMessage = validate(values)
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }

    const payload = {
      customerId: values.customerId,
      serialNumber: serialNumber.trim() || null,
      invoiceDate: new Date().toISOString(),
      dueDate: null,
      isTaxInvoice: isCustomerVatRegistered,
      customerVatTin: selectedCustomerDetails?.taxNumber || null,
      notes: null,
      lines: values.lines.map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        skuDiscountPercent: Number(line.skuDiscountPercent || 0),
        specialDiscountPercent: Number(line.specialDiscountPercent || 0),
      })),
    }

    setIsSaving(true)
    try {
      const response = isFromSalesOrder
        ? await salesService.convertSalesOrderToInvoice(orderState.salesOrderId, {
            serialNumber: serialNumber.trim() || null,
            notes: null,
          })
        : await salesService.createInvoice(payload)
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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {isFromSalesOrder ? 'Convert to Invoice' : 'Create Invoice'}
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          {isFromSalesOrder
            ? `Converting Sales Order ${orderState.salesOrderNumber || ''}. You can adjust before saving.`
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

          <div className="overflow-x-auto" style={{ flex: 1, overflowY: 'visible', minHeight: 0 }}>
            <table className="data-table" style={{ minWidth: 960, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '26%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '5%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Smallest Unit</th>
                  <th className="text-right">MRP</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Cat. Disc %</th>
                  <th className="text-right">SKU Disc %</th>
                  <th className="text-right">Special Disc %</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Total</th>
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
                      <td>
                        <div className="form-input mono text-right" style={readOnlyDisplayStyle}>
                          {Number(line.mrp || 0).toFixed(2)}
                        </div>
                      </td>
                      <td>
                        <input
                          className="form-input mono text-right"
                          type="number"
                          step="0.01"
                          {...register(`lines.${index}.quantity`)}
                        />
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{
                            color: 'var(--color-text-muted)',
                            display: 'block',
                            textAlign: 'right',
                          }}
                        >
                          {Number(line.categoryDiscountPercent || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td>
                        {line.skuDiscountAvailable ? (
                          <input
                            className="form-input mono text-right"
                            type="number"
                            min="0"
                            step="0.01"
                            max={line.skuDiscountMax || 0}
                            {...register(`lines.${index}.skuDiscountPercent`)}
                          />
                        ) : (
                          <span
                            className="mono"
                            style={{ color: 'var(--color-text-dim)', display: 'block', textAlign: 'right' }}
                          >
                            -
                          </span>
                        )}
                      </td>
                      <td>
                        {line.specialDiscountAvailable ? (
                          <input
                            className="form-input mono text-right"
                            type="number"
                            min="0"
                            step="0.01"
                            max={line.specialDiscountMax || 0}
                            {...register(`lines.${index}.specialDiscountPercent`)}
                          />
                        ) : (
                          <span
                            className="mono"
                            style={{ color: 'var(--color-text-dim)', display: 'block', textAlign: 'right' }}
                          >
                            -
                          </span>
                        )}
                      </td>
                      <td className="mono text-right" style={{ color: 'var(--color-text-muted)' }}>
                        {money(unitPrice)}
                      </td>
                      <td className="mono text-right">{money(lineTotal)}</td>
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
                  Serial Number
                </label>
                <input
                  className="form-input"
                  type="text"
                  maxLength={20}
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
              {totals.skuDiscount > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>SKU Discount</span>
                  <span className="mono">{money(totals.skuDiscount)}</span>
                </div>
              ) : null}
              {totals.specialDiscount > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Special Discount</span>
                  <span className="mono">{money(totals.specialDiscount)}</span>
                </div>
              ) : null}
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
            <button className="button-primary" type="submit" disabled={isSaving || isLoadingData}>
              <Save style={{ width: 15, height: 15 }} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </aside>
      </form>
    </div>
  )
}
