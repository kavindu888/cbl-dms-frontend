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
        {/* Modern dark gradient overlay with subtle purple/violet tones */}
        <div className="absolute inset-0 bg-linear-to-br from-[#0c0d12]/95 via-[#181524]/85 to-[#0b0c10]/75" />
        <div className="absolute inset-0 bg-black/25" />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-3 px-10 py-8">
          {/* Small Brand Logo */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#flowLinkLogoGrad)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(139, 92, 246, 0.4))' }}
          >
            <defs>
              <linearGradient id="flowLinkLogoGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--color-amber)" />
                <stop offset="100%" stopColor="var(--color-purple)" />
              </linearGradient>
            </defs>
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
            <circle cx="5" cy="12" r="2.5" fill="var(--color-amber)" stroke="none" />
            <circle cx="19" cy="12" r="2.5" fill="var(--color-purple)" stroke="none" />
          </svg>
          <span className="text-lg font-bold tracking-tight bg-linear-to-r from-amber to-purple bg-clip-text text-transparent">
            FlowLink
          </span>
          <div className="w-px h-4 bg-white/20" />
          <span className="text-xs text-white/60 font-semibold uppercase tracking-wider">
            Distribution Hub
          </span>
        </div>

        {/* Center Content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 pb-16">
          <div className="text-center w-full max-w-[500px]">
            {/* Glowing Hub Tech Graph SVG */}
            <div className="flex justify-center mb-8">
              <svg width="180" height="100" viewBox="0 0 180 100" className="opacity-90">
                <defs>
                  <linearGradient id="flowLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-amber)" />
                    <stop offset="100%" stopColor="var(--color-purple)" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                {/* Connecting paths */}
                <path
                  d="M30 50 Q 65 20, 100 50 T 150 50"
                  fill="none"
                  stroke="url(#flowLineGrad)"
                  strokeWidth="3"
                  filter="url(#glow)"
                />
                <path
                  d="M30 50 Q 80 80, 150 50"
                  fill="none"
                  stroke="url(#flowLineGrad)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                <line
                  x1="90"
                  y1="10"
                  x2="100"
                  y2="50"
                  stroke="var(--color-blue)"
                  strokeWidth="1.5"
                  opacity="0.5"
                />
                <line
                  x1="90"
                  y1="90"
                  x2="100"
                  y2="50"
                  stroke="var(--color-blue)"
                  strokeWidth="1.5"
                  opacity="0.5"
                />

                {/* Grid nodes */}
                <circle cx="30" cy="50" r="7" fill="var(--color-amber)" filter="url(#glow)" />
                <circle cx="30" cy="50" r="3" fill="#fff" />

                <circle cx="100" cy="50" r="9" fill="var(--color-blue)" filter="url(#glow)" />
                <circle cx="100" cy="50" r="4" fill="#fff" />

                <circle cx="150" cy="50" r="7" fill="var(--color-purple)" filter="url(#glow)" />
                <circle cx="150" cy="50" r="3" fill="#fff" />

                <circle cx="90" cy="10" r="4" fill="var(--color-teal)" />
                <circle cx="90" cy="90" r="4" fill="var(--color-warning)" />
              </svg>
            </div>

            <h1 className="text-5xl lg:text-6xl font-black mb-4 tracking-tight bg-linear-to-r from-amber via-blue to-purple bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
              FlowLink
            </h1>
            <p className="text-[11px] font-bold tracking-[0.4em] text-white/50 mb-8 uppercase">
              Intelligent Distribution Platform
            </p>
            <p className="text-base text-white/70 leading-relaxed font-medium">
              Connecting fleet operations, logistics networks, and business intelligence in real
              time.
            </p>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 px-10 pb-8">
          <p className="text-[11px] text-white/40 font-medium tracking-wide">
            v1.0.0 · © 2026 FlowLink Systems. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right Panel: Login Form ─────────────────────────────── */}
      <div className="relative flex w-full lg:w-2/5 items-center justify-center bg-bg-base">
        {/* Ambient glow matching theme colors */}
        <div className="absolute right-0 top-0 size-80 rounded-full bg-linear-to-br from-purple/10 to-amber/5 blur-3xl pointer-events-none" />

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
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                color: 'var(--color-text-dim)',
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
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-surface)',
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
                e.target.style.background = 'color-mix(in srgb, var(--color-bg-surface) 92%, #fff)'
                e.target.style.outlineColor =
                  'color-mix(in srgb, var(--color-amber) 30%, transparent)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border)'
                e.target.style.background = 'var(--color-bg-surface)'
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
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                color: 'var(--color-text-dim)',
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
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-surface)',
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
                  e.target.style.background =
                    'color-mix(in srgb, var(--color-bg-surface) 92%, #fff)'
                  e.target.style.outlineColor =
                    'color-mix(in srgb, var(--color-amber) 30%, transparent)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border)'
                  e.target.style.background = 'var(--color-bg-surface)'
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
                  color: 'var(--color-text-dim)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-dim)')}
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

            {/* ── Remember me ── */}
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
                    width: '16px',
                    height: '16px',
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
                background: 'linear-gradient(to right, var(--color-amber), var(--color-purple))',
                border: 'none',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#111217',
                cursor: 'pointer',
                transition: 'opacity 0.2s, transform 0.1s, box-shadow 0.2s',
                marginBottom: '20px',
                opacity: isLoading ? 0.6 : 1,
                boxShadow: '0 4px 14px rgba(142, 232, 240, 0.15)',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.opacity = '0.9'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(142, 232, 240, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(142, 232, 240, 0.15)'
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* ── Having trouble ── */}
            <p
              style={{
                textAlign: 'center',
                fontSize: '0.83rem',
                color: 'var(--color-text-dim)',
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
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-purple)')}
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
