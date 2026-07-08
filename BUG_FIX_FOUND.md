# CBL DMS Confirmed Bug Findings

Date: 2026-07-08

## Mandatory source review

- Sales order confirmation calls `SalesOrder.Confirm()`, saves, then publishes the order's domain events. The entity creates `SharedKernel.Events.Sales.SalesOrderConfirmedEvent`; Inventory instead subscribes to `Inventory.Domain.Events.SalesOrderConfirmedDomainEvent`. Cancellation has the same mismatch.
- The SharedKernel order events currently carry product ID, unit ID, and entered quantity only. They do not carry organization ID, SKU, or smallest-unit quantity required by Inventory.
- Order-to-invoice conversion finalizes and saves an invoice, calls `SalesOrder.MarkConverted`, and publishes only the resulting `SalesOrderConvertedToInvoiceEvent`. It does not publish `InvoiceIssuedDomainEvent`.
- Inventory's invoice handler subscribes to `SharedKernel.Events.Sales.InvoiceIssuedDomainEvent` and reads invoice ID/number, organization ID, and line product ID/SKU/smallest-unit quantity.
- CRN verification creates a missing `CustomerCreditLedger` with `AddAsync`, then unconditionally calls `Update` after adding credit. This changes a new tracked entity from Added to Modified.
- Inventory's CRN handler subscribes to `SharedKernel.Events.Sales.CrnVerifiedDomainEvent`. Quarantine batch creation already supplies required `grnLineId: "CUSTOMER_RETURN"` and uses `DateTimeOffset.UtcNow`.
- Sales Domain events found: `InvoiceFinalizedDomainEvent`, `InvoicePaymentReceivedDomainEvent`, `InvoiceCancelledDomainEvent`, `CustomerReturnNoteSubmittedEvent`, `SalesReturnCreatedDomainEvent`, `CustomerReturnNoteCreatedEvent`, `SalesReturnApprovedDomainEvent`, `SalesOrderSubmittedDomainEvent`, `InvoiceFullyPaidDomainEvent`, `SalesOrderLineUpdatedEvent`, `SalesOrderLineRemovedEvent`, `SalesOrderLineAddedEvent`, `SalesOrderCreatedEvent`, and `CustomerCreditConsumedEvent`.
- SharedKernel events found include `SalesOrderConfirmedEvent`, `SalesOrderCancelledEvent`, `SalesOrderConvertedToInvoiceEvent`, `InvoiceIssuedDomainEvent`, `CrnVerifiedDomainEvent`, `GrnVerifiedDomainEvent`, and `ReturnNoteCompletedDomainEvent`.
- Inventory incoming Sales events define `SalesOrderConfirmedDomainEvent`, `SalesOrderCancelledDomainEvent`, `SalesReturnCompletedDomainEvent`, and their line records.
- A Fleet vehicles controller exists locally at `api/fleet/vehicles`. The conversion command and Invoice domain property are already `string?`; the nullable migration already exists. The presentation request alone is non-nullable.
- Shared `Modal` accepts `open` and `onOpenChange`. CRN Detail passes obsolete `isOpen/onClose` to add-line, reject, and cancel modals. Customer Credit does the same for apply-credit.
- Customer Credit requests 150 customers, Return Stock requests 150 products, and Stock Audit requests 250 products, exceeding the backend maximum of 100.
- Stock Audit calls the Available-only `/return-stock/by-product/{id}` API. The full list endpoint currently accepts only status, so it needs an optional product ID filter.
- The Sales Orders screenshot exposes an additional direct runtime defect: `salesService.js` calls `formatSalesOrder`, but no such function is defined.

## Expected corrections

- Publish and subscribe to one SharedKernel confirmation/cancellation contract containing organization ID, product SKU, and smallest-unit quantities.
- Publish `InvoiceIssuedDomainEvent` from order conversion with the same payload shape used by direct invoices.
- Update only an existing customer-credit ledger; leave a newly added ledger tracked as Added.
- Make the API conversion request vehicle ID nullable without adding another migration.
- Keep frontend lookup page sizes at 50, use the actual Modal contract, and query all return-stock statuses by product for Stock Audit.
- Restore a defined Sales Order response formatter so the Orders page can load.

## Modified files

Backend:

- `src/DistributedManagementSystem.SharedKernel/Events/Sales/SalesOrderStockItem.cs`
- `src/DistributedManagementSystem.SharedKernel/Events/Sales/SalesOrderConfirmedEvent.cs`
- `src/DistributedManagementSystem.SharedKernel/Events/Sales/SalesOrderCancelledEvent.cs`
- `src/DistributedManagementSystem.Sales/Application/InventoryEventLineBuilder.cs`
- `src/DistributedManagementSystem.Sales/Domain/Entities/SalesOrder.cs`
- `src/DistributedManagementSystem.Sales/Application/Commands/SalesOrders/ConfirmSalesOrder/ConfirmSalesOrderCommandHandler.cs`
- `src/DistributedManagementSystem.Sales/Application/Commands/SalesOrders/CancelSalesOrder/CancelSalesOrderCommandHandler.cs`
- `src/DistributedManagementSystem.Sales/Application/Commands/SalesOrders/ConvertSalesOrderToInvoice/ConvertSalesOrderToInvoiceCommandHandler.cs`
- `src/DistributedManagementSystem.Sales/Application/Commands/CustomerReturnNotes/VerifyCustomerReturnNote/VerifyCustomerReturnNoteCommandHandler.cs`
- `src/DistributedManagementSystem.Sales/Presentation/Controllers/SalesOrdersController.cs`
- `src/DistributedManagementSystem.Inventory/Application/EventHandlers/SalesInventoryEventHandlers.cs`
- `src/DistributedManagementSystem.Inventory/Application/Interfaces/IStockReturnEntryRepository.cs`
- `src/DistributedManagementSystem.Inventory/Application/Queries/ReturnStockQueries/ListReturnStockEntriesQuery.cs`
- `src/DistributedManagementSystem.Inventory/Infrastructure/Persistence/Repositories/StockReturnEntryRepository.cs`
- `src/DistributedManagementSystem.Inventory/Presentation/Controllers/ReturnStockController.cs`
- Three Sales order unit-test files were updated for the enriched handler dependencies and event payloads.

Frontend:

- `src/services/api/salesService.js`
- `src/pages/sales/CustomerCredit/CustomerCreditPage.jsx`
- `src/pages/sales/CustomerReturnNotes/CrnDetailPage.jsx`
- `src/pages/inventory/ReturnStock/ReturnStockPage.jsx`
- `src/pages/inventory/StockAudit/StockAuditPage.jsx`
- `BUG_FIX_FOUND.md`

No migration was added: Invoice `VehicleId` and its EF column were already nullable with migration `20260703102057_MakeInvoiceVehicleIdNullable`.

## Verification

- Backend solution build: PASS, 0 errors.
- Backend unit tests: PASS, 275/275.
- Frontend production build: PASS.
- `git diff --check`: PASS in both repositories (line-ending notices only).
- Staging transaction verification remains pending deployment of these local changes.
