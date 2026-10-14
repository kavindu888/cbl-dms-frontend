import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useLanguage } from '@/i18n'
import { describePermissionRequirement, userMeetsPermissionRequirement } from '@/utils/permissions'

function AccessDenied({ requiredPermission }) {
  const location = useLocation()
  const { t } = useLanguage()

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
        <p className="eyebrow">{t('auth.accessDenied')}</p>
        <h1
          style={{
            marginTop: 10,
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          {t('auth.noPermission')}
        </h1>
        <p style={{ marginTop: 10, fontSize: 14, color: 'var(--color-text-muted)' }}>
          {t('auth.noPermissionDescription', { path: location.pathname })}
        </p>
        {requiredPermission ? (
          <p
            className="mono"
            style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-dim)' }}
          >
            {describePermissionRequirement(requiredPermission)}
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
          {t('common.backToDashboard')}
        </Link>
      </div>
    </div>
  )
}

export function ProtectedRoute({ children, requiredRole, requiredPermission }) {
  const { isAuthenticated, isLoading, hasRole, user } = useAuthStore()
  const { t } = useLanguage()
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
        <div className="panel w-full max-w-md p-8 text-center">
          <p className="eyebrow">{t('common.authorizing')}</p>
          <p className="mt-3 text-lg text-text-primary">{t('common.preparingShell')}</p>
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
  if (!userMeetsPermissionRequirement(user, requiredPermission)) {
    return <AccessDenied requiredPermission={requiredPermission} />
  }
  return <>{children}</>
}
