# Purchase Returns UI Refactor Findings

## Current File Structure

- Previous Purchase Returns UI was a single page:
  - `src/pages/purchasing/returns/PurchaseReturnsPage.jsx`
- New refactored module:
  - `src/pages/purchasing/ReturnNotes/ReturnNoteListPage.jsx`
  - `src/pages/purchasing/ReturnNotes/NewReturnNotePage.jsx`
  - `src/pages/purchasing/ReturnNotes/ReturnNoteApprovalsPage.jsx`
  - `src/pages/purchasing/ReturnNotes/ReturnNoteDetailPage.jsx`
  - `src/pages/purchasing/ReturnNotes/components/ReturnItemForm.jsx`
  - `src/pages/purchasing/ReturnNotes/components/ReturnItemsTable.jsx`
  - `src/pages/purchasing/ReturnNotes/components/ReturnNoteSidebar.jsx`
  - `src/pages/purchasing/ReturnNotes/components/ReturnNoteStatusBadge.jsx`
  - `src/pages/purchasing/ReturnNotes/returnNoteHelpers.js`

## API Calls Used

`src/api/purchasingApi.js` does not exist. Purchasing calls are in `src/services/api/purchasingService.js`.

- `listReturnNotes(params)` -> `GET /api/v1/return-notes`
- `getReturnNote(id)` -> `GET /api/v1/return-notes/{id}`
- `listOutstandingReturnCredits(params)` -> `GET /api/v1/return-notes/outstanding-credits`
- `createReturnNote(payload)` -> `POST /api/v1/return-notes`
- `updateReturnNoteHeader(id, payload)` -> `PATCH /api/v1/return-notes/{id}/header`
- `addReturnNoteItem(id, payload)` -> `POST /api/v1/return-notes/{id}/items`
- `updateReturnNoteItem(id, itemId, payload)` -> `PUT /api/v1/return-notes/{id}/items/{itemId}`
- `removeReturnNoteItem(id, itemId)` -> `DELETE /api/v1/return-notes/{id}/items/{itemId}`
- `submitReturnNote(id)` -> `POST /api/v1/return-notes/{id}/submit`
- `approveReturnNote(id)` -> `POST /api/v1/return-notes/{id}/approve`
- `rejectReturnNote(id, reason)` -> `POST /api/v1/return-notes/{id}/reject`
- `completeReturnNote(id, payload)` -> `POST /api/v1/return-notes/{id}/complete`
- `cancelReturnNote(id, reason)` -> `POST /api/v1/return-notes/{id}/cancel`

Related lookups preserved:

- `purchasingService.listSuppliers`
- `purchasingService.listGoodsReceipts`
- `purchasingService.getGoodsReceipt`
- `masterService.listProducts`
- `inventoryService.getAvailableReturnStockByProduct`

## Previous Page State Variables

The old `PurchaseReturnsPage` held: `notes`, `selectedId`, `selectedNote`, `suppliers`, `products`, `receipts`, `selectedReceiptId`, `selectedReceipt`, `header`, `itemForm`, `productSearch`, `selectedProductId`, `showManualForm`, `availableReturnEntries`, `isLoadingReturnEntries`, `editingItemId`, `search`, `supplierFilter`, `fromDate`, `toDate`, `page`, `isLoading`, `isDetailLoading`, `isSaving`, `error`, `reason`, `completeForm`.

## Routes

Previous active route:

- `/purchasing/returns` -> `PurchaseReturnsPage`

Updated active routes in `src/routes/index.jsx`:

- `/purchasing/returns` -> compatibility redirect
- `/purchasing/return-notes` -> `ReturnNoteListPage`
- `/purchasing/return-notes/new` -> `NewReturnNotePage`
- `/purchasing/return-notes/approvals` -> `ReturnNoteApprovalsPage`
- `/purchasing/return-notes/:id` -> `ReturnNoteDetailPage`

The older `src/App.jsx` router was also updated with the same new routes.

## PO Page Pattern Observed

- PO pages use `panel`, `form-input`, `button-primary`, `button-secondary`, `button-danger`, `icon-button`.
- PO tables use `data-table`, `product-table-compact`, `product-sku-badge`, `product-info-sub`, `uom-badge`.
- PO list and approval pages use a two-pane queue/detail grid with `responsive-master-detail`.
- PO create page uses a two-column grid with `xl:grid-cols-[minmax(0,1fr)_420px]`.
- Status badges are compact pill badges with small uppercase text.
- Numeric values use the `mono` class.

## Shared Layout

- No `src/components/layouts/` directory exists.
- No shared `SplitPaneLayout` component exists.
- PO pages implement split panes inline using CSS grid and `panel` classes.

## UI Components Available

- `AmountDisplay.jsx`
- `ConfirmDialog.jsx`
- `CreditBar.jsx`
- `DataTable.jsx`
- `EmptyState.jsx`
- `FilterBar.jsx`
- `FormKeyboardManager.jsx`
- `GlobalConfirmDialog.jsx`
- `KPICard.jsx`
- `LoadingSkeleton.jsx`
- `Modal.jsx`
- `PageHeader.jsx`
- `RoleBadge.jsx`
- `SimplePagination.jsx`
- `SlideDrawer.jsx`
- `StatusBadge.jsx`
- `UserAvatarIcon.jsx`

## Hooks

No previous Purchase Return hook existed. Added `src/hooks/useReturnNotes.js` with:

- `useReturnNotes`
- `useReturnNote`
- `usePendingReturnNotes`
- `useCreateReturnNote`
- `useAddReturnNoteItem`
- `useUpdateReturnNoteItem`
- `useRemoveReturnNoteItem`
- `useSubmitReturnNote`
- `useApproveReturnNote`
- `useRejectReturnNote`
- `useCompleteReturnNote`
- `useCancelReturnNote`

## Sidebar

- Purchase Returns now points to `/purchasing/return-notes`.
- Added `RN Approve & Reject` pointing to `/purchasing/return-notes/approvals`.
- Added an amber pending approval count badge using `listReturnNotes({ status: ReturnNoteStatus.Submitted })`.

## Verification

- `npm run build` succeeded.
- Existing Vite bundle-size and dynamic-import warnings remain.
