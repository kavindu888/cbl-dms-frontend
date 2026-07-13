# Sellable Quantity Fix Found

## Sales Order Add-Line Form

Actual file:
- `src/pages/sales/SalesOrderModulePage.jsx`

The sales order add-line form is at the bottom of the draft order detail view. It uses local React `useState`, not React Hook Form:
- `const [line, setLine] = useState(emptyLine)`
- `emptyLine = { productId: '', quantity: '', discountPercent: '0' }`

Before this fix:
- The product selector used `value={line.productId}`.
- Its `onChange` called `updateLine('productId', event.target.value)`.
- There was no `handleProductSelect`.
- The page did not call `useStockAvailability` or any inventory API.
- The QTY input used `value={line.quantity}` and `onChange={(event) => updateLine('quantity', event.target.value)}`.

Fix applied:
- Added `handleProductSelect(productId)` to set `line.productId` and reset `line.quantity`.
- Added `useStockAvailability(line.productId)`.
- Added sellable quantity display below the product selector.
- Added live QTY warning when entered quantity exceeds sellable quantity or selected product has zero sellable stock.
- Kept Add Line button behavior informational only; it is not disabled by stock availability.

## Availability Hook

Actual file:
- `src/hooks/useStock.js`

`useStockAvailability(productId)` already existed.

Implementation:
- Query key: `['inventory', 'stock', 'availability', productId]`
- Query function: `inventoryService.getStockAvailability(productId)`
- Enabled only when `Boolean(productId)`

Fix applied:
- Added `staleTime: 30_000`.

## Inventory API Wrappers

Actual file requested:
- `src/api/inventoryApi.js`

Function:
- `getStockAvailability(productId)`
- Endpoint: `GET /api/v1/inventory/stock/availability/{productId}` through the `/api/v1/inventory` axios prefix.

Actual service used by the hook:
- `src/services/api/inventoryService.js`

Function:
- `inventoryService.getStockAvailability(productId)`
- Endpoint: `GET /api/v1/inventory/stock/availability/{productId}`
- It unwraps `ApiResponse<Result<T>>` and returns the DTO value directly.

## Backend Response Shape

Actual backend files:
- `src/DistributedManagementSystem.Inventory/Presentation/Controllers/StockController.cs`
- `src/DistributedManagementSystem.Inventory/Application/DTOs/StockDtos.cs`
- `src/DistributedManagementSystem.Inventory/Application/Queries/Stock/StockQueries.cs`

Endpoint:
- `GET /api/v1/inventory/stock/availability/{productId}`

Wrapped response:
- `ApiResponse<Result<StockAvailabilityDto>>`

DTO fields:
- `productId`
- `productSku`
- `totalAvailable`
- `totalReserved`
- `sellable`
- `activeBatchCount`
- `earliestExpiry`

Sellable field name:
- `sellable`

Important finding:
- `StockAvailabilityDto` does not return `smallestUnitCode`.
- The UI displays `availabilityData.smallestUnitCode` if it ever appears, otherwise it falls back to selected product unit metadata (`uomBase`) and then blank.

## No Backend Changes

No API endpoints, backend DTOs, or order confirmation flow were changed. The display is informational only; backend stock validation remains the source of truth.
