import dayjs from 'dayjs'
import {
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  PackageSearch,
  Save,
  Search,
  Send,
  Trash2,
  Undo2,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import ConfirmDialog from '@components/ui/ConfirmDialog'
import SimplePagination from '@components/ui/SimplePagination'
import { purchasingService } from '@services/api/purchasingService'
import { useAuthStore } from '@stores/authStore'
import { GrnStatus, ReturnNoteStatus } from '@/types/purchasing.types'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'

const pageSize = 8

function today() {
  return dayjs().format('YYYY-MM-DD')
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function SelectChevron() {
  return (
    <div
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--color-text-dim)',
      }}
    >
      <svg style={{ width: 14, height: 14, fill: 'currentColor' }} viewBox="0 0 20 20">
        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
      </svg>
    </div>
  )
}

function SelectControl({ children }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <SelectChevron />
    </div>
  )
}
function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function toIsoDate(value) {
  return value ? dayjs(value).toISOString() : null
}

function normalizeText(value) {
  const text = String(value || '').trim()
  return text || null
}

function getLifoDate(record, fallbackDateField) {
  return dayjs(record.createdAt || record[fallbackDateField])
}

function getActionLabel(note) {
  const status = Number(note.status)
  if (status === ReturnNoteStatus.Draft) return 'Continue'
  if (status === ReturnNoteStatus.Submitted) return 'Review'
  if (status === ReturnNoteStatus.Approved) return 'Complete'
  return 'View'
}

function emptyHeader() {
  return { supplierId: '', returnDate: today(), nbtAmount: '', notes: '' }
}

function emptyItemForm() {
  return {
    goodsReceiptLineId: '',
    qtySmallestUnit: '',
    unitCostSmallest: '',
    returnReason: '',
    refInvoiceNo: '',
    refInvoiceDate: '',
    batchNo: '',
    expiryDate: '',
    notes: '',
  }
}

function getSelectedLine(receipt, lineId) {
  return (receipt?.lines || []).find((line) => line.id === lineId) || null
}

function getItemPayload(line, form) {
  return {
    productId: line.productId,
    productSku: line.productSku,
    productName: line.productName,
    qtySmallestUnit: toNumber(form.qtySmallestUnit),
    unitCostSmallest: toNumber(form.unitCostSmallest),
    returnReason: normalizeText(form.returnReason),
    goodsReceiptLineId: line.id,
    refInvoiceNo: normalizeText(form.refInvoiceNo),
    refInvoiceDate: toIsoDate(form.refInvoiceDate),
    batchNo: normalizeText(form.batchNo),
    expiryDate: toIsoDate(form.expiryDate),
    notes: normalizeText(form.notes),
  }
}

function getEditableItemPayload(form) {
  return {
    qtySmallestUnit: toNumber(form.qtySmallestUnit),
    unitCostSmallest: toNumber(form.unitCostSmallest),
    returnReason: normalizeText(form.returnReason),
    refInvoiceNo: normalizeText(form.refInvoiceNo),
    refInvoiceDate: toIsoDate(form.refInvoiceDate),
    batchNo: normalizeText(form.batchNo),
    expiryDate: toIsoDate(form.expiryDate),
    notes: normalizeText(form.notes),
  }
}

function lineOptionLabel(line) {
  return `${line.productSku} - ${line.productName} (${line.qtySmallestUnit} ${line.smallestUomCode})`
}

