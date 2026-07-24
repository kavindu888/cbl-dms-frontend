# Inline Return Lines Frontend - Findings

## File layout note

The request named these files:

- `src/pages/sales/SalesOrders/SalesOrderDetailPage.jsx`
- `src/pages/sales/Invoices/InvoiceDetailPage.jsx`
- `src/hooks/useSalesOrder.js`

In this checkout, the active files are:

- `src/pages/sales/SalesOrderModulePage.jsx`
- `src/pages/sales/InvoiceDetailPage.jsx`
- `src/services/api/salesService.js`
- `src/hooks/useStock.js`

`src/hooks/useSalesOrder.js` does not exist in this frontend.

## Exact add-line API function signature

Active service:

```js
async addSalesOrderLine(id, payload) {
  const response = await api.post(`/api/sales/orders/${id}/lines`, payload)
  return response.data
}
```

Legacy `src/api/salesApi.js` only contains customer return note and customer credit helpers; it does not define `addOrderLine`.

## Current add-line form state variables

The active sales order page uses one `line` object:

```js
const emptyLine = {
  productId: '',
  quantity: '',
  discountPercent: '0',
  isReturnLine: false,
  returnReason: '',
}
```

The page stores it with:

```js
const [line, setLine] = useState(emptyLine)
```

It also keeps per-row draft edits in:

```js
const [lineDrafts, setLineDrafts] = useState({})
```

## How MRP is currently pre-filled when product selected

The active UI does not pre-fill MRP into the add-line form when selecting a product.

Current selection only updates:

```js
function handleProductSelect(productId) {
  setLine((current) => ({
    ...current,
    productId,
    quantity: '',
  }))
}
```

MRP/pricing is supplied by the backend flow:

- `AddSalesOrderLineCommandHandler` uses the latest inventory MRP or product selling price.
- Draft rows show "Pending confirm" or backend returned price.
- Confirmed rows use FEFO batch picks and display pick MRP/selling price.

## Stock availability hook/API confirmation

Legacy API helper exists:

```js
export const getStockAvailability = (productId) =>
  inventoryAxios.get(`/stock/availability/${productId}`)
```

Active hook exists:

```js
export function useStockAvailability(productId) {
  return useQuery({
    queryKey: ['inventory', 'stock', 'availability', productId],
    queryFn: async () => inventoryService.getStockAvailability(productId),
    enabled: Boolean(productId),
    staleTime: 30_000,
  })
}
```

## How the order lines table renders each row

Before inline returns:

- Confirmed non-draft lines with `isPicked` and `batchPicks` render as a product header row plus one row per batch pick.
- Draft or non-picked lines render as one product row.
- Draft rows show editable quantity and discount.
- Normal line rendering remains unchanged.

After this change:

- Return lines render through a separate amber/orange `RT` row.
- Return lines show the return reason badge.
- Return line totals display as negative amber amounts.
- Return lines still show draft edit/remove actions when the order is Draft.
- Normal sale lines keep the existing rendering paths.

## Invoice line rendering

Before inline returns:

- Every invoice line rendered the same.
- Total showed `money(line.lineTotal)`.

After this change:

- Return lines render with a subtle amber row background.
- Product name shows `(RT)` and an `RT` badge.
- Return line total displays as negative amber.
- Normal invoice rows keep the existing rendering.

## Totals rendering

Sales order totals now show `Returns Credit` when `returnCreditAmount > 0` or when draft data can compute return credit locally.

Invoice billing now shows `Returns Credit` when `invoice.returnCreditAmount > 0`.
