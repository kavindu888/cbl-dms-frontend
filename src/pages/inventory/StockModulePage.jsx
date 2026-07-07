import { RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import SimplePagination from '@components/ui/SimplePagination'
import { useAuthStore } from '@stores/authStore'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'
import {
  firstValidationMessage,
  mustBeDifferent,
  positiveNumber,
  required,
  nonNegativeNumber,
} from '@/utils/validation'
import { inventoryService } from '@services/api/inventoryService'
import { masterService } from '@services/api/masterService'

const pageTitles = {
  levels: {
    title: 'Stock Levels',
    subtitle: 'View available, reserved, and sellable quantities by location.',
  },
  locations: {
    title: 'Stock Locations',
    subtitle: 'Manage inventory locations that match the backend stock-location API.',
  },
  transfers: {
    title: 'Stock Transfers',
    subtitle:
      'Create transfers, add lines, dispatch, receive, or cancel stock movement between locations.',
  },
  stocktakes: {
    title: 'Stocktakes',
    subtitle: 'Create count sessions, add product lines, record counts, and complete stocktakes.',
  },
  movements: {
    title: 'Stock Movements',
    subtitle:
      'Review stock movement history from receipts, sales, returns, transfers, and adjustments.',
  },
}

const emptyLocationForm = { businessUnitId: '', code: '', name: '', address: '' }
const emptyTransferForm = { sourceLocationId: '', destinationLocationId: '', notes: '' }
const emptyTransferLineForm = {
  transferId: '',
  productId: '',
  productSku: '',
  sourceBatchId: '',
  qty: '',
}
const emptyStocktakeForm = { stockLocationId: '', notes: '' }
const emptyStocktakeLineForm = { stocktakeId: '', productId: '', productSku: '' }

function getErrorMessage(error, fallback) {
  return error?.message || fallback
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatBoolean(value) {
  return value ? 'Yes' : 'No'
}

function productLabel(product) {
  if (!product) return ''
  return `${product.sku || product.id} - ${product.name || 'Unnamed product'}`
}

function SmallButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      className="button-secondary"
      disabled={disabled}
      onClick={onClick}
      style={{ height: 30, padding: '0 10px', fontSize: 12 }}
    >
      {children}
    </button>
  )
}

function Field({ label, required, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      <label className="form-label" style={{ fontSize: 10 }}>
        {label}{' '}
        {required ? (
          <span style={{ color: 'var(--color-danger)' }}>*</span>
        ) : (
          <span
            style={{
              color: 'var(--color-text-dim)',
              fontWeight: 'normal',
              textTransform: 'none',
              marginLeft: 4,
            }}
          >
            (Optional)
          </span>
        )}
      </label>
      {children}
    </div>
  )
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
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <svg style={{ width: 14, height: 14, fill: 'currentColor' }} viewBox="0 0 20 20">
        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
      </svg>
    </div>
  )
}

function SelectControl({ children, style }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', ...style }}>
      {children}
      <SelectChevron />
    </div>
  )
}

function EmptyRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-text-muted">
        {message}
      </td>
    </tr>
  )
}

function LoadingRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-text-muted">
        {message}
      </td>
    </tr>
  )
}

function ErrorRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-danger">
        {message}
      </td>
    </tr>
  )
}

function PermissionNotice({ children }) {
  return (
    <div className="panel" style={{ padding: 16, color: 'var(--color-text-muted)', fontSize: 13 }}>
      {children}
    </div>
  )
}

