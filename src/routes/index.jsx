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
import RouteLogPage from '@pages/fleet/RouteLogPage'
import VehicleDetailPage from '@pages/fleet/VehicleDetailPage'
import MonthlyAdjustmentPage from '@pages/inventory/MonthlyAdjustmentPage'
import MovementLogPage from '@pages/inventory/MovementLogPage'
import BrandListPage from '@pages/master/BrandListPage'
import CategoryListPage from '@pages/master/CategoryListPage'
import MasterCustomerListPage from '@pages/master/CustomerListPage'
import Product from '@pages/master/Product'
import UnitOfMeasureListPage from '@pages/master/UnitOfMeasureListPage'
import PurchaseOrderDetailPage from '@pages/purchasing/PurchaseOrderDetailPage'
import PurchaseOrderListPage from '@pages/purchasing/PurchaseOrderListPage'
import PurchaseReturnsPage from '@pages/purchasing/PurchaseReturnsPage'
import ReceiptEntryPage from '@pages/purchasing/ReceiptEntryPage'
import SupplierListPage from '@pages/master/SupplierListPage'
import ReportHubPage from '@pages/reports/ReportHubPage'
import ReportPreviewPage from '@pages/reports/ReportPreviewPage'
import CustomerDetailPage from '@pages/sales/CustomerDetailPage'
import CustomerListPage from '@pages/sales/CustomerListPage'
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
      <ProtectedRoute requiredRole={Role.Admin}>
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
        element: requirePermission(<PurchaseOrderListPage />, PERMISSIONS.purchasing.poRead),
      },
      {
        path: 'purchasing/suppliers',
        element: requirePermission(<SupplierListPage />, PERMISSIONS.purchasing.supplierManage),
      },
      {
        path: 'purchasing/returns',
        element: requirePermission(<PurchaseReturnsPage />, PERMISSIONS.purchasing.poRead),
      },
      {
        path: 'purchasing/:id',
        element: requirePermission(<PurchaseOrderDetailPage />, PERMISSIONS.purchasing.poRead),
      },
      {
        path: 'purchasing/:id/receive',
        element: requirePermission(<ReceiptEntryPage />, PERMISSIONS.purchasing.grnCreate),
      },
      {
        path: 'inventory',
        element: requirePermission(<Product />, PERMISSIONS.masterData.productRead),
      },
      {
        path: 'master/suppliers',
        element: requirePermission(<SupplierListPage />, PERMISSIONS.purchasing.supplierManage),
      },
      {
        path: 'master/customers',
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
        element: requirePermission(<BrandListPage />, PERMISSIONS.masterData.productManage),
      },
      {
        path: 'master/units-of-measure',
        element: requirePermission(<UnitOfMeasureListPage />, PERMISSIONS.masterData.uomManage),
      },
      {
        path: 'inventory/categories',
        element: requirePermission(<CategoryListPage />, PERMISSIONS.masterData.categoryManage),
      },
      {
        path: 'inventory/brands',
        element: requirePermission(<BrandListPage />, PERMISSIONS.masterData.productManage),
      },
      {
        path: 'inventory/movements',
        element: requirePermission(<MovementLogPage />, PERMISSIONS.inventory.stockRead),
      },
      {
        path: 'inventory/adjustments',
        element: requirePermission(<MonthlyAdjustmentPage />, PERMISSIONS.inventory.stockAdjust),
      },
      {
        path: 'sales/customers',
        element: requirePermission(<CustomerListPage />, [
          PERMISSIONS.sales.customerRead,
          PERMISSIONS.sales.customerManage,
        ]),
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
        path: 'fleet/routes',
        element: requirePermission(<RouteLogPage />, PERMISSIONS.fleet.routeAssign),
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
        element: requirePermission(<UserListPage />, PERMISSIONS.identity.roleManage),
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
