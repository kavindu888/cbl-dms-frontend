import { ImageUp, Pencil, Plus, Search, Trash2, X, Copy, Globe, Store } from 'lucide-react'
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
  creditLimit: '0',
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

function formatMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0.00'
  return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildCreatePayload(form) {
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

  return {
    customerGroupId: form.customerGroupId,
    salesRouteId: form.salesRouteId,
    code: toCustomerCode(form.code),
    name: form.name.trim(),
    preferredPaymentMethod: Number(form.preferredPaymentMethod),
    creditLimit: Number(form.creditLimit || 0),
    isVatRegistered: form.isVatRegistered,
    registrationNumber: form.registrationNumber.trim() || null,
    taxNumber: form.taxNumber.trim() || null,
    geoLatitude: toOptionalDecimal(form.geoLatitude),
    geoLongitude: toOptionalDecimal(form.geoLongitude),
    contacts: contacts.length > 0 ? contacts : null,
  }
}

function buildUpdatePayload(form) {
  return {
    customerGroupId: form.customerGroupId,
    territoryId: form.salesRouteId,
    code: toCustomerCode(form.code),
    name: form.name.trim(),
    creditLimit: Number(form.creditLimit || 0),
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
  const [allRoutes, setAllRoutes] = useState([])
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
      // listSalesRoutes requires territoryId — we cannot load all routes globally.
      // allRoutes is not needed for the list view (CustomerSummaryDto has no salesRouteId).
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
      if (field === 'customerGroupId' && !editingCustomer) {
        const group = groups.find((g) => g.id === value)
        if (group && group.defaultCreditLimit) {
          nextForm.creditLimit = String(group.defaultCreditLimit)
        }
      }
      return nextForm
    })
  }

  function resetForm() {
    setEditingCustomer(null)
    setForm(emptyForm)
    setPendingImages([])
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

      const primaryContact = details.contacts?.find((c) => c.isPrimary) || details.contacts?.[0]
      const otherContacts = details.contacts?.filter((c) => c !== primaryContact) || []

      setForm({
        code: details.code,
        name: details.name,
        customerGroupId: details.customerGroupId,
        territoryId: '',
        salesRouteId: details.salesRouteId,
        preferredPaymentMethod: String(details.preferredPaymentMethod),
        creditLimit: String(details.creditLimit ?? 0),
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
      : buildCreatePayload(form)

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
                  <th style={{ width: 50, textAlign: 'center' }}>Image</th>
                  <th>Code</th>
                  <th>Customer Name & Info</th>
                  <th>Group</th>
                  <th>Route & Territory</th>
                  <th>Primary Contact</th>
                  <th>Billing & Payment</th>
                  <th>Tax & VAT Details</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-sm text-text-muted">
                      Loading customers...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-sm text-danger">
                      {error}
                    </td>
                  </tr>
                ) : customers.length ? (
                  customers.map((customer) => {
                    const primaryContact =
                      customer.contacts?.find((c) => c.isPrimary) || customer.contacts?.[0]
                    const contactName = primaryContact?.fullName || '—'
                    const contactPhone = primaryContact?.phone || ''
                    const contactEmail = primaryContact?.email || ''

                    // Resolve image
                    const rawImg = customer.images?.[0]?.imageUrl
                    const customerImage = rawImg ? getR2ImageUrl(rawImg) : null

                    // Resolve route & territory
                    const route = allRoutes.find((r) => r.id === customer.salesRouteId)
                    const routeName = route ? `${route.name} (${route.code})` : '—'
                    const territory = route
                      ? territories.find((t) => t.id === route.territoryId)
                      : null
                    const territoryName = territory ? `${territory.name}` : '—'

                    return (
                      <tr key={customer.id}>
                        {/* Image */}
                        <td style={{ textAlign: 'center', width: 50 }}>
                          <div className="product-image-container" style={{ margin: '0 auto' }}>
                            {customerImage ? (
                              <img
                                src={customerImage}
                                alt={customer.name}
                                className="product-image"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  const fallback = e.target.nextSibling
                                  if (fallback) fallback.style.display = 'block'
                                }}
                              />
                            ) : null}
                            <Store
                              className="product-image-fallback"
                              style={{ display: customerImage ? 'none' : 'block' }}
                            />
                          </div>
                        </td>

                        {/* Code */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span className="product-sku-badge mono">{customer.code}</span>
                            <button
                              type="button"
                              className="copy-btn"
                              title="Copy Customer Code"
                              onClick={() => {
                                navigator.clipboard.writeText(customer.code)
                                toast.success(
                                  `Customer code "${customer.code}" copied to clipboard`
                                )
                              }}
                            >
                              <Copy style={{ width: 12, height: 12 }} />
                            </button>
                          </div>
                        </td>

                        {/* Customer Name */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span className="product-name-title">{customer.name}</span>
                            {customer.location?.latitude && customer.location?.longitude ? (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${customer.location.latitude},${customer.location.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="product-info-sub"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: 'var(--color-amber)',
                                  width: 'fit-content',
                                }}
                              >
                                <Globe style={{ width: 10, height: 10 }} />
                                GPS: {Number(customer.location.latitude).toFixed(4)},{' '}
                                {Number(customer.location.longitude).toFixed(4)}
                              </a>
                            ) : null}
                          </div>
                        </td>

                        {/* Group */}
                        <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {getGroupName(groups, customer.customerGroupId) || (
                            <span style={{ color: 'var(--color-text-dim)' }}>—</span>
                          )}
                        </td>

                        {/* Route & Territory */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span
                              className="text-sm font-medium"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {routeName}
                            </span>
                            {territoryName !== '—' && (
                              <span className="product-info-sub">Territory: {territoryName}</span>
                            )}
                          </div>
                        </td>

                        {/* Primary Contact */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span
                              className="text-sm font-medium"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {contactName}
                            </span>
                            {contactPhone && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <span
                                  className="mono text-xs"
                                  style={{ color: 'var(--color-text-dim)' }}
                                >
                                  {contactPhone}
                                </span>
                                <button
                                  type="button"
                                  className="copy-btn"
                                  title="Copy Phone"
                                  onClick={() => {
                                    navigator.clipboard.writeText(contactPhone)
                                    toast.success(`Phone copied`)
                                  }}
                                >
                                  <Copy style={{ width: 10, height: 10 }} />
                                </button>
                              </div>
                            )}
                            {contactEmail && (
                              <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                                {contactEmail}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Billing & Payment */}
                        <td>
                          <div className="uom-conversions-list">
                            <span className="uom-badge">
                              {getPaymentLabel(customer.preferredPaymentMethod)}
                            </span>
                          </div>
                        </td>

                        {/* Tax & VAT Details */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {customer.isVatRegistered ? (
                              <div className="reorder-badge">
                                <div className="reorder-badge-item">
                                  <span className="reorder-badge-label">VAT Reg:</span>
                                  <span className="mono">{customer.registrationNumber || '—'}</span>
                                </div>
                                <div className="reorder-badge-item">
                                  <span className="reorder-badge-label">TIN:</span>
                                  <span className="mono">{customer.taxNumber || '—'}</span>
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--color-text-dim)', fontSize: 12 }}>
                                Non-VAT Registered
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <StatusBadge status={customer.status} />
                        </td>

                        {/* Actions */}
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
                            style={{
                              width: 28,
                              height: 28,
                              opacity: customer.isActive ? 1 : 0.45,
                            }}
                            onClick={() => handleDeactivate(customer)}
                          >
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-sm text-text-muted">
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
                width: 'min(900px, calc(100vw - 48px))',
                maxHeight: 'min(860px, calc(100vh - 48px))',
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '24px 24px 16px',
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

              {/* Scrollable Body */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 28,
                }}
              >
                {/* Basic Information */}
                <section>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                    Basic Information
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <label>
                      <span className="form-label">Customer Code *</span>
                      <input
                        autoFocus
                        className="form-input"
                        placeholder="e.g. CUST-0001"
                        value={form.code}
                        maxLength={30}
                        onChange={(event) => updateField('code', event.target.value)}
                        style={{ height: 42 }}
                      />
                    </label>
                    <label>
                      <span className="form-label">Customer Name *</span>
                      <input
                        className="form-input"
                        placeholder="e.g. Fresh Mart Kandy"
                        value={form.name}
                        maxLength={200}
                        onChange={(event) => updateField('name', event.target.value)}
                        style={{ height: 42 }}
                      />
                    </label>
                    <label>
                      <span className="form-label">Customer Group *</span>
                      <select
                        className="form-input"
                        value={form.customerGroupId}
                        disabled={isLoadingLookups}
                        onChange={(event) => updateField('customerGroupId', event.target.value)}
                        style={{ height: 42 }}
                      >
                        <option value="">Select group</option>
                        {customerGroupOptions.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name} ({group.code})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                {/* Route Assignment */}
                <section>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                    Route Assignment
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <label>
                      <span className="form-label">Territory</span>
                      <select
                        className="form-input"
                        value={form.territoryId}
                        disabled={isLoadingLookups}
                        onChange={(event) => updateField('territoryId', event.target.value)}
                        style={{ height: 42 }}
                      >
                        <option value="">Select territory for route</option>
                        {territoryOptions.map((territory) => (
                          <option key={territory.id} value={territory.id}>
                            {territory.name} ({territory.code})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="form-label">Sales Route *</span>
                      <select
                        className="form-input"
                        value={form.salesRouteId}
                        disabled={isLoadingRoutes}
                        onChange={(event) => updateField('salesRouteId', event.target.value)}
                        style={{ height: 42 }}
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
                    </label>
                  </div>
                </section>

                {/* Payment & Tax */}
                <section>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                    Payment & Tax
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                    {!editingCustomer ? (
                      <label>
                        <span className="form-label">Preferred Payment</span>
                        <select
                          className="form-input"
                          value={form.preferredPaymentMethod}
                          onChange={(event) => updateField('preferredPaymentMethod', event.target.value)}
                          style={{ height: 42 }}
                        >
                          {paymentMethods.map((method) => (
                            <option key={method.value} value={method.value}>{method.label}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label>
                      <span className="form-label">Credit Limit</span>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.creditLimit}
                        onChange={(event) => updateField('creditLimit', event.target.value)}
                        style={{ height: 42 }}
                      />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.isVatRegistered}
                        onChange={(event) => updateField('isVatRegistered', event.target.checked)}
                      />
                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>VAT Registered</span>
                    </label>
                  </div>
                  {form.isVatRegistered ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                      <label>
                        <span className="form-label">Registration Number *</span>
                        <input
                          className="form-input"
                          placeholder="BR number"
                          value={form.registrationNumber}
                          maxLength={50}
                          onChange={(event) => updateField('registrationNumber', event.target.value)}
                          style={{ height: 42 }}
                        />
                      </label>
                      <label>
                        <span className="form-label">TIN *</span>
                        <input
                          className="form-input"
                          placeholder="9 digits required"
                          value={form.taxNumber}
                          maxLength={9}
                          onChange={(event) => updateField('taxNumber', event.target.value.replace(/\D/g, ''))}
                          style={{ height: 42 }}
                        />
                      </label>
                    </div>
                  ) : null}
                </section>

                {/* Location — create only */}
                {!editingCustomer ? (
                  <section>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                      Location{' '}
                      <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.6 }}>(optional)</span>
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <label>
                        <span className="form-label">Latitude</span>
                        <input
                          className="form-input"
                          type="number"
                          step="0.000001"
                          placeholder="e.g. 6.9271"
                          value={form.geoLatitude}
                          onChange={(event) => updateField('geoLatitude', event.target.value)}
                          style={{ height: 42 }}
                        />
                      </label>
                      <label>
                        <span className="form-label">Longitude</span>
                        <input
                          className="form-input"
                          type="number"
                          step="0.000001"
                          placeholder="e.g. 79.8612"
                          value={form.geoLongitude}
                          onChange={(event) => updateField('geoLongitude', event.target.value)}
                          style={{ height: 42 }}
                        />
                      </label>
                    </div>
                  </section>
                ) : null}

                {/* Primary Contact — create only */}
                {!editingCustomer ? (
                  <section>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                      Primary Contact
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                      <label>
                        <span className="form-label">Contact Type</span>
                        <select
                          className="form-input"
                          value={form.contactType}
                          onChange={(event) => updateField('contactType', event.target.value)}
                          style={{ height: 42 }}
                        >
                          {contactTypes.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="form-label">Contact Name</span>
                        <input
                          className="form-input"
                          placeholder="Full name"
                          value={form.contactFullName}
                          onChange={(event) => updateField('contactFullName', event.target.value)}
                          style={{ height: 42 }}
                        />
                      </label>
                      <label>
                        <span className="form-label">Phone</span>
                        <input
                          className="form-input"
                          placeholder="+94 77 000 0000"
                          value={form.contactPhone}
                          onChange={(event) => updateField('contactPhone', event.target.value)}
                          style={{ height: 42 }}
                        />
                      </label>
                      <label>
                        <span className="form-label">Email</span>
                        <input
                          className="form-input"
                          type="email"
                          placeholder="contact@example.com"
                          value={form.contactEmail}
                          onChange={(event) => updateField('contactEmail', event.target.value)}
                          style={{ height: 42 }}
                        />
                      </label>
                    </div>
                  </section>
                ) : null}

                {/* Customer Image */}
                {!editingCustomer ? (
                  <section>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                      Customer Image{' '}
                      <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.6 }}>(optional)</span>
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>
                      <label>
                        <span className="form-label">Image Type</span>
                        <select
                          className="form-input"
                          value={imageType}
                          onChange={(event) => setImageType(event.target.value)}
                          style={{ height: 42 }}
                        >
                          {imageTypes.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="form-label">Files</span>
                        <input
                          className="form-input"
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageSelection}
                          style={{ height: 42, paddingTop: 8 }}
                        />
                      </label>
                    </div>
                    {pendingImages.length ? (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {pendingImages.map((image, index) => (
                          <div
                            key={`${image.file.name}-${image.file.lastModified}-${index}`}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11, color: 'var(--color-text-muted)', padding: '6px 10px', background: 'rgba(0,0,0,0.1)', borderRadius: 6 }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {image.file.name} — {getImageTypeLabel(image.imageType)}
                            </span>
                            <button type="button" className="icon-button" aria-label={`Remove ${image.file.name}`} onClick={() => removePendingImage(index)} style={{ width: 24, height: 24, flexShrink: 0 }}>
                              <X style={{ width: 12, height: 12 }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <p style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-dim)' }}>
                      JPEG, PNG, or WebP · max 10 MB each · up to 10 files
                    </p>
                  </section>
                ) : (
                  <section>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                      Upload Image
                    </p>
                    {editingCustomer.images?.length ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                        {editingCustomer.images.map((image) => (
                          <img
                            key={image.id || image.imageUrl}
                            src={getR2ImageUrl(image.imageUrl)}
                            alt="Customer"
                            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-border)' }}
                          />
                        ))}
                      </div>
                    ) : null}
                    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>
                      <label>
                        <span className="form-label">Image Type</span>
                        <select
                          className="form-input"
                          value={imageType}
                          onChange={(event) => setImageType(event.target.value)}
                          style={{ height: 42 }}
                        >
                          {imageTypes.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="form-label">Files</span>
                        <input
                          className="form-input"
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageSelection}
                          style={{ height: 42, paddingTop: 8 }}
                        />
                      </label>
                    </div>
                    {pendingImages.length ? (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {pendingImages.map((image, index) => (
                          <div
                            key={`${image.file.name}-${image.file.lastModified}-${index}`}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11, color: 'var(--color-text-muted)', padding: '6px 10px', background: 'rgba(0,0,0,0.1)', borderRadius: 6 }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {image.file.name} — {getImageTypeLabel(image.imageType)}
                            </span>
                            <button type="button" className="icon-button" aria-label={`Remove ${image.file.name}`} onClick={() => removePendingImage(index)} style={{ width: 24, height: 24, flexShrink: 0 }}>
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
                      style={{ marginTop: 14, height: 36, fontSize: 12, display: 'inline-flex', gap: 6 }}
                    >
                      <ImageUp style={{ width: 14, height: 14 }} />
                      {isSaving
                        ? 'Uploading...'
                        : pendingImages.length
                          ? `Upload ${pendingImages.length} Image${pendingImages.length === 1 ? '' : 's'}`
                          : 'Upload Images'}
                    </button>
                    <p style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-dim)' }}>
                      JPEG, PNG, or WebP · max 10 MB each · up to 10 files
                    </p>
                  </section>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '16px 24px',
                  borderTop: '1px solid var(--color-border)',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  data-skip-focus="true"
                  className="button-ghost"
                  onClick={closeModal}
                  style={{ flex: 1, height: 42, fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={isSaving}
                  style={{ flex: 1, height: 42, fontSize: 13 }}
                >
                  {isSaving ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  )
}
