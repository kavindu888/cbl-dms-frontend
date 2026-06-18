import dayjs from 'dayjs'
import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { masterService } from '@/services/api/masterService'
import { salesService } from '@/services/api/salesService'
import { useAuthStore } from '@/stores/authStore'

const emptyLine = {
  productId: '',
  categoryId: '',
  unitId: '',
  quantity: 1,
  unitPrice: 0,
  mrp: 0,
  discountPercent: 0,
  isVatApplicable: false,
}

function createDefaultValues(userId = '') {
  return {
    customerId: '',
    salesRouteId: '',
    vehicleId: '',
    salesPersonId: userId,
    isTaxInvoice: false,
    customerVatTin: '',
    lines: [{ ...emptyLine }],
  }
}

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function fieldError(message) {
  return message ? <p className="form-error">{message}</p> : null
}

export default function InvoiceCreatorPage() {
  const currentUser = useAuthStore((state) => state.user)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: createDefaultValues(currentUser?.id || ''),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const selectedCustomerId = useWatch({ control, name: 'customerId' })
  const isTaxInvoice = useWatch({ control, name: 'isTaxInvoice' })
  const lines = useWatch({ control, name: 'lines' }) || []

  const productById = useMemo(() => {
    return products.reduce((map, product) => {
      map[product.id] = product
      return map
    }, {})
  }, [products])

  const totals = useMemo(() => {
    return lines.reduce(
      (sum, line) => {
        const gross = Number(line.quantity || 0) * Number(line.unitPrice || 0)
        const discount = gross * (Number(line.discountPercent || 0) / 100)
        return {
          gross: sum.gross + gross,
          discount: sum.discount + discount,
          net: sum.net + gross - discount,
        }
      },
      { gross: 0, discount: 0, net: 0 }
    )
  }, [lines])

  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true)
      setLoadError('')

      try {
        const [customerPage, productPage] = await Promise.all([
          salesService.listCustomers({ page: 1, pageSize: 100, isActive: true }),
          masterService.listProducts({ page: 1, pageSize: 100, status: 'Active' }),
        ])

        setCustomers(customerPage.items || [])
        setProducts(productPage.items || [])
      } catch (error) {
        setLoadError(error.message)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    const customer = customers.find((item) => item.id === selectedCustomerId)
    setValue('salesRouteId', customer?.salesRouteId || '')
    setValue('customerVatTin', customer?.taxNumber || '')
  }, [customers, selectedCustomerId, setValue])

  function handleProductChange(index, productId) {
    const product = productById[productId]
    if (!product) return

    setValue(`lines.${index}.categoryId`, product.category?.id || '', { shouldDirty: true })
    setValue(`lines.${index}.unitId`, product.uomBase || product.baseUom || '', {
      shouldDirty: true,
    })
    setValue(`lines.${index}.unitPrice`, Number(product.unitPrice || 0), { shouldDirty: true })
    setValue(`lines.${index}.mrp`, Number(product.unitPrice || 0), { shouldDirty: true })
  }

  function validate(values) {
    if (!values.customerId) return 'Customer is required.'
    if (!values.salesRouteId) return 'Selected customer does not have a sales route.'
    if (!values.vehicleId.trim()) return 'Vehicle ID is required.'
    if (!values.salesPersonId.trim()) return 'Sales person ID is required.'
    if (values.isTaxInvoice && !values.customerVatTin.trim()) {
      return 'Customer VAT TIN is required for tax invoices.'
    }

    const invalidLine = values.lines.find(
      (line) =>
        !line.productId ||
        !line.categoryId ||
        !line.unitId ||
        Number(line.quantity) <= 0 ||
        Number(line.discountPercent) < 0 ||
        Number(line.discountPercent) > 10
    )

    if (invalidLine) {
      return 'Each line needs a product, quantity, unit, category, and discount between 0 and 10%.'
    }

    return ''
  }

  async function onSubmit(values) {
    const validationMessage = validate(values)
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }

    const payload = {
      customerId: values.customerId,
      salesRouteId: values.salesRouteId,
      vehicleId: values.vehicleId.trim(),
      salesPersonId: values.salesPersonId.trim(),
      isTaxInvoice: Boolean(values.isTaxInvoice),
      customerVatTin: values.isTaxInvoice ? values.customerVatTin.trim() : null,
      lines: values.lines.map((line) => ({
        productId: line.productId,
        categoryId: line.categoryId,
        unitId: line.unitId,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        mrp: Number(line.mrp || line.unitPrice),
        discountPercent: Number(line.discountPercent || 0),
        isVatApplicable: Boolean(line.isVatApplicable),
      })),
    }

    setIsSaving(true)
    try {
      const invoiceId = await salesService.createInvoice(payload)
      toast.success(`Invoice created successfully. ID: ${invoiceId}`)
      reset(createDefaultValues(currentUser?.id || ''))
    } catch (error) {
      toast.error(error?.message || 'Invoice could not be created.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 64 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Create Invoice
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Backend creates the invoice with today's server date: {dayjs().format('DD MMM YYYY')}.
        </p>
      </div>

      {loadError && (
        <div className="panel" style={{ padding: 16, color: 'var(--color-danger)' }}>
          {loadError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 440px)',
          alignItems: 'start',
          gap: 16,
        }}
      >
        <section className="panel" style={{ padding: 14, overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Invoice Lines
              </h2>
              <p style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-muted)' }}>
                Add products, quantities, pricing, discounts, and VAT flags.
              </p>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={() => append({ ...emptyLine })}
              style={{ height: 34 }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">MRP</th>
                  <th className="text-right">Disc %</th>
                  <th>VAT</th>
                  <th className="text-right">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const line = lines[index] || emptyLine
                  const lineTotal =
                    Number(line.quantity || 0) *
                    Number(line.unitPrice || 0) *
                    (1 - Number(line.discountPercent || 0) / 100)

                  return (
                    <tr key={field.id}>
                      <td>
                        <select
                          className="form-input"
                          {...register(`lines.${index}.productId`)}
                          onChange={(event) => {
                            register(`lines.${index}.productId`).onChange(event)
                            handleProductChange(index, event.target.value)
                          }}
                        >
                          <option value="">Select product...</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                        <input type="hidden" {...register(`lines.${index}.categoryId`)} />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          {...register(`lines.${index}.unitId`)}
                          readOnly
                        />
                      </td>
                      <td>
                        <input
                          className="form-input mono text-right"
                          type="number"
                          step="0.01"
                          {...register(`lines.${index}.quantity`)}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input mono text-right"
                          type="number"
                          step="0.01"
                          {...register(`lines.${index}.unitPrice`)}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input mono text-right"
                          type="number"
                          step="0.01"
                          {...register(`lines.${index}.mrp`)}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input mono text-right"
                          type="number"
                          step="0.01"
                          max="10"
                          {...register(`lines.${index}.discountPercent`)}
                        />
                      </td>
                      <td>
                        <input type="checkbox" {...register(`lines.${index}.isVatApplicable`)} />
                      </td>
                      <td className="mono text-right">{money(lineTotal)}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          style={{ width: 32, height: 32 }}
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
        </section>

        <aside
          className="panel"
          style={{
            padding: 16,
            position: 'sticky',
            top: 16,
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Add New Invoice
            </h2>
            <p style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Route is taken from the selected customer.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
            <p className="form-label" style={{ fontSize: 10 }}>
              Basic Information
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Customer *
                </label>
                <select className="form-input" {...register('customerId')}>
                  <option value="">Select customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {fieldError(errors.customerId?.message)}
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Sales Route ID
                </label>
                <input className="form-input" {...register('salesRouteId')} readOnly />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Vehicle ID *
                </label>
                <input
                  className="form-input"
                  placeholder="Enter vehicle ID"
                  {...register('vehicleId')}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Sales Person ID *
                </label>
                <input className="form-input" type="password" {...register('salesPersonId')} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 16, paddingTop: 14 }}>
            <p className="form-label" style={{ fontSize: 10 }}>
              Tax Details
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <input type="checkbox" {...register('isTaxInvoice')} />
              Tax invoice
            </label>

            {isTaxInvoice && (
              <div style={{ marginTop: 12 }}>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Customer VAT TIN *
                </label>
                <input className="form-input" {...register('customerVatTin')} />
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 16, paddingTop: 14 }}>
            <p className="form-label" style={{ fontSize: 10 }}>
              Invoice Summary
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Gross</span>
                <span className="mono">{money(totals.gross)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Discount</span>
                <span className="mono">{money(totals.discount)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>Net</span>
                <span className="mono" style={{ color: 'var(--color-amber)' }}>
                  {money(totals.net)}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginTop: 18,
            }}
          >
            <button
              type="button"
              className="button-secondary"
              onClick={() => reset(createDefaultValues(currentUser?.id || ''))}
            >
              <RotateCcw style={{ width: 15, height: 15 }} />
              Clear
            </button>
            <button
              className="button-primary"
              type="submit"
              disabled={isSaving || isLoadingData}
            >
              <Save style={{ width: 15, height: 15 }} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </aside>
      </form>
    </div>
  )
}
