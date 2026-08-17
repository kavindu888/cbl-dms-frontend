# Collections frontend discovery

## HTTP client and response shape

- The shared Axios client is the default `api` export from `src/lib/api.js`.
- `src/api/collectionsApi.js` uses a module-local exported `collectionsAxios` wrapper for `/api/collections` and a private `collectionsV1Axios` wrapper for `/api/v1/collections` because the backend currently exposes both route groups.
- Collections controllers return `ApiResponse<Result<T>>`. Successful data is normally `response.data.data.value`; command failures expose `errorMessage` and `validationErrors` under `response.data.data`. `unwrapCollectionsResponse` handles both the envelope and unwrapped responses.

## Confirmed controller endpoints

| Resource | Method and URL |
| --- | --- |
| Banks | `GET /api/v1/collections/banks`, `POST /api/v1/collections/banks`, `DELETE /api/v1/collections/banks/{id}` |
| Bank branches | `GET /api/v1/collections/banks/{id}/branches`, `POST /api/v1/collections/banks/{id}/branches` |
| Sessions | `GET/POST /api/collections/sessions`, `GET /api/collections/sessions/{id}`, `POST /api/collections/sessions/{id}/close`, `POST /api/collections/sessions/{id}/verify` |
| Legacy session entry | `POST /api/collections/sessions/{id}/cash`, `POST /api/collections/sessions/{id}/cheque` |
| Allocated payments | `POST /api/v1/collections/payments/cash`, `POST /api/v1/collections/payments/cheque`, `POST /api/v1/collections/payments/bank-transfer` |
| Outstanding invoices | `GET /api/v1/collections/outstanding-invoices?customerId=...` and legacy `GET /api/collections/customer-accounts/{customerId}/outstanding-invoices` |
| Cheques | `GET /api/v1/collections/cheques`, `POST /api/v1/collections/cheques/{id}/deposit`, `/clear`, `/bounce`, `/cancel`, `/write-off`, and `/deposit-batch` |
| Deposit batches | `GET/POST /api/collections/deposit-batches`, `GET /api/collections/deposit-batches/{id}`, `POST .../{id}/submit`, `POST .../{id}/confirm` |
| Customer accounts | `GET/POST /api/collections/customer-accounts`, `GET /api/collections/customer-accounts/{customerId}`, `PUT .../{customerId}/credit-limit`, `POST .../{customerId}/hold`, `POST .../{customerId}/reinstate` |

There is no cheque-by-id endpoint, standalone customer ledger endpoint, aging endpoint, or reconciliation endpoint. The frontend selects cheque detail from the list DTO, reads `recentLedger` and `aging` from account detail, and derives reconciliation from session detail. Deposit batches are not named `cheque-deposit-batches` in the live controller.

## DTO fields returned by the API

ASP.NET JSON serialization returns these record properties in camelCase:

