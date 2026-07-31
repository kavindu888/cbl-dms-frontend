import { CheckCircle2, ChevronRight, Landmark, Plus, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import ConfirmDialog from '@components/ui/ConfirmDialog'
import Modal from '@components/ui/Modal'
import StatusBadge from '@components/ui/StatusBadge'
import ChequeStatusBadge from '@/components/collections/ChequeStatusBadge'
import {
  useCheques,
  useConfirmDepositBatch,
  useCreateDepositBatch,
  useDepositBatch,
  useDepositBatches,
  useDepositCheque,
  useSubmitDepositBatch,
} from '@/hooks/useCollections'
import { formatDate } from '@/utils'
import {
  Blank,
  Busy,
  PageTitle,
  Problem,
  colomboToday,
  inputStyle,
  isPostDated,
  money,
} from './collectionsUi'

export default function DepositBatchesPage() {
  const [status, setStatus] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    bankName: '',
    branchName: '',
    depositDate: colomboToday(),
    notes: '',
  })
  const [selectedCheques, setSelectedCheques] = useState([])
  const batches = useDepositBatches({ status: status || undefined, page: 1, pageSize: 100 })
  const received = useCheques({ status: 'Received', page: 1, pageSize: 100 })
  const create = useCreateDepositBatch()
  const assign = useDepositCheque()
  const submit = useSubmitDepositBatch()
  const confirm = useConfirmDepositBatch()
  const list = batches.data || []
  const effectiveId = selectedId || list[0]?.id || ''
  const detail = useDepositBatch(effectiveId)
  const eligible = useMemo(
    () => (received.data || []).filter((cheque) => !isPostDated(cheque.chequeDate)),
    [received.data]
  )
  const selectedTotal = eligible
    .filter((row) => selectedCheques.includes(row.id))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0)

  async function createBatch(event) {
    event.preventDefault()
    const id = await create.mutateAsync({
      ...form,
      branchName: form.branchName || null,
      notes: form.notes || null,
    })
    for (const chequeId of selectedCheques)
      await assign.mutateAsync({ id: chequeId, depositBatchId: id })
    setOpen(false)
    setSelectedId(id)
    setSelectedCheques([])
    setForm({ bankName: '', branchName: '', depositDate: colomboToday(), notes: '' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Deposit Batches"
        subtitle="Group received cheques into bank deposits, then submit and confirm them."
        actions={
          <button className="button-primary" onClick={() => setOpen(true)}>
            <Plus size={14} /> New batch
          </button>
        }
      />
      <div className="panel" style={{ padding: 12 }}>
        <select
          className="form-input"
          style={{ ...inputStyle, width: 190 }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option>Pending</option>
          <option>Submitted</option>
          <option>Confirmed</option>
        </select>
      </div>
      {batches.isLoading ? (
        <Busy label="Loading deposit batches..." />
      ) : batches.isError ? (
        <Problem error={batches.error} />
      ) : (
        <div
          className="responsive-master-detail"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 400px) minmax(0, 1fr)',
            gap: 14,
          }}
        >
          <section className="panel" style={{ padding: 12 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              {list.length ? (
                list.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    style={{
                      padding: 12,
                      textAlign: 'left',
                      borderRadius: 8,
                      border:
                        row.id === effectiveId
                          ? '1px solid var(--color-amber)'
                          : '1px solid var(--color-border)',
                      background: 'var(--color-bg-elevated)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong className="mono">{row.batchNumber}</strong>
                      <ChevronRight size={14} />
                    </div>
                    <div style={{ marginTop: 7, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{row.bankName}</span>
                      <span className="mono">{money(row.totalAmount)}</span>
                    </div>
                    <div style={{ marginTop: 7, display: 'flex', justifyContent: 'space-between' }}>
                      <StatusBadge status={row.status} />
                      <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                        {row.chequeCount} cheques
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <Blank>No deposit batches found.</Blank>
              )}
            </div>
          </section>
          <section className="panel" style={{ padding: 18 }}>
            {detail.isLoading ? (
              <Busy />
            ) : detail.data ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div className="form-label">Deposit batch</div>
                    <h2 className="mono" style={{ marginTop: 5, fontSize: 20 }}>
                      {detail.data.batchNumber}
                    </h2>
                  </div>
                  <StatusBadge status={detail.data.status} />
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4" style={{ marginTop: 18 }}>
                  {[
                    ['Bank', detail.data.bankName],
                    ['Branch', detail.data.branchName || '—'],
                    ['Deposit date', formatDate(detail.data.depositDate)],
                    ['Total', money(detail.data.totalAmount)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="form-label">{label}</div>
                      <div
                        className={label === 'Total' ? 'mono' : ''}
                        style={{ marginTop: 4, fontWeight: 700 }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 18, overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Cheque</th>
                        <th>Bank</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.data.cheques?.map((row) => (
                        <tr key={row.id}>
                          <td className="mono">{row.chequeNumber}</td>
                          <td>{row.bankName}</td>
                          <td>
                            <ChequeStatusBadge status={row.status} />
                          </td>
                          <td className="mono" style={{ textAlign: 'right' }}>
                            {money(row.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
                  {detail.data.status === 'Pending' ? (
                    <ConfirmDialog
                      title="Submit this deposit batch?"
                      description="The batch contents will be locked for bank processing."
                      confirmLabel="Submit batch"
                      tone="warning"
                      onConfirm={() => submit.mutateAsync(detail.data.id)}
                      trigger={
                        <button className="button-primary">
                          <Send size={14} /> Submit
                        </button>
                      }
                    />
                  ) : detail.data.status === 'Submitted' ? (
                    <ConfirmDialog
                      title="Confirm bank deposit?"
                      description="Confirm only after the deposit has been accepted by the bank."
                      confirmLabel="Confirm deposit"
                      tone="warning"
                      onConfirm={() => confirm.mutateAsync(detail.data.id)}
                      trigger={
                        <button className="button-primary">
                          <CheckCircle2 size={14} /> Confirm
                        </button>
                      }
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <Blank>Select a batch.</Blank>
            )}
          </section>
        </div>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create deposit batch"
        description="Post-dated cheques are excluded until their cheque date."
        maxWidth="760px"
        footer={
          <>
            <button className="button-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              form="batch-form"
              className="button-primary"
              disabled={create.isPending || assign.isPending || !selectedCheques.length}
            >
              {create.isPending || assign.isPending
                ? 'Creating...'
                : `Create batch · ${money(selectedTotal)}`}
            </button>
          </>
        }
      >
        <form id="batch-form" onSubmit={createBatch} style={{ display: 'grid', gap: 12 }}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label>
              <span className="form-label">Bank</span>
              <input
                required
                className="form-input"
                style={inputStyle}
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              />
            </label>
            <label>
              <span className="form-label">Branch</span>
              <input
                className="form-input"
                style={inputStyle}
                value={form.branchName}
                onChange={(e) => setForm({ ...form, branchName: e.target.value })}
              />
            </label>
            <label>
              <span className="form-label">Deposit date</span>
              <input
                required
                type="date"
                className="form-input mono"
                style={inputStyle}
                value={form.depositDate}
                onChange={(e) => setForm({ ...form, depositDate: e.target.value })}
              />
            </label>
            <label>
              <span className="form-label">Notes</span>
              <input
                className="form-input"
                style={inputStyle}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: 7 }}>
              Eligible received cheques
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'grid', gap: 6 }}>
              {eligible.length ? (
                eligible.map((row) => (
                  <label
                    key={row.id}
                    style={{
                      padding: 9,
                      border: '1px solid var(--color-border)',
                      borderRadius: 7,
                      display: 'flex',
                      gap: 9,
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCheques.includes(row.id)}
                      onChange={(e) =>
                        setSelectedCheques(
                          e.target.checked
                            ? [...selectedCheques, row.id]
                            : selectedCheques.filter((id) => id !== row.id)
                        )
                      }
                    />
                    <Landmark size={14} />
                    <span className="mono" style={{ flex: 1 }}>
                      {row.chequeNumber}
                    </span>
                    <span>{row.bankName}</span>
                    <strong className="mono">{money(row.amount)}</strong>
                  </label>
                ))
              ) : (
                <Blank>No non-post-dated received cheques are available.</Blank>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
