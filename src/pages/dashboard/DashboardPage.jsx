import { AlertTriangle, ArrowRight, FileDown } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
} from 'recharts'

const weeklySalesData = [
  { day: 'Mon', sales: 1200000 },
  { day: 'Tue', sales: 1400000 },
  { day: 'Wed', sales: 900000 },
  { day: 'Thu', sales: 1600000 },
  { day: 'Fri', sales: 1300000 },
  { day: 'Sat', sales: 1900000 },
  { day: 'Sun', sales: 700000 },
]

const collectionsData = [
  { date: 'Apr 1', collected: 1400000, invoiced: 1650000 },
  { date: 'Apr 5', collected: 1600000, invoiced: 1850000 },
  { date: 'Apr 10', collected: 1750000, invoiced: 2100000 },
  { date: 'Apr 15', collected: 1950000, invoiced: 2280000 },
  { date: 'Apr 20', collected: 2100000, invoiced: 2420000 },
  { date: 'Apr 25', collected: 2250000, invoiced: 2500000 },
  { date: 'Apr 28', collected: 2280000, invoiced: 2520000 },
]

const recentInvoices = [
  {
    id: 'INV-2026-0148',
    customer: 'Perera Stores',
    amount: 43380,
    type: 'Credit',
    status: 'Pending',
  },
  { id: 'INV-2026-0147', customer: 'Silva Mart', amount: 28900, type: 'Cash', status: 'Paid' },
  {
    id: 'INV-2026-0146',
    customer: 'Dissanayake SM',
    amount: 61200,
    type: 'Credit',
    status: 'Overdue',
  },
  {
    id: 'INV-2026-0145',
    customer: 'Fernando Grocery',
    amount: 12750,
    type: 'Cash',
    status: 'Paid',
  },
]

const lowStockItems = [
  { name: 'CBL Tiara Butter Cake', cases: 3, status: 'Critical' },
  { name: 'CBL Munchee Choco', cases: 5, status: 'Critical' },
  { name: 'CBL Champion Wafer', cases: 11, status: 'Low' },
]

const fleetItems = [
  { reg: 'WP-KH-3421', type: 'Lorry 3T', status: 'On Route', driver: 'K. Bandara' },
  { reg: 'WP-GA-7823', type: 'Lorry 1.5T', status: 'On Route', driver: 'R. Fernando' },
  { reg: 'WP-MB-4521', type: 'Van', status: 'Warehouse', driver: '-' },
]

const channelData = [
  { name: 'Retail Outlets', value: 1560, color: '#3B82F6' },
  { name: 'Wholesale Distributors', value: 980, color: '#8B5CF6' },
  { name: 'Direct Delivery', value: 462, color: '#10B981' },
]

const panelStyle = {
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  boxShadow: 'none',
}

const chartTooltipStyle = {
  backgroundColor: 'var(--color-bg-surface)',
  borderColor: 'var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-text-primary)',
  fontSize: 12,
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK')}`
}

function formatAxisMoney(value) {
  if (!value) return 'Rs. 0'
  if (value >= 1000000) return `Rs. ${(value / 1000000).toFixed(1)}M`
  return `Rs. ${Math.round(value / 1000)}K`
}

function getTodayLabel() {
  return new Intl.DateTimeFormat('en-LK', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())
}

function StatusPill({ status }) {
  const normalized = status.toLowerCase()
  const isGood = normalized === 'paid' || normalized === 'on route'
  const isBad = normalized === 'overdue' || normalized === 'critical'

  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 20,
        padding: '1px 7px',
        borderRadius: 6,
        border: `1px solid ${
          isGood
            ? 'color-mix(in srgb, var(--color-teal) 45%, transparent)'
            : isBad
              ? 'color-mix(in srgb, var(--color-danger) 45%, transparent)'
              : 'var(--color-border)'
        }`,
        background: isGood
          ? 'color-mix(in srgb, var(--color-teal) 12%, transparent)'
          : isBad
            ? 'color-mix(in srgb, var(--color-danger) 12%, transparent)'
            : 'var(--color-bg-elevated)',
        color: isGood
          ? 'var(--color-teal)'
          : isBad
            ? 'var(--color-danger)'
            : 'var(--color-text-muted)',
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {status}
    </span>
  )
}

function TrendChip({ trend }) {
  if (!trend) return null
  const isUp = trend.direction === 'up'
  const sign = isUp ? '+' : ''
  const cleanLabel =
    trend.label.startsWith('+') || trend.label.startsWith('-')
      ? trend.label
      : `${sign}${trend.label}`

  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: '2px 6px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        backgroundColor: isUp
          ? 'color-mix(in srgb, var(--color-teal) 12%, transparent)'
          : 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
        color: isUp ? 'var(--color-teal)' : 'var(--color-danger)',
      }}
    >
      {cleanLabel} {isUp ? '↗' : '↘'}
    </span>
  )
}

