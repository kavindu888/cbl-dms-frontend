import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Ban, CheckCircle2, FileCheck2, Landmark, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Modal from '@components/ui/Modal'
import ChequeStatusBadge from '@/components/collections/ChequeStatusBadge'
import {
  useBounceCheque,
  useCheques,
  useClearCheque,
  useDepositCheque,
  useWriteOffCheque,
} from '@/hooks/useCollections'
import { salesService } from '@/services/api/salesService'
import { formatDate, formatDateTime } from '@/utils'
import { Blank, Busy, PageTitle, Problem, inputStyle, isPostDated, money } from './collectionsUi'

const STATUSES = ['All', 'Received', 'Deposited', 'Cleared', 'Bounced']

export default function ChequesPage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [modal, setModal] = useState(null)
  const [reason, setReason] = useState('')
  const [bounceCharge, setBounceCharge] = useState('')
  const cheques = useCheques({ status: status || undefined, page: 1, pageSize: 100 })
  const customers = useQuery({
    queryKey: ['sales', 'customers', 'cheques'],
    queryFn: () => salesService.listAllCustomers({ pageSize: 100 }),
    staleTime: 60_000,
  })
  const customerById = useMemo(
    () => Object.fromEntries((customers.data || []).map((customer) => [customer.id, customer])),
    [customers.data]
  )
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (cheques.data || []).filter(
      (cheque) =>
        !term ||
        `${cheque.chequeNumber} ${cheque.bankName} ${customerById[cheque.customerId]?.name || ''}`
          .toLowerCase()
          .includes(term)
    )
  }, [cheques.data, customerById, search])
  const selected = rows.find((row) => row.id === selectedId) || rows[0]
  const deposit = useDepositCheque()
  const clear = useClearCheque()
  const bounce = useBounceCheque()
  const writeOff = useWriteOffCheque()
  useEffect(() => {
    if (selectedId && !rows.some((row) => row.id === selectedId)) setSelectedId('')
  }, [rows, selectedId])

  async function submitModal(event) {
    event.preventDefault()
    if (modal === 'bounce')
      await bounce.mutateAsync({
        id: selected.id,
        data: { reason, bounceCharge: Number(bounceCharge || 0) },
      })
    if (modal === 'writeoff') await writeOff.mutateAsync({ id: selected.id, data: { reason } })
    setModal(null)
    setReason('')
    setBounceCharge('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Cheques"
        subtitle="Track every cheque through receipt, deposit, clearance, bounce, and permanent write-off."
      />
      <section
        className="panel"
        style={{ padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}
      >
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: 12, top: 11, color: 'var(--color-text-dim)' }}
          />
          <input
            className="form-input"
            style={{ ...inputStyle, paddingLeft: 36 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search cheque, bank, or customer"
          />
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {STATUSES.map((item) => (
            <button
              type="button"
              key={item}
              className={
                (item === 'All' ? !status : status === item) ? 'button-primary' : 'button-ghost'
              }
              onClick={() => setStatus(item === 'All' ? '' : item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      {cheques.isLoading ? (
        <Busy label="Loading cheques..." />
      ) : cheques.isError ? (
        <Problem error={cheques.error} />
      ) : (
        <div
          className="responsive-master-detail"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(330px, 400px) minmax(0, 1fr)',
            minHeight: 560,
            border: '1px solid var(--color-border)',
            borderRadius: 9,
            overflow: 'hidden',
          }}
        >
          <aside
            style={{
              borderRight: '1px solid var(--color-border)',
              background: 'var(--color-bg-surface)',
            }}
          >
            <div
              style={{
                padding: 12,
                borderBottom: '1px solid var(--color-border)',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {rows.length} cheques
            </div>
            <div style={{ maxHeight: 650, overflowY: 'auto' }}>
              {rows.length ? (
                rows.map((cheque) => {
                  const postDated = isPostDated(cheque.chequeDate)
                  return (
                    <button
                      type="button"
                      key={cheque.id}
                      onClick={() => setSelectedId(cheque.id)}
                      style={{
                        width: '100%',
                        padding: 13,
                        textAlign: 'left',
                        borderBottom: '1px solid var(--color-border)',
                        borderLeft:
                          cheque.id === selected?.id
                            ? '2px solid var(--color-amber)'
                            : '2px solid transparent',
                        background:
                          cheque.id === selected?.id
                            ? 'color-mix(in srgb, var(--color-amber) 7%, transparent)'
                            : 'transparent',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span
                          className="mono"
                          style={{ color: 'var(--color-amber)', fontWeight: 750 }}
                        >
                          #{cheque.chequeNumber}
                        </span>
                        <ChequeStatusBadge status={cheque.status} />
                      </div>
                      <div style={{ marginTop: 7, fontSize: 13, fontWeight: 650 }}>
                        {customerById[cheque.customerId]?.name || cheque.customerId}
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                          fontSize: 11,
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <span>{cheque.bankName || 'Bank not recorded'}</span>
                        <span className="mono" style={{ color: 'var(--color-text-primary)' }}>
                          {money(cheque.amount)}
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          display: 'flex',
                          gap: 7,
                          alignItems: 'center',
                          fontSize: 10,
                          color: 'var(--color-text-dim)',
                        }}
                      >
                        <span>{formatDate(cheque.chequeDate)}</span>
                        {postDated ? (
                          <span style={{ color: 'var(--color-amber)' }}>POST-DATED</span>
                        ) : null}
                        {cheque.bounceCount > 0 ? (
                          <span style={{ color: 'var(--color-danger)' }}>
                            Bounced {cheque.bounceCount}×
                          </span>
                        ) : null}
                      </div>
                    </button>
                  )
                })
              ) : (
                <Blank>No cheques match this filter.</Blank>
              )}
            </div>
          </aside>
          <main style={{ padding: 20, minWidth: 0, background: 'var(--color-bg-base)' }}>
            {selected ? (
              <ChequeDetail
                cheque={selected}
                customer={customerById[selected.customerId]}
                deposit={deposit}
                clear={clear}
                setModal={setModal}
              />
            ) : (
              <Blank>Select a cheque to view its lifecycle.</Blank>
            )}
          </main>
        </div>
      )}
      <Modal
        open={Boolean(modal)}
        onOpenChange={(open) => {
          if (!open) {
            setModal(null)
            setReason('')
            setBounceCharge('')
          }
        }}
        title={modal === 'bounce' ? 'Mark cheque as bounced' : 'Write off cheque permanently'}
        description={
          modal === 'bounce'
            ? 'This reverses the covered invoice payments; the cheque may be deposited again.'
            : 'This is permanent. The cheque cannot be re-deposited and the covered invoices remain unpaid.'
        }
        footer={
          <>
            <button type="button" className="button-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              form="cheque-action"
              className="button-danger"
              disabled={!reason || bounce.isPending || writeOff.isPending}
            >
              {modal === 'bounce' ? 'Confirm bounce' : 'Write off permanently'}
            </button>
          </>
        }
      >
        <form id="cheque-action" onSubmit={submitModal} style={{ display: 'grid', gap: 12 }}>
          {modal === 'writeoff' ? (
            <div
              style={{
                padding: 11,
                display: 'flex',
                gap: 8,
                border: '1px solid var(--color-danger)',
                borderRadius: 7,
                color: 'var(--color-danger)',
                fontSize: 12,
              }}
            >
              <AlertTriangle size={16} /> This action permanently disables deposit for this cheque.
            </div>
          ) : null}
          <label>
            <span className="form-label">
              {modal === 'bounce' ? 'Bounce reason' : 'Write-off reason'} *
            </span>
            <textarea
              required
              className="form-input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {modal === 'bounce' ? (
            <label>
              <span className="form-label">Bounce charge</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input mono"
                style={inputStyle}
                value={bounceCharge}
                onChange={(event) => setBounceCharge(event.target.value)}
              />
            </label>
          ) : null}
        </form>
      </Modal>
    </div>
  )
}

function ChequeDetail({ cheque, customer, deposit, clear, setModal }) {
  const postDated = isPostDated(cheque.chequeDate)
  const canDeposit =
    ['Received', 'Bounced'].includes(cheque.status) && !cheque.isPermanentlyBounced && !postDated
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <FileCheck2 size={19} color="var(--color-amber)" />
            <h2 className="mono" style={{ fontSize: 20, fontWeight: 850 }}>
              #{cheque.chequeNumber}
            </h2>
            <ChequeStatusBadge status={cheque.status} />
          </div>
          <p style={{ marginTop: 6, color: 'var(--color-text-muted)', fontSize: 12 }}>
            {cheque.bankName}
            {cheque.branchName ? ` · ${cheque.branchName}` : ''}
          </p>
        </div>
        <div
          className="mono"
          style={{ fontSize: 23, fontWeight: 850, color: 'var(--color-amber)' }}
        >
          {money(cheque.amount)}
        </div>
      </div>
      {cheque.isPermanentlyBounced ? (
        <div
          style={{
            marginTop: 14,
            padding: 10,
            display: 'flex',
            gap: 7,
            border: '1px solid var(--color-danger)',
            borderRadius: 7,
            color: 'var(--color-danger)',
            fontSize: 12,
          }}
        >
          <Ban size={15} /> Permanently bounced — deposit is disabled.
        </div>
      ) : null}
      {postDated ? (
        <div
          style={{
            marginTop: 14,
            padding: 10,
            display: 'flex',
            gap: 7,
            border: '1px solid var(--color-amber)',
            borderRadius: 7,
            color: 'var(--color-amber)',
            fontSize: 12,
          }}
        >
          <AlertTriangle size={15} /> Post-dated until {formatDate(cheque.chequeDate)} — deposit is
          disabled.
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2" style={{ marginTop: 18 }}>
        {[
          ['Customer', customer?.name || cheque.customerId],
          ['Drawer', cheque.drawerName],
          ['Cheque date', formatDate(cheque.chequeDate)],
          ['Received', formatDateTime(cheque.receivedAt)],
          ['Bounce count', cheque.bounceCount ? `${cheque.bounceCount} time(s)` : '—'],
          ['Bounce charges', cheque.bounceChargeAmount ? money(cheque.bounceChargeAmount) : '—'],
          ['Last bounce reason', cheque.bounceReason || '—'],
          ['Deposited', cheque.depositedAt ? formatDateTime(cheque.depositedAt) : '—'],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 7 }}
          >
            <div className="form-label">{label}</div>
            <div style={{ marginTop: 5, fontSize: 13 }}>{value}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 18,
          paddingTop: 18,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        {canDeposit ? (
          <button
            className="button-primary"
            onClick={() => deposit.mutate(cheque.id)}
            disabled={deposit.isPending}
          >
            <Landmark size={14} /> Send for deposit
          </button>
        ) : null}
        {cheque.status === 'Deposited' ? (
          <>
            <button
              className="button-primary"
              onClick={() => clear.mutate({ id: cheque.id })}
              disabled={clear.isPending}
            >
              <CheckCircle2 size={14} /> Mark cleared
            </button>
            <button className="button-danger" onClick={() => setModal('bounce')}>
              <AlertTriangle size={14} /> Mark bounced
            </button>
          </>
        ) : null}
        {cheque.status === 'Bounced' && !cheque.isPermanentlyBounced ? (
          <button className="button-danger" onClick={() => setModal('writeoff')}>
            <Ban size={14} /> Write off permanently
          </button>
        ) : null}
      </div>
    </>
  )
}
