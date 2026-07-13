# GRN Table Header Fix Findings

## File inspected

- `src/pages/purchasing/grn/GoodsReceiptEntryPage.jsx`
- This is the equivalent of `src/pages/purchasing/GRN/NewGoodsReceiptPage.jsx` in the current frontend structure.

## Order items table structure

- The "Order items" section uses a real HTML `<table>`.
- The GRN entry branch renders `<thead>` before `<tbody>`.
- The body rows are rendered from `pagedReceiptLines.map(...)`.
- The existing data row/input JSX was left unchanged.

## Header condition

- `<thead>` already existed in the GRN entry table.
- It was not wrapped in `grnLines.length > 0`, `pagedReceiptLines.length > 0`, or another line-count condition.
- The table itself renders inside the selected purchase order detail form, and the GRN branch is controlled by `grnMode`.
- No separate header component was found for this table.

## Fix applied

- Added a dedicated `grn-order-items-table` class to the GRN entry table.
- Added `grn-order-items-table-head` to the existing `<thead>`.
- Kept the header in the exact visible column order:
  `ITEM | REMAINING | RECEIVE QTY | UNIT COST | MRP | REJECTED QTY | REJECT REASON | EXPIRY`
- Made the header cells sticky and explicitly styled in `src/index.css` so they remain visible in the scrollable order-items area.
