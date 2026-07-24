# Collections frontend discovery

## HTTP client pattern

- `src/api/salesApi.js` defines a module-local `salesAxios` wrapper around the default `api` export from `@/lib/api`, prefixing requests with `/api/sales`.
- `src/api/inventoryApi.js` defines a module-local `inventoryAxios` wrapper around the same `api` client, prefixing requests with `/api/v1/inventory`.
- Collections therefore uses a module-local `collectionsAxios` wrapper around `api`, with the confirmed backend prefix `/api/collections`.
- Successful Collections responses are `ApiResponse<Result<T>>`; the usable value is `response.data.data.value`. Failure details are found in `response.data.data.errorMessage`/validation errors. The shared interceptor converts HTTP failures to `Error`, so UI error handling uses `error.message`.

## TanStack Query pattern

- Existing hooks use array keys ordered from module to resource to identifier/filter, for example `['inventory', 'stock', 'levels', params]` and `['inventory', 'stock', 'batches', productId]`.
- Collections keys follow the requested resource-first convention: `['collection-sessions', params]`, `['collection-session', id]`, `['cheques', params]`, `['deposit-batches', params]`, `['deposit-batch', id]`, `['customer-accounts', params]`, `['customer-account', customerId]`, and `['outstanding-invoices', customerId]`.

## Existing shared UI components

All are available through `@components/ui` (the barrel at `src/components/ui/index.js`) except `SimplePagination`, `UserAvatarIcon`, `GlobalConfirmDialog`, and `FormKeyboardManager`, which are imported directly.

- `AmountDisplay` — `@components/ui/AmountDisplay`
- `ConfirmDialog` — `@components/ui/ConfirmDialog`
- `CreditBar` — `@components/ui/CreditBar`
- `DataTable` — `@components/ui/DataTable`
- `EmptyState` — `@components/ui/EmptyState`
- `FilterBar` — `@components/ui/FilterBar`
- `KPICard` — `@components/ui/KPICard`
- `LoadingSkeleton` — `@components/ui/LoadingSkeleton`
- `Modal` — `@components/ui/Modal`
- `PageHeader` — `@components/ui/PageHeader`
- `RoleBadge` — `@components/ui/RoleBadge`
- `SlideDrawer` — `@components/ui/SlideDrawer`
- `StatusBadge` — `@components/ui/StatusBadge`
- `SimplePagination` — `@components/ui/SimplePagination`
- `UserAvatarIcon` — `@components/ui/UserAvatarIcon`
- `GlobalConfirmDialog` — `@components/ui/GlobalConfirmDialog`
- `FormKeyboardManager` — `@components/ui/FormKeyboardManager`

## Route registration

- The live entry point (`src/main.jsx`) imports `router` from `src/routes/index.jsx`; `src/App.jsx` contains a legacy duplicate router and is not mounted.
- `src/routes/index.jsx` uses `createBrowserRouter`. Authenticated pages are relative child route objects below the `/` `AppShell` route.
- Authorization is registered as `element: requirePermission(<Page />, PERMISSIONS....)`; multi-permission alternatives use an array and required conjunctions use `{ all: [...] }`.

## Sidebar navigation

- `src/components/layout/Sidebar.jsx` declares `navGroups` as `{ label: 'SECTION', items: [...] }`.
- A normal item is `{ label, to, icon, end?, permissions? }`.
- `permissions` accepts a string, an array (any permission), or `{ all: [...] }`. Items are filtered with `userMeetsPermissionRequirement` before rendering.
- Collections is added as a group after `SALES` and before `PURCHASING`.

## Date and timezone helpers

- `src/utils/formatDate.js` uses `dayjs`, `utc`, and `timezone` with `SRI_LANKA_TZ = 'Asia/Colombo'`.
- Existing exported helpers are `formatDate`, `formatDateTime`, `formatShortDateTime`, `formatTime`, `formatMonthYear`, `isOverdue`, and `daysOverdue`.

## Auth identity availability

- The app uses Zustand through `useAuthStore` (with the small `useAuth` wrapper also available).
- Identity is nested under `user`: `user.id` is the user ID and `user.orgId` is the organization ID. There are no top-level `userId` or `organizationId` fields in the store.
- Collections command controllers derive both values from JWT claims, so the frontend must not send them in request bodies.

## Confirmed backend differences from the request examples

- Sessions are `/api/collections/sessions`; cash and cheque entry are nested under a session.
- Cheque assignment is `POST /api/collections/cheques/{id}/deposit-batch`.
- Deposit batches are `/api/collections/deposit-batches`.
- Account detail already includes `aging` and `recentLedger`; there are no separate ledger/aging endpoints.
- No reconciliation endpoint is registered. The reconciliation page derives its report from the session detail returned by the supported session endpoint.
