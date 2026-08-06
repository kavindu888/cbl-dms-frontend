import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  useBankBranches,
  useBanks,
  useOutstandingInvoices,
  useRecordBankTransfer,
  useRecordCashPayment,
  useRecordChequePayment,
} from '@/hooks/useCollections'
import { colomboToday, inputStyle, isPostDated, money } from '@/pages/collections/collectionsUi'
import CustomerSelector from './CustomerSelector'
import InvoiceAllocationTable from './InvoiceAllocationTable'

const DENOMINATIONS = [5000, 2000, 1000, 500, 100, 50, 20, 10, 1]
const allocationTotal = (rows) => rows.reduce((sum, row) => sum + Number(row.allocated || 0), 0)
const payloadAllocations = (rows) =>
  rows
    .filter((row) => Number(row.allocated) > 0)
    .map((row) => ({ invoiceId: row.invoiceId, amount: Number(row.allocated) }))
const apiDate = (date) => new Date(`${date}T00:00:00+05:30`).toISOString()

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

export function CashTab({ sessionId, routeId, disabled, onRecorded }) {
  const [counts, setCounts] = useState({})
  const [customer, setCustomer] = useState(null)
  const [allocations, setAllocations] = useState([])
  const mutation = useRecordCashPayment()
  const total = DENOMINATIONS.reduce(
    (sum, denomination) => sum + denomination * Number(counts[denomination] || 0),
    0
  )
  const matches = Math.abs(allocationTotal(allocations) - total) < 0.01

  async function submit() {
    if (!customer || total <= 0 || !matches) {
      toast.error('Select a customer and allocate the full cash total.')
      return
    }
    await mutation.mutateAsync({
      sessionId,
      customerId: customer.id,
      totalAmount: total,
      denominations: DENOMINATIONS.filter((denomination) => Number(counts[denomination]) > 0).map(
        (denomination) => ({ denomination, count: Number(counts[denomination]) })
      ),
      allocations: payloadAllocations(allocations),
    })
    setCounts({})
    setCustomer(null)
    setAllocations([])
    onRecorded?.()
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section
        className="panel"
        style={{
          padding: 16,
          display: 'grid',
          gap: 14,
        }}
      >
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800 }}>
            Allocate to invoices
          </h3>

          <p
            style={{
              marginTop: 4,
              fontSize: 11,
              color: 'var(--color-text-muted)',
            }}
          >
            Select a customer and assign cash to their outstanding invoices.
          </p>
        </div>

        <label>
          <span className="form-label">Customer *</span>

          <CustomerSelector
            value={customer}
            onChange={(next) => {
              setCustomer(next)
              setAllocations([])
            }}
            routeId={routeId}
          />
        </label>

        {customer ? (
          <AllocationSection
            customer={customer}
            total={total}
            allocations={allocations}
            setAllocations={setAllocations}
          />
        ) : null}

        <button
          type="button"
          className="button-primary"
          onClick={submit}
          disabled={
            disabled ||
            mutation.isPending ||
            !customer ||
            total <= 0 ||
            !matches ||
            !allocations.length
          }
        >
          {mutation.isPending
            ? 'Recording...'
            : `Record ${money(total)} cash`}
        </button>
        
        {!customer ? (
          <p
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--color-text-dim)',
            }}
          >
            Select a customer to enable submission.
          </p>
        ) : null}
      </section>
      <section className="panel" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800 }}>Cash denominations</h3>
        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table
            className="data-table"
            style={{
              width: '100%',
              minWidth: 1100,
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              <col style={{ width: 110 }} />

              {DENOMINATIONS.map((denomination) => (
                <col
                  key={denomination}
                  style={{ width: 110 }}
                />
              ))}
            </colgroup>

            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>
                  Denomination
                </th>

                {DENOMINATIONS.map((denomination) => (
                  <th
                    key={denomination}
                    className="mono"
                    style={{
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {denomination === 1
                      ? 'Coins'
                      : money(denomination)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Count boxes row */}
              <tr>
                <td style={{ fontWeight: 800 }}>
                  Count
                </td>

                {DENOMINATIONS.map((denomination) => (
                  <td
                    key={denomination}
                    style={{
                      textAlign: 'center',
                      padding: '10px 6px',
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-input mono"
                      value={counts[denomination] || ''}
                      onChange={(event) =>
                        setCounts((current) => ({
                          ...current,
                          [denomination]: Math.max(
                            0,
                            Number(event.target.value || 0)
                          ),
                        }))
                      }
                      disabled={disabled}
                      style={{
                        width: 76,
                        height: 34,
                        margin: '0 auto',
                        textAlign: 'center',
                        background: 'var(--color-bg-base)',
                      }}
                    />
                  </td>
                ))}
              </tr>

              {/* Individual totals row */}
              <tr>
                <td style={{ fontWeight: 800 }}>
                  Total
                </td>

                {DENOMINATIONS.map((denomination) => (
                  <td
                    key={denomination}
                    className="mono"
                    style={{
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      fontWeight: 700,
                    }}
                  >
                    {money(
                      denomination *
                        Number(counts[denomination] || 0)
                    )}
                  </td>
                ))}
              </tr>
            </tbody>

            <tfoot>
              <tr>
                <td
                  colSpan={DENOMINATIONS.length}
                  style={{
                    textAlign: 'right',
                    fontWeight: 800,
                  }}
                >
                  Total cash
                </td>

                <td
                  className="mono"
                  style={{
                    textAlign: 'center',
                    color: 'var(--color-amber)',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {money(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
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

export function ChequesTab({ sessionId, routeId, disabled, onRecorded }) {
  const [customer, setCustomer] = useState(null)
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
  const amount = Number(form.amount || 0)
  const matches = amount > 0 && Math.abs(allocationTotal(allocations) - amount) < 0.01
  const bank = (banks.data || []).find((row) => row.id === form.bankId)
  const branch = (branches.data || []).find((row) => row.id === form.branchId)

  async function submit(event) {
    event.preventDefault()
    if (!customer || !matches)
      return toast.error('Allocate the full cheque amount before recording.')
    await mutation.mutateAsync({
      sessionId,
      customerId: customer.id,
      totalAmount: amount,
      chequeNumber: form.chequeNumber,
      drawerName: form.drawerName,
      chequeDate: apiDate(form.chequeDate),
      allocations: payloadAllocations(allocations),
      bankId: form.bankId,
      bankBranchId: form.branchId || null,
      bankName: bank?.name || null,
      branchName: branch?.name || null,
      notes: form.notes || null,
    })
    setCustomer(null)
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

  return (
    <form onSubmit={submit} className="panel" style={{ padding: 16, display: 'grid', gap: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800 }}>Record cheque</h3>
      <label>
        <span className="form-label">Customer *</span>
        <CustomerSelector
          value={customer}
          onChange={(next) => {
            setCustomer(next)
            setAllocations([])
          }}
          routeId={routeId}
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
        disabled={disabled || mutation.isPending || !customer || !matches}
      >
        {mutation.isPending ? 'Recording...' : 'Record cheque'}
      </button>
    </form>
  )
}

export function BankTransfersTab({ sessionId, routeId, disabled, onRecorded }) {
  const [customer, setCustomer] = useState(null)
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
  const amount = Number(form.amount || 0)
  const matches = amount > 0 && Math.abs(allocationTotal(allocations) - amount) < 0.01
  const valid = customer && form.bankId && form.branchId && form.referenceNumber && matches
  async function submit(event) {
    event.preventDefault()
    if (!valid) return toast.error('Complete the transfer and allocate its full amount.')
    await mutation.mutateAsync({
      sessionId,
      customerId: customer.id,
      bankId: form.bankId,
      bankBranchId: form.branchId,
      referenceNumber: form.referenceNumber,
      totalAmount: amount,
      transferDate: apiDate(form.transferDate),
      allocations: payloadAllocations(allocations),
      notes: form.notes || null,
    })
    setCustomer(null)
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
  return (
    <form onSubmit={submit} className="panel" style={{ padding: 16, display: 'grid', gap: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800 }}>Record bank transfer</h3>
      <label>
        <span className="form-label">Customer *</span>
        <CustomerSelector
          value={customer}
          onChange={(next) => {
            setCustomer(next)
            setAllocations([])
          }}
          routeId={routeId}
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
      <button className="button-primary" disabled={disabled || mutation.isPending || !valid}>
        {mutation.isPending ? 'Recording...' : 'Record transfer'}
      </button>
    </form>
  )
}
