# CBL DMS Inventory Flow QA Report

Date: 2026-07-08  
Environment: https://staging.ceyservice.store/

## Test identity and master data

- Authentication: PASS — `POST /login` returned a JWT for `admin`.
- User ID: `01KTF9RJ3SDZ3NER6XN90P20N3`
- Organization ID: `01KTBK69X8NB0J0X6QYSG9ACMP`
- Profile endpoint: FAIL — `/api/auth/me`, `/me`, and `/api/users/me` each returned 404. The login payload itself supplied the authenticated user and organization.
- Test product: `SKU-014 — CBL Cloud Biscuit 150g`
- Product ID: `01HPRD000000000000000000014`
- Supplier: `SUP-0001 — CBL Foods International` (`01KTTKF3YB6DGWY2DGM6FDZF5Q`)
- Customer: `CUST-0001 — City Stores Colombo` (`01KTKA8XSA1QJFR0V1G2V03PBT`)
- Main stock location: `Receive Retest 20260629175131` (`01KWA844F7Y78PAK1294HHMM2C`)
- Return location: `Supplier Return Staging` (`01KWYSG4DG3QVJ2Y2MCZRQW4E7`)

The product was selected because it had no configured UOM conversions and no pre-existing stock, batches, or movements. This kept all quantities auditable as exact smallest-unit values.

## Baseline

| Measure | Value |
|---|---:|
| Total Available | 0 |
| Total Reserved | 0 |
| Sellable | 0 |
| Active Batches | 0 |
| Last Movement | None |

Baseline recorded: PASS.

## QA transaction identifiers

| Record | Identifier |
|---|---|
| Purchase order | `PO-2026-0045` / `01KWZH3AEXS3FXAGNMHDFYFBJ8` |
| PO line | `01KWZH3BE4YJDM9D9CTXFTF7CG` |
| GRN | `GR-2026-0023` / `01KWZH3CCV264H3NFAHWS42VYA` |
| GRN line | `01KWZH3CX793B33JDTMWAZ6DFP` |
| Stock batch | `QA-BATCH-001` / `01KWZH3DHEJVFDSC4082MD5GE7` |
| Sales order | `SO-2026-0001` / `01KWZH52WQJBXGQMK70VF3MTBK` |
| Invoice | `26JUL_BR03_2` / `01KWZH7ADAQK2V3JVSXE3WTBPS` |
| Damage CRN | `SR-2026-0003` / `01KWZH8ASMYTXXDBZX4PCRY8MG` |
| Others CRN | `SR-2026-0005` / `01KWZH8CR3D3K038FANSEYYGXQ` |
| Returned staging entry | `01KWZH9JRNY9FE362QPVXBFZD3` |
| Purchase return | `RN-2026-0008` / `01KWZH9M6RGQERMQF3TFK1CTJF` |
| Cancelled staging entry | `01KWZHADQCG1V9PZR0HR0KPQZQ` |

All created notes used a `QA TEST` prefix. The GRN supplier invoice was `QA-INV-20260708-001`; the supplier credit note was `CN-QA-20260708-001`.

## Results Summary

