import { useQuery } from '@tanstack/react-query'
import { Save, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { masterService } from '@services/api/masterService'

const pageSize = 10

function formatPercent(value) {
  return Number(value || 0).toFixed(2)
}

export default function SkuDiscountList() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [drafts, setDrafts] = useState({})
  const [savingId, setSavingId] = useState('')

  const {
    data: discounts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sku-discounts'],
    queryFn: () => masterService.listProductSkuDiscounts(),
  })

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current }

      discounts.forEach((discount) => {
        if (next[discount.productId]) return
        next[discount.productId] = {
          hasSkuDiscount: discount.hasSkuDiscount,
          maxSkuDiscountPercent: formatPercent(discount.maxSkuDiscountPercent),
        }
      })

      return next
    })
  }, [discounts])

  const filteredDiscounts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return discounts

    return discounts.filter((discount) =>
      [
        discount.sku,
        discount.productName,
        discount.categoryName,
        discount.productId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [discounts, search])

  const totalPages = Math.max(1, Math.ceil(filteredDiscounts.length / pageSize))
  const pagedDiscounts = filteredDiscounts.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function updateDraft(productId, field, value) {
    setDrafts((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        [field]: value,
      },
    }))
  }

  async function saveRow(discount) {
    const draft = drafts[discount.productId]
    if (!draft) return

    const maxSkuDiscountPercent = Number(draft.maxSkuDiscountPercent || 0)
    if (maxSkuDiscountPercent < 0 || maxSkuDiscountPercent > 100) {
      toast.error('Max SKU discount must be between 0 and 100%.')
      return
    }

    setSavingId(discount.productId)
    try {
      await masterService.setProductSkuDiscount(discount.productId, {
        hasSkuDiscount: Boolean(draft.hasSkuDiscount),
        maxSkuDiscountPercent,
      })
      toast.success('SKU discount saved.')
      await refetch()
    } catch (error) {
      toast.error(error?.message || 'Unable to save SKU discount.')
    } finally {
      setSavingId('')
    }
  }

  return (
    <div
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>SKU Discounts</h1>
        <p style={{ color: 'var(--color-text-muted)', margin: '6px 0 0', fontSize: 14 }}>
          Manage which products have SKU-level discount and their max %.
        </p>
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              color: 'var(--color-text-dim)',
            }}
          />
          <input
            className="form-input"
            placeholder="Search SKU discounts..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: '100%', height: 40, paddingLeft: 36 }}
          />
        </div>
      </div>

      <div
        className="panel"
        style={{
          padding: '14px 16px',
          display: 'grid',
          gridTemplateRows: 'minmax(0, 1fr) auto',
          minHeight: 0,
          flex: 1,
        }}
      >
        <div className="overflow-x-auto" style={{ minHeight: 0, overflowY: 'hidden' }}>
          <table className="data-table master-table-compact" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Category</th>
                <th>Has SKU Discount</th>
                <th style={{ textAlign: 'right' }}>Max %</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                    Loading SKU discounts...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-danger">
                    {error?.message || 'Unable to load SKU discounts.'}
                  </td>
                </tr>
              ) : pagedDiscounts.length ? (
                pagedDiscounts.map((discount) => {
                  const draft = drafts[discount.productId] || {
                    hasSkuDiscount: false,
                    maxSkuDiscountPercent: '0.00',
                  }

                  return (
                    <tr key={discount.productId}>
                      <td className="mono text-xs" style={{ color: 'var(--color-amber)' }}>
                        {discount.sku || '-'}
                      </td>
                      <td style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
                        {discount.productName || discount.productId}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>
                        {discount.categoryName || '-'}
                      </td>
                      <td>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={Boolean(draft.hasSkuDiscount)}
                            onChange={(event) =>
                              updateDraft(discount.productId, 'hasSkuDiscount', event.target.checked)
                            }
                          />
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {draft.hasSkuDiscount ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          className="form-input mono"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={draft.maxSkuDiscountPercent}
                          onChange={(event) =>
                            updateDraft(discount.productId, 'maxSkuDiscountPercent', event.target.value)
                          }
                          style={{ width: 92, height: 32, textAlign: 'right', marginLeft: 'auto' }}
                          disabled={!draft.hasSkuDiscount}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => saveRow(discount)}
                          disabled={savingId === discount.productId}
                          style={{ height: 32, padding: '0 12px' }}
                        >
                          <Save style={{ width: 14, height: 14 }} />
                          Save
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                    No SKU discounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--color-border)',
            marginTop: 10,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
            Showing {pagedDiscounts.length} of {filteredDiscounts.length} products
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="button-secondary"
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              style={{ height: 32, padding: '0 12px', fontSize: 12 }}
            >
              Previous
            </button>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="button-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              style={{ height: 32, padding: '0 12px', fontSize: 12 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
