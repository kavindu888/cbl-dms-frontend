# New Return Note Form Fix Findings

## Findings

- Product selector is rendered in `src/pages/purchasing/ReturnNotes/components/ReturnItemForm.jsx`.
- Before this fix, `NewReturnNotePage.jsx` loaded all products with `masterService.listProducts(...)` and passed them to `ReturnItemForm`.
- Before this fix, staged entries were loaded per selected product with `inventoryService.getAvailableReturnStockByProduct(productId)`.
- `src/api/inventoryApi.js` exposes:
  - `listReturnStock(params)` -> `GET /api/v1/inventory/return-stock`
  - `getAvailableReturnStockByProduct(productId)` -> `GET /api/v1/inventory/return-stock/available/{productId}`
- `src/api/purchasingApi.js` does not exist in this frontend.
- The manual form visibility state variable is `showManualForm`.
- The selected staged entry is derived as `selectedEntry` from `form.stockReturnEntryId`.
- The duplicate form was caused by this condition rendering the generic manual field block even when a staged entry was selected:
  - `(selectedEntry || showManualForm || editingItem)`
- `/api/v1/inventory/return-stock` is used through `inventoryService.listReturnStock({ status: 'Available' })`; the mapped entries include product fields such as `productId`, `productSku`, and `productName` when returned by the API.

## Fixes Applied

- Product selector now loads one available return-stock list on mount through `inventoryService.listReturnStock({ status: 'Available' })`.
- Product options are extracted from unique available return-stock entries instead of all master products.
- Selecting a product filters the already-loaded available entries; no per-product staged-stock API call is made.
- Removed the internal Entry ID from the staged stock table.
- After selecting a staged entry, only the clean staged-entry panel renders:
  - readonly source, batch, available qty, unit cost, and reason,
  - qty to return with min/max enforcement,
  - readonly live supplier refund preview,
  - Clear and Add to Return buttons.
- Manual entry remains available as an escape hatch, collapsed by default.
- Manual entry is completely unmounted whenever a staged entry is selected.
- The staged add path still sends the same return-note item payload shape via `getItemPayload(...)`.

## Files Changed

- `src/pages/purchasing/ReturnNotes/NewReturnNotePage.jsx`
- `src/pages/purchasing/ReturnNotes/components/ReturnItemForm.jsx`
- `RETURN_FORM_FIX_FOUND.md`
