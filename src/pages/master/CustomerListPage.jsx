import { ImageUp, Pencil, Plus, Search, Trash2, X, Copy, Globe, Store } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  creditLimit: '0',
  creditPeriodDays: '0',
  isVatRegistered: false,
  taxNumber: '',
  contactFullName: '',
  contactPhone: '',
  contactEmail: '',
  contactType: '0',
  additionalContacts: [],
}

const pageSize = 7

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
    creditLimit: Number(form.creditLimit || 0),
    creditPeriodDays: Number(form.creditPeriodDays || 0),
    isVatRegistered: form.isVatRegistered,
    taxNumber: form.taxNumber.trim() || null,
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
    creditPeriodDays: Number(form.creditPeriodDays || 0),
    isVatRegistered: form.isVatRegistered,
    taxNumber: form.taxNumber.trim() || null,
  }
}

function getContactTypeLabel(value) {
  return contactTypes.find((t) => Number(t.value) === Number(value))?.label || 'Other'
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
  const [routeCache, setRouteCache] = useState({})
  const routeCacheRef = useRef({})

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

  // Contact management for edit modal
  const [contactEditId, setContactEditId] = useState(null)
  const [contactEditForm, setContactEditForm] = useState({
    contactType: '0',
    fullName: '',
    phone: '',
    email: '',
  })
  const [showAddContact, setShowAddContact] = useState(false)
  const [addContactForm, setAddContactForm] = useState({
    contactType: '0',
    fullName: '',
    phone: '',
    email: '',
    isPrimary: false,
  })
  const [isSavingContact, setIsSavingContact] = useState(false)

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

  const resolveRoutes = useCallback(async (customers) => {
    const ids = [...new Set(customers.map((c) => c.salesRouteId).filter(Boolean))]
    const toFetch = ids.filter((id) => !(id in routeCacheRef.current))
    if (!toFetch.length) return

    const updates = { ...routeCacheRef.current }
    await Promise.allSettled(
      toFetch.map(async (id) => {
        try {
          updates[id] = await masterService.getSalesRoute(id)
        } catch {
          updates[id] = null
        }
      })
    )
    routeCacheRef.current = updates
    setRouteCache({ ...updates })
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

      const loadedCustomers = result.items || []
      setCustomers(loadedCustomers)
      setTotalItems(result.totalItems || 0)
      setTotalPages(Math.max(1, result.totalPages || 1))
      resolveRoutes(loadedCustomers)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load customers.'))
    } finally {
      setIsLoading(false)
    }
  }, [customerStatus, page, search, resolveRoutes])

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
      // Ensure creditPeriodDays is always a valid string representation of a number
      if (field === 'creditPeriodDays') {
        nextForm.creditPeriodDays = String(value || 0)
      }
      return nextForm
    })
  }

  function resetForm() {
    setEditingCustomer(null)
    setForm(emptyForm)
    setPendingImages([])
    setImageType('2')
    setContactEditId(null)
    setContactEditForm({ contactType: '0', fullName: '', phone: '', email: '' })
    setShowAddContact(false)
    setAddContactForm({ contactType: '0', fullName: '', phone: '', email: '', isPrimary: false })
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

  async function handleSaveAddContact() {
    if (!addContactForm.fullName.trim() || !addContactForm.phone.trim()) {
      toast.error('Contact name and phone are required.')
      return
    }
    setIsSavingContact(true)
    try {
      await salesService.addCustomerContact(editingCustomer.id, {
        contactType: Number(addContactForm.contactType),
        fullName: addContactForm.fullName.trim(),
        phone: addContactForm.phone.trim(),
        email: addContactForm.email.trim() || null,
        isPrimary: addContactForm.isPrimary,
      })
      toast.success('Contact added.')
      setShowAddContact(false)
      setAddContactForm({ contactType: '0', fullName: '', phone: '', email: '', isPrimary: false })
      const updated = await salesService.getCustomer(editingCustomer.id)
      setEditingCustomer(updated)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to add contact.'))
    } finally {
      setIsSavingContact(false)
    }
  }

  async function handleSaveEditContact(contactId) {
    if (!contactEditForm.fullName.trim() || !contactEditForm.phone.trim()) {
      toast.error('Contact name and phone are required.')
      return
    }
    setIsSavingContact(true)
    try {
      await salesService.updateCustomerContact(editingCustomer.id, contactId, {
        contactType: Number(contactEditForm.contactType),
        fullName: contactEditForm.fullName.trim(),
        phone: contactEditForm.phone.trim(),
        email: contactEditForm.email.trim() || null,
      })
      toast.success('Contact updated.')
      setContactEditId(null)
      const updated = await salesService.getCustomer(editingCustomer.id)
      setEditingCustomer(updated)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to update contact.'))
    } finally {
      setIsSavingContact(false)
    }
  }

  async function handleRemoveContact(contactId) {
    if (!window.confirm('Remove this contact?')) return
    setIsSavingContact(true)
    try {
      await salesService.removeCustomerContact(editingCustomer.id, contactId)
      toast.success('Contact removed.')
      const updated = await salesService.getCustomer(editingCustomer.id)
      setEditingCustomer(updated)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to remove contact.'))
    } finally {
      setIsSavingContact(false)
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

  function handleAdd() {
    resetForm()
    window.setTimeout(() => {
      document.querySelector('input[placeholder="e.g. CUST-0001"]')?.focus()
    }, 0)
  }

  function handleCancel() {
    resetForm()
  }

  async function openEdit(customer) {
    setIsSaving(true)

    try {
      const details = await salesService.getCustomer(customer.id)

      // Resolve the territory for the customer's assigned route so the
      // territory dropdown pre-selects correctly and routes load with real names.
      let territoryId = ''
      if (details.salesRouteId) {
        try {
          const route = await masterService.getSalesRoute(details.salesRouteId)
          territoryId = route?.territoryId || ''
        } catch {
          // Non-fatal — territory stays blank, user can pick manually
        }
      }

      setEditingCustomer(details)
      window.setTimeout(() => {
        document.querySelector('input[placeholder="e.g. CUST-0001"]')?.focus()
      }, 0)

      const primaryContact = details.contacts?.find((c) => c.isPrimary) || details.contacts?.[0]
      const otherContacts = details.contacts?.filter((c) => c !== primaryContact) || []

      setForm({
        code: details.code,
        name: details.name,
        customerGroupId: details.customerGroupId,
        territoryId,
        salesRouteId: details.salesRouteId,
        creditLimit: String(details.creditLimit ?? 0),
        creditPeriodDays: String(details.creditPeriodDays ?? 0),
        isVatRegistered: details.isVatRegistered,
        taxNumber: details.taxNumber || '',
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

  async function handleDeleteImage(imageId) {
    if (!window.confirm('Remove this image permanently?')) return
    setIsSaving(true)
    try {
      await salesService.deleteCustomerImage(editingCustomer.id, imageId)
      toast.success('Image removed.')
      const updated = await salesService.getCustomer(editingCustomer.id)
      setEditingCustomer(updated)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to remove image.'))
    } finally {
      setIsSaving(false)
    }
  }

  function validatePayload(payload) {
    if (!payload.code || !payload.name) {
      toast.error('Customer code and name are required.')
      return false
    }
    if (!(payload.salesRouteId || payload.territoryId)) {
      toast.error('Sales route is required.')
      return false
    }
    if (payload.isVatRegistered) {
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

    const payload = editingCustomer ? buildUpdatePayload(form) : buildCreatePayload(form)

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
      resetForm()
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
        resetForm()
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
          gridTemplateColumns: 'minmax(0, 1fr) 480px',
          gap: 16,
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
          <div style={{ minHeight: 0, overflowY: 'hidden' }}>
            <table className="data-table master-table-compact" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 50, textAlign: 'center' }}>Image</th>
                  <th>Code</th>
                  <th>Customer Name & Info</th>
                  <th>Group</th>
                  <th>Route & Territory</th>
                  <th>Primary Contact</th>
                  {/* <th>Payment & Tax</th> */}
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-text-muted">
                      Loading customers...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-danger">
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

                    // Resolve route & territory from background-loaded cache
                    const routeObj = customer.salesRouteId
                      ? routeCache[customer.salesRouteId]
                      : null
                    const routeName = routeObj
                      ? `${routeObj.name} (${routeObj.code})`
                      : customer.salesRouteId && !(customer.salesRouteId in routeCache)
                        ? '...'
                        : '—'
                    const territory = routeObj
                      ? territories.find((t) => t.id === routeObj.territoryId)
                      : null
                    const territoryName = territory ? territory.name : '—'

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

                        {/* Payment & Tax */}
                        {/* <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div className="uom-conversions-list">
                              <span className="uom-badge">
                                {getPaymentLabel(customer.preferredPaymentMethod)}
                              </span>
                            </div>
                            {customer.isVatRegistered ? (
                              <div className="reorder-badge">
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
                        </td> */}

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
                    <td colSpan={9} className="py-12 text-center text-sm text-text-muted">
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

        <form
          onSubmit={handleSave}
          onKeyDown={handleFormKeyDown}
          className="panel"
          style={{
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              paddingBottom: 10,
              borderBottom: '1px solid var(--color-border)',
              flexShrink: 0,
            }}
          >
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 650, color: 'var(--color-text-primary)' }}>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <p
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.35,
                }}
              >
                Customer organization is taken from your signed-in session.
              </p>
            </div>
            {editingCustomer ? (
              <button
                type="button"
                className="button-ghost"
                onClick={handleCancel}
                style={{ padding: '5px 10px', height: 'auto', fontSize: 12 }}
              >
                Clear
              </button>
            ) : null}
          </div>

          {/* Basic Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="eyebrow" style={{ fontSize: 10 }}>
              Basic Information
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12 }}>
              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Customer Code *
                </label>
                <input
                  className="form-input"
                  placeholder="e.g. CUST-0001"
                  value={form.code}
                  maxLength={30}
                  onChange={(event) => updateField('code', event.target.value)}
                  style={{ height: 38 }}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                    marginBottom: 4,
                  }}
                >
                  <label className="form-label" style={{ fontSize: 10, marginBottom: 0 }}>
                    Customer Group *
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    title="Add Customer Group"
                    onClick={() => setShowGroupForm((current) => !current)}
                    style={{ width: 22, height: 22, borderRadius: 4 }}
                  >
                    <Plus style={{ width: 12, height: 12 }} />
                  </button>
                </div>
                <select
                  className="form-input"
                  value={form.customerGroupId}
                  disabled={isLoadingLookups}
                  onChange={(event) => updateField('customerGroupId', event.target.value)}
                  style={{ height: 38, fontSize: 13 }}
                >
                  <option value="">Select group</option>
                  {customerGroupOptions.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Group Inline Addition */}
            {showGroupForm && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.2fr',
                  gap: 8,
                  padding: 10,
                  border: '1px dashed var(--color-border)',
                  borderRadius: 6,
                  background: 'rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ gridColumn: 'span 2' }}>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--color-text-dim)',
                      marginBottom: 6,
                    }}
                  >
                    NEW CUSTOMER GROUP
                  </p>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 9 }}>
                    Code *
                  </label>
                  <input
                    className="form-input"
                    placeholder="e.g. RET"
                    value={newGroup.code}
                    maxLength={30}
                    onChange={(e) => updateNewGroupField('code', e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 9 }}>
                    Name *
                  </label>
                  <input
                    className="form-input"
                    placeholder="e.g. Retail"
                    value={newGroup.name}
                    maxLength={200}
                    onChange={(e) => updateNewGroupField('name', e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 9 }}>
                    Credit Days
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={newGroup.defaultCreditDays}
                    onChange={(e) => updateNewGroupField('defaultCreditDays', e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 9 }}>
                    Credit Limit (Rs.)
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={newGroup.defaultCreditLimit}
                    onChange={(e) => updateNewGroupField('defaultCreditLimit', e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className="button-ghost"
                    onClick={() => setShowGroupForm(false)}
                    style={{ flex: 1, height: 32, fontSize: 11 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    disabled={isSavingGroup}
                    onClick={handleCreateCustomerGroup}
                    style={{ flex: 1.5, height: 32, fontSize: 11 }}
                  >
                    {isSavingGroup ? '...' : 'Add Group'}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="form-label" style={{ fontSize: 10 }}>
                Customer Name *
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
          </div>

          {/* Route Assignment */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              borderTop: '1px solid var(--color-border)',
              paddingTop: 12,
            }}
          >
            <p className="eyebrow" style={{ fontSize: 10 }}>
              Route Assignment
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                    marginBottom: 4,
                  }}
                >
                  <label className="form-label" style={{ fontSize: 10, marginBottom: 0 }}>
                    Territory
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    title="Add Territory"
                    onClick={() => setShowTerritoryForm((current) => !current)}
                    style={{ width: 22, height: 22, borderRadius: 4 }}
                  >
                    <Plus style={{ width: 12, height: 12 }} />
                  </button>
                </div>
                <select
                  className="form-input"
                  value={form.territoryId}
                  disabled={isLoadingLookups}
                  onChange={(event) => updateField('territoryId', event.target.value)}
                  style={{ height: 38, fontSize: 13 }}
                >
                  <option value="">Select territory</option>
                  {territoryOptions.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name}
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
                    gap: 4,
                    marginBottom: 4,
                  }}
                >
                  <label className="form-label" style={{ fontSize: 10, marginBottom: 0 }}>
                    Sales Route *
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    title="Add Route"
                    disabled={!form.territoryId}
                    onClick={() => setShowRouteForm((current) => !current)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      opacity: form.territoryId ? 1 : 0.5,
                    }}
                  >
                    <Plus style={{ width: 12, height: 12 }} />
                  </button>
                </div>
                <select
                  className="form-input"
                  value={form.salesRouteId}
                  disabled={isLoadingRoutes}
                  onChange={(event) => updateField('salesRouteId', event.target.value)}
                  style={{ height: 38, fontSize: 13 }}
                >
                  <option value="">{isLoadingRoutes ? 'Loading routes...' : 'Select route'}</option>
                  {form.salesRouteId &&
                  !routeOptions.some((route) => route.id === form.salesRouteId) ? (
                    <option value={form.salesRouteId}>Current route ({form.salesRouteId})</option>
                  ) : null}
                  {routeOptions.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Territory Inline Addition */}
            {showTerritoryForm && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.2fr',
                  gap: 8,
                  padding: 10,
                  border: '1px dashed var(--color-border)',
                  borderRadius: 6,
                  background: 'rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ gridColumn: 'span 2' }}>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--color-text-dim)',
                      marginBottom: 6,
                    }}
                  >
                    NEW TERRITORY
                  </p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: 9 }}>
                    Business Unit *
                  </label>
                  <select
                    className="form-input"
                    value={newTerritory.businessUnitId}
                    onChange={(e) => updateNewTerritoryField('businessUnitId', e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  >
                    {businessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 9 }}>
                    Code *
                  </label>
                  <input
                    className="form-input"
                    placeholder="e.g. KAN-T"
                    value={newTerritory.code}
                    maxLength={30}
                    onChange={(e) => updateNewTerritoryField('code', e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 9 }}>
                    Name *
                  </label>
                  <input
                    className="form-input"
                    placeholder="e.g. Kandy East"
                    value={newTerritory.name}
                    maxLength={200}
                    onChange={(e) => updateNewTerritoryField('name', e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: 9 }}>
                    Description
                  </label>
                  <input
                    className="form-input"
                    placeholder="Optional description"
                    value={newTerritory.description}
                    onChange={(e) => updateNewTerritoryField('description', e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className="button-ghost"
                    onClick={() => setShowTerritoryForm(false)}
                    style={{ flex: 1, height: 32, fontSize: 11 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    disabled={isSavingTerritory}
                    onClick={handleCreateTerritory}
                    style={{ flex: 1.5, height: 32, fontSize: 11 }}
                  >
                    {isSavingTerritory ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            )}

            {/* Route Inline Addition */}
            {showRouteForm && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.2fr',
                  gap: 8,
                  padding: 10,
                  border: '1px dashed var(--color-border)',
                  borderRadius: 6,
                  background: 'rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ gridColumn: 'span 2' }}>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--color-text-dim)',
                      marginBottom: 6,
                    }}
                  >
                    NEW SALES ROUTE
                  </p>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 9 }}>
                    Code *
                  </label>
                  <input
                    className="form-input"
                    placeholder="e.g. KAN-R1"
                    value={newRoute.code}
                    maxLength={30}
                    onChange={(e) => updateNewRouteField('code', e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 9 }}>
                    Name *
                  </label>
                  <input
                    className="form-input"
                    placeholder="e.g. Route 01"
                    value={newRoute.name}
                    maxLength={200}
                    onChange={(e) => updateNewRouteField('name', e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: 9 }}>
                    Default Employee ID
                  </label>
                  <input
                    className="form-input"
                    placeholder="Optional employee code"
                    value={newRoute.defaultEmployeeId}
                    onChange={(e) => updateNewRouteField('defaultEmployeeId', e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className="button-ghost"
                    onClick={() => setShowRouteForm(false)}
                    style={{ flex: 1, height: 32, fontSize: 11 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    disabled={isSavingRoute}
                    onClick={handleCreateSalesRoute}
                    style={{ flex: 1.5, height: 32, fontSize: 11 }}
                  >
                    {isSavingRoute ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment & Tax */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              borderTop: '1px solid var(--color-border)',
              paddingTop: 12,
            }}
          >
            <p className="eyebrow" style={{ fontSize: 10 }}>
              Payment & Tax
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Credit Limit
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.creditLimit}
                  onChange={(event) => updateField('creditLimit', event.target.value)}
                  style={{ height: 38 }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Credit Period (Days)
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.creditPeriodDays || '0'}
                  onChange={(event) => updateField('creditPeriodDays', event.target.value)}
                  style={{ height: 38 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isVatRegistered}
                  onChange={(event) => updateField('isVatRegistered', event.target.checked)}
                  style={{ width: 15, height: 15, accentColor: 'var(--color-amber)' }}
                />
                VAT Registered
              </label>
            </div>

            {form.isVatRegistered && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: 10 }}>
                    TIN *
                  </label>
                  <input
                    className="form-input"
                    placeholder="9 digits"
                    value={form.taxNumber}
                    maxLength={9}
                    onChange={(event) =>
                      updateField('taxNumber', event.target.value.replace(/\D/g, ''))
                    }
                    style={{ height: 38 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Primary Contact — create only */}
          {!editingCustomer && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                borderTop: '1px solid var(--color-border)',
                paddingTop: 12,
              }}
            >
              <p className="eyebrow" style={{ fontSize: 10 }}>
                Primary Contact
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: 10 }}>
                    Contact Type
                  </label>
                  <select
                    className="form-input"
                    value={form.contactType}
                    onChange={(event) => updateField('contactType', event.target.value)}
                    style={{ height: 38, fontSize: 13 }}
                  >
                    {contactTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>
                    Contact Name
                  </label>
                  <input
                    className="form-input"
                    placeholder="Full name"
                    value={form.contactFullName}
                    onChange={(event) => updateField('contactFullName', event.target.value)}
                    style={{ height: 38 }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>
                    Phone
                  </label>
                  <input
                    className="form-input"
                    placeholder="+94 77 000 0000"
                    value={form.contactPhone}
                    onChange={(event) => updateField('contactPhone', event.target.value)}
                    style={{ height: 38 }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: 10 }}>
                    Email
                  </label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="contact@example.com"
                    value={form.contactEmail}
                    onChange={(event) => updateField('contactEmail', event.target.value)}
                    style={{ height: 38 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contacts — edit mode only */}
          {editingCustomer && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                borderTop: '1px solid var(--color-border)',
                paddingTop: 12,
              }}
            >
              <p className="eyebrow" style={{ fontSize: 10 }}>
                Contacts
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {editingCustomer.contacts
                  ?.filter((c) => c.isActive)
                  .map((contact) =>
                    contactEditId === contact.id ? (
                      <div
                        key={contact.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 10,
                          padding: 10,
                          border: '1px solid var(--color-border)',
                          borderRadius: 6,
                          background: 'rgba(0,0,0,0.12)',
                        }}
                      >
                        <div style={{ gridColumn: 'span 2' }}>
                          <label className="form-label" style={{ fontSize: 9 }}>
                            Type
                          </label>
                          <select
                            className="form-input"
                            value={contactEditForm.contactType}
                            onChange={(e) =>
                              setContactEditForm((f) => ({ ...f, contactType: e.target.value }))
                            }
                            style={{ height: 34, fontSize: 12 }}
                          >
                            {contactTypes.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: 9 }}>
                            Full Name *
                          </label>
                          <input
                            className="form-input"
                            value={contactEditForm.fullName}
                            onChange={(e) =>
                              setContactEditForm((f) => ({ ...f, fullName: e.target.value }))
                            }
                            style={{ height: 34, fontSize: 12 }}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: 9 }}>
                            Phone *
                          </label>
                          <input
                            className="form-input"
                            value={contactEditForm.phone}
                            onChange={(e) =>
                              setContactEditForm((f) => ({ ...f, phone: e.target.value }))
                            }
                            style={{ height: 34, fontSize: 12 }}
                          />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label className="form-label" style={{ fontSize: 9 }}>
                            Email
                          </label>
                          <input
                            className="form-input"
                            type="email"
                            value={contactEditForm.email}
                            onChange={(e) =>
                              setContactEditForm((f) => ({ ...f, email: e.target.value }))
                            }
                            style={{ height: 34, fontSize: 12 }}
                          />
                        </div>
                        <div
                          style={{ gridColumn: 'span 2', display: 'flex', gap: 8, marginTop: 4 }}
                        >
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() => setContactEditId(null)}
                            style={{ flex: 1, height: 32, fontSize: 11 }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="button-primary"
                            disabled={isSavingContact}
                            onClick={() => handleSaveEditContact(contact.id)}
                            style={{ flex: 1.5, height: 32, fontSize: 11 }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={contact.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: 'rgba(0,0,0,0.12)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--color-text-primary)',
                              }}
                            >
                              {contact.fullName}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)',
                                padding: '1px 4px',
                                borderRadius: 3,
                              }}
                            >
                              {getContactTypeLabel(contact.contactType)}
                            </span>
                            {contact.isPrimary && (
                              <span
                                style={{
                                  fontSize: 9,
                                  background: 'rgba(139,92,246,0.18)',
                                  color: 'var(--color-purple)',
                                  border: '1px solid rgba(139,92,246,0.3)',
                                  padding: '1px 4px',
                                  borderRadius: 3,
                                }}
                              >
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--color-text-dim)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {contact.phone}
                            {contact.email ? ` · ${contact.email}` : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="button-secondary"
                          disabled={isSavingContact}
                          onClick={() => {
                            setContactEditId(contact.id)
                            setContactEditForm({
                              contactType: String(contact.contactType ?? '0'),
                              fullName: contact.fullName,
                              phone: contact.phone,
                              email: contact.email || '',
                            })
                          }}
                          style={{ height: 26, padding: '0 8px', fontSize: 10 }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          disabled={isSavingContact}
                          onClick={() => handleRemoveContact(contact.id)}
                          style={{ height: 26, width: 26, borderRadius: 4 }}
                          title="Remove contact"
                        >
                          <X style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    )
                  )}
              </div>

              {showAddContact ? (
                <div
                  style={{
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 6,
                    border: '1px dashed var(--color-border)',
                    background: 'rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-dim)' }}>
                    NEW CONTACT
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: 9 }}>
                        Type
                      </label>
                      <select
                        className="form-input"
                        value={addContactForm.contactType}
                        onChange={(e) =>
                          setAddContactForm((f) => ({ ...f, contactType: e.target.value }))
                        }
                        style={{ height: 34, fontSize: 12 }}
                      >
                        {contactTypes.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: 9 }}>
                        Full Name *
                      </label>
                      <input
                        className="form-input"
                        placeholder="Full name"
                        value={addContactForm.fullName}
                        onChange={(e) =>
                          setAddContactForm((f) => ({ ...f, fullName: e.target.value }))
                        }
                        style={{ height: 34, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: 9 }}>
                        Phone *
                      </label>
                      <input
                        className="form-input"
                        placeholder="+94 77 000 0000"
                        value={addContactForm.phone}
                        onChange={(e) =>
                          setAddContactForm((f) => ({ ...f, phone: e.target.value }))
                        }
                        style={{ height: 34, fontSize: 12 }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: 9 }}>
                        Email
                      </label>
                      <input
                        className="form-input"
                        type="email"
                        placeholder="optional"
                        value={addContactForm.email}
                        onChange={(e) =>
                          setAddContactForm((f) => ({ ...f, email: e.target.value }))
                        }
                        style={{ height: 34, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={addContactForm.isPrimary}
                        onChange={(e) =>
                          setAddContactForm((f) => ({ ...f, isPrimary: e.target.checked }))
                        }
                      />
                      Set as primary contact
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={() => setShowAddContact(false)}
                      style={{ flex: 1, height: 32, fontSize: 11 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="button-primary"
                      disabled={isSavingContact}
                      onClick={handleSaveAddContact}
                      style={{ flex: 1.5, height: 32, fontSize: 11 }}
                    >
                      {isSavingContact ? '...' : 'Add Contact'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setShowAddContact(true)}
                  style={{
                    marginTop: 2,
                    height: 30,
                    padding: '0 12px',
                    fontSize: 11,
                    alignSelf: 'flex-start',
                  }}
                >
                  + Add Contact
                </button>
              )}
            </div>
          )}

          {/* Customer Image */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              borderTop: '1px solid var(--color-border)',
              paddingTop: 12,
            }}
          >
            <p className="eyebrow" style={{ fontSize: 10 }}>
              Customer Images
            </p>

            {editingCustomer && editingCustomer.images?.length ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                {editingCustomer.images.map((image) => (
                  <div
                    key={image.id || image.imageUrl}
                    style={{ position: 'relative', display: 'inline-block' }}
                  >
                    <img
                      src={getR2ImageUrl(image.imageUrl)}
                      alt="Customer"
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        display: 'block',
                      }}
                    />
                    {image.id && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleDeleteImage(image.id)}
                        title="Delete image"
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: 'rgba(220,38,38,0.85)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        <X style={{ width: 8, height: 8, color: '#fff' }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Image Type
                </label>
                <select
                  className="form-input"
                  value={imageType}
                  onChange={(event) => setImageType(event.target.value)}
                  style={{ height: 38, fontSize: 13 }}
                >
                  {imageTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 10 }}>
                  Select Files
                </label>
                <input
                  className="form-input"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelection}
                  style={{ height: 38, paddingTop: 7, fontSize: 12 }}
                />
              </div>
            </div>

            {pendingImages.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pendingImages.map((image, index) => (
                  <div
                    key={`${image.file.name}-${image.file.lastModified}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 10,
                      color: 'var(--color-text-muted)',
                      padding: '4px 8px',
                      background: 'rgba(0,0,0,0.12)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                    }}
                  >
                    <span
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {image.file.name} — {getImageTypeLabel(image.imageType)}
                    </span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove ${image.file.name}`}
                      onClick={() => removePendingImage(index)}
                      style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 3 }}
                    >
                      <X style={{ width: 10, height: 10 }} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {editingCustomer && (
              <button
                type="button"
                className="button-secondary"
                disabled={isSaving || !pendingImages.length}
                onClick={handleUploadImage}
                style={{
                  height: 32,
                  fontSize: 11,
                  display: 'inline-flex',
                  gap: 6,
                  alignSelf: 'flex-start',
                }}
              >
                <ImageUp style={{ width: 12, height: 12 }} />
                {isSaving
                  ? 'Uploading...'
                  : pendingImages.length
                    ? `Upload ${pendingImages.length} Image${pendingImages.length === 1 ? '' : 's'}`
                    : 'Upload Images'}
              </button>
            )}

            <p style={{ fontSize: 10, color: 'var(--color-text-dim)', lineHeight: 1.3 }}>
              JPEG, PNG, WebP · max 10 MB each · up to 10 files
            </p>
          </div>

          {/* Form Actions Footer */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid var(--color-border)',
              marginTop: 'auto',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              data-skip-focus="true"
              className="button-secondary"
              onClick={handleCancel}
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
    </div>
  )
}
