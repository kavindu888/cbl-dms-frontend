import dayjs from 'dayjs'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useReturnNote } from '@/hooks/useReturnNotes'
import { purchasingService } from '@/services/api/purchasingService'
import { useAuthStore } from '@/stores/authStore'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'
import { ReturnNoteStatus } from '@/types/purchasing.types'
import {
  emptyHeader,
  formatMoney,
  normalizeText,
  pageShellStyle,
  sanitizeText,
  toIsoDate,
  toNumber,
} from './returnNoteHelpers'
import ReturnItemsTable from './components/ReturnItemsTable'
import ReturnNoteSidebar from './components/ReturnNoteSidebar'
import ReturnNoteStatusBadge from './components/ReturnNoteStatusBadge'

export default function ReturnNoteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const canApprove = userHasPermission(user, PERMISSIONS.purchasing.returnNoteApprove)
  const canComplete = userHasPermission(user, PERMISSIONS.purchasing.returnNoteComplete)
  const { note, setNote, isLoading, error, refetch } = useReturnNote(id)
  const [header, setHeader] = useState(emptyHeader())
  const [reason, setReason] = useState('')
  const [completeForm, setCompleteForm] = useState({ crNoteNo: '', crNoteDate: '' })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!note) return
    setHeader({
      supplierId: note.supplierId || '',
      returnDate: note.returnDate ? dayjs(note.returnDate).format('YYYY-MM-DD') : '',
      nbtAmount: note.nbtAmount ?? 0,
      notes: note.notes || '',
    })
    setCompleteForm({
      crNoteNo: note.crNoteNo || '',
      crNoteDate: note.crNoteDate ? dayjs(note.crNoteDate).format('YYYY-MM-DD') : '',
    })
  }, [note])

  async function approveNote() {
    setIsSaving(true)
    try {
      setNote(await purchasingService.approveReturnNote(id))
      toast.success('Return note approved.')
      await refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function rejectNote() {
    if (!reason.trim()) {
      toast.error('Please enter a rejection reason.')
      return
    }
    setIsSaving(true)
    try {
      setNote(await purchasingService.rejectReturnNote(id, reason.trim()))
      toast.success('Return note rejected.')
      await refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function completeNote() {
    setIsSaving(true)
    try {
      setNote(await purchasingService.completeReturnNote(id, {
        crNoteNo: normalizeText(completeForm.crNoteNo),
        crNoteDate: toIsoDate(completeForm.crNoteDate),
      }))
      toast.success('Return note completed.')
      await refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function cancelNote() {
    setIsSaving(true)
    try {
      setNote(await purchasingService.cancelReturnNote(id, reason.trim() || 'Cancelled from detail screen.'))
      toast.success('Return note cancelled.')
      await refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  function updateHeader(field, value) {
    setHeader((current) => ({ ...current, [field]: field === 'notes' ? sanitizeText(value) : value }))
  }

  async function saveHeader() {
    if (!note || Number(note.status) !== ReturnNoteStatus.Draft) return
    setIsSaving(true)
    try {
      const updated = await purchasingService.updateReturnNoteHeader(note.id, {
        returnDate: toIsoDate(header.returnDate),
        nbtAmount: toNumber(header.nbtAmount),
        notes: normalizeText(header.notes),
      })
      setNote(updated)
      toast.success(`${updated.rnNumber} saved.`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function submitNote() {
    if (!note) return
    setIsSaving(true)
    try {
      setNote(await purchasingService.submitReturnNote(note.id))
      toast.success('Return note submitted.')
      await refetch()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div style={{ padding: 24, color: 'var(--color-text-muted)' }}>Loading return note...</div>
  if (error) return <div style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div>
  if (!note) return <div style={{ padding: 24 }}>Return note not found.</div>

  const editable = Number(note.status) === ReturnNoteStatus.Draft

  return (
    <div className="responsive-page" style={pageShellStyle}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="button-secondary" type="button" onClick={() => navigate('/purchasing/return-notes')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className="mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-amber)' }}>{note.rnNumber}</h1>
            <ReturnNoteStatusBadge status={note.status} />
          </div>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            {note.supplierName} • {formatMoney(note.totalAmount)}
          </p>
        </div>
      </header>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]" style={{ gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <main className="panel" style={{ padding: 16, overflowY: 'auto', minHeight: 0 }}>
          <ReturnItemsTable items={note.items || []} editable={false} />
        </main>
        <ReturnNoteSidebar
          returnNote={note}
          header={header}
          editable={editable}
          canCreate={editable}
          canApprove={canApprove}
          canComplete={canComplete}
          isSaving={isSaving}
          reason={reason}
          completeForm={completeForm}
          onHeaderChange={updateHeader}
          onReasonChange={(value) => setReason(sanitizeText(value))}
          onCompleteFormChange={setCompleteForm}
          onSaveDraft={saveHeader}
          onSubmit={submitNote}
          onApprove={approveNote}
          onReject={rejectNote}
          onComplete={completeNote}
          onCancel={cancelNote}
        />
      </div>
    </div>
  )
}
