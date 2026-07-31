import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, ChevronRight, FileCheck2, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '@components/ui/ConfirmDialog'
import Modal from '@components/ui/Modal'
import SimplePagination from '@components/ui/SimplePagination'
import ChequeStatusBadge from '@/components/collections/ChequeStatusBadge'
import {
  useBounceCheque,
  useCancelCheque,
  useCheques,
  useClearCheque,
  useDepositBatches,
  useDepositCheque,
} from '@/hooks/useCollections'
import { salesService } from '@/services/api/salesService'
import { formatDate, formatDateTime } from '@/utils'
import { Blank, Busy, PageTitle, Problem, inputStyle, isPostDated, money } from './collectionsUi'

const PAGE_SIZE = 10

export default function ChequesPage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState('')
  const [action, setAction] = useState(null)
  const [reason, setReason] = useState('')
  const [bounceCharge, setBounceCharge] = useState('')
  const [batchId, setBatchId] = useState('')
  const cheques = useCheques({ status: status || undefined, page: 1, pageSize: 100 })
  const batches = useDepositBatches({ status: 'Pending', page: 1, pageSize: 100 })
  const customers = useQuery({
    queryKey: ['sales', 'customers', 'cheque-list'],
    queryFn: () => salesService.listAllCustomers({ pageSize: 100 }),
    staleTime: 60_000,
  })
  const customerById = useMemo(
    () => Object.fromEntries((customers.data || []).map((row) => [row.id, row])),
    [customers.data]
  )
  const filtered = useMemo(
    () =>
      (cheques.data || []).filter((row) => {
        const q = search.trim().toLowerCase()
        return (
          !q ||
          row.chequeNumber?.toLowerCase().includes(q) ||
          row.bankName?.toLowerCase().includes(q) ||
          customerById[row.customerId]?.name?.toLowerCase().includes(q)
        )
      }),
    [cheques.data, customerById, search]
  )
  const selected = filtered.find((row) => row.id === selectedId) || filtered[0]
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const deposit = useDepositCheque()
  const clear = useClearCheque()
  const bounce = useBounceCheque()
  const cancel = useCancelCheque()
  useEffect(() => setPage(1), [search, status])

  async function submitAction(event) {
    event.preventDefault()
    if (action === 'deposit')
      await deposit.mutateAsync({ id: selected.id, depositBatchId: batchId })
    if (action === 'bounce')
      await bounce.mutateAsync({
        id: selected.id,
        data: { reason, bounceCharge: Number(bounceCharge || 0) },
      })
    if (action === 'cancel') await cancel.mutateAsync({ id: selected.id, reason })
    setAction(null)
    setReason('')
    setBounceCharge('')
    setBatchId('')
  }
  const actionPending = deposit.isPending || bounce.isPending || cancel.isPending

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Cheques"
        subtitle="Track received cheques through deposit, clearance, bounce, or cancellation."
      />
      <div
        className="panel responsive-filter-bar"
        style={{ padding: 12, display: 'flex', gap: 10 }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={15}
            style={{ position: 'absolute', top: 11, left: 12, color: 'var(--color-text-dim)' }}
          />
          <input
            className="form-input"
            style={{ ...inputStyle, paddingLeft: 36 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cheque, bank, or customer"
          />
        </div>
        <select
          className="form-input"
          style={{ ...inputStyle, width: 180 }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {['Received', 'Deposited', 'Cleared', 'Bounced', 'Cancelled'].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {cheques.isLoading ? (
        <Busy label="Loading cheques..." />
      ) : cheques.isError ? (
        <Problem error={cheques.error} />
      ) : (
        <div
          className="responsive-master-detail"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(330px, 420px) minmax(0, 1fr)',
            gap: 14,
          }}
        >
          <section className="panel" style={{ padding: 12 }}>
            <h2 style={{ padding: '3px 3px 12px', fontSize: 13, fontWeight: 800 }}>
              {filtered.length} cheques
            </h2>
            <div style={{ display: 'grid', gap: 7 }}>
              {paged.length ? (
                paged.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    style={{
                      padding: 11,
                      textAlign: 'left',
                      borderRadius: 8,
                      border:
                        row.id === selected?.id
                          ? '1px solid var(--color-amber)'
                          : '1px solid var(--color-border)',
                      background:
                        row.id === selected?.id
                          ? 'color-mix(in srgb, var(--color-amber) 8%, transparent)'
                          : 'var(--color-bg-elevated)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong className="mono">{row.chequeNumber}</strong>
                      <ChevronRight size={14} />
                    </div>
                    <div
                      style={{
                        marginTop: 7,
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12 }}>
                        {customerById[row.customerId]?.name || row.customerId}
                      </span>
                      <span className="mono" style={{ color: 'var(--color-amber)' }}>
                        {money(row.amount)}
                      </span>
                    </div>
                    <div style={{ marginTop: 7 }}>
                      <ChequeStatusBadge status={row.status} />
                    </div>
                  </button>
                ))
              ) : (
                <Blank>No cheques match this filter.</Blank>
              )}
            </div>
            {filtered.length ? (
              <SimplePagination
                page={page}
                pageSize={PAGE_SIZE}
                totalItems={filtered.length}
                onPageChange={setPage}
                itemLabel="cheques"
              />
            ) : null}
          </section>
          <section className="panel" style={{ padding: 18 }}>
            {selected ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div className="form-label">Cheque number</div>
                    <h2 className="mono" style={{ marginTop: 5, fontSize: 20, fontWeight: 800 }}>
                      {selected.chequeNumber}
                    </h2>
                  </div>
                  <ChequeStatusBadge status={selected.status} />
                </div>
                {isPostDated(selected.chequeDate) ? (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 10,
                      borderRadius: 7,
                      color: 'var(--color-amber)',
                      background: 'rgba(245,158,11,.08)',
                      border: '1px solid rgba(245,158,11,.25)',
                      display: 'flex',
                      gap: 7,
                    }}
                  >
                    <AlertTriangle size={16} /> Post-dated cheque — dated{' '}
                    {formatDate(selected.chequeDate)}
                  </div>
                ) : null}
                <dl className="grid grid-cols-1 gap-4 md:grid-cols-2" style={{ marginTop: 18 }}>
                  {[
                    ['Customer', customerById[selected.customerId]?.name || selected.customerId],
                    ['Amount', money(selected.amount)],
                    ['Bank', selected.bankName],
                    ['Branch', selected.branchName || '—'],
                    ['Drawer', selected.drawerName],
                    ['Cheque date', formatDate(selected.chequeDate)],
                    ['Received', formatDateTime(selected.receivedAt)],
                    ['Deposit batch', selected.depositBatchId || 'Not assigned'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="form-label">{label}</dt>
                      <dd
                        className={label === 'Amount' ? 'mono' : ''}
                        style={{ marginTop: 4, fontWeight: 600 }}
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {selected.bounceReason ? (
                  <div style={{ marginTop: 14, color: 'var(--color-danger)' }}>
                    Bounce: {selected.bounceReason} ({money(selected.bounceChargeAmount)})
                  </div>
                ) : null}
                <div
                  style={{
                    marginTop: 22,
                    paddingTop: 14,
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {selected.status === 'Received' ? (
                    <>
                      <button className="button-secondary" onClick={() => setAction('cancel')}>
                        <X size={14} /> Cancel
                      </button>
                      <button className="button-primary" onClick={() => setAction('deposit')}>
                        <FileCheck2 size={14} /> Assign batch
                      </button>
                    </>
                  ) : null}
                  {selected.status === 'Deposited' ? (
                    <>
                      <button className="button-danger" onClick={() => setAction('bounce')}>
                        <AlertTriangle size={14} /> Bounce
                      </button>
                      <ConfirmDialog
                        title="Clear this cheque?"
                        description="Clearing updates the customer balance and cannot be casually reversed."
                        confirmLabel="Clear cheque"
                        tone="warning"
                        onConfirm={() => clear.mutateAsync({ id: selected.id })}
                        trigger={
                          <button className="button-primary">
                            <Check size={14} /> Mark cleared
                          </button>
                        }
                      />
                    </>
                  ) : null}
                </div>
              </>
            ) : (
              <Blank>Select a cheque to review.</Blank>
            )}
          </section>
        </div>
      )}
      <Modal
        open={Boolean(action)}
        onOpenChange={(next) => !next && setAction(null)}
        title={
          action === 'deposit'
            ? 'Assign deposit batch'
            : action === 'bounce'
              ? 'Record cheque bounce'
              : 'Cancel cheque'
        }
        description={
          action === 'bounce'
            ? 'This is irreversible and has financial impact on the customer account.'
            : undefined
        }
        footer={
          <>
            <button className="button-secondary" onClick={() => setAction(null)}>
              Back
            </button>
            <button
              form="cheque-action-form"
              className={
                action === 'bounce' || action === 'cancel' ? 'button-danger' : 'button-primary'
              }
              disabled={actionPending}
            >
              {actionPending ? 'Working...' : 'Confirm'}
            </button>
          </>
        }
      >
        <form id="cheque-action-form" onSubmit={submitAction} style={{ display: 'grid', gap: 12 }}>
          {action === 'deposit' ? (
            <label>
              <span className="form-label">Pending deposit batch</span>
              <select
                required
                className="form-input"
                style={inputStyle}
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              >
                <option value="">Select batch</option>
                {(batches.data || []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.batchNumber} — {row.bankName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label>
                <span className="form-label">Reason</span>
                <textarea
                  required
                  className="form-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              {action === 'bounce' ? (
                <label>
                  <span className="form-label">Bounce charge</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    className="form-input mono"
                    style={inputStyle}
                    value={bounceCharge}
                    onChange={(e) => setBounceCharge(e.target.value)}
                  />
                </label>
              ) : null}
            </>
          )}
        </form>
      </Modal>
    </div>
  )
}
