# Opening Stock frontend findings

## API conventions

- `src/api/inventoryApi.js` uses the local `inventoryAxios` wrapper around the
  shared `api` Axios instance. It prefixes requests with `/api/v1/inventory`.
- Product search uses `masterService.listProducts()` and calls
  `GET /api/v1/master-data/products` with `search`, `page`, `pageSize`, and
  `status` query parameters.
- Raw product list rows contain `id`, `sku`, `name`, `barcode`, `baseUom`,
  `costPrice`, `sellingPrice`, `status`, and category/date fields. The frontend
  formatter exposes `id`, `sku`, `name`, `baseUom`, `uomBase`, and
  `smallestUnitId`. Because list rows do not contain the complete conversion
  chain, the selected product's exact `smallestUomCode` is loaded from
  `GET /api/v1/master-data/products/{id}/uom-chain`.
- Last prices use `GET /api/v1/inventory/stock/last-prices/{productId}`. The
  result fields are `lastCost` and `lastMrp`.
- No opening-stock API function existed before this change. It is now
  `recordOpeningStock(data)`, posting to `/stock/opening-stock` through
  `inventoryAxios`.

## Navigation conventions

- Routes are child entries of the protected root route in
  `src/routes/index.jsx`, use relative paths such as `inventory/stock`, and
  wrap permission-controlled pages with `requirePermission()`.
- Sidebar items use `{ label, to, icon, permissions }`. Opening Stock is under
  the `INVENTORY` group with `PackagePlus` and
  `PERMISSIONS.inventory.openingStock`.
