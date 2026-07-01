import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@components/layout'
import { Role } from '@/types/auth.types'
import LoginPage from '@pages/auth/LoginPage'
import RegisterPage from '@pages/auth/RegisterPage'
import AgingAnalysisPage from '@pages/collections/AgingAnalysisPage'
import DailyEntryPage from '@pages/collections/DailyEntryPage'
import ReconciliationPage from '@pages/collections/ReconciliationPage'
import DashboardPage from '@pages/dashboard/DashboardPage'
import FleetOverviewPage from '@pages/fleet/FleetOverviewPage'
import VehicleDetailPage from '@pages/fleet/VehicleDetailPage'
import StockModulePage from '@pages/inventory/StockModulePage'
import StockBatchesPage from '@pages/inventory/StockBatchesPage'
import CategoryListPage from '@pages/master/CategoryListPage'
import MasterCustomerListPage from '@pages/master/CustomerListPage'
import Product from '@pages/master/Product'
import SalesRouteListPage from '@pages/master/SalesRouteListPage'
import UnitOfMeasureListPage from '@pages/master/UnitOfMeasureListPage'
import AllPurchaseOrdersPage from '@pages/purchasing/purchase-orders/AllPurchaseOrdersPage'
import ApprovedPurchaseOrdersPage from '@pages/purchasing/purchase-orders/ApprovedPurchaseOrdersPage'
import GoodsReceiptEntryPage from '@pages/purchasing/grn/GoodsReceiptEntryPage'
import GoodsReceiptListPage from '@pages/purchasing/grn/GoodsReceiptListPage'
import GrnApproveRejectPage from '@pages/purchasing/grn/GrnApproveRejectPage'
import PurchaseOrderApprovalPage from '@pages/purchasing/purchase-orders/PurchaseOrderApprovalPage'
import PlacePurchaseOrderPage from '@pages/purchasing/purchase-orders/PlacePurchaseOrderPage'
import PurchaseReturnsPage from '@pages/purchasing/returns/PurchaseReturnsPage'
import SupplierSettlementPage from '@pages/purchasing/settlement/SupplierSettlementPage'
import SupplierListPage from '@pages/master/SupplierListPage'
import ReportHubPage from '@pages/reports/ReportHubPage'
import ReportPreviewPage from '@pages/reports/ReportPreviewPage'
import CustomerDetailPage from '@pages/sales/CustomerDetailPage'
import CustomerGroupListPage from '@pages/sales/CustomerGroupListPage'
import InvoiceCreatorPage from '@pages/sales/InvoiceCreatorPage'
import InvoiceDetailPage from '@pages/sales/InvoiceDetailPage'
import InvoiceListPage from '@pages/sales/InvoiceListPage'
import SettingsPage from '@pages/settings/SettingsPage'
import RolesPermissionsPage from '@pages/users/RolesPermissionsPage'
import UserListPage from '@pages/users/UserListPage'
import UserProfilePage from '@pages/users/UserProfilePage'
import { ProtectedRoute } from './ProtectedRoute'
import { PERMISSIONS } from '@/utils/permissions'

