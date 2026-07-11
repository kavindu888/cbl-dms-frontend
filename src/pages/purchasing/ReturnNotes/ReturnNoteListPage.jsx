import dayjs from 'dayjs'
import { CalendarDays, ChevronRight, ClipboardList, Plus, Search, X, BadgeAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SimplePagination from '@components/ui/SimplePagination'
import { purchasingService } from '@/services/api/purchasingService'
import { useReturnNotes } from '@/hooks/useReturnNotes'
import { ReturnNoteStatus } from '@/types/purchasing.types'
import { formatDate } from '@/utils'
import { formatMoney, getLifoDate, pageShellStyle } from './returnNoteHelpers'
import ReturnNoteStatusBadge from './components/ReturnNoteStatusBadge'

const pageSize = 8

export default function ReturnNoteListPage() {
  const navigate = useNavigate()
  const { notes, isLoading, error } = useReturnNotes()
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
  const [page, setPage] = useState(1)

  useMemo(() => {
    purchasingService
      .listSuppliers({ page: 1, pageSize: 100, status: 1 })
      .then((result) => setSuppliers(result?.items || []))
      .catch(() => setSuppliers([]))
  }, [])

  const pendingCount = useMemo(
    () => notes.filter((note) => Number(note.status) === ReturnNoteStatus.Submitted).length,
    [notes]
  )

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    return notes
      .filter((note) => {
        const returnDate = dayjs(note.returnDate).format('YYYY-MM-DD')
        return (
          (!query ||
            note.rnNumber?.toLowerCase().includes(query) ||
            note.supplierName?.toLowerCase().includes(query)) &&
          (!supplierId || note.supplierId === supplierId) &&
          (!fromDate || returnDate >= fromDate) &&
          (!toDate || returnDate <= toDate)
        )
      })
      .sort((a, b) => {
        const dateA = getLifoDate(a)
        const dateB = getLifoDate(b)
        if (!dateA.isSame(dateB)) return dateB.isAfter(dateA) ? 1 : -1
        return String(b.rnNumber || '').localeCompare(String(a.rnNumber || ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      })
  }, [fromDate, notes, search, supplierId, toDate])

  const pagedNotes = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredNotes.slice(start, start + pageSize)
  }, [filteredNotes, page])

  function clearFilters() {
    setSearch('')
    setSupplierId('')
    setFromDate('')
    setToDate('')
  }

  return (
    <div className="responsive-page" style={pageShellStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
            Purchase Returns
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Track supplier return notes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="button-secondary"
            onClick={() => navigate('/purchasing/return-notes/approvals')}
            style={{ height: 38, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <BadgeAlert size={15} />
            Pending Approvals
            <span className="mono" style={{ color: 'var(--color-amber)' }}>{pendingCount}</span>
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={() => navigate('/purchasing/return-notes/new')}
            style={{ height: 38, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={15} /> New Return Note
          </button>
        </div>
      </div>

      <div className="panel responsive-filter-bar" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--color-text-dim)' }} />
          <input className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by RN number or supplier..." style={{ width: '100%', height: 40, paddingLeft: 36, background: 'rgba(0,0,0,0.15)' }} />
        </div>
        <select className="form-input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} style={{ width: 240, height: 40 }}>
          <option value="">All suppliers</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>{supplier.code} - {supplier.name}</option>
          ))}
        </select>
        <input className="form-input mono" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} style={{ width: 150, height: 40 }} />
        <input className="form-input mono" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} style={{ width: 150, height: 40 }} />
        <button type="button" className="button-secondary" onClick={clearFilters} style={{ height: 40, display: 'flex', alignItems: 'center', gap: 7 }}>
          <X size={15} /> Clear
        </button>
      </div>

      <section className="panel" style={{ display: 'grid', gridTemplateRows: 'auto minmax(0,1fr) auto', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={16} color="var(--color-teal)" />
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>Return Note Register</h2>
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{filteredNotes.length} notes</span>
        </div>
        <div style={{ overflow: 'auto', minHeight: 0 }}>
          {error ? (
            <div className="p-6 text-sm text-danger">{error}</div>
          ) : isLoading ? (
            <div style={{ padding: 28, color: 'var(--color-text-muted)' }}>Loading return notes...</div>
          ) : (
            <table className="data-table product-table-compact" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>RN#</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Items</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagedNotes.length ? pagedNotes.map((note) => (
                  <tr key={note.id} onClick={() => navigate(`/purchasing/return-notes/${note.id}`)} style={{ cursor: 'pointer' }}>
                    <td className="mono" style={{ color: 'var(--color-amber)', fontWeight: 800 }}>{note.rnNumber}</td>
                    <td>{note.supplierName}</td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CalendarDays size={13} />{formatDate(note.returnDate)}</span></td>
                    <td className="mono" style={{ textAlign: 'right' }}>{note.itemCount ?? note.items?.length ?? 0}</td>
                    <td><ReturnNoteStatusBadge status={note.status} /></td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(note.totalAmount)}</td>
                    <td style={{ textAlign: 'right' }}><ChevronRight size={15} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>No return notes found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ padding: '0 16px 10px' }}>
          <SimplePagination page={page} pageSize={pageSize} totalItems={filteredNotes.length} onPageChange={setPage} itemLabel="notes" />
        </div>
      </section>
    </div>
  )
}
