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
  },
  sales: {
    orderCreate: 'sales:order:create',
    orderRead: 'sales:order:read',
    invoiceCreate: 'sales:invoice:create',
    invoiceRead: 'sales:invoice:read',
    invoiceCancel: 'sales:invoice:cancel',
    invoiceAddPayment: 'sales:invoice:addpayment',
    invoiceAssignTaxNumber: 'sales:invoice:assigntaxnumber',
    customerManage: 'sales:customer:manage',
    customerRead: 'sales:customer:read',
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
  },
  reporting: {
    viewReports: 'reporting:reports:view',
    exportData: 'reporting:reports:export',
  },
}

export function userHasPermission(user, requiredPermissions) {
  if (!requiredPermissions) return true

  const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
  if (required.length === 0) return true

  const userPermissions = user?.permissions || []

  return (
    userPermissions.includes('*') ||
    required.some((permission) => userPermissions.includes(permission))
  )
}