| Test | Expected | Actual | Status |
|---|---:|---:|---|
| GRN Verified → StockBatch created | Yes | `QA-BATCH-001`, received/available 100 | ✅ |
| GRN Verified → StockMovement GrnReceipt | +100 | +100, reference `GRN` | ✅ |
| Sales Order Confirmed → Reserved | +30 | 0 | ❌ |
| Sales Order Confirmed → Available unchanged | 100 | 100 | ✅ |
| Sales Order Confirmed → no physical movement | No new movement | No new movement | ✅ |
| Invoice conversion → Available deducted | −30 | 0 delta; remained 100 | ❌ |
| Invoice conversion → Reserved cleared | 30 → 0 | Reservation was never created; remained 0 | ❌ |
| Invoice conversion → SalesIssue movement | −30 | No SalesIssue movement | ❌ |
| CRN Damage Verified → Quarantine batch | Yes, qty 5 | Verification HTTP 500; no batch | ❌ |
| CRN Damage → Main stock unchanged | 100 | 100 | ⚠️ blocked before inventory event |
| CRN Others Verified → Stock returned | +3 | Verification HTTP 500; 0 delta | ❌ |
| Credit Balance Created | >0 (expected 800) | 0 | ❌ |
| Flag Stock → Main deducted | −10 | 100 → 90 | ✅ |
| Flag Stock → Return location added | +10 | `AdjustmentIn +10` | ✅ |
| Purchase Return staged → Entry Claimed | Yes | Status 2 / Claimed | ✅ |
| Purchase Return complete → Entry Returned | Yes | Status 3 / Returned | ✅ |
| Purchase Return complete → movement | −10 | `PurchaseReturn −10` | ✅ |
| Cancel Flag → Main restored | +5 | 85 → 90 | ✅ |
| Cancel Flag → return staging removed | −5 | `AdjustmentOut −5` | ✅ |
| Cancel Flag → status | Cancelled | Status 4 / Cancelled | ✅ |
| Final business reconciliation | Expected 63 | Actual 90 | ❌ |
| Recorded movement reconciliation | Movement sum = levels | 90 = main 90 + return 0 | ✅ |

## Failed Tests

1. Sales-order reservation: expected Reserved +30 and Sellable 70; actual Reserved 0 and Sellable 100 after a successful HTTP 204 confirmation.
2. Invoice deduction: expected Available −30, reservation consumption, and `SalesIssue −30`; actual Available stayed 100, Reserved stayed 0, and no movement was written.
3. Damage CRN verification: expected a quarantined batch of 5 and customer credit 500; actual HTTP 500 with correlation ID `5087af7ba4b84c2197c8417a1fff99d6`, no inventory effect, and no credit.
4. Others CRN verification: expected sellable stock +3 and customer credit 300; actual HTTP 500 with correlation ID `037bd18dbb2743878d5dbff9793bbdca`, no inventory effect, and no credit.
5. Final business reconciliation: expected Available 63; actual Available 90 because the missing invoice deduction (+30 variance) and missing sellable return (−3 variance) net to +27.
6. Frontend Customer Credit, Return Stock product loader, and Stock Audit product search exceed the backend's maximum page size of 100.
7. CRN Detail and Customer Credit modal actions use unsupported shared-Modal props.

## Detailed flow results

### 1. PO and GRN stock-in

- PO header creation: PASS (HTTP 200, Draft).
- PO line: PASS — ordered/base/smallest quantity all 100; cost 50.
- Submit: PASS — Submitted.
- Approve: PASS — Approved.
- GRN header: PASS — Draft.
- GRN line: PASS — quantity 100, batch `QA-BATCH-001`, cost 50, selling price 80, MRP 100.
- Submit: PASS — Received.
- Verify: PASS — Verified.
- Inventory effect: PASS.
  - Available: 0 → 100.
  - Reserved: 0 → 0.
  - Batch available: 100.
  - Movement type 1 / GrnReceipt: +100, reference type `GRN`, reference ID `01KWZH3CCV264H3NFAHWS42VYA`.

### 2. Sales-order reservation

- Create: PASS (HTTP 201).
- Add line: PASS (HTTP 201), quantity 30.
- Confirm: PASS (HTTP 204); order detail reports `Confirmed`.
- Reservation effect: FAIL.
  - Available remained 100, as expected.
  - Reserved remained 0; expected 30.
  - Batch `qtyReserved` remained 0; expected 30.
  - Sellable remained 100; expected 70.
  - No movement was written, which is correct for a reservation.

Code evidence: Sales emits `SharedKernel.Events.Sales.SalesOrderConfirmedEvent`, while the inventory reservation handler listens to a separate `Inventory.Domain.Events.SalesOrderConfirmedDomainEvent`. The published event therefore has no matching inventory handler.

### 3. Invoice deduction

- Initial conversion with `vehicleId: null`: FAIL HTTP 400.

```json
{"type":"https://tools.ietf.org/html/rfc9110#section-15.5.1","title":"One or more validation errors occurred.","status":400,"errors":{"VehicleId":["The VehicleId field is required."]},"traceId":"54bf75de6516424db39f6744365adf98"}
```

