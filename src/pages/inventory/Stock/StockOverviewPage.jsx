import dayjs from 'dayjs'
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  ChevronRight,
  Flag,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
  Warehouse,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import StatusBadge from '@components/ui/StatusBadge'
import { useExpiringBatches, useStockLevels } from '@/hooks/useStock'
import { inventoryService } from '@/services/api/inventoryService'
import { masterService } from '@/services/api/masterService'
import FlagStockForReturnModal from '@/pages/inventory/ReturnStock/FlagStockForReturnModal'
import { formatDate, formatTime } from '@/utils'

const pageSize = 12

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })
}

function MetricCard({ label, value, helper, icon: Icon, tone }) {
  return (
    <section
      className="panel"
      style={{
        minHeight: 96,
        padding: '14px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: 13,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          flex: '0 0 auto',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 10,
          color: tone,
          border: `1px solid color-mix(in srgb, ${tone} 28%, var(--color-border))`,
          background: `color-mix(in srgb, ${tone} 10%, transparent)`,
        }}
      >
        <Icon size={19} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="form-label" style={{ marginBottom: 3 }}>
          {label}
        </div>
        <div className="mono" style={{ fontSize: 23, lineHeight: 1.1, fontWeight: 800 }}>
          {value}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: 'var(--color-text-dim)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {helper}
        </div>
      </div>
    </section>
  )
}

function getLocationType(location) {
  if (location?.isVehicle) return 'Vehicle'
  if (location?.isReturnLocation) return 'Return'
  return 'Main'
}

function LocationTypeBadge({ type, vehicleCode }) {
  const styles = {
    Main: {
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      color: 'var(--color-text-muted)',
    },
    Vehicle: {
      background: 'rgba(34, 211, 238, 0.12)',
      border: '1px solid rgba(34, 211, 238, 0.35)',
      color: '#22d3ee',
    },
    Return: {
      background: 'rgba(245, 158, 11, 0.12)',
      border: '1px solid rgba(245, 158, 11, 0.35)',
      color: 'var(--color-amber)',
    },
  }

  return (
    <span
      className="mono"
      style={{
        ...styles[type],
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 800,
        padding: '2px 6px',
      }}
    >
      {type.toUpperCase()}
      {type === 'Vehicle' && vehicleCode ? <span>{vehicleCode}</span> : null}
    </span>
  )
}

function StockByLocationPanel({ productName, rows, unitCode }) {
  const totals = rows.reduce(
    (result, row) => ({
      available: result.available + row.totalAvailable,
      reserved: result.reserved + row.totalReserved,
      sellable: result.sellable + row.sellable,
    }),
    { available: 0, reserved: 0, sellable: 0 }
  )

  return (
    <div
      style={{
        margin: 8,
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        background: 'var(--color-bg-base)',
      }}
    >
      <div
        style={{
          padding: '11px 13px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid var(--color-border)',
          background: 'color-mix(in srgb, var(--color-bg-elevated) 55%, transparent)',
        }}
      >
        <MapPin size={14} color="#22d3ee" />
        <strong>{productName} — Stock by Location</strong>
      </div>

      {rows.length ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 260 }}>Location</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Available</th>
                <th style={{ textAlign: 'right' }}>Reserved</th>
                <th style={{ textAlign: 'right' }}>Sellable</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.stockLocationId}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{row.locationLabel}</div>
                    {row.type !== 'Vehicle' && row.locationCode ? (
                      <div
                        className="mono"
                        style={{ marginTop: 2, fontSize: 10, color: 'var(--color-text-dim)' }}
                      >
                        {row.locationCode}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <LocationTypeBadge type={row.type} vehicleCode={row.vehicleCode} />
                  </td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatNumber(row.totalAvailable)} <small>{row.smallestUnitCode}</small>
                  </td>
                  <td
                    className="mono"
                    style={{
                      textAlign: 'right',
                      color: row.totalReserved ? 'var(--color-amber)' : 'var(--color-text-muted)',
                    }}
                  >
                    {formatNumber(row.totalReserved)} <small>{row.smallestUnitCode}</small>
                  </td>
                  <td
                    className="mono"
                    style={{
                      textAlign: 'right',
                      fontWeight: 800,
                      color: row.sellable <= 0 ? 'var(--color-danger)' : 'var(--color-teal)',
                    }}
                  >
                    {formatNumber(row.sellable)} <small>{row.smallestUnitCode}</small>
                  </td>
                </tr>
              ))}
              <tr
                style={{
                  background: 'color-mix(in srgb, var(--color-bg-elevated) 65%, transparent)',
                }}
              >
                <td colSpan={2} style={{ fontWeight: 800 }}>
                  TOTAL
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                  {formatNumber(totals.available)} <small>{unitCode}</small>
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                  {formatNumber(totals.reserved)} <small>{unitCode}</small>
                </td>
                <td
                  className="mono"
                  style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-teal)' }}
                >
                  {formatNumber(totals.sellable)} <small>{unitCode}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: 22, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No available or reserved stock at any location.
        </div>
      )}
    </div>
  )
}

