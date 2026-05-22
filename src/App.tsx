/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@components/layout'
import { useAuthStore } from '@stores/authStore'
import { Role } from '@/types/auth.types'

import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AgingAnalysisPage from './pages/collections/AgingAnalysisPage'
import DailyEntryPage from './pages/collections/DailyEntryPage'
import ReconciliationPage from './pages/collections/ReconciliationPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import FleetOverviewPage from './pages/fleet/FleetOverviewPage'
import RouteLogPage from './pages/fleet/RouteLogPage'
import VehicleDetailPage from './pages/fleet/VehicleDetailPage'
import MonthlyAdjustmentPage from './pages/inventory/MonthlyAdjustmentPage'
import MovementLogPage from './pages/inventory/MovementLogPage'
import BrandListPage from './pages/master/BrandListPage'
import CategoryListPage from './pages/master/CategoryListPage'
import MasterCustomerListPage from './pages/master/CustomerListPage'
import StockOverviewPage from './pages/master/StockOverviewPage'
import PurchaseOrderDetailPage from './pages/purchasing/PurchaseOrderDetailPage'
import PurchaseOrderListPage from './pages/purchasing/PurchaseOrderListPage'
import PurchaseReturnsPage from './pages/purchasing/PurchaseReturnsPage'
import ReceiptEntryPage from './pages/purchasing/ReceiptEntryPage'
import SupplierListPage from './pages/master/SupplierListPage'
import ReportHubPage from './pages/reports/ReportHubPage'
import ReportPreviewPage from './pages/reports/ReportPreviewPage'
import CustomerDetailPage from './pages/sales/CustomerDetailPage'
import CustomerListPage from './pages/sales/CustomerListPage'
import InvoiceCreatorPage from './pages/sales/InvoiceCreatorPage'
import InvoiceDetailPage from './pages/sales/InvoiceDetailPage'
import InvoiceListPage from './pages/sales/InvoiceListPage'
import SettingsPage from './pages/settings/SettingsPage'
import RolesPermissionsPage from './pages/users/RolesPermissionsPage'
import UserListPage from './pages/users/UserListPage'
import UserProfilePage from './pages/users/UserProfilePage'


type ProtectedRouteProps = {
  children: ReactNode
  requiredRole?: string
  requiredPermission?: string
}

function ProtectedRoute({ children, requiredRole, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, hasRole } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)] px-4">
        <div className="panel w-full max-w-md p-8 text-center">
          <p className="eyebrow">Authorizing</p>
          <p className="mt-3 text-lg text-[var(--color-text-primary)]">
            Preparing the ERP shell...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
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
        element: <PurchaseOrderListPage />,
      },
      {
        path: 'purchasing/suppliers',
        element: <SupplierListPage />,
      },
      {
        path: 'purchasing/returns',
        element: <PurchaseReturnsPage />,
      },
      {
        path: 'purchasing/:id',
        element: <PurchaseOrderDetailPage />,
      },
      {
        path: 'purchasing/:id/receive',
        element: <ReceiptEntryPage />,
      },
      {
        path: 'inventory',
        element: <StockOverviewPage />,
      },
      {
        path: 'master/suppliers',
        element: <SupplierListPage />,
      },
      {
        path: 'master/customers',
        element: <MasterCustomerListPage />,
      },
      {
        path: 'master/products',
        element: <StockOverviewPage />,
      },
      {
        path: 'master/categories',
        element: <CategoryListPage />,
      },
      {
        path: 'master/brands',
        element: <BrandListPage />,
      },
      {
        path: 'inventory/categories',
        element: <CategoryListPage />,
      },
      {
        path: 'inventory/brands',
        element: <BrandListPage />,
      },
      {
        path: 'inventory/movements',
        element: <MovementLogPage />,
      },
      {
        path: 'inventory/adjustments',
        element: <MonthlyAdjustmentPage />,
      },
      {
        path: 'sales/customers',
        element: <CustomerListPage />,
      },
      {
        path: 'sales/customers/:id',
        element: <CustomerDetailPage />,
      },
      {
        path: 'sales/invoices',
        element: <InvoiceListPage />,
      },
      {
        path: 'sales/invoices/new',
        element: <InvoiceCreatorPage />,
      },
      {
        path: 'sales/invoices/:id',
        element: <InvoiceDetailPage />,
      },
      {
        path: 'collections/daily',
        element: <DailyEntryPage />,
      },
      {
        path: 'collections/aging',
        element: <AgingAnalysisPage />,
      },
      {
        path: 'collections/reconciliation',
        element: <ReconciliationPage />,
      },
      {
        path: 'fleet',
        element: <FleetOverviewPage />,
      },
      {
        path: 'fleet/routes',
        element: <RouteLogPage />,
      },
      {
        path: 'fleet/vehicles/:id',
        element: <VehicleDetailPage />,
      },
      {
        path: 'reports',
        element: <ReportHubPage />,
      },
      {
        path: 'reports/:type',
        element: <ReportPreviewPage />,
      },
      {
        path: 'users',
        element: <UserListPage />,
      },
      {
        path: 'users/roles',
        element: <RolesPermissionsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
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