- Frontend fleet endpoint `/api/v1/fleet/vehicles`: 404.
- Backend controller route `/api/fleet/vehicles`: also 404 on staging.
- Conversion with the existing staging placeholder `STAGING-TEST-VEHICLE`: PASS (HTTP 201).
- Created invoice `26JUL_BR03_2` with one line, quantity 30, net amount 2,902.80.
- Separate `POST /api/v1/sales/invoices/{id}/issue`: 404; no issue endpoint exists.
- Inventory effect: FAIL.
  - Available remained 100; expected 70.
  - Reserved remained 0; expected reservation consumption from 30 to 0.
  - Batch remained available 100 / reserved 0.
  - No SalesIssue movement exists.

Code evidence: direct invoice creation publishes `InvoiceIssuedDomainEvent`; `ConvertSalesOrderToInvoiceCommandHandler` creates/finalizes the invoice but only publishes `SalesOrderConvertedToInvoiceEvent`. No inventory handler consumes that conversion event, so order-to-invoice stock deduction never runs.

### 4. Customer returns and credit

Damage CRN:

- Create: PASS (HTTP 201).
- Add line: PASS (HTTP 201), quantity 5, credit amount 500.
- Submit: PASS (HTTP 204).
- Verify: FAIL HTTP 500.

```json
{"title":"Unexpected error.","status":500,"correlationId":"5087af7ba4b84c2197c8417a1fff99d6","code":"INTERNAL_ERROR"}
```

Others CRN:

- Create: PASS (HTTP 201).
- Add line: PASS (HTTP 201), quantity 3, credit amount 300.
- Submit: PASS (HTTP 204).
- Verify: FAIL HTTP 500.

```json
{"title":"Unexpected error.","status":500,"correlationId":"037bd18dbb2743878d5dbff9793bbdca","code":"INTERNAL_ERROR"}
```

Effects:

- Both records remain Submitted.
- No quarantine batch was created.
- No SalesReturn movement was created.
- No +3 sellable return occurred.
- Customer-credit balance is exactly 0; expected 800.
- Customer-credit transaction list is empty.

Probable code defect requiring server-log confirmation: the verify handler calls `AddAsync(ledger)` for a new credit ledger and then calls `Update(ledger)` before `SaveChangesAsync`. This can change an Added entity to Modified and cause an update/concurrency failure. Use the two correlation IDs above to confirm the inner exception.

### 5. Flag stock for supplier return

- Flag request: PASS, entry `01KWZH9JRNY9FE362QPVXBFZD3`.
- Main batch: 100 → 90.
- Aggregate Available/Sellable: 100 → 90.
- Main movement: type 6 / AdjustmentOut, −10, reference `RETURNFLAG`.
- Return-location movement: type 5 / AdjustmentIn, +10, reference `RETURNFLAG`.
- Entry: status 1 / Available, quantity 10, reason 3 / Damaged.
- `GET ...?status=Available`: entry present.

### 6. Purchasing return from staged stock

- Return-note creation: PASS — `RN-2026-0008`.
- Add item with `stockReturnEntryId`: PASS.
- Saved line exposes the same staging ID, quantity 10, and `Damaged` reason.
- Entry changed to status 2 / Claimed and stored return-note line ID `01KWZH9MQKMVK7SGMT77JCQHDJ`.
- Submit: PASS.
- Approve: PASS.
- Complete: PASS.
- Entry changed to status 3 / Returned.
- Return location movement: type 4 / PurchaseReturn, −10, reference `RETURNNOTE`.
- Main stock remained 90, correctly avoiding a duplicate deduction.
- Return-location stock level ended at 0.

Note: `GET /return-stock/by-product/{productId}` intentionally returns Available entries only, so the entry disappears after it is Claimed. The unfiltered list endpoint correctly showed Claimed and Returned states.

### 7. Cancel flag rollback

