# GRN Navigation Fix Findings

## Files inspected

- `src/pages/purchasing/grn/GoodsReceiptEntryPage.jsx`
- `src/pages/purchasing/grn/GrnApproveRejectPage.jsx`
- `src/routes/index.jsx`
- `src/components/ui/PageHeader.jsx`
- `src/pages/sales/InvoiceDetailPage.jsx`

## Current GRN routes

- Existing legacy redirect: `purchasing/grn-entry` -> `/purchasing/goods-receipt-entry`
- Existing GRN entry list route: `purchasing/goods-receipt-entry`
- New list alias added: `purchasing/grn/new`
- New detail route added: `purchasing/grn/entry/:poId`
- GRN approve/reject route: `purchasing/grn-approve-reject`
- Goods receipt list route: `purchasing/goods-receipts`

## Separate GRN entry detail page

- Before this change, GRN list and entry detail lived together in `GoodsReceiptEntryPage.jsx`.
- A separate detail route now exists through `src/pages/purchasing/grn/GRNEntryPage.jsx`.
- `GRNEntryPage.jsx` receives `poId` from `useParams()` and renders the existing GRN form logic in detail-only mode.
- This keeps the existing API calls, form validation, line editing, and submission sequence in one implementation.

## Selected PO state

- Selected PO state variable: `selectedId`
- Selected PO setter: `setSelectedId`
- Selected PO detail state variable: `selectedOrder`
- Selected PO detail setter: `setSelectedOrder`
- Header state object: `receiptHeader`
- Header fields: `receiptHeader.supplierInvoiceNo`, `receiptHeader.notes`, `receiptHeader.receiptDate`

## PO click behavior

- Before: PO card click called `setSelectedId(order.id)`.
- After: PO card click navigates to `/purchasing/grn/entry/${order.id}`.
- The list route no longer renders the right-side detail panel.

## Submit success behavior

- Submit is handled in `submitGrn()` inside `GoodsReceiptEntryPage.jsx`.
- On success it calls `resetReceiptWorkspace()`.
- `resetReceiptWorkspace()` calls `setSelectedId(null)` and `setSelectedOrder(null)`.
- In detail-only mode, submit success also navigates to `/purchasing/grn/new`.
- In detail-only mode, submit success invalidates `['purchase-orders', 'receivable']`, `['purchase-orders']`, and `['grns']`.
- The page also keeps its existing local refresh via `loadPurchaseOrders()`.

## Approve table VAT column

- Removed the line-table VAT header and row cell from `GrnApproveRejectPage.jsx`.
- Kept the summary VAT row unchanged.
- Approve line table order is now:
  `ITEM | RECEIVED QTY | SMALLEST QTY | UNIT COST | MRP | REJECTED QTY | REJECT REASON | BATCH | EXPIRY | LINE TOTAL`
