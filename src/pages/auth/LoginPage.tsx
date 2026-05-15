import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { useAuthStore } from '@stores/authStore'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Unable to sign in. Please check your credentials.'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: 'admin', password: 'admin', rememberMe: true },
  })

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values.username, values.password)
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col"
        style={{ backgroundColor: '#0D1E2D', borderRight: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-10 py-7">
          <span className="text-2xl font-bold" style={{ color: 'var(--color-amber)', fontFamily: 'var(--font-sans)' }}>
            CBL
          </span>
          <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Foods International</span>
        </div>

        {/* Center content */}
        <div className="flex flex-1 flex-col items-center justify-center px-12 pb-16">
          <div className="text-center mb-10">
            <div
              className="text-8xl font-bold mb-2"
              style={{ color: 'var(--color-amber)', fontFamily: 'var(--font-sans)', letterSpacing: '-2px' }}
            >
              CBL
            </div>
            <p
              className="text-sm font-semibold tracking-[0.2em] mb-8"
              style={{ color: 'var(--color-text-muted)' }}
            >
              FOODS INTERNATIONAL
            </p>
            <h1
              className="text-2xl font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Distribution Management System
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Streamlining Sri Lanka's FMCG supply chain
            </p>
          </div>

          {/* Stats box */}
          <div
            className="flex divide-x w-full max-w-xs"
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            {[
              { value: '284', label: 'Active SKUs' },
              { value: '12',  label: 'Districts' },
              { value: '4',   label: 'Fleet' },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="flex-1 flex flex-col items-center py-4"
                style={{ borderRight: '1px solid var(--color-border)' }}
              >
                <span className="text-xl font-bold mono" style={{ color: 'var(--color-amber)' }}>
                  {value}
                </span>
                <span className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 pb-8">
          <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
            v1.0.0 · © 2026 CBL Foods International (Pvt) Ltd
          </p>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div
        className="flex w-full lg:w-1/2 flex-col items-center justify-center px-8 py-12"
        style={{ backgroundColor: 'var(--color-bg-base)' }}
      >
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <span className="text-2xl font-bold" style={{ color: 'var(--color-amber)' }}>CBL</span>
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Distribution Management System</span>
        </div>

        <div className="w-full max-w-sm">
          <h2
            className="text-3xl font-bold mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Welcome Back
          </h2>
          <p className="mb-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username */}
            <div>
              <label className="form-label" htmlFor="username">USERNAME</label>
              <input
                id="username"
                className={`form-input ${errors.username ? 'error' : ''}`}
                placeholder="Enter username"
                autoComplete="username"
                {...register('username')}
              />
              {errors.username && (
                <p className="form-error">⚠ {errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="form-label" htmlFor="password">PASSWORD</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input pr-10 ${errors.password ? 'error' : ''}`}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 flex items-center"
                  style={{ color: 'var(--color-text-dim)' }}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="form-error">⚠ {errors.password.message}</p>
              )}
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-amber-400"
                  style={{ accentColor: 'var(--color-amber)' }}
                  {...register('rememberMe')}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-sm font-medium"
                style={{ color: 'var(--color-amber)' }}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="button-primary w-full text-base"
              style={{ height: 48, fontWeight: 600, fontSize: 15 }}
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div style={{ height: 1, background: 'var(--color-border)' }} />
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 text-xs"
              style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-dim)' }}
            >
              OR
            </span>
          </div>

          {/* Support */}
          <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Having trouble?{' '}
            <span
              className="font-medium cursor-pointer"
              style={{ color: 'var(--color-amber)' }}
            >
              Contact IT Support
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
