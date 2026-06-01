import dayjs from 'dayjs'
import { CheckCircle, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import StatusBadge from '@components/ui/StatusBadge'
const mockCollections = [
  {
    id: 'COL-001',
    customer: 'Perera Stores',
    invoice: 'INV-2026-0138',
    amount: 43380,
    method: 'Cash',
    collector: 'R.Fernando',
    date: '2026-04-29',
    status: 'CLEARED',
  },
  {
    id: 'COL-002',
    customer: 'Silva Mart',
    invoice: 'INV-2026-0133',
    amount: 58900,
    method: 'Cheque',
    collector: 'K.Bandara',
    date: '2026-04-29',
    status: 'PENDING',
  },
  {
    id: 'COL-003',
    customer: 'Dissanayake SM',
    invoice: 'INV-2026-0129',
    amount: 28400,
    method: 'Cash',
    collector: 'R.Fernando',
    date: '2026-04-29',
    status: 'CLEARED',
  },
  {
    id: 'COL-004',
    customer: 'Fernando Grocery',
    invoice: 'INV-2026-0125',
    amount: 15200,
    method: 'Cash',
    collector: 'K.Bandara',
    date: '2026-04-28',
    status: 'CLEARED',
  },
  {
    id: 'COL-005',
    customer: 'Jayawardena Pvt',
    invoice: 'INV-2026-0120',
    amount: 94500,
    method: 'Cheque',
    collector: 'R.Fernando',
    date: '2026-04-28',
    status: 'PENDING',
  },
  {
    id: 'COL-006',
    customer: 'Bandara Traders',
    invoice: 'INV-2026-0115',
    amount: 32000,
    method: 'Cash',
    collector: 'K.Bandara',
    date: '2026-04-27',
    status: 'CLEARED',
  },
]
const totalCash = mockCollections
  .filter((c) => c.method === 'Cash')
  .reduce((s, c) => s + c.amount, 0)
const totalCheque = mockCollections
  .filter((c) => c.method === 'Cheque')
  .reduce((s, c) => s + c.amount, 0)
const totalCleared = mockCollections
  .filter((c) => c.status === 'CLEARED')
  .reduce((s, c) => s + c.amount, 0)
export default function DailyEntryPage() {
  const [search, setSearch] = useState('')
  const [dateFilter, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const filtered = useMemo(
    () =>
      mockCollections.filter((c) => {
        const matchSearch =
          !search ||
          c.customer.toLowerCase().includes(search.toLowerCase()) ||
          c.invoice.toLowerCase().includes(search.toLowerCase())
        const matchDate = !dateFilter || c.date === dateFilter
        return matchSearch && matchDate
      }),
    [search, dateFilter]
  )
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Collections — Daily Entry
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Record and verify daily cash & cheque collections
          </p>
        </div>
        <button className="button-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Collection
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Cash Collected', value: totalCash, color: 'var(--color-teal)' },
          { label: 'Cheque Collected', value: totalCheque, color: 'var(--color-blue)' },
          { label: 'Total Cleared', value: totalCleared, color: 'var(--color-amber)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="panel p-4">
            <p className="eyebrow">{label}</p>
            <p className="mt-2 text-xl font-bold mono" style={{ color }}>
              Rs. {value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-48">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--color-text-dim)' }}
          />
          <input
            className="form-input pl-9"
            placeholder="Search customer or invoice…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input
          type="date"
          className="form-input w-auto"
          value={dateFilter}
          onChange={(e) => setDate(e.target.value)}
          style={{ minWidth: 150, colorScheme: 'dark' }}
        />
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Collection #</th>
                <th>Customer</th>
                <th>Invoice</th>
                <th className="text-right">Amount</th>
                <th>Method</th>
                <th>Collector</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span
                      className="mono text-xs font-medium"
                      style={{ color: 'var(--color-amber)' }}
                    >
                      {c.id}
                    </span>
                  </td>
                  <td className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {c.customer}
                  </td>
                  <td>
                    <span className="mono text-xs" style={{ color: 'var(--color-blue)' }}>
                      {c.invoice}
                    </span>
                  </td>
                  <td
                    className="text-right mono text-sm font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Rs. {c.amount.toLocaleString()}
                  </td>
                  <td>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background:
                          c.method === 'Cash' ? 'rgba(32,212,191,0.1)' : 'rgba(102,181,250,0.1)',
                        color: c.method === 'Cash' ? 'var(--color-teal)' : 'var(--color-blue)',
                        border: `1px solid ${c.method === 'Cash' ? 'rgba(32,212,191,0.25)' : 'rgba(102,181,250,0.25)'}`,
                      }}
                    >
                      {c.method}
                    </span>
                  </td>
                  <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {c.collector}
                  </td>
                  <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {dayjs(c.date).format('DD MMM YYYY')}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {c.status === 'CLEARED' && (
                        <CheckCircle
                          className="h-3.5 w-3.5"
                          style={{ color: 'var(--color-teal)' }}
                        />
                      )}
                      <StatusBadge status={c.status} />
                    </div>
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
