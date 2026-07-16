import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { purchasingService } from '@/services/api/purchasingService'
import { useAuthStore } from '@/stores/authStore'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'
import { ReturnNoteStatus } from '@/types/purchasing.types'
import {
  canEditReturnNote,
  emptyHeader,
  formatMoney,
  normalizeText,
  pageShellStyle,
  sanitizeText,
  supplierRefundTotal,
  toIsoDate,
  toNumber,
} from './returnNoteHelpers'
import ReturnItemForm from './components/ReturnItemForm'
import ReturnItemsTable from './components/ReturnItemsTable'
import ReturnNoteSidebar from './components/ReturnNoteSidebar'

export default function NewReturnNotePage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const canCreate = userHasPermission(user, PERMISSIONS.purchasing.returnNoteCreate)
  const [suppliers, setSuppliers] = useState([])
  const [note, setNote] = useState(null)
  const [header, setHeader] = useState(emptyHeader())
  const [editingItem, setEditingItem] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadLookups() {
      const supplierResult = await purchasingService.listSuppliers({ page: 1, pageSize: 100, status: 1 })
      setSuppliers(supplierResult?.items || [])
    }
    loadLookups()
  }, [])

  function updateHeader(field, value) {
    setHeader((current) => ({
      ...current,
      [field]: field === 'notes' ? sanitizeText(value) : value,
    }))
  }

  async function saveHeader() {
    if (!canCreate) return null
    if (!header.supplierId) {
      toast.error('Select a supplier.')
      return null
    }
    if (toNumber(header.nbtAmount) < 0) {
      toast.error('NBT amount cannot be negative.')
      return null
    }
    setIsSaving(true)
    try {
      let nextNote = note
      if (!nextNote) {
        nextNote = await purchasingService.createReturnNote({
          supplierId: header.supplierId,
          returnDate: toIsoDate(header.returnDate),
          notes: normalizeText(header.notes),
        })
      }
      if (Number(nextNote.status) === ReturnNoteStatus.Draft) {
        nextNote = await purchasingService.updateReturnNoteHeader(nextNote.id, {
          returnDate: toIsoDate(header.returnDate),
          nbtAmount: toNumber(header.nbtAmount),
          notes: normalizeText(header.notes),
        })
      }
      setNote(nextNote)
      toast.success(`${nextNote.rnNumber} saved.`)
      return nextNote
    } catch (error) {
      toast.error(error.message)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function addItem(payload) {
    const currentNote = note || (await saveHeader())
    if (!currentNote || Number(currentNote.status) !== ReturnNoteStatus.Draft) return
    setIsSaving(true)
    try {
      const updated = await purchasingService.addReturnNoteItem(currentNote.id, payload)
      setNote(updated)
      toast.success('Return item saved.')
    } catch (error) {
      toast.error(error.message)
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  async function updateItem(itemId, payload) {
    if (!note) return
    setIsSaving(true)
    try {
      const updated = await purchasingService.updateReturnNoteItem(note.id, itemId, payload)
      setNote(updated)
      setEditingItem(null)
      toast.success('Return item updated.')
    } catch (error) {
      toast.error(error.message)
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  async function removeItem(itemId) {
    if (!note || !window.confirm('Remove this return item?')) return
    setIsSaving(true)
    try {
      const updated = await purchasingService.removeReturnNoteItem(note.id, itemId)
      setNote(updated)
      toast.success('Return item removed.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function submitNote() {
    const currentNote = note || (await saveHeader())
    if (!currentNote) return
    if (!(currentNote.items || []).length) {
      toast.error('Add at least one return item before submitting.')
      return
    }
    setIsSaving(true)
    try {
      const submitted = await purchasingService.submitReturnNote(currentNote.id)
      toast.success(`${submitted.rnNumber || currentNote.rnNumber} submitted.`)
      navigate(`/purchasing/return-notes/${currentNote.id}`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function cancelNote() {
    if (!note) return
    setIsSaving(true)
    try {
      await purchasingService.cancelReturnNote(note.id, 'Cancelled from draft screen.')
      toast.success('Return note cancelled.')
      navigate('/purchasing/return-notes')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="responsive-page" style={pageShellStyle}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="button-secondary" type="button" onClick={() => navigate('/purchasing/return-notes')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)' }}>New Return Note</h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Build the supplier return and submit it for approval.
          </p>
        </div>
      </header>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]" style={{ gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <main className="panel" style={{ padding: 16, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {canEditReturnNote(note) ? (
              <ReturnItemForm
                supplierId={header.supplierId}
                editingItem={editingItem}
                isSaving={isSaving}
                onAddLine={addItem}
                onUpdateLine={updateItem}
                onCancelEdit={() => setEditingItem(null)}
              />
            ) : null}
            <ReturnItemsTable items={note?.items || []} editable={canEditReturnNote(note)} onEdit={setEditingItem} onRemove={removeItem} />
          </div>
        </main>
        <ReturnNoteSidebar
          returnNote={note}
          header={header}
          suppliers={suppliers}
          editable={canEditReturnNote(note)}
          canCreate={canCreate}
          isSaving={isSaving}
          onHeaderChange={updateHeader}
          onSaveDraft={saveHeader}
          onSubmit={submitNote}
          onCancel={cancelNote}
        />
      </div>
    </div>
  )
}
