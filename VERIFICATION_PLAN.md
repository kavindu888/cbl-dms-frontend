# CBL DMS Inventory Flow Verification Plan

Date: 2026-07-08  
Target: `https://staging.ceyservice.store/`

## 1. Frontend HTTP structure

- There is one real Axios instance: `src/lib/api.js`.
- Base origin: `VITE_API_BASE_URL`, falling back to `https://staging.ceyservice.store`. In Vite development it can use the local proxy unless `VITE_USE_API_PROXY=false`.
- Default timeout: 20 seconds; JSON content type; credentials enabled for refresh-cookie support.
- JWT: the request interceptor reads the access token through `getAccessToken()` and sets `Authorization: Bearer {token}`. A 401 triggers one refresh attempt through the auth store, except for login/refresh/logout calls.
- `src/api/inventoryApi.js` and `src/api/salesApi.js` are thin module wrappers around that shared Axios instance. The pages primarily use the fuller services in `src/services/api/`.

Module URL prefixes used by the active services:

| Module | Prefix |
|---|---|
| Authentication | root paths such as `/login`, `/refresh`, `/logout` |
| Purchasing | `/api/v1` |
| Inventory stock/return staging | `/api/v1/inventory` |
| Inventory locations | `/api/inventory` |
| Sales orders and CRN/credit | `/api/sales` |
| Sales invoices/customers | `/api/v1/sales` |
| Master products | `/api/v1/master-data` |

## 2. Exact tested endpoint map

| Operation | Method and path | Contract notes |
|---|---|---|
| Login | `POST /login` | The prompt's `/api/auth/login` is not the frontend/backend route. |
| Current user | No `/api/auth/me` call exists in the frontend; token user is returned by login. Probe documented alternatives without mutating data. |
| Products | `GET /api/v1/master-data/products?page=1&pageSize=5` | Backend page size maximum is 100. |
| Suppliers | `GET /api/v1/suppliers` | Wrapped `ApiResponse<Result<PagedResult>>`. |
| Customers | `GET /api/v1/sales/customers` | Wrapped sales customer endpoint. |
| Locations | `GET /api/inventory/stock-locations` | Not under `/api/v1`. |
| Create PO | `POST /api/v1/purchase-orders` | Header only; lines are separate. |
| Add PO line | `POST /api/v1/purchase-orders/{id}/lines` | Requires product ID/SKU/name, `bigBoxQty`, unit cost. |
| Submit/approve PO | `POST /api/v1/purchase-orders/{id}/submit`, then `/approve` | Both required state transitions. |
| Create GRN | `POST /api/v1/goods-receipts` | Header only. |
| Add GRN line | `POST /api/v1/goods-receipts/{id}/lines` | Uses `qtyBaseUnit`, not `receivedQty`. |
| Submit/verify GRN | `POST /api/v1/goods-receipts/{id}/submit`, then `/verify` | Verify body is empty; user comes from JWT. |
| Create sales order | `POST /api/sales/orders` | Header: customer, optional delivery date, notes. |
| Add sales-order line | `POST /api/sales/orders/{id}/lines` | Product, quantity, discount; price derives server-side. |
| Confirm sales order | `PUT /api/sales/orders/{id}/confirm` | Expected to reserve stock. |
| Convert order to invoice | `POST /api/sales/orders/{id}/convert-to-invoice` | Requires vehicle ID; this is the order-to-invoice endpoint. |
| Create direct invoice | `POST /api/v1/sales/invoices` | Alternative full direct-invoice contract. Finalizes and emits issue event during creation. |
| Issue invoice | No separate endpoint exists | Deduction is expected during conversion/direct creation. A documented `/issue` probe may return 404/405 and will not be relied on. |
| Create CRN | `POST /api/sales/return-notes` | Reason enum accepts numeric or named JSON enum if staging is configured accordingly. |
| Add CRN line | `POST /api/sales/return-notes/{id}/lines` | Product, quantity, MRP, discount. |
| Submit/verify CRN | `PUT /api/sales/return-notes/{id}/submit`, then `/verify` | Verify creates credit and publishes inventory event. |
| Customer credit | `GET /api/sales/customer-credit/{customerId}/balance` and `/transactions` | Read-only verification. |
| Flag return stock | `POST /api/v1/inventory/return-stock/flag` | Source batch, quantity, reason, notes. |
| List/by-product staging | `GET /api/v1/inventory/return-stock`; `GET .../by-product/{productId}` | By-product returns available entries only by design. Full list is needed to verify Claimed/Returned. |
| Cancel staged flag | `POST /api/v1/inventory/return-stock/{id}/cancel` | Restores source stock if entry is Available. |
| Create purchasing return | `POST /api/v1/return-notes` | Header only. |
| Add purchasing return item | `POST /api/v1/return-notes/{id}/items` | `goodsReceiptLineId`, `qtySmallestUnit`, `unitCostSmallest`, optional `stockReturnEntryId`. |
| Submit/approve/complete purchasing return | `POST /api/v1/return-notes/{id}/submit`, `/approve`, `/complete` | Complete accepts CR-note number/date. |
| Stock levels | `GET /api/v1/inventory/stock/levels` | Organization comes from JWT; query organization ID is not required. |
| Availability | `GET /api/v1/inventory/stock/availability/{productId}` | Aggregate position. |
| Batches | `GET /api/v1/inventory/stock/batches/{productId}` | Used for exact batch effects. |
| Movements | `GET /api/v1/inventory/stock/movements?productId=...&pageSize=...` | Used before/after each physical movement. |

