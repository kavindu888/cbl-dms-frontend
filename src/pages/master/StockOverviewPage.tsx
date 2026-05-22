import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Package, Pencil, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import StatusBadge from '@components/ui/StatusBadge'

// ── Types & Mocks ────────────────────────────────────────────────────────

type UomConversion = {
  fromUom: string
  toUom: string
  factor: number
}

type Product = {
  id: string
  sku: string
  barcode: string
  name: string
  description: string
  category: {
    id: string
    name: string
  }
  brand: string
  uomBase: string
  unitCost: number
  unitPrice: number
  vatRate: number
  isActive: boolean
  uomConversions: UomConversion[]
}

const AVAILABLE_CATEGORIES = [
  { id: 'cat_001', name: 'Cakes' },
  { id: 'cat_002', name: 'Biscuits' },
  { id: 'cat_003', name: 'Wafers' },
  { id: 'cat_004', name: 'Chocolate' },
  { id: 'cat_005', name: 'Flour' },
  { id: 'cat_006', name: 'Snacks' },
  { id: 'cat_007', name: 'Crackers' },
]

const AVAILABLE_BRANDS = ['Munchee', 'Ritzbury', 'Tiara', 'Samaposha', 'Lanka Soy']

const initialProducts: Product[] = [
  {
    id: 'prod_01',
    sku: 'CBL-MCK-001',
    barcode: '4891234567890',
    name: 'CBL Munchee Coconut Crunch 200g',
    description: 'Coconut-flavoured biscuit pack',
    category: { id: 'cat_002', name: 'Biscuits' },
    brand: 'Munchee',
    uomBase: 'Packet',
    unitCost: 85.50,
    unitPrice: 110.00,
    vatRate: 8.00,
    isActive: true,
    uomConversions: [{ fromUom: 'Case', toUom: 'Packet', factor: 24 }],
  },
  {
    id: 'prod_02',
    sku: 'CBL-TBC-001',
    barcode: '4891234567891',
    name: 'CBL Tiara Butter Cake 400g',
    description: 'Butter cake with a soft crumb texture',
    category: { id: 'cat_001', name: 'Cakes' },
    brand: 'Tiara',
    uomBase: 'Packet',
    unitCost: 250.00,
    unitPrice: 300.00,
    vatRate: 8.00,
    isActive: true,
    uomConversions: [{ fromUom: 'Case', toUom: 'Packet', factor: 12 }],
  },
  {
    id: 'prod_03',
    sku: 'CBL-RZB-100',
    barcode: '4891234567892',
    name: 'CBL Ritzbury Dark 50g',
    description: 'Dark chocolate bar',
    category: { id: 'cat_004', name: 'Chocolate' },
    brand: 'Ritzbury',
    uomBase: 'Packet',
    unitCost: 160.00,
    unitPrice: 200.00,
    vatRate: 15.00,
    isActive: false,
    uomConversions: [{ fromUom: 'Case', toUom: 'Packet', factor: 24 }],
  },
]

// ── Schema ───────────────────────────────────────────────────────────────

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().min(1, 'Barcode is required'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  brand: z.string().min(1, 'Brand is required'),
  uomBase: z.string().min(1, 'Base UOM is required'),
  unitCost: z.coerce.number().min(0, 'Unit cost must be non-negative'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be non-negative'),
  vatRate: z.coerce.number().min(0, 'VAT rate must be non-negative'),
  isActive: z.boolean().default(true),
  fromUom: z.string().min(1, 'From UOM is required'),
  toUom: z.string().min(1, 'To UOM is required'),
  factor: z.coerce.number().min(1, 'Conversion factor must be at least 1'),
})

type ProductFormValues = z.infer<typeof productSchema>

// ── Form Modal Component ──────────────────────────────────────────────────

