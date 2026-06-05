import { ImageUp, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'
import { getR2ImageUrl, validateCustomerImage } from '@services/cloudinary/customerImageUpload'
import { salesService } from '@services/api/salesService'
import { useAuthStore } from '@stores/authStore'

const emptyForm = {
  code: '',
  name: '',
  customerGroupId: '',
  territoryId: '',
  salesRouteId: '',
  preferredPaymentMethod: '0',
  isVatRegistered: false,
  registrationNumber: '',
  taxNumber: '',
  geoLatitude: '',
  geoLongitude: '',
  contactFullName: '',
  contactPhone: '',
  contactEmail: '',
  contactType: '0',
}

const pageSize = 10

const paymentMethods = [
  { value: '0', label: 'Cash' },
  { value: '1', label: 'Credit' },
  { value: '2', label: 'Cheque' },
  { value: '3', label: 'Bank Transfer' },
]

const contactTypes = [
  { value: '0', label: 'Owner' },
  { value: '1', label: 'Manager' },
  { value: '2', label: 'Finance' },
  { value: '3', label: 'Buyer' },
  { value: '4', label: 'Other' },
]

const imageTypes = [
  { value: '1', label: 'Profile Picture' },
  { value: '2', label: 'Shop Front' },
  { value: '3', label: 'Document' },
  { value: '4', label: 'Other' },
]

function getImageTypeLabel(value) {
  return imageTypes.find((type) => type.value === String(value))?.label || 'Other'
}

function getErrorMessage(error, fallback = 'Something went wrong') {
  return error?.message || fallback
}

function toCustomerCode(value) {
  return value.trim().toUpperCase()
}

function toOptionalDecimal(value) {
  if (value === '' || value === null || value === undefined) return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function getPaymentLabel(value) {
  return paymentMethods.find((method) => Number(method.value) === Number(value))?.label || value
}

function getGroupName(groups, id) {
  return groups.find((group) => group.id === id)?.name || id || '-'
}

function buildCreatePayload(form, organizationId) {
  const contacts =
    form.contactFullName.trim() || form.contactPhone.trim()
      ? [
          {
            contactType: Number(form.contactType),
            fullName: form.contactFullName.trim(),
            phone: form.contactPhone.trim(),
            email: form.contactEmail.trim() || null,
            isPrimary: true,
          },
        ]
      : null

  return {
    organizationId,
    customerGroupId: form.customerGroupId,
    salesRouteId: form.salesRouteId,
    code: toCustomerCode(form.code),
    name: form.name.trim(),
    preferredPaymentMethod: Number(form.preferredPaymentMethod),
    isVatRegistered: form.isVatRegistered,
    registrationNumber: form.registrationNumber.trim() || null,
    taxNumber: form.taxNumber.trim() || null,
    geoLatitude: toOptionalDecimal(form.geoLatitude),
    geoLongitude: toOptionalDecimal(form.geoLongitude),
    contacts,
  }
}

function buildUpdatePayload(form) {
  return {
    customerGroupId: form.customerGroupId,
    territoryId: form.salesRouteId,
    code: toCustomerCode(form.code),
    name: form.name.trim(),
    isVatRegistered: form.isVatRegistered,
    registrationNumber: form.registrationNumber.trim() || null,
    taxNumber: form.taxNumber.trim() || null,
  }
}

export default function CustomerListPage() {
  const currentUser = useAuthStore((state) => state.user)
  const organizationId = currentUser?.orgId || ''

  const [customers, setCustomers] = useState([])
  const [groups, setGroups] = useState([])
  const [territories, setTerritories] = useState([])
  const [routes, setRoutes] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingLookups, setIsLoadingLookups] = useState(true)
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false)
  const [imageType, setImageType] = useState('2')
  const [pendingImages, setPendingImages] = useState([])
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const customerStatus = useMemo(() => {
    if (statusFilter === 'Active') return true
    if (statusFilter === 'Inactive') return false
    return undefined
  }, [statusFilter])

  const customerGroupOptions = useMemo(() => {
    return groups.filter((group) => group.isActive || group.id === form.customerGroupId)
  }, [form.customerGroupId, groups])

  const territoryOptions = useMemo(() => {
    return territories.filter(
      (territory) => territory.isActive || territory.id === form.territoryId
    )
  }, [form.territoryId, territories])

  const routeOptions = useMemo(() => {
    return routes.filter((route) => route.isActive || route.id === form.salesRouteId)
  }, [form.salesRouteId, routes])

  const loadLookups = useCallback(async () => {
    setIsLoadingLookups(true)

    try {
      const [groupResult, territoryResult] = await Promise.all([
        salesService.listCustomerGroups({ page: 1, pageSize: 100 }),
        masterService.listTerritories(),
      ])

      setGroups(groupResult.items || [])
      setTerritories(territoryResult || [])
    } catch (loadError) {
      toast.error(getErrorMessage(loadError, 'Unable to load customer lookups.'))
    } finally {
      setIsLoadingLookups(false)
    }
  }, [])

  const loadCustomers = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const result = await salesService.listCustomers({
        page,
        pageSize,
        search: search.trim() || undefined,
        isActive: customerStatus,
      })

      setCustomers(result.items || [])
      setTotalItems(result.totalItems || 0)
      setTotalPages(Math.max(1, result.totalPages || 1))
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load customers.'))
    } finally {
      setIsLoading(false)
    }
  }, [customerStatus, page, search])

  const loadRoutes = useCallback(async (territoryId) => {
    if (!territoryId) {
      setRoutes([])
      return
    }

    setIsLoadingRoutes(true)

    try {
      const result = await masterService.listSalesRoutes({
        territoryId,
        page: 1,
        pageSize: 100,
      })
      setRoutes(result.items || [])
    } catch (loadError) {
      toast.error(getErrorMessage(loadError, 'Unable to load sales routes.'))
    } finally {
      setIsLoadingRoutes(false)
    }
  }, [])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    loadRoutes(form.territoryId)
  }, [form.territoryId, loadRoutes])

  function updateField(field, value) {
    setForm((currentForm) => {
      const nextForm = { ...currentForm, [field]: value }
      if (field === 'territoryId') {
        nextForm.salesRouteId = ''
      }
      return nextForm
    })
  }

  function resetForm() {
    setEditingCustomer(null)
    setForm(emptyForm)
    setPendingImages([])
    setImageType('2')
  }

  function handleImageSelection(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (!files.length) return
    if (pendingImages.length + files.length > 10) {
      toast.error('You can upload up to 10 images at a time.')
      return
    }

    try {
      files.forEach(validateCustomerImage)
    } catch (validationError) {
      toast.error(getErrorMessage(validationError, 'Invalid image.'))
      return
    }

    setPendingImages((currentImages) => [
      ...currentImages,
      ...files.map((file) => ({ imageType, file })),
    ])
  }

  function removePendingImage(indexToRemove) {
    setPendingImages((currentImages) => currentImages.filter((_, index) => index !== indexToRemove))
  }

  function openCreateModal() {
    resetForm()
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    resetForm()
  }

  async function openEdit(customer) {
    setIsSaving(true)

    try {
      const details = await salesService.getCustomer(customer.id)
      setEditingCustomer(details)
      setIsModalOpen(true)
      setForm({
        code: details.code,
        name: details.name,
        customerGroupId: details.customerGroupId,
        territoryId: '',
        salesRouteId: details.salesRouteId,
        preferredPaymentMethod: String(details.preferredPaymentMethod),
        isVatRegistered: details.isVatRegistered,
        registrationNumber: details.registrationNumber || '',
        taxNumber: details.taxNumber || '',
        geoLatitude: details.location?.latitude ?? '',
        geoLongitude: details.location?.longitude ?? '',
        contactFullName: details.contacts?.[0]?.fullName || '',
        contactPhone: details.contacts?.[0]?.phone || '',
        contactEmail: details.contacts?.[0]?.email || '',
        contactType: String(details.contacts?.[0]?.contactType ?? '0'),
      })
    } catch (loadError) {
      toast.error(getErrorMessage(loadError, 'Unable to load customer details.'))
    } finally {
      setIsSaving(false)
    }
  }

  function validatePayload(payload) {
    if (!payload.code || !payload.name) {
      toast.error('Customer code and name are required.')
      return false
    }
    if (!payload.customerGroupId || !(payload.salesRouteId || payload.territoryId)) {
      toast.error('Customer group and sales route are required.')
      return false
    }
    if (payload.isVatRegistered && !/^\d{9}$/.test(payload.taxNumber || '')) {
      toast.error('TIN must be exactly 9 digits when VAT registered.')
      return false
    }
    if (payload.contacts?.length) {
      const contact = payload.contacts[0]
      if (!contact.fullName || !contact.phone) {
        toast.error('Primary contact needs both name and phone.')
        return false
      }
    }
    return true
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!editingCustomer && !organizationId) {
      toast.error('Your login session does not include an organization id.')
      return
    }

    const payload = editingCustomer
      ? buildUpdatePayload(form)
      : buildCreatePayload(form, organizationId)

    if (!validatePayload(payload)) return

    setIsSaving(true)

    try {
      if (editingCustomer) {
        await salesService.updateCustomer(editingCustomer.id, payload)
        toast.success('Customer updated.')
      } else {
        const newCustomerId = await salesService.createCustomer(payload)
        if (pendingImages.length && newCustomerId) {
          try {
            await salesService.uploadCustomerImages(newCustomerId, pendingImages)
          } catch (uploadError) {
            toast.warning(
              `Customer created but image upload failed: ${getErrorMessage(uploadError)}`
            )
          }
        }
        toast.success('Customer created.')
      }

      await loadCustomers()
      closeModal()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to save customer.'))
    } finally {
      setIsSaving(false)
    }
  }

  function handleFormKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) return

    const target = event.target
    if (target.tagName === 'BUTTON') return

    event.preventDefault()

    const focusable = Array.from(
      event.currentTarget.querySelectorAll(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]):not([data-skip-focus="true"])'
      )
    )
    const currentIndex = focusable.indexOf(target)

    if (currentIndex > -1 && currentIndex < focusable.length - 1) {
      focusable[currentIndex + 1].focus()
    }
  }

  async function handleDeactivate(customer) {
    if (!customer.isActive) return
    if (!window.confirm(`Deactivate ${customer.name}?`)) return

    try {
      await salesService.deactivateCustomer(customer.id)
      toast.success('Customer deactivated.')
      await loadCustomers()

      if (editingCustomer?.id === customer.id) {
        closeModal()
      }
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Unable to deactivate customer.'))
    }
  }

  async function handleUploadImage() {
    if (!editingCustomer || !pendingImages.length) {
      toast.error('Select one or more images first.')
      return
    }

    try {
      pendingImages.forEach(({ file }) => validateCustomerImage(file))
    } catch (validationError) {
      toast.error(getErrorMessage(validationError, 'Invalid image.'))
      return
    }

    setIsSaving(true)

    try {
      await salesService.uploadCustomerImages(editingCustomer.id, pendingImages)
      toast.success(
        `${pendingImages.length} image${pendingImages.length === 1 ? '' : 's'} uploaded.`
      )
      const updated = await salesService.getCustomer(editingCustomer.id)
      setEditingCustomer(updated)
      setPendingImages([])
    } catch (uploadError) {
      toast.error(getErrorMessage(uploadError, 'Unable to upload image.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            Customers
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Manage customer master records, groups, route assignment, VAT details, and shop images.
          </p>
        </div>
        <button
          className="button-primary"
          type="button"
          onClick={openCreateModal}
          style={{
            height: 40,
            padding: '0 24px',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          New Customer
        </button>
      </div>

      <div
        className="panel"
        style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 160px', gap: 16 }}
      >
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
            placeholder="Search customers..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: '100%', height: 40, paddingLeft: 36 }}
          />
        </div>

        <select
          className="form-input"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{ height: 40 }}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          className="panel"
          style={{
            padding: '14px 16px',
            display: 'grid',
            gridTemplateRows: 'minmax(0, 1fr) auto',
            minHeight: 0,
          }}
        >
          <div className="overflow-x-auto" style={{ minHeight: 0, overflowY: 'auto' }}>
            <table className="data-table master-table-compact">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Group</th>
                  <th>Payment</th>
                  <th>VAT</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-text-muted">
                      Loading customers...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-danger">
                      {error}
                    </td>
                  </tr>
                ) : customers.length ? (
                  customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <span
                          className="mono text-xs font-semibold"
                          style={{ color: 'var(--color-amber)' }}
                        >
                          {customer.code}
                        </span>
                      </td>
                      <td
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {customer.name}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {getGroupName(groups, customer.customerGroupId)}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {getPaymentLabel(customer.preferredPaymentMethod)}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {customer.isVatRegistered ? 'Yes' : 'No'}
                      </td>
                      <td>
                        <StatusBadge status={customer.status} />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit customer"
                          disabled={isSaving}
                          style={{ width: 28, height: 28, marginRight: 6 }}
                          onClick={() => openEdit(customer)}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Deactivate customer"
                          disabled={!customer.isActive}
                          style={{ width: 28, height: 28, opacity: customer.isActive ? 1 : 0.45 }}
                          onClick={() => handleDeactivate(customer)}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-text-muted">
                      No customers found.
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
              Showing {customers.length} of {totalItems} customers
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

        {isModalOpen ? (
          <div
            role="presentation"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              background: 'rgba(0,4,12,0.75)',
              backdropFilter: 'blur(2px)',
            }}
          >
            <form
              onSubmit={handleSave}
              onKeyDown={handleFormKeyDown}
              className="panel"
              style={{
                width: 'min(940px, calc(100vw - 48px))',
                height: 'min(760px, calc(100vh - 48px))',
                maxHeight: '88vh',
                overflowY: 'auto',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                borderRadius: 10,
              }}
            >
              <div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <p style={{ fontSize: 16, fontWeight: 650, color: 'var(--color-text-primary)' }}>
                    {editingCustomer ? 'Edit Customer' : 'New Customer'}
                  </p>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={closeModal}
                    aria-label="Close"
                    data-skip-focus="true"
                    style={{ width: 32, height: 32 }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
                <p style={{ marginTop: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Customer organization is taken from your signed-in session.
                </p>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  CUSTOMER CODE
                </label>
                <input
                  autoFocus
                  className="form-input"
                  placeholder="e.g. CUST-0001"
                  value={form.code}
                  maxLength={30}
                  onChange={(event) => updateField('code', event.target.value)}
                  style={{ height: 38 }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  CUSTOMER NAME
                </label>
                <input
                  className="form-input"
                  placeholder="e.g. Fresh Mart Kandy"
                  value={form.name}
                  maxLength={200}
                  onChange={(event) => updateField('name', event.target.value)}
                  style={{ height: 38 }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  CUSTOMER GROUP
                </label>
                <select
                  className="form-input"
                  value={form.customerGroupId}
                  disabled={isLoadingLookups}
                  onChange={(event) => updateField('customerGroupId', event.target.value)}
                  style={{ height: 38 }}
                >
                  <option value="">Select group</option>
                  {customerGroupOptions.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  TERRITORY
                </label>
                <select
                  className="form-input"
                  value={form.territoryId}
                  disabled={isLoadingLookups}
                  onChange={(event) => updateField('territoryId', event.target.value)}
                  style={{ height: 38 }}
                >
                  <option value="">Select territory for route</option>
                  {territoryOptions.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name} ({territory.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  SALES ROUTE
                </label>
                <select
                  className="form-input"
                  value={form.salesRouteId}
                  disabled={isLoadingRoutes}
                  onChange={(event) => updateField('salesRouteId', event.target.value)}
                  style={{ height: 38 }}
                >
                  <option value="">{isLoadingRoutes ? 'Loading routes...' : 'Select route'}</option>
                  {form.salesRouteId &&
                  !routeOptions.some((route) => route.id === form.salesRouteId) ? (
                    <option value={form.salesRouteId}>Current route ({form.salesRouteId})</option>
                  ) : null}
                  {routeOptions.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name} ({route.code})
                    </option>
                  ))}
                </select>
              </div>

              {!editingCustomer ? (
                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>
                    PREFERRED PAYMENT
                  </label>
                  <select
                    className="form-input"
                    value={form.preferredPaymentMethod}
                    onChange={(event) => updateField('preferredPaymentMethod', event.target.value)}
                    style={{ height: 38 }}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isVatRegistered}
                  onChange={(event) => updateField('isVatRegistered', event.target.checked)}
                />
                VAT registered
              </label>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  REGISTRATION NUMBER
                </label>
                <input
                  className="form-input"
                  placeholder="Optional"
                  value={form.registrationNumber}
                  maxLength={50}
                  onChange={(event) => updateField('registrationNumber', event.target.value)}
                  style={{ height: 38 }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  TIN
                </label>
                <input
                  className="form-input"
                  placeholder={form.isVatRegistered ? '9 digits required' : 'Optional'}
                  value={form.taxNumber}
                  maxLength={9}
                  onChange={(event) =>
                    updateField('taxNumber', event.target.value.replace(/\D/g, ''))
                  }
                  style={{ height: 38 }}
                />
              </div>

              {!editingCustomer ? (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                    }}
                  >
                    <div>
                      <label className="form-label" style={{ fontSize: 10 }}>
                        LATITUDE
                      </label>
                      <input
                        className="form-input"
                        type="number"
                        step="0.000001"
                        placeholder="Optional"
                        value={form.geoLatitude}
                        onChange={(event) => updateField('geoLatitude', event.target.value)}
                        style={{ height: 38 }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: 10 }}>
                        LONGITUDE
                      </label>
                      <input
                        className="form-input"
                        type="number"
                        step="0.000001"
                        placeholder="Optional"
                        value={form.geoLongitude}
                        onChange={(event) => updateField('geoLongitude', event.target.value)}
                        style={{ height: 38 }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 10,
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <p
                      style={{ fontSize: 12, fontWeight: 650, color: 'var(--color-text-primary)' }}
                    >
                      Primary Contact
                    </p>
                    <select
                      className="form-input"
                      value={form.contactType}
                      onChange={(event) => updateField('contactType', event.target.value)}
                      style={{ height: 38 }}
                    >
                      {contactTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="form-input"
                      placeholder="Contact name"
                      value={form.contactFullName}
                      onChange={(event) => updateField('contactFullName', event.target.value)}
                      style={{ height: 38 }}
                    />
                    <input
                      className="form-input"
                      placeholder="Phone"
                      value={form.contactPhone}
                      onChange={(event) => updateField('contactPhone', event.target.value)}
                      style={{ height: 38 }}
                    />
                    <input
                      className="form-input"
                      placeholder="Email"
                      value={form.contactEmail}
                      onChange={(event) => updateField('contactEmail', event.target.value)}
                      style={{ height: 38 }}
                    />
                  </div>

                  <div
                    style={{
                      padding: 10,
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <p
                      style={{ fontSize: 12, fontWeight: 650, color: 'var(--color-text-primary)' }}
                    >
                      Customer Image
                    </p>
                    <select
                      className="form-input"
                      value={imageType}
                      onChange={(event) => setImageType(event.target.value)}
                      style={{ height: 38 }}
                    >
                      {imageTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="form-input"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageSelection}
                      style={{ height: 38, paddingTop: 8 }}
                    />
                    {pendingImages.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {pendingImages.map((image, index) => (
                          <div
                            key={`${image.file.name}-${image.file.lastModified}-${index}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              fontSize: 11,
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {image.file.name} ({getImageTypeLabel(image.imageType)})
                            </span>
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Remove ${image.file.name}`}
                              onClick={() => removePendingImage(index)}
                              style={{ width: 24, height: 24, flexShrink: 0 }}
                            >
                              <X style={{ width: 12, height: 12 }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                      Select a type, then choose one or more files. Change the type and choose more
                      files to build the upload queue. JPEG, PNG, and WebP supported (max 10 MB
                      each).
                    </p>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    padding: 10,
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 650, color: 'var(--color-text-primary)' }}>
                    Upload Image
                  </p>
                  {editingCustomer.images?.length ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {editingCustomer.images.map((image) => (
                        <img
                          key={image.id || image.imageUrl}
                          src={getR2ImageUrl(image.imageUrl)}
                          alt="Customer"
                          style={{
                            width: 72,
                            height: 72,
                            objectFit: 'cover',
                            borderRadius: 6,
                            border: '1px solid var(--color-border)',
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                  <select
                    className="form-input"
                    value={imageType}
                    onChange={(event) => setImageType(event.target.value)}
                    style={{ height: 38 }}
                  >
                    {imageTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="form-input"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageSelection}
                    style={{ height: 38, paddingTop: 8 }}
                  />
                  {pendingImages.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {pendingImages.map((image, index) => (
                        <div
                          key={`${image.file.name}-${image.file.lastModified}-${index}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            fontSize: 11,
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {image.file.name} ({getImageTypeLabel(image.imageType)})
                          </span>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Remove ${image.file.name}`}
                            onClick={() => removePendingImage(index)}
                            style={{ width: 24, height: 24, flexShrink: 0 }}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={isSaving || !pendingImages.length}
                    onClick={handleUploadImage}
                    style={{ height: 36, fontSize: 12, display: 'inline-flex', gap: 6 }}
                  >
                    <ImageUp style={{ width: 14, height: 14 }} />
                    {isSaving
                      ? 'Uploading...'
                      : pendingImages.length
                        ? `Upload ${pendingImages.length} Image${pendingImages.length === 1 ? '' : 's'}`
                        : 'Upload Images'}
                  </button>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    Select a type, then choose one or more files. Change the type and choose more
                    files to build the upload queue.
                  </p>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  paddingTop: 8,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <button
                  type="button"
                  data-skip-focus="true"
                  className="button-ghost"
                  onClick={closeModal}
                  style={{ flex: 1, height: 38, fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={isSaving}
                  style={{ flex: 1, height: 38, fontSize: 13 }}
                >
                  {isSaving ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  )
}