- `CollectionSessionDto`: `id`, `sessionNumber`, `salesRepId`, `routeId`, `sessionDate`, `status`, `totalCash`, `totalCheques`, `totalAmount`, `collectionCount`, `closedOn`, `verifiedOn`, `verifiedByUserId`, `closureNotes`, `collections`.
- `CollectionSessionListItemDto`: `id`, `sessionNumber`, `salesRepId`, `routeId`, `sessionDate`, `status`, `totalCash`, `totalCheques`, `totalAmount`, `collectionCount`, `closedOn`.
- `CollectionDto`: `id`, `sessionId`, `customerId`, `invoiceId`, `method`, `amount`, `notes`, `collectedOn`, `collectedByUserId`, `chequeId`, `denominations`.
- `CashDenominationDto`: `denomination`, `count`, `total`.
- `ChequeDto`: `id`, `organizationId`, `customerId`, `collectionId`, `chequeNumber`, `bankName`, `branchName`, `drawerName`, `amount`, `chequeDate`, `status`, `receivedAt`, `depositedAt`, `clearedAt`, `bouncedAt`, `cancelledAt`, `depositBatchId`, `bounceReason`, `bounceChargeAmount`, `cancelReason`, `bounceCount`, `isPermanentlyBounced`, `bankId`, `bankBranchId`.
- `ChequeDepositBatchDto`: `id`, `batchNumber`, `bankName`, `branchName`, `depositDate`, `totalAmount`, `chequeCount`, `status`, `notes`, `confirmedAt`, `cheques`.
- `ChequeDepositBatchListItemDto`: `id`, `batchNumber`, `bankName`, `depositDate`, `totalAmount`, `chequeCount`, `status`.
- `CustomerAccountDto`: `id`, `customerId`, `creditLimit`, `currentBalance`, `availableCredit`, `paymentTermsDays`, `status`.
- `CustomerAccountDetailDto`: the account fields above plus `aging` and `recentLedger`.
- `AgingDto`: `current`, `days1To7`, `days8To14`, `days15To21`, `days21Plus`.
- `CustomerLedgerEntryDto`: `id`, `type`, `debit`, `credit`, `runningBalance`, `referenceId`, `referenceText`, `transactionDate`.
- `OutstandingInvoiceDto`: `invoiceId`, `invoiceNumber`, `netAmount`, `amountPaid`, `outstandingAmount`, `status`, `invoiceDate`, `dueDate`, `daysOverdue`.
- `BankDto`: `id`, `name`, `swiftCode`. `BankBranchDto`: `id`, `bankId`, `name`, `branchCode`.

Confirmed request bodies: open session `{ routeId, sessionDate }`; cash payment `{ sessionId, customerId, totalAmount, allocations, denominations: [{ denomination, count }] }`; cheque payment `{ sessionId, customerId, totalAmount, chequeNumber, drawerName, chequeDate, allocations, bankId, bankBranchId, bankName, branchName, notes }`; transfer `{ sessionId, customerId, bankId, bankBranchId, referenceNumber, totalAmount, transferDate, allocations, notes }`; branch `{ branchName, branchCode }`.

## Existing frontend and reused patterns

- Existing collection pages discovered: `AgingAnalysisPage.jsx`, `ChequesPage.jsx`, `CollectionSessionDetailPage.jsx`, `CollectionSessionsPage.jsx`, `CustomerAccountPage.jsx`, `DailyEntryPage.jsx`, `DepositBatchesPage.jsx`, `ReconciliationPage.jsx`, and `collectionsUi.jsx`.
- Existing collection components discovered: `AgingBadge.jsx` and `ChequeStatusBadge.jsx`. This implementation adds `CustomerSelector.jsx`, `InvoiceAllocationTable.jsx`, and `PaymentTabs.jsx`.
- The requested `src/pages/sales/Invoices/InvoiceDetailPage.jsx` does not exist. The active equivalent is `src/pages/sales/InvoiceDetailPage.jsx` and its panel/table/amount patterns were followed.
- `src/api/salesApi.js` does not expose invoice/customer search functions. The active `salesService` exposes `listCustomers`, `listAllCustomers`, `listInvoices`, and `getInvoicesByCustomer`; Collections uses `salesService.listCustomers` for customer search.
- The purchasing split-pane reference and inventory form reference use panel containers, `form-input`, responsive grid helpers, explicit loading/error states, and mutation-backed submit controls; the collection pages follow those conventions.

## Router, sidebar, dates, and auth

- The mounted router is `src/routes/index.jsx`, using relative child route objects beneath the authenticated `AppShell`: `{ path: 'collections/banks', element: requirePermission(<BankManagementPage />, PERMISSIONS.collections.bankManage) }`.
- Sidebar groups are `{ label: 'COLLECTIONS', items: [...] }`; items are `{ label, to, icon, permissions }`. Permission requirements may be a string, an any-of array, or `{ all: [...] }`.
- `src/utils/formatDate.js` configures Day.js for `Asia/Colombo` and exports `formatDate`, `formatDateTime`, `formatShortDateTime`, `formatTime`, `formatMonthYear`, `isOverdue`, and `daysOverdue`.
- Auth is Zustand-backed. `useAuth()` returns `useAuthStore()` and identity is accessed as `user?.id`. Collections controllers derive user and organization IDs from JWT claims, so the frontend does not send either field.
