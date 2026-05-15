import * as Tabs from '@radix-ui/react-tabs'
import dayjs from 'dayjs'
import { Eye, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import StatusBadge from '@components/ui/StatusBadge'
import { mockPurchaseOrders, mockSuppliers } from '@data/mockPurchaseOrders'
import { PurchaseOrderStatus } from '@/types/purchasing.types'
import type { PurchaseOrderDto } from '@/types/purchasing.types'

const STATUS_OPTIONS = ['All', ...Object.values(PurchaseOrderStatus)]

function formatLKR(value: number) {
  return `Rs. ${value.toLocaleString()}`
}

/* ── Purchase Orders tab ──────────────────────────────────────── */

function PurchaseOrdersTab() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [supplierFilter, setSupplierFilter] = useState('All')

  const uniqueSuppliers = useMemo(
    () => ['All', ...Array.from(new Set(mockPurchaseOrders.map((po) => po.supplierName)))],
    []
  )

  const filtered = useMemo<PurchaseOrderDto[]>(() => {
    return mockPurchaseOrders.filter((po) => {
      const matchSearch =
        !search ||
        po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'All' || po.status === statusFilter
      const matchSupplier = supplierFilter === 'All' || po.supplierName === supplierFilter
      return matchSearch && matchStatus && matchSupplier
    })
  }, [search, statusFilter, supplierFilter])

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-48">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--color-text-dim)' }}
          />
          <input
            className="form-input pl-9"
            placeholder="Search PO number or supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ cursor: 'pointer', minWidth: 140 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} style={{ background: 'var(--color-bg-elevated)' }}>
              {s === 'All' ? 'All Statuses' : s}
            </option>
          ))}
        </select>
        <select
          className="form-input w-auto"
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          style={{ cursor: 'pointer', minWidth: 200 }}
        >
          {uniqueSuppliers.map((s) => (
            <option key={s} value={s} style={{ background: 'var(--color-bg-elevated)' }}>
              {s === 'All' ? 'All Suppliers' : s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'var(--color-bg-elevated)' }}
            >
              <Search className="h-6 w-6" style={{ color: 'var(--color-text-dim)' }} />
            </div>
            <div className="text-center">
              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                No purchase orders found
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Try adjusting your filters or create a new purchase order
              </p>
            </div>
            <button className="button-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Purchase Order
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Expected</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th className="text-right">Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((po) => (
                  <tr
                    key={po.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/purchasing/${po.id}`)}
                  >
                    <td>
                      <span
                        className="mono text-sm font-semibold"
                        style={{ color: 'var(--color-amber)' }}
                      >
                        {po.poNumber}
                      </span>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {dayjs(po.orderDate).format('DD MMM YYYY')}
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {po.supplierName}
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {dayjs(po.expectedDate).format('DD MMM YYYY')}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {po.lines.length}
                    </td>
                    <td className="text-right">
                      <span className="mono text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {formatLKR(po.totalAmount)}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          className="icon-button"
                          title="View details"
                          onClick={() => navigate(`/purchasing/${po.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary row */}
      {filtered.length > 0 && (
        <p className="text-xs text-right" style={{ color: 'var(--color-text-dim)' }}>
          Showing {filtered.length} of {mockPurchaseOrders.length} purchase orders
        </p>
      )}
    </div>
  )
}

/* ── Suppliers tab ────────────────────────────────────────────── */

function SuppliersTab() {
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      mockSuppliers.filter(
        (s) =>
          !search ||
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.code.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  )

  return (
    <div className="space-y-4">
      <div className="panel flex items-center gap-3 p-4">
        <div className="relative flex-1 min-w-48">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--color-text-dim)' }}
          />
          <input
            className="form-input pl-9"
            placeholder="Search suppliers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Supplier Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="mono text-xs font-medium" style={{ color: 'var(--color-amber)' }}>
                      {s.code}
                    </span>
                  </td>
                  <td className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {s.name}
                  </td>
                  <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{s.contact}</td>
                  <td className="text-sm" style={{ color: 'var(--color-blue)' }}>{s.email}</td>
                  <td className="mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.phone}</td>
                  <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{s.city}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td>
                    <button className="icon-button" title="View supplier">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */

const TAB_STYLE_BASE: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  borderBottom: '2px solid transparent',
  color: 'var(--color-text-muted)',
  transition: 'color 150ms, border-color 150ms',
  whiteSpace: 'nowrap',
}

export default function PurchaseOrderListPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Purchasing
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Manage purchase orders and supplier accounts
          </p>
        </div>
        <button className="button-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Purchase Order
        </button>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="orders">
        <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
          <Tabs.List className="flex gap-1" aria-label="Purchasing sections">
            <Tabs.Trigger
              value="orders"
              style={TAB_STYLE_BASE}
              className="data-[state=active]:text-amber data-[state=active]:border-b-amber"
            >
              Purchase Orders
            </Tabs.Trigger>
            <Tabs.Trigger
              value="suppliers"
              style={TAB_STYLE_BASE}
              className="data-[state=active]:text-amber data-[state=active]:border-b-amber"
            >
              Suppliers
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        <Tabs.Content value="orders">
          <PurchaseOrdersTab />
        </Tabs.Content>
        <Tabs.Content value="suppliers">
          <SuppliersTab />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
