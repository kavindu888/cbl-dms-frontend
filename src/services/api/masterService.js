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
    defaultDeliveryRunId: route.defaultDeliveryRunId ?? '',
    defaultDeliveryRunName: route.defaultDeliveryRunName ?? '',
    isActive: Boolean(route.isActive),
    status: route.isActive ? 'Active' : 'Inactive',
    createdAt: route.createdAt,
    updatedAt: route.updatedAt,
  }
}

function formatDeliveryRun(run) {
  if (!run) return null
  return {
    id: run.id,
    code: run.code ?? '',
    name: run.name ?? '',
    description: run.description ?? '',
    isActive: Boolean(run.isActive),
    status: run.isActive ? 'Active' : 'Inactive',
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
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

function formatTax(tax) {
  if (!tax) return null

  return {
    id: tax.id,
    code: tax.code ?? '',
    name: tax.name ?? '',
    rate: Number(tax.rate ?? 0),
    isActive: Boolean(tax.isActive),
    isDefault: Boolean(tax.isDefault),
    status: tax.isActive ? 'Active' : 'Inactive',
    createdAt: tax.createdAt,
    updatedAt: tax.updatedAt,
  }
}

function formatProduct(product) {
  if (!product) return null
  const uomConversions = (
    product.uomConversions ||
    product.conversions ||
    product.productConversions ||
    []
  ).map(formatUomConversion)
  const smallestUom = getSmallestUom(product.baseUom ?? product.uomBase ?? '', uomConversions)

  return {
    id: product.id,
    sku: product.sku ?? '',
    barcode: product.barcode ?? '',
    name: product.name ?? '',
    description: product.description ?? '',
    category: product.category ?? { id: '', code: '', name: '' },
    categoryId: product.categoryId ?? product.category?.id ?? '',
    uomBase: product.baseUom ?? product.uomBase ?? '',
    baseUom: product.baseUom ?? product.uomBase ?? '',
    smallestUnitId: product.smallestUnitId ?? product.smallestUomCode ?? smallestUom,
    smallestUnitName: product.smallestUnitName ?? product.smallestUomName ?? smallestUom,
    unitCost: product.costPrice ?? product.unitCost ?? 0,
    unitPrice: product.sellingPrice ?? product.unitPrice ?? 0,
    sellingPrice: product.sellingPrice ?? product.unitPrice ?? 0,
    mrp: product.mrp ?? product.lastMrp ?? product.MRP ?? 0,
    hasSkuDiscount: Boolean(product.hasSkuDiscount),
    maxSkuDiscountPercent: Number(product.maxSkuDiscountPercent ?? 0),
    minValue:
      product.minValue !== undefined && product.minValue !== null
        ? product.minValue
        : (product.reorderLevel ?? null),
    maxValue:
      product.maxValue !== undefined && product.maxValue !== null
        ? product.maxValue
        : (product.reorderQty ?? null),
    imageUrl: product.imageUrl ?? '',
    status: product.status ?? 'Active',
    isActive: product.status === 'Active',
    uomConversions,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

function getSmallestUom(baseUom, conversions) {
  const base = String(baseUom || '')
    .trim()
    .toUpperCase()
  if (!base || !conversions.length) return base

  const factors = new Map([[base, 1]])
  const queue = [base]

  while (queue.length) {
    const current = queue.shift()
    const outgoing = conversions.filter(
      (conversion) =>
        String(conversion.fromUom || '')
          .trim()
          .toUpperCase() === current
    )

    outgoing.forEach((conversion) => {
      const toUom = String(conversion.toUom || '')
        .trim()
        .toUpperCase()
      const factor = Number(conversion.factor || 0)
      if (!toUom || factor <= 0 || factors.has(toUom)) return

      factors.set(toUom, Number(factors.get(current) || 1) * factor)
      queue.push(toUom)
    })
  }

  return [...factors.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || base
}

function formatUomConversion(conv) {
  if (!conv) return null
  return {
    id: conv.id,
    fromUom: conv.fromUom ?? conv.fromUnit ?? '',
    toUom: conv.toUom ?? conv.toUnit ?? '',
    factor: conv.conversionFactor ?? conv.factor ?? 1,
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

function unwrapMasterData(response) {
  return response.data?.data?.value ?? response.data?.data ?? response.data
}

function formatCategoryDiscount(discount) {
  if (!discount) return null
  const status = discount.status ?? (discount.isActive === false ? 'Inactive' : 'Active')
  const discountPercent = discount.discountPercent ?? discount.activeDiscountPercent ?? 0

  return {
    id: discount.id,
    categoryId: discount.categoryId ?? discount.category?.id ?? '',
    category: discount.category ?? null,
    categoryName: discount.categoryName ?? discount.category?.name ?? '',
    discountPercent: Number(discountPercent),
    effectiveFrom: discount.effectiveFrom ?? discount.activeFrom,
    effectiveTo: discount.effectiveTo ?? discount.activeTo ?? null,
    notes: discount.notes ?? '',
    status,
    isActive: discount.isActive ?? status === 'Active',
    createdAt: discount.createdAt,
    updatedAt: discount.updatedAt,
  }
}

function formatSkuDiscount(discount) {
  if (!discount) return null

  return {
    productId: discount.productId ?? discount.id ?? '',
    sku: discount.sku ?? discount.productSku ?? '',
    productName: discount.productName ?? discount.name ?? '',
    categoryId: discount.categoryId ?? discount.category?.id ?? '',
    categoryName: discount.categoryName ?? discount.category?.name ?? '',
    hasSkuDiscount: Boolean(discount.hasSkuDiscount),
    maxSkuDiscountPercent: Number(discount.maxSkuDiscountPercent ?? 0),
  }
}

function formatSpecialDiscountEligibility(eligibility) {
  if (!eligibility) return null
  const status = eligibility.status ?? (eligibility.isActive === false ? 'Inactive' : 'Active')

  return {
    id: eligibility.id,
    categoryId: eligibility.categoryId ?? eligibility.category?.id ?? '',
    category: eligibility.category ?? null,
    categoryName: eligibility.categoryName ?? eligibility.category?.name ?? '',
    maxSpecialDiscountPercent: Number(eligibility.maxSpecialDiscountPercent ?? 0),
    effectiveFrom: eligibility.effectiveFrom ?? eligibility.activeFrom,
    effectiveTo: eligibility.effectiveTo ?? eligibility.activeTo ?? null,
    notes: eligibility.notes ?? '',
    status,
    isActive: eligibility.isActive ?? status === 'Active',
    createdAt: eligibility.createdAt,
    updatedAt: eligibility.updatedAt,
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
  // Backend returns 201 with the new ID as a plain string (not wrapped in ApiResponse)
  async createSalesRoute(payload) {
    const response = await api.post('/api/v1/master/sales-routes', payload)
    return { id: response.data }
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

  async listDeliveryRuns(params = {}) {
    const response = await getOnce('/api/v1/master/delivery-runs', { params })
    const page = getValue(response, 'Unable to load delivery runs.')

    return {
      ...page,
      items: (page?.items || []).map(formatDeliveryRun),
    }
  },

  async listAllDeliveryRuns(params = {}) {
    const pageSize = Math.min(Number(params.pageSize || 100), 100)
    const firstPage = await this.listDeliveryRuns({ ...params, page: 1, pageSize })
    const items = [...(firstPage.items || [])]
    const fallbackTotalPages =
      Math.ceil(Number(firstPage.totalItems || items.length) / pageSize) || 1
    const totalPages = Number(firstPage.totalPages ?? fallbackTotalPages)

    if (totalPages <= 1) return items

    const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2)
    const remainingResults = await Promise.all(
      remainingPages.map((page) => this.listDeliveryRuns({ ...params, page, pageSize }))
    )

    remainingResults.forEach((page) => {
      items.push(...(page.items || []))
    })

    return items
  },

  async getDeliveryRun(id) {
    const response = await getOnce(`/api/v1/master/delivery-runs/${id}`)
    return formatDeliveryRun(getValue(response, 'Unable to load delivery run.'))
  },

  async createDeliveryRun(payload) {
    const response = await api.post('/api/v1/master/delivery-runs', payload)
    return { id: response.data }
  },

  async updateDeliveryRun(id, payload) {
    const response = await api.put(`/api/v1/master/delivery-runs/${id}`, payload)
    return getValue(response, 'Unable to update delivery run.')
  },

  async deactivateDeliveryRun(id) {
    const response = await api.delete(`/api/v1/master/delivery-runs/${id}`)
    return getValue(response, 'Unable to deactivate delivery run.')
  },

  // Payment Terms List, Get, Create, Update, Deactivate
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

  // Taxes List, Create, Update, Deactivate
  // Taxes List
  async listTaxes() {
    const response = await getOnce('/api/v1/taxes')
    return (getValue(response, 'Unable to load taxes.') || []).map(formatTax)
  },

  // Taxes Get By Id
  async createTax(payload) {
    const response = await api.post('/api/v1/taxes', payload)
    return formatTax(getValue(response, 'Unable to create tax.'))
  },

  // Taxes Update
  async updateTax(id, payload) {
    const response = await api.put(`/api/v1/taxes/${id}`, payload)
    return formatTax(getValue(response, 'Unable to update tax.'))
  },

  // Taxes Deactivate
  async deactivateTax(id) {
    const response = await api.delete(`/api/v1/taxes/${id}`)
    return formatTax(getValue(response, 'Unable to deactivate tax.'))
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

  async listAllProducts(params = {}) {
    const pageSize = Math.min(Number(params.pageSize || 100), 100)
    const firstPage = await this.listProducts({ ...params, page: 1, pageSize })
    const items = [...(firstPage.items || [])]
    const fallbackTotalPages =
      Math.ceil(Number(firstPage.totalItems || items.length) / pageSize) || 1
    const totalPages = Number(firstPage.totalPages ?? fallbackTotalPages)

    if (totalPages <= 1) {
      return items
    }

    const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2)
    const remainingResults = await Promise.all(
      remainingPages.map((page) => this.listProducts({ ...params, page, pageSize }))
    )

    remainingResults.forEach((page) => {
      items.push(...(page.items || []))
    })

    return items
  },

  //Product Get By Id
  async getProduct(id) {
    const response = await getOnce(`/api/v1/master-data/products/${id}`)
    return formatProduct(getValue(response, 'Unable to load product.'))
  },

  // Batch product fetch — use instead of calling getProduct in a loop/Promise.all.
  async getProductsByIds(ids) {
    const distinctIds = [...new Set((ids || []).filter(Boolean))]
    if (!distinctIds.length) return []

    const response = await getOnce('/api/v1/master-data/products/by-ids', {
      params: { ids: distinctIds.join(',') },
    })
    return (getValue(response, 'Unable to load products.') || []).map(formatProduct)
  },

  async getCategoryDiscount(categoryId) {
    if (!categoryId) return null

    const response = await getOnce(`/api/master/category-discounts/active/${categoryId}`)
    const data = response.data?.data?.value ?? response.data?.data ?? response.data
    const discountPercent = data?.discountPercent ?? null

    return discountPercent === null || discountPercent === undefined
      ? null
      : Number(discountPercent)
  },

  async listCategoryDiscounts() {
    const response = await getOnce('/api/master/category-discounts')
    return (unwrapMasterData(response) || []).map(formatCategoryDiscount)
  },

  async getCategoryDiscountDetail(id) {
    const response = await getOnce(`/api/master/category-discounts/${id}`)
    return formatCategoryDiscount(unwrapMasterData(response))
  },

  async getActiveCategoryDiscount(categoryId) {
    return this.getCategoryDiscount(categoryId)
  },

  async listProductSkuDiscounts() {
    const response = await getOnce('/api/master/products/sku-discounts')
    return (unwrapMasterData(response) || []).map(formatSkuDiscount)
  },

  async getSkuDiscountInfo(productId) {
    if (!productId) return null

    try {
      const response = await getOnce(`/api/master/products/${productId}/sku-discount`)
      return formatSkuDiscount(unwrapMasterData(response))
    } catch {
      const product = await this.getProduct(productId).catch(() => null)
      if (product) {
        return {
          productId,
          hasSkuDiscount: Boolean(product.hasSkuDiscount),
          maxSkuDiscountPercent: Number(product.maxSkuDiscountPercent || 0),
        }
      }

      return {
        productId,
        hasSkuDiscount: false,
        maxSkuDiscountPercent: 0,
      }
    }
  },

  async setProductSkuDiscount(productId, payload) {
    const response = await api.put(`/api/master/products/${productId}/sku-discount`, {
      hasSkuDiscount: Boolean(payload.hasSkuDiscount),
      maxSkuDiscountPercent: Number(payload.maxSkuDiscountPercent || 0),
    })
    return unwrapMasterData(response)
  },

  async getActiveSpecialDiscount(categoryId) {
    if (!categoryId) return null

    const response = await getOnce(
      `/api/master/special-discount-eligibilities/active/${categoryId}`
    )
    const eligibility = formatSpecialDiscountEligibility(unwrapMasterData(response))
    return eligibility?.maxSpecialDiscountPercent ?? null
  },

  async listSpecialDiscountEligibilities() {
    const response = await getOnce('/api/master/special-discount-eligibilities')
    return (unwrapMasterData(response) || []).map(formatSpecialDiscountEligibility)
  },

  async getSpecialDiscountEligibility(id) {
    const response = await getOnce(`/api/master/special-discount-eligibilities/${id}`)
    return formatSpecialDiscountEligibility(unwrapMasterData(response))
  },

  async getSpecialDiscountEligibilitiesByCategory(categoryId) {
    const response = await getOnce(
      `/api/master/special-discount-eligibilities/by-category/${categoryId}`
    )
    return (unwrapMasterData(response) || []).map(formatSpecialDiscountEligibility)
  },

  async createSpecialDiscountEligibility(payload) {
    const response = await api.post('/api/master/special-discount-eligibilities', payload)
    return formatSpecialDiscountEligibility(unwrapMasterData(response))
  },

  async updateSpecialDiscountEligibility(id, payload) {
    const response = await api.put(`/api/master/special-discount-eligibilities/${id}`, payload)
    return formatSpecialDiscountEligibility(unwrapMasterData(response))
  },

  async deactivateSpecialDiscountEligibility(id) {
    const response = await api.delete(`/api/master/special-discount-eligibilities/${id}`)
    return unwrapMasterData(response)
  },

  async getCategoryDiscountsByCategory(categoryId) {
    const response = await getOnce(`/api/master/category-discounts/by-category/${categoryId}`)
    return (unwrapMasterData(response) || []).map(formatCategoryDiscount)
  },

  async createCategoryDiscount(payload) {
    const response = await api.post('/api/master/category-discounts', payload)
    return formatCategoryDiscount(unwrapMasterData(response))
  },

  async updateCategoryDiscount(id, payload) {
    const response = await api.put(`/api/master/category-discounts/${id}`, payload)
    return formatCategoryDiscount(unwrapMasterData(response))
  },

  async deactivateCategoryDiscount(id) {
    const response = await api.delete(`/api/master/category-discounts/${id}`)
    return unwrapMasterData(response)
  },

  async getProductUomChain(id) {
    const response = await getOnce(`/api/v1/master-data/products/${id}/uom-chain`)
    return getValue(response, 'Unable to load product UOM chain.')
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
  //UOM Conversion Add
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
