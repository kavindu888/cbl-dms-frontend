import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Truck,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import StatusBadge from '@components/ui/StatusBadge'
import {
  mockCollectionsVsInvoiced,
  mockDashboardKpis,
  mockFleetStatus,
  mockLowStock,
  mockRecentInvoices,
  mockWeeklySales,
} from '@data/mockDashboard'

function formatLKR(value: number) {
  if (value >= 1_000_000) return `Rs. ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `Rs. ${(value / 1_000).toFixed(0)}K`
  return `Rs. ${value.toLocaleString()}`
}

function formatLKRFull(value: number) {
  return `Rs. ${value.toLocaleString()}`
}

export default function DashboardPage() {
  const { todaySales, outstandingCredit, totalStockValue, fleetOnRoad } = mockDashboardKpis

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Tuesday, 29 Apr 2026 · Real-time view of operations
          </p>
        </div>
        <button className="button-primary flex items-center gap-2">
          <Download className="h-4 w-4" />
          Generate Daily Report
        </button>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Today's Sales */}
        <div className="panel p-5">
          <p className="eyebrow">Today's Sales</p>
          <div
            className="mt-3 text-3xl font-bold mono"
            style={{ color: 'var(--color-amber)' }}
          >
            Rs. {todaySales.value.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <ArrowUpRight className="h-4 w-4" style={{ color: 'var(--color-teal)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-teal)' }}>
              {todaySales.trendPct}% {todaySales.trendLabel}
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {todaySales.sub}
          </p>
        </div>

        {/* Outstanding Credit */}
        <div className="panel p-5">
          <p className="eyebrow">Outstanding Credit</p>
          <div
            className="mt-3 text-3xl font-bold mono"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Rs. {outstandingCredit.value.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--color-warning)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>
              {outstandingCredit.alert}
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {outstandingCredit.sub}
          </p>
        </div>

        {/* Total Stock Value */}
        <div className="panel p-5">
          <p className="eyebrow">Total Stock Value</p>
          <div
            className="mt-3 text-3xl font-bold mono"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Rs.{' '}
            <span className="text-4xl">
              {(totalStockValue.value / 1_000_000).toFixed(3).replace('.', ',')}
            </span>
            <span className="text-xl">000</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <ArrowDownRight className="h-4 w-4" style={{ color: 'var(--color-danger)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
              {totalStockValue.trendPct}% {totalStockValue.trendLabel}
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {totalStockValue.sub}
          </p>
        </div>

        {/* Fleet on Road */}
        <div className="panel p-5">
          <p className="eyebrow">Fleet on Road</p>
          <div
            className="mt-3 text-3xl font-bold mono"
            style={{ color: 'var(--color-teal)' }}
          >
            {fleetOnRoad.active}{' '}
            <span style={{ color: 'var(--color-text-muted)' }}>/ {fleetOnRoad.total}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--color-warning)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>
              {fleetOnRoad.alert}
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {fleetOnRoad.sub}
          </p>
        </div>
      </div>

      {/* ── Charts row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Sales bar chart */}
        <div className="panel p-5">
          <div className="mb-4">
            <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Sales This Week
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Mon 22 Apr – Sun 28 Apr (LKR)
            </p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockWeeklySales} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatLKR(v as number)}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                formatter={(v) => [formatLKRFull(v as number), 'Sales']}
                contentStyle={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'var(--color-text-primary)',
                }}
              />
              <Bar dataKey="sales" fill="var(--color-amber)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Collections vs Invoiced area chart */}
        <div className="panel p-5">
          <div className="mb-4">
            <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Collections vs Invoiced
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              April 2026 — cumulative (LKR)
            </p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={mockCollectionsVsInvoiced}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="invoicedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#66B5FA" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#66B5FA" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#20D4BF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#20D4BF" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatLKR(v as number)}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                formatter={(v, name) => [formatLKRFull(v as number), name]}
                contentStyle={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'var(--color-text-primary)',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)', paddingTop: 8 }}
              />
              <Area
                type="monotone"
                dataKey="invoiced"
                name="Invoiced"
                stroke="#66B5FA"
                fill="url(#invoicedGrad)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="collected"
                name="Collected"
                stroke="#20D4BF"
                fill="url(#collectedGrad)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr]">
        {/* Recent Invoices */}
        <div className="panel overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Recent Invoices
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Last 5 transactions
            </p>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockRecentInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <span
                      className="mono text-sm font-medium"
                      style={{ color: 'var(--color-amber)', cursor: 'pointer' }}
                    >
                      {inv.id}
                    </span>
                  </td>
                  <td className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {inv.customer}
                  </td>
                  <td className="mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    Rs.&nbsp;{inv.amount.toLocaleString()}
                  </td>
                  <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {inv.type}
                  </td>
                  <td>
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Low Stock */}
        <div className="panel overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: 'var(--color-warning)' }} />
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Low Stock
              </p>
            </div>
            <span
              className="mono text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(244,63,94,0.15)',
                color: '#F43F5E',
                border: '1px solid #F43F5E',
              }}
            >
              {mockLowStock.length} ITEMS
            </span>
          </div>
          <div className="p-3 space-y-2">
            {mockLowStock.map((item) => (
              <div
                key={item.sku}
                className="flex items-center justify-between gap-3 rounded-md px-3 py-2"
                style={{ background: 'rgba(27,48,80,0.4)' }}
              >
                <div className="min-w-0">
                  <p
                    className="truncate text-sm"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {item.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {item.cases} cases
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
            <button
              className="mt-2 w-full text-center text-xs font-medium"
              style={{ color: 'var(--color-amber)' }}
            >
              View Full Stock →
            </button>
          </div>
        </div>

        {/* Fleet Status */}
        <div className="panel overflow-hidden">
          <div
            className="px-5 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" style={{ color: 'var(--color-blue)' }} />
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Fleet Status
              </p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {mockFleetStatus.map((v) => (
              <div
                key={v.reg}
                className="rounded-md px-3 py-3"
                style={{
                  background: 'rgba(27,48,80,0.4)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="mono text-xs font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {v.reg}
                  </span>
                  <StatusBadge status={v.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {v.type}
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    {v.driver}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
