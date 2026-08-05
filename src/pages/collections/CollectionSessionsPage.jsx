import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  Check,
  ChevronRight,
  LoaderCircle,
  MapPin,
  Plus,
  Route,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '@components/ui/Modal'
import SimplePagination from '@components/ui/SimplePagination'
import StatusBadge from '@components/ui/StatusBadge'
import { useCollectionSessions, useCreateCollectionSession } from '@/hooks/useCollections'
import { masterService } from '@/services/api/masterService'
import { formatDate } from '@/utils'
import {
  Blank,
  Busy,
  Metric,
  PageTitle,
  Problem,
  colomboToday,
  inputStyle,
  money,
} from './collectionsUi'

const PAGE_SIZE = 12

export default function CollectionSessionsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [routeSearch, setRouteSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ routeId: '', sessionDate: colomboToday() })
  const sessions = useCollectionSessions({ status: status || undefined, page: 1, pageSize: 100 })
  const routes = useQuery({
    queryKey: ['master', 'sales-routes', 'collections'],
    queryFn: async () => {
      const territories = (await masterService.listTerritories()).filter(
        (territory) => territory.isActive
      )
      const pages = await Promise.all(
        territories.map((territory) =>
          masterService.listSalesRoutes({ territoryId: territory.id, page: 1, pageSize: 100 })
        )
      )
      const territoryById = Object.fromEntries(
        territories.map((territory) => [territory.id, territory])
      )
      return pages
        .flatMap((result) => result.items || [])
        .filter((route) => route.isActive)
        .map((route) => ({ ...route, territory: territoryById[route.territoryId] }))
    },
    staleTime: 60_000,
  })
  const create = useCreateCollectionSession()
  const routeById = useMemo(
    () => Object.fromEntries((routes.data || []).map((route) => [route.id, route])),
    [routes.data]
  )
  const filteredRoutes = useMemo(() => {
    const query = routeSearch.trim().toLowerCase()
    if (!query) return routes.data || []
    return (routes.data || []).filter((route) =>
      `${route.code} ${route.name} ${route.territory?.name}`.toLowerCase().includes(query)
    )
  }, [routeSearch, routes.data])
  const filtered = useMemo(
    () =>
      (sessions.data || []).filter((row) => {
        const route = routeById[row.routeId]
        const q = search.trim().toLowerCase()
        return (
          !q ||
          row.sessionNumber?.toLowerCase().includes(q) ||
          route?.name?.toLowerCase().includes(q)
        )
      }),
    [routeById, search, sessions.data]
  )
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totals = useMemo(
    () =>
      filtered.reduce(
        (sum, row) => ({
          cash: sum.cash + Number(row.totalCash || 0),
          cheques: sum.cheques + Number(row.totalCheques || 0),
          amount: sum.amount + Number(row.totalAmount || 0),
        }),
        { cash: 0, cheques: 0, amount: 0 }
      ),
    [filtered]
  )
  useEffect(() => setPage(1), [search, status])

  async function submit(event) {
    event.preventDefault()
    const id = await create.mutateAsync(form)
    setOpen(false)
    setRouteSearch('')
    setForm({ routeId: '', sessionDate: colomboToday() })
    if (id) navigate(`/collections/sessions/${id}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Collection Sessions"
        subtitle="Open, review, close, and reconcile daily route collections."
        actions={
          <button className="button-primary" onClick={() => setOpen(true)}>
            <Plus size={15} /> New session
          </button>
        }
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric label="Sessions shown" value={filtered.length} />
        <Metric label="Cash collected" value={money(totals.cash)} tone="var(--color-teal)" />
        <Metric
          label="Total collected"
          value={money(totals.amount)}
          tone="var(--color-amber)"
          helper={`${money(totals.cheques)} in cheques`}
        />
      </div>
      <section className="panel" style={{ overflow: 'hidden' }}>
        <div
          className="responsive-filter-bar"
          style={{
            padding: 12,
            display: 'flex',
            gap: 10,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: 12, top: 11, color: 'var(--color-text-dim)' }}
            />
            <input
              className="form-input"
              style={{ ...inputStyle, paddingLeft: 36 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search session or route"
            />
          </div>
          <select
            className="form-input"
            style={{ ...inputStyle, width: 180 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option>Open</option>
            <option>Closed</option>
            <option>Verified</option>
          </select>
        </div>
        {sessions.isLoading ? (
          <Busy label="Loading collection sessions..." />
        ) : sessions.isError ? (
          <Problem error={sessions.error} />
        ) : paged.length ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table product-table-compact" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Route</th>
                    <th>Sales rep</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Cash</th>
                    <th style={{ textAlign: 'right' }}>Cheques</th>
                    <th style={{ textAlign: 'right' }}>Transfers</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/collections/sessions/${row.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="mono" style={{ color: 'var(--color-amber)', fontWeight: 700 }}>
                        {row.sessionNumber}
                      </td>
                      <td>{routeById[row.routeId]?.name || row.routeId}</td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {row.salesRepId || '—'}
                      </td>
                      <td>
                        <CalendarDays size={13} style={{ display: 'inline', marginRight: 6 }} />
                        {formatDate(row.sessionDate)}
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {money(row.totalCash)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {money(row.totalCheques)}
                      </td>
                      <td
                        className="mono"
                        style={{ textAlign: 'right', color: 'var(--color-text-dim)' }}
                      >
                        —
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                        {money(row.totalAmount)}
                      </td>
                      <td>
                        <ChevronRight size={15} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 12px 10px' }}>
              <SimplePagination
                page={page}
                pageSize={PAGE_SIZE}
                totalItems={filtered.length}
                onPageChange={setPage}
                itemLabel="sessions"
              />
            </div>
          </>
        ) : (
          <Blank>No collection sessions match the current filter.</Blank>
        )}
      </section>
      <Modal
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setRouteSearch('')
        }}
        title="Open collection session"
        description="Start a daily session for a sales route."
        showHeader={false}
        maxWidth="620px"
        contentStyle={{ padding: 0, overflow: 'hidden' }}
      >
        <form id="new-session-form" onSubmit={submit}>
          <SessionModalHeader onClose={() => setOpen(false)} />
          <div style={{ padding: '18px 22px 20px', display: 'grid', gap: 18 }}>
            <RoutePicker
              query={routeSearch}
              onQueryChange={setRouteSearch}
              routesQuery={routes}
              routes={filteredRoutes}
              selectedId={form.routeId}
              onSelect={(routeId) => setForm({ ...form, routeId })}
            />
            <label>
              <span className="form-label">Session date</span>
              <input
                required
                type="date"
                className="form-input mono"
                style={{ ...inputStyle, marginTop: 6 }}
                value={form.sessionDate}
                onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
              />
            </label>
          </div>
          <div
            style={{
              padding: '14px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderTop: '1px solid var(--color-border)',
              background: 'color-mix(in srgb, var(--color-bg-base) 45%, transparent)',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
              {form.routeId ? routeById[form.routeId]?.name : 'Select a route to continue'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="button-secondary" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                className="button-primary"
                disabled={create.isPending || !form.routeId || routes.isLoading}
              >
                {create.isPending ? 'Opening...' : 'Open session'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function SessionModalHeader({ onClose }) {
  return (
    <div
      style={{
        padding: '20px 22px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        borderBottom: '1px solid var(--color-border)',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--color-amber) 7%, var(--color-bg-surface)), var(--color-bg-surface))',
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            display: 'grid',
            placeItems: 'center',
            flex: '0 0 auto',
            borderRadius: 10,
            color: 'var(--color-amber)',
            background: 'color-mix(in srgb, var(--color-amber) 11%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-amber) 24%, var(--color-border))',
          }}
        >
          <Route size={19} />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.25 }}>
            Open collection session
          </h2>
          <p style={{ marginTop: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
            Choose today&apos;s sales route and collection date.
          </p>
        </div>
      </div>
      <button
        type="button"
        className="icon-button"
        aria-label="Close modal"
        onClick={onClose}
        style={{ width: 32, height: 32 }}
      >
        <X size={15} />
      </button>
    </div>
  )
}

function RoutePicker({ query, onQueryChange, routesQuery, routes, selectedId, onSelect }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <span className="form-label" style={{ margin: 0 }}>
          Sales route
        </span>
        <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>
          {routesQuery.isLoading ? 'Loading routes…' : `${routesQuery.data?.length || 0} available`}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-dim)',
          }}
        />
        <input
          className="form-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search route, code, or territory"
          style={{ ...inputStyle, height: 40, paddingLeft: 36 }}
        />
      </div>
      <div
        style={{
          minHeight: 116,
          maxHeight: 210,
          marginTop: 8,
          padding: 6,
          overflowY: 'auto',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          background: 'color-mix(in srgb, var(--color-bg-base) 65%, transparent)',
        }}
      >
        {routesQuery.isLoading ? (
          <RouteMessage>
            <LoaderCircle className="customer-code-status-icon--checking" size={16} />
            Loading sales routes…
          </RouteMessage>
        ) : routesQuery.isError ? (
          <RouteMessage column>
            <span style={{ color: 'var(--color-danger)' }}>
              {routesQuery.error?.message || 'Unable to load sales routes.'}
            </span>
            <button
              type="button"
              className="button-secondary"
              onClick={() => routesQuery.refetch()}
            >
              Try again
            </button>
          </RouteMessage>
        ) : routes.length ? (
          <div style={{ display: 'grid', gap: 5 }}>
            {routes.map((route) => (
              <RouteOption
                key={route.id}
                route={route}
                selected={route.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <RouteMessage>
            {query ? 'No routes match your search.' : 'No active sales routes found.'}
          </RouteMessage>
        )}
      </div>
    </div>
  )
}

function RouteMessage({ children, column = false }) {
  return (
    <div
      style={{
        minHeight: 102,
        display: 'flex',
        flexDirection: column ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 12,
      }}
    >
      {children}
    </div>
  )
}

function RouteOption({ route, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(route.id)}
      style={{
        width: '100%',
        minHeight: 48,
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textAlign: 'left',
        borderRadius: 7,
        border: selected
          ? '1px solid color-mix(in srgb, var(--color-amber) 60%, var(--color-border))'
          : '1px solid transparent',
        background: selected
          ? 'color-mix(in srgb, var(--color-amber) 10%, transparent)'
          : 'transparent',
        color: 'var(--color-text-primary)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          display: 'grid',
          placeItems: 'center',
          flex: '0 0 auto',
          borderRadius: 7,
          color: selected ? 'var(--color-amber)' : 'var(--color-text-muted)',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        <MapPin size={14} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {route.name}
        </div>
        <div
          className="mono"
          style={{ marginTop: 2, fontSize: 10, color: 'var(--color-text-dim)' }}
        >
          {route.code || 'NO CODE'}
          {route.territory?.name ? ` · ${route.territory.name}` : ''}
        </div>
      </div>
      {selected ? <Check size={16} color="var(--color-amber)" /> : null}
    </button>
  )
}
