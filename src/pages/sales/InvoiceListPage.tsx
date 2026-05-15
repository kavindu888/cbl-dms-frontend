import dayjs from 'dayjs'
import { Eye, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import StatusBadge from '@components/ui/StatusBadge'
import { InvoiceStatus, PaymentType } from '@/types/sales.types'

const mockInvoices = [
  { id: 'INV-2026-0148', customer: 'Perera Stores',    date: '2026-04-29', due: '2026-05-13', amount: 43380,  paid: 0,     type: PaymentType.Credit, status: InvoiceStatus.Posted    },
  { id: 'INV-2026-0147', customer: 'Silva Mart',       date: '2026-04-29', due: '2026-04-29', amount: 28900,  paid: 28900, type: PaymentType.Cash,   status: InvoiceStatus.Posted    },
  { id: 'INV-2026-0146', customer: 'Dissanayake SM',   date: '2026-04-28', due: '2026-05-05', amount: 61200,  paid: 0,     type: PaymentType.Credit, status: InvoiceStatus.Posted    },
  { id: 'INV-2026-0145', customer: 'Fernando Grocery', date: '2026-04-28', due: '2026-04-28', amount: 12750,  paid: 12750, type: PaymentType.Cash,   status: InvoiceStatus.Posted    },
  { id: 'INV-2026-0144', customer: 'Jayawardena Pvt',  date: '2026-04-27', due: '2026-05-11', amount: 94500,  paid: 0,     type: PaymentType.Credit, status: InvoiceStatus.Posted    },
  { id: 'INV-2026-0143', customer: 'Bandara Traders',  date: '2026-04-26', due: '2026-04-26', amount: 18600,  paid: 18600, type: PaymentType.Cash,   status: InvoiceStatus.Posted    },
  { id: 'INV-2026-0142', customer: 'Perera Stores',    date: '2026-04-25', due: '2026-05-09', amount: 37800,  paid: 0,     type: PaymentType.Credit, status: InvoiceStatus.Posted    },
  { id: 'INV-2026-0141', customer: 'Silva Mart',       date: '2026-04-24', due: '2026-04-24', amount: 55200,  paid: 55200, type: PaymentType.Cash,   status: InvoiceStatus.Posted    },
]

function deriveDisplayStatus(inv: (typeof mockInvoices)[0]) {
  if (inv.paid >= inv.amount) return 'PAID'
  const overdue = dayjs().isAfter(dayjs(inv.due))
  return overdue ? 'OVERDUE' : 'PENDING'
}

const STATUS_OPTIONS = ['All', 'PENDING', 'PAID', 'OVERDUE']
const TYPE_OPTIONS   = ['All', PaymentType.Cash, PaymentType.Credit]

export default function InvoiceListPage() {
  const navigate = useNavigate()
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('All')
  const [typeFilter, setType]     = useState('All')

  const filtered = useMemo(() => {
    return mockInvoices.filter((inv) => {
      const displayStatus = deriveDisplayStatus(inv)
      const matchSearch  = !search || inv.id.toLowerCase().includes(search.toLowerCase()) || inv.customer.toLowerCase().includes(search.toLowerCase())
      const matchStatus  = statusFilter === 'All' || displayStatus === statusFilter
      const matchType    = typeFilter === 'All' || inv.type === typeFilter
      return matchSearch && matchStatus && matchType
    })
  }, [search, statusFilter, typeFilter])

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Sales — Invoices</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {mockInvoices.length} invoices this month
          </p>
        </div>
        <button className="button-primary flex items-center gap-2" onClick={() => navigate('/sales/invoices/new')}>
          <Plus className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--color-text-dim)' }} />
          <input className="form-input pl-9" placeholder="Search invoice # or customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-auto" value={statusFilter} onChange={(e) => setStatus(e.target.value)} style={{ cursor: 'pointer', minWidth: 130 }}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s} style={{ background: 'var(--color-bg-elevated)' }}>{s === 'All' ? 'All Statuses' : s}</option>)}
        </select>
        <select className="form-input w-auto" value={typeFilter} onChange={(e) => setType(e.target.value)} style={{ cursor: 'pointer', minWidth: 120 }}>
          {TYPE_OPTIONS.map((t) => <option key={t} value={t} style={{ background: 'var(--color-bg-elevated)' }}>{t === 'All' ? 'All Types' : t}</option>)}
        </select>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due</th>
                <th className="text-right">Amount</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const displayStatus = deriveDisplayStatus(inv)
                return (
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/sales/invoices/${inv.id}`)}>
                    <td>
                      <span className="mono text-sm font-semibold" style={{ color: 'var(--color-amber)' }}>{inv.id}</span>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{inv.customer}</td>
                    <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{dayjs(inv.date).format('DD MMM YYYY')}</td>
                    <td className="text-sm" style={{ color: displayStatus === 'OVERDUE' ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                      {dayjs(inv.due).format('DD MMM YYYY')}
                    </td>
                    <td className="text-right mono text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Rs. {inv.amount.toLocaleString()}
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{inv.type}</td>
                    <td onClick={(e) => e.stopPropagation()}><StatusBadge status={displayStatus} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="icon-button" title="View invoice" onClick={() => navigate(`/sales/invoices/${inv.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
