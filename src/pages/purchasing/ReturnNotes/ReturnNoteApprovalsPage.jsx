import dayjs from 'dayjs'
import { CalendarDays, ChevronRight, ClipboardCheck, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import SimplePagination from '@components/ui/SimplePagination'
import { purchasingService } from '@/services/api/purchasingService'
import { useApproveReturnNote, usePendingReturnNotes, useRejectReturnNote } from '@/hooks/useReturnNotes'
import { formatMoney, pageShellStyle, supplierRefundTotal } from './returnNoteHelpers'
import ReturnItemsTable from './components/ReturnItemsTable'
import ReturnNoteStatusBadge from './components/ReturnNoteStatusBadge'

const pageSize = 4

export default function ReturnNoteApprovalsPage() {
  const { notes, isLoading, error, refetch } = usePendingReturnNotes()
  const approveMutation = useApproveReturnNote()
  const rejectMutation = useRejectReturnNote()
  const [selectedId, setSelectedId] = useState(null)
  const [selectedNote, setSelectedNote] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [search, setSearch] = useState('')
  const [remarks, setRemarks] = useState('')
  const [page, setPage] = useState(1)

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    return notes.filter((note) => !query || note.rnNumber?.toLowerCase().includes(query) || note.supplierName?.toLowerCase().includes(query))
  }, [notes, search])

  const pagedNotes = useMemo(() => filteredNotes.slice((page - 1) * pageSize, page * pageSize), [filteredNotes, page])

  useEffect(() => {
    if (filteredNotes.length && !filteredNotes.some((note) => note.id === selectedId)) {
      setSelectedId(filteredNotes[0].id)
    } else if (!filteredNotes.length) {
      setSelectedId(null)
    }
  }, [filteredNotes, selectedId])

  useEffect(() => {
    if (!selectedId) {
      setSelectedNote(null)
      return
    }
    setIsLoadingDetail(true)
    purchasingService
      .getReturnNote(selectedId)
      .then((note) => {
        setSelectedNote(note)
        setRemarks('')
      })
      .catch((requestError) => {
        toast.error(`Unable to load return note details: ${requestError.message}`)
        setSelectedNote(null)
      })
      .finally(() => setIsLoadingDetail(false))
  }, [selectedId])

  async function approveNote() {
    if (!selectedNote) return
    await approveMutation.mutateAsync(selectedNote.id)
    setSelectedId(null)
    setSelectedNote(null)
    await refetch()
  }

  async function rejectNote() {
    if (!selectedNote) return
    if (!remarks.trim()) {
      toast.error('Please enter a remark for rejection.')
      return
    }
    await rejectMutation.mutateAsync(selectedNote.id, remarks.trim())
    setSelectedId(null)
    setSelectedNote(null)
    await refetch()
  }

  return (
    <div className="responsive-page" style={pageShellStyle}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)' }}>RN Approve & Reject</h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>Review supplier return notes and approve or reject them.</p>
      </div>
      <div className="panel responsive-filter-bar" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--color-text-dim)' }} />
          <input className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by RN number or supplier..." style={{ width: '100%', height: 40, paddingLeft: 36, background: 'rgba(0,0,0,0.15)' }} />
        </div>
        <button type="button" className="button-secondary" onClick={() => setSearch('')} style={{ height: 40, display: 'flex', alignItems: 'center', gap: 7 }}><X size={15} /> Clear</button>
      </div>
      <div className="responsive-master-detail" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) minmax(0, 1fr)', gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <section className="panel responsive-queue-panel" style={{ padding: 12, display: 'grid', gridTemplateRows: 'auto minmax(0,1fr) auto', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '4px 4px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClipboardCheck size={17} color="var(--color-amber)" />
              <div><h2 style={{ fontSize: 14, fontWeight: 700 }}>Pending Returns</h2><p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-dim)' }}>Approval queue</p></div>
            </div>
            <span className="mono" style={{ color: 'var(--color-amber)', fontSize: 12 }}>{filteredNotes.length}</span>
          </div>
          <div style={{ overflowY: 'auto', minHeight: 0 }}>
            {error ? <div className="p-6 text-sm text-danger">{error}</div> : isLoading ? <QueueMessage>Loading queue...</QueueMessage> : pagedNotes.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pagedNotes.map((note) => {
                  const selected = note.id === selectedId
                  return (
                    <button key={note.id} type="button" onClick={() => setSelectedId(note.id)} style={{ width: '100%', padding: 13, textAlign: 'left', borderRadius: 8, border: selected ? '1px solid color-mix(in srgb, var(--color-amber) 45%, transparent)' : '1px solid var(--color-border)', background: selected ? 'color-mix(in srgb, var(--color-amber) 10%, transparent)' : 'var(--color-bg-elevated)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <span className="mono" style={{ color: 'var(--color-amber)', fontWeight: 800 }}>{note.rnNumber}</span>
                        <ChevronRight size={15} />
                      </div>
                      <div style={{ marginTop: 9, fontWeight: 600 }}>{note.supplierName}</div>
                      <div style={{ marginTop: 10, borderTop: '1px solid var(--color-border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}><CalendarDays size={13} />{dayjs(note.returnDate).format('DD MMM YYYY')}</span>
                        <span className="mono">{formatMoney(note.totalAmount)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : <QueueMessage>No pending returns found.</QueueMessage>}
          </div>
          <SimplePagination page={page} pageSize={pageSize} totalItems={filteredNotes.length} onPageChange={setPage} itemLabel="notes" />
        </section>
        <section className="panel" style={{ padding: 16, minHeight: 0, overflow: 'hidden' }}>
          {isLoadingDetail ? <DetailMessage>Loading return note details...</DetailMessage> : selectedNote ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
              <div style={{ padding: '10px 14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', background: 'linear-gradient(135deg, var(--color-bg-surface), var(--color-bg-elevated))', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <div><span className="mono" style={{ color: 'var(--color-amber)', fontWeight: 800 }}>{selectedNote.rnNumber}</span><span style={{ marginLeft: 8 }}><ReturnNoteStatusBadge status={selectedNote.status} /></span><p style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>{selectedNote.supplierName}</p></div>
                <div className="mono" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{formatMoney(selectedNote.totalAmount)}</div>
              </div>
              <div style={{ minHeight: 0, overflowY: 'auto', flex: 1 }}>
                <ReturnItemsTable items={selectedNote.items || []} />
              </div>
              <div className="responsive-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 14 }}>
                <div style={{ padding: 14, border: '1px solid var(--color-border)', borderRadius: 8 }}>
                  <span className="form-label">Decision remarks</span>
                  <textarea className="form-input" value={remarks} onChange={(event) => setRemarks(event.target.value.replace(/[^a-zA-Z0-9\s-]/g, ''))} rows={3} style={{ marginTop: 8, resize: 'none' }} />
                </div>
                <div style={{ padding: 14, border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg-elevated)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SummaryRow label="Sub total" value={formatMoney(selectedNote.subTotal)} />
                  <SummaryRow label="Supplier Refund" value={formatMoney(supplierRefundTotal(selectedNote))} />
                  <SummaryRow label="Total" value={formatMoney(selectedNote.totalAmount)} bold />
                </div>
              </div>
              <div style={{ paddingTop: 14, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="button-danger" onClick={rejectNote} disabled={rejectMutation.isPending}>Reject</button>
                <button type="button" className="button-primary" onClick={approveNote} disabled={approveMutation.isPending}>Approve</button>
              </div>
            </div>
          ) : <DetailMessage>Select a return note to review its items and totals.</DetailMessage>}
        </section>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, bold = false }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: bold ? 800 : 400 }}><span style={{ color: 'var(--color-text-muted)' }}>{label}</span><span className="mono">{value}</span></div>
}

function QueueMessage({ children }) {
  return <div style={{ height: '100%', minHeight: 180, display: 'grid', placeItems: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>{children}</div>
}

function DetailMessage({ children }) {
  return <div style={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>{children}</div>
}