export default function PurchaseReturnsPage() {
  const user = useAuthStore((state) => state.user)
  const canCreate = userHasPermission(user, PERMISSIONS.purchasing.returnNoteCreate)
  const canApprove = userHasPermission(user, PERMISSIONS.purchasing.returnNoteApprove)
  const canComplete = userHasPermission(user, PERMISSIONS.purchasing.returnNoteComplete)

  const [notes, setNotes] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedNote, setSelectedNote] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [receipts, setReceipts] = useState([])
  const [selectedReceiptId, setSelectedReceiptId] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [header, setHeader] = useState(emptyHeader)
  const [itemForm, setItemForm] = useState(emptyItemForm)
  const [editingItemId, setEditingItemId] = useState('')
  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [completeForm, setCompleteForm] = useState({ crNoteNo: '', crNoteDate: '' })

  const canEdit = !selectedNote || Number(selectedNote.status) === ReturnNoteStatus.Draft
  const canReview = Number(selectedNote?.status) === ReturnNoteStatus.Submitted
  const canMarkComplete = Number(selectedNote?.status) === ReturnNoteStatus.Approved
  const selectedSupplierId = selectedNote?.supplierId || header.supplierId

  const loadNotes = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await purchasingService.listReturnNotes({
        page: 1,
        pageSize: 100,
        supplierId: supplierFilter || undefined,
      })
      setNotes(result?.items || [])
    } catch (requestError) {
      setError(requestError.message)
      setNotes([])
    } finally {
      setIsLoading(false)
    }
  }, [supplierFilter])

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const result = await purchasingService.listSuppliers({ page: 1, pageSize: 100, status: 1 })
        setSuppliers(result?.items || [])
      } catch (requestError) {
        console.error('Failed to load suppliers:', requestError)
      }
    }

    loadSuppliers()
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  useEffect(() => {
    if (!selectedId) {
      setSelectedNote(null)
      setHeader(emptyHeader())
      return
    }

    async function loadDetail() {
      setIsDetailLoading(true)
      try {
        const note = await purchasingService.getReturnNote(selectedId)
        setSelectedNote(note)
        setHeader({
          supplierId: note.supplierId,
          returnDate: dayjs(note.returnDate).format('YYYY-MM-DD'),
          nbtAmount: note.nbtAmount ?? 0,
          notes: note.notes || '',
        })
        setReason('')
        setCompleteForm({
          crNoteNo: note.crNoteNo || '',
          crNoteDate: note.crNoteDate ? dayjs(note.crNoteDate).format('YYYY-MM-DD') : '',
        })
        setEditingItemId('')
        setItemForm(emptyItemForm())
      } catch (requestError) {
        toast.error(requestError.message)
        setSelectedNote(null)
      } finally {
        setIsDetailLoading(false)
      }
    }

    loadDetail()
  }, [selectedId])

  useEffect(() => {
    if (!selectedSupplierId || !canEdit) {
      setReceipts([])
      setSelectedReceiptId('')
      setSelectedReceipt(null)
      return
    }

    async function loadVerifiedReceipts() {
      try {
        const result = await purchasingService.listGoodsReceipts({
          page: 1,
          pageSize: 100,
          supplierId: selectedSupplierId,
          status: GrnStatus.Verified,
        })
        const sorted = [...(result?.items || [])].sort((a, b) => {
          const dateA = getLifoDate(a, 'receiptDate')
          const dateB = getLifoDate(b, 'receiptDate')
          if (!dateA.isSame(dateB)) return dateB.isAfter(dateA) ? 1 : -1
          return b.grNumber.localeCompare(a.grNumber, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        })
        setReceipts(sorted)
      } catch (requestError) {
        toast.error(`Unable to load verified GRNs: ${requestError.message}`)
        setReceipts([])
      }
    }

    loadVerifiedReceipts()
  }, [canEdit, selectedSupplierId])

  useEffect(() => {
    if (!selectedReceiptId) {
      setSelectedReceipt(null)
      return
    }

    async function loadReceipt() {
      try {
        setSelectedReceipt(await purchasingService.getGoodsReceipt(selectedReceiptId))
      } catch (requestError) {
        toast.error(requestError.message)
        setSelectedReceipt(null)
      }
    }

    loadReceipt()
  }, [selectedReceiptId])

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = notes.filter((note) => {
      const returnDate = dayjs(note.returnDate).format('YYYY-MM-DD')
      const matchesSearch =
        !query ||
        note.rnNumber?.toLowerCase().includes(query) ||
        note.supplierName?.toLowerCase().includes(query)
      const matchesFrom = !fromDate || returnDate >= fromDate
      const matchesTo = !toDate || returnDate <= toDate

      return matchesSearch && matchesFrom && matchesTo
    })

    return [...filtered].sort((a, b) => {
      const dateA = getLifoDate(a, 'returnDate')
      const dateB = getLifoDate(b, 'returnDate')
      if (!dateA.isSame(dateB)) return dateB.isAfter(dateA) ? 1 : -1
      return b.rnNumber.localeCompare(a.rnNumber, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [fromDate, notes, search, toDate])

  const pagedNotes = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredNotes.slice(start, start + pageSize)
  }, [filteredNotes, page])

  const selectedLine = useMemo(
    () => getSelectedLine(selectedReceipt, itemForm.goodsReceiptLineId),
    [itemForm.goodsReceiptLineId, selectedReceipt]
  )

  useEffect(() => {
    setPage(1)
  }, [fromDate, search, supplierFilter, toDate])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredNotes.length / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [filteredNotes.length, page])

  function updateHeader(field, value) {
    const finalValue =
      field === 'notes' ? String(value || '').replace(/[^a-zA-Z0-9\s-]/g, '') : value
    setHeader((current) => ({ ...current, [field]: finalValue }))
  }

  function updateItem(field, value) {
    const sanitizedFields = ['returnReason', 'batchNo', 'refInvoiceNo', 'notes']
    const finalValue = sanitizedFields.includes(field)
      ? String(value || '').replace(/[^a-zA-Z0-9\s-]/g, '')
      : value
    setItemForm((current) => ({ ...current, [field]: finalValue }))
  }

  function clearFilters() {
    setSearch('')
    setSupplierFilter('')
    setFromDate('')
    setToDate('')
  }

  function startNewNote() {
    setSelectedId(null)
    setSelectedNote(null)
    setSelectedReceiptId('')
    setSelectedReceipt(null)
    setHeader(emptyHeader())
    setItemForm(emptyItemForm())
    setEditingItemId('')
    setReason('')
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
      let note = selectedNote
      if (!note) {
        note = await purchasingService.createReturnNote({
          supplierId: header.supplierId,
          returnDate: toIsoDate(header.returnDate),
          notes: normalizeText(header.notes),
        })
        setSelectedId(note.id)
      }

      if (Number(note.status) === ReturnNoteStatus.Draft) {
        note = await purchasingService.updateReturnNoteHeader(note.id, {
          returnDate: toIsoDate(header.returnDate),
          nbtAmount: toNumber(header.nbtAmount),
          notes: normalizeText(header.notes),
        })
      }

      setSelectedNote(note)
      toast.success(`${note.rnNumber} saved.`)
      await loadNotes()
      return note
    } catch (requestError) {
      toast.error(requestError.message)
      return null
    } finally {
      setIsSaving(false)
    }
  }
  function validateItem() {
    if (!editingItemId && !selectedLine) return 'Select a verified GRN item.'
    if (toNumber(itemForm.qtySmallestUnit) <= 0) return 'Return quantity must be greater than zero.'
    if (toNumber(itemForm.qtySmallestUnit) !== Math.floor(toNumber(itemForm.qtySmallestUnit))) {
      return 'Return quantity must be a whole smallest-unit quantity.'
    }
    if (toNumber(itemForm.unitCostSmallest) < 0) return 'Unit cost cannot be negative.'
    return ''
  }

  async function saveItem() {
    const itemError = validateItem()
    if (itemError) {
      toast.error(itemError)
      return
    }

    const note = selectedNote || (await saveHeader())
    if (!note || Number(note.status) !== ReturnNoteStatus.Draft) return

    setIsSaving(true)
    try {
      const updated = editingItemId
        ? await purchasingService.updateReturnNoteItem(
            note.id,
            editingItemId,
            getEditableItemPayload(itemForm)
          )
        : await purchasingService.addReturnNoteItem(note.id, getItemPayload(selectedLine, itemForm))

      setSelectedNote(updated)
      setItemForm(emptyItemForm())
      setEditingItemId('')
      toast.success('Return item saved.')
      await loadNotes()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  function editItem(item) {
    setEditingItemId(item.id)
    setSelectedReceiptId('')
    setSelectedReceipt(null)
    setItemForm({
      goodsReceiptLineId: item.goodsReceiptLineId || '',
      qtySmallestUnit: item.qtySmallestUnit,
      unitCostSmallest: item.unitCostSmallest,
      returnReason: item.returnReason || '',
      refInvoiceNo: item.refInvoiceNo || '',
      refInvoiceDate: item.refInvoiceDate ? dayjs(item.refInvoiceDate).format('YYYY-MM-DD') : '',
      batchNo: item.batchNo || '',
      expiryDate: item.expiryDate ? dayjs(item.expiryDate).format('YYYY-MM-DD') : '',
      notes: item.notes || '',
    })
  }

  async function removeItem(itemId) {
    if (!selectedNote) return
    setIsSaving(true)
    try {
      const updated = await purchasingService.removeReturnNoteItem(selectedNote.id, itemId)
      setSelectedNote(updated)
      toast.success('Return item removed.')
      await loadNotes()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function submitNote() {
    const note = await saveHeader()
    if (!note) return
    setIsSaving(true)
    try {
      const updated = await purchasingService.submitReturnNote(note.id)
      setSelectedNote(updated)
      toast.success(`${updated.rnNumber} submitted.`)
      await loadNotes()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function approveNote() {
    if (!selectedNote) return
    setIsSaving(true)
    try {
      const updated = await purchasingService.approveReturnNote(selectedNote.id)
      setSelectedNote(updated)
      toast.success(`${updated.rnNumber} approved.`)
      await loadNotes()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function rejectNote() {
    if (!selectedNote) return
    if (!reason.trim()) {
      toast.error('Enter a rejection reason.')
      return
    }
    setIsSaving(true)
    try {
      const updated = await purchasingService.rejectReturnNote(selectedNote.id, reason.trim())
      setSelectedNote(updated)
      toast.success(`${updated.rnNumber} rejected.`)
      await loadNotes()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function completeNote() {
    if (!selectedNote) return
    setIsSaving(true)
    try {
      const updated = await purchasingService.completeReturnNote(selectedNote.id, {
        crNoteNo: normalizeText(completeForm.crNoteNo),
        crNoteDate: toIsoDate(completeForm.crNoteDate),
      })
      setSelectedNote(updated)
      toast.success(`${updated.rnNumber} completed.`)
      await loadNotes()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function cancelNote() {
    if (!selectedNote) return
    if (!reason.trim()) {
      toast.error('Enter a cancellation reason.')
      return
    }
    setIsSaving(true)
    try {
      const updated = await purchasingService.cancelReturnNote(selectedNote.id, reason.trim())
      setSelectedNote(updated)
      toast.success(`${updated.rnNumber} cancelled.`)
      await loadNotes()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (!selectedLine || editingItemId) return
    setItemForm((current) => ({
      ...current,
      qtySmallestUnit: current.qtySmallestUnit || selectedLine.qtySmallestUnit,
      unitCostSmallest: current.unitCostSmallest || selectedLine.unitCostSmallest,
      batchNo: current.batchNo || selectedLine.batchNo || '',
      expiryDate:
        current.expiryDate ||
        (selectedLine.expiryDate ? dayjs(selectedLine.expiryDate).format('YYYY-MM-DD') : ''),
    }))
  }, [editingItemId, selectedLine])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>Purchase Returns</h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Create supplier return notes from verified GRN items and track approval to credit note
            completion.
          </p>
        </div>
        <button
          type="button"
          className="button-primary"
          onClick={startNewNote}
          disabled={!canCreate}
        >
          <FilePlus2 size={16} /> New Return Note
        </button>
      </div>

      <section className="panel" style={{ padding: 12 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 1fr) 220px 170px 170px auto',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'relative', minWidth: 0 }}>
            <Search
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                width: 16,
                height: 16,
                color: 'var(--color-text-dim)',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
            <input
              className="form-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by RN number or supplier..."
              style={{ width: '100%', height: 40, paddingLeft: 36 }}
            />
          </div>

          <SelectControl>
            <select
              className="form-input"
              value={supplierFilter}
              onChange={(event) => setSupplierFilter(event.target.value)}
              style={{
                width: '100%',
                height: 40,
                appearance: 'none',
                backgroundImage: 'none',
                paddingRight: 36,
              }}
            >
              <option value="">All suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.code} - {supplier.name}
                </option>
              ))}
            </select>
          </SelectControl>

          <input
            type="date"
            className="form-input"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            style={{ width: '100%', height: 40 }}
          />

          <input
            type="date"
            className="form-input"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            style={{ width: '100%', height: 40 }}
          />

          <button
            type="button"
            className="button-secondary"
            onClick={clearFilters}
            style={{ height: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <XCircle size={15} /> Clear
          </button>
        </div>
      </section>
      <div
        className="responsive-master-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(360px, 480px) minmax(0, 1fr)',
          gap: 14,
          flex: 1,
          minHeight: 0,
        }}
      >
        <section
          className="panel"
          style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <strong>Return Note Register</strong>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {filteredNotes.length} notes
            </span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {error ? (
              <EmptyMessage>{error}</EmptyMessage>
            ) : isLoading ? (
              <EmptyMessage>Loading return notes...</EmptyMessage>
            ) : pagedNotes.length ? (
              <table
                className="data-table product-table-compact"
                style={{ tableLayout: 'fixed', width: '100%' }}
              >
                <colgroup>
                  <col style={{ width: '23%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Return Note</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Total (Rs.)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedNotes.map((note) => (
                    <tr
                      key={note.id}
                      style={{
                        background: note.id === selectedId ? 'rgba(34, 197, 94, 0.07)' : undefined,
                      }}
                    >
                      <td style={{ paddingBlock: 9 }}>
                        <button
                          type="button"
                          className="button-ghost mono"
                          onClick={() => setSelectedId(note.id)}
                          style={{ padding: 0, color: 'var(--color-green)' }}
                        >
                          {note.rnNumber}
                        </button>
                        <div
                          style={{
                            fontSize: 10,
                            color: 'var(--color-text-dim)',
                            marginTop: 3,
                            lineHeight: 1.25,
                          }}
                        >
                          {dayjs(note.returnDate).format('DD MMM YYYY')} | {note.itemCount} items
                        </div>
                      </td>
                      <td style={{ paddingBlock: 9 }}>{note.supplierName}</td>
                      <td style={{ paddingBlock: 9 }}>
                        <StatusBadge status={note.statusLabel} />
                      </td>
                      <td
                        className="mono"
                        style={{ textAlign: 'right', fontWeight: 700, paddingBlock: 9 }}
                      >
                        {formatAmount(note.totalAmount)}
                      </td>
                      <td style={{ paddingBlock: 9, textAlign: 'right' }}>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => setSelectedId(note.id)}
                          style={{ height: 32, minWidth: 54, paddingInline: 10, fontSize: 13 }}
                        >
                          {getActionLabel(note)}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyMessage>No return notes match the selected filters.</EmptyMessage>
            )}
          </div>
          <div style={{ padding: '9px 10px' }}>
            <SimplePagination
              page={page}
              pageSize={pageSize}
              totalItems={filteredNotes.length}
              onPageChange={setPage}
              itemLabel="notes"
            />
          </div>
        </section>

        <section
          className="panel"
          style={{
            padding: 14,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {isDetailLoading ? (
            <EmptyMessage>Loading return note...</EmptyMessage>
          ) : (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                    {selectedNote?.rnNumber || 'New Return Note'}
                  </h2>
                  <p style={{ marginTop: 3, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {selectedNote
                      ? selectedNote.supplierName
                      : 'Select supplier and save the draft before adding items.'}
                  </p>
                </div>
                <StatusBadge status={selectedNote?.statusLabel || 'Draft'} />
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  paddingRight: 4,
                  marginBottom: 12,
                }}
              >
                <section
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <SectionHeading title="Return Details" />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(220px, 1fr) 150px 130px minmax(220px, 1fr)',
                      gap: 10,
                    }}
                  >
                    <Field label="Supplier" required>
                      <SelectControl>
                        <select
                          className="form-input"
                          value={header.supplierId}
                          disabled={!canEdit || Boolean(selectedNote)}
                          onChange={(event) => updateHeader('supplierId', event.target.value)}
                          style={{ appearance: 'none', backgroundImage: 'none', paddingRight: 36 }}
                        >
                          <option value="">Select supplier</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.code} - {supplier.name}
                            </option>
                          ))}
                        </select>
                      </SelectControl>
                    </Field>
                    <Field label="Return Date" required>
                      <input
                        type="date"
                        className="form-input"
                        value={header.returnDate}
                        disabled={!canEdit}
                        onChange={(event) => updateHeader('returnDate', event.target.value)}
                      />
                    </Field>
                    <Field label="NBT Amount">
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        value={header.nbtAmount}
                        disabled={!canEdit}
                        placeholder="Optional amount"
                        onChange={(event) => updateHeader('nbtAmount', event.target.value)}
                      />
                    </Field>
                    <Field label="Notes">
                      <input
                        className="form-input"
                        value={header.notes}
                        disabled={!canEdit}
                        onChange={(event) => updateHeader('notes', event.target.value)}
                        placeholder="Optional note"
                      />
                    </Field>
                  </div>
                </section>

                {canEdit ? (
                  <section
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}
                    >
                      <PackageSearch size={16} color="var(--color-teal)" />
                      <strong>{editingItemId ? 'Edit Return Item' : 'Add Return Item'}</strong>
                    </div>
                    {!editingItemId ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '220px minmax(260px, 1fr)',
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <Field label="Verified GRN" required>
                          <SelectControl>
                            <select
                              className="form-input"
                              value={selectedReceiptId}
                              disabled={!selectedSupplierId}
                              onChange={(event) => setSelectedReceiptId(event.target.value)}
                              style={{
                                appearance: 'none',
                                backgroundImage: 'none',
                                paddingRight: 36,
                              }}
                            >
                              <option value="">Select GRN</option>
                              {receipts.map((receipt) => (
                                <option key={receipt.id} value={receipt.id}>
                                  {receipt.grNumber} -{' '}
                                  {dayjs(receipt.receiptDate).format('DD MMM YYYY')}
                                </option>
                              ))}
                            </select>
                          </SelectControl>
                        </Field>
                        <Field label="GRN Item" required>
                          <SelectControl>
                            <select
                              className="form-input"
                              value={itemForm.goodsReceiptLineId}
                              disabled={!selectedReceipt}
                              onChange={(event) =>
                                updateItem('goodsReceiptLineId', event.target.value)
                              }
                              style={{
                                appearance: 'none',
                                backgroundImage: 'none',
                                paddingRight: 36,
                              }}
                            >
                              <option value="">Select item</option>
                              {(selectedReceipt?.lines || []).map((line) => (
                                <option key={line.id} value={line.id}>
                                  {lineOptionLabel(line)}
                                </option>
                              ))}
                            </select>
                          </SelectControl>
                        </Field>
                      </div>
                    ) : null}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 130px minmax(160px, 1fr) 150px 150px',
                        gap: 10,
                      }}
                    >
                      <Field label="Qty Smallest" required>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="form-input"
                          value={itemForm.qtySmallestUnit}
                          onChange={(event) => updateItem('qtySmallestUnit', event.target.value)}
                        />
                      </Field>
                      <Field label="Unit Cost" required>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          value={itemForm.unitCostSmallest}
                          onChange={(event) => updateItem('unitCostSmallest', event.target.value)}
                        />
                      </Field>
                      <Field label="Reason">
                        <input
                          className="form-input"
                          value={itemForm.returnReason}
                          onChange={(event) => updateItem('returnReason', event.target.value)}
                          placeholder="Optional reason"
                        />
                      </Field>
                      <Field label="Batch">
                        <input
                          className="form-input"
                          value={itemForm.batchNo}
                          placeholder="Optional batch"
                          onChange={(event) => updateItem('batchNo', event.target.value)}
                        />
                      </Field>
                      <Field label="Expiry">
                        <OptionalDateInput
                          value={itemForm.expiryDate}
                          onChange={(value) => updateItem('expiryDate', value)}
                        />
                      </Field>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '170px 150px minmax(220px, 1fr) auto auto',
                        gap: 10,
                        alignItems: 'end',
                        marginTop: 10,
                      }}
                    >
                      <Field label="Ref Invoice No">
                        <input
                          className="form-input"
                          value={itemForm.refInvoiceNo}
                          placeholder="Optional invoice no"
                          onChange={(event) => updateItem('refInvoiceNo', event.target.value)}
                        />
                      </Field>
                      <Field label="Ref Invoice Date">
                        <OptionalDateInput
                          value={itemForm.refInvoiceDate}
                          onChange={(value) => updateItem('refInvoiceDate', value)}
                        />
                      </Field>
                      <Field label="Item Notes">
                        <input
                          className="form-input"
                          value={itemForm.notes}
                          placeholder="Optional item note"
                          onChange={(event) => updateItem('notes', event.target.value)}
                        />
                      </Field>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                          setEditingItemId('')
                          setItemForm(emptyItemForm())
                        }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        className="button-primary"
                        onClick={saveItem}
                        disabled={isSaving}
                      >
                        <Save size={16} /> Save Item
                      </button>
                    </div>
                  </section>
                ) : null}

                <section
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <strong>Return Items</strong>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {(selectedNote?.items || []).length} items
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table product-table-compact" style={{ minWidth: 900 }}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th style={{ textAlign: 'right' }}>Qty</th>
                          <th style={{ textAlign: 'right' }}>Unit Cost</th>
                          <th style={{ textAlign: 'right' }}>Line Total</th>
                          <th>Reason</th>
                          <th>Batch</th>
                          <th style={{ width: 130 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedNote?.items || []).length ? (
                          selectedNote.items.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <span className="product-sku-badge mono">{item.productSku}</span>
                                <div style={{ marginTop: 4 }}>{item.productName}</div>
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {item.qtySmallestUnit} {item.smallestUomCode}
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {formatMoney(item.unitCostSmallest)}
                              </td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                                {formatMoney(item.lineTotal)}
                              </td>
                              <td>{item.returnReason || '-'}</td>
                              <td>{item.batchNo || '-'}</td>
                              <td>
                                {canEdit ? (
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      type="button"
                                      className="button-secondary"
                                      onClick={() => editItem(item)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-button"
                                      onClick={() => removeItem(item.id)}
                                      disabled={isSaving}
                                      title="Remove item"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={7}
                              style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}
                            >
                              No return items added.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div
                  className="responsive-summary-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 300px',
                    gap: 12,
                  }}
                >
                  <section
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}
                    >
                      <ClipboardCheck size={16} color="var(--color-text-dim)" />
                      <strong>Action Details</strong>
                    </div>
                    {canMarkComplete ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 170px', gap: 10 }}>
                        <Field label="Supplier CR Note No">
                          <input
                            className="form-input"
                            value={completeForm.crNoteNo}
                            placeholder="Optional CR note no"
                            onChange={(event) =>
                              setCompleteForm((current) => ({
                                ...current,
                                crNoteNo: event.target.value.replace(/[^a-zA-Z0-9\s-]/g, ''),
                              }))
                            }
                          />
                        </Field>
                        <Field label="CR Note Date">
                          <OptionalDateInput
                            value={completeForm.crNoteDate}
                            onChange={(value) =>
                              setCompleteForm((current) => ({
                                ...current,
                                crNoteDate: value,
                              }))
                            }
                          />
                        </Field>
                      </div>
                    ) : (
                      <textarea
                        className="form-input"
                        value={reason}
                        onChange={(event) =>
                          setReason(event.target.value.replace(/[^a-zA-Z0-9\s-]/g, ''))
                        }
                        placeholder="Reason required for reject or cancel."
                        style={{ height: 76, resize: 'none', paddingTop: 10 }}
                      />
                    )}
                  </section>
                  <section
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <SectionHeading title="Amount Summary" />
                    <SummaryRow
                      label="Sub total"
                      value={formatMoney(selectedNote?.subTotal || 0)}
                    />
                    <SummaryRow label="NBT amount" value={formatMoney(header.nbtAmount)} />
                    <div
                      style={{
                        borderTop: '1px solid var(--color-border)',
                        paddingTop: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 700,
                      }}
                    >
                      <span>Total</span>
                      <span className="mono" style={{ color: 'var(--color-amber)' }}>
                        {formatMoney(selectedNote?.totalAmount ?? 0)}
                      </span>
                    </div>
                  </section>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: 12,
                }}
              >
                {canEdit && canCreate ? (
                  <>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={saveHeader}
                      disabled={isSaving}
                    >
                      <Save size={16} /> Save Draft
                    </button>
                    {selectedNote ? (
                      <ConfirmDialog
                        title="Cancel return note?"
                        description="This return note will be cancelled and cannot continue through approval. Review the reason before confirming."
                        details={selectedNote?.rnNumber}
                        confirmLabel="Cancel Return"
                        loadingLabel="Cancelling..."
                        icon={XCircle}
                        onConfirm={cancelNote}
                        trigger={
                          <button type="button" className="button-danger" disabled={isSaving}>
                            <XCircle size={16} /> Cancel
                          </button>
                        }
                      />
                    ) : null}
                    <button
                      type="button"
                      className="button-primary"
                      onClick={submitNote}
                      disabled={isSaving || !selectedNote}
                    >
                      <Send size={16} /> Submit
                    </button>
                  </>
                ) : null}
                {canReview && canApprove ? (
                  <>
                    <ConfirmDialog
                      title="Reject return note?"
                      description="This return note will be rejected and sent out of the approval queue. Make sure the rejection reason is clear."
                      details={selectedNote?.rnNumber}
                      confirmLabel="Reject Return"
                      loadingLabel="Rejecting..."
                      icon={XCircle}
                      onConfirm={rejectNote}
                      trigger={
                        <button type="button" className="button-danger" disabled={isSaving}>
                          <XCircle size={16} /> Reject
                        </button>
                      }
                    />
                    <button
                      type="button"
                      className="button-primary"
                      onClick={approveNote}
                      disabled={isSaving}
                    >
                      <CheckCircle2 size={16} /> Approve
                    </button>
                  </>
                ) : null}
                {canMarkComplete && canComplete ? (
                  <button
                    type="button"
                    className="button-primary"
                    onClick={completeNote}
                    disabled={isSaving}
                  >
                    <Undo2 size={16} /> Complete Return
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function SectionHeading({ title }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 10,
      }}
    >
      <strong style={{ fontSize: 13 }}>{title}</strong>
    </div>
  )
}

function Field({ label, children, required = false }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span className="form-label" style={{ marginBottom: 0 }}>
        {label}
        {required ? <span style={{ color: 'var(--color-danger)' }}> *</span> : null}
      </span>
      {children}
    </label>
  )
}

function OptionalDateInput({ value, onChange }) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <input
      type={isFocused || value ? 'date' : 'text'}
      className="form-input"
      value={value}
      placeholder="Optional date"
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="mono">{value}</span>
    </div>
  )
}

function EmptyMessage({ children }) {
  return (
    <div
      style={{
        minHeight: 240,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--color-text-muted)',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div>
        <Undo2 size={30} style={{ margin: '0 auto 10px', color: 'var(--color-text-dim)' }} />
        {children}
      </div>
    </div>
  )
}
