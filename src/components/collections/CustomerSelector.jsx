import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { salesService } from '@/services/api/salesService'

export default function CustomerSelector({
  value,
  onChange,
  placeholder = 'Search customer by name or code...',
  routeId,
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const term = search.trim()
    if (term.length < 2) {
      setResults([])
      return undefined
    }
    let active = true
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const page = await salesService.listCustomers({
          search: term,
          salesRouteId: routeId || undefined,
          isActive: true,
          page: 1,
          pageSize: 20,
        })
        if (active) setResults(page?.items || [])
      } catch {
        if (active) setResults([])
      } finally {
        if (active) setLoading(false)
      }
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [routeId, search])

  if (value) {
    return (
      <div
        style={{
          minHeight: 42,
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          border: '1px solid color-mix(in srgb, var(--color-amber) 45%, var(--color-border))',
          borderRadius: 8,
          background: 'color-mix(in srgb, var(--color-amber) 7%, transparent)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{value.name}</div>
          <div
            className="mono"
            style={{ marginTop: 2, fontSize: 10, color: 'var(--color-text-dim)' }}
          >
            {value.code || value.id}
          </div>
        </div>
        <button type="button" className="button-ghost" onClick={() => onChange(null)}>
          <X size={13} /> Change
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <Search
        size={15}
        style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-text-dim)' }}
      />
      <input
        className="form-input"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', height: 40, paddingLeft: 36, background: 'var(--color-bg-base)' }}
      />
      {search.trim().length >= 2 ? (
        <div
          style={{
            position: 'absolute',
            zIndex: 30,
            top: 'calc(100% + 5px)',
            width: '100%',
            maxHeight: 230,
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            background: 'var(--color-bg-surface)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {loading ? (
            <div style={{ padding: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Searching customers...
            </div>
          ) : results.length ? (
            results.map((customer) => (
              <button
                type="button"
                key={customer.id}
                onClick={() => {
                  onChange(customer)
                  setSearch('')
                  setResults([])
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  display: 'block',
                  textAlign: 'left',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 650 }}>{customer.name}</div>
                <div
                  className="mono"
                  style={{ marginTop: 2, fontSize: 10, color: 'var(--color-text-dim)' }}
                >
                  {customer.code || customer.id}
                </div>
              </button>
            ))
          ) : (
            <div style={{ padding: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
              No matching customers.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
