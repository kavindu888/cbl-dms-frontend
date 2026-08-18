import { ArrowLeft, Banknote, CheckCircle2, FileCheck2, Landmark, Lock, Scale } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ConfirmDialog from '@components/ui/ConfirmDialog'
import StatusBadge from '@components/ui/StatusBadge'
import { BankTransfersTab, CashTab, ChequesTab } from '@/components/collections/PaymentTabs'
import { useCloseSession, useCollectionSession, useVerifySession } from '@/hooks/useCollections'
import { formatDate, formatDateTime } from '@/utils'
import { Blank, Busy, Metric, PageTitle, Problem, money } from './collectionsUi'

const TABS = [
  ['cash', 'Cash', Banknote],
  ['cheques', 'Cheques', FileCheck2],
  ['transfers', 'Bank transfers', Landmark],
]

export default function CollectionSessionDetailPage() {
  const { id } = useParams()
  const [tab, setTab] = useState('cash')
  const [closeNotes, setCloseNotes] = useState('')
  const session = useCollectionSession(id)
  const close = useCloseSession()
  const verify = useVerifySession()

  if (session.isLoading) return <Busy label="Loading collection session..." />
  if (session.isError) return <Problem error={session.error} />
  if (!session.data) return <Blank>Collection session was not found.</Blank>

  const data = session.data
  const isOpen = data.status === 'Open'
  const transferEntries = (data.collections || []).filter(
    (entry) => entry.method === 'BankTransfer'
  )
  const totalTransfers = transferEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)

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
          </>
        }
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Metric label="Cash" value={money(data.totalCash)} tone="var(--color-teal)" />
        <Metric label="Cheques" value={money(data.totalCheques)} tone="var(--color-blue)" />
        <Metric label="Bank transfers" value={money(totalTransfers)} tone="var(--color-purple)" />
        <Metric
          label="Total collected"
          value={money(data.totalAmount)}
          tone="var(--color-amber)"
          helper={`${data.collectionCount} entries`}
        />
      </div>
      <div
        className="responsive-master-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 310px)',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <main style={{ minWidth: 0 }}>
          <div
            className="panel"
            style={{
              marginBottom: 12,
              padding: '0 14px',
              display: 'flex',
              gap: 4,
              overflowX: 'auto',
            }}
          >
            {TABS.map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                style={{
                  padding: '12px 13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  borderBottom:
                    tab === key ? '2px solid var(--color-amber)' : '2px solid transparent',
                  color: tab === key ? 'var(--color-amber)' : 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          {!isOpen ? (
            <div
              className="panel"
              style={{ marginBottom: 12, padding: 13, color: 'var(--color-text-muted)' }}
            >
              This session is {data.status.toLowerCase()}; payment entry is locked.
            </div>
          ) : null}
          {tab === 'cash' ? (
            <CashTab
              sessionId={id}
              routeId={data.routeId}
              disabled={!isOpen}
              onRecorded={session.refetch}
            />
          ) : null}
          {tab === 'cheques' ? (
            <ChequesTab
              sessionId={id}
              routeId={data.routeId}
              disabled={!isOpen}
              onRecorded={session.refetch}
            />
          ) : null}
          {tab === 'transfers' ? (
            <BankTransfersTab
              sessionId={id}
              routeId={data.routeId}
              disabled={!isOpen}
              onRecorded={session.refetch}
            />
          ) : null}
        </main>
        <aside className="panel" style={{ padding: 16, position: 'sticky', top: 12 }}>
          <h2 className="form-label" style={{ margin: 0 }}>
            Session summary
          </h2>
          <div style={{ marginTop: 13, display: 'grid', gap: 10 }}>
            {[
              ['Cash', data.totalCash],
              ['Cheques', data.totalCheques],
              ['Bank transfers', totalTransfers],
            ].map(([label, amount]) => (
              <div
                key={label}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}
              >
                <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                <span className="mono">{money(amount)}</span>
              </div>
            ))}
            <div
              style={{
                paddingTop: 11,
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--color-border)',
                fontWeight: 850,
              }}
            >
              <span>Total</span>
              <span className="mono" style={{ color: 'var(--color-amber)' }}>
                {money(data.totalAmount)}
              </span>
            </div>
          </div>
          <div
            style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}
          >
            {isOpen ? (
              <ConfirmDialog
                title="Close this session?"
                description="No further payments can be recorded after closing."
                details={
                  <textarea
                    className="form-input"
                    value={closeNotes}
                    onChange={(event) => setCloseNotes(event.target.value)}
                    placeholder="Optional closure notes"
                  />
                }
                confirmLabel="Close session"
                onConfirm={() => close.mutateAsync({ id, notes: closeNotes })}
                trigger={
                  <button className="button-danger" style={{ width: '100%' }}>
                    <Lock size={14} /> Close session
                  </button>
                }
              />
            ) : data.status === 'Closed' ? (
              <ConfirmDialog
                title="Verify this session?"
                description="Verify the totals before finalizing this session."
                confirmLabel="Verify session"
                tone="warning"
                onConfirm={() => verify.mutateAsync(id)}
                trigger={
                  <button className="button-primary" style={{ width: '100%' }}>
                    <CheckCircle2 size={14} /> Verify session
                  </button>
                }
              />
            ) : (
              <div style={{ display: 'flex', gap: 7, color: 'var(--color-blue)', fontSize: 12 }}>
                <CheckCircle2 size={15} /> Session verified and locked
              </div>
            )}
          </div>
          {data.closedOn ? (
            <div style={{ marginTop: 12, fontSize: 10, color: 'var(--color-text-dim)' }}>
              Closed {formatDateTime(data.closedOn)}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
