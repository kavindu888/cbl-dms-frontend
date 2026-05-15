import dayjs from 'dayjs'
import { AlertTriangle, Package, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import StatusBadge from '@components/ui/StatusBadge'
import { mockProducts } from '@data/mockProducts'

const CATEGORIES = ['All', ...Array.from(new Set(mockProducts.map((p) => p.category)))]

function stockStatus(cases: number): string {
  if (cases <= 5)  return 'CRITICAL'
  if (cases <= 15) return 'LOW'
  return 'ACTIVE'
}

export default function StockOverviewPage() {
  const [search, setSearch]   = useState('')
  const [category, setCategory] = useState('All')
  const [stockOnly, setStockOnly] = useState(false)

  const filtered = useMemo(
    () =>
      mockProducts.filter((p) => {
        const matchSearch =
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase())
        const matchCat = category === 'All' || p.category === category
        const matchStock = !stockOnly || p.cases <= 15
        return matchSearch && matchCat && matchStock
      }),
    [search, category, stockOnly]
  )

  const totalValue = mockProducts.reduce((s, p) => s + p.stockValue, 0)
  const lowCount   = mockProducts.filter((p) => p.cases <= 15).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Inventory
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {mockProducts.length} SKUs · Stock as of today
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total SKUs',   value: mockProducts.length.toString(),      color: 'var(--color-text-primary)' },
          { label: 'Total Value',  value: `Rs. ${(totalValue / 1000000).toFixed(2)}M`, color: 'var(--color-amber)' },
          { label: 'Low / Critical', value: lowCount.toString(),               color: 'var(--color-danger)' },
          { label: 'Categories',   value: (CATEGORIES.length - 1).toString(),  color: 'var(--color-blue)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="panel p-4">
            <p className="eyebrow">{label}</p>
            <p className="mt-2 text-2xl font-bold mono" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--color-text-dim)' }} />
          <input
            className="form-input pl-9"
            placeholder="Search SKU or product name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input w-auto"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ cursor: 'pointer', minWidth: 140 }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} style={{ background: 'var(--color-bg-elevated)' }}>
              {c === 'All' ? 'All Categories' : c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={stockOnly}
            onChange={(e) => setStockOnly(e.target.checked)}
            style={{ accentColor: 'var(--color-amber)' }}
          />
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Low stock only
          </span>
        </label>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package className="h-10 w-10" style={{ color: 'var(--color-text-dim)' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>No products match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th className="text-right">Cases</th>
                  <th className="text-right">Units</th>
                  <th className="text-right">Stock Value</th>
                  <th>Expiry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const status = stockStatus(p.cases)
                  const isExpiringSoon =
                    p.expiryDate &&
                    dayjs(p.expiryDate).diff(dayjs(), 'day') <= 60
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="mono text-xs font-medium" style={{ color: 'var(--color-amber)' }}>
                          {p.sku}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {(status === 'CRITICAL' || status === 'LOW') && (
                            <AlertTriangle
                              className="h-3.5 w-3.5 shrink-0"
                              style={{ color: status === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)' }}
                            />
                          )}
                          <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {p.category}
                      </td>
                      <td className="text-right mono text-sm font-semibold" style={{
                        color: status === 'CRITICAL' ? 'var(--color-danger)'
                          : status === 'LOW' ? 'var(--color-warning)'
                          : 'var(--color-text-primary)',
                      }}>
                        {p.cases}
                      </td>
                      <td className="text-right mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {p.units.toLocaleString()}
                      </td>
                      <td className="text-right mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        Rs. {p.stockValue.toLocaleString()}
                      </td>
                      <td>
                        {p.expiryDate ? (
                          <span
                            className="text-xs"
                            style={{ color: isExpiringSoon ? 'var(--color-warning)' : 'var(--color-text-muted)' }}
                          >
                            {dayjs(p.expiryDate).format('DD MMM YYYY')}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
