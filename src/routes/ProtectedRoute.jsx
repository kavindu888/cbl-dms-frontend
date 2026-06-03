import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { userHasPermission } from '@/utils/permissions'

function AccessDenied({ requiredPermission }) {
  const location = useLocation()

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--spacing-layout-topbar, 72px))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div className="panel" style={{ maxWidth: 520, padding: 28, textAlign: 'center' }}>
        <p className="eyebrow">Access denied</p>
        <h1
          style={{
            marginTop: 10,
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          You do not have permission.
        </h1>
        <p style={{ marginTop: 10, fontSize: 14, color: 'var(--color-text-muted)' }}>
          Your account cannot access {location.pathname}. Ask an administrator to grant the required
          permission.
        </p>
        {requiredPermission ? (
          <p
            className="mono"
            style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-dim)' }}
          >
            {Array.isArray(requiredPermission)
              ? requiredPermission.join(' or ')
              : requiredPermission}
          </p>
        ) : null}
        <Link
          to="/"
          className="button-primary"
          style={{
            marginTop: 22,
            height: 38,
            padding: '0 18px',
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export function ProtectedRoute({ children, requiredRole, requiredPermission }) {
  const { isAuthenticated, isLoading, hasRole, user } = useAuthStore()
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)] px-4">
        <div className="panel w-full max-w-md p-8 text-center">
          <p className="eyebrow">Authorizing</p>
          <p className="mt-3 text-lg text-[var(--color-text-primary)]">
            Preparing the ERP shell...
          </p>
        </div>
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (requiredRole && !hasRole(requiredRole)) {
    return <AccessDenied />
  }
  if (!userHasPermission(user, requiredPermission)) {
    return <AccessDenied requiredPermission={requiredPermission} />
  }
  return <>{children}</>
}
