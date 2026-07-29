import api, { getOnce } from '@/lib/api'

function getValue(response, fallbackMessage = 'Request failed') {
  const result = response.data?.data

  if (!response.data?.success || result?.isFailure) {
    throw new Error(result?.errorMessage || response.data?.errorMessage || fallbackMessage)
  }

  return result?.value ?? result
}

function getResponseData(response, fallbackMessage = 'Request failed') {
  if (typeof response.data?.success === 'boolean') {
    return getValue(response, fallbackMessage)
  }

  return response.data
}

function formatSalesOrder(order) {
  return order || null
}

function formatCustomerGroup(group) {
  if (!group) return null
  return {
    id: group.id,
    organizationId: group.organizationId ?? '',
    code: group.code ?? '',
    name: group.name ?? '',
    defaultCreditDays: group.defaultCreditDays ?? 0,
    defaultCreditLimit: group.defaultCreditLimit ?? 0,
    isActive: Boolean(group.isActive),
    status: group.isActive ? 'Active' : 'Inactive',
  }
}

function formatCustomer(customer) {
  if (!customer) return null
  // List endpoint returns CustomerSummaryDto with profileImageUrl (flat string) and flat primary contact fields.
  // Detail endpoint returns CustomerDetailsDto with images array and full contacts array. Handle both.
  const images =
    customer.images || (customer.profileImageUrl ? [{ imageUrl: customer.profileImageUrl }] : [])

  // Build contacts array from whatever shape the DTO provides
  let contacts = customer.contacts || []
  if (!contacts.length && (customer.primaryContactName || customer.primaryContactPhone)) {
    contacts = [
      {
        id: null,
        fullName: customer.primaryContactName || '',
        phone: customer.primaryContactPhone || '',
        email: customer.primaryContactEmail || '',
        isPrimary: true,
        isActive: true,
        contactType: 0,
      },
    ]
  }

  return {
    id: customer.id,
    organizationId: customer.organizationId ?? '',
    customerGroupId: customer.customerGroupId ?? '',
    salesRouteId: customer.salesRouteId ?? '',
    salesRouteName: customer.salesRouteName ?? '',
    code: customer.code ?? '',
    name: customer.name ?? '',
    registrationNumber: customer.registrationNumber ?? '',
    isVatRegistered: Boolean(customer.isVatRegistered),
    taxNumber: customer.taxNumber ?? '',
    preferredPaymentMethod: customer.preferredPaymentMethod ?? 0,
    creditLimit: customer.creditLimit ?? 0,
    creditPeriodDays: customer.creditPeriodDays ?? 0,
    location: customer.location ?? null,
    isActive: Boolean(customer.isActive),
    status: customer.isActive ? 'Active' : 'Inactive',
    contacts,
    images,
  }
}

function formatInvoice(invoice) {
  if (!invoice) return null

  return {
    id: invoice.id,
    salesOrderId: invoice.salesOrderId ?? '',
    customerId: invoice.customerId ?? '',
    salesRouteId: invoice.salesRouteId ?? '',
    salesRouteName: invoice.salesRouteName ?? '',
    vehicleId: invoice.vehicleId ?? '',
    salesPersonId: invoice.salesPersonId ?? '',
    invoiceNumber: invoice.invoiceNumber ?? invoice.id,
    taxInvoiceNumber: invoice.taxInvoiceNumber ?? '',
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    status: invoice.status ?? 'Unpaid',
    isTaxInvoice: Boolean(invoice.isTaxInvoice),
    customerVatTin: invoice.customerVatTin ?? '',
    notes: invoice.notes ?? '',
    cancelledReason: invoice.cancelledReason ?? '',
    grossAmount: Number(invoice.grossAmount ?? 0),
    totalDiscountAmount: Number(invoice.totalDiscountAmount ?? 0),
    totalSupplierDiscountAmount: Number(invoice.totalSupplierDiscountAmount ?? 0),
    totalDistributorDiscountAmount: Number(invoice.totalDistributorDiscountAmount ?? 0),
    totalReturnAmount: Number(invoice.totalReturnAmount ?? 0),
    returnCreditAmount: Number(invoice.returnCreditAmount ?? 0),
    vatAmount: Number(invoice.vatAmount ?? 0),
    netAmount: Number(invoice.netAmount ?? 0),
    paidAmount: Number(invoice.paidAmount ?? 0),
    outstandingAmount: Number(invoice.outstandingAmount ?? 0),
    lines: (invoice.lines || []).map((line) => ({
      id: line.id,
      productId: line.productId ?? '',
      categoryId: line.categoryId ?? '',
      unitId: line.unitId ?? '',
      quantity: Number(line.quantity ?? 0),
      unitPrice: Number(line.unitPrice ?? 0),
      mrp: Number(line.mrp ?? 0),
      discountPercent: Number(line.discountPercent ?? 0),
      supplierDiscountPercent: Number(line.supplierDiscountPercent ?? 0),
      distributorDiscountPercent: Number(line.distributorDiscountPercent ?? 0),
      grossAmount: Number(line.grossAmount ?? 0),
      supplierDiscountAmount: Number(line.supplierDiscountAmount ?? 0),
      distributorDiscountAmount: Number(line.distributorDiscountAmount ?? 0),
      discountAmount: Number(line.discountAmount ?? 0),
      vatAmount: Number(line.vatAmount ?? 0),
      lineTotal: Number(line.lineTotal ?? 0),
      batchId: line.batchId ?? null,
      batchNo: line.batchNo ?? '',
      smallestUnitCode: line.smallestUnitCode ?? '',
      isReturnLine: Boolean(line.isReturnLine),
      returnReason: line.returnReason ?? null,
    })),
  }
}

