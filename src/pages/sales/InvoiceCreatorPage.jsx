import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Calendar, Save, Plus, Trash2, User } from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { mockCustomers } from '@/data/mockCustomers'
import { mockProducts } from '@/data/mockProducts'
import { PaymentType } from '@/types/sales.types'
const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  paymentType: z.nativeEnum(PaymentType),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product is required'),
        quantity: z.coerce.number().min(1, 'Min quantity 1'),
        unitPrice: z.coerce.number().min(0, 'Min price 0'),
        discountPercent: z.coerce.number().min(0).max(100).default(0),
      })
    )
    .min(1, 'At least one line item is required'),
})
export default function InvoiceCreatorPage() {
  const navigate = useNavigate()
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      invoiceDate: dayjs().format('YYYY-MM-DD'),
      dueDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      paymentType: PaymentType.Credit,
      notes: '',
      lines: [{ productId: '', quantity: 1, unitPrice: 0, discountPercent: 0 }],
    },
  })
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })
  const formLines = watch('lines')
  const totals = useMemo(() => {
    let subtotal = 0
    let totalDiscount = 0
    formLines.forEach((line) => {
      const lineGross = (line.quantity || 0) * (line.unitPrice || 0)
      const lineDisc = lineGross * ((line.discountPercent || 0) / 100)
      subtotal += lineGross
      totalDiscount += lineDisc
    })
    return {
      subtotal,
      totalDiscount,
      grandTotal: subtotal - totalDiscount,
    }
  }, [formLines])
  const handleProductSelect = (index, productId) => {
    const product = mockProducts.find((p) => p.id === productId)
    if (product) {
      const unitPrice = product.units ? Math.round(product.stockValue / product.units) : 100
      setValue(`lines.${index}.unitPrice`, unitPrice)
    }
  }
  const onSubmit = async (data) => {
    console.log('Invoice Data:', data)
    toast.success('Invoice created successfully!')
    navigate('/sales/invoices')
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="icon-button" onClick={() => navigate(-1)}>
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Create New Invoice
            </h1>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
              Generate a new sales invoice for a customer.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="button-secondary" type="button" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button className="button-primary" type="button" onClick={handleSubmit(onSubmit)}>
            <Save style={{ width: 16, height: 16 }} />
            Save Invoice
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
      >
        {/* Top Details Panel */}
        <div className="panel" style={{ padding: 24 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 20,
            }}
          >
            Invoice Details
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 24,
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                CUSTOMER
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: 12,
                    width: 16,
                    height: 16,
                    color: 'var(--color-text-dim)',
                  }}
                />
                <select
                  {...register('customerId')}
                  className={`form-input pl-9 ${errors.customerId ? 'error' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="" disabled style={{ background: 'var(--color-bg-elevated)' }}>
                    Select Customer...
                  </option>
                  {mockCustomers.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      style={{ background: 'var(--color-bg-elevated)' }}
                    >
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.customerId && <p className="form-error">{errors.customerId.message}</p>}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                INVOICE DATE
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: 12,
                    width: 16,
                    height: 16,
                    color: 'var(--color-text-dim)',
                  }}
                />
                <input
                  type="date"
                  {...register('invoiceDate')}
                  className={`form-input pl-9 ${errors.invoiceDate ? 'error' : ''}`}
                />
              </div>
              {errors.invoiceDate && <p className="form-error">{errors.invoiceDate.message}</p>}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                DUE DATE
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: 12,
                    width: 16,
                    height: 16,
                    color: 'var(--color-text-dim)',
                  }}
                />
                <input
                  type="date"
                  {...register('dueDate')}
                  className={`form-input pl-9 ${errors.dueDate ? 'error' : ''}`}
                />
              </div>
              {errors.dueDate && <p className="form-error">{errors.dueDate.message}</p>}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                PAYMENT TYPE
              </label>
              <select
                {...register('paymentType')}
                className="form-input"
                style={{ cursor: 'pointer' }}
              >
                <option value={PaymentType.Cash} style={{ background: 'var(--color-bg-elevated)' }}>
                  Cash
                </option>
                <option
                  value={PaymentType.Credit}
                  style={{ background: 'var(--color-bg-elevated)' }}
                >
                  Credit
                </option>
              </select>
              {errors.paymentType && <p className="form-error">{errors.paymentType.message}</p>}
            </div>
          </div>
        </div>

        {/* Line Items Panel */}
        <div className="panel" style={{ padding: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Line Items
            </h2>
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                append({ productId: '', quantity: 1, unitPrice: 0, discountPercent: 0 })
              }
              style={{ height: 32, fontSize: 13 }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table" style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Product</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Qty</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Unit Price (Rs.)</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Disc (%)</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Amount (Rs.)</th>
                  <th style={{ width: '5%', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const qty = formLines[index]?.quantity || 0
                  const price = formLines[index]?.unitPrice || 0
                  const disc = formLines[index]?.discountPercent || 0
                  const amount = qty * price * (1 - disc / 100)
                  return (
                    <tr key={field.id}>
                      <td>
                        <select
                          {...register(`lines.${index}.productId`)}
                          onChange={(e) => {
                            register(`lines.${index}.productId`).onChange(e)
                            handleProductSelect(index, e.target.value)
                          }}
                          className={`form-input ${errors.lines?.[index]?.productId ? 'error' : ''}`}
                          style={{
                            height: 36,
                            paddingLeft: 12,
                            paddingRight: 32,
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2393A3BB' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                          }}
                        >
                          <option
                            value=""
                            disabled
                            style={{ background: 'var(--color-bg-elevated)' }}
                          >
                            Select Product...
                          </option>
                          {mockProducts.map((p) => (
                            <option
                              key={p.id}
                              value={p.id}
                              style={{ background: 'var(--color-bg-elevated)' }}
                            >
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          {...register(`lines.${index}.quantity`)}
                          className="form-input mono"
                          style={{ height: 36, textAlign: 'right' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          {...register(`lines.${index}.unitPrice`)}
                          className="form-input mono"
                          style={{ height: 36, textAlign: 'right' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          {...register(`lines.${index}.discountPercent`)}
                          className="form-input mono"
                          style={{ height: 36, textAlign: 'right' }}
                        />
                      </td>
                      <td
                        className="mono"
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {amount.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          style={{
                            width: 32,
                            height: 32,
                            color:
                              fields.length === 1 ? 'var(--color-text-dim)' : 'var(--color-danger)',
                          }}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {errors.lines && typeof errors.lines.message === 'string' && (
            <p className="form-error" style={{ marginTop: 12 }}>
              {errors.lines.message}
            </p>
          )}

          {/* Totals Summary */}
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            <div
              style={{
                width: 320,
                padding: 20,
                background: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Subtotal</span>
                <span className="mono" style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                  Rs. {totals.subtotal.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Discount</span>
                <span className="mono" style={{ fontSize: 13, color: 'var(--color-danger)' }}>
                  - Rs. {totals.totalDiscount.toFixed(2)}
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Grand Total
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-amber)' }}
                >
                  Rs. {totals.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Panel */}
        <div className="panel" style={{ padding: 24 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 20,
            }}
          >
            Additional Notes
          </h2>
          <textarea
            {...register('notes')}
            className="form-input"
            style={{ width: '100%', minHeight: 100, padding: 16, resize: 'vertical' }}
            placeholder="Add any internal notes or messages to the customer..."
          />
        </div>
      </form>
    </div>
  )
}
