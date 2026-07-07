export const PERMISSIONS = {
  identity: {
    userManage: 'identity:user:manage',
    roleManage: 'identity:role:manage',
    permissionManage: 'identity:permission:manage',
  },
  masterData: {
    productRead: 'masterdata:product:read',
    productManage: 'masterdata:product:manage',
    categoryManage: 'masterdata:category:manage',
    paymentTermManage: 'masterdata:paymentterm:manage',
    orgManage: 'masterdata:org:manage',
    territoryManage: 'masterdata:territory:manage',
    businessUnitManage: 'masterdata:businessunit:manage',
    taxRead: 'masterdata:tax:read',
    taxManage: 'masterdata:tax:manage',
    uomManage: 'masterdata:uom:manage',
    salesRouteManage: 'masterdata:salesroute:manage',
  },
  purchasing: {
    poCreate: 'purchasing:po:create',
    poApprove: 'purchasing:po:approve',
    poRead: 'purchasing:po:read',
    supplierManage: 'purchasing:supplier:manage',
    grnCreate: 'purchasing:grn:create',
    grnVerify: 'purchasing:grn:verify',
    returnNoteCreate: 'purchasing:returnnote:create',
    returnNoteApprove: 'purchasing:returnnote:approve',
    returnNoteComplete: 'purchasing:returnnote:complete',
    settlementCreate: 'purchasing:settlement:create',
    settlementApprove: 'purchasing:settlement:approve',
  },
  inventory: {
    stockRead: 'inventory:stock:read',
    stockAdjust: 'inventory:stock:adjust',
    warehouseManage: 'inventory:warehouse:manage',
    transferCreate: 'inventory:transfer:create',
    stocktakeManage: 'inventory:stocktake:manage',
  },
  sales: {
    orderCreate: 'sales:order:create',
    orderRead: 'sales:order:read',
    orderApprove: 'sales:order:approve',
    orderCancel: 'sales:order:cancel',
    invoiceCreate: 'sales:invoice:create',
    invoiceRead: 'sales:invoice:read',
    invoiceCancel: 'sales:invoice:cancel',
    invoiceAddPayment: 'sales:invoice:addpayment',
    invoiceAssignTaxNumber: 'sales:invoice:assigntaxnumber',
    customerManage: 'sales:customer:manage',
    customerRead: 'sales:customer:read',
    priceListManage: 'sales:pricelist:manage',
    creditManage: 'sales:credit:manage',
    crnView: 'sales:crn:view',
    crnCreate: 'sales:crn:create',
    crnAddLine: 'sales:crn:addline',
    crnRemoveLine: 'sales:crn:removeline',
    crnSubmit: 'sales:crn:submit',
    crnVerify: 'sales:crn:verify',
    crnReject: 'sales:crn:reject',
    crnCancel: 'sales:crn:cancel',
    customerCreditView: 'sales:customercredit:view',
    customerCreditApply: 'sales:customercredit:apply',
  },
  salesOrders: {
    view: 'sales:salesorder:view',
    create: 'sales:salesorder:create',
    addLine: 'sales:salesorder:addline',
    updateLine: 'sales:salesorder:updateline',
    removeLine: 'sales:salesorder:removeline',
    confirm: 'sales:salesorder:confirm',
    cancelDraft: 'sales:salesorder:cancel:draft',
    cancelConfirmed: 'sales:salesorder:cancel:confirmed',
    convert: 'sales:salesorder:convert',
  },
  collections: {
    sessionManage: 'collections:session:manage',
    chequeProcess: 'collections:cheque:process',
    cashVerify: 'collections:cash:verify',
    creditManage: 'collections:credit:manage',
  },
  fleet: {
    vehicleRead: 'fleet:vehicle:read',
    vehicleManage: 'fleet:vehicle:manage',
    routeAssign: 'fleet:route:assign',
    driverManage: 'fleet:driver:manage',
    fuelLogManage: 'fleet:fuellog:manage',
    maintenanceLog: 'fleet:maintenance:manage',
  },
  reporting: {
    viewReports: 'reporting:reports:view',
    exportData: 'reporting:reports:export',
  },
}

function getPermissionKey(permission) {
  if (!permission) return ''
  if (typeof permission === 'string') return permission

  const module = permission.module ?? permission.Module
  const resource = permission.resource ?? permission.Resource
  const action = permission.action ?? permission.Action

  return (
    permission.permissionKey ??
    permission.PermissionKey ??
    permission.key ??
    permission.Key ??
    permission.value ??
    permission.Value ??
    permission.name ??
    permission.Name ??
    (module && resource && action ? `${module}:${resource}:${action}` : '')
  )
}

function getRoleName(role) {
  if (!role) return ''
  if (typeof role === 'string') return role
  return role.name ?? role.Name ?? role.roleName ?? role.RoleName ?? ''
}

function normalizePermissions(permissions) {
  if (!permissions) return []
  return Array.isArray(permissions)
    ? permissions.map(getPermissionKey).filter(Boolean)
    : [getPermissionKey(permissions)].filter(Boolean)
}

function getUserPermissions(user) {
  return normalizePermissions(user?.permissions)
}

function userHasAdminRole(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : []
  return roles.some((role) => getRoleName(role).toLowerCase() === 'admin')
}

function hasPermissionToken(user, permission) {
  const userPermissions = getUserPermissions(user)
  return userHasAdminRole(user) || userPermissions.includes('*') || userPermissions.includes(permission)
}

export function userHasAnyPermission(user, requiredPermissions) {
  const required = normalizePermissions(requiredPermissions)
  if (required.length === 0) return true
  return required.some((permission) => hasPermissionToken(user, permission))
}

export function userHasAllPermissions(user, requiredPermissions) {
  const required = normalizePermissions(requiredPermissions)
  if (required.length === 0) return true
  return required.every((permission) => hasPermissionToken(user, permission))
}

export function userMeetsPermissionRequirement(user, requirement) {
  if (!requirement) return true

  if (typeof requirement === 'object' && !Array.isArray(requirement)) {
    const anyRequirement = requirement.any || requirement.anyOf
    const allRequirement = requirement.all || requirement.allOf
    const passesAny = anyRequirement ? userHasAnyPermission(user, anyRequirement) : true
    const passesAll = allRequirement ? userHasAllPermissions(user, allRequirement) : true
    return passesAny && passesAll
  }

  return userHasAnyPermission(user, requirement)
}

export function describePermissionRequirement(requirement) {
  if (!requirement) return ''
  if (typeof requirement === 'object' && !Array.isArray(requirement)) {
    const parts = []
    if (requirement.all || requirement.allOf) {
      parts.push(`all of: ${normalizePermissions(requirement.all || requirement.allOf).join(', ')}`)
    }
    if (requirement.any || requirement.anyOf) {
      parts.push(`any of: ${normalizePermissions(requirement.any || requirement.anyOf).join(', ')}`)
    }
    return parts.join(' and ')
  }
  return normalizePermissions(requirement).join(' or ')
}

export function userHasPermission(user, requiredPermissions) {
  return userMeetsPermissionRequirement(user, requiredPermissions)
}