function requirePermission(element, requiredPermission) {
  return <ProtectedRoute requiredPermission={requiredPermission}>{element}</ProtectedRoute>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: (
      <ProtectedRoute requiredRole={Role.Admin} requiredPermission={PERMISSIONS.identity.userManage}>
        <RegisterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'purchasing',
        element: <Navigate to="/purchasing/place-order" replace />,
      },
      {
        path: 'purchasing/place-order',
        element: requirePermission(<PlacePurchaseOrderPage />, PERMISSIONS.purchasing.poCreate),
      },
      {
        path: 'purchasing/approvals',
        element: requirePermission(<PurchaseOrderApprovalPage />, { all: [PERMISSIONS.purchasing.poRead, PERMISSIONS.purchasing.poApprove] }),
      },
      {
        path: 'purchasing/approved',
        element: requirePermission(<ApprovedPurchaseOrdersPage />, PERMISSIONS.purchasing.poRead),
      },
      {
        path: 'purchasing/all-orders',
        element: requirePermission(<AllPurchaseOrdersPage />, PERMISSIONS.purchasing.poRead),
      },
      {
        path: 'purchasing/orders',
        element: <Navigate to="/purchasing/all-orders" replace />,
      },
      {
        path: 'purchasing/suppliers',
        element: requirePermission(<SupplierListPage />, PERMISSIONS.purchasing.supplierManage),
      },
      {
        path: 'purchasing/grn-entry',
        element: <Navigate to="/purchasing/goods-receipt-entry" replace />,
      },
      {
        path: 'purchasing/goods-receipt-entry',
        element: requirePermission(
          <GoodsReceiptEntryPage />,
          PERMISSIONS.purchasing.grnCreate
        ),
      },
      {
        path: 'purchasing/goods-receipts',
        element: requirePermission(<GoodsReceiptListPage />, [
          PERMISSIONS.purchasing.grnCreate,
          PERMISSIONS.purchasing.grnVerify,
        ]),
      },

      {
        path: 'purchasing/grn-approve-reject',
        element: requirePermission(<GrnApproveRejectPage />, PERMISSIONS.purchasing.grnVerify),
      },
      {
        path: 'purchasing/returns',
        element: requirePermission(<PurchaseReturnsPage />, [
          PERMISSIONS.purchasing.returnNoteCreate,
          PERMISSIONS.purchasing.returnNoteApprove,
          PERMISSIONS.purchasing.returnNoteComplete,
        ]),
      },
      {
        path: 'purchasing/settlement',
        element: requirePermission(
          <SupplierSettlementPage />,
          PERMISSIONS.purchasing.settlementCreate
        ),
      },

      {
        path: 'inventory',
        element: <Navigate to="/inventory/stock" replace />,
      },
      {
        path: 'inventory/stock',
        element: requirePermission(<StockModulePage initialTab="levels" />, PERMISSIONS.inventory.stockRead),
      },
      {
        path: 'inventory/batches',
        element: requirePermission(<StockBatchesPage />, PERMISSIONS.inventory.stockRead),
      },
      {
        path: 'inventory/locations',
        element: requirePermission(<StockModulePage initialTab="locations" />, PERMISSIONS.inventory.stockRead),
      },
      {
        path: 'inventory/transfers',
        element: requirePermission(<StockModulePage initialTab="transfers" />, PERMISSIONS.inventory.stockRead),
      },
      {
        path: 'inventory/stocktakes',
        element: requirePermission(<StockModulePage initialTab="stocktakes" />, PERMISSIONS.inventory.stocktakeManage),
      },
      {
        path: 'master/suppliers',
        element: requirePermission(<SupplierListPage />, PERMISSIONS.purchasing.supplierManage),
      },
      {
        path: 'master/customers',
        element: <Navigate to="/sales/customers" replace />,
      },
      {
        path: 'sales/customers',
        element: requirePermission(<MasterCustomerListPage />, [
          PERMISSIONS.sales.customerRead,
          PERMISSIONS.sales.customerManage,
        ]),
      },
      {
        path: 'master/products',
        element: requirePermission(<Product />, PERMISSIONS.masterData.productRead),
      },
      {
        path: 'master/categories',
        element: requirePermission(<CategoryListPage />, PERMISSIONS.masterData.categoryManage),
      },
      {
        path: 'master/brands',
        element: <Navigate to="/master/products" replace />,
      },
      {
        path: 'master/units-of-measure',
        element: requirePermission(<UnitOfMeasureListPage />, PERMISSIONS.masterData.uomManage),
      },
      {
        path: 'master/sales-routes',
        element: requirePermission(<SalesRouteListPage />, PERMISSIONS.masterData.salesRouteManage),
      },
      {
        path: 'inventory/categories',
        element: requirePermission(<CategoryListPage />, PERMISSIONS.masterData.categoryManage),
      },
      {
        path: 'inventory/brands',
        element: <Navigate to="/master/products" replace />,
      },
      {
        path: 'inventory/movements',
        element: requirePermission(<StockModulePage initialTab="movements" />, PERMISSIONS.inventory.stockRead),
      },
      {
        path: 'inventory/adjustments',
        element: <Navigate to="/inventory/stocktakes" replace />,
      },
      {
        path: 'sales/customer-groups',
        element: requirePermission(<CustomerGroupListPage />, PERMISSIONS.sales.customerManage),
      },
      {
        path: 'sales/customers/:id',
        element: requirePermission(<CustomerDetailPage />, [
          PERMISSIONS.sales.customerRead,
          PERMISSIONS.sales.customerManage,
        ]),
      },
      {
        path: 'sales/invoices',
        element: requirePermission(<InvoiceListPage />, PERMISSIONS.sales.invoiceRead),
      },
      {
        path: 'sales/invoices/new',
        element: requirePermission(<InvoiceCreatorPage />, PERMISSIONS.sales.invoiceCreate),
      },
      {
        path: 'sales/invoices/:id',
        element: requirePermission(<InvoiceDetailPage />, PERMISSIONS.sales.invoiceRead),
      },
      {
        path: 'collections/daily',
        element: requirePermission(<DailyEntryPage />, PERMISSIONS.collections.sessionManage),
      },
      {
        path: 'collections/aging',
        element: requirePermission(<AgingAnalysisPage />, PERMISSIONS.collections.creditManage),
      },
      {
        path: 'collections/reconciliation',
        element: requirePermission(<ReconciliationPage />, [
          PERMISSIONS.collections.cashVerify,
          PERMISSIONS.collections.chequeProcess,
        ]),
      },
      {
        path: 'fleet',
        element: requirePermission(<FleetOverviewPage />, PERMISSIONS.fleet.vehicleRead),
      },
      {
        path: 'fleet/vehicles/:id',
        element: requirePermission(<VehicleDetailPage />, PERMISSIONS.fleet.vehicleRead),
      },
      {
        path: 'reports',
        element: requirePermission(<ReportHubPage />, PERMISSIONS.reporting.viewReports),
      },
      {
        path: 'reports/:type',
        element: requirePermission(<ReportPreviewPage />, PERMISSIONS.reporting.viewReports),
      },
      {
        path: 'users',
        element: requirePermission(<UserListPage />, { all: [PERMISSIONS.identity.userManage, PERMISSIONS.identity.roleManage] }),
      },
      {
        path: 'users/roles',
        element: requirePermission(<RolesPermissionsPage />, [
          PERMISSIONS.identity.roleManage,
          PERMISSIONS.identity.permissionManage,
        ]),
      },
      {
        path: 'settings',
        element: requirePermission(<SettingsPage />, [
          PERMISSIONS.masterData.orgManage,
          PERMISSIONS.masterData.territoryManage,
          PERMISSIONS.masterData.businessUnitManage,
          PERMISSIONS.masterData.taxRead,
          PERMISSIONS.masterData.taxManage,
        ]),
      },
      {
        path: 'profile',
        element: <UserProfilePage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])




