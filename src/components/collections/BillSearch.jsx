import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchOutstandingInvoices } from '@/hooks/useCollections'
import { money } from '@/pages/collections/collectionsUi'

export default function BillSearch({
  value,
  onChange,
  placeholder = 'Search by bill number or customer name...',
}) {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [term])

  const results = useSearchOutstandingInvoices(debounced)

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
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {value.customerName}
            <span style={{ marginLeft: 8, fontWeight: 500, color: 'var(--color-text-muted)' }}>
              {value.routeName ? `· Route: ${value.routeName}` : ''}
            </span>
          </div>
          <div
            className="mono"
            style={{ marginTop: 2, fontSize: 10, color: 'var(--color-text-dim)' }}
          >
            Bill #{value.serialNumber || value.invoiceNumber} · Outstanding{' '}
            {money(value.outstandingAmount)}
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
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', height: 40, paddingLeft: 36, background: 'var(--color-bg-base)' }}
      />
      {term.trim().length >= 2 ? (
        <div
          style={{
            position: 'absolute',
            zIndex: 30,
            top: 'calc(100% + 5px)',
            width: '100%',
            maxHeight: 280,
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            background: 'var(--color-bg-surface)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {results.isLoading ? (
            <div style={{ padding: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Searching bills...
            </div>
          ) : results.isError ? (
            <div style={{ padding: 14, fontSize: 12, color: 'var(--color-danger)' }}>
              {results.error?.message || 'Unable to search bills.'}
            </div>
          ) : results.data?.length ? (
            results.data.map((bill) => (
              <button
                type="button"
                key={bill.invoiceId}
                onClick={() => {
                  onChange(bill)
                  setTerm('')
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  textAlign: 'left',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 650 }}>{bill.customerName}</div>
                  <div
                    className="mono"
                    style={{ marginTop: 2, fontSize: 10, color: 'var(--color-text-dim)' }}
                  >
                    Bill #{bill.serialNumber || bill.invoiceNumber}{' '}
                    {bill.routeName ? `· Route: ${bill.routeName}` : ''}
                  </div>
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-amber)', flex: '0 0 auto' }}
                >
                  {money(bill.outstandingAmount)}
                </div>
              </button>
            ))
          ) : (
            <div style={{ padding: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
              No matching bills.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
