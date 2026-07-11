import { CheckCircle2, Save, Send, Undo2, XCircle } from 'lucide-react'
import ConfirmDialog from '@components/ui/ConfirmDialog'
import { ReturnNoteStatus } from '@/types/purchasing.types'
import { formatDate } from '@/utils'
import { formatMoney, supplierRefundTotal } from '../returnNoteHelpers'
import ReturnNoteStatusBadge from './ReturnNoteStatusBadge'

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="mono">{value}</span>
    </div>
  )
}

export default function ReturnNoteSidebar({
  returnNote,
  header,
  suppliers = [],
  editable = false,
  canCreate = false,
  canApprove = false,
  canComplete = false,
  isSaving = false,
  reason = '',
  completeForm = { crNoteNo: '', crNoteDate: '' },
  onHeaderChange,
  onReasonChange,
  onCompleteFormChange,
  onSaveDraft,
  onSubmit,
  onApprove,
  onReject,
  onComplete,
  onCancel,
}) {
  const status = Number(returnNote?.status)
  const canReview = status === ReturnNoteStatus.Submitted
  const canMarkComplete = status === ReturnNoteStatus.Approved

  return (
    <aside
      className="panel"
      style={{
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minHeight: 0,
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Return Details
          </h2>
          {returnNote ? <ReturnNoteStatusBadge status={returnNote.status} /> : null}
        </div>
        <p style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
          Supplier, date, totals, and status actions.
        </p>
      </div>

      <label>
        <span className="form-label">Supplier *</span>
        {editable ? (
          <select
            className="form-input w-full"
            value={header.supplierId}
            onChange={(event) => onHeaderChange?.('supplierId', event.target.value)}
            disabled={isSaving || Boolean(returnNote)}
            style={{ height: 40 }}
          >
            <option value="">Select a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.code} - {supplier.name}
              </option>
            ))}
          </select>
        ) : (
          <p style={{ marginTop: 4, fontSize: 13 }}>{returnNote?.supplierName || '-'}</p>
        )}
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label>
          <span className="form-label">Return Date</span>
          {editable ? (
            <input
              className="form-input w-full mono"
              type="date"
              value={header.returnDate}
              onChange={(event) => onHeaderChange?.('returnDate', event.target.value)}
              disabled={isSaving}
              style={{ height: 40 }}
            />
          ) : (
            <p className="mono" style={{ marginTop: 4, fontSize: 13 }}>
              {formatDate(returnNote?.returnDate)}
            </p>
          )}
        </label>
        <label>
          <span className="form-label">NBT Amount</span>
          {editable ? (
            <input
              className="form-input w-full mono"
              type="number"
              min="0"
              step="0.01"
              value={header.nbtAmount}
              onChange={(event) => onHeaderChange?.('nbtAmount', event.target.value)}
              disabled={isSaving}
              style={{ height: 40 }}
            />
          ) : (
            <p className="mono" style={{ marginTop: 4, fontSize: 13 }}>
              {formatMoney(returnNote?.nbtAmount)}
            </p>
          )}
        </label>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="form-label">Notes</span>
        {editable ? (
          <textarea
            className="form-input"
            value={header.notes}
            onChange={(event) => onHeaderChange?.('notes', event.target.value)}
            placeholder="Optional return note"
            rows={4}
            disabled={isSaving}
            style={{ resize: 'vertical', paddingTop: 10 }}
          />
        ) : (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            {returnNote?.notes || 'No notes.'}
          </p>
        )}
      </label>

      <section
        style={{
          padding: 14,
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          background: 'var(--color-bg-elevated)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <strong style={{ fontSize: 13 }}>Amount Summary</strong>
        <SummaryRow label="Sub total" value={formatMoney(returnNote?.subTotal || 0)} />
        <SummaryRow label="Supplier Refund" value={formatMoney(supplierRefundTotal(returnNote))} />
        <SummaryRow label="NBT amount" value={formatMoney(header.nbtAmount ?? returnNote?.nbtAmount)} />
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 9,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            fontWeight: 800,
          }}
        >
          <span>Total</span>
          <span className="mono" style={{ color: 'var(--color-amber)' }}>
            {formatMoney(returnNote?.totalAmount || 0)}
          </span>
        </div>
      </section>

      {canMarkComplete && canComplete ? (
        <section style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
          <label>
            <span className="form-label">Supplier CR Note No</span>
            <input
              className="form-input w-full"
              value={completeForm.crNoteNo}
              placeholder="Optional CR no"
              onChange={(event) => onCompleteFormChange?.({ ...completeForm, crNoteNo: event.target.value })}
            />
          </label>
          <label style={{ marginTop: 10, display: 'block' }}>
            <span className="form-label">CR Note Date</span>
            <input
              className="form-input w-full mono"
              type="date"
              value={completeForm.crNoteDate}
              onChange={(event) => onCompleteFormChange?.({ ...completeForm, crNoteDate: event.target.value })}
            />
          </label>
        </section>
      ) : canReview && canApprove ? (
        <label style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
          <span className="form-label">Decision Reason</span>
          <textarea
            className="form-input"
            value={reason}
            onChange={(event) => onReasonChange?.(event.target.value)}
            placeholder="Required for rejection."
            rows={3}
            style={{ resize: 'none', paddingTop: 10 }}
          />
        </label>
      ) : null}

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 14,
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {editable && canCreate ? (
          <>
            <button type="button" className="button-secondary" onClick={onSaveDraft} disabled={isSaving}>
              <Save size={16} /> Save Draft
            </button>
            {returnNote ? (
              <ConfirmDialog
                title="Cancel return note?"
                description="This return note will be cancelled and cannot continue through approval."
                details={returnNote?.rnNumber}
                confirmLabel="Cancel Return"
                loadingLabel="Cancelling..."
                icon={XCircle}
                onConfirm={onCancel}
                trigger={
                  <button type="button" className="button-danger" disabled={isSaving}>
                    <XCircle size={16} /> Cancel
                  </button>
                }
              />
            ) : null}
            <button type="button" className="button-primary" onClick={onSubmit} disabled={isSaving || !returnNote}>
              <Send size={16} /> Submit
            </button>
          </>
        ) : null}
        {canReview && canApprove ? (
          <>
            <ConfirmDialog
              title="Reject return note?"
              description="This return note will leave the approval queue. Make sure your rejection reason is clear."
              details={returnNote?.rnNumber}
              confirmLabel="Reject Return"
              loadingLabel="Rejecting..."
              icon={XCircle}
              onConfirm={onReject}
              trigger={
                <button type="button" className="button-danger" disabled={isSaving}>
                  <XCircle size={16} /> Reject
                </button>
              }
            />
            <button type="button" className="button-primary" onClick={onApprove} disabled={isSaving}>
              <CheckCircle2 size={16} /> Approve
            </button>
          </>
        ) : null}
        {canMarkComplete && canComplete ? (
          <button type="button" className="button-primary" onClick={onComplete} disabled={isSaving}>
            <Undo2 size={16} /> Complete Return
          </button>
        ) : null}
        {status === ReturnNoteStatus.Completed ? (
          <span className="mono" style={{ color: 'var(--color-emerald)', fontWeight: 800 }}>
            COMPLETED
          </span>
        ) : null}
        {status === ReturnNoteStatus.Rejected ? (
          <span style={{ color: 'var(--color-danger)', fontSize: 13 }}>
            Rejected: {returnNote?.rejectionReason || '-'}
          </span>
        ) : null}
        {status === ReturnNoteStatus.Cancelled ? (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            Cancelled: {returnNote?.cancellationReason || returnNote?.cancelledReason || '-'}
          </span>
        ) : null}
      </div>
    </aside>
  )
}
