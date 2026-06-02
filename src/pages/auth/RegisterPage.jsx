import { PageHeader } from '@components/ui'
import { useAuthStore } from '@stores/authStore'
export default function RegisterPage() {
  const { user } = useAuthStore()
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10">
      <div className="w-full space-y-6">
        <PageHeader
          title="User Registration"
          subtitle="Administrative onboarding placeholder for future user provisioning workflows."
        />
        <section className="panel placeholder-card">
          <p className="eyebrow">Admin Route</p>
          <h2>Module: Auth Registration, Coming Soon</h2>
          <p>
            This route is reserved for administrators. The current scaffold confirms access control
            and routing; the user creation form will be added once the backend onboarding contract
            is finalized.
          </p>
          <p className="text-sm text-text-muted">
            Signed in as{' '}
            <span className="mono text-text-primary">
              {user?.username ?? 'admin'}
            </span>
          </p>
        </section>
      </div>
    </div>
  )
}