export default function StockOverviewPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [products, setProducts] = useState([])
  const [stockLocations, setStockLocations] = useState([])
  const [flagProduct, setFlagProduct] = useState(null)
  const [expandedProductId, setExpandedProductId] = useState(null)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)

  const { data: rawLevels, isLoading: isLoadingLevels, refetch: refetchLevels } = useStockLevels()
  const { data: expiringBatches, refetch: refetchExpiring } = useExpiringBatches(30)

  useEffect(() => {
    let active = true

    async function loadProducts() {
      setIsLoadingProducts(true)
      try {
        const firstPage = await masterService.listProducts({ page: 1, pageSize: 100 })
        const allProducts = [...(firstPage.items || [])]
        const totalPages = Number(firstPage.totalPages || 1)

        if (totalPages > 1) {
          const remaining = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              masterService.listProducts({ page: index + 2, pageSize: 100 })
            )
          )
          remaining.forEach((result) => allProducts.push(...(result.items || [])))
        }

        if (active) setProducts(allProducts)
      } catch (error) {
        if (active) {
          setProducts([])
          toast.error(error.message || 'Unable to load product names.')
        }
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

    async function loadStockLocations() {
      setIsLoadingLocations(true)
      try {
        const firstPage = await inventoryService.listStockLocations({ page: 1, pageSize: 100 })
        const allLocations = [...(firstPage.items || [])]
        const totalPages = Number(firstPage.totalPages || 1)

        if (totalPages > 1) {
          const remaining = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              inventoryService.listStockLocations({ page: index + 2, pageSize: 100 })
            )
          )
          remaining.forEach((result) => allLocations.push(...(result.items || [])))
        }

        if (active) setStockLocations(allLocations)
      } catch (error) {
        if (active) {
          setStockLocations([])
          toast.error(error.message || 'Unable to load stock location details.')
        }
      } finally {
        if (active) setIsLoadingLocations(false)
      }
    }

    loadStockLocations()
    return () => {
      active = false
    }
  }, [])

  const productById = useMemo(
    () =>
      products.reduce((map, product) => {
        map[product.id] = product
        return map
      }, {}),
    [products]
  )

  const locationById = useMemo(
    () =>
      stockLocations.reduce((map, location) => {
        map[location.id] = location
        return map
      }, {}),
    [stockLocations]
  )

  const stockRows = useMemo(() => {
    const grouped = new Map()

    for (const level of rawLevels || []) {
      const current = grouped.get(level.productId) || {
        productId: level.productId,
        productSku: level.productSku,
        totalAvailable: 0,
        totalReserved: 0,
        locationIds: new Set(),
        lastMovementAt: null,
        smallestUnitCode: level.smallestUnitCode || 'PCS',
        levels: [],
      }

      current.totalAvailable += Number(level.totalAvailable || 0)
      current.totalReserved += Number(level.totalReserved || 0)
      current.levels.push(level)
      if (level.stockLocationId) current.locationIds.add(level.stockLocationId)
      if (
        level.lastMovementAt &&
        (!current.lastMovementAt || dayjs(level.lastMovementAt).isAfter(current.lastMovementAt))
      ) {
        current.lastMovementAt = level.lastMovementAt
      }

      grouped.set(level.productId, current)
    }

    return [...grouped.values()].map((row) => {
      const locationRows = row.levels
        .map((level) => {
          const location = locationById[level.stockLocationId]
          const type = getLocationType(location)
          const locationCode = location?.code || ''
          const locationName = location?.name || level.stockLocationId

          return {
            ...level,
            totalAvailable: Number(level.totalAvailable || 0),
            totalReserved: Number(level.totalReserved || 0),
            sellable: Number(level.totalAvailable || 0) - Number(level.totalReserved || 0),
            type,
            locationCode,
            vehicleCode: type === 'Vehicle' ? locationCode : '',
            locationLabel:
              type === 'Vehicle' && locationCode
                ? `${locationCode}${locationName !== locationCode ? ` (${locationName})` : ''}`
                : locationName,
            smallestUnitCode: level.smallestUnitCode || row.smallestUnitCode,
          }
        })
        .filter((level) => level.totalAvailable > 0 || level.totalReserved > 0)
        .sort(
          (a, b) => a.type.localeCompare(b.type) || a.locationLabel.localeCompare(b.locationLabel)
        )

      return {
        ...row,
        sellable: row.totalAvailable - row.totalReserved,
        locationCount: locationRows.length,
        locationRows,
        product: productById[row.productId] || null,
      }
    })
  }, [locationById, productById, rawLevels])

  const locationTypeKpis = useMemo(() => {
    const result = {
      Main: { available: 0, products: new Set(), locations: new Set() },
      Vehicle: { available: 0, products: new Set(), locations: new Set() },
      Return: { available: 0, products: new Set(), locations: new Set() },
    }

    for (const level of rawLevels || []) {
      const available = Number(level.totalAvailable || 0)
      const reserved = Number(level.totalReserved || 0)
      if (available <= 0 && reserved <= 0) continue

      const type = getLocationType(locationById[level.stockLocationId])
      result[type].available += available
      result[type].products.add(level.productId)
      result[type].locations.add(level.stockLocationId)
    }

    return result
  }, [locationById, rawLevels])

  const kpis = useMemo(() => {
    const available = stockRows.reduce((sum, row) => sum + row.totalAvailable, 0)
    const reserved = stockRows.reduce((sum, row) => sum + row.totalReserved, 0)
    const locationIds = new Set(stockRows.flatMap((row) => [...row.locationIds]))

    return {
      productsWithStock: stockRows.filter((row) => row.totalAvailable > 0).length,
      available,
      reserved,
      sellable: available - reserved,
      locations: locationIds.size,
      expiring: (expiringBatches || []).length,
    }
  }, [expiringBatches, stockRows])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()

    return stockRows
      .filter((row) => {
        if (!term) return true
        return (
          row.productSku?.toLowerCase().includes(term) ||
          row.product?.name?.toLowerCase().includes(term) ||
          row.product?.barcode?.toLowerCase().includes(term)
        )
      })
      .filter((row) => !lowStockOnly || row.sellable <= 0)
      .sort((a, b) =>
        (a.product?.name || a.productSku).localeCompare(b.product?.name || b.productSku)
      )
  }, [lowStockOnly, search, stockRows])

  useEffect(() => {
    setPage(1)
  }, [search, lowStockOnly])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [filteredRows.length, page])

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page])

  function handleRefresh() {
    refetchLevels()
    refetchExpiring()
  }

  const isLoading = isLoadingLevels || isLoadingProducts || isLoadingLocations

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <h1 style={{ fontSize: 25, fontWeight: 800 }}>Stock Overview</h1>
            {!isLoading ? (
              <span className="mono" style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                {stockRows.length} SKUs
              </span>
            ) : null}
          </div>
          <p style={{ marginTop: 3, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Live inventory position consolidated across all stock locations.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="button-secondary"
          disabled={isLoading}
          style={{ height: 36 }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Products in stock"
          value={formatNumber(kpis.productsWithStock)}
          helper={`${kpis.locations} active stock location${kpis.locations === 1 ? '' : 's'}`}
          icon={Boxes}
          tone="var(--color-blue)"
        />
        <MetricCard
          label="Available units"
          value={formatNumber(kpis.available)}
          helper="Physical quantity on hand"
          icon={Package}
          tone="var(--color-teal)"
        />
        <MetricCard
          label="Sellable units"
          value={formatNumber(kpis.sellable)}
          helper={`${formatNumber(kpis.reserved)} currently reserved`}
          icon={ShieldCheck}
          tone="var(--color-amber)"
        />
        <MetricCard
          label="Expiring within 30 days"
          value={formatNumber(kpis.expiring)}
          helper={kpis.expiring ? 'Review affected batches' : 'No batches need attention'}
          icon={AlertTriangle}
          tone={kpis.expiring ? 'var(--color-danger)' : 'var(--color-text-muted)'}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard
          label="Main inventory"
          value={`${formatNumber(locationTypeKpis.Main.available)} units`}
          helper={`Across ${locationTypeKpis.Main.products.size} product${locationTypeKpis.Main.products.size === 1 ? '' : 's'}`}
          icon={Warehouse}
          tone="var(--color-text-muted)"
        />
        <MetricCard
          label="Vehicle stock"
          value={`${formatNumber(locationTypeKpis.Vehicle.available)} units`}
          helper={`Across ${locationTypeKpis.Vehicle.locations.size} vehicle${locationTypeKpis.Vehicle.locations.size === 1 ? '' : 's'}`}
          icon={Truck}
          tone="#22d3ee"
        />
        <MetricCard
          label="Return stock"
          value={`${formatNumber(locationTypeKpis.Return.available)} units`}
          helper={`${locationTypeKpis.Return.products.size} product${locationTypeKpis.Return.products.size === 1 ? '' : 's'} awaiting return`}
          icon={RotateCcw}
          tone="var(--color-amber)"
        />
      </div>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div
          className="responsive-filter-bar"
          style={{
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ position: 'relative', width: 'min(100%, 480px)' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-dim)',
              }}
            />
            <input
              className="form-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search SKU, product name, or barcode"
              style={{ height: 36, paddingLeft: 36, background: 'var(--color-bg-base)' }}
            />
          </div>

          <button
            type="button"
            className={lowStockOnly ? 'button-primary' : 'button-secondary'}
            onClick={() => setLowStockOnly((current) => !current)}
            style={{ height: 34, padding: '0 12px', fontSize: 12 }}
          >
            <AlertTriangle size={13} /> Critical stock only
          </button>
        </div>

        <div
          style={{
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: 'color-mix(in srgb, var(--color-bg-elevated) 45%, transparent)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Warehouse size={15} color="var(--color-amber)" />
            <strong style={{ fontSize: 13 }}>Inventory position</strong>
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
            {filteredRows.length} product{filteredRows.length === 1 ? '' : 's'}
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading inventory position...
          </div>
        ) : filteredRows.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table product-table-compact" style={{ minWidth: 1080 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 280 }}>Product</th>
                  <th>Status</th>
                  <th>Locations</th>
                  <th style={{ textAlign: 'right' }}>Available</th>
                  <th style={{ textAlign: 'right' }}>Reserved</th>
                  <th style={{ textAlign: 'right' }}>Sellable</th>
                  <th>Last activity</th>
                  <th style={{ width: 250 }}></th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => {
                  const productName = row.product?.name || 'Product name unavailable'
                  const uom = row.product?.uomBase || ''
                  const status =
                    row.sellable <= 0
                      ? 'Critical'
                      : row.totalReserved > 0
                        ? 'Allocated'
                        : 'Available'

                  return (
                    <Fragment key={row.productId}>
                      <tr>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 31,
                                height: 31,
                                flex: '0 0 auto',
                                display: 'grid',
                                placeItems: 'center',
                                borderRadius: 7,
                                color: 'var(--color-text-muted)',
                                background: 'var(--color-bg-elevated)',
                                border: '1px solid var(--color-border)',
                              }}
                            >
                              <Package size={14} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700 }}>{productName}</div>
                              <div
                                className="mono"
                                style={{
                                  marginTop: 2,
                                  fontSize: 10,
                                  color: 'var(--color-text-dim)',
                                }}
                              >
                                {row.productSku}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={status} />
                        </td>
                        <td>
                          <span className="mono" style={{ fontWeight: 700 }}>
                            {row.locationCount}
                          </span>{' '}
                          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                            location{row.locationCount === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatNumber(row.totalAvailable)}{' '}
                          <small style={{ color: 'var(--color-text-dim)' }}>
                            {row.smallestUnitCode || 'PCS'}
                          </small>
                        </td>
                        <td
                          className="mono"
                          style={{
                            textAlign: 'right',
                            color: row.totalReserved
                              ? 'var(--color-amber)'
                              : 'var(--color-text-muted)',
                          }}
                        >
                          {formatNumber(row.totalReserved)}{' '}
                          <small style={{ color: 'var(--color-text-dim)' }}>
                            {row.smallestUnitCode || 'PCS'}
                          </small>
                        </td>
                        <td
                          className="mono"
                          style={{
                            textAlign: 'right',
                            fontWeight: 800,
                            color: row.sellable <= 0 ? 'var(--color-danger)' : 'var(--color-teal)',
                          }}
                        >
                          {formatNumber(row.sellable)}{' '}
                          <small style={{ color: 'var(--color-text-dim)' }}>
                            {row.smallestUnitCode || 'PCS'}
                          </small>
                        </td>
                        <td>
                          <div style={{ fontSize: 12 }}>{formatDate(row.lastMovementAt)}</div>
                          {row.lastMovementAt ? (
                            <div
                              className="mono"
                              style={{ marginTop: 2, fontSize: 10, color: 'var(--color-text-dim)' }}
                            >
                              {formatTime(row.lastMovementAt)}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              type="button"
                              className="button-ghost"
                              onClick={() =>
                                setFlagProduct({
                                  id: row.productId,
                                  sku: row.productSku,
                                  name: productName,
                                })
                              }
                              style={{ height: 30, padding: '0 9px', fontSize: 11 }}
                            >
                              <Flag size={12} /> Flag return
                            </button>
                            <button
                              type="button"
                              className={
                                expandedProductId === row.productId
                                  ? 'button-secondary'
                                  : 'button-ghost'
                              }
                              onClick={() =>
                                setExpandedProductId((current) =>
                                  current === row.productId ? null : row.productId
                                )
                              }
                              aria-expanded={expandedProductId === row.productId}
                              style={{ height: 30, padding: '0 9px', fontSize: 11 }}
                            >
                              <MapPin size={12} /> Locations
                              {expandedProductId === row.productId ? (
                                <ChevronDown size={12} />
                              ) : (
                                <ChevronRight size={12} />
                              )}
                            </button>
                            <button
                              type="button"
                              className="button-primary"
                              onClick={() => navigate(`/inventory/stock/batches/${row.productId}`)}
                              style={{ height: 30, padding: '0 10px', fontSize: 11 }}
                            >
                              Batches <ChevronRight size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedProductId === row.productId ? (
                        <tr>
                          <td
                            colSpan={8}
                            style={{ padding: 0, background: 'var(--color-bg-surface)' }}
                          >
                            <StockByLocationPanel
                              productName={productName}
                              rows={row.locationRows}
                              unitCode={row.smallestUnitCode || uom || 'PCS'}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Package size={27} style={{ margin: '0 auto 8px', color: 'var(--color-text-dim)' }} />
            No products match the current stock filter.
          </div>
        )}

        {filteredRows.length ? (
          <div style={{ padding: '0 12px 10px' }}>
            <SimplePagination
              page={page}
              pageSize={pageSize}
              totalItems={filteredRows.length}
              onPageChange={setPage}
              itemLabel="products"
            />
          </div>
        ) : null}
      </section>

      <FlagStockForReturnModal
        isOpen={Boolean(flagProduct)}
        product={flagProduct}
        onClose={() => setFlagProduct(null)}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
