import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Lock,
  Search,
  Scale,
  Store,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ConfirmDialog from '@components/ui/ConfirmDialog'
import StatusBadge from '@components/ui/StatusBadge'
import ChequeStatusBadge from '@/components/collections/ChequeStatusBadge'
import {
  useCloseSession,
  useCollectionSession,
  useOutstandingInvoices,
  useRecordCash,
  useRecordCheque,
  useVerifySession,
} from '@/hooks/useCollections'
import { salesService } from '@/services/api/salesService'
import { formatDate, formatDateTime } from '@/utils'
import {
  Blank,
  Busy,
  Metric,
  PageTitle,
  Problem,
  colomboToday,
  inputStyle,
  isPostDated,
  money,
} from './collectionsUi'

const DENOMINATIONS = [5000, 2000, 1000, 500, 100, 50, 20, 10, 1]
const emptyCash = { customerId: '', invoiceId: '', amount: '', notes: '', denominations: {} }
const emptyCheque = {
  customerId: '',
  invoiceId: '',
  amount: '',
  chequeNumber: '',
  bankName: '',
  branchName: '',
  drawerName: '',
  chequeDate: colomboToday(),
  notes: '',
}

function CustomerPicker({ customers, value, onChange, isLoading, error }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = customers.find((customer) => customer.id === value)
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return customers
    return customers.filter((customer) =>
      `${customer.code} ${customer.name}`.toLowerCase().includes(term)
    )
  }, [customers, query])

  function selectCustomer(customerId) {
    onChange(customerId)
    setOpen(false)
    setQuery('')
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={isLoading || Boolean(error)}
        style={{
          width: '100%',
          minHeight: 40,
          padding: '0 11px',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          borderRadius: 'var(--radius-input)',
          border: `1px solid ${open ? 'var(--color-amber)' : 'var(--color-border)'}`,
          background: 'var(--color-bg-base)',
          color: selected ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          boxShadow: open
            ? '0 0 0 3px color-mix(in srgb, var(--color-amber) 15%, transparent)'
            : 'none',
          cursor: isLoading || error ? 'not-allowed' : 'pointer',
        }}
      >
        <Store size={15} color={selected ? 'var(--color-amber)' : 'var(--color-text-dim)'} />
        <span
          style={{
            minWidth: 0,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'left',
            fontSize: 13,
          }}
        >
          {isLoading
            ? 'Loading route customers...'
            : error
              ? 'Unable to load route customers'
              : selected
                ? `${selected.code ? `${selected.code} · ` : ''}${selected.name}`
                : 'Select a customer on this route'}
        </span>
        <ChevronDown
          size={15}
          style={{
            flex: '0 0 auto',
            color: 'var(--color-text-dim)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms ease',
          }}
        />
      </button>

      {open ? (
        <div
          style={{
            position: 'absolute',
            zIndex: 30,
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            padding: 7,
            borderRadius: 9,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            boxShadow: 'var(--shadow-modal)',
          }}
        >
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-dim)',
              }}
            />
            <input
              autoFocus
              className="form-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customer name or code"
              style={{ height: 36, paddingLeft: 33, background: 'var(--color-bg-base)' }}
            />
          </div>
          <div style={{ maxHeight: 230, marginTop: 6, overflowY: 'auto' }}>
            {filtered.length ? (
              filtered.map((customer) => {
                const isSelected = customer.id === value
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => selectCustomer(customer.id)}
                    style={{
                      width: '100%',
                      minHeight: 43,
                      padding: '7px 9px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      border: 0,
                      borderRadius: 7,
                      textAlign: 'left',
                      background: isSelected
                        ? 'color-mix(in srgb, var(--color-amber) 10%, transparent)'
                        : 'transparent',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 29,
                        height: 29,
                        display: 'grid',
                        placeItems: 'center',
                        flex: '0 0 auto',
                        borderRadius: 7,
                        color: isSelected ? 'var(--color-amber)' : 'var(--color-text-muted)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-surface)',
                      }}
                    >
                      <Store size={13} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {customer.name}
                      </div>
                      <div
                        className="mono"
                        style={{ marginTop: 2, fontSize: 10, color: 'var(--color-text-dim)' }}
                      >
                        {customer.code || customer.id}
                      </div>
                    </div>
                    {isSelected ? <Check size={15} color="var(--color-amber)" /> : null}
                  </button>
                )
              })
            ) : (
              <div
                style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: 12,
                }}
              >
                {query ? 'No customers match your search.' : 'No active customers on this route.'}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function CollectionSessionDetailPage() {
  const { id } = useParams()
  const session = useCollectionSession(id)
  const routeId = session.data?.routeId
  const customers = useQuery({
    queryKey: ['sales', 'customers', 'collections', routeId],
    queryFn: () =>
      salesService.listAllCustomers({ salesRouteId: routeId, isActive: true, pageSize: 100 }),
    enabled: Boolean(routeId),
    staleTime: 60_000,
  })
  const [tab, setTab] = useState('cash')
  const [cash, setCash] = useState(emptyCash)
  const [cheque, setCheque] = useState(emptyCheque)
  const [creditCustomerId, setCreditCustomerId] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const recordCash = useRecordCash(id)
  const recordCheque = useRecordCheque(id)
  const close = useCloseSession()
  const verify = useVerifySession()
  const selectedCustomerId =
    tab === 'cash' ? cash.customerId : tab === 'cheque' ? cheque.customerId : creditCustomerId
  const outstanding = useOutstandingInvoices(selectedCustomerId)
  const customerById = useMemo(
    () => Object.fromEntries((customers.data || []).map((customer) => [customer.id, customer])),
    [customers.data]
  )
  const data = session.data
  const denominationTotal = DENOMINATIONS.reduce(
    (total, value) => total + value * Number(cash.denominations[value] || 0),
    0
  )
  const isOpen = data?.status === 'Open'

  async function submitCash(event) {
    event.preventDefault()
    const amount = denominationTotal || Number(cash.amount)
    await recordCash.mutateAsync({
      customerId: cash.customerId,
      invoiceId: cash.invoiceId || null,
      amount,
      notes: cash.notes || null,
      denominations: DENOMINATIONS.filter((value) => Number(cash.denominations[value]) > 0).map(
        (denomination) => ({ denomination, count: Number(cash.denominations[denomination]) })
      ),
    })
    setCash(emptyCash)
  }
  async function submitCheque(event) {
    event.preventDefault()
    await recordCheque.mutateAsync({
      ...cheque,
      invoiceId: cheque.invoiceId || null,
      branchName: cheque.branchName || null,
      notes: cheque.notes || null,
      amount: Number(cheque.amount),
      chequeDate: new Date(`${cheque.chequeDate}T00:00:00+05:30`).toISOString(),
    })
    setCheque(emptyCheque)
  }

  if (session.isLoading) return <Busy label="Loading collection session..." />
  if (session.isError) return <Problem error={session.error} />
  if (!data) return <Blank>Collection session was not found.</Blank>
  const invoices = outstanding.data || []
  const commonCustomer = (value, onChange) => (
    <CustomerPicker
      customers={customers.data || []}
      value={value}
      onChange={(customerId) => onChange({ target: { value: customerId } })}
      isLoading={customers.isLoading}
      error={customers.error}
    />
  )
  const invoiceSelect = (value, onChange) => (
    <select
      className="form-input"
      style={inputStyle}
      value={value}
      onChange={onChange}
      disabled={!selectedCustomerId}
    >
      <option value="">Unallocated / no invoice</option>
      {invoices.map((invoice) => (
        <option key={invoice.invoiceId || invoice.id} value={invoice.invoiceId || invoice.id}>
          {invoice.invoiceNumber || invoice.invoiceId || invoice.id} —{' '}
          {money(invoice.outstandingAmount ?? invoice.balanceAmount ?? invoice.totalAmount)}
        </option>
      ))}
    </select>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Link
        to="/collections/sessions"
        style={{
          display: 'inline-flex',
          gap: 6,
          alignItems: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 12,
        }}
      >
        <ArrowLeft size={14} /> Collection sessions
      </Link>
      <PageTitle
        title={data.sessionNumber}
        subtitle={`${formatDate(data.sessionDate)} · Route ${data.routeId}`}
        actions={
          <>
            <StatusBadge status={data.status} />
            <Link className="button-secondary" to={`/collections/sessions/${id}/reconciliation`}>
              <Scale size={14} /> Reconciliation
            </Link>
            {isOpen ? (
              <ConfirmDialog
                title="Close this session?"
                description="No further collections can be entered after closing."
                details={
                  <textarea
                    className="form-input"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Optional closure notes"
                  />
                }
                confirmLabel="Close session"
                onConfirm={() => close.mutateAsync({ id, notes: closeNotes })}
                trigger={
                  <button className="button-danger">
                    <Lock size={14} /> Close session
                  </button>
                }
              />
            ) : data.status === 'Closed' ? (
              <ConfirmDialog
                title="Verify this session?"
                description="This will finalize the session. Verify the totals before continuing."
                confirmLabel="Verify session"
                tone="warning"
                onConfirm={() => verify.mutateAsync(id)}
                trigger={
                  <button className="button-primary">
                    <CheckCircle2 size={14} /> Verify session
                  </button>
                }
              />
            ) : null}
          </>
        }
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Metric label="Cash" value={money(data.totalCash)} tone="var(--color-teal)" />
        <Metric label="Cheques" value={money(data.totalCheques)} tone="var(--color-blue)" />
        <Metric label="Total" value={money(data.totalAmount)} tone="var(--color-amber)" />
        <Metric
          label="Entries"
          value={data.collectionCount}
          helper={data.closedOn ? `Closed ${formatDateTime(data.closedOn)}` : 'Session is active'}
        />
      </div>
      <div
        className="responsive-master-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(300px, .65fr)',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <section className="panel" style={{ padding: 16 }}>
          <div
            style={{
              display: 'flex',
              gap: 6,
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: 12,
            }}
          >
            {[
              ['cash', 'Cash', Banknote],
              ['cheque', 'Cheque', FileCheck2],
              ['credit', 'Credit', Scale],
            ].map(([key, label, Icon]) => (
              <button
                key={key}
                className={tab === key ? 'button-primary' : 'button-ghost'}
                onClick={() => setTab(key)}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          {!isOpen && tab !== 'credit' ? (
            <div
              style={{
                padding: 18,
                marginTop: 14,
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                color: 'var(--color-text-muted)',
              }}
            >
              This session is {data.status.toLowerCase()}; collection entry is disabled.
            </div>
          ) : null}
          {tab === 'cash' && isOpen ? (
            <form onSubmit={submitCash} style={{ display: 'grid', gap: 12, marginTop: 14 }}>
              <label>
                <span className="form-label">Customer</span>
                {commonCustomer(cash.customerId, (e) =>
                  setCash({ ...cash, customerId: e.target.value, invoiceId: '' })
                )}
              </label>
              <label>
                <span className="form-label">Invoice (optional)</span>
                {invoiceSelect(cash.invoiceId, (e) =>
                  setCash({ ...cash, invoiceId: e.target.value })
                )}
              </label>
              <div>
                <span className="form-label">Cash denominations</span>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3" style={{ marginTop: 6 }}>
                  {DENOMINATIONS.map((value) => (
                    <label
                      key={value}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 70px',
                        gap: 6,
                        alignItems: 'center',
                        padding: 8,
                        border: '1px solid var(--color-border)',
                        borderRadius: 7,
                      }}
                    >
                      <span className="mono">{money(value)}</span>
                      <input
                        min="0"
                        type="number"
                        className="form-input mono"
                        value={cash.denominations[value] || ''}
                        onChange={(e) =>
                          setCash({
                            ...cash,
                            denominations: { ...cash.denominations, [value]: e.target.value },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
              <label>
                <span className="form-label">Amount (when denominations are not used)</span>
                <input
                  min="0.01"
                  step="0.01"
                  type="number"
                  className="form-input mono"
                  style={inputStyle}
                  value={cash.amount}
                  onChange={(e) => setCash({ ...cash, amount: e.target.value })}
                />
              </label>
              <label>
                <span className="form-label">Notes</span>
                <textarea
                  className="form-input"
                  value={cash.notes}
                  onChange={(e) => setCash({ ...cash, notes: e.target.value })}
                />
              </label>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <strong className="mono">Counted: {money(denominationTotal)}</strong>
                <button
                  className="button-primary"
                  disabled={
                    recordCash.isPending ||
                    !cash.customerId ||
                    (!denominationTotal && !Number(cash.amount))
                  }
                >
                  {recordCash.isPending ? 'Recording...' : 'Record cash'}
                </button>
              </div>
            </form>
          ) : null}
          {tab === 'cheque' && isOpen ? (
            <form
              onSubmit={submitCheque}
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
              style={{ marginTop: 14 }}
            >
              <label>
                <span className="form-label">Customer</span>
                {commonCustomer(cheque.customerId, (e) =>
                  setCheque({ ...cheque, customerId: e.target.value, invoiceId: '' })
                )}
              </label>
              <label>
                <span className="form-label">Invoice (optional)</span>
                {invoiceSelect(cheque.invoiceId, (e) =>
                  setCheque({ ...cheque, invoiceId: e.target.value })
                )}
              </label>
              {[
                ['chequeNumber', 'Cheque number'],
                ['bankName', 'Bank'],
                ['branchName', 'Branch (optional)'],
                ['drawerName', 'Drawer name'],
              ].map(([key, label]) => (
                <label key={key}>
                  <span className="form-label">{label}</span>
                  <input
                    required={key !== 'branchName'}
                    className={`form-input ${key === 'chequeNumber' ? 'mono' : ''}`}
                    style={inputStyle}
                    value={cheque[key]}
                    onChange={(e) => setCheque({ ...cheque, [key]: e.target.value })}
                  />
                </label>
              ))}
              <label>
                <span className="form-label">Amount</span>
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  className="form-input mono"
                  style={inputStyle}
                  value={cheque.amount}
                  onChange={(e) => setCheque({ ...cheque, amount: e.target.value })}
                />
              </label>
              <label>
                <span className="form-label">Cheque date</span>
                <input
                  required
                  type="date"
                  className="form-input mono"
                  style={inputStyle}
                  value={cheque.chequeDate}
                  onChange={(e) => setCheque({ ...cheque, chequeDate: e.target.value })}
                />
                {isPostDated(cheque.chequeDate) ? (
                  <span
                    style={{
                      display: 'flex',
                      gap: 5,
                      marginTop: 5,
                      color: 'var(--color-amber)',
                      fontSize: 11,
                    }}
                  >
                    <AlertTriangle size={13} /> Post-dated cheque
                  </span>
                ) : null}
              </label>
              <label className="md:col-span-2">
                <span className="form-label">Notes</span>
                <textarea
                  className="form-input"
                  value={cheque.notes}
                  onChange={(e) => setCheque({ ...cheque, notes: e.target.value })}
                />
              </label>
              <div className="md:col-span-2" style={{ textAlign: 'right' }}>
                <button
                  className="button-primary"
                  disabled={recordCheque.isPending || !cheque.customerId}
                >
                  {recordCheque.isPending ? 'Recording...' : 'Record cheque'}
                </button>
              </div>
            </form>
          ) : null}
          {tab === 'credit' ? (
            <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
              <label>
                <span className="form-label">Customer</span>
                {commonCustomer(creditCustomerId, (e) => setCreditCustomerId(e.target.value))}
              </label>
              {!creditCustomerId ? (
                <Blank>Select a customer to review outstanding credit.</Blank>
              ) : outstanding.isLoading ? (
                <Busy />
              ) : invoices.length ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Due date</th>
                        <th style={{ textAlign: 'right' }}>Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.invoiceId || invoice.id}>
                          <td className="mono">
                            {invoice.invoiceNumber || invoice.invoiceId || invoice.id}
                          </td>
                          <td>{formatDate(invoice.dueDate)}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>
                            {money(
                              invoice.outstandingAmount ??
                                invoice.balanceAmount ??
                                invoice.totalAmount
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Blank>No outstanding invoices for this customer.</Blank>
              )}
            </div>
          ) : null}
        </section>
        <section className="panel" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800 }}>Collection entries</h2>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {data.collections?.length ? (
              data.collections.map((entry) => (
                <article
                  key={entry.id}
                  style={{ padding: 11, border: '1px solid var(--color-border)', borderRadius: 8 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong>{customerById[entry.customerId]?.name || entry.customerId}</strong>
                    <span className="mono" style={{ color: 'var(--color-amber)' }}>
                      {money(entry.amount)}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--color-text-dim)',
                    }}
                  >
                    <span>{entry.method}</span>
                    <span>{formatDateTime(entry.collectedOn)}</span>
                  </div>
                  {entry.chequeId ? (
                    <div style={{ marginTop: 6 }}>
                      <ChequeStatusBadge status="Received" />
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <Blank>No collections have been recorded.</Blank>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
