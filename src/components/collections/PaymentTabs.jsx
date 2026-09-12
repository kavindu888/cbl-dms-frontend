import { AlertTriangle, Ban, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Modal from '@components/ui/Modal'
import { getOutstandingInvoicesByIds } from '@/api/collectionsApi'
import {
  useBankBranches,
  useBanks,
  useDiscardCashDraft,
  useDraftCollections,
  useOutstandingInvoices,
  useRecordBankTransfer,
  useRecordCashPayment,
  useRecordChequePayment,
  useSubmitCashDraft,
  useUpdateCashDraft,
} from '@/hooks/useCollections'
import { colomboToday, inputStyle, isPostDated, money } from '@/pages/collections/collectionsUi'
import { formatDateTime } from '@/utils/formatDate'
import BillSearch from './BillSearch'
import InvoiceAllocationTable from './InvoiceAllocationTable'

const toCustomer = (bill) =>
  bill ? { id: bill.customerId, name: bill.customerName, code: bill.customerCode } : null

const DENOMINATIONS = [5000, 2000, 1000, 500, 100, 50, 20, 10, 1]
const allocationTotal = (rows) => rows.reduce((sum, row) => sum + Number(row.allocated || 0), 0)
// writeOffsByInvoiceId: { [invoiceId]: { amount, reason } } for rows the collector chose to
// permanently forgive the shortfall on, gathered from AllocationReviewModal at submit time.
const payloadAllocations = (rows, writeOffsByInvoiceId = {}) =>
  rows
    .filter((row) => Number(row.allocated) > 0)
    .map((row) => {
      const writeOff = writeOffsByInvoiceId[row.invoiceId]
      return {
        invoiceId: row.invoiceId,
        amount: Number(row.allocated),
        ...(writeOff?.amount > 0
          ? { writeOffAmount: writeOff.amount, writeOffReason: writeOff.reason }
          : {}),
      }
    })
const apiDate = (date) => `${date}T00:00:00.000Z`
const overpaidRowsOf = (rows) =>
  rows.filter((row) => Number(row.allocated || 0) > Number(row.outstanding || 0))
const underpaidRowsOf = (rows) =>
  rows.filter(
    (row) => Number(row.allocated || 0) > 0 && Number(row.allocated) < Number(row.outstanding || 0)
  )

// Gates a submit action behind a review popup whenever one or more bills are being paid beyond
// their outstanding amount (becomes credit) or short of it (the collector may choose to write off
// the remainder). When nothing is over/underpaid the action runs immediately with no popup.
function useAllocationReviewGate() {
  const [pending, setPending] = useState(null)
  const [isConfirming, setIsConfirming] = useState(false)
  function requestSubmit(allocations, run) {
    const overpaidRows = overpaidRowsOf(allocations)
    const underpaidRows = underpaidRowsOf(allocations)
    if (overpaidRows.length || underpaidRows.length) setPending({ overpaidRows, underpaidRows, run })
    else run({})
  }
  async function confirm(writeOffsByInvoiceId) {
    if (!pending) return
    setIsConfirming(true)
    try {
      await pending.run(writeOffsByInvoiceId)
    } finally {
      // Always close, success or failure — leaving it open on failure just shows stale
      // over/underpaid rows from before the attempt; the mutation's own onError already
      // surfaces what went wrong via toast, and resubmitting re-opens a fresh review if needed.
      setPending(null)
      setIsConfirming(false)
    }
  }
  function cancel() {
    if (isConfirming) return
    setPending(null)
  }
  return { pending, isConfirming, requestSubmit, confirm, cancel }
}

function AllocationReviewModal({ gate, customerName }) {
  const { pending, isConfirming, confirm, cancel } = gate
  const [writeOffs, setWriteOffs] = useState({})
  useEffect(() => {
    if (pending) setWriteOffs({})
  }, [pending])
  if (!pending) return null
  const { overpaidRows, underpaidRows } = pending
  const totalCredit = overpaidRows.reduce(
    (sum, row) => sum + (Number(row.allocated) - Number(row.outstanding)),
    0
  )

  function toggleWriteOff(row) {
    setWriteOffs((current) => {
      const next = { ...current }
      if (next[row.invoiceId]) {
        delete next[row.invoiceId]
      } else {
        next[row.invoiceId] = {
          amount: Number(row.outstanding) - Number(row.allocated),
          reason: '',
        }
      }
      return next
    })
  }
  function setReason(invoiceId, reason) {
    setWriteOffs((current) => ({ ...current, [invoiceId]: { ...current[invoiceId], reason } }))
  }

  const canConfirm = underpaidRows.every((row) => {
    const writeOff = writeOffs[row.invoiceId]
    return !writeOff || writeOff.reason.trim().length > 0
  })

  function handleConfirm() {
    const payload = Object.fromEntries(
      Object.entries(writeOffs)
        .filter(([, writeOff]) => writeOff.reason.trim())
        .map(([invoiceId, writeOff]) => [invoiceId, { ...writeOff, reason: writeOff.reason.trim() }])
    )
    confirm(payload)
  }

  return (
    <Modal open onOpenChange={(open) => !open && cancel()} title="Review allocation" maxWidth="560px">
      <div style={{ display: 'grid', gap: 16 }}>
        {overpaidRows.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Wallet size={18} color="var(--color-amber)" style={{ flex: '0 0 auto', marginTop: 2 }} />
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
                Paying more than what's owed on {overpaidRows.length} bill
                {overpaidRows.length === 1 ? '' : 's'}. The excess becomes credit on the paying
                customer's account (
                {[...new Set(overpaidRows.map((row) => row.customerName || customerName))]
                  .filter(Boolean)
                  .join(', ') || 'their account'}
                ), usable on a future bill.
              </p>
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Bill</th>
                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                    <th style={{ textAlign: 'right' }}>Paying</th>
                    <th style={{ textAlign: 'right' }}>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {overpaidRows.map((row) => (
                    <tr key={row.invoiceId}>
                      <td className="mono">{row.serialNumber || row.invoiceNumber}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {money(row.outstanding)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {money(row.allocated)}
                      </td>
                      <td
                        className="mono"
                        style={{ textAlign: 'right', color: 'var(--color-amber)', fontWeight: 700 }}
                      >
                        +{money(Number(row.allocated) - Number(row.outstanding))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}
            >
              <span>Total new credit</span>
              <span className="mono">{money(totalCredit)}</span>
            </div>
          </div>
        ) : null}

        {underpaidRows.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Ban size={18} color="var(--color-danger)" style={{ flex: '0 0 auto', marginTop: 2 }} />
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
                Paying less than what's owed on {underpaidRows.length} bill
                {underpaidRows.length === 1 ? '' : 's'}. Leave it as a partial payment to collect
                later, or write off the shortfall permanently (e.g. a rounding difference).
              </p>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {underpaidRows.map((row) => {
                const short = Number(row.outstanding) - Number(row.allocated)
                const writeOff = writeOffs[row.invoiceId]
                return (
                  <div
                    key={row.invoiceId}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding: 10,
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span className="mono">{row.serialNumber || row.invoiceNumber}</span>
                      <span>
                        Paying {money(row.allocated)} of {money(row.outstanding)} ·{' '}
                        <strong style={{ color: 'var(--color-danger)' }}>Short {money(short)}</strong>
                      </span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(writeOff)}
                        onChange={() => toggleWriteOff(row)}
                      />
                      Write off {money(short)} permanently — bill closes as fully paid
                    </label>
                    {writeOff ? (
                      <input
                        className="form-input"
                        placeholder="Reason (e.g. rounding difference) *"
                        value={writeOff.reason}
                        onChange={(event) => setReason(row.invoiceId, event.target.value)}
                        style={{ height: 34 }}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="button-secondary" disabled={isConfirming} onClick={cancel}>
            Go back
          </button>
          <button
            type="button"
            className="button-primary"
            disabled={isConfirming || !canConfirm}
            onClick={handleConfirm}
          >
            {isConfirming ? 'Recording...' : 'Confirm & record'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function AllocationSection({ customer, total, allocations, setAllocations }) {
  const invoices = useOutstandingInvoices(customer?.id)
  const allocated = allocationTotal(allocations)
  const matches = Number(total) > 0 && Math.abs(allocated - Number(total)) < 0.01
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {invoices.isLoading ? (
        <div style={{ padding: 15, color: 'var(--color-text-muted)' }}>
          Loading outstanding invoices...
        </div>
      ) : invoices.isError ? (
        <div style={{ padding: 15, color: 'var(--color-danger)' }}>{invoices.error.message}</div>
      ) : (
        <InvoiceAllocationTable
          invoices={invoices.data || []}
          allocations={allocations}
          onChange={setAllocations}
          totalPayment={Number(total || 0)}
        />
      )}
      <div
        style={{
          padding: 10,
          display: 'flex',
          justifyContent: 'space-between',
          border: `1px solid ${matches ? 'var(--color-teal)' : 'var(--color-amber)'}`,
          borderRadius: 7,
          color: matches ? 'var(--color-teal)' : 'var(--color-amber)',
          fontSize: 12,
        }}
      >
        <span>
          {matches ? 'Allocations match payment total' : 'Allocations must equal payment total'}
        </span>
        <span className="mono">
          {money(allocated)} / {money(total)}
        </span>
      </div>
    </div>
  )
}

export function CashTab({ sessionId, disabled, onRecorded }) {
  const [counts, setCounts] = useState({})
  const [pickedInvoices, setPickedInvoices] = useState([])
  const [allocations, setAllocations] = useState([])
  const [editingDraftId, setEditingDraftId] = useState(null)
  const [isLoadingDraft, setIsLoadingDraft] = useState(false)
  const mutation = useRecordCashPayment()
  const gate = useAllocationReviewGate()
  const drafts = useDraftCollections(sessionId)
  const updateDraft = useUpdateCashDraft()
  const submitDraft = useSubmitCashDraft()
  const discardDraft = useDiscardCashDraft()
  const cashDrafts = (drafts.data || []).filter((draft) => draft.method === 'Cash')
  const total = DENOMINATIONS.reduce(
    (sum, denomination) => sum + denomination * Number(counts[denomination] || 0),
    0
  )
  const matches = Math.abs(allocationTotal(allocations) - total) < 0.01

  function addBill(bill) {
    if (!bill) return
    setPickedInvoices((current) =>
      current.some((row) => row.invoiceId === bill.invoiceId) ? current : [...current, bill]
    )
  }
  function removeBill(bill) {
    setPickedInvoices((current) => current.filter((row) => row.invoiceId !== bill.invoiceId))
    setAllocations((current) => current.filter((row) => row.invoiceId !== bill.invoiceId))
  }

  function resetForm() {
    setCounts({})
    setPickedInvoices([])
    setAllocations([])
    setEditingDraftId(null)
  }

  async function editDraft(draft) {
    setIsLoadingDraft(true)
    try {
      const ids = draft.allocations.map((allocation) => allocation.invoiceId)
      const bills = await getOutstandingInvoicesByIds(ids)
      setPickedInvoices(bills)
      setAllocations(
        draft.allocations.map((allocation) => {
          const bill = bills.find((row) => row.invoiceId === allocation.invoiceId)
          return {
            invoiceId: allocation.invoiceId,
            invoiceNumber: bill?.invoiceNumber,
            serialNumber: bill?.serialNumber,
            customerName: bill?.customerName,
            outstanding: Number(bill?.outstandingAmount || 0),
            allocated: String(allocation.amount),
          }
        })
      )
      const nextCounts = {}
      draft.denominations.forEach((d) => {
        nextCounts[d.denomination] = d.count
      })
      setCounts(nextCounts)
      setEditingDraftId(draft.id)
    } catch (error) {
      toast.error(error.message || 'Unable to load draft for editing.')
    } finally {
      setIsLoadingDraft(false)
    }
  }

  async function doSubmit(writeOffsByInvoiceId = {}, saveAsDraft = false) {
    const payload = {
      totalAmount: total,
      denominations: DENOMINATIONS.filter((denomination) => Number(counts[denomination]) > 0).map(
        (denomination) => ({ denomination, count: Number(counts[denomination]) })
      ),
      allocations: payloadAllocations(allocations, writeOffsByInvoiceId),
    }
    if (editingDraftId) {
      await updateDraft.mutateAsync({ id: editingDraftId, ...payload })
      if (saveAsDraft) {
        toast.success('Draft updated')
      } else {
        await submitDraft.mutateAsync(editingDraftId)
      }
    } else {
      await mutation.mutateAsync({ sessionId, ...payload, saveAsDraft })
    }
    resetForm()
    onRecorded?.()
  }

  function submit() {
    if (total <= 0 || !matches || !allocations.length) {
      toast.error('Enter the cash total and allocate it fully across at least one bill.')
      return
    }
    gate.requestSubmit(allocations, doSubmit)
  }

  function saveDraft() {
    if (total <= 0) {
      toast.error('Enter the cash total first.')
      return
    }
    doSubmit({}, true)
  }

  const isBusy =
    mutation.isPending ||
    gate.isConfirming ||
    updateDraft.isPending ||
    submitDraft.isPending ||
    isLoadingDraft

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section className="panel" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800 }}>Cash denominations</h3>
        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th>Denomination</th>
                <th style={{ textAlign: 'right' }}>Count</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {DENOMINATIONS.map((denomination) => (
                <tr key={denomination}>
                  <td className="mono">{denomination === 1 ? 'Coins' : money(denomination)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="number"
                      min="0"
                      className="form-input mono"
                      value={counts[denomination] || ''}
                      onChange={(event) =>
                        setCounts({
                          ...counts,
                          [denomination]: Math.max(0, Number(event.target.value || 0)),
                        })
                      }
                      style={{
                        width: 90,
                        height: 32,
                        textAlign: 'right',
                        background: 'var(--color-bg-base)',
                      }}
                      disabled={disabled}
                    />
                  </td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {money(denomination * Number(counts[denomination] || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ fontWeight: 800 }}>
                  Total cash
                </td>
                <td
                  className="mono"
                  style={{ textAlign: 'right', color: 'var(--color-amber)', fontWeight: 850 }}
                >
                  {money(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
      {total > 0 ? (
        <section className="panel" style={{ padding: 16, display: 'grid', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800 }}>Allocate to invoices</h3>
              <p style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
                Search a bill, then assign cash to it — add as many bills as you need, from any
                customer, until the full cash total is allocated.
              </p>
            </div>
            {editingDraftId ? (
              <span
                style={{
                  flex: '0 0 auto',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-amber)',
                  border: '1px solid var(--color-amber)',
                }}
              >
                Editing draft
              </span>
            ) : null}
          </div>
          <label>
            <span className="form-label">Add a bill</span>
            <BillSearch value={null} onChange={addBill} />
          </label>
          {pickedInvoices.length ? (
            <InvoiceAllocationTable
              invoices={pickedInvoices}
              allocations={allocations}
              onChange={setAllocations}
              totalPayment={total}
              onRemove={removeBill}
            />
          ) : (
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-dim)' }}>
              Search and add at least one bill above.
            </p>
          )}
          {pickedInvoices.length ? (
            <div
              style={{
                padding: 10,
                display: 'flex',
                justifyContent: 'space-between',
                border: `1px solid ${matches ? 'var(--color-teal)' : 'var(--color-amber)'}`,
                borderRadius: 7,
                color: matches ? 'var(--color-teal)' : 'var(--color-amber)',
                fontSize: 12,
              }}
            >
              <span>
                {matches ? 'Allocations match cash total' : 'Allocations must equal cash total'}
              </span>
              <span className="mono">
                {money(allocationTotal(allocations))} / {money(total)}
              </span>
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 10 }}>
            {editingDraftId ? (
              <button
                type="button"
                className="button-ghost"
                onClick={resetForm}
                disabled={disabled || isBusy}
              >
                Cancel edit
              </button>
            ) : null}
            <button
              type="button"
              className="button-secondary"
              onClick={saveDraft}
              disabled={disabled || isBusy || total <= 0}
            >
              {editingDraftId ? 'Save changes' : 'Save as draft'}
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={submit}
              style={{ flex: 1 }}
              disabled={disabled || isBusy || !matches || !allocations.length}
            >
              {isBusy ? 'Recording...' : `Record ${money(total)} cash`}
            </button>
          </div>
        </section>
      ) : null}
      {cashDrafts.length ? (
        <section className="panel" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800 }}>Saved drafts</h3>
          <p style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
            Not yet posted to any invoice — recheck, edit, submit when ready, or discard.
          </p>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {cashDrafts.map((draft) => (
              <div
                key={draft.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  border:
                    editingDraftId === draft.id
                      ? '1px solid var(--color-amber)'
                      : '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <div>
                  <div className="mono" style={{ fontWeight: 700 }}>
                    {money(draft.totalAmount)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {draft.allocations.length} bill{draft.allocations.length === 1 ? '' : 's'} ·
                    saved {formatDateTime(draft.savedOn)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => editDraft(draft)}
                    disabled={isBusy}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => submitDraft.mutate(draft.id)}
                    disabled={isBusy}
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    className="button-ghost"
                    style={{ color: 'var(--color-danger)' }}
                    onClick={() => discardDraft.mutate(draft.id)}
                    disabled={isBusy}
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <AllocationReviewModal gate={gate} customerName={null} />
    </div>
  )
}

function BankFields({ bankId, setBankId, branchId, setBranchId, requireBranch = false }) {
  const banks = useBanks()
  const branches = useBankBranches(bankId)
  return (
    <>
      <label>
        <span className="form-label">Bank *</span>
        <select
          required
          className="form-input"
          style={inputStyle}
          value={bankId}
          onChange={(event) => setBankId(event.target.value)}
        >
          <option value="">Select bank</option>
          {(banks.data || []).map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="form-label">Branch{requireBranch ? ' *' : ''}</span>
        <select
          required={requireBranch}
          disabled={!bankId}
          className="form-input"
          style={inputStyle}
          value={branchId}
          onChange={(event) => setBranchId(event.target.value)}
        >
          <option value="">Select branch</option>
          {(branches.data || []).map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

export function ChequesTab({ sessionId, disabled, onRecorded }) {
  const [bill, setBill] = useState(null)
  const customer = toCustomer(bill)
  const [form, setForm] = useState({
    chequeNumber: '',
    drawerName: '',
    bankId: '',
    branchId: '',
    amount: '',
    chequeDate: colomboToday(),
    notes: '',
  })
  const [allocations, setAllocations] = useState([])
  const banks = useBanks()
  const branches = useBankBranches(form.bankId)
  const mutation = useRecordChequePayment()
  const gate = useAllocationReviewGate()
  const amount = Number(form.amount || 0)
  const matches = amount > 0 && Math.abs(allocationTotal(allocations) - amount) < 0.01
  const bank = (banks.data || []).find((row) => row.id === form.bankId)
  const branch = (branches.data || []).find((row) => row.id === form.branchId)

  async function doSubmit(writeOffsByInvoiceId = {}) {
    await mutation.mutateAsync({
      sessionId,
      customerId: customer.id,
      totalAmount: amount,
      chequeNumber: form.chequeNumber,
      drawerName: form.drawerName,
      chequeDate: apiDate(form.chequeDate),
      allocations: payloadAllocations(allocations, writeOffsByInvoiceId),
      bankId: form.bankId,
      bankBranchId: form.branchId || null,
      bankName: bank?.name || null,
      branchName: branch?.name || null,
      notes: form.notes || null,
    })
    setBill(null)
    setAllocations([])
    setForm({
      chequeNumber: '',
      drawerName: '',
      bankId: '',
      branchId: '',
      amount: '',
      chequeDate: colomboToday(),
      notes: '',
    })
    onRecorded?.()
  }

  function submit(event) {
    event.preventDefault()
    if (!customer || !matches)
      return toast.error('Allocate the full cheque amount before recording.')
    gate.requestSubmit(allocations, doSubmit)
  }

  return (
    <form onSubmit={submit} className="panel" style={{ padding: 16, display: 'grid', gap: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800 }}>Record cheque</h3>
      <label>
        <span className="form-label">Bill *</span>
        <BillSearch
          value={bill}
          onChange={(next) => {
            setBill(next)
            setAllocations([])
          }}
        />
      </label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label>
          <span className="form-label">Cheque number *</span>
          <input
            required
            className="form-input mono"
            style={inputStyle}
            value={form.chequeNumber}
            onChange={(event) => setForm({ ...form, chequeNumber: event.target.value })}
          />
        </label>
        <label>
          <span className="form-label">Drawer name *</span>
          <input
            required
            className="form-input"
            style={inputStyle}
            value={form.drawerName}
            onChange={(event) => setForm({ ...form, drawerName: event.target.value })}
          />
        </label>
        <BankFields
          bankId={form.bankId}
          setBankId={(bankId) => setForm({ ...form, bankId, branchId: '' })}
          branchId={form.branchId}
          setBranchId={(branchId) => setForm({ ...form, branchId })}
        />
        <label>
          <span className="form-label">Amount *</span>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            className="form-input mono"
            style={inputStyle}
            value={form.amount}
            onChange={(event) => {
              setForm({ ...form, amount: event.target.value })
              setAllocations([])
            }}
          />
        </label>
        <label>
          <span className="form-label">Cheque date *</span>
          <input
            required
            type="date"
            className="form-input mono"
            style={inputStyle}
            value={form.chequeDate}
            onChange={(event) => setForm({ ...form, chequeDate: event.target.value })}
          />
          {isPostDated(form.chequeDate) ? (
            <span
              style={{
                marginTop: 5,
                display: 'flex',
                gap: 5,
                color: 'var(--color-amber)',
                fontSize: 11,
              }}
            >
              <AlertTriangle size={13} /> Post-dated — cannot deposit before this date
            </span>
          ) : null}
        </label>
      </div>
      {customer && amount > 0 ? (
        <AllocationSection
          customer={customer}
          total={amount}
          allocations={allocations}
          setAllocations={setAllocations}
        />
      ) : null}
      <label>
        <span className="form-label">Notes</span>
        <textarea
          className="form-input"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
      </label>
      <button
        className="button-primary"
        disabled={disabled || mutation.isPending || gate.isConfirming || !customer || !matches}
      >
        {mutation.isPending || gate.isConfirming ? 'Recording...' : 'Record cheque'}
      </button>
      <AllocationReviewModal gate={gate} customerName={customer?.name} />
    </form>
  )
}

export function BankTransfersTab({ sessionId, disabled, onRecorded }) {
  const [bill, setBill] = useState(null)
  const customer = toCustomer(bill)
  const [form, setForm] = useState({
    bankId: '',
    branchId: '',
    referenceNumber: '',
    amount: '',
    transferDate: colomboToday(),
    notes: '',
  })
  const [allocations, setAllocations] = useState([])
  const mutation = useRecordBankTransfer()
  const gate = useAllocationReviewGate()
  const amount = Number(form.amount || 0)
  const matches = amount > 0 && Math.abs(allocationTotal(allocations) - amount) < 0.01
  const valid = customer && form.bankId && form.branchId && form.referenceNumber && matches
  async function doSubmit(writeOffsByInvoiceId = {}) {
    await mutation.mutateAsync({
      sessionId,
      customerId: customer.id,
      bankId: form.bankId,
      bankBranchId: form.branchId,
      referenceNumber: form.referenceNumber,
      totalAmount: amount,
      transferDate: apiDate(form.transferDate),
      allocations: payloadAllocations(allocations, writeOffsByInvoiceId),
      notes: form.notes || null,
    })
    setBill(null)
    setAllocations([])
    setForm({
      bankId: '',
      branchId: '',
      referenceNumber: '',
      amount: '',
      transferDate: colomboToday(),
      notes: '',
    })
    onRecorded?.()
  }
  function submit(event) {
    event.preventDefault()
    if (!valid) return toast.error('Complete the transfer and allocate its full amount.')
    gate.requestSubmit(allocations, doSubmit)
  }
  return (
    <form onSubmit={submit} className="panel" style={{ padding: 16, display: 'grid', gap: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800 }}>Record bank transfer</h3>
      <label>
        <span className="form-label">Bill *</span>
        <BillSearch
          value={bill}
          onChange={(next) => {
            setBill(next)
            setAllocations([])
          }}
        />
      </label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label>
          <span className="form-label">Reference number *</span>
          <input
            required
            className="form-input mono"
            style={inputStyle}
            value={form.referenceNumber}
            onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })}
          />
        </label>
        <label>
          <span className="form-label">Amount *</span>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            className="form-input mono"
            style={inputStyle}
            value={form.amount}
            onChange={(event) => {
              setForm({ ...form, amount: event.target.value })
              setAllocations([])
            }}
          />
        </label>
        <BankFields
          bankId={form.bankId}
          setBankId={(bankId) => setForm({ ...form, bankId, branchId: '' })}
          branchId={form.branchId}
          setBranchId={(branchId) => setForm({ ...form, branchId })}
          requireBranch
        />
        <label>
          <span className="form-label">Transfer date *</span>
          <input
            required
            type="date"
            className="form-input mono"
            style={inputStyle}
            value={form.transferDate}
            onChange={(event) => setForm({ ...form, transferDate: event.target.value })}
          />
        </label>
      </div>
      {customer && amount > 0 ? (
        <AllocationSection
          customer={customer}
          total={amount}
          allocations={allocations}
          setAllocations={setAllocations}
        />
      ) : null}
      <label>
        <span className="form-label">Notes</span>
        <textarea
          className="form-input"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
      </label>
      <button
        className="button-primary"
        disabled={disabled || mutation.isPending || gate.isConfirming || !valid}
      >
        {mutation.isPending || gate.isConfirming ? 'Recording...' : 'Record transfer'}
      </button>
      <AllocationReviewModal gate={gate} customerName={customer?.name} />
    </form>
  )
}
