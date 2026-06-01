import { TrendingUp, TrendingDown, AlertTriangle, FileDown, Truck, ArrowRight } from 'lucide-react'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
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
  { name: 'Apr 1', Collected: 1400000, Invoiced: 1650000 },
  { name: 'Apr 5', Collected: 1600000, Invoiced: 1850000 },
  { name: 'Apr 10', Collected: 1750000, Invoiced: 2100000 },
  { name: 'Apr 15', Collected: 1950000, Invoiced: 2280000 },
  { name: 'Apr 20', Collected: 2100000, Invoiced: 2420000 },
  { name: 'Apr 25', Collected: 2250000, Invoiced: 2500000 },
  { name: 'Apr 28', Collected: 2280000, Invoiced: 2520000 },
]

function formatYAxisSales(value) {
  if (value === 0) return 'Rs. 0'
  if (value === 700000) return 'Rs. 700K'
  if (value === 1400000) return 'Rs. 1.4M'
  if (value === 2100000) return 'Rs. 2.1M'
  if (value === 2800000) return 'Rs. 2.8M'
  return `Rs. ${(value / 1000000).toFixed(1)}M`
}

function formatYAxisCollections(value) {
  if (value === 0) return 'Rs. 0'
  if (value === 850000) return 'Rs. 850K'
  if (value === 1700000) return 'Rs. 1.7M'
  if (value === 2550000) return 'Rs. 2.5M'
  if (value === 3400000) return 'Rs. 3.4M'
  return `Rs. ${(value / 1000000).toFixed(1)}M`
}

const cardStyle = {
  background: '#0b1a28',
  border: '1px solid #1a3347',
  borderRadius: '10px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  height: '142px',
  boxSizing: 'border-box',
}

const panelStyle = {
  background: '#0b1a28',
  border: '1px solid #1a3347',
  borderRadius: '10px',
  padding: '24px',
}