function MetricCard({ title, value, detail, tone = 'neutral', trend }) {
  const toneColor =
    tone === 'accent'
      ? 'var(--color-amber)'
      : tone === 'success'
        ? 'var(--color-teal)'
        : tone === 'danger'
          ? 'var(--color-danger)'
          : 'var(--color-text-primary)'

  return (
    <div
      style={{
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-dim)',
          margin: 0,
        }}
      >
        {title}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <p
          style={{
            color: toneColor,
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {value}
        </p>
        <TrendChip trend={trend} />
      </div>
      <p
        style={{
          color: 'var(--color-text-muted)',
          fontSize: 12,
          margin: 0,
        }}
      >
        {detail}
      </p>
    </div>
  )
}

function SectionPanel({ title, subtitle, action, children, style }) {
  return (
    <section style={{ ...panelStyle, padding: '16px 0', ...style }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 14,
        }}
      >
        <div>
          <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 750 }}>
            {title}
          </h2>
          {subtitle ? (
            <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 13 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 18 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ color: 'var(--color-text-primary)', fontSize: 24, fontWeight: 800 }}>
            Dashboard
          </h1>
          <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 13 }}>
            {getTodayLabel()} - Operational view for sales, collections, stock, and fleet.
          </p>
        </div>
      </header>

      {/* Metric Cards Row */}
      <section
        className="grid grid-cols-1 md:grid-cols-4 gap-y-4 md:gap-y-0"
        style={{
          background: 'transparent',
          padding: '8px 0',
        }}
      >
        <div className="relative">
          <MetricCard
            title="Today's Sales"
            value={formatCurrency(2847500)}
            detail="Compare to yesterday"
            tone="accent"
            trend={{ direction: 'up', label: '12%' }}
          />
          <div
            className="hidden md:block absolute right-0 top-3 bottom-3 w-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
          <div
            className="block md:hidden absolute bottom-0 left-6 right-6 h-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
        </div>

        <div className="relative">
          <MetricCard
            title="Outstanding Credit"
            value={formatCurrency(8230000)}
            detail="6 overdue accounts across 34 customers"
            tone="neutral"
          />
          <div
            className="hidden md:block absolute right-0 top-3 bottom-3 w-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
          <div
            className="block md:hidden absolute bottom-0 left-6 right-6 h-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
        </div>

        <div className="relative">
          <MetricCard
            title="Total Stock Value"
            value={formatCurrency(41650000)}
            detail="284 active SKUs in warehouse"
            tone="neutral"
            trend={{ direction: 'down', label: '-3%' }}
          />
          <div
            className="hidden md:block absolute right-0 top-3 bottom-3 w-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
          <div
            className="block md:hidden absolute bottom-0 left-6 right-6 h-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
        </div>

        <div className="relative">
          <MetricCard
            title="Fleet On Road"
            value="3 / 4"
            detail="Routes active since 06:00"
            tone="success"
          />
        </div>
      </section>

      {/* First Row of Charts (Sales & Collections) */}
      <section
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
        style={{
          padding: '8px 0',
        }}
      >
        <div className="relative">
          <SectionPanel title="Sales This Week" subtitle="Mon 22 Apr - Sun 28 Apr, LKR">
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklySalesData}
                  margin={{ top: 10, right: 14, left: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="var(--color-text-dim)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-text-dim)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatAxisMoney}
                    width={64}
                  />
                  <ChartTooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [formatCurrency(value), 'Sales']}
                    labelStyle={{ color: 'var(--color-text-muted)', fontWeight: 700 }}
                  />
                  <Bar
                    dataKey="sales"
                    fill="url(#salesBarGrad)"
                    radius={[6, 6, 0, 0]}
                    barSize={34}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionPanel>
          <div
            className="hidden md:block absolute -right-4 top-3 bottom-3 w-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
          <div
            className="block md:hidden absolute bottom-0 left-6 right-6 h-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
        </div>

        <div className="relative">
          <SectionPanel title="Collections vs Invoiced" subtitle="April 2026 cumulative, LKR">
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={collectionsData}
                  margin={{ top: 10, right: 14, left: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="collectedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="invoicedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="var(--color-text-dim)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-text-dim)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatAxisMoney}
                    width={64}
                  />
                  <ChartTooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value, name) => [formatCurrency(value), name]}
                    labelStyle={{ color: 'var(--color-text-muted)', fontWeight: 700 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fill="url(#collectedAreaGrad)"
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="invoiced"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fill="url(#invoicedAreaGrad)"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionPanel>
        </div>
      </section>

      {/* Second Row (Invoices Table, Gauge Chart, Satisfaction progress bars) */}
      <section
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        style={{
          alignItems: 'start',
          padding: '8px 0',
        }}
      >
        {/* Recent Invoices Table */}
        <div className="relative">
          <SectionPanel title="Recent Invoices" subtitle="Latest posted sales activity">
            <div className="overflow-x-auto">
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ background: 'transparent', paddingLeft: 0 }}>Invoice</th>
                    <th style={{ background: 'transparent' }}>Customer</th>
                    <th style={{ background: 'transparent' }}>Amount</th>
                    <th style={{ background: 'transparent' }}>Type</th>
                    <th style={{ background: 'transparent', paddingRight: 0 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td
                        className="mono"
                        style={{ color: 'var(--color-amber)', fontWeight: 700, paddingLeft: 0 }}
                      >
                        {invoice.id}
                      </td>
                      <td>{invoice.customer}</td>
                      <td className="mono" style={{ fontWeight: 650 }}>
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{invoice.type}</td>
                      <td style={{ paddingRight: 0 }}>
                        <StatusPill status={invoice.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionPanel>
          <div
            className="hidden lg:block absolute -right-4 top-3 bottom-3 w-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
          <div
            className="block lg:hidden absolute bottom-0 left-6 right-6 h-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
        </div>

        {/* Dispatch by Channel Gauge */}
        <div className="relative">
          <SectionPanel title="Dispatch by Channel" subtitle="Active routes by customer segment">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  position: 'relative',
                  height: 124,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelData}
                      cx="50%"
                      cy="100%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: 'var(--color-text-primary)',
                      lineHeight: 1,
                    }}
                  >
                    3,002
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--color-text-dim)',
                      marginTop: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Total Dispatches
                  </span>
                </div>
              </div>
              {/* Custom Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {channelData.map((segment) => (
                  <div
                    key={segment.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: segment.color,
                        }}
                      />
                      {segment.name}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {segment.value} ({Math.round(segment.value / 30.02)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SectionPanel>
          <div
            className="hidden lg:block absolute -right-4 top-3 bottom-3 w-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
          <div
            className="block lg:hidden absolute bottom-0 left-6 right-6 h-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
        </div>

        {/* Customer Satisfaction Rating */}
        <div className="relative">
          <SectionPanel
            title="Customer Satisfaction"
            subtitle="Daily feedback ratings from delivery outlets"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 2 }}>
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--color-teal)',
                      }}
                    />
                    Positive
                  </span>
                  <span
                    style={{ fontSize: 12, fontWeight: 850, color: 'var(--color-text-primary)' }}
                  >
                    80%
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 5,
                    background: 'var(--color-border)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '80%',
                      height: '100%',
                      background: 'var(--color-teal)',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--color-amber)',
                      }}
                    />
                    Neutral
                  </span>
                  <span
                    style={{ fontSize: 12, fontWeight: 850, color: 'var(--color-text-primary)' }}
                  >
                    15%
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 5,
                    background: 'var(--color-border)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '15%',
                      height: '100%',
                      background: 'var(--color-amber)',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--color-danger)',
                      }}
                    />
                    Negative
                  </span>
                  <span
                    style={{ fontSize: 12, fontWeight: 850, color: 'var(--color-text-primary)' }}
                  >
                    5%
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 5,
                    background: 'var(--color-border)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '5%',
                      height: '100%',
                      background: 'var(--color-danger)',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            </div>
          </SectionPanel>
        </div>
      </section>

      {/* Fourth Row (Low Stock & Fleet Alerts side by side) */}
      <section
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
        style={{
          padding: '8px 0',
        }}
      >
        {/* Low Stock Alerts */}
        <div className="relative">
          <SectionPanel
            title="Low Stock Alerts"
            subtitle="Inventory balances requiring immediate replenishment"
            action={<AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lowStockItems.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    paddingBottom: 10,
                    paddingLeft: 0,
                    paddingRight: 0,
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <p
                      style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 13 }}
                    >
                      {item.name}
                    </p>
                    <p style={{ marginTop: 2, color: 'var(--color-text-muted)', fontSize: 12 }}>
                      {item.cases} cases remaining in main warehouse
                    </p>
                  </div>
                  <StatusPill status={item.status} />
                </div>
              ))}
            </div>
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 18,
                color: 'var(--color-amber)',
                fontSize: 12,
                fontWeight: 700,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              View Full Stock Ledger
              <ArrowRight size={14} />
            </button>
          </SectionPanel>
          <div
            className="hidden md:block absolute -right-4 top-3 bottom-3 w-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
          <div
            className="block md:hidden absolute bottom-0 left-6 right-6 h-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
        </div>

        {/* Fleet Dispatch Status */}
        <div className="relative">
          <SectionPanel
            title="Active Dispatch Fleet"
            subtitle="Vehicles currently running dispatch routes"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fleetItems.map((vehicle) => (
                <div
                  key={vehicle.reg}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 10,
                    paddingBottom: 10,
                    paddingLeft: 0,
                    paddingRight: 0,
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <p
                      className="mono"
                      style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 13 }}
                    >
                      {vehicle.reg}
                    </p>
                    <p style={{ marginTop: 2, color: 'var(--color-text-muted)', fontSize: 12 }}>
                      {vehicle.type} - Assigned to {vehicle.driver}
                    </p>
                  </div>
                  <StatusPill status={vehicle.status} />
                </div>
              ))}
            </div>
          </SectionPanel>
        </div>
      </section>
    </div>
  )
}
