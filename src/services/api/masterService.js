import api, { getOnce } from '@/lib/api'

function getValue(response, fallbackMessage = 'Request failed') {
  const result = response.data?.data

  if (!response.data?.success || result?.isFailure) {
    throw new Error(result?.errorMessage || response.data?.errorMessage || fallbackMessage)
  }

  return result?.value ?? result
}

function formatOrganisation(organisation) {
  return {
    id: organisation.id,
    code: organisation.code ?? '',
    name: organisation.name ?? '',
    legalName: organisation.legalName ?? '',
    telephone: organisation.telephone ?? '',
    email: organisation.email ?? '',
    addressLine1: organisation.addressLine1 ?? '',
    addressLine2: organisation.addressLine2 ?? '',
    city: organisation.city ?? '',
    country: organisation.country ?? '',
    vatRegNo: organisation.vatRegNo ?? '',
    status: organisation.status ?? 'Inactive',
    isActive: organisation.status === 'Active',
    createdAt: organisation.createdAt,
    updatedAt: organisation.updatedAt,
  }
}

function formatBusinessUnit(businessUnit) {
  return {
    id: businessUnit.id,
    organisationId: businessUnit.organisationId ?? '',
    code: businessUnit.code ?? '',
    name: businessUnit.name ?? '',
    description: businessUnit.description ?? '',
    type: businessUnit.type ?? '',
    status: businessUnit.status ?? 'Inactive',
    isActive: businessUnit.status === 'Active',
    createdAt: businessUnit.createdAt,
    updatedAt: businessUnit.updatedAt,
  }
}

function formatTerritory(territory) {
  return {
    id: territory.id,
    businessUnitId: territory.businessUnitId ?? '',
    code: territory.code ?? '',
    name: territory.name ?? '',
    description: territory.description ?? '',
    status: territory.status ?? 'Inactive',
    isActive: territory.status === 'Active',
    businessUnit: territory.businessUnit ?? null,
    createdAt: territory.createdAt,
    updatedAt: territory.updatedAt,
  }
}

function formatSalesRoute(route) {
  if (!route) return null
  return {
    id: route.id,
    territoryId: route.territoryId ?? '',
    code: route.code ?? '',
    name: route.name ?? '',
    defaultEmployeeId: route.defaultEmployeeId ?? '',
    isActive: Boolean(route.isActive),
    status: route.isActive ? 'Active' : 'Inactive',
    createdAt: route.createdAt,
    updatedAt: route.updatedAt,
  }
}

function formatPaymentTerm(term) {
  if (!term) return null
  const status = term.status ?? (term.isActive ? 'Active' : 'Inactive')

  return {
    id: term.id,
    code: term.code ?? '',
    name: term.name ?? '',
    dueDays: term.dueDays ?? 0,
    discountPercent: term.discountPercent ?? 0,
    discountDays: term.discountDays ?? null,
    description: term.description ?? '',
    isDefault: Boolean(term.isDefault),
    status,
    isActive: status === 'Active',
    calculatedDueDate: term.calculatedDueDate,
    createdAt: term.createdAt,
    updatedAt: term.updatedAt,
  }
}