function ProductFormModal({
  open,
  product,
  onClose,
  onSaved,
}: {
  open: boolean
  product?: Product
  onClose: () => void
  onSaved: (p: Product) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      barcode: '',
      name: '',
      description: '',
      categoryId: '',
      brand: '',
      uomBase: 'Packet',
      unitCost: 0,
      unitPrice: 0,
      vatRate: 8,
      isActive: true,
      fromUom: 'Case',
      toUom: 'Packet',
      factor: 24,
    },
  })

  useEffect(() => {
    if (open) {
      if (product) {
        const primaryConversion = product.uomConversions?.[0] || { fromUom: 'Case', toUom: 'Packet', factor: 24 }
        reset({
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          description: product.description,
          categoryId: product.category.id,
          brand: product.brand,
          uomBase: product.uomBase,
          unitCost: product.unitCost,
          unitPrice: product.unitPrice,
          vatRate: product.vatRate,
          isActive: product.isActive,
          fromUom: primaryConversion.fromUom,
          toUom: primaryConversion.toUom,
          factor: primaryConversion.factor,
        })
      } else {
        reset({
          sku: '',
          barcode: '',
          name: '',
          description: '',
          categoryId: '',
          brand: '',
          uomBase: 'Packet',
          unitCost: 0,
          unitPrice: 0,
          vatRate: 8,
          isActive: true,
          fromUom: 'Case',
          toUom: 'Packet',
          factor: 24,
        })
      }
    }
  }, [open, product, reset])

  async function onSubmit(values: ProductFormValues) {
    await new Promise((r) => setTimeout(r, 600))

    const catObj = AVAILABLE_CATEGORIES.find((c) => c.id === values.categoryId) || { id: values.categoryId, name: 'Unknown' }

    const formatted: Product = {
      id: product?.id || `prod_${Date.now()}`,
      sku: values.sku,
      barcode: values.barcode,
      name: values.name,
      description: values.description ?? '',
      category: catObj,
      brand: values.brand,
      uomBase: values.uomBase,
      unitCost: values.unitCost,
      unitPrice: values.unitPrice,
      vatRate: values.vatRate,
      isActive: values.isActive,
      uomConversions: [
        {
          fromUom: values.fromUom,
          toUom: values.toUom,
          factor: values.factor,
        },
      ],
    }

    onSaved(formatted)
    toast.success(`Product ${values.name} saved successfully.`)
    
    if (product) {
      onClose()
    } else {
      reset({
        sku: '',
        barcode: '',
        name: '',
        description: '',
        categoryId: '',
        brand: '',
        uomBase: 'Packet',
        unitCost: 0,
        unitPrice: 0,
        vatRate: 8,
        isActive: true,
        fromUom: 'Case',
        toUom: 'Packet',
        factor: 24,
      })
      setTimeout(() => {
        const skuInput = document.querySelector('input[name="sku"]') as HTMLInputElement
        if (skuInput) {
          skuInput.focus()
        }
      }, 10)
    }
  }

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement
      if (target.tagName === 'BUTTON') {
        return
      }
      
      e.preventDefault()
      const form = e.currentTarget
      const focusable = Array.from(
        form.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), button:not([disabled]):not([data-skip-focus="true"])'
        )
      )
      const index = focusable.indexOf(target)
      if (index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus()
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,4,12,0.75)', backdropFilter: 'blur(2px)' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 shadow-2xl"
          style={{
            maxWidth: 600,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            maxHeight: '92vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ padding: '32px 32px 24px 32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <Dialog.Title style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {product ? 'Edit Product' : 'Create New Product'}
              </Dialog.Title>
              <Dialog.Description style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
                {product ? 'Modify the product catalog configuration details.' : 'Register a new product in the system catalog.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleFormKeyDown} style={{ padding: '0 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* SKU and Barcode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>SKU CODE</label>
                <input
                  {...register('sku')}
                  autoFocus
                  className="form-input w-full"
                  placeholder="e.g. CBL-MCK-001"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
                />
                {errors.sku && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.sku.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>BARCODE</label>
                <input
                  {...register('barcode')}
                  className="form-input w-full"
                  placeholder="e.g. 4891234567890"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
                />
                {errors.barcode && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.barcode.message}</p>}
              </div>
            </div>

            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>PRODUCT NAME</label>
              <input
                {...register('name')}
                className="form-input w-full"
                placeholder="e.g. CBL Munchee Coconut Crunch 200g"
                style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
              />
              {errors.name && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.name.message}</p>}
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>DESCRIPTION</label>
              <textarea
                {...register('description')}
                className="form-input w-full"
                placeholder="e.g. Chocolate chip biscuits"
                style={{ background: 'rgba(0,0,0,0.15)', minHeight: 84, paddingTop: 12, paddingBottom: 12 }}
              />
            </div>

            {/* Category and Brand */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>CATEGORY</label>
                <select
                  {...register('categoryId')}
                  className="form-input w-full"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 44, color: 'var(--color-text-primary)' }}
                >
                  <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>Select Category</option>
                  {AVAILABLE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.categoryId.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>BRAND</label>
                <select
                  {...register('brand')}
                  className="form-input w-full"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 44, color: 'var(--color-text-primary)' }}
                >
                  <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>Select Brand</option>
                  {AVAILABLE_BRANDS.map((b) => (
                    <option key={b} value={b} style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}>
                      {b}
                    </option>
                  ))}
                </select>
                {errors.brand && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.brand.message}</p>}
              </div>
            </div>

            {/* Pricing and VAT */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>UNIT COST (RS.)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('unitCost')}
                  className="form-input w-full mono"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
                />
                {errors.unitCost && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.unitCost.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>UNIT PRICE (RS.)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('unitPrice')}
                  className="form-input w-full mono"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
                />
                {errors.unitPrice && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.unitPrice.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>VAT RATE (%)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('vatRate')}
                  className="form-input w-full mono"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
                />
                {errors.vatRate && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.vatRate.message}</p>}
              </div>
            </div>

            {/* Base UOM & Conversion */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>BASE UOM</label>
                <input
                  {...register('uomBase')}
                  className="form-input w-full"
                  placeholder="e.g. Packet"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
                />
                {errors.uomBase && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.uomBase.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>CONV FROM</label>
                <input
                  {...register('fromUom')}
                  className="form-input w-full"
                  placeholder="e.g. Case"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
                />
                {errors.fromUom && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.fromUom.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>CONV TO</label>
                <input
                  {...register('toUom')}
                  className="form-input w-full"
                  placeholder="e.g. Packet"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
                />
                {errors.toUom && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.toUom.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>FACTOR</label>
                <input
                  type="number"
                  {...register('factor')}
                  className="form-input w-full mono"
                  style={{ background: 'rgba(0,0,0,0.15)', height: 44 }}
                />
                {errors.factor && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.factor.message}</p>}
              </div>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                style={{ width: 18, height: 18, accentColor: 'var(--color-amber)' }}
              />
              <label htmlFor="isActive" style={{ fontSize: 14, color: 'var(--color-text-primary)', cursor: 'pointer' }}>Active Catalog Item</label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <Dialog.Close asChild>
                <button type="button" data-skip-focus="true" className="button-ghost" style={{ flex: 1, padding: '10px 0', height: 44 }}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" className="button-primary" style={{ flex: 1, padding: '10px 0', height: 44 }}>
                {product ? 'Update Product' : 'Create Product'}
              </button>
            </div>

          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Main Page Component ──────────────────────────────────────────────────

export default function StockOverviewPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [activeFilter, setActiveFilter] = useState('All') // 'All' | 'Active' | 'Inactive'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined)

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchSearch =
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()) ||
          p.barcode.toLowerCase().includes(search.toLowerCase())
        const matchCat = category === 'All' || p.category.name === category
        const matchActive =
          activeFilter === 'All' ||
          (activeFilter === 'Active' && p.isActive) ||
          (activeFilter === 'Inactive' && !p.isActive)
        return matchSearch && matchCat && matchActive
      }),
    [products, search, category, activeFilter]
  )

  const totalProducts = products.length
  const activeCount = products.filter((p) => p.isActive).length
  const inactiveCount = products.filter((p) => !p.isActive).length
  const totalCategories = AVAILABLE_CATEGORIES.length

  function handleAdd() {
    setEditingProduct(undefined)
    setIsModalOpen(true)
  }

  function handleEdit(p: Product) {
    setEditingProduct(p)
    setIsModalOpen(true)
  }

  function handleSave(p: Product) {
    const isExisting = products.some((item) => item.id === p.id)
    if (isExisting) {
      setProducts(products.map((item) => (item.id === p.id ? p : item)))
    } else {
      setProducts([p, ...products])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
            Products
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage catalog items, barcodes, prices, and unit conversions.
          </p>
        </div>
        <button
          className="button-primary"
          onClick={handleAdd}
          style={{ height: 40, padding: '0 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          New Product
        </button>
      </div>

      <ProductFormModal
        open={isModalOpen}
        product={editingProduct}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSave}
      />

      {/* ── KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'TOTAL PRODUCTS', value: totalProducts.toString(), color: 'var(--color-text-primary)' },
          { label: 'ACTIVE ITEMS', value: activeCount.toString(), color: 'var(--color-amber)' },
          { label: 'INACTIVE ITEMS', value: inactiveCount.toString(), color: 'var(--color-text-muted)' },
          { label: 'TOTAL CATEGORIES', value: totalCategories.toString(), color: 'var(--color-blue)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>{label}</p>
            <p className="mono" style={{ marginTop: 4, fontSize: 24, fontWeight: 600, color }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Filter Bar ── */}
        <div className="panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--color-text-dim)' }}
            />
            <input
              className="form-input"
              placeholder="Search by SKU, Barcode, or Product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', height: 40, paddingLeft: 36, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', fontSize: 14 }}
            />
          </div>
          
          {/* Category Dropdown */}
          <div style={{ position: 'relative', width: 200 }}>
            <select
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', height: 40, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', fontSize: 14, cursor: 'pointer', appearance: 'none', paddingLeft: 12, paddingRight: 36 }}
            >
              <option value="All" style={{ background: 'var(--color-bg-elevated)' }}>All Categories</option>
              {AVAILABLE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.name} style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}>
                  {c.name}
                </option>
              ))}
            </select>
            <div style={{ pointerEvents: 'none', position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }}>
              <svg style={{ width: 14, height: 14, fill: 'currentColor' }} viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Active Status Dropdown */}
          <div style={{ position: 'relative', width: 160 }}>
            <select
              className="form-input"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              style={{ width: '100%', height: 40, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', fontSize: 14, cursor: 'pointer', appearance: 'none', paddingLeft: 12, paddingRight: 36 }}
            >
              <option value="All" style={{ background: 'var(--color-bg-elevated)' }}>All Statuses</option>
              <option value="Active" style={{ background: 'var(--color-bg-elevated)' }}>Active</option>
              <option value="Inactive" style={{ background: 'var(--color-bg-elevated)' }}>Inactive</option>
            </select>
            <div style={{ pointerEvents: 'none', position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }}>
              <svg style={{ width: 14, height: 14, fill: 'currentColor' }} viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="panel overflow-hidden">
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
              <Package style={{ width: 40, height: 40, color: 'var(--color-text-dim)' }} />
              <p style={{ color: 'var(--color-text-muted)' }}>No products match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Base UOM</th>
                    <th style={{ textAlign: 'right' }}>Unit Cost</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>VAT</th>
                    <th>Conversion</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const primaryConversion = p.uomConversions?.[0]
                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="mono text-xs font-medium" style={{ color: 'var(--color-amber)' }}>
                            {p.sku}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {p.name}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                              {p.description}
                            </span>
                            <span className="mono" style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                              Barcode: {p.barcode}
                            </span>
                          </div>
                        </td>
                        <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {p.category.name}
                        </td>
                        <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {p.brand}
                        </td>
                        <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {p.uomBase}
                        </td>
                        <td className="mono text-sm" style={{ textAlign: 'right', color: 'var(--color-text-primary)' }}>
                          Rs. {p.unitCost.toFixed(2)}
                        </td>
                        <td className="mono text-sm" style={{ textAlign: 'right', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                          Rs. {p.unitPrice.toFixed(2)}
                        </td>
                        <td className="mono text-sm" style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                          {p.vatRate.toFixed(2)}%
                        </td>
                        <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {primaryConversion ? (
                            <span>
                              1 {primaryConversion.fromUom} = {primaryConversion.factor} {primaryConversion.toUom}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-dim)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <button
                            className="icon-button"
                            title="Edit product"
                            style={{ width: 28, height: 28 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(p)
                            }}
                          >
                            <Pencil style={{ width: 13, height: 13 }} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
