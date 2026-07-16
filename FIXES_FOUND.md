# CBL DMS frontend fixes and codebase findings

## Mandatory read findings

### Customer Return Notes

- Files read: `src/pages/sales/CustomerReturnNotes/CrnListPage.jsx`, `CrnDetailPage.jsx`, `src/hooks/useCrn.js`, `src/api/salesApi.js`, and the active `src/services/api/salesService.js` implementation.
- Exact failure: the New Return Note button already had an `onClick` and creation form, so the route and handler were not missing. The form was rendered through `Modal` using unsupported props: the page passed `isOpen` and `onClose`, while `src/components/ui/Modal.jsx` accepts `open` and `onOpenChange`. That left Radix Dialog uncontrolled and closed, with no trigger inside the dialog, so clicking the button appeared to do nothing.
- The existing form was also a centered modal, not the requested master/detail sibling panel.
- `useCreateCrn` exists and calls `salesService.createCrn`. It invalidates CRN queries and shows Sonner success/error messages.
- `createCrn`, `getCrn`, `addCrnLine`, `removeCrnLine`, `submitCrn`, `verifyCrn`, `rejectCrn`, and `cancelCrn` all exist in both the thin `src/api/salesApi.js` wrapper and the active sales service. The hooks use `salesService`, not the thin wrapper.
- Routes for `/sales/return-notes` and `/sales/return-notes/:id` already existed.
- Backend limitation: `CreateCustomerReturnNoteCommand` accepts customer, reason, optional invoice, and notes, but not a return date. The create panel therefore shows today's server-aligned return date as read-only rather than offering a date that would not persist.

### Invoice Payment Record layout pattern

- `src/pages/sales/InvoicePaymentRecordPage.jsx` uses a normal CSS grid sibling layout, not a fixed drawer: `responsive-master-detail` with `gridTemplateColumns: 'minmax(0, 1fr) 380px'` and a 14 px gap.
- The left side is a `main` containing filter/list/detail panels. The right side is an `aside.panel` containing the payment form and summary.
- Selection is controlled by page state (`selectedInvoiceId` and `selectedInvoiceDetail`); the right card is populated from the selected record.
- The CRN implementation now uses the same 380 px right sibling and responsive class, while conditionally rendering it from local create-panel state.

### Purchase Returns and staged stock

- File read completely: `src/pages/purchasing/returns/PurchaseReturnsPage.jsx` plus `src/services/api/purchasingService.js` and backend request/command/DTO definitions.
- The staged dropdown was not a hardcoded placeholder in the current checkout. It already called `inventoryService.getReturnStockByProduct(productId)` when a GRN line was selected and already sent nullable `stockReturnEntryId` while adding a line.
- Backend linkage is real: `AddReturnNoteItemCommand` verifies the entry is available for the product, prevents quantity above staged availability, claims the entry, and stores `StockReturnEntryId` on the Return Note item.
- Missing pieces were the full option label, reliable clearing when choosing Not linked, and SOURCE display in the Return Items table. Those are now implemented.
- Updating an existing Return Note item does not accept a new `StockReturnEntryId`; staging selection is therefore limited to adding a new item, matching the backend contract.

### Inventory return-stock APIs

- `src/api/inventoryApi.js` already contained `flagStockForReturn`, `cancelReturnFlag`, `listReturnStock`, and `getReturnStockByProduct`, all through the existing Axios instance.
- The active `src/services/api/inventoryService.js` also already contained the same operations and unwraps the application's `ApiResponse<Result<T>>` envelope.
- `src/hooks/useReturnStock.js` already contained list/by-product queries and flag/cancel mutations with Sonner feedback and query invalidation.
- The Staged Returns page already existed but used incorrect DTO property names in its table (`quantity`, `createdBy`, `createdAt`). The backend DTO returns `qty`, `flaggedByUserId`, and `flaggedOn`; the page now uses those fields.
- Its flag modal also passed unsupported `Modal` props and is now wired with `open` / `onOpenChange`.

### Reusable components found

- Layout: `AppShell`, `Sidebar`, and `TopBar`.
- UI: `AmountDisplay`, `ConfirmDialog`, `CreditBar`, `DataTable`, `EmptyState`, `FilterBar`, `FormKeyboardManager`, `GlobalConfirmDialog`, `KPICard`, `LoadingSkeleton`, `Modal`, `PageHeader`, `RoleBadge`, `SimplePagination`, `SlideDrawer`, `StatusBadge`, and `UserAvatarIcon`.
- There was no generic `RightPanel`, `FormField`, or reusable searchable `Select`. Existing master/detail pages compose panels with grid siblings and local field helpers.
- `cn()` is available from `src/utils/cn.js` and is already used by shared components such as `StatusBadge` and `Sidebar`.

## Implemented fixes

1. Replaced the broken CRN modal with a searchable, conditional 380 px right-side create panel. It includes customer, reason, today's return date, optional customer invoice, notes, Draft badge, close control, Save Draft, Sonner feedback, and navigation to the created CRN detail route.
2. Completed Purchase Return staged stock behavior: descriptive staged options, staged quantity ceiling, staged field autofill, clean manual fallback, nullable `stockReturnEntryId`, and STAGED/MANUAL source badges.
3. Added the SOURCE column to Purchase Return detail items.
4. Added Flag for Return to every Stock Overview row, with product-specific batch selection, quantity validation, reason, notes, existing Axios/service/hook usage, toast feedback, close, and stock refresh.
5. Corrected and retained the existing Staged Returns page, filter tabs, status/reason badges, expiry coloring, cancel action, navigation entry, and worker flag workflow.
6. Added Stock Audit with product search, current availability/reserved/sellable position, FEFO-sorted batches, recent movements, and staged-return entries.
7. Added missing reason badge aliases for `Damaged`, `ShortExpiry`, and `Other`.

## Files created

- `src/pages/inventory/ReturnStock/FlagStockForReturnModal.jsx`
- `src/pages/inventory/StockAudit/StockAuditPage.jsx`
- `FIXES_FOUND.md`

## Files modified

- `src/components/layout/Sidebar.jsx`
- `src/components/ui/StatusBadge.jsx`
- `src/pages/inventory/ReturnStock/ReturnStockPage.jsx`
- `src/pages/inventory/Stock/StockOverviewPage.jsx`
- `src/pages/purchasing/returns/PurchaseReturnsPage.jsx`
- `src/pages/sales/CustomerReturnNotes/CrnListPage.jsx`
- `src/routes/index.jsx`

## Verification

- `npm run build`: passed with Vite 8; only the existing large-chunk/dynamic-import warnings remain.
- ESLint on every changed JSX file with the repository's Prettier rule disabled: passed. The full lint command is currently blocked by the checkout's existing CRLF-versus-Prettier LF configuration and timed out while reporting line-ending errors; no JavaScript/React lint errors remain in the changed files.