const badgeBaseStyle = {
  display: 'inline-block',
  fontSize: '9px',
  fontWeight: 800,
  padding: '2px 8px',
  borderRadius: '4px',
  letterSpacing: '0.06em',
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 pb-12 font-sans text-slate-100 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Tuesday, 29 Apr 2026 - Real-time view of operations
          </p>
        </div>

        <button
          type="button"
          style={{
            background: 'var(--color-amber)',
            color: '#00121F',
            fontWeight: 700,
            fontSize: '0.88rem',
            padding: '0 18px',
            height: '42px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#FFB74D')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-amber)')}
        >
          <FileDown size={16} />
          <span>Generate Daily Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div style={cardStyle}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Today's Sales
            </div>
            <div className="mt-1.5 text-[1.75rem] font-extrabold leading-tight text-[var(--color-amber)]">
              Rs. 2,847,500
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
              <TrendingUp size={14} />
              <span>12% vs yesterday</span>
            </div>
            <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              47 invoices issued today
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Outstanding Credit
            </div>
            <div className="mt-1.5 text-[1.75rem] font-extrabold leading-tight text-white">
              Rs. 8,230,000
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
              <AlertTriangle size={14} />
              <span>6 overdue accounts</span>
            </div>
            <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              Across 34 customers
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Total Stock Value
            </div>
            <div className="mt-1.5 text-[1.75rem] font-extrabold leading-tight text-white">
              Rs. 41,650{' '}
              <span className="ml-0.5 text-[1.15rem] font-medium text-[#7a9cbd]">000</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
              <TrendingDown size={14} />
              <span>3% vs last week</span>
            </div>
            <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              284 active SKUs in warehouse
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Fleet on Road
            </div>
            <div className="mt-1.5 text-[1.75rem] font-extrabold leading-tight">
              <span className="text-emerald-500">3</span>
              <span className="text-white"> / 4</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
              <AlertTriangle size={14} />
              <span>1 vehicle in maintenance</span>
            </div>
            <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              Routes active since 06:00
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <h2 className="m-0 text-[1.15rem] font-extrabold text-white">Sales This Week</h2>
          <p className="mb-5 mt-1 text-[0.78rem] text-[var(--color-text-muted)]">
            Mon 22 Apr - Sun 28 Apr (LKR)
          </p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklySalesData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#12273a" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#5a7a99"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="#5a7a99"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxisSales}
                  domain={[0, 2800000]}
                  ticks={[0, 700000, 1400000, 2100000, 2800000]}
                  dx={-8}
                />
                <ChartTooltip
                  contentStyle={{
                    backgroundColor: '#0b1a28',
                    borderColor: '#1a3347',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Sales']}
                  labelStyle={{ color: 'var(--color-text-muted)', fontWeight: 'bold' }}
                />
                <Bar dataKey="sales" fill="var(--color-amber)" radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <h2 className="m-0 text-[1.15rem] font-extrabold text-white">Collections vs Invoiced</h2>
          <p className="mb-5 mt-1 text-[0.78rem] text-[var(--color-text-muted)]">
            April 2026 - cumulative (LKR)
          </p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={collectionsData}
                margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#12273a" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#5a7a99"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="#5a7a99"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxisCollections}
                  domain={[0, 3400000]}
                  ticks={[0, 850000, 1700000, 2550000, 3400000]}
                  dx={-8}
                />
                <ChartTooltip
                  contentStyle={{
                    backgroundColor: '#0b1a28',
                    borderColor: '#1a3347',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Amount']}
                  labelStyle={{ color: 'var(--color-text-muted)', fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey="Collected"
                  stroke="#00c5bc"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Invoiced"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#00c5bc]" />
              <span className="font-semibold text-[var(--color-text-muted)]">Collected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
              <span className="font-semibold text-[var(--color-text-muted)]">Invoiced</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7" style={panelStyle}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="m-0 text-[1.15rem] font-extrabold text-white">Recent Invoices</h2>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Last 5 transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {['Invoice #', 'Customer', 'Amount', 'Type', 'Status'].map((heading) => (
                    <th
                      key={heading}
                      className="border-b border-[#1a3347] px-2 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    'INV-2026-0148',
                    'Perera Stores',
                    'Rs. 43,380',
                    'Credit',
                    'PENDING',
                    '#5a7a99',
                    '#94a3b8',
                  ],
                  [
                    'INV-2026-0147',
                    'Silva Mart',
                    'Rs. 28,900',
                    'Cash',
                    'PAID',
                    '#10b981',
                    '#10b981',
                  ],
                  [
                    'INV-2026-0146',
                    'Dissanayake SM',
                    'Rs. 61,200',
                    'Credit',
                    'OVERDUE',
                    '#f87171',
                    '#f87171',
                  ],
                  [
                    'INV-2026-0145',
                    'Fernando Grocery',
                    'Rs. 12,750',
                    'Cash',
                    'PAID',
                    '#10b981',
                    '#10b981',
                  ],
                ].map(([invoice, customer, amount, type, status, border, color], index) => (
                  <tr key={invoice} className={index < 3 ? 'border-b border-[#122436]' : ''}>
                    <td className="px-2 py-4 font-mono text-[13px] font-bold text-[var(--color-amber)]">
                      {invoice}
                    </td>
                    <td className="px-2 py-4 text-[13px] font-semibold text-white">{customer}</td>
                    <td className="px-2 py-4 text-[13px] font-bold text-white">{amount}</td>
                    <td className="px-2 py-4 text-[13px] text-[var(--color-text-muted)]">{type}</td>
                    <td className="px-2 py-4">
                      <span style={{ ...badgeBaseStyle, border: `1px solid ${border}`, color }}>
                        {status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
            <div className="mb-5 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <h2 className="m-0 text-[1.15rem] font-extrabold text-white">Low Stock</h2>
            </div>

            <div className="flex-1 space-y-4">
              {[
                ['CBL Tiara Butter Cake', '3 cases', 'CRITICAL', '#f87171'],
                ['CBL Munchee Choc ...', '5 cases', 'CRITICAL', '#f87171'],
                ['CBL Champion Wafer', '11 cases', 'LOW', '#f59e0b'],
              ].map(([name, cases, status, color], index) => (
                <div
                  key={name}
                  className={`flex items-center justify-between ${index < 2 ? 'border-b border-[#122436] pb-3' : 'pb-1'}`}
                >
                  <div>
                    <div className="text-[13px] font-bold text-white">{name}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{cases}</div>
                  </div>
                  <span style={{ ...badgeBaseStyle, border: `1px solid ${color}`, color }}>
                    {status}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 text-center">
              <button
                type="button"
                className="inline-flex items-center gap-1 border-none bg-transparent text-xs font-bold text-[var(--color-amber)]"
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                <span>View Full Stock</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div style={panelStyle}>
            <div className="mb-5 flex items-center gap-2">
              <Truck size={18} className="text-slate-400" />
              <h2 className="m-0 text-[1.15rem] font-extrabold text-white">Fleet Status</h2>
            </div>

            <div className="space-y-4">
              {[
                ['WP-KH-3421', 'Lorry 3T', 'ON ROUTE', 'K.Bandara', '#10b981', '#10b981'],
                ['WP-GA-7823', 'Lorry 1.5T', 'ON ROUTE', 'R.Fernando', '#10b981', '#10b981'],
                ['WP-MB-4521', 'Van', 'IN WAREHOUSE', '-', '#5a7a99', '#94a3b8'],
              ].map(([reg, type, status, driver, border, color], index) => (
                <div
                  key={reg}
                  className={`flex items-start justify-between ${index < 2 ? 'border-b border-[#122436] pb-3' : ''}`}
                >
                  <div>
                    <div className="text-[13px] font-bold text-white">{reg}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{type}</div>
                  </div>
                  <div className="text-right">
                    <span style={{ ...badgeBaseStyle, border: `1px solid ${border}`, color }}>
                      {status}
                    </span>
                    <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">{driver}</div>
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