- Flag 5 ShortExpiry: PASS — main 90 → 85.
- Cancel: PASS — main 85 → 90.
- Main movement: type 5 / AdjustmentIn, +5, reference `RETURNFLAGCANCEL`.
- Return movement: type 6 / AdjustmentOut, −5, reference `RETURNFLAGCANCEL`.
- Entry `01KWZHADQCG1V9PZR0HR0KPQZQ`: status 4 / Cancelled.

## Frontend Checklist

This environment exposes the backend API, not a browser-hosted build from this workspace. The production frontend build passed, and API-backed/code wiring was inspected. Items marked ⚠️ are code/API verified but not interactively clicked in a browser.

### CRN List page (`/sales/return-notes`)

- ✅ Page route and API loading exist; `my-returns` returned the QA CRNs.
- ✅ `SR-2026-0003` and `SR-2026-0005` appear in the list API.
- ⚠️ Verified/rejected badge styles exist, but the QA CRNs could not reach Verified because the API returned 500.
- ✅ Damage/Others reason badges are mapped.
- ✅ New Return Note renders a right-side sibling panel in code.
- ✅ Panel contains searchable customer, reason, date, and invoice fields.
- ⚠️ Save Draft is wired to the working create API and Sonner success toast; not browser-clicked in this run.

### CRN Detail page (`/sales/return-notes/{id}`)

- ✅ Detail API returns correct header and linked invoice.
- ✅ Lines return quantities 5 and 3 with credits 500 and 300.
- ✅ Credit totals are exposed correctly by the API/UI code.
- ✅ Submit button is conditionally present for Draft CRNs.
- ✅ Verify/Reject buttons are conditionally present for Submitted CRNs.
- ❌ Add-line, reject, and cancel modals pass obsolete `isOpen/onClose` props; shared `Modal` requires `open/onOpenChange`, so these dialogs will not open correctly.
- ❌ Verify action reaches the API but the API fails with HTTP 500.

### Customer Credit page (`/sales/customer-credit`)

- ❌ Customer selector requests `pageSize=150`; backend maximum is 100.
- API response: HTTP 400, correlation ID `9a8b80169ae244c8bd2a7ed814e78fd0`.
- ❌ Balance therefore cannot be reliably selected/displayed through the page.
- ❌ Backend balance is 0 and transactions are empty because CRN verification failed.
- ❌ Apply-credit modal also uses obsolete `isOpen/onClose` props.

### Purchase Return page (`/purchasing/returns`)

- ✅ List API shows `RN-2026-0008` as Completed.
- ✅ Create/header/item/state-transition APIs all passed.
- ✅ GRN item selection is wired to verified GRNs.
- ✅ staged dropdown calls `GET /api/v1/inventory/return-stock/by-product/{productId}`.
- ✅ staged selection auto-fills batch, expiry, quantity, and reason in code.
- ✅ request includes nullable `stockReturnEntryId`.
- ✅ saved line returns that ID and table renders STAGED/MANUAL source badges.

### Inventory Stock Levels (`/inventory/stock`)

- ✅ Route exists and production build passes.
- ✅ API returned consolidated main 90 / return location 0.
- ✅ Flag for Return action exists for each product row.
- ✅ Modal uses the correct `open/onOpenChange` contract and loads product batches.
- ✅ Flag API succeeded and stock refreshed correctly.
- ✅ Sonner success feedback is configured in `useFlagStockForReturn`.

### Return Stock (`/inventory/return-stock`)

- ✅ Page, filter tabs, list, status/reason badges, and cancel action exist.
- ✅ API shows Returned and Cancelled QA entries.
- ✅ Cancel workflow passed against staging.
- ❌ Page-level product loader requests `pageSize=150`, exceeding the backend maximum of 100; its own “Flag Stock” product selector can be empty even though the staging list still loads.

### Stock Audit (`/inventory/stock-audit`)

- ❌ Product search requests `pageSize=250`, exceeding backend maximum 100, so the initial product load fails.
- ⚠️ Once supplied a product, the page code correctly requests availability, batches, last 50 movements, and Available staged entries.
- ✅ Backend data contains `QA-BATCH-001` and all eight QA inventory movements.
- ⚠️ The audit uses the by-product staging endpoint, so Returned/Cancelled entries are not shown; it should use/filter the full return-stock list for a complete audit.

