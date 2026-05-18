import {
  Download,
  TrendingUp,
  BarChart2,
  FileText,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
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
import { useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()
  const { todaySales, outstandingCredit, totalStockValue, fleetOnRoad } = mockDashboardKpis

  return (
    <div className="flex flex-col gap-10">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-6 pb-2">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--color-text-primary)]">
            Dashboard
          </h1>
          <p className="mt-2 text-sm font-medium text-[var(--color-text-muted)]">
            Tuesday, 29 Apr 2026 · Real-time view of operations
          </p>
        </div>
        <button className="button-primary px-6 h-11 flex items-center gap-2 text-sm font-bold shadow-lg shadow-[var(--color-amber)]/10">
          <Download className="h-4 w-4" />
          Generate Daily Report
        </button>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {/* Today's Sales */}
        <div className="panel p-6 group hover:border-[var(--color-amber)]/30 transition-colors">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[var(--color-amber)] opacity-80 mb-4 uppercase">TODAY'S SALES</p>
          <div className="text-3xl font-black mono text-[var(--color-amber)] mb-2">
            Rs. {todaySales.value.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowUpRight className="h-4 w-4 text-[var(--color-teal)]" />
            <span className="text-sm font-bold text-[var(--color-teal)]">
              {todaySales.trendPct}% vs yesterday
            </span>
          </div>
          <p className="text-xs font-medium text-[var(--color-text-dim)]">
            47 invoices issued today
          </p>
        </div>

        {/* Outstanding Credit */}
        <div className="panel p-6 group hover:border-[var(--color-amber)]/30 transition-colors">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[var(--color-text-muted)] mb-4 uppercase">OUTSTANDING CREDIT</p>
          <div className="text-3xl font-black mono text-[var(--color-text-primary)] mb-2">
            Rs. {outstandingCredit.value.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-4 w-4 text-[var(--color-amber)]" />
            <span className="text-sm font-bold text-[var(--color-amber)]">
              {outstandingCredit.alert}
            </span>
          </div>
          <p className="text-xs font-medium text-[var(--color-text-dim)]">
            Across 34 customers
          </p>
        </div>

        {/* Total Stock Value */}
        <div className="panel p-6 group hover:border-[var(--color-amber)]/30 transition-colors">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[var(--color-text-muted)] mb-4 uppercase">TOTAL STOCK VALUE</p>
          <div className="text-3xl font-black mono text-[var(--color-text-primary)] mb-2">
            Rs. {(totalStockValue.value / 1000).toLocaleString()} <span className="text-xl opacity-60">000</span>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowDownRight className="h-4 w-4 text-[var(--color-danger)]" />
            <span className="text-sm font-bold text-[var(--color-danger)]">
              {totalStockValue.trendPct}% vs last week
            </span>
          </div>
          <p className="text-xs font-medium text-[var(--color-text-dim)]">
            284 active SKUs in warehouse
          </p>
        </div>

        {/* Fleet on Road */}
        <div className="panel p-6 group hover:border-[var(--color-amber)]/30 transition-colors">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[var(--color-text-muted)] mb-4 uppercase">FLEET ON ROAD</p>
          <div className="text-3xl font-black mono text-[var(--color-teal)] mb-2">
            {fleetOnRoad.active} <span className="text-2xl text-[var(--color-text-dim)]">/ {fleetOnRoad.total}</span>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-4 w-4 text-[var(--color-amber)]" />
            <span className="text-sm font-bold text-[var(--color-amber)]">
              {fleetOnRoad.alert}
            </span>
          </div>
          <p className="text-xs font-medium text-[var(--color-text-dim)]">
            Routes active since 06:00
          </p>
        </div>
      </div>
 
      {/* ── Charts Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Sales bar chart */}
        <div className="panel p-6">
          <div className="mb-8">
            <h3 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Sales This Week
            </h3>
            <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Mon 22 Apr – Sun 28 Apr (LKR)
            </p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={mockWeeklySales} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
              <XAxis
                dataKey="day"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tickFormatter={(v) => formatLKR(v as number)}
                tick={{ fill: 'var(--color-text-dim)', fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: 'var(--shadow-modal)',
                }}
                formatter={(v) => [formatLKRFull(v as number), 'Sales']}
              />
              <Bar dataKey="sales" fill="var(--color-amber)" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Collections vs Invoiced area chart */}
        <div className="panel p-6">
          <div className="mb-8">
            <h3 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Collections vs Invoiced
            </h3>
            <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              April 2026 — cumulative (LKR)
            </p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={mockCollectionsVsInvoiced}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="invoicedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#66B5FA" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#66B5FA" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#20D4BF" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#20D4BF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tickFormatter={(v) => formatLKR(v as number)}
                tick={{ fill: 'var(--color-text-dim)', fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  boxShadow: 'var(--shadow-modal)',
                }}
                formatter={(v, name) => [formatLKRFull(v as number), name]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', paddingTop: 20 }}
              />
              <Area
                type="monotone"
                dataKey="invoiced"
                name="Invoiced"
                stroke="#66B5FA"
                fill="url(#invoicedGrad)"
                strokeWidth={3}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="collected"
                name="Collected"
                stroke="#20D4BF"
                fill="url(#collectedGrad)"
                strokeWidth={3}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────────────────────────── */}
      <div className="grid  grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent Invoices */}
        <div className="panel xl:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Recent Invoices</h3>
            <span className="text-[11px] font-bold text-[var(--color-text-dim)] uppercase tracking-widest">
              Last 5 transactions
            </span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--color-bg-elevated)]/30">
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-dim)] uppercase tracking-wider">INVOICE #</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-dim)] uppercase tracking-wider">CUSTOMER</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-dim)] uppercase tracking-wider text-right">AMOUNT</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-dim)] uppercase tracking-wider">TYPE</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-dim)] uppercase tracking-wider text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {mockRecentInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-sm font-black mono text-[var(--color-amber)] group-hover:underline cursor-pointer">
                    {inv.id}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[var(--color-text-primary)]">
                    {inv.customer}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold mono text-right text-[var(--color-text-primary)]">
                    Rs. {inv.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-text-muted)] font-medium">
                    {inv.type}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Stack: Low Stock & Fleet Status */}
        <div className="flex flex-col gap-6">
          {/* Low Stock */}
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Low Stock</h3>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {mockLowStock.slice(0, 3).map((item) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                      {item.name}
                    </p>
                    <p className="text-xs font-medium text-[var(--color-text-dim)]">
                      {item.cases} cases
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
              <button className="w-full mt-2 text-[11px] font-bold text-[var(--color-amber)] hover:underline uppercase tracking-widest pt-2">
                View Full Stock →
              </button>
            </div>
          </div>

          {/* Fleet Status */}
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-[var(--color-blue)]" />
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Fleet Status</h3>
              </div>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {mockFleetStatus.map((v) => (
                <div key={v.reg} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-black mono text-[var(--color-text-primary)]">
                      {v.reg}
                    </span>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)]">
                    <span>{v.type}</span>
                    <span className="text-[var(--color-text-dim)]">{v.driver}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