export const salesService = {
  //Customer group related APIs
  // List customer groups with optional filters and pagination
  async listCustomerGroups(params = {}) {
    const response = await getOnce('/api/v1/sales/customer-groups', { params })
    const page = getValue(response, 'Unable to load customer groups.')

    return {
      ...page,
      items: (page?.items || []).map(formatCustomerGroup),
    }
  },

  // Get single customer group by ID
  async getCustomerGroup(id) {
    const response = await getOnce(`/api/v1/sales/customer-groups/${id}`)
    return formatCustomerGroup(getValue(response, 'Unable to load customer group.'))
  },

  // Create new customer group
  // Backend returns 201 with the new ID as a plain string (not wrapped in ApiResponse)
  async createCustomerGroup(payload) {
    const response = await api.post('/api/v1/sales/customer-groups', payload)
    return { id: response.data }
  },

  // Update existing customer group
  async updateCustomerGroup(id, payload) {
    const response = await api.put(`/api/v1/sales/customer-groups/${id}`, payload)
    return response.data
  },

  // Deactivate (soft delete) customer group
  async deactivateCustomerGroup(id) {
    const response = await api.delete(`/api/v1/sales/customer-groups/${id}`)
    return response.data
  },

  // List customers with optional filters
  async listCustomers(params = {}) {
    const response = await getOnce('/api/v1/sales/customers', { params })
    const page = getValue(response, 'Unable to load customers.')

    return {
      ...page,
      items: (page?.items || []).map(formatCustomer),
    }
  },

  async listAllCustomers(params = {}) {
    const pageSize = Math.min(Number(params.pageSize || 100), 100)
    const firstPage = await this.listCustomers({ ...params, page: 1, pageSize })
    const items = [...(firstPage.items || [])]
    const fallbackTotalPages =
      Math.ceil(Number(firstPage.totalItems || items.length) / pageSize) || 1
    const totalPages = Number(firstPage.totalPages ?? fallbackTotalPages)

    if (totalPages <= 1) {
      return items
    }

    const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2)
    const remainingResults = await Promise.all(
      remainingPages.map((page) => this.listCustomers({ ...params, page, pageSize }))
    )

    remainingResults.forEach((page) => {
      items.push(...(page.items || []))
    })

    return items
  },

  async checkCustomerCode(code) {
    const response = await api.get('/api/v1/sales/customers/check-code', {
      params: { code },
      timeout: 3000,
    })

    return response.data?.data ?? response.data ?? {}
  },

  //
  // Get single customer by ID
  async getCustomer(id) {
    const response = await getOnce(`/api/v1/sales/customers/${id}`)
    return formatCustomer(getValue(response, 'Unable to load customer.'))
  },

  // Create new customer
  // Backend returns 201 with the new customer ID as a plain string
  async createCustomer(payload) {
    const response = await api.post('/api/v1/sales/customers', payload)
    return response.data
  },

  // Update existing customer
  async updateCustomer(id, payload) {
    const response = await api.put(`/api/v1/sales/customers/${id}`, payload)
    return response.data
  },

  // Deactivate (soft delete) customer
  async deactivateCustomer(id) {
    const response = await api.delete(`/api/v1/sales/customers/${id}`)
    return response.data
  },

  // Delete a specific image from a customer (removes from DB and R2 storage).
  async deleteCustomerImage(customerId, imageId) {
    await api.delete(`/api/v1/sales/customers/${customerId}/images/${imageId}`)
  },

  // Add a contact to an existing customer. Backend returns 201 with the new contact ID (plain string).
  async addCustomerContact(customerId, payload) {
    const response = await api.post(`/api/v1/sales/customers/${customerId}/contacts`, payload)
    return response.data
  },

  // Update an existing contact on a customer.
  async updateCustomerContact(customerId, contactId, payload) {
    await api.put(`/api/v1/sales/customers/${customerId}/contacts/${contactId}`, payload)
  },

  // Remove (soft-delete) a contact from a customer.
  async removeCustomerContact(customerId, contactId) {
    await api.delete(`/api/v1/sales/customers/${customerId}/contacts/${contactId}`)
  },

  // Upload one or more customer images. imageTypes and files are paired by index.
  async uploadCustomerImages(id, images) {
    const formData = new FormData()

    images.forEach(({ imageType, file }) => {
      formData.append('imageTypes', String(imageType))
      formData.append('files', file)
    })

    const response = await api.post(`/api/v1/sales/customers/${id}/images`, formData)

    return getValue(response, 'Unable to upload customer images.')
  },

  // Sales order related APIs
  async createSalesOrder(payload) {
    const response = await api.post('/api/sales/orders', payload)
    return response.data
  },

  async getSalesOrder(id) {
    const response = await getOnce(`/api/sales/orders/${id}`)
    return formatSalesOrder(response.data)
  },

  async listMySalesOrders() {
    const response = await getOnce('/api/sales/orders/my-orders')
    return (response.data || []).map(formatSalesOrder)
  },

  async listSalesOrders(params = { page: 1, pageSize: 100 }) {
    const response = await getOnce('/api/sales/orders', { params })
    return (response.data || []).map(formatSalesOrder)
  },

  async listSalesOrdersByRouteAndDate({ salesRouteId, date }) {
    const response = await getOnce('/api/sales/orders/by-route', {
      params: { salesRouteId, date },
    })
    return (response.data || []).map(formatSalesOrder)
  },

  async checkSalesOrderStock({ productId, unitId }) {
    const response = await getOnce('/api/sales/orders/stock-check', {
      params: { productId, unitId },
    })
    return response.data
  },

  async getSalesOrderDiscountLimit({ productId, categoryId }) {
    const response = await getOnce('/api/sales/orders/discount-limit', {
      params: { productId, categoryId },
    })
    return Number(response.data?.maxDiscountPercent ?? 0)
  },

  async getSalesOrderDiscountUsage({ salesPersonId, from, to }) {
    const response = await getOnce('/api/sales/orders/discount-usage', {
      params: { salesPersonId, from, to },
    })
    return response.data
  },

  async addSalesOrderLine(id, payload) {
    const response = await api.post(`/api/sales/orders/${id}/lines`, payload)
    return response.data
  },

  async updateSalesOrderLine(id, lineId, payload) {
    await api.put(`/api/sales/orders/${id}/lines/${lineId}`, payload)
  },

  async removeSalesOrderLine(id, lineId) {
    await api.delete(`/api/sales/orders/${id}/lines/${lineId}`)
  },

  async confirmSalesOrder(id) {
    await api.put(`/api/sales/orders/${id}/confirm`)
  },

  async cancelSalesOrder(id, reason) {
    await api.put(`/api/sales/orders/${id}/cancel`, { reason })
  },

  async convertSalesOrderToInvoice(id, payload) {
    const response = await api.post(`/api/sales/orders/${id}/convert-to-invoice`, payload)
    return response.data
  },
  // Sales invoice related APIs
  // Create a new invoice
  async createInvoice(payload) {
    const response = await api.post('/api/v1/sales/invoices', {
      customerId: payload.customerId,
      invoiceDate: payload.invoiceDate,
      dueDate: payload.dueDate ?? null,
      isTaxInvoice: Boolean(payload.isTaxInvoice),
      customerVatTin: payload.customerVatTin ?? null,
      notes: payload.notes ?? null,
      lines: (payload.lines || []).map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        discountPercent: Number(line.discountPercent || 0),
      })),
    })
    return response.data?.id ?? response.data?.data?.value ?? response.data?.data ?? response.data
  },

  // Get a single invoice by ID
  async getInvoice(id) {
    const response = await getOnce(`/api/v1/sales/invoices/${id}`)
    return formatInvoice(response.data)
  },

  // List invoices with generic parameters (customer, status, etc)
  async listInvoices(params = {}) {
    const response = await getOnce('/api/v1/sales/invoices', { params })
    const data = getResponseData(response, 'Unable to load invoices.')
    return (data || []).map(formatInvoice)
  },

  // Get invoices by customer including paid ones (used for CRN linking)
  async getInvoicesByCustomer(customerId) {
    const response = await getOnce('/api/v1/sales/invoices', {
      params: { customerId, pageSize: 100 },
    })
    const data = getResponseData(response, 'Unable to load customer invoices.')
    return (data || []).map(formatInvoice)
  },

  // List all invoices
  async listAllInvoices() {
    const response = await getOnce('/api/v1/sales/invoices')
    const data = getResponseData(response, 'Unable to load invoices.')
    return (data || []).map(formatInvoice)
  },

  // List invoices with optional filters
  async listInvoicesByRouteAndDate({ salesRouteId, date }) {
    const response = await getOnce('/api/v1/sales/invoices/by-route', {
      params: { salesRouteId, date },
    })
    return (response.data || []).map(formatInvoice)
  },

  // List outstanding (unpaid) invoices for a specific customer
  async listOutstandingInvoicesByCustomer(customerId) {
    const response = await getOnce('/api/v1/sales/invoices/outstanding', {
      params: { customerId },
    })
    return (response.data || []).map(formatInvoice)
  },

  // Add a payment to an invoice
  async addInvoicePayment(id, payload) {
    await api.post(`/api/v1/sales/invoices/${id}/payments`, payload)
  },

  // Cancel an invoice with a reason
  async cancelInvoice(id, reason) {
    await api.put(`/api/v1/sales/invoices/${id}/cancel`, { reason })
  },

  // Assign or update the tax invoice number for an invoice
  async assignTaxInvoiceNumber(id, taxInvoiceNumber) {
    await api.put(`/api/v1/sales/invoices/${id}/tax-invoice-number`, { taxInvoiceNumber })
  },

  // Customer Return Notes (CRN)
  async createCrn(payload) {
    const response = await api.post('/api/sales/return-notes', payload)
    const result = getResponseData(response, 'Unable to create return note.')
    return { id: result?.id ?? result?.value ?? result }
  },

  async getCrn(id) {
    const response = await getOnce(`/api/sales/return-notes/${id}`)
    return getResponseData(response, 'Unable to load return note.')
  },

  async listCrnsByCustomer(customerId) {
    const response = await getOnce('/api/sales/return-notes/by-customer', {
      params: { customerId },
    })
    return getResponseData(response, 'Unable to load return notes.') || []
  },

  async listMyReturnNotes() {
    const response = await getOnce('/api/sales/return-notes/my-returns')
    return getResponseData(response, 'Unable to load your return notes.') || []
  },

  async getProductsSoldToCustomer(customerId) {
    const response = await getOnce(`/api/sales/customers/${customerId}/products-sold`)
    return getResponseData(response, 'Unable to load customer product history.') || []
  },

  async addCrnLine(id, payload) {
    const response = await api.post(`/api/sales/return-notes/${id}/lines`, payload)
    return getResponseData(response, 'Unable to add return note line.')
  },

  async removeCrnLine(id, lineId) {
    await api.delete(`/api/sales/return-notes/${id}/lines/${lineId}`)
  },

  async submitCrn(id) {
    await api.put(`/api/sales/return-notes/${id}/submit`)
  },

  async verifyCrn(id) {
    await api.put(`/api/sales/return-notes/${id}/verify`)
  },

  async rejectCrn(id, payload) {
    await api.put(`/api/sales/return-notes/${id}/reject`, payload)
  },

  async cancelCrn(id, payload) {
    await api.put(`/api/sales/return-notes/${id}/cancel`, payload)
  },

  // Customer Credit
  async getCustomerCreditBalance(customerId) {
    const response = await getOnce(`/api/sales/customer-credit/${customerId}/balance`)
    return getResponseData(response, 'Unable to load credit balance.')
  },

  async getCustomerCreditTransactions(customerId) {
    const response = await getOnce(`/api/sales/customer-credit/${customerId}/transactions`)
    return getResponseData(response, 'Unable to load credit history.') || []
  },

  async applyCredit(payload) {
    const response = await api.post('/api/sales/customer-credit/apply', {
      invoiceId: payload.invoiceId,
    })
    return getResponseData(response, 'Unable to apply credit.')
  },
}
