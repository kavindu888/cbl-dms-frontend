import {
  AlertTriangle,
  ArrowRight,
  FileDown,
  Package,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Truck,
  WalletCards,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
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
  { id: 'INV-2026-0148', customer: 'Perera Stores', amount: 43380, type: 'Credit', status: 'Pending' },
  { id: 'INV-2026-0147', customer: 'Silva Mart', amount: 28900, type: 'Cash', status: 'Paid' },
  { id: 'INV-2026-0146', customer: 'Dissanayake SM', amount: 61200, type: 'Credit', status: 'Overdue' },
  { id: 'INV-2026-0145', customer: 'Fernando Grocery', amount: 12750, type: 'Cash', status: 'Paid' },
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

const panelStyle = {
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  boxShadow: '0 16px 34px rgba(0, 0, 0, 0.22)',
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
        minHeight: 24,
        padding: '2px 8px',
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
        color: isGood ? 'var(--color-teal)' : isBad ? 'var(--color-danger)' : 'var(--color-text-muted)',
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {status}
    </span>
  )
}

function MetricCard({ title, value, detail, icon: Icon, tone = 'neutral', trend }) {
  const toneColor =
    tone === 'accent'
      ? 'var(--color-amber)'
      : tone === 'success'
        ? 'var(--color-teal)'
        : tone === 'danger'
          ? 'var(--color-danger)'
          : 'var(--color-text-primary)'

  return (
    <section
      style={{
        ...panelStyle,
        minHeight: 156,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p className="form-label" style={{ marginBottom: 8 }}>
            {title}
          </p>
          <p style={{ color: toneColor, fontSize: 27, lineHeight: 1.1, fontWeight: 800 }}>
            {value}
          </p>
        </div>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid color-mix(in srgb, var(--color-amber) 18%, transparent)',
            background: 'color-mix(in srgb, var(--color-amber) 8%, transparent)',
            color: 'var(--color-amber)',
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {trend ? (
          <p
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: trend.direction === 'up' ? 'var(--color-teal)' : 'var(--color-danger)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {trend.direction === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend.label}
          </p>
        ) : null}
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{detail}</p>
      </div>
    </section>
  )
}

function SectionPanel({ title, subtitle, action, children, style }) {
  return (
    <section style={{ ...panelStyle, padding: 24, ...style }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div>
          <h2 style={{ color: 'var(--color-text-primary)', fontSize: 18, fontWeight: 750 }}>
            {title}
          </h2>
          {subtitle ? (
            <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 13 }}>{subtitle}</p>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 32 }}>
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
          <h1 style={{ color: 'var(--color-text-primary)', fontSize: 30, fontWeight: 800 }}>
            Dashboard
          </h1>
          <p style={{ marginTop: 6, color: 'var(--color-text-muted)', fontSize: 14 }}>
            {getTodayLabel()} - Operational view for sales, collections, stock, and fleet.
          </p>
        </div>
        <button className="button-primary" type="button" style={{ height: 42, paddingInline: 18 }}>
          <FileDown size={16} />
          Generate Daily Report
        </button>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24,
        }}
      >
        <MetricCard
          title="Today's Sales"
          value={formatCurrency(2847500)}
          detail="47 invoices issued today"
          icon={ReceiptText}
          tone="accent"
          trend={{ direction: 'up', label: '12% vs yesterday' }}
        />
        <MetricCard
          title="Outstanding Credit"
          value={formatCurrency(8230000)}
          detail="6 overdue accounts across 34 customers"
          icon={WalletCards}
          tone="neutral"
        />
        <MetricCard
          title="Total Stock Value"
          value={formatCurrency(41650000)}
          detail="284 active SKUs in warehouse"
          icon={Package}
          tone="neutral"
          trend={{ direction: 'down', label: '3% vs last week' }}
        />
        <MetricCard
          title="Fleet On Road"
          value="3 / 4"
          detail="Routes active since 06:00"
          icon={Truck}
          tone="success"
        />
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: 28,
        }}
      >
        <SectionPanel title="Sales This Week" subtitle="Mon 22 Apr - Sun 28 Apr, LKR">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklySalesData} margin={{ top: 10, right: 14, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--color-text-dim)" fontSize={12} tickLine={false} axisLine={false} />
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
                <Bar dataKey="sales" fill="var(--color-amber)" radius={[4, 4, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel title="Collections vs Invoiced" subtitle="April 2026 cumulative, LKR">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={collectionsData} margin={{ top: 10, right: 14, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--color-text-dim)" fontSize={12} tickLine={false} axisLine={false} />
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
                <Line type="monotone" dataKey="collected" stroke="var(--color-teal)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="invoiced" stroke="var(--color-blue)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
          gap: 28,
          alignItems: 'start',
        }}
      >
        <SectionPanel title="Recent Invoices" subtitle="Latest posted sales activity">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="mono" style={{ color: 'var(--color-amber)' }}>
                      {invoice.id}
                    </td>
                    <td>{invoice.customer}</td>
                    <td className="mono">{formatCurrency(invoice.amount)}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{invoice.type}</td>
                    <td>
                      <StatusPill status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <SectionPanel
            title="Low Stock"
            subtitle="Items that need attention"
            action={<AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {lowStockItems.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    paddingBottom: 14,
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <p style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 13 }}>
                      {item.name}
                    </p>
                    <p style={{ marginTop: 2, color: 'var(--color-text-muted)', fontSize: 12 }}>
                      {item.cases} cases remaining
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
              }}
            >
              View Full Stock
              <ArrowRight size={14} />
            </button>
          </SectionPanel>

          <SectionPanel title="Fleet Status" subtitle="Active dispatch vehicles">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {fleetItems.map((vehicle) => (
                <div
                  key={vehicle.reg}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 14,
                    paddingBottom: 14,
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <p className="mono" style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 13 }}>
                      {vehicle.reg}
                    </p>
                    <p style={{ marginTop: 2, color: 'var(--color-text-muted)', fontSize: 12 }}>
                      {vehicle.type} - {vehicle.driver}
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
