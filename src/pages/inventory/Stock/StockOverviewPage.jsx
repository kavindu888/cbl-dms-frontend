import { AlertTriangle, ChevronRight, Package, RefreshCw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import SimplePagination from '@components/ui/SimplePagination'
import KPICard from '@components/ui/KPICard'
import { useStockLevels, useExpiringBatches } from '@/hooks/useStock'
import { masterService } from '@/services/api/masterService'

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const pageSize = 12

export default function StockOverviewPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [products, setProducts] = useState([])

  const { data: rawLevels, isLoading: isLoadingLevels, refetch: refetchLevels } = useStockLevels()
  const { data: expiringBatches, isLoading: isLoadingExpiring, refetch: refetchExpiring } = useExpiringBatches(30)

  // Load Products list for names
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await masterService.listProducts({ page: 1, pageSize: 200 })
        setProducts(res.items || [])
      } catch (err) {
        console.error('Failed to load products:', err)
      }
    }
    loadProducts()
  }, [])

  const productNameById = useMemo(() => {
    return products.reduce((map, product) => {
      map[product.id] = product.name
      return map
    }, {})
  }, [products])

  const productUomById = useMemo(() => {
    return products.reduce((map, product) => {
      map[product.id] = product.uomBase || ''
      return map
    }, {})
  }, [products])

  const kpis = useMemo(() => {
    const levels = rawLevels || []
    const expiring = expiringBatches || []

    const productsWithStock = new Set(levels.filter(l => l.totalAvailable > 0).map(l => l.productId)).size
    const totalAvailable = levels.reduce((sum, l) => sum + Number(l.totalAvailable || 0), 0)
    const totalReserved = levels.reduce((sum, l) => sum + Number(l.totalReserved || 0), 0)
    const totalExpiring = expiring.length

    return {
      productsWithStock,
      totalAvailable,
      totalReserved,
      totalExpiring,
    }
  }, [rawLevels, expiringBatches])

  const filteredLevels = useMemo(() => {
    let result = rawLevels || []

    const term = search.trim().toLowerCase()
    if (term) {
      result = result.filter(item => {
        const name = productNameById[item.productId] || ''
        return (
          item.productSku?.toLowerCase().includes(term) ||
          item.productId?.toLowerCase().includes(term) ||
          name.toLowerCase().includes(term)
        )
      })
    }

    if (lowStockOnly) {
      result = result.filter(item => item.totalAvailable <= (item.totalReserved || 0))
    }

    return result
  }, [rawLevels, search, lowStockOnly, productNameById])

  useEffect(() => {
    setPage(1)
  }, [search, lowStockOnly])

  const pagedLevels = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredLevels.slice(start, start + pageSize)
  }, [filteredLevels, page])

  function handleRefresh() {
    refetchLevels()
    refetchExpiring()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Stock Levels Overview
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Real-time tracking of product availabilities, reservations, and expiring batches.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="button-secondary"
          style={{ height: 40, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Products with Stock"
          value={kpis.productsWithStock}
          icon={Package}
          color="var(--color-blue)"
        />
        <KPICard
          title="Total Items Available"
          value={formatNumber(kpis.totalAvailable)}
          icon={Package}
          color="var(--color-teal)"
        />
        <KPICard
          title="Total Items Reserved"
          value={formatNumber(kpis.totalReserved)}
          icon={Package}
          color="var(--color-warning)"
        />
        <KPICard
          title="Expiring Soon (30d)"
          value={kpis.totalExpiring}
          icon={AlertTriangle}
          color="var(--color-danger)"
        />
      </div>

      {/* Filter Bar */}
      <div className="panel responsive-filter-bar" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, product ID or name..."
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

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          Low Stock Only
        </label>
      </div>

      {/* Levels Table */}
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {isLoadingLevels ? (
          <div style={{ textAlign: 'center', padding: 36, color: 'var(--color-text-muted)' }}>Loading stock levels...</div>
        ) : filteredLevels.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table master-table-compact">
              <thead>
                <tr>
                  <th>Product SKU</th>
                  <th>Product Name</th>
                  <th style={{ textAlign: 'right' }}>Total Available</th>
                  <th style={{ textAlign: 'right' }}>Reserved</th>
                  <th style={{ textAlign: 'right' }}>Sellable</th>
                  <th>Last Movement</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {pagedLevels.map((item) => {
                  const sellable = Number(item.totalAvailable || 0) - Number(item.totalReserved || 0)
                  const uom = productUomById[item.productId] || ''
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="mono" style={{ color: 'var(--color-amber)', fontWeight: 600 }}>
                          {item.productSku}
                        </span>
                      </td>
                      <td>{productNameById[item.productId] || item.productId}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatNumber(item.totalAvailable)} <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>{uom}</span>
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {formatNumber(item.totalReserved)} <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>{uom}</span>
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: sellable <= 0 ? 'var(--color-danger)' : 'var(--color-teal)' }}>
                        {formatNumber(sellable)} <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>{uom}</span>
                      </td>
                      <td>{item.lastMovementAt ? dayjs(item.lastMovementAt).format('DD MMM YYYY HH:mm') : '-'}</td>
                      <td>
                        <button
                          onClick={() => navigate(`/inventory/stock/batches/${item.productId}`)}
                          className="btn-table-action btn-table-action-view"
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <span>View Batches</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No stock levels matched your search filters.
          </div>
        )}

        <div style={{ padding: '0 16px 12px' }}>
          <SimplePagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredLevels.length}
            onPageChange={setPage}
            itemLabel="items"
          />
        </div>
      </section>
    </div>
  )
}