export default function StockModulePage({ initialTab = 'levels' }) {
  const activeTab = initialTab
  const { user } = useAuthStore()
  const canManageWarehouses = userHasPermission(user, PERMISSIONS.inventory.warehouseManage)
  const canCreateTransfers = userHasPermission(user, PERMISSIONS.inventory.transferCreate)
  const canManageStocktakes = userHasPermission(user, PERMISSIONS.inventory.stocktakeManage)
  const [businessUnits, setBusinessUnits] = useState([])
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [levels, setLevels] = useState([])
  const [movements, setMovements] = useState([])
  const [transfers, setTransfers] = useState([])
  const [stocktakes, setStocktakes] = useState([])
  const [availability, setAvailability] = useState(null)
  const [selectedTransfer, setSelectedTransfer] = useState(null)
  const [selectedStocktake, setSelectedStocktake] = useState(null)
  const [countValues, setCountValues] = useState({})
  const [levelFilters, setLevelFilters] = useState({ stockLocationId: '', lowStockOnly: false })
  const [movementFilters, setMovementFilters] = useState({
    productId: '',
    stockLocationId: '',
    movementType: '',
    from: '',
    to: '',
  })
  const [lookupProductId, setLookupProductId] = useState('')
  const [locationForm, setLocationForm] = useState(emptyLocationForm)
  const [editingLocation, setEditingLocation] = useState(null)
  const [transferForm, setTransferForm] = useState(emptyTransferForm)
  const [transferLineForm, setTransferLineForm] = useState(emptyTransferLineForm)
  const [stocktakeForm, setStocktakeForm] = useState(emptyStocktakeForm)
  const [stocktakeLineForm, setStocktakeLineForm] = useState(emptyStocktakeLineForm)
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const [locationsPage, setLocationsPage] = useState(1)
  const locationsPageSize = 8

  const pagedLocations = useMemo(() => {
    const start = (locationsPage - 1) * locationsPageSize
    return locations.slice(start, start + locationsPageSize)
  }, [locations, locationsPage])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(locations.length / locationsPageSize))
    if (locationsPage > totalPages) setLocationsPage(totalPages)
  }, [locations.length, locationsPage])

  const [levelsPage, setLevelsPage] = useState(1)
  const levelsPageSize = 8

  const filteredLevels = useMemo(() => {
    return levels.filter((item) => !lookupProductId || item.productId === lookupProductId)
  }, [levels, lookupProductId])

  const pagedLevels = useMemo(() => {
    const start = (levelsPage - 1) * levelsPageSize
    return filteredLevels.slice(start, start + levelsPageSize)
  }, [filteredLevels, levelsPage])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredLevels.length / levelsPageSize))
    if (levelsPage > totalPages) setLevelsPage(totalPages)
  }, [filteredLevels.length, levelsPage])

  useEffect(() => {
    setLevelsPage(1)
  }, [levelFilters, lookupProductId])

  const activeLocations = useMemo(() => locations.filter((item) => item.isActive), [locations])

  const loadCommonData = useCallback(async () => {
    try {
      const [unitItems, productPage, locationPage] = await Promise.all([
        masterService.listBusinessUnits(),
        masterService.listProducts({ page: 1, pageSize: 100 }),
        inventoryService.listStockLocations({ page: 1, pageSize: 100 }),
      ])
      setBusinessUnits(unitItems)
      setProducts(productPage.items || [])
      setLocations(locationPage.items || [])
    } catch (loadError) {
      toast.error(getErrorMessage(loadError, 'Unable to load stock setup data.'))
    }
  }, [])

  const loadLevels = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const params = {
        stockLocationId: levelFilters.stockLocationId || undefined,
        lowStockOnly: levelFilters.lowStockOnly || undefined,
      }
      const levelItems = await inventoryService.listStockLevels(params)
      setLevels(levelItems)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load stock levels.'))
    } finally {
      setIsLoading(false)
    }
  }, [levelFilters])

  const loadLocations = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await inventoryService.listStockLocations({ page: 1, pageSize: 100 })
      setLocations(result.items || [])
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load stock locations.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadMovements = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const items = await inventoryService.listStockMovements({
        productId: movementFilters.productId || undefined,
        stockLocationId: movementFilters.stockLocationId || undefined,
        movementType: movementFilters.movementType || undefined,
        from: movementFilters.from || undefined,
        to: movementFilters.to || undefined,
        page: 1,
        pageSize: 50,
      })
      setMovements(items)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load stock movements.'))
    } finally {
      setIsLoading(false)
    }
  }, [movementFilters])

  const loadTransfers = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setTransfers(await inventoryService.listStockTransfers({ status: statusFilter || undefined }))
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load stock transfers.'))
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  const loadStocktakes = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setStocktakes(await inventoryService.listStocktakes({ status: statusFilter || undefined }))
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load stocktakes.'))
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadCommonData()
  }, [loadCommonData])
  useEffect(() => {
    setStatusFilter('')
    setError('')
    setLookupProductId('')
    setAvailability(null)
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'levels') loadLevels()
    if (activeTab === 'locations') loadLocations()
    if (activeTab === 'movements') loadMovements()
    if (activeTab === 'transfers') loadTransfers()
    if (activeTab === 'stocktakes') loadStocktakes()
  }, [activeTab, loadLevels, loadLocations, loadMovements, loadTransfers, loadStocktakes])

  useEffect(() => {
    async function fetchStock() {
      if (!lookupProductId) {
        setAvailability(null)
        return
      }
      setIsLoading(true)
      try {
        const availabilityResult = await inventoryService.getStockAvailability(lookupProductId)
        setAvailability(availabilityResult)
      } catch (lookupError) {
        toast.error(getErrorMessage(lookupError, 'Unable to load product stock.'))
      } finally {
        setIsLoading(false)
      }
    }
    fetchStock()
  }, [lookupProductId])

  function locationName(id) {
    const location = locations.find((item) => item.id === id)
    return location ? `${location.code} - ${location.name}` : id || '-'
  }

  function businessUnitName(id) {
    const unit = businessUnits.find((item) => item.id === id)
    return unit ? `${unit.code} - ${unit.name}` : id || '-'
  }

  function productSku(id) {
    const product = products.find((item) => item.id === id)
    return product?.sku || id || ''
  }

  function productUom(id) {
    const product = products.find((item) => item.id === id)
    return product?.uomBase || ''
  }

  function setLocationField(field, value) {
    setLocationForm((current) => ({ ...current, [field]: value }))
  }

  function setTransferField(field, value) {
    setTransferForm((current) => ({ ...current, [field]: value }))
  }

  function setTransferLineField(field, value) {
    setTransferLineForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'productId') next.productSku = productSku(value)
      return next
    })
  }

  function setStocktakeField(field, value) {
    setStocktakeForm((current) => ({ ...current, [field]: value }))
  }

  function setStocktakeLineField(field, value) {
    setStocktakeLineForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'productId') next.productSku = productSku(value)
      return next
    })
  }

  function clearLocationForm() {
    setEditingLocation(null)
    setLocationForm(emptyLocationForm)
  }

  function editLocation(location) {
    setEditingLocation(location)
    setLocationForm({
      businessUnitId: location.businessUnitId || '',
      code: location.code || '',
      name: location.name || '',
      address: location.address || '',
    })
  }

  async function saveLocation(event) {
    event.preventDefault()
    if (!canManageWarehouses) return toast.error('Warehouse management permission is required.')
    const validationMessage = firstValidationMessage([
      required(locationForm.name, 'Location name is required.'),
      required(
        !editingLocation ? locationForm.businessUnitId : 'selected',
        'Business unit is required.'
      ),
      required(!editingLocation ? locationForm.code : 'selected', 'Location code is required.'),
    ])
    if (validationMessage) return toast.error(validationMessage)

    setIsSaving(true)
    try {
      if (editingLocation) {
        await inventoryService.updateStockLocation(editingLocation.id, {
          name: locationForm.name.trim(),
          address: locationForm.address.trim() || null,
        })
        toast.success('Stock location updated.')
      } else {
        await inventoryService.createStockLocation({
          businessUnitId: locationForm.businessUnitId,
          code: locationForm.code.trim().toUpperCase(),
          name: locationForm.name.trim(),
          address: locationForm.address.trim() || null,
        })
        toast.success('Stock location created.')
      }
      clearLocationForm()
      await loadLocations()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to save stock location.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function changeLocationStatus(location) {
    if (!canManageWarehouses) return toast.error('Warehouse management permission is required.')
    const action = location.isActive ? 'deactivate' : 'activate'
    if (!(await window.confirm(`${action} ${location.name}?`))) return
    try {
      if (location.isActive) await inventoryService.deactivateStockLocation(location.id)
      else await inventoryService.activateStockLocation(location.id)
      toast.success(`Stock location ${action}d.`)
      await loadLocations()
    } catch (actionError) {
      toast.error(getErrorMessage(actionError, `Unable to ${action} stock location.`))
    }
  }

  async function createTransfer(event) {
    event.preventDefault()
    if (!canCreateTransfers) return toast.error('Transfer create permission is required.')
    const validationMessage = firstValidationMessage([
      required(transferForm.sourceLocationId, 'Source location is required.'),
      required(transferForm.destinationLocationId, 'Destination location is required.'),
      mustBeDifferent(
        transferForm.sourceLocationId,
        transferForm.destinationLocationId,
        'Source and destination must be different.'
      ),
    ])
    if (validationMessage) return toast.error(validationMessage)

    setIsSaving(true)
    try {
      const id = await inventoryService.createStockTransfer({
        sourceLocationId: transferForm.sourceLocationId,
        destinationLocationId: transferForm.destinationLocationId,
        notes: transferForm.notes.trim() || null,
      })
      toast.success('Stock transfer created.')
      setTransferForm(emptyTransferForm)
      setTransferLineForm((current) => ({ ...current, transferId: id || current.transferId }))
      await loadTransfers()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to create stock transfer.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function addTransferLine(event) {
    event.preventDefault()
    if (!canCreateTransfers) return toast.error('Transfer create permission is required.')
    const validationMessage = firstValidationMessage([
      required(transferLineForm.transferId, 'Transfer is required.'),
      required(transferLineForm.productId, 'Product is required.'),
      required(transferLineForm.sourceBatchId, 'Source batch is required.'),
      positiveNumber(transferLineForm.qty, 'Quantity must be greater than zero.'),
    ])
    if (validationMessage) return toast.error(validationMessage)
    const qty = Number(transferLineForm.qty)

    setIsSaving(true)
    try {
      await inventoryService.addStockTransferLine(transferLineForm.transferId, {
        productId: transferLineForm.productId,
        productSku: transferLineForm.productSku.trim(),
        sourceBatchId: transferLineForm.sourceBatchId.trim(),
        qty,
      })
      toast.success('Transfer line added.')
      setTransferLineForm({ ...emptyTransferLineForm, transferId: transferLineForm.transferId })
      await viewTransfer(transferLineForm.transferId)
      await loadTransfers()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to add transfer line.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function viewTransfer(id) {
    try {
      const detail = await inventoryService.getStockTransfer(id)
      setSelectedTransfer(detail)
      setTransferLineForm((current) => ({ ...current, transferId: id }))
    } catch (loadError) {
      toast.error(getErrorMessage(loadError, 'Unable to load stock transfer.'))
    }
  }

  async function transferAction(id, action) {
    if (!canCreateTransfers) return toast.error('Transfer create permission is required.')
    if (!(await window.confirm(`${action} this transfer?`))) return
    try {
      if (action === 'dispatch') await inventoryService.dispatchStockTransfer(id)
      if (action === 'receive') await inventoryService.receiveStockTransfer(id)
      if (action === 'cancel') await inventoryService.cancelStockTransfer(id)
      toast.success(`Transfer ${action}ed.`)
      await loadTransfers()
      await viewTransfer(id)
    } catch (actionError) {
      toast.error(getErrorMessage(actionError, `Unable to ${action} transfer.`))
    }
  }

  async function removeTransferLine(lineId) {
    if (!canCreateTransfers) return toast.error('Transfer create permission is required.')
    if (!selectedTransfer || !(await window.confirm('Remove this transfer line?'))) return
    try {
      await inventoryService.removeStockTransferLine(selectedTransfer.id, lineId)
      toast.success('Transfer line removed.')
      await viewTransfer(selectedTransfer.id)
      await loadTransfers()
    } catch (removeError) {
      toast.error(getErrorMessage(removeError, 'Unable to remove transfer line.'))
    }
  }

  async function createStocktake(event) {
    event.preventDefault()
    if (!canManageStocktakes) return toast.error('Stocktake management permission is required.')
    const validationMessage = firstValidationMessage([
      required(stocktakeForm.stockLocationId, 'Stock location is required.'),
    ])
    if (validationMessage) return toast.error(validationMessage)

    setIsSaving(true)
    try {
      const id = await inventoryService.createStocktake({
        stockLocationId: stocktakeForm.stockLocationId,
        notes: stocktakeForm.notes.trim() || null,
      })
      toast.success('Stocktake created.')
      setStocktakeForm(emptyStocktakeForm)
      setStocktakeLineForm((current) => ({ ...current, stocktakeId: id || current.stocktakeId }))
      await loadStocktakes()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to create stocktake.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function addStocktakeLine(event) {
    event.preventDefault()
    if (!canManageStocktakes) return toast.error('Stocktake management permission is required.')
    const validationMessage = firstValidationMessage([
      required(stocktakeLineForm.stocktakeId, 'Stocktake is required.'),
      required(stocktakeLineForm.productId, 'Product is required.'),
    ])
    if (validationMessage) return toast.error(validationMessage)

    setIsSaving(true)
    try {
      await inventoryService.addStocktakeLine(stocktakeLineForm.stocktakeId, {
        productId: stocktakeLineForm.productId,
        productSku: stocktakeLineForm.productSku.trim(),
      })
      toast.success('Stocktake line added.')
      setStocktakeLineForm({
        ...emptyStocktakeLineForm,
        stocktakeId: stocktakeLineForm.stocktakeId,
      })
      await viewStocktake(stocktakeLineForm.stocktakeId)
      await loadStocktakes()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to add stocktake line.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function viewStocktake(id) {
    try {
      const detail = await inventoryService.getStocktake(id)
      setSelectedStocktake(detail)
      setStocktakeLineForm((current) => ({ ...current, stocktakeId: id }))
      const nextCounts = {}
      ;(detail.lines || []).forEach((line) => {
        nextCounts[line.id] = line.countedQty ?? ''
      })
      setCountValues(nextCounts)
    } catch (loadError) {
      toast.error(getErrorMessage(loadError, 'Unable to load stocktake.'))
    }
  }

  async function stocktakeAction(id, action) {
    if (!canManageStocktakes) return toast.error('Stocktake management permission is required.')
    if (!(await window.confirm(`${action} this stocktake?`))) return
    try {
      if (action === 'start') await inventoryService.startStocktake(id)
      if (action === 'complete') await inventoryService.completeStocktake(id)
      if (action === 'cancel') await inventoryService.cancelStocktake(id)
      toast.success(`Stocktake ${action}ed.`)
      await loadStocktakes()
      await viewStocktake(id)
    } catch (actionError) {
      toast.error(getErrorMessage(actionError, `Unable to ${action} stocktake.`))
    }
  }

  async function saveCount(lineId) {
    if (!canManageStocktakes) return toast.error('Stocktake management permission is required.')
    if (!selectedStocktake) return
    const validationMessage = firstValidationMessage([
      nonNegativeNumber(countValues[lineId], 'Enter a valid counted quantity.'),
    ])
    if (validationMessage) return toast.error(validationMessage)
    const countedQty = Number(countValues[lineId])

    try {
      await inventoryService.recordStocktakeCount(selectedStocktake.id, lineId, countedQty)
      toast.success('Count recorded.')
      await viewStocktake(selectedStocktake.id)
      await loadStocktakes()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to record count.'))
    }
  }

  async function removeStocktakeLine(lineId) {
    if (!canManageStocktakes) return toast.error('Stocktake management permission is required.')
    if (!selectedStocktake || !(await window.confirm('Remove this stocktake line?'))) return
    try {
      await inventoryService.removeStocktakeLine(selectedStocktake.id, lineId)
      toast.success('Stocktake line removed.')
      await viewStocktake(selectedStocktake.id)
      await loadStocktakes()
    } catch (removeError) {
      toast.error(getErrorMessage(removeError, 'Unable to remove stocktake line.'))
    }
  }

  function LocationSelect({ value, onChange, emptyLabel = 'Select location' }) {
    return (
      <SelectControl>
        <select
          className="form-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{ appearance: 'none', backgroundImage: 'none', paddingRight: 36 }}
        >
          <option value="">{emptyLabel}</option>
          {activeLocations.map((location) => (
            <option key={location.id} value={location.id}>
              {locationName(location.id)}
            </option>
          ))}
        </select>
      </SelectControl>
    )
  }

  function ProductSelect({ value, onChange, emptyLabel = 'Select product' }) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const selectedProduct = products.find((p) => p.id === value)
    const displayValue = isOpen ? searchQuery : selectedProduct ? productLabel(selectedProduct) : ''

    const filtered = useMemo(() => {
      const q = searchQuery.toLowerCase().trim()
      if (!q) return products
      return products.filter((product) => {
        return (
          product.sku?.toLowerCase().includes(q) ||
          product.name?.toLowerCase().includes(q) ||
          product.id?.toLowerCase().includes(q)
        )
      })
    }, [searchQuery])

    useEffect(() => {
      if (!isOpen) return
      function handleOutsideClick(event) {
        if (!event.target.closest('.searchable-select-container')) {
          setIsOpen(false)
        }
      }
      document.addEventListener('click', handleOutsideClick)
      return () => document.removeEventListener('click', handleOutsideClick)
    }, [isOpen])

    return (
      <div className="searchable-select-container" style={{ position: 'relative', width: '100%' }}>
        <div style={{ position: 'relative' }}>
          <input
            className="form-input"
            style={{ paddingRight: 36, width: '100%', cursor: 'pointer' }}
            type="text"
            placeholder={emptyLabel}
            value={displayValue}
            onFocus={() => {
              setIsOpen(true)
              setSearchQuery('')
            }}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setIsOpen(true)
            }}
          />
          <div
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-dim)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg style={{ width: 14, height: 14, fill: 'currentColor' }} viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        {isOpen ? (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100,
              maxHeight: 220,
              overflowY: 'auto',
            }}
          >
            {value ? (
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: 13,
                  color: 'var(--color-danger)',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--color-border)',
                  fontWeight: 500,
                }}
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                  setSearchQuery('')
                }}
              >
                Clear Selection
              </div>
            ) : null}

            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '10px 12px',
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                  textAlign: 'center',
                }}
              >
                No products found
              </div>
            ) : (
              filtered.map((product) => {
                const isSelected = product.id === value
                return (
                  <div
                    key={product.id}
                    style={{
                      padding: '8px 12px',
                      fontSize: 13,
                      color: isSelected
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-secondary)',
                      backgroundColor: isSelected ? 'var(--color-bg-hover)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'var(--color-bg-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = isSelected
                        ? 'var(--color-bg-hover)'
                        : 'transparent'
                    }}
                    onClick={() => {
                      onChange(product.id)
                      setIsOpen(false)
                      setSearchQuery('')
                    }}
                  >
                    {productLabel(product)}
                  </div>
                )
              })
            )}
          </div>
        ) : null}
      </div>
    )
  }

  function TransferSelect({ value, onChange }) {
    return (
      <SelectControl>
        <select
          className="form-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{ appearance: 'none', backgroundImage: 'none', paddingRight: 36 }}
        >
          <option value="">Select transfer</option>
          {transfers.map((transfer) => (
            <option key={transfer.id} value={transfer.id}>
              {transfer.transferNo} - {transfer.status}
            </option>
          ))}
        </select>
      </SelectControl>
    )
  }

  function StocktakeSelect({ value, onChange }) {
    return (
      <SelectControl>
        <select
          className="form-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{ appearance: 'none', backgroundImage: 'none', paddingRight: 36 }}
        >
          <option value="">Select stocktake</option>
          {stocktakes.map((stocktake) => (
            <option key={stocktake.id} value={stocktake.id}>
              {stocktake.stocktakeNo} - {stocktake.status}
            </option>
          ))}
        </select>
      </SelectControl>
    )
  }

  function Metric({ label, value, isMono }) {
    const isLongValue = typeof value === 'string' && value.length > 15
    return (
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            color: 'var(--color-text-dim)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          {label}
        </p>
        <p
          className={isMono ? 'mono' : ''}
          style={{
            marginTop: 4,
            color: 'var(--color-text-primary)',
            fontWeight: 650,
            fontSize: isLongValue ? 12 : 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={value}
        >
          {value}
        </p>
      </div>
    )
  }

  return (
    <div
      className="responsive-page"
      style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {pageTitles[activeTab]?.title || 'Stock Management'}
          </h1>
          <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 13 }}>
            {pageTitles[activeTab]?.subtitle || 'Manage inventory stock operations.'}
          </p>
        </div>
        <button type="button" className="button-secondary" onClick={refreshActiveTab}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {activeTab === 'levels' ? renderLevels() : null}
      {activeTab === 'locations' ? renderLocations() : null}
      {activeTab === 'transfers' ? renderTransfers() : null}
      {activeTab === 'stocktakes' ? renderStocktakes() : null}
      {activeTab === 'movements' ? renderMovements() : null}
    </div>
  )

  function refreshActiveTab() {
    if (activeTab === 'levels') loadLevels()
    if (activeTab === 'locations') loadLocations()
    if (activeTab === 'movements') loadMovements()
    if (activeTab === 'transfers') loadTransfers()
    if (activeTab === 'stocktakes') loadStocktakes()
  }

  function renderLevels() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}>
        <div
          className="panel responsive-filter-bar"
          style={{ padding: 14, display: 'grid', gridTemplateColumns: '260px 160px 1fr', gap: 12 }}
        >
          <SelectControl>
            <select
              className="form-input"
              value={levelFilters.stockLocationId}
              onChange={(event) =>
                setLevelFilters((current) => ({ ...current, stockLocationId: event.target.value }))
              }
              style={{ appearance: 'none', backgroundImage: 'none', paddingRight: 36 }}
            >
              <option value="">All locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {locationName(location.id)}
                </option>
              ))}
            </select>
          </SelectControl>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--color-text-muted)',
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={levelFilters.lowStockOnly}
              onChange={(event) =>
                setLevelFilters((current) => ({ ...current, lowStockOnly: event.target.checked }))
              }
            />
            Low stock only
          </label>
          <ProductSelect
            value={lookupProductId}
            onChange={setLookupProductId}
            emptyLabel="Select product for availability"
          />
        </div>

        {availability ? (
          <div
            className="panel"
            style={{
              padding: 14,
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr 1.3fr',
              gap: 16,
            }}
          >
            <Metric label="Product ID" value={availability.productId} isMono />
            <Metric label="Product SKU" value={availability.productSku || '-'} />
            <Metric
              label="Available"
              value={`${formatNumber(availability.totalAvailable)} ${productUom(availability.productId)}`}
            />
            <Metric
              label="Reserved"
              value={`${formatNumber(availability.totalReserved)} ${productUom(availability.productId)}`}
            />
            <Metric
              label="Sellable"
              value={`${formatNumber(availability.sellable)} ${productUom(availability.productId)}`}
            />
            <Metric label="Active Batches" value={formatNumber(availability.activeBatchCount)} />
            <Metric label="Earliest Expiry" value={formatDate(availability.earliestExpiry)} />
          </div>
        ) : null}

        <div
          className="panel responsive-table-shell"
          style={{ padding: 14, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
        >
          <div style={{ overflow: 'hidden', flex: 1, marginBottom: 12 }}>
            <table className="data-table master-table-compact">
              <thead>
                <tr>
                  {/* <th>ID</th> */}
                  <th>Product ID</th>
                  <th>Product SKU</th>
                  <th>Location ID</th>
                  <th>Location</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Sellable</th>
                  <th>Last Movement</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? <LoadingRow colSpan={9} message="Loading stock levels..." /> : null}
                {!isLoading && error ? <ErrorRow colSpan={9} message={error} /> : null}
                {!isLoading && !error && filteredLevels.length === 0 ? (
                  <EmptyRow colSpan={9} message="No stock levels found." />
                ) : null}
                {!isLoading && !error
                  ? pagedLevels.map((item) => (
                      <tr key={item.id}>
                        {/* <td className="mono">{item.id}</td> */}
                        <td className="mono">{item.productId}</td>
                        <td>
                          <span className="mono" style={{ color: 'var(--color-amber)' }}>
                            {item.productSku}
                          </span>
                        </td>
                        <td className="mono">{item.stockLocationId}</td>
                        <td>{locationName(item.stockLocationId)}</td>
                        <td className="amount-primary">
                          {formatNumber(item.totalAvailable)}{' '}
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--color-text-muted)',
                              marginLeft: 2,
                            }}
                          >
                            {productUom(item.productId)}
                          </span>
                        </td>
                        <td className="amount">
                          {formatNumber(item.totalReserved)}{' '}
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--color-text-muted)',
                              marginLeft: 2,
                            }}
                          >
                            {productUom(item.productId)}
                          </span>
                        </td>
                        <td className="amount-success">
                          {formatNumber(item.sellable)}{' '}
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--color-text-muted)',
                              marginLeft: 2,
                            }}
                          >
                            {productUom(item.productId)}
                          </span>
                        </td>
                        <td>{formatDate(item.lastMovementAt)}</td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
          {filteredLevels.length > levelsPageSize ? (
            <SimplePagination
              page={levelsPage}
              pageSize={levelsPageSize}
              totalItems={filteredLevels.length}
              onPageChange={setLevelsPage}
              itemLabel="items"
            />
          ) : null}
        </div>
      </div>
    )
  }

  function renderLocations() {
    return (
      <div
        className="responsive-master-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          className="panel responsive-table-shell"
          style={{ padding: 14, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <div style={{ overflow: 'auto', flex: 1, marginBottom: 12 }}>
            <table className="data-table master-table-compact">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Business Unit ID</th>
                  <th>Business Unit</th>
                  <th>Active</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? <LoadingRow colSpan={8} message="Loading stock locations..." /> : null}
                {!isLoading && error ? <ErrorRow colSpan={8} message={error} /> : null}
                {!isLoading && !error && locations.length === 0 ? (
                  <EmptyRow colSpan={8} message="No stock locations found." />
                ) : null}
                {!isLoading && !error
                  ? pagedLocations.map((location) => (
                      <tr key={location.id}>
                        <td className="mono">{location.id}</td>
                        <td>
                          <span className="mono" style={{ color: 'var(--color-amber)' }}>
                            {location.code}
                          </span>
                        </td>
                        <td>{location.name}</td>
                        <td className="mono">{location.businessUnitId}</td>
                        <td>{businessUnitName(location.businessUnitId)}</td>
                        <td>{formatBoolean(location.isActive)}</td>
                        <td>
                          <StatusBadge status={location.status} />
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {canManageWarehouses ? (
                            <>
                              <SmallButton onClick={() => editLocation(location)}>Edit</SmallButton>{' '}
                              <SmallButton onClick={() => changeLocationStatus(location)}>
                                {location.isActive ? 'Deactivate' : 'Activate'}
                              </SmallButton>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
          {!isLoading && !error && locations.length > 0 ? (
            <SimplePagination
              page={locationsPage}
              pageSize={locationsPageSize}
              totalItems={locations.length}
              onPageChange={setLocationsPage}
              itemLabel="locations"
            />
          ) : null}
        </div>

        {canManageWarehouses ? (
          <form
            className="panel"
            onSubmit={saveLocation}
            style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 650 }}>
              {editingLocation ? 'Edit Location' : 'New Location'}
            </h2>
            <Field label="Business Unit" required>
              <SelectControl>
                <select
                  className="form-input"
                  value={locationForm.businessUnitId}
                  disabled={Boolean(editingLocation)}
                  onChange={(event) => setLocationField('businessUnitId', event.target.value)}
                  style={{ appearance: 'none', backgroundImage: 'none', paddingRight: 36 }}
                >
                  <option value="">Select business unit</option>
                  {businessUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.code} - {unit.name}
                    </option>
                  ))}
                </select>
              </SelectControl>
            </Field>
            <Field label="Code" required>
              <input
                className="form-input"
                value={locationForm.code}
                disabled={Boolean(editingLocation)}
                placeholder="e.g. WH-01"
                onChange={(event) => setLocationField('code', event.target.value)}
              />
            </Field>
            <Field label="Name" required>
              <input
                className="form-input"
                value={locationForm.name}
                placeholder="Main Warehouse"
                onChange={(event) => setLocationField('name', event.target.value)}
              />
            </Field>
            <Field label="Address" style={{ flex: 1 }}>
              <textarea
                className="form-input"
                value={locationForm.address}
                placeholder="Optional address"
                onChange={(event) => setLocationField('address', event.target.value)}
                style={{ flex: 1, minHeight: 90, paddingTop: 10, resize: 'none' }}
              />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="button-ghost"
                onClick={clearLocationForm}
                style={{ flex: 1 }}
              >
                Clear
              </button>
              <button
                type="submit"
                className="button-primary"
                disabled={isSaving}
                style={{ flex: 1 }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <PermissionNotice>
            Warehouse management permission is required to create, edit, activate, or deactivate
            stock locations.
          </PermissionNotice>
        )}
      </div>
    )
  }

  function renderMovements() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}>
        <div
          className="panel responsive-filter-bar"
          style={{
            padding: 14,
            display: 'grid',
            gridTemplateColumns: '1fr 230px 180px 170px 170px',
            gap: 12,
          }}
        >
          <ProductSelect
            value={movementFilters.productId}
            onChange={(value) =>
              setMovementFilters((current) => ({ ...current, productId: value }))
            }
            emptyLabel="All products"
          />
          <LocationSelect
            value={movementFilters.stockLocationId}
            onChange={(value) =>
              setMovementFilters((current) => ({ ...current, stockLocationId: value }))
            }
            emptyLabel="All locations"
          />
          <SelectControl>
            <select
              className="form-input"
              value={movementFilters.movementType}
              onChange={(event) =>
                setMovementFilters((current) => ({ ...current, movementType: event.target.value }))
              }
              style={{ appearance: 'none', backgroundImage: 'none', paddingRight: 36 }}
            >
              <option value="">All movements</option>
              <option value="GrnReceipt">GRN Receipt</option>
              <option value="SalesIssue">Sales Issue</option>
              <option value="SalesReturn">Sales Return</option>
              <option value="PurchaseReturn">Purchase Return</option>
              <option value="AdjustmentIn">Adjustment In</option>
              <option value="AdjustmentOut">Adjustment Out</option>
              <option value="TransferOut">Transfer Out</option>
              <option value="TransferIn">Transfer In</option>
              <option value="StocktakeAdjust">Stocktake Adjust</option>
            </select>
          </SelectControl>
          <input
            className="form-input"
            type="date"
            value={movementFilters.from}
            onChange={(event) =>
              setMovementFilters((current) => ({ ...current, from: event.target.value }))
            }
          />
          <input
            className="form-input"
            type="date"
            value={movementFilters.to}
            onChange={(event) =>
              setMovementFilters((current) => ({ ...current, to: event.target.value }))
            }
          />
        </div>
        <div
          className="panel responsive-table-shell"
          style={{ padding: 14, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
        >
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table className="data-table master-table-compact">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product ID</th>
                  <th>Product SKU</th>
                  <th>Location ID</th>
                  <th>Location</th>
                  <th>Batch ID</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Reference Type</th>
                  <th>Reference ID</th>
                  <th>User ID</th>
                  <th>Notes</th>
                  <th>Occurred On</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? <LoadingRow colSpan={13} message="Loading movements..." /> : null}
                {!isLoading && error ? <ErrorRow colSpan={13} message={error} /> : null}
                {!isLoading && !error && movements.length === 0 ? (
                  <EmptyRow colSpan={13} message="No stock movements found." />
                ) : null}
                {!isLoading && !error
                  ? movements.map((item) => (
                      <tr key={item.id}>
                        <td className="mono">{item.id}</td>
                        <td className="mono">{item.productId}</td>
                        <td>
                          <span className="mono" style={{ color: 'var(--color-amber)' }}>
                            {item.productSku}
                          </span>
                        </td>
                        <td className="mono">{item.stockLocationId}</td>
                        <td>{locationName(item.stockLocationId)}</td>
                        <td className="mono">{item.stockBatchId}</td>
                        <td>
                          <StatusBadge status={item.movementType} />
                        </td>
                        <td className="amount-primary">
                          {formatNumber(item.quantity)}{' '}
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--color-text-muted)',
                              marginLeft: 2,
                            }}
                          >
                            {productUom(item.productId)}
                          </span>
                        </td>
                        <td>{item.referenceType}</td>
                        <td className="mono">{item.referenceId}</td>
                        <td className="mono">{item.userId || '-'}</td>
                        <td>{item.notes || '-'}</td>
                        <td>{formatDate(item.occurredOn)}</td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  function renderTransfers() {
    return (
      <div
        className="responsive-master-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}>
          <div className="panel" style={{ padding: 12 }}>
            <SelectControl style={{ maxWidth: 220 }}>
              <select
                className="form-input"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                style={{ appearance: 'none', backgroundImage: 'none', paddingRight: 36 }}
              >
                <option value="">All statuses</option>
                <option value="Draft">Draft</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Received">Received</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </SelectControl>
          </div>
          <div
            className="panel responsive-table-shell"
            style={{ padding: 14, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
          >
            <div style={{ overflow: 'auto', flex: 1 }}>
              <table className="data-table master-table-compact">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>No</th>
                    <th>Source ID</th>
                    <th>Source</th>
                    <th>Destination ID</th>
                    <th>Destination</th>
                    <th>Status</th>
                    <th>Lines</th>
                    <th>Dispatched On</th>
                    <th>Received On</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? <LoadingRow colSpan={11} message="Loading transfers..." /> : null}
                  {!isLoading && error ? <ErrorRow colSpan={11} message={error} /> : null}
                  {!isLoading && !error && transfers.length === 0 ? (
                    <EmptyRow colSpan={11} message="No transfers found." />
                  ) : null}
                  {!isLoading && !error
                    ? transfers.map((transfer) => (
                        <tr key={transfer.id}>
                          <td className="mono">{transfer.id}</td>
                          <td>
                            <span className="mono" style={{ color: 'var(--color-amber)' }}>
                              {transfer.transferNo}
                            </span>
                          </td>
                          <td className="mono">{transfer.sourceLocationId}</td>
                          <td>{locationName(transfer.sourceLocationId)}</td>
                          <td className="mono">{transfer.destinationLocationId}</td>
                          <td>{locationName(transfer.destinationLocationId)}</td>
                          <td>
                            <StatusBadge status={transfer.status} />
                          </td>
                          <td>{transfer.lineCount}</td>
                          <td>{formatDate(transfer.dispatchedOn)}</td>
                          <td>{formatDate(transfer.receivedOn)}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <SmallButton onClick={() => viewTransfer(transfer.id)}>
                              View
                            </SmallButton>{' '}
                            {canCreateTransfers ? (
                              <>
                                <SmallButton
                                  onClick={() => transferAction(transfer.id, 'dispatch')}
                                >
                                  Dispatch
                                </SmallButton>{' '}
                                <SmallButton onClick={() => transferAction(transfer.id, 'receive')}>
                                  Receive
                                </SmallButton>
                              </>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </div>
          {selectedTransfer ? renderTransferDetail() : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {canCreateTransfers ? (
            <>
              <form
                className="panel"
                onSubmit={createTransfer}
                style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 650 }}>New Transfer</h2>
                <Field label="Source Location" required>
                  <LocationSelect
                    value={transferForm.sourceLocationId}
                    onChange={(value) => setTransferField('sourceLocationId', value)}
                  />
                </Field>
                <Field label="Destination Location" required>
                  <LocationSelect
                    value={transferForm.destinationLocationId}
                    onChange={(value) => setTransferField('destinationLocationId', value)}
                  />
                </Field>
                <Field label="Notes">
                  <input
                    className="form-input"
                    value={transferForm.notes}
                    onChange={(event) => setTransferField('notes', event.target.value)}
                  />
                </Field>
                <button type="submit" className="button-primary" disabled={isSaving}>
                  Create Transfer
                </button>
              </form>

              <form
                className="panel"
                onSubmit={addTransferLine}
                style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 650 }}>Add Transfer Line</h2>
                <Field label="Transfer" required>
                  <TransferSelect
                    value={transferLineForm.transferId}
                    onChange={(value) => setTransferLineField('transferId', value)}
                  />
                </Field>
                <Field label="Product" required>
                  <ProductSelect
                    value={transferLineForm.productId}
                    onChange={(value) => setTransferLineField('productId', value)}
                  />
                </Field>
                <Field label="Product SKU" required>
                  <input
                    className="form-input"
                    value={transferLineForm.productSku}
                    onChange={(event) => setTransferLineField('productSku', event.target.value)}
                  />
                </Field>
                <Field label="Source Batch ID" required>
                  <input
                    className="form-input"
                    value={transferLineForm.sourceBatchId}
                    onChange={(event) => setTransferLineField('sourceBatchId', event.target.value)}
                  />
                </Field>
                <Field label="Quantity" required>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={transferLineForm.qty}
                    onChange={(event) => setTransferLineField('qty', event.target.value)}
                  />
                </Field>
                <button type="submit" className="button-primary" disabled={isSaving}>
                  Add Line
                </button>
              </form>
            </>
          ) : (
            <PermissionNotice>
              Transfer create permission is required to create, dispatch, receive, cancel, or edit
              transfer lines.
            </PermissionNotice>
          )}
        </div>
      </div>
    )
  }

  function renderStocktakes() {
    return (
      <div
        className="responsive-master-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}>
          <div className="panel" style={{ padding: 12 }}>
            <SelectControl style={{ maxWidth: 220 }}>
              <select
                className="form-input"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                style={{ appearance: 'none', backgroundImage: 'none', paddingRight: 36 }}
              >
                <option value="">All statuses</option>
                <option value="Draft">Draft</option>
                <option value="Counting">Counting</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </SelectControl>
          </div>
          <div
            className="panel responsive-table-shell"
            style={{ padding: 14, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
          >
            <div style={{ overflow: 'auto', flex: 1 }}>
              <table className="data-table master-table-compact">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>No</th>
                    <th>Location ID</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Total Lines</th>
                    <th>Counted Lines</th>
                    <th>Completed On</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? <LoadingRow colSpan={9} message="Loading stocktakes..." /> : null}
                  {!isLoading && error ? <ErrorRow colSpan={9} message={error} /> : null}
                  {!isLoading && !error && stocktakes.length === 0 ? (
                    <EmptyRow colSpan={9} message="No stocktakes found." />
                  ) : null}
                  {!isLoading && !error
                    ? stocktakes.map((stocktake) => (
                        <tr key={stocktake.id}>
                          <td className="mono">{stocktake.id}</td>
                          <td>
                            <span className="mono" style={{ color: 'var(--color-amber)' }}>
                              {stocktake.stocktakeNo}
                            </span>
                          </td>
                          <td className="mono">{stocktake.stockLocationId}</td>
                          <td>{locationName(stocktake.stockLocationId)}</td>
                          <td>
                            <StatusBadge status={stocktake.status} />
                          </td>
                          <td>{stocktake.totalLines}</td>
                          <td>{stocktake.countedLines}</td>
                          <td>{formatDate(stocktake.completedOn)}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <SmallButton onClick={() => viewStocktake(stocktake.id)}>
                              View
                            </SmallButton>{' '}
                            <SmallButton onClick={() => stocktakeAction(stocktake.id, 'start')}>
                              Start
                            </SmallButton>{' '}
                            <SmallButton onClick={() => stocktakeAction(stocktake.id, 'complete')}>
                              Complete
                            </SmallButton>
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </div>
          {selectedStocktake ? renderStocktakeDetail() : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <form
            className="panel"
            onSubmit={createStocktake}
            style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 650 }}>New Stocktake</h2>
            <Field label="Stock Location" required>
              <LocationSelect
                value={stocktakeForm.stockLocationId}
                onChange={(value) => setStocktakeField('stockLocationId', value)}
              />
            </Field>
            <Field label="Notes">
              <input
                className="form-input"
                value={stocktakeForm.notes}
                onChange={(event) => setStocktakeField('notes', event.target.value)}
              />
            </Field>
            <button type="submit" className="button-primary" disabled={isSaving}>
              Create Stocktake
            </button>
          </form>

          <form
            className="panel"
            onSubmit={addStocktakeLine}
            style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 650 }}>Add Count Line</h2>
            <Field label="Stocktake" required>
              <StocktakeSelect
                value={stocktakeLineForm.stocktakeId}
                onChange={(value) => setStocktakeLineField('stocktakeId', value)}
              />
            </Field>
            <Field label="Product" required>
              <ProductSelect
                value={stocktakeLineForm.productId}
                onChange={(value) => setStocktakeLineField('productId', value)}
              />
            </Field>
            <Field label="Product SKU" required>
              <input
                className="form-input"
                value={stocktakeLineForm.productSku}
                onChange={(event) => setStocktakeLineField('productSku', event.target.value)}
              />
            </Field>
            <button type="submit" className="button-primary" disabled={isSaving}>
              Add Line
            </button>
          </form>
        </div>
      </div>
    )
  }

  function renderTransferDetail() {
    return (
      <div
        className="panel responsive-table-shell"
        style={{ padding: 14, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
      >
        <div
          style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 650 }}>{selectedTransfer.transferNo}</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
              {locationName(selectedTransfer.sourceLocationId)} to{' '}
              {locationName(selectedTransfer.destinationLocationId)}
            </p>
            <div
              style={{
                marginTop: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))',
                gap: 8,
                color: 'var(--color-text-muted)',
                fontSize: 12,
              }}
            >
              <span>
                ID: <span className="mono">{selectedTransfer.id}</span>
              </span>
              <span>
                Created By: <span className="mono">{selectedTransfer.createdByUserId || '-'}</span>
              </span>
              <span>Dispatched: {formatDate(selectedTransfer.dispatchedOn)}</span>
              <span>Received: {formatDate(selectedTransfer.receivedOn)}</span>
              <span>Cancelled: {formatDate(selectedTransfer.cancelledOn)}</span>
              <span>Notes: {selectedTransfer.notes || '-'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canCreateTransfers ? (
              <SmallButton onClick={() => transferAction(selectedTransfer.id, 'cancel')}>
                Cancel
              </SmallButton>
            ) : null}
            <StatusBadge status={selectedTransfer.status} />
          </div>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table className="data-table master-table-compact">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product ID</th>
                <th>Product SKU</th>
                <th>Source Batch ID</th>
                <th>Batch No</th>
                <th>Qty</th>
                <th>Unit Cost Smallest</th>
                <th>Selling Price</th>
                <th>MRP</th>
                <th>Expiry</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(selectedTransfer.lines || []).length === 0 ? (
                <EmptyRow colSpan={11} message="No transfer lines added." />
              ) : null}
              {(selectedTransfer.lines || []).map((line) => (
                <tr key={line.id}>
                  <td className="mono">{line.id}</td>
                  <td className="mono">{line.productId}</td>
                  <td>
                    <span className="mono" style={{ color: 'var(--color-amber)' }}>
                      {line.productSku}
                    </span>
                  </td>
                  <td className="mono">{line.sourceBatchId}</td>
                  <td>{line.batchNo || '-'}</td>
                  <td className="amount-primary">
                    {formatNumber(line.qtyToTransfer)}{' '}
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 2 }}>
                      {productUom(line.productId)}
                    </span>
                  </td>
                  <td className="amount">{formatCurrency(line.unitCostSmallest)}</td>
                  <td className="amount">{formatCurrency(line.sellingPrice)}</td>
                  <td className="amount">{formatCurrency(line.mrp)}</td>
                  <td>{formatDate(line.expiryDate)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {canCreateTransfers ? (
                      <SmallButton onClick={() => removeTransferLine(line.id)}>Remove</SmallButton>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderStocktakeDetail() {
    return (
      <div
        className="panel responsive-table-shell"
        style={{ padding: 14, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
      >
        <div
          style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 650 }}>{selectedStocktake.stocktakeNo}</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
              {locationName(selectedStocktake.stockLocationId)}
            </p>
            <div
              style={{
                marginTop: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))',
                gap: 8,
                color: 'var(--color-text-muted)',
                fontSize: 12,
              }}
            >
              <span>
                ID: <span className="mono">{selectedStocktake.id}</span>
              </span>
              <span>
                Created By: <span className="mono">{selectedStocktake.createdByUserId || '-'}</span>
              </span>
              <span>Started: {formatDate(selectedStocktake.startedOn)}</span>
              <span>Completed: {formatDate(selectedStocktake.completedOn)}</span>
              <span>Cancelled: {formatDate(selectedStocktake.cancelledOn)}</span>
              <span>Notes: {selectedStocktake.notes || '-'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canManageStocktakes ? (
              <SmallButton onClick={() => stocktakeAction(selectedStocktake.id, 'cancel')}>
                Cancel
              </SmallButton>
            ) : null}
            <StatusBadge status={selectedStocktake.status} />
          </div>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table className="data-table master-table-compact">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product ID</th>
                <th>Product SKU</th>
                <th>Expected</th>
                <th>Counted</th>
                <th>Variance</th>
                <th>Is Counted</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(selectedStocktake.lines || []).length === 0 ? (
                <EmptyRow colSpan={8} message="No stocktake lines added." />
              ) : null}
              {(selectedStocktake.lines || []).map((line) => (
                <tr key={line.id}>
                  <td className="mono">{line.id}</td>
                  <td className="mono">{line.productId}</td>
                  <td>
                    <span className="mono" style={{ color: 'var(--color-amber)' }}>
                      {line.productSku}
                    </span>
                  </td>
                  <td className="amount">
                    {formatNumber(line.expectedQty)}{' '}
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 2 }}>
                      {productUom(line.productId)}
                    </span>
                  </td>
                  <td style={{ minWidth: 150 }}>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={countValues[line.id] ?? ''}
                      onChange={(event) =>
                        setCountValues((current) => ({ ...current, [line.id]: event.target.value }))
                      }
                      style={{ height: 32 }}
                    />
                  </td>
                  <td className="amount-primary">
                    {line.varianceQty == null ? (
                      '-'
                    ) : (
                      <>
                        {formatNumber(line.varianceQty)}{' '}
                        <span
                          style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 2 }}
                        >
                          {productUom(line.productId)}
                        </span>
                      </>
                    )}
                  </td>
                  <td>{formatBoolean(line.isCounted)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {canManageStocktakes ? (
                      <>
                        <SmallButton onClick={() => saveCount(line.id)}>Save Count</SmallButton>{' '}
                        <SmallButton onClick={() => removeStocktakeLine(line.id)}>
                          Remove
                        </SmallButton>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
}
