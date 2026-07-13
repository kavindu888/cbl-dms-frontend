# Purchasing Fixes Found

## Backend GRN Types

- Actual GRN controller: `src/DistributedManagementSystem.Purchasing/Presentation/Controllers/GoodRecieveNoteController.cs`
- Actual route: `api/v1/goods-receipts`
- Create endpoint: `Create([FromBody] CreateGrnRequest req, CancellationToken ct)`
- Submit endpoint: `Submit(string id, CancellationToken ct)`

`CreateGrnRequest` fields:
- `PurchaseOrderId`: `string`
- `ReceiptDate`: `DateTimeOffset`
- `Discount`: `decimal`
- `SupplierInvoiceNo`: `string?`
- `Notes`: `string?`

`AddGrnLineRequest` fields:
- `QtyBaseUnit`: `decimal`
- `UnitCostSmallest`: `decimal`
- `Mrp`: `decimal`
- `RejectedQtyBase`: `decimal`

`CreateGrnCommand` fields:
- `Discount`: `decimal`

`AddGrnLineCommand` fields:
- `QtyBaseUnit`: `decimal`
- `UnitCostSmallest`: `decimal`
- `Mrp`: `decimal`
- `RejectedQtyBase`: `decimal`

`UpdateGrnLineCommand` fields:
- `QtyBaseUnit`: `decimal`
- `UnitCostSmallest`: `decimal`
- `Mrp`: `decimal`
- `RejectedQtyBase`: `decimal`

`CreateGrnCommandValidator` validates `Discount >= 0`. Active GRN validators do not use `ScalePrecision()`. The line validators for GRN are currently commented out.

## GRN Query Fields

GRN detail is loaded through `GetGoodsReceiptByIdQuery`, which returns `GoodsReceiptDto`.

`GoodsReceiptDto` returns header values including:
- `BillTotal`
- `Discount`
- `ValueOfSupply`
- `VatRate`
- `VatAmount`
- `NetAmount`

`GoodsReceiptLineDto` returned:
- `QtySmallestUnit`
- `UnitCostSmallest`
- `Mrp`
- `LineSubtotal`
- `BatchNo`
- `ExpiryDate`

Fix applied: `GoodsReceiptLineDto` now also returns line-level `VatAmount` as a DTO projection. The domain still calculates VAT at GRN header level.

## Purchase Order Status Values

Backend `PurchaseOrderStatus` values:
- `Draft = 1`
- `Submitted = 2`
- `Approved = 3`
- `Rejected = 4`
- `PartiallyReceived = 5`
- `FullyReceived = 6`
- `Cancelled = 7`

Frontend status constants match these names and values.

## PO Approval Queue

Actual page: `src/pages/purchasing/purchase-orders/PurchaseOrderApprovalPage.jsx`

Findings:
- Pending PO list already calls `purchasingService.listPurchaseOrders` with `status: PurchaseOrderStatus.Submitted`.
- There are no React Query purchase-order hooks in this frontend.
- There is no `queryKey`; the page uses local state plus direct service calls.
- After approve/reject, the page already refetched the list, but an effect auto-selected another PO after the selected one disappeared.

Fix applied:
- Remove approved/rejected PO from local `rawOrders` immediately.
- Clear `selectedPoId` and `selectedPoDetail` after action.
- Keep backend refetch via `loadPurchaseOrders()`.
- Stop auto-selecting the next PO when the selected PO leaves the list.

## GRN Entry

Actual page: `src/pages/purchasing/grn/GoodsReceiptEntryPage.jsx`

Findings:
- Unit cost uses reusable `EditableCell`, previously `type="number"` and `min="0"` without `step`.
- MRP input was `type="number"` and `min="0"` without `step`.
- Discount input was `type="number"` and `min="0"` without `step`.
- GRN calculations use `toNumber()`, not `parseInt()`.
- After submit, the page cleared selected order/draft state but did not explicitly clear `receiptLines` or reset `receiptHeader`.
- The GRN entry table showed item, remaining, receive qty, unit cost, MRP, rejected qty, reject reason, expiry.
- Amount summary already showed VAT.

Fix applied:
- `toNumber()` now uses `parseFloat()`.
- Financial/decimal number inputs now use `step="0.01"` and `min="0"`.
- Successful GRN submit now resets selected PO, selected order, header, lines table, draft receipt, pending receipt, and item page.

## GRN Approval Queue

Actual page: `src/pages/purchasing/grn/GrnApproveRejectPage.jsx`

Findings:
- Pending GRNs are loaded with `status: GrnStatus.Received`.
- Detail lines displayed item, received qty, unit cost, rejected qty, reject reason, expiry, and line total.
- Detail data already included `QtySmallestUnit` and `Mrp`; line-level `VatAmount` was missing before this fix.

Fix applied:
- Added Smallest Qty, MRP, VAT, and Batch columns without removing existing columns.
