# GRN UI Fix Findings

## Files inspected

- `src/pages/purchasing/grn/GoodsReceiptEntryPage.jsx`
- `src/pages/purchasing/grn/GrnApproveRejectPage.jsx`
- `src/services/api/purchasingService.js`

There is no `src/hooks/useGrn.js` in this frontend. GRN submit is handled inside `GoodsReceiptEntryPage.jsx`, and the API wrapper lives in `purchasingService.js`.

## Goods Receipt Entry header fields before fix

- Supplier Invoice No used `className="form-input"` and was in a two-column grid beside Receipt Date.
- Receipt Date used `className="form-input"` and a date input with `style={{ colorScheme: 'dark' }}`.
- Notes used `className="form-input"` and was already an `<input>`, not a `<textarea>`.
- Notes was forced onto its own full-width row with `gridColumn: '1 / -1'`, which made the header section taller.
- The overall right-side detail layout is a flex column form.
- The order items table is below the header form section, so header height directly reduces table room.

## Submit success behavior

- Submit is handled by `submitGrn()` in `GoodsReceiptEntryPage.jsx`.
- On success it calls `purchasingService.submitGoodsReceipt(receipt.id)`.
- After success it calls `resetReceiptWorkspace()` and then `loadPurchaseOrders()`.
- `resetReceiptWorkspace()` clears the selected PO with `setSelectedId(null)`, clears `setSelectedOrder(null)`, resets supplier invoice number, notes, receipt date, receipt lines, draft receipt, pending receipt, and item page.
- Because the list is loaded through local state rather than React Query, `loadPurchaseOrders()` is the refresh equivalent for the receivable PO list.

## Approve page summary display pattern

The approve/reject page summary displays totals in this order:

```jsx
<div className="flex justify-between text-xs">
  <span className="text-text-muted">Sub total</span>
  <span className="mono">{formatMoney(selectedGrnDetail.billTotal)}</span>
</div>
<div className="flex justify-between text-xs">
  <span className="text-text-muted">Discount</span>
  <span className="mono">{formatMoney(selectedGrnDetail.discount)}</span>
</div>
<div className="flex justify-between text-xs">
  <span className="text-text-muted">VAT</span>
  <span className="mono">{formatMoney(selectedGrnDetail.vatAmount)}</span>
</div>
<div style={{ borderTop: '1px solid var(--color-border)' }}>
  <span>Net amount</span>
  <span className="mono">{formatMoney(selectedGrnDetail.netAmount)}</span>
</div>
```

## Fix applied

- Compact header: Supplier Invoice No, Receipt Date, and Notes now render in one horizontal row.
- Notes remains a single-line `<input type="text">`.
- The entry page keeps resetting the selected PO after successful submit through `resetReceiptWorkspace()`.
- The entry amount summary now labels the VAT row as `VAT (18%)` and keeps it between Discount and Net amount.
- No API calls, backend code, line item handlers, or submission flow were changed.
