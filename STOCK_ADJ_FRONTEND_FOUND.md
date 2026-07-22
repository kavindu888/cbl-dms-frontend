# Stock Adjustment frontend findings

## API client

- `src/api/inventoryApi.js` imports the shared Axios client as `api` from
  `@/lib/api`.
- Its local `inventoryAxios` wrapper prefixes requests with
  `/api/v1/inventory`.
- Existing inventory pages that need normalized result values use the shared
  service layer, while the Opening Stock page calls `inventoryApi.js` directly.

## Route registration

- Inventory screens are imported in `src/routes/index.jsx`.
- They are registered as child routes of the protected `AppShell` route.
- `requirePermission(element, permission)` wraps each screen in
  `ProtectedRoute`.
- Child route paths omit the leading slash, for example
  `inventory/in-store-returns`.

## Sidebar navigation

- Inventory links live in the `INVENTORY` entry of `navGroups` in
  `src/components/layout/Sidebar.jsx`.
- A link uses `{ label, to, icon, permissions }`.
- Permission values come from `PERMISSIONS` in `src/utils/permissions.js`.

## Product search

- `InStoreReturnCreatePage` loads active product pages through
  `masterService.listProducts`, then filters locally by name, SKU, or barcode.
- `OpeningStockPage` uses a 250 ms debounced server query through
  `masterService.listProducts({ page, pageSize, search, status: 'Active' })`.
- Stock Adjustment follows the In-Store Return master pattern so product and
  batch selection behave consistently.

## Batch fetch

- `inventoryService.listStockBatches(productId)` calls
  `GET /api/v1/inventory/stock/batches/{productId}`.
- The backend returns `id`, `productId`, `productSku`, `stockLocationId`,
  `batchNo`, `expiryDate`, `grnLineId`, `qtyReceived`, `qtyAvailable`,
  `qtyReserved`, `sellableQty`, `unitCostSmallest`, `mrp`, `receivedDate`,
  `status`, `isExpiringSoon`, and `smallestUnitCode`.
- The endpoint returns FEFO-ordered batches for the organization's default
  stock location.
