import { ImageUp, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { masterService } from '@services/api/masterService'
import {
  getCloudinaryImageUrl,
  isCloudinaryConfigured,
  uploadCustomerImageToCloudinary,
  validateCustomerImage,
} from '@services/cloudinary/customerImageUpload'
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
  additionalContacts: [],
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

function formatMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0.00'
  return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildCreatePayload(form, organizationId, imageUrl = null, selectedImageType = 2) {
  const contacts = []

  if (form.contactFullName.trim() || form.contactPhone.trim() || form.contactEmail.trim()) {
    contacts.push({
      contactType: Number(form.contactType),
      fullName: form.contactFullName.trim(),
      phone: form.contactPhone.trim(),
      email: form.contactEmail.trim() || null,
      isPrimary: true,
    })
  }

  if (form.additionalContacts && form.additionalContacts.length > 0) {
    form.additionalContacts.forEach((c) => {
      if (c.fullName.trim() || c.phone.trim() || c.email.trim()) {
        contacts.push({
          contactType: Number(c.contactType),
          fullName: c.fullName.trim(),
          phone: c.phone.trim(),
          email: c.email.trim() || null,
          isPrimary: false,
        })
      }
    })
  }

  const images = imageUrl
    ? [
        {
          imageType: Number(selectedImageType),
          imageUrl,
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
    contacts: contacts.length > 0 ? contacts : null,
    images,
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
  const cloudinaryConfigured = isCloudinaryConfigured()

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
  const [imageFile, setImageFile] = useState(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Customer Group inline creation states
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [newGroup, setNewGroup] = useState({
    code: '',
    name: '',
    defaultCreditDays: '0',
    defaultCreditLimit: '0',
  })
  const [isSavingGroup, setIsSavingGroup] = useState(false)

  // Territory and Route inline creation states
  const [businessUnits, setBusinessUnits] = useState([])
  const [showTerritoryForm, setShowTerritoryForm] = useState(false)
  const [newTerritory, setNewTerritory] = useState({
    businessUnitId: '',
    code: '',
    name: '',
    description: '',
  })
  const [isSavingTerritory, setIsSavingTerritory] = useState(false)

  const [showRouteForm, setShowRouteForm] = useState(false)
  const [newRoute, setNewRoute] = useState({
    code: '',
    name: '',
    defaultEmployeeId: '',
  })
  const [isSavingRoute, setIsSavingRoute] = useState(false)

  useEffect(() => {
    if (businessUnits.length && !newTerritory.businessUnitId) {
      setNewTerritory((current) => ({ ...current, businessUnitId: businessUnits[0].id }))
    }
  }, [businessUnits, newTerritory.businessUnitId])

  const customerStatus = useMemo(() => {
    if (statusFilter === 'Active') return true
    if (statusFilter === 'Inactive') return false
    return undefined
  }, [statusFilter])

  const customerGroupOptions = useMemo(() => {
    return groups.filter((group) => group.isActive || group.id === form.customerGroupId)
  }, [form.customerGroupId, groups])

  const selectedGroup = useMemo(() => {
    return groups.find((group) => group.id === form.customerGroupId)
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
      const [groupResult, territoryResult, businessUnitResult] = await Promise.all([
        salesService.listCustomerGroups({ page: 1, pageSize: 100 }),
        masterService.listTerritories(),
        masterService.listBusinessUnits(),
      ])

      setGroups(groupResult.items || [])
      setTerritories(territoryResult || [])
      setBusinessUnits(businessUnitResult || [])
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
    setImageFile(null)
    setImageType('2')
    setShowGroupForm(false)
    setNewGroup({
      code: '',
      name: '',
      defaultCreditDays: '0',
      defaultCreditLimit: '0',
    })
    setShowTerritoryForm(false)
    setNewTerritory({
      businessUnitId: businessUnits[0]?.id || '',
      code: '',
      name: '',
      description: '',
    })
    setShowRouteForm(false)
    setNewRoute({
      code: '',
      name: '',
      defaultEmployeeId: '',
    })
  }

  function updateNewGroupField(field, value) {
    setNewGroup((current) => ({ ...current, [field]: value }))
  }

  async function handleCreateCustomerGroup() {
    const code = newGroup.code.trim().toUpperCase()
    const name = newGroup.name.trim()
    const defaultCreditDays = Math.max(0, Math.trunc(Number(newGroup.defaultCreditDays || 0)))
    const defaultCreditLimit = Math.max(0, Number(newGroup.defaultCreditLimit || 0))

    if (!code || !name) {
      toast.error('Customer group code and name are required.')
      return
    }

    setIsSavingGroup(true)

    try {
      const created = await salesService.createCustomerGroup({
        code,
        name,
        defaultCreditDays,
        defaultCreditLimit,
      })
      toast.success('Customer group created.')
      await loadLookups()
      updateField('customerGroupId', created.id)
      setNewGroup({
        code: '',
        name: '',
        defaultCreditDays: '0',
        defaultCreditLimit: '0',
      })
      setShowGroupForm(false)
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to create customer group.'))
    } finally {
      setIsSavingGroup(false)
    }
  }

  function updateNewTerritoryField(field, value) {
    setNewTerritory((current) => ({ ...current, [field]: value }))
  }

  async function handleCreateTerritory() {
    const businessUnitId = newTerritory.businessUnitId
    const code = newTerritory.code.trim().toUpperCase()
    const name = newTerritory.name.trim()
    const description = newTerritory.description.trim() || null

    if (!businessUnitId) {
      toast.error('Please select a Business Unit first.')
      return
    }
    if (!code || !name) {
      toast.error('Territory code and name are required.')
      return
    }

    setIsSavingTerritory(true)

    try {
      const created = await masterService.createTerritory({
        businessUnitId,
        code,
        name,
        description,
      })
      toast.success('Territory created.')
      await loadLookups()
      updateField('territoryId', created.id)
      setNewTerritory({
        businessUnitId: businessUnits[0]?.id || '',
        code: '',
        name: '',
        description: '',
      })
      setShowTerritoryForm(false)
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to create territory.'))
    } finally {
      setIsSavingTerritory(false)
    }
  }

  function updateNewRouteField(field, value) {
    setNewRoute((current) => ({ ...current, [field]: value }))
  }

  async function handleCreateSalesRoute() {
    const territoryId = form.territoryId
    const code = newRoute.code.trim().toUpperCase()
    const name = newRoute.name.trim()
    const defaultEmployeeId = newRoute.defaultEmployeeId.trim() || null

    if (!territoryId) {
      toast.error('Please select a Territory first.')
      return
    }
    if (!code || !name) {
      toast.error('Route code and name are required.')
      return
    }

    setIsSavingRoute(true)

    try {
      const created = await masterService.createSalesRoute({
        territoryId,
        code,
        name,
        defaultEmployeeId,
      })
      toast.success('Sales route created.')
      await loadRoutes(territoryId)
      updateField('salesRouteId', created.id)
      setNewRoute({
        code: '',
        name: '',
        defaultEmployeeId: '',
      })
      setShowRouteForm(false)
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Unable to create sales route.'))
    } finally {
      setIsSavingRoute(false)
    }
  }

  function addAdditionalContact() {
    setForm((currentForm) => ({
      ...currentForm,
      additionalContacts: [
        ...currentForm.additionalContacts,
        { contactType: '0', fullName: '', phone: '', email: '' },
      ],
    }))
  }

  function removeAdditionalContact(index) {
    setForm((currentForm) => ({
      ...currentForm,
      additionalContacts: currentForm.additionalContacts.filter((_, idx) => idx !== index),
    }))
  }

  function updateAdditionalContact(index, field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      additionalContacts: currentForm.additionalContacts.map((c, idx) =>
        idx === index ? { ...c, [field]: value } : c
      ),
    }))
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
      
      const primaryContact = details.contacts?.find((c) => c.isPrimary) || details.contacts?.[0]
      const otherContacts = details.contacts?.filter((c) => c !== primaryContact) || []

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
        contactFullName: primaryContact?.fullName || '',
        contactPhone: primaryContact?.phone || '',
        contactEmail: primaryContact?.email || '',
        contactType: String(primaryContact?.contactType ?? '0'),
        additionalContacts: otherContacts.map((c) => ({
          fullName: c.fullName || '',
          phone: c.phone || '',
          email: c.email || '',
          contactType: String(c.contactType ?? '0'),
        })),
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
    if (payload.isVatRegistered) {
      if (!payload.registrationNumber || !payload.registrationNumber.trim()) {
        toast.error('Registration number is required when VAT registered.')
        return false
      }
      if (!payload.taxNumber || !payload.taxNumber.trim()) {
        toast.error('TIN is required when VAT registered.')
        return false
      }
      if (!/^\d{9}$/.test(payload.taxNumber)) {
        toast.error('TIN must be exactly 9 digits when VAT registered.')
        return false
      }
    }
    if (payload.contacts?.length) {
      for (let i = 0; i < payload.contacts.length; i++) {
        const contact = payload.contacts[i]
        if (!contact.fullName || !contact.phone) {
          const prefix = contact.isPrimary ? 'Primary contact' : `Contact #${i + 1}`
          toast.error(`${prefix} needs both name and phone.`)
          return false
        }
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
      : buildCreatePayload(form, organizationId, null, imageType)

    if (!validatePayload(payload)) return

    setIsSaving(true)

    try {
      if (!editingCustomer && imageFile) {
        const imagePath = await uploadCustomerImageToCloudinary(imageFile)
        payload.images = [
          {
            imageType: Number(imageType),
            imageUrl: imagePath,
          },
        ]
      }

      if (editingCustomer) {
        await salesService.updateCustomer(editingCustomer.id, payload)
        toast.success('Customer updated.')
      } else {
        await salesService.createCustomer(payload)
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
    if (!editingCustomer || !imageFile) {
      toast.error('Select a customer and image first.')
      return
    }

    try {
      validateCustomerImage(imageFile)
      toast.error('Existing customer image upload needs backend support for saving a Cloudinary URL.')
    } catch (validationError) {
      toast.error(getErrorMessage(validationError, 'Unable to upload image.'))
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
                width: 'min(1200px, calc(100vw - 48px))',
                height: 'auto',
                maxHeight: 'min(850px, calc(100vh - 48px))',
                borderRadius: 10,
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '24px 32px 16px 32px',
                  borderBottom: '1px solid var(--color-border)',
                  flexShrink: 0,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {editingCustomer ? 'Edit Customer' : 'New Customer'}
                  </h2>
                  <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
                    Customer organization is taken from your signed-in session.
                  </p>
                </div>
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

              {/* Scrollable Content */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 24,
                }}
              >
                {/* General Info Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 20,
                  }}
                >
                  <div>
                    <label className="form-label">
                      CUSTOMER CODE <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                      autoFocus
                      className="form-input"
                      placeholder="e.g. CUST-0001"
                      value={form.code}
                      maxLength={30}
                      onChange={(event) => updateField('code', event.target.value)}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">
                      CUSTOMER NAME <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                      className="form-input"
                      placeholder="e.g. Fresh Mart Kandy"
                      value={form.name}
                      maxLength={200}
                      onChange={(event) => updateField('name', event.target.value)}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        CUSTOMER GROUP <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <button
                        type="button"
                        className="icon-button"
                        title="Add Customer Group"
                        onClick={() => setShowGroupForm((current) => !current)}
                        style={{ width: 24, height: 24, borderRadius: 6 }}
                      >
                        <Plus style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                    <select
                      className="form-input"
                      value={form.customerGroupId}
                      disabled={isLoadingLookups}
                      onChange={(event) => updateField('customerGroupId', event.target.value)}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)', cursor: isLoadingLookups ? 'wait' : 'pointer' }}
                    >
                      <option value="">Select group</option>
                      {customerGroupOptions.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {showGroupForm ? (
                    <div
                      style={{
                        gridColumn: 'span 4',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 20,
                        padding: 16,
                        border: '1px dashed var(--color-border)',
                        borderRadius: 8,
                        background: 'rgba(0,0,0,0.08)',
                        marginTop: 4,
                        marginBottom: 4,
                      }}
                    >
                      <div>
                        <label className="form-label" style={{ fontSize: 10 }}>
                          NEW GROUP CODE <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <input
                          className="form-input"
                          placeholder="e.g. WHOLESALE"
                          value={newGroup.code}
                          maxLength={20}
                          onChange={(event) => updateNewGroupField('code', event.target.value.toUpperCase())}
                          style={{ height: 38, background: 'rgba(0,0,0,0.2)' }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: 10 }}>
                          NEW GROUP NAME <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <input
                          className="form-input"
                          placeholder="e.g. Wholesale Customers"
                          value={newGroup.name}
                          maxLength={100}
                          onChange={(event) => updateNewGroupField('name', event.target.value)}
                          style={{ height: 38, background: 'rgba(0,0,0,0.2)' }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: 10 }}>
                          DEFAULT CREDIT DAYS
                        </label>
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          step="1"
                          value={newGroup.defaultCreditDays}
                          onChange={(event) => updateNewGroupField('defaultCreditDays', event.target.value)}
                          style={{ height: 38, background: 'rgba(0,0,0,0.2)' }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: 10 }}>
                          DEFAULT CREDIT LIMIT
                        </label>
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newGroup.defaultCreditLimit}
                          onChange={(event) => updateNewGroupField('defaultCreditLimit', event.target.value)}
                          style={{ height: 38, background: 'rgba(0,0,0,0.2)' }}
                        />
                      </div>
                      
                      {/* Buttons Row spanning all 4 columns */}
                      <div style={{ gridColumn: 'span 4', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                        <button
                          type="button"
                          className="button-ghost"
                          onClick={() => setShowGroupForm(false)}
                          style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="button-primary"
                          disabled={isSavingGroup}
                          onClick={handleCreateCustomerGroup}
                          style={{ height: 34, padding: '0 16px', fontSize: 12 }}
                        >
                          {isSavingGroup ? 'Adding...' : 'Add Group'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        TERRITORY <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <button
                        type="button"
                        className="icon-button"
                        title="Add Territory"
                        onClick={() => setShowTerritoryForm((current) => !current)}
                        style={{ width: 24, height: 24, borderRadius: 6 }}
                      >
                        <Plus style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                    <select
                      className="form-input"
                      value={form.territoryId}
                      disabled={isLoadingLookups}
                      onChange={(event) => updateField('territoryId', event.target.value)}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)', cursor: isLoadingLookups ? 'wait' : 'pointer' }}
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
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        SALES ROUTE <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <button
                        type="button"
                        className="icon-button"
                        title="Add Sales Route"
                        onClick={() => {
                          if (!form.territoryId) {
                            toast.error('Please select a Territory first.')
                            return
                          }
                          setShowRouteForm((current) => !current)
                        }}
                        style={{ width: 24, height: 24, borderRadius: 6 }}
                      >
                        <Plus style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                    <select
                      className="form-input"
                      value={form.salesRouteId}
                      disabled={isLoadingRoutes}
                      onChange={(event) => updateField('salesRouteId', event.target.value)}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)', cursor: isLoadingRoutes ? 'wait' : 'pointer' }}
                    >
                      <option value="">{isLoadingRoutes ? 'Loading routes...' : 'Select route'}</option>
                      {form.salesRouteId && !routeOptions.some((route) => route.id === form.salesRouteId) ? (
                        <option value={form.salesRouteId}>Current route ({form.salesRouteId})</option>
                      ) : null}
                      {routeOptions.map((route) => (
                        <option key={route.id} value={route.id}>
                          {route.name} ({route.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {showTerritoryForm ? (
                    <div
                      style={{
                        gridColumn: 'span 4',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 20,
                        padding: 16,
                        border: '1px dashed var(--color-border)',
                        borderRadius: 8,
                        background: 'rgba(0,0,0,0.08)',
                        marginTop: 4,
                        marginBottom: 4,
                      }}
                    >
                      {businessUnits.length > 1 ? (
                        <div>
                          <label className="form-label" style={{ fontSize: 10 }}>
                            BUSINESS UNIT
                          </label>
                          <select
                            className="form-input"
                            value={newTerritory.businessUnitId}
                            onChange={(event) => updateNewTerritoryField('businessUnitId', event.target.value)}
                            style={{ height: 38, background: 'rgba(0,0,0,0.2)', cursor: 'pointer' }}
                          >
                            {businessUnits.map((bu) => (
                              <option key={bu.id} value={bu.id}>
                                {bu.name} ({bu.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                      <div style={{ gridColumn: businessUnits.length > 1 ? 'span 1' : 'span 1' }}>
                        <label className="form-label" style={{ fontSize: 10 }}>
                          NEW TERRITORY CODE <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <input
                          className="form-input"
                          placeholder="e.g. TR-COLOMBO"
                          value={newTerritory.code}
                          maxLength={20}
                          onChange={(event) => updateNewTerritoryField('code', event.target.value.toUpperCase())}
                          style={{ height: 38, background: 'rgba(0,0,0,0.2)' }}
                        />
                      </div>
                      <div style={{ gridColumn: businessUnits.length > 1 ? 'span 1' : 'span 2' }}>
                        <label className="form-label" style={{ fontSize: 10 }}>
                          NEW TERRITORY NAME <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <input
                          className="form-input"
                          placeholder="e.g. Colombo Region"
                          value={newTerritory.name}
                          maxLength={150}
                          onChange={(event) => updateNewTerritoryField('name', event.target.value)}
                          style={{ height: 38, background: 'rgba(0,0,0,0.2)' }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: 10 }}>
                          DESCRIPTION
                        </label>
                        <input
                          className="form-input"
                          placeholder="Optional description"
                          value={newTerritory.description}
                          maxLength={200}
                          onChange={(event) => updateNewTerritoryField('description', event.target.value)}
                          style={{ height: 38, background: 'rgba(0,0,0,0.2)' }}
                        />
                      </div>

                      {/* Buttons Row */}
                      <div style={{ gridColumn: 'span 4', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                        <button
                          type="button"
                          className="button-ghost"
                          onClick={() => setShowTerritoryForm(false)}
                          style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="button-primary"
                          disabled={isSavingTerritory}
                          onClick={handleCreateTerritory}
                          style={{ height: 34, padding: '0 16px', fontSize: 12 }}
                        >
                          {isSavingTerritory ? 'Adding...' : 'Add Territory'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {showRouteForm ? (
                    <div
                      style={{
                        gridColumn: 'span 4',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 20,
                        padding: 16,
                        border: '1px dashed var(--color-border)',
                        borderRadius: 8,
                        background: 'rgba(0,0,0,0.08)',
                        marginTop: 4,
                        marginBottom: 4,
                      }}
                    >
                      <div>
                        <label className="form-label" style={{ fontSize: 10 }}>
                          NEW ROUTE CODE <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <input
                          className="form-input"
                          placeholder="e.g. CMB-01"
                          value={newRoute.code}
                          maxLength={20}
                          onChange={(event) => updateNewRouteField('code', event.target.value.toUpperCase())}
                          style={{ height: 38, background: 'rgba(0,0,0,0.2)' }}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label" style={{ fontSize: 10 }}>
                          NEW ROUTE NAME <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <input
                          className="form-input"
                          placeholder="e.g. Colombo Central"
                          value={newRoute.name}
                          maxLength={100}
                          onChange={(event) => updateNewRouteField('name', event.target.value)}
                          style={{ height: 38, background: 'rgba(0,0,0,0.2)' }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: 10 }}>
                          DEFAULT EMPLOYEE ID
                        </label>
                        <input
                          className="form-input"
                          placeholder="Optional Employee ID"
                          value={newRoute.defaultEmployeeId}
                          maxLength={50}
                          onChange={(event) => updateNewRouteField('defaultEmployeeId', event.target.value)}
                          style={{ height: 38, background: 'rgba(0,0,0,0.2)' }}
                        />
                      </div>

                      {/* Buttons Row */}
                      <div style={{ gridColumn: 'span 4', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                        <button
                          type="button"
                          className="button-ghost"
                          onClick={() => setShowRouteForm(false)}
                          style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="button-primary"
                          disabled={isSavingRoute}
                          onClick={handleCreateSalesRoute}
                          style={{ height: 34, padding: '0 16px', fontSize: 12 }}
                        >
                          {isSavingRoute ? 'Adding...' : 'Add Route'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="form-label">
                      PREFERRED PAYMENT
                    </label>
                    <select
                      className="form-input"
                      value={form.preferredPaymentMethod}
                      disabled={!!editingCustomer}
                      onChange={(event) => updateField('preferredPaymentMethod', event.target.value)}
                      style={{
                        height: 42,
                        background: 'rgba(0,0,0,0.15)',
                        cursor: editingCustomer ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      height: 42,
                      marginTop: 22,
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 13,
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.isVatRegistered}
                        onChange={(event) => updateField('isVatRegistered', event.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-amber)' }}
                      />
                      VAT Registered
                    </label>
                  </div>

                  <div>
                    <label className="form-label">
                      REGISTRATION NUMBER {form.isVatRegistered && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                    </label>
                    <input
                      className="form-input"
                      placeholder={form.isVatRegistered ? 'Required' : 'Optional'}
                      value={form.registrationNumber}
                      maxLength={50}
                      onChange={(event) => updateField('registrationNumber', event.target.value)}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      TIN {form.isVatRegistered && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                    </label>
                    <input
                      className="form-input"
                      placeholder={form.isVatRegistered ? '9 digits required' : 'Optional'}
                      value={form.taxNumber}
                      maxLength={9}
                      onChange={(event) => updateField('taxNumber', event.target.value.replace(/\D/g, ''))}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      LATITUDE
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.000001"
                      placeholder={editingCustomer ? 'Not specified' : 'Optional'}
                      value={form.geoLatitude}
                      disabled={!!editingCustomer}
                      onChange={(event) => updateField('geoLatitude', event.target.value)}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      LONGITUDE
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.000001"
                      placeholder={editingCustomer ? 'Not specified' : 'Optional'}
                      value={form.geoLongitude}
                      disabled={!!editingCustomer}
                      onChange={(event) => updateField('geoLongitude', event.target.value)}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      GROUP CREDIT LIMIT
                    </label>
                    <input
                      className="form-input"
                      value={selectedGroup ? `Rs. ${formatMoney(selectedGroup.defaultCreditLimit)}` : '-'}
                      disabled
                      style={{
                        height: 42,
                        background: 'rgba(0,0,0,0.08)',
                        color: 'var(--color-text-muted)',
                        cursor: 'not-allowed',
                      }}
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      GROUP CREDIT DAYS
                    </label>
                    <input
                      className="form-input"
                      value={selectedGroup ? `${selectedGroup.defaultCreditDays} Days` : '-'}
                      disabled
                      style={{
                        height: 42,
                        background: 'rgba(0,0,0,0.08)',
                        color: 'var(--color-text-muted)',
                        cursor: 'not-allowed',
                      }}
                    />
                  </div>
                </div>

                {/* Primary Contact Section */}
                <h3
                  style={{
                    margin: '12px 0 0 0',
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: 6,
                  }}
                >
                  Primary Contact
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 20,
                  }}
                >
                  <div>
                    <label className="form-label">
                      CONTACT TYPE
                    </label>
                    <select
                      className="form-input"
                      value={form.contactType}
                      disabled={!!editingCustomer}
                      onChange={(event) => updateField('contactType', event.target.value)}
                      style={{
                        height: 42,
                        background: 'rgba(0,0,0,0.15)',
                        cursor: editingCustomer ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {contactTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">
                      CONTACT NAME
                    </label>
                    <input
                      className="form-input"
                      placeholder={editingCustomer ? 'Not specified' : 'Contact name'}
                      value={form.contactFullName}
                      disabled={!!editingCustomer}
                      onChange={(event) => updateField('contactFullName', event.target.value)}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      CONTACT PHONE
                    </label>
                    <input
                      className="form-input"
                      placeholder={editingCustomer ? 'Not specified' : 'Phone'}
                      value={form.contactPhone}
                      disabled={!!editingCustomer}
                      onChange={(event) => updateField('contactPhone', event.target.value)}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      CONTACT EMAIL
                    </label>
                    <input
                      className="form-input"
                      placeholder={editingCustomer ? 'Not specified' : 'Email'}
                      value={form.contactEmail}
                      disabled={!!editingCustomer}
                      onChange={(event) => updateField('contactEmail', event.target.value)}
                      style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                    />
                  </div>
                </div>

                {/* Additional Contacts Section */}
                {form.additionalContacts && form.additionalContacts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
                    {form.additionalContacts.map((contact, index) => (
                      <div
                        key={index}
                        style={{
                          borderTop: '1px dashed var(--color-border)',
                          paddingTop: 16,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                          Additional Contact #{index + 1}
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 20,
                          }}
                        >
                          <div>
                            <label className="form-label">
                              CONTACT TYPE
                            </label>
                            <select
                              className="form-input"
                              value={contact.contactType}
                              disabled={!!editingCustomer}
                              onChange={(event) => updateAdditionalContact(index, 'contactType', event.target.value)}
                              style={{
                                height: 42,
                                background: 'rgba(0,0,0,0.15)',
                                cursor: editingCustomer ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {contactTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="form-label">
                              CONTACT NAME
                            </label>
                            <input
                              className="form-input"
                              placeholder={editingCustomer ? 'Not specified' : 'Contact name'}
                              value={contact.fullName}
                              disabled={!!editingCustomer}
                              onChange={(event) => updateAdditionalContact(index, 'fullName', event.target.value)}
                              style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                            />
                          </div>
                          <div>
                            <label className="form-label">
                              CONTACT PHONE
                            </label>
                            <input
                              className="form-input"
                              placeholder={editingCustomer ? 'Not specified' : 'Phone'}
                              value={contact.phone}
                              disabled={!!editingCustomer}
                              onChange={(event) => updateAdditionalContact(index, 'phone', event.target.value)}
                              style={{ height: 42, background: 'rgba(0,0,0,0.15)' }}
                            />
                          </div>
                          <div>
                            <label className="form-label">
                              CONTACT EMAIL
                            </label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input
                                className="form-input"
                                placeholder={editingCustomer ? 'Not specified' : 'Email'}
                                value={contact.email}
                                disabled={!!editingCustomer}
                                onChange={(event) => updateAdditionalContact(index, 'email', event.target.value)}
                                style={{ height: 42, background: 'rgba(0,0,0,0.15)', flex: 1, minWidth: 0 }}
                              />
                              {!editingCustomer && (
                                <button
                                  type="button"
                                  className="icon-button"
                                  title="Remove Contact"
                                  onClick={() => removeAdditionalContact(index)}
                                  style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: 'var(--color-danger)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Trash2 style={{ width: 16, height: 16 }} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Contact Button */}
                {!editingCustomer && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={addAdditionalContact}
                      style={{
                        height: 38,
                        padding: '0 16px',
                        fontSize: 13,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        border: '1px dashed var(--color-border)',
                        background: 'transparent',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus style={{ width: 14, height: 14 }} />
                      Add Contact Number
                    </button>
                  </div>
                )}

                {/* Customer Image Section */}
                {!editingCustomer ? (
                  <>
                    <h3
                      style={{
                        margin: '12px 0 0 0',
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        borderBottom: '1px solid var(--color-border)',
                        paddingBottom: 6,
                      }}
                    >
                      Customer Image
                    </h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 20,
                        alignItems: 'end',
                      }}
                    >
                      <div>
                        <label className="form-label">
                          IMAGE TYPE
                        </label>
                        <select
                          className="form-input"
                          value={imageType}
                          onChange={(event) => setImageType(event.target.value)}
                          style={{ height: 42, background: 'rgba(0,0,0,0.15)', cursor: 'pointer' }}
                        >
                          {imageTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">
                          CHOOSE IMAGE FILE
                        </label>
                        <input
                          className="form-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                          style={{ height: 42, paddingTop: 8, background: 'rgba(0,0,0,0.15)' }}
                        />
                      </div>
                      <div style={{ paddingBottom: 6 }}>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                          {cloudinaryConfigured
                            ? 'Image will upload to Cloudinary when you save.'
                            : 'Cloudinary configuration is missing.'}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3
                      style={{
                        margin: '12px 0 0 0',
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        borderBottom: '1px solid var(--color-border)',
                        paddingBottom: 6,
                      }}
                    >
                      Customer Images
                    </h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 20,
                        alignItems: 'end',
                      }}
                    >
                      <div>
                        <label className="form-label">
                          CURRENT IMAGES
                        </label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', height: 42, alignItems: 'center' }}>
                          {editingCustomer.images?.length ? (
                            editingCustomer.images.map((image) => (
                              <img
                                key={image.id || image.imageUrl}
                                src={getCloudinaryImageUrl(image.imageUrl)}
                                alt="Customer"
                                style={{
                                  width: 38,
                                  height: 38,
                                  objectFit: 'cover',
                                  borderRadius: 6,
                                  border: '1px solid var(--color-border)',
                                }}
                              />
                            ))
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>None</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="form-label">
                          IMAGE TYPE
                        </label>
                        <select
                          className="form-input"
                          value={imageType}
                          disabled
                          style={{ height: 42, background: 'rgba(0,0,0,0.15)', cursor: 'not-allowed' }}
                        >
                          {imageTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">
                          CHOOSE IMAGE FILE
                        </label>
                        <input
                          className="form-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled
                          style={{ height: 42, paddingTop: 8, background: 'rgba(0,0,0,0.15)', cursor: 'not-allowed' }}
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          className="button-secondary"
                          disabled
                          style={{
                            height: 42,
                            fontSize: 12,
                            display: 'inline-flex',
                            gap: 6,
                            width: '100%',
                            justifyContent: 'center',
                            cursor: 'not-allowed',
                          }}
                        >
                          <ImageUp style={{ width: 14, height: 14 }} />
                          Upload
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4, marginTop: 4 }}>
                      Adding images to an existing customer needs a backend endpoint that accepts a
                      Cloudinary image path.
                    </p>
                  </>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                  padding: '16px 32px 18px 32px',
                  borderTop: '1px solid var(--color-border)',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  data-skip-focus="true"
                  className="button-ghost"
                  onClick={closeModal}
                  style={{ minWidth: 110, height: 42 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={isSaving}
                  style={{ minWidth: 150, height: 42 }}
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
