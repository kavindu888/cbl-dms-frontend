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
import GRNEntryPage from '@pages/purchasing/grn/GRNEntryPage'
import GoodsReceiptEntryPage from '@pages/purchasing/grn/GoodsReceiptEntryPage'
import GoodsReceiptListPage from '@pages/purchasing/grn/GoodsReceiptListPage'
import GrnApproveRejectPage from '@pages/purchasing/grn/GrnApproveRejectPage'
import PurchaseOrderApprovalPage from '@pages/purchasing/purchase-orders/PurchaseOrderApprovalPage'
import PlacePurchaseOrderPage from '@pages/purchasing/purchase-orders/PlacePurchaseOrderPage'
import PurchaseReturnsPage from '@pages/purchasing/returns/PurchaseReturnsPage'
import ReturnNoteApprovalsPage from '@pages/purchasing/ReturnNotes/ReturnNoteApprovalsPage'
import ReturnNoteDetailPage from '@pages/purchasing/ReturnNotes/ReturnNoteDetailPage'
import ReturnNoteListPage from '@pages/purchasing/ReturnNotes/ReturnNoteListPage'
import NewReturnNotePage from '@pages/purchasing/ReturnNotes/NewReturnNotePage'
import SupplierSettlementPage from '@pages/purchasing/settlement/SupplierSettlementPage'
import SupplierListPage from '@pages/master/SupplierListPage'
import ReportHubPage from '@pages/reports/ReportHubPage'
import ReportPreviewPage from '@pages/reports/ReportPreviewPage'
import CustomerDetailPage from '@pages/sales/CustomerDetailPage'
import CustomerGroupListPage from '@pages/sales/CustomerGroupListPage'
import InvoiceCreatorPage from '@pages/sales/InvoiceCreatorPage'
import InvoiceDetailPage from '@pages/sales/InvoiceDetailPage'
import InvoiceListPage from '@pages/sales/InvoiceListPage'
import InvoicePaymentRecordPage from '@pages/sales/InvoicePaymentRecordPage'
import SalesOrderModulePage from '@pages/sales/SalesOrderModulePage'
import SettingsPage from '@pages/settings/SettingsPage'
import RolesPermissionsPage from '@pages/users/RolesPermissionsPage'
import UserListPage from '@pages/users/UserListPage'
import UserProfilePage from '@pages/users/UserProfilePage'
import CrnListPage from '@pages/sales/CustomerReturnNotes/CrnListPage'
import CrnDetailPage from '@pages/sales/CustomerReturnNotes/CrnDetailPage'
import CustomerCreditPage from '@pages/sales/CustomerCredit/CustomerCreditPage'
import ReturnStockPage from '@pages/inventory/ReturnStock/ReturnStockPage'
import InStoreReturnCreatePage from '@pages/inventory/InStoreReturns/InStoreReturnCreatePage'
import InStoreReturnDetailPage from '@pages/inventory/InStoreReturns/InStoreReturnDetailPage'
import InStoreReturnListPage from '@pages/inventory/InStoreReturns/InStoreReturnListPage'
import StockOverviewPage from '@pages/inventory/Stock/StockOverviewPage'
import StockBatchesDetailPage from '@pages/inventory/Stock/StockBatchesPage'
import StockAuditPage from '@pages/inventory/StockAudit/StockAuditPage'
import SalesListPage from '@pages/sales/SalesListPage'
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
      <ProtectedRoute
        requiredRole={Role.Admin}
        requiredPermission={PERMISSIONS.identity.userManage}
      >
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
        element: requirePermission(<PurchaseOrderApprovalPage />, {
          all: [PERMISSIONS.purchasing.poRead, PERMISSIONS.purchasing.poApprove],
        }),
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
        path: 'purchasing/grn/new',
        element: requirePermission(<GoodsReceiptEntryPage />, PERMISSIONS.purchasing.grnCreate),
      },
      {
        path: 'purchasing/grn/entry/:poId',
        element: requirePermission(<GRNEntryPage />, PERMISSIONS.purchasing.grnCreate),
      },
      {
        path: 'purchasing/goods-receipt-entry',
        element: requirePermission(<GoodsReceiptEntryPage />, PERMISSIONS.purchasing.grnCreate),
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
        path: 'purchasing/return-notes',
        element: requirePermission(<ReturnNoteListPage />, [
          PERMISSIONS.purchasing.returnNoteCreate,
          PERMISSIONS.purchasing.returnNoteApprove,
          PERMISSIONS.purchasing.returnNoteComplete,
        ]),
      },
      {
        path: 'purchasing/return-notes/new',
        element: requirePermission(<NewReturnNotePage />, PERMISSIONS.purchasing.returnNoteCreate),
      },
      {
        path: 'purchasing/return-notes/approvals',
        element: requirePermission(<ReturnNoteApprovalsPage />, [
          PERMISSIONS.purchasing.returnNoteApprove,
          PERMISSIONS.purchasing.returnNoteComplete,
        ]),
      },
      {
        path: 'purchasing/return-notes/:id',
        element: requirePermission(<ReturnNoteDetailPage />, [
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
        element: requirePermission(
          <StockOverviewPage />,
          PERMISSIONS.inventory.stockRead
        ),
      },
      {
        path: 'inventory/return-stock',
        element: requirePermission(
          <ReturnStockPage />,
          PERMISSIONS.inventory.stockRead
        ),
      },
      {
        path: 'inventory/in-store-returns',
        element: requirePermission(<InStoreReturnListPage />, [
          PERMISSIONS.inventory.inStoreReturnCreate,
          PERMISSIONS.inventory.inStoreReturnApprove,
        ]),
      },
      {
        path: 'inventory/in-store-returns/new',
        element: requirePermission(
          <InStoreReturnCreatePage />,
          PERMISSIONS.inventory.inStoreReturnCreate
        ),
      },
      {
        path: 'inventory/in-store-returns/:id',
        element: requirePermission(<InStoreReturnDetailPage />, [
          PERMISSIONS.inventory.inStoreReturnCreate,
          PERMISSIONS.inventory.inStoreReturnApprove,
        ]),
      },
      {
        path: 'inventory/stock-audit',
        element: requirePermission(
          <StockAuditPage />,
          PERMISSIONS.inventory.stockRead
        ),
      },
      {
        path: 'inventory/stock/batches/:productId',
        element: requirePermission(
          <StockBatchesDetailPage />,
          PERMISSIONS.inventory.stockRead
        ),
      },
      {
        path: 'inventory/batches',
        element: requirePermission(<StockBatchesPage />, PERMISSIONS.inventory.stockRead),
      },
      {
        path: 'inventory/locations',
        element: requirePermission(
          <StockModulePage initialTab="locations" />,
          PERMISSIONS.inventory.stockRead
        ),
      },
      {
        path: 'inventory/transfers',
        element: requirePermission(
          <StockModulePage initialTab="transfers" />,
          PERMISSIONS.inventory.stockRead
        ),
      },
      {
        path: 'inventory/stocktakes',
        element: requirePermission(
          <StockModulePage initialTab="stocktakes" />,
          PERMISSIONS.inventory.stocktakeManage
        ),
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
        element: requirePermission(
          <StockModulePage initialTab="movements" />,
          PERMISSIONS.inventory.stockRead
        ),
      },
      {
        path: 'inventory/adjustments',
        element: <Navigate to="/inventory/stocktakes" replace />,
      },
      {
        path: 'sales/return-notes',
        element: requirePermission(<CrnListPage />, PERMISSIONS.sales.crnView),
      },
      {
        path: 'sales/return-notes/:id',
        element: requirePermission(<CrnDetailPage />, PERMISSIONS.sales.crnView),
      },
      {
        path: 'sales/customer-credit',
        element: requirePermission(<CustomerCreditPage />, PERMISSIONS.sales.customerCreditView),
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
        path: 'sales/list',
        element: requirePermission(<SalesListPage />, [
          PERMISSIONS.salesOrders.view,
          PERMISSIONS.salesOrders.create,
          PERMISSIONS.sales.orderRead,
          PERMISSIONS.sales.orderCreate,
        ]),
      },
      {
        path: 'sales/orders',
        element: requirePermission(<SalesOrderModulePage />, [
          PERMISSIONS.salesOrders.view,
          PERMISSIONS.salesOrders.create,
          PERMISSIONS.sales.orderRead,
          PERMISSIONS.sales.orderCreate,
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
        path: 'sales/invoice-payment-record',
        element: requirePermission(<InvoicePaymentRecordPage />, {
          all: [PERMISSIONS.sales.invoiceRead, PERMISSIONS.sales.invoiceAddPayment],
        }),
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
        element: requirePermission(<UserListPage />, {
          all: [PERMISSIONS.identity.userManage, PERMISSIONS.identity.roleManage],
        }),
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


