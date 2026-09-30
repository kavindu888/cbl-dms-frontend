import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

function productLabel(product) {
  if (!product) return ''
  return [product.sku, product.name].filter(Boolean).join(' - ') || product.id || ''
}

export default function ProductSearchSelect({
  value,
  onChange,
  onEnter,
  inputRef,
  products,
  disabled = false,
  placeholder = 'Type SKU or product name...',
  emptyLabel = 'No matching active products',
}) {
  const containerRef = useRef(null)
  const selectedProduct = products.find((product) => product.id === value) || null
  const selectedLabel = productLabel(selectedProduct)
  const [query, setQuery] = useState(selectedLabel)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedLabel)
    }
  }, [isOpen, selectedLabel])

  useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  const filteredProducts = useMemo(() => {
    const text = query.trim().toLowerCase()
    const matchedProducts = text
      ? products.filter((product) =>
          [product.sku, product.name, product.barcode, product.category?.name, product.id]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(text)
        )
      : products

    return matchedProducts.slice(0, 50)
  }, [products, query])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query])

  function selectProduct(product) {
    const nextLabel = productLabel(product)
    onChange(product.id)
    setQuery(nextLabel)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <Search
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 11,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 14,
          height: 14,
          color: 'var(--color-text-muted)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <input
        ref={inputRef}
        className="form-input w-full"
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onFocus={(event) => {
          setIsOpen(true)
          event.target.select()
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
          if (value) onChange('')
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            if (isOpen && filteredProducts[highlightedIndex]) {
              const product = filteredProducts[highlightedIndex]
              selectProduct(product)
              onEnter?.(product.id)
            } else if (value) {
              onEnter?.(value)
            }
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            setIsOpen(true)
            setHighlightedIndex((current) =>
              Math.min(current + 1, Math.max(filteredProducts.length - 1, 0))
            )
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setHighlightedIndex((current) => Math.max(current - 1, 0))
          } else if (event.key === 'Escape') {
            setIsOpen(false)
            setQuery(selectedLabel)
          }
        }}
        style={{ height: 38, fontSize: 13, paddingLeft: 32 }}
      />

      {isOpen && !disabled ? (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 80,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 280,
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            background: 'var(--color-bg-surface)',
            boxShadow: '0 16px 34px rgba(0, 0, 0, 0.45)',
          }}
        >
          {filteredProducts.length ? (
            filteredProducts.map((product, index) => {
              const isHighlighted = index === highlightedIndex
              const label = productLabel(product)

              return (
                <button
                  key={product.id}
                  type="button"
                  role="option"
                  aria-selected={product.id === value}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    selectProduct(product)
                  }}
                  style={{
                    display: 'grid',
                    gap: 3,
                    width: '100%',
                    padding: '9px 12px',
                    border: 0,
                    borderBottom: '1px solid var(--color-border)',
                    background: isHighlighted ? 'rgba(125, 224, 232, 0.12)' : 'transparent',
                    color: 'var(--color-text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{label}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {[product.baseUom || product.uomBase, product.category?.name]
                      .filter(Boolean)
                      .join(' • ') || 'Active product'}
                  </span>
                </button>
              )
            })
          ) : (
            <div style={{ padding: 12, color: 'var(--color-text-muted)', fontSize: 12 }}>
              {emptyLabel}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
