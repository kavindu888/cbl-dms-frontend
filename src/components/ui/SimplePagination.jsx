export default function SimplePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  itemLabel = 'items',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalItems)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingTop: 10,
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
        {firstItem}-{lastItem} of {totalItems} {itemLabel}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="button-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{ height: 30, padding: '0 10px', fontSize: 11 }}
        >
          Previous
        </button>
        <span
          style={{
            minWidth: 68,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--color-text-muted)',
          }}
        >
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="button-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{ height: 30, padding: '0 10px', fontSize: 11 }}
        >
          Next
        </button>
      </div>
    </div>
  )
}
