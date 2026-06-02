import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { useAuthStore } from '@stores/authStore'
import loginBg from '@/assets/login_bg.png'
const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})
function getErrorMessage(error) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }
  return 'Unable to sign in. Please check your credentials.'
}
export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', rememberMe: true },
  })
  const usernameField = register('username')
  const passwordField = register('password')
  async function onSubmit(values) {
    try {
      const username = values.username.trim()
      await login(username, values.password)
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }
  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary">
      {/* ── Left Panel: Cinematic Branding ─────────────────────── */}
      <div className="hidden lg:flex lg:w-3/5 flex-col relative border-r border-border overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${loginBg})` }}
        />
        <div className="absolute inset-0 bg-linear-to-br from-[#00182A]/90 via-[#00182A]/70 to-transparent" />
        <div className="absolute inset-0 bg-black/30" />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-3 px-10 py-8">
          <span className="text-2xl font-bold tracking-tight text-amber">CBL</span>
          <div className="w-px h-5 bg-white/20" />
          <span className="text-sm text-white/80 font-medium">Foods International</span>
        </div>

        {/* Center Content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 pb-24">
          <div className="text-center">
            <h1 className="text-[130px] font-black leading-[0.8] tracking-tighter text-amber mb-4 drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
              CBL
            </h1>
            <p className="text-[10px] font-bold tracking-[0.6em] text-white/80 mb-10 uppercase">
              FOODS INTERNATIONAL
            </p>
            <h2 className="text-5xl lg:text-6xl font-black mb-6 tracking-tight text-white leading-tight">
              Distribution Management <br /> System
            </h2>
            <p className="text-lg text-white/70 mx-auto leading-relaxed font-medium text-center">
              Streamlining Sri Lanka's FMCG Supply Chain
            </p>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 px-10 pb-8">
          <p className="text-[11px] text-white/40 font-medium tracking-wide">
            v1.0.0 · © 2026 CBL Foods International (Pvt) Ltd
          </p>
        </div>
      </div>

      {/* ── Right Panel: Login Form ─────────────────────────────── */}
      {/* (right panel is lg:w-2/5 = 40%) */}
      {/*
          Layout analysis from reference screenshot:
          - "Welcome Back"  ~36–38px bold, left-aligned
          - "Sign in to your account"  ~14px muted, 4px below heading
          - ~32px gap before USERNAME label
          - USERNAME label  11px uppercase spaced, 8px above input
          - username input  52px tall, rounded-xl
          - ~20px gap before PASSWORD label
          - PASSWORD label  11px uppercase spaced, 8px above input
          - password input  52px tall, rounded-xl, eye icon right
          - ~14px gap before Remember me row
          - Remember me row + Forgot password on same line
          - ~20px gap before Sign In button
          - Sign In button  52px tall, amber, rounded-xl
          - ~16px gap before Having trouble text, centered
        */}
      <div className="relative flex w-full lg:w-2/5 items-center justify-center bg-[#00121F]">
        {/* Ambient glow */}
        <div className="absolute right-0 top-0 size-72 rounded-full bg-amber/8 blur-3xl pointer-events-none" />

        {/* Form card — constrained width, no card background, left-aligned */}
        <div className="relative z-10 w-full" style={{ maxWidth: '360px', padding: '0 0' }}>
          {/* ── Heading ── */}
          <h2
            style={{
              fontSize: '2.1rem',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.1,
              marginBottom: '6px',
              letterSpacing: '-0.5px',
            }}
          >
            Welcome Back
          </h2>

          {/* ── Subtitle ── */}
          <p
            style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)', marginBottom: '36px' }}
          >
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* ── USERNAME label ── */}
            <label
              htmlFor="username"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                color: 'var(--color-text-muted)',
                marginBottom: '8px',
              }}
            >
              Username
            </label>

            {/* ── Username input ── */}
            <input
              id="username"
              type="text"
              placeholder="Enter username"
              autoComplete="username"
              style={{
                display: 'block',
                width: '100%',
                height: '52px',
                borderRadius: '10px',
                border: '1px solid #1a3347',
                background: '#0d1f2f',
                padding: '0 16px',
                fontSize: '0.92rem',
                color: '#ffffff',
                outline: '2px solid transparent',
                outlineOffset: '2px',
                transition: 'border-color 0.2s, background 0.2s',
                marginBottom: '20px',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-amber)'
                e.target.style.background = '#0f2438'
                e.target.style.outlineColor =
                  'color-mix(in srgb, var(--color-amber) 45%, transparent)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#1a3347'
                e.target.style.background = '#0d1f2f'
                e.target.style.outlineColor = 'transparent'
                void usernameField.onBlur(e)
              }}
              name={usernameField.name}
              ref={usernameField.ref}
              onChange={usernameField.onChange}
            />
            {errors.username ? (
              <p
                style={{
                  color: 'var(--color-danger)',
                  fontSize: '0.78rem',
                  marginTop: '-14px',
                  marginBottom: '14px',
                }}
              >
                {errors.username.message}
              </p>
            ) : null}

            {/* ── PASSWORD label ── */}
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                color: 'var(--color-text-muted)',
                marginBottom: '8px',
              }}
            >
              Password
            </label>

            {/* ── Password input ── */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '52px',
                  borderRadius: '10px',
                  border: '1px solid #1a3347',
                  background: '#0d1f2f',
                  padding: '0 48px 0 16px',
                  fontSize: '0.92rem',
                  color: '#ffffff',
                  outline: '2px solid transparent',
                  outlineOffset: '2px',
                  transition: 'border-color 0.2s, background 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-amber)'
                  e.target.style.background = '#0f2438'
                  e.target.style.outlineColor =
                    'color-mix(in srgb, var(--color-amber) 45%, transparent)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#1a3347'
                  e.target.style.background = '#0d1f2f'
                  e.target.style.outlineColor = 'transparent'
                  void passwordField.onBlur(e)
                }}
                name={passwordField.name}
                ref={passwordField.ref}
                onChange={passwordField.onChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  height: '52px',
                  width: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5a7a99',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#5a7a99')}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password ? (
              <p
                style={{
                  color: 'var(--color-danger)',
                  fontSize: '0.78rem',
                  marginTop: '-8px',
                  marginBottom: '14px',
                }}
              >
                {errors.password.message}
              </p>
            ) : null}

            {/* ── Remember me + Forgot password ── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '22px',
              }}
            >
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  style={{
                    width: '17px',
                    height: '17px',
                    borderRadius: '4px',
                    accentColor: 'var(--color-amber)',
                    cursor: 'pointer',
                  }}
                  {...register('rememberMe')}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Remember me
                </span>
              </label>

              {/*
       <button
         type="button"
         style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-amber)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
         onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-amber-dark)')}
         onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-amber)')}
       >
         Forgot password?
       </button>
       */}
            </div>

            {/* ── Sign In button ── */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                display: 'block',
                width: '100%',
                height: '52px',
                borderRadius: '10px',
                background: 'var(--color-amber)',
                border: 'none',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#00182A',
                cursor: 'pointer',
                transition: 'background 0.2s, transform 0.1s',
                marginBottom: '20px',
                opacity: isLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = 'var(--color-amber-dark)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-amber)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {isLoading ? 'Signing in' : 'Sign In'}
            </button>

            {/* ── Having trouble ── */}
            <p
              style={{
                textAlign: 'center',
                fontSize: '0.83rem',
                color: 'var(--color-text-muted)',
                margin: 0,
              }}
            >
              Having trouble?{' '}
              <button
                type="button"
                style={{
                  fontWeight: 600,
                  color: 'var(--color-amber)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-amber-dark)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-amber)')}
              >
                Contact IT Support
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