## Final reconciliation

Expected business outcome if every requested flow worked:

| Operation | Available |
|---|---:|
| Baseline | 0 |
| GRN +100 | 100 |
| Sales-order reservation | 100 |
| Invoice −30 | 70 |
| Damage return +0 sellable | 70 |
| Others return +3 | 73 |
| Flag/complete supplier return −10 | 63 |
| Flag/cancel +5/−5 | 63 |

Actual final state:

| Measure | Actual |
|---|---:|
| Main location Available | 90 |
| Return location Available | 0 |
| Total Available | 90 |
| Total Reserved | 0 |
| Sellable | 90 |
| Expected Total Available | 63 |
| Business-flow variance | +27 |

Variance explanation: invoice deduction did not remove 30, while the sellable CRN did not add 3; `+30 − 3 = +27`.

Movement reconciliation:

| Movement type | Count | Sum |
|---|---:|---:|
| GrnReceipt (1) | 1 | +100 |
| PurchaseReturn (4) | 1 | −10 |
| AdjustmentIn (5) | 3 | +20 |
| AdjustmentOut (6) | 3 | −20 |
| SalesIssue (2) | 0 | 0 |
| SalesReturn (3) | 0 | 0 |
| **Total** | **8** | **90** |

Recorded movement sum 90 equals current stock levels (main 90 + return 0): PASS. The ledger is internally consistent for movements that actually executed, but the complete intended business flow is not.

## Issues Found

1. **Critical — sales-order confirmation does not reserve inventory.** Published and handled event types do not match.
2. **Critical — order-to-invoice conversion does not deduct inventory.** Conversion does not publish `InvoiceIssuedDomainEvent`, and no handler consumes `SalesOrderConvertedToInvoiceEvent`.
3. **Critical — both CRN verification paths return HTTP 500.** No inventory return or customer credit is committed. Correlation IDs are retained above.
4. **High — vehicle is API-required despite nullable domain/migration intent.** Fleet endpoints are unavailable on staging, forcing an undocumented placeholder to convert an order.
5. **High — several frontend pages exceed backend paging limits.** Customer Credit uses 150; Return Stock uses 150; Stock Audit uses 250; backend maximum is 100.
6. **High — CRN Detail and Customer Credit dialogs use the wrong shared Modal props.** These UI actions cannot open reliably.
7. **Medium — Stock Audit only calls the Available-only by-product staging endpoint.** It omits Claimed, Returned, and Cancelled history.
8. **Medium — no authenticated profile endpoint exists.** The frontend relies on login payload/local storage; the prompt's `/api/auth/me` contract is absent.
9. **Medium — purchasing/GRN UOM snapshots report BOX/PCS for a product whose master base UOM is PKT and has no conversion rows.** Quantity happened to remain 100 because fallback factors were 1, but the displayed units are inconsistent.

## Recommendations

1. Replace the duplicate inventory-domain sales-order event contracts with handlers for the shared-kernel `SalesOrderConfirmedEvent`/cancel event, including organization ID, SKU, and smallest-unit quantity required by inventory.
2. Make order conversion atomically consume reservations, deduct FEFO batches, update StockLevel, and write `SalesIssue −qty`; preferably publish the same `InvoiceIssuedDomainEvent` used by direct invoice creation.
3. Inspect CRN verification server logs using both correlation IDs. Fix new-ledger tracking so a newly Added ledger is not immediately marked Modified, then ensure credit and inventory effects commit consistently.
4. Align `ConvertSalesOrderToInvoiceRequest.VehicleId` nullability with the migration/domain, or restore and document the fleet vehicle endpoint used by the frontend.
5. Change all frontend list requests to `pageSize <= 100` and paginate remaining pages.
6. Replace `isOpen/onClose` with `open/onOpenChange` in CRN Detail and Customer Credit modals.
7. Make Stock Audit query the full return-stock list and filter by product so it can show all statuses.
8. Replace fallback BOX/PCS UOM snapshots with the product's actual base UOM when no conversion chain exists.
