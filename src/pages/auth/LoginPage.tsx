import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { useAuthStore } from '@stores/authStore'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Unable to sign in right now.'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'admin',
      password: 'admin',
    },
  })

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values.username, values.password)
      toast.success('Session ready. Entering the ERP shell.')
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg-base)] px-4 py-10">
      <div className="gradient-orb" />
      <div className="panel grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1.2fr_0.8fr]">
        <div className="border-b border-[var(--color-border)] p-8 lg:border-b-0 lg:border-r lg:p-10">
          <p className="eyebrow">CBL Foods International</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-[var(--color-text-primary)]">
            Distribution Management System
          </h1>
          <p className="mt-5 max-w-xl text-base text-[var(--color-text-muted)]">
            Production scaffold for a data-dense FMCG distribution ERP covering purchasing,
            inventory, sales, collections, fleet, reporting, and user administration.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['Realtime Stock', 'SignalR-ready infrastructure for warehouse and route updates'],
              ['Typed Services', 'Typed Axios, TanStack Query, and domain contracts already wired'],
              ['ERP Shell', 'Responsive shell with navigation, breadcrumbs, clock, and tokens'],
            ].map(([title, description]) => (
              <div key={title} className="panel p-4">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 lg:p-10">
          <div className="mb-8">
            <p className="eyebrow">Access Shell</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
              Sign in to the scaffold
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              In development, the form falls back to a local demo session if the backend is not
              available yet.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label className="eyebrow" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className={`form-input ${errors.username ? 'error' : ''}`}
                placeholder="Enter username"
                {...register('username')}
              />
              {errors.username ? (
                <p className="text-sm text-[var(--color-danger)]">{errors.username.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="eyebrow" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter password"
                {...register('password')}
              />
              {errors.password ? (
                <p className="text-sm text-[var(--color-danger)]">{errors.password.message}</p>
              ) : null}
            </div>

            <button type="submit" className="button-primary w-full" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Open ERP Shell'}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-4">
            <p className="eyebrow">Quick Access</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Default local credentials:{' '}
              <span className="mono text-[var(--color-text-primary)]">admin / admin</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