## 3. Frontend page and transition review

| Flow surface | Route | Code status before live test |
|---|---|---|
| PO entry | `/purchasing/place-order` | Exists; creates header, adds/updates lines, and submits through `purchasingService`. |
| PO approval | `/purchasing/approvals` | Exists; review, approve, and reject actions are wired. |
| GRN entry/list | `/purchasing/goods-receipt-entry`, `/purchasing/goods-receipts` | Exists; header/line workflow and submit are wired. |
| GRN verification | `/purchasing/grn-approve-reject` | Exists; verify/reject buttons call the correct POST endpoints. |
| Sales orders | `/sales/orders` | Exists; create, line mutations, confirm, cancel, and convert-to-invoice are wired. |
| Invoice create/detail | `/sales/invoices/new`, `/sales/invoices/{id}` | Direct-create/detail pages exist. There is no issue button because creation finalizes the invoice. |
| CRN list | `/sales/return-notes` | Exists; right-side create panel uses customer/invoice APIs and `useCreateCrn`. |
| CRN detail | `/sales/return-notes/{id}` | Lines and submit/verify/reject/cancel mutations exist. Known code issue to verify: reject/cancel modals still pass legacy `isOpen/onClose` props to the shared Modal, which expects `open/onOpenChange`. |
| Customer credit | `/sales/customer-credit` | Balance/transactions/apply-credit calls exist. Known code issue: customer list requests page size 150 while the backend customer paging limit may reject values above 100. |
| Purchase returns | `/purchasing/returns` | Full list/detail state machine exists; staged lookup calls by product; add-item includes `stockReturnEntryId`; SOURCE badges exist. |
| Stock overview | `/inventory/stock` | Loads levels, consolidates location rows, loads product names, opens batch flag modal, and refreshes stock. |
| Staged returns | `/inventory/return-stock` | Tabs/list/cancel/flag workflows are present and use return-stock APIs. |
| Stock audit | `/inventory/stock-audit` | Product search loads availability, batches, last 50 movements, and staged entries. |

## 4. Execution and evidence rules

1. Authenticate and retain token/user/org identifiers only in process memory; do not write credentials or token to report files.
2. Select one existing active product, supplier, customer, and stock location. Prefer a product with a valid UOM chain and an active supplier relationship.
3. Capture availability, all batches, and recent movements before mutation.
4. Use a unique timestamp suffix on `QA TEST` notes, PO/GRN batch number, supplier invoice, and credit note number to avoid collisions.
5. Execute each state transition exactly as implemented. Record HTTP status and full error body for every failure, then continue where dependencies permit.
6. After each physical/reservation transition, re-read availability, batches, movements, and staging list; calculate deltas from captured values rather than assumptions.
7. Verify frontend behavior by route/code and, where the staging UI is not directly hosted by this workspace, distinguish code verification from interactive-browser verification.
8. Reconcile final aggregate availability and movement evidence. Note that movement sums across multiple locations cannot be equated blindly to aggregate sellable stock when a transfer-like flow writes both an out and an in movement.
9. Write all results, IDs, exact quantities, failures, and recommendations to `QA_REPORT.md`.