function formatProduct(product) {
  if (!product) return null
  return {
    id: product.id,
    sku: product.sku ?? '',
    barcode: product.barcode ?? '',
    name: product.name ?? '',
    description: product.description ?? '',
    category: product.category ?? { id: '', code: '', name: '' },
    uomBase: product.baseUom ?? '',
    unitCost: product.costPrice ?? 0,
    unitPrice: product.sellingPrice ?? 0,
    reorderLevel: product.reorderLevel ?? 0,
    reorderQty: product.reorderQty ?? 0,
    imageUrl: product.imageUrl ?? '',
    status: product.status ?? 'Active',
    isActive: product.status === 'Active',
    uomConversions: (product.uomConversions || []).map(formatUomConversion),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

function formatUomConversion(conv) {
  if (!conv) return null
  return {
    id: conv.id,
    fromUom: conv.fromUom ?? '',
    toUom: conv.toUom ?? '',
    factor: conv.conversionFactor ?? 1,
  }
}

function formatUnitOfMeasure(unit) {
  if (!unit) return null
  return {
    id: unit.id,
    code: unit.code ?? '',
    name: unit.name ?? '',
    description: unit.description ?? '',
    category: unit.category ?? '',
    status: unit.status ?? 'Inactive',
    isActive: unit.status === 'Active',
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt,
  }
}

function formatCategory(category) {
  if (!category) return null
  return {
    id: category.id,
    code: category.code ?? '',
    name: category.name ?? '',
    description: category.description ?? '',
    sortOrder: category.sortOrder ?? 0,
    status: category.status ?? 'Active',
    isActive: category.status === 'Active',
    parentCategoryId: category.parentCategory?.id ?? '',
    parentCategory: category.parentCategory ?? null,
    children: (category.children || []).map(formatCategory),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  }
}

//Organisation List, Get, Create, Update, Activate/Deactivate
//Organisation Create
export const masterService = {
  async listOrganisations() {
    const response = await getOnce('/api/v1/master-data/organisations')
    return (getValue(response, 'Unable to load organisations.') || []).map(formatOrganisation)
  },

  //Organisation Get By Id
  async getOrganisation(id) {
    const response = await getOnce(`/api/v1/master-data/organisations/${id}`)
    return formatOrganisation(getValue(response, 'Unable to load organisation.'))
  },

  //Organisation Create
  async createOrganisation(payload) {
    const response = await api.post('/api/v1/master-data/organisations', payload)
    return formatOrganisation(getValue(response, 'Unable to create organisation.'))
  },

  //Organisation Update
  async updateOrganisation(id, payload) {
    const response = await api.put(`/api/v1/master-data/organisations/${id}`, payload)
    return formatOrganisation(getValue(response, 'Unable to update organisation.'))
  },

  //Organisation Status Update (Activate/Deactivate)
  async updateOrganisationStatus(id, isActive) {
    const response = await api.patch(`/api/v1/master-data/organisations/${id}/status`, {
      isActive,
    })
    return formatOrganisation(getValue(response, 'Unable to update organisation status.'))
  },

  //Business Unit List, Get, Create, Update, Activate/Deactivate
  //Business Unit List
  async listBusinessUnits(params = {}) {
    const response = await getOnce('/api/v1/master-data/business-units', { params })
    return (getValue(response, 'Unable to load business units.') || []).map(formatBusinessUnit)
  },

  //Business Unit Get By Id
  async getBusinessUnit(id) {
    const response = await getOnce(`/api/v1/master-data/business-units/${id}`)
    return formatBusinessUnit(getValue(response, 'Unable to load business unit.'))
  },

  //Business Unit Create
  async createBusinessUnit(payload) {
    const response = await api.post('/api/v1/master-data/business-units', payload)
    return formatBusinessUnit(getValue(response, 'Unable to create business unit.'))
  },

  //Business Unit Update
  async updateBusinessUnit(id, payload) {
    const response = await api.put(`/api/v1/master-data/business-units/${id}`, payload)
    return formatBusinessUnit(getValue(response, 'Unable to update business unit.'))
  },

  //Business Unit Status Update (Activate/Deactivate)
  async deactivateBusinessUnit(id) {
    const response = await api.delete(`/api/v1/master-data/business-units/${id}`)
    return formatBusinessUnit(getValue(response, 'Unable to deactivate business unit.'))
  },

  //Territory List, Get, Create, Update, Activate/Deactivate
  //Territory List
  async listTerritories(params = {}) {
    const response = await getOnce('/api/v1/master-data/territories', { params })
    return (getValue(response, 'Unable to load territories.') || []).map(formatTerritory)
  },

  //Territory Get By Id
  async getTerritory(id) {
    const response = await getOnce(`/api/v1/master-data/territories/${id}`)
    return formatTerritory(getValue(response, 'Unable to load territory.'))
  },

  //Territory Create
  async createTerritory(payload) {
    const response = await api.post('/api/v1/master-data/territories', payload)
    return formatTerritory(getValue(response, 'Unable to create territory.'))
  },

  //Territory Update
  async updateTerritory(id, payload) {
    const response = await api.put(`/api/v1/master-data/territories/${id}`, payload)
    return formatTerritory(getValue(response, 'Unable to update territory.'))
  },

  //Territory Status Update (Activate/Deactivate)
  async deactivateTerritory(id) {
    const response = await api.delete(`/api/v1/master-data/territories/${id}`)
    return formatTerritory(getValue(response, 'Unable to deactivate territory.'))
  },

  // Sales Routes List, Get, Create, Update, Deactivate
  // Sales Routes List
  async listSalesRoutes(params = {}) {
    const response = await getOnce('/api/v1/master/sales-routes', { params })
    const page = getValue(response, 'Unable to load sales routes.')

    return {
      ...page,
      items: (page?.items || []).map(formatSalesRoute),
    }
  },

  // Sales Routes Get By Id
  async getSalesRoute(id) {
    const response = await getOnce(`/api/v1/master/sales-routes/${id}`)
    return formatSalesRoute(getValue(response, 'Unable to load sales route.'))
  },

  // Sales Routes Create
  async createSalesRoute(payload) {
    const response = await api.post('/api/v1/master/sales-routes', payload)
    return formatSalesRoute(getValue(response, 'Unable to create sales route.'))
  },

  // Sales Routes Update
  async updateSalesRoute(id, payload) {
    const response = await api.put(`/api/v1/master/sales-routes/${id}`, payload)
    return getValue(response, 'Unable to update sales route.')
  },

  // Sales Routes Deactivate
  async deactivateSalesRoute(id) {
    const response = await api.delete(`/api/v1/master/sales-routes/${id}`)
    return getValue(response, 'Unable to deactivate sales route.')
  },

  // Payment Terms List
  async listPaymentTerms() {
    const response = await getOnce('/api/v1/master-data/payment-terms')
    return (getValue(response, 'Unable to load payment terms.') || []).map(formatPaymentTerm)
  },

  // Payment Terms Get By Id
  async getPaymentTerm(id) {
    const response = await getOnce(`/api/v1/master-data/payment-terms/${id}`)
    return formatPaymentTerm(getValue(response, 'Unable to load payment term.'))
  },

  //Product List, Get, Create, Update, Activate/Deactivate
  //Product List
  async listProducts(params = {}) {
    const response = await getOnce('/api/v1/master-data/products', { params })
    const page = getValue(response, 'Unable to load products.')
    return {
      ...page,
      items: (page?.items || []).map(formatProduct),
    }
  },

  //Product Get By Id
  async getProduct(id) {
    const response = await getOnce(`/api/v1/master-data/products/${id}`)
    return formatProduct(getValue(response, 'Unable to load product.'))
  },

  //Product Create
  async createProduct(payload) {
    const response = await api.post('/api/v1/master-data/products', payload)
    return formatProduct(getValue(response, 'Unable to create product.'))
  },

  //Product Update
  async updateProduct(id, payload) {
    const response = await api.put(`/api/v1/master-data/products/${id}`, payload)
    return formatProduct(getValue(response, 'Unable to update product.'))
  },

  //Product Status Update (Activate/Deactivate)
  async updateProductStatus(id, isActive) {
    const response = await api.patch(`/api/v1/master-data/products/${id}/status`, { isActive })
    return formatProduct(getValue(response, 'Unable to update product status.'))
  },

  //UOM Conversion Add, Update, Remove
  async addUomConversion(productId, payload) {
    const response = await api.post(
      `/api/v1/master-data/products/${productId}/uom-conversions`,
      payload
    )
    return formatUomConversion(getValue(response, 'Unable to add UOM conversion.'))
  },

  //UOM Conversion Update
  async updateUomConversion(productId, conversionId, payload) {
    const response = await api.put(
      `/api/v1/master-data/products/${productId}/uom-conversions/${conversionId}`,
      payload
    )
    return formatUomConversion(getValue(response, 'Unable to update UOM conversion.'))
  },

  //UOM Conversion Remove
  async removeUomConversion(productId, conversionId) {
    const response = await api.delete(
      `/api/v1/master-data/products/${productId}/uom-conversions/${conversionId}`
    )
    return getValue(response, 'Unable to remove UOM conversion.')
  },

  // Units of Measure List, Get, Create, Update, Deactivate
  // Units of Measure List
  async listUnitsOfMeasure(params = {}) {
    const response = await getOnce('/api/v1/master-data/units-of-measure', { params })
    return (getValue(response, 'Unable to load units of measure.') || []).map(formatUnitOfMeasure)
  },

  // Units of Measure Get By Id
  async getUnitOfMeasure(id) {
    const response = await getOnce(`/api/v1/master-data/units-of-measure/${id}`)
    return formatUnitOfMeasure(getValue(response, 'Unable to load unit of measure.'))
  },

  // Units of Measure Create
  async createUnitOfMeasure(payload) {
    const response = await api.post('/api/v1/master-data/units-of-measure', payload)
    return formatUnitOfMeasure(getValue(response, 'Unable to create unit of measure.'))
  },

  // Units of Measure Update
  async updateUnitOfMeasure(id, payload) {
    const response = await api.put(`/api/v1/master-data/units-of-measure/${id}`, payload)
    return formatUnitOfMeasure(getValue(response, 'Unable to update unit of measure.'))
  },

  // Units of Measure Deactivate
  async deactivateUnitOfMeasure(id) {
    const response = await api.delete(`/api/v1/master-data/units-of-measure/${id}`)
    return formatUnitOfMeasure(getValue(response, 'Unable to deactivate unit of measure.'))
  },

  //Suppliers List, Get, Create, Update, Deactivate
  //Suppliers List
  async listSuppliers(params = {}) {
    const response = await getOnce('/api/v1/master/suppliers', { params })
    return response.data
  },

  //Suppliers Get By Id
  async getSupplier(id) {
    const response = await getOnce(`/api/v1/master/suppliers/${id}`)
    return response.data.data
  },

  //Suppliers Create
  async createSupplier(payload) {
    const response = await api.post('/api/v1/master/suppliers', payload)
    return response.data.data
  },

  //Suppliers Update
  async updateSupplier(id, payload) {
    const response = await api.put(`/api/v1/master/suppliers/${id}`, payload)
    return response.data.data
  },

  //Suppliers Deactivate
  async deleteSupplier(id) {
    await api.delete(`/api/v1/master/suppliers/${id}`)
  },

  // Product Categories List, Get, Create, Update, Deactivate
  // Product Categories List
  async listCategories(params = {}) {
    const response = await getOnce('/api/v1/master-data/product-categories', { params })
    return (getValue(response, 'Unable to load categories.') || []).map(formatCategory)
  },

  // Product Categories Get By Id
  async getCategory(id) {
    const response = await getOnce(`/api/v1/master-data/product-categories/${id}`)
    return formatCategory(getValue(response, 'Unable to load category.'))
  },

  // Product Categories Create
  async createCategory(payload) {
    const response = await api.post('/api/v1/master-data/product-categories', payload)
    return formatCategory(getValue(response, 'Unable to create category.'))
  },

  // Product Categories Update
  async updateCategory(id, payload) {
    const response = await api.put(`/api/v1/master-data/product-categories/${id}`, payload)
    return formatCategory(getValue(response, 'Unable to update category.'))
  },

  // Product Categories Deactivate
  async deleteCategory(id) {
    const response = await api.delete(`/api/v1/master-data/product-categories/${id}`)
    return getValue(response, 'Unable to delete category.')
  },

  // Brands List, Get, Create, Update, Deactivate
  // Brands List
  async listBrands(params = {}) {
    const response = await getOnce('/api/v1/master/brands', { params })
    return response.data
  },

  // Brands Get By Id
  async getBrand(id) {
    const response = await getOnce(`/api/v1/master/brands/${id}`)
    return response.data.data
  },

  // Brands Create
  async createBrand(payload) {
    const response = await api.post('/api/v1/master/brands', payload)
    return response.data.data
  },

  // Brands Update
  async updateBrand(id, payload) {
    const response = await api.put(`/api/v1/master/brands/${id}`, payload)
    return response.data.data
  },

  // Brands Deactivate
  async deleteBrand(id) {
    await api.delete(`/api/v1/master/brands/${id}`)
  },
}
