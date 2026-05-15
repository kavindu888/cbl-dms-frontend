import * as Tabs from '@radix-ui/react-tabs'
import { CheckCircle, RefreshCw, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/* ── Theme token defaults ─────────────────────────────────────── */

const DEFAULTS = {
  bgBase:      '#00182A',
  bgSurface:   '#132337',
  bgElevated:  '#1B3050',
  accentColor: '#F4A623',
  fontSans:    "'Inter', system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', monospace",
  borderRadius: 'default' as RadiusMode,
}

const ACCENT_PRESETS = [
  { label: 'Amber',  color: '#F4A623' },
  { label: 'Teal',   color: '#20D4BF' },
  { label: 'Blue',   color: '#66B5FA' },
  { label: 'Purple', color: '#A78BFA' },
  { label: 'Red',    color: '#F43F5E' },
]

type RadiusMode = 'compact' | 'default' | 'rounded'

const RADIUS_VALUES: Record<RadiusMode, string> = {
  compact: '4px',
  default: '8px',
  rounded: '14px',
}

const STORAGE_KEY = 'cbl-theme'

function loadTheme(): typeof DEFAULTS {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<typeof DEFAULTS>
    const validModes: RadiusMode[] = ['compact', 'default', 'rounded']
    return {
      ...DEFAULTS,
      ...parsed,
      borderRadius: validModes.includes(parsed.borderRadius as RadiusMode)
        ? (parsed.borderRadius as RadiusMode)
        : DEFAULTS.borderRadius,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function applyTheme(theme: typeof DEFAULTS) {
  const root = document.documentElement
  root.style.setProperty('--color-bg-base',     theme.bgBase)
  root.style.setProperty('--color-bg-surface',  theme.bgSurface)
  root.style.setProperty('--color-bg-elevated', theme.bgElevated)
  root.style.setProperty('--color-amber',       theme.accentColor)
  root.style.setProperty('--font-sans',         theme.fontSans)
  root.style.setProperty('--font-mono',         theme.fontMono)
  const r = RADIUS_VALUES[theme.borderRadius]
  root.style.setProperty('--radius-card',   r)
  root.style.setProperty('--radius-md',     r)
  root.style.setProperty('--radius-button', r === '4px' ? '4px' : r === '14px' ? '10px' : '6px')
}

/* ── API Config tab ───────────────────────────────────────────── */

function ApiConfigTab() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    const t = setTimeout(() => setStatus('offline'), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <label className="form-label">API BASE URL</label>
        <input
          className="form-input"
          value={import.meta.env.VITE_API_URL ?? 'http://localhost:5000'}
          readOnly
          style={{ cursor: 'default' }}
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-dim)' }}>
          Set via VITE_API_URL in your .env file
        </p>
      </div>

      <div>
        <label className="form-label">CONNECTION STATUS</label>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-md"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          {status === 'checking' && (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Checking…</span>
            </>
          )}
          {status === 'online' && (
            <>
              <CheckCircle className="h-4 w-4" style={{ color: 'var(--color-teal)' }} />
              <span className="text-sm" style={{ color: 'var(--color-teal)' }}>API reachable</span>
            </>
          )}
          {status === 'offline' && (
            <>
              <XCircle className="h-4 w-4" style={{ color: 'var(--color-danger)' }} />
              <span className="text-sm" style={{ color: 'var(--color-danger)' }}>
                API unreachable — running in mock mode
              </span>
            </>
          )}
        </div>
      </div>

      <div>
        <label className="form-label">APP VERSION</label>
        <input
          className="form-input"
          value={`v${import.meta.env.VITE_APP_VERSION ?? '1.0.0'}`}
          readOnly
          style={{ cursor: 'default' }}
        />
      </div>
    </div>
  )
}

/* ── Appearance tab ───────────────────────────────────────────── */

function AppearanceTab() {
  const [theme, setTheme] = useState(() => loadTheme())

  function update<K extends keyof typeof DEFAULTS>(key: K, value: (typeof DEFAULTS)[K]) {
    const next = { ...theme, [key]: value }
    setTheme(next)
    applyTheme(next)
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
    toast.success('Appearance saved.')
  }

  function reset() {
    setTheme({ ...DEFAULTS })
    applyTheme(DEFAULTS)
    localStorage.removeItem(STORAGE_KEY)
    toast.success('Theme reset to defaults.')
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
      {/* Left — controls */}
      <div className="space-y-8">
        {/* Accent color */}
        <section className="panel p-5">
          <p className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Accent Color
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {ACCENT_PRESETS.map(({ label, color }) => (
              <button
                key={color}
                type="button"
                title={label}
                onClick={() => update('accentColor', color)}
                className="h-9 w-9 rounded-full transition-transform hover:scale-110"
                style={{
                  background: color,
                  outline: theme.accentColor === color ? `3px solid ${color}` : '3px solid transparent',
                  outlineOffset: 2,
                }}
              />
            ))}
            <input
              type="color"
              value={theme.accentColor}
              onChange={(e) => update('accentColor', e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-full border-0 bg-transparent p-0"
              title="Custom color"
            />
          </div>
        </section>

        {/* Background colors */}
        <section className="panel p-5">
          <p className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Background Colors
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              ['bgBase',     'Base'],
              ['bgSurface',  'Surface'],
              ['bgElevated', 'Elevated'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="form-label">{label.toUpperCase()}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme[key]}
                    onChange={(e) => update(key, e.target.value)}
                    className="h-9 w-9 cursor-pointer rounded border-0 p-0"
                    style={{ background: 'transparent' }}
                  />
                  <input
                    className="form-input mono text-xs"
                    value={theme[key]}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="panel p-5">
          <p className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Typography
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">SANS FONT</label>
              <select
                className="form-input"
                value={theme.fontSans}
                onChange={(e) => update('fontSans', e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {[
                  ["'Inter', system-ui, sans-serif",         'Inter'],
                  ["'IBM Plex Sans', sans-serif",            'IBM Plex Sans'],
                  ["'Roboto', sans-serif",                   'Roboto'],
                  ["system-ui, sans-serif",                  'System UI'],
                ].map(([v, l]) => (
                  <option key={v} value={v} style={{ background: 'var(--color-bg-elevated)' }}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">MONO FONT</label>
              <select
                className="form-input"
                value={theme.fontMono}
                onChange={(e) => update('fontMono', e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {[
                  ["'JetBrains Mono', monospace",  'JetBrains Mono'],
                  ["'IBM Plex Mono', monospace",   'IBM Plex Mono'],
                  ["'Fira Code', monospace",        'Fira Code'],
                  ["'Courier New', monospace",      'Courier New'],
                ].map(([v, l]) => (
                  <option key={v} value={v} style={{ background: 'var(--color-bg-elevated)' }}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Border Radius */}
        <section className="panel p-5">
          <p className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Border Radius
          </p>
          <div className="flex gap-3">
            {(['compact', 'default', 'rounded'] as RadiusMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => update('borderRadius', mode)}
                className="flex-1 py-3 text-sm font-medium capitalize transition-colors"
                style={{
                  background: theme.borderRadius === mode ? 'rgba(244,166,35,0.12)' : 'var(--color-bg-elevated)',
                  border: `1px solid ${theme.borderRadius === mode ? 'var(--color-amber)' : 'var(--color-border)'}`,
                  color: theme.borderRadius === mode ? 'var(--color-amber)' : 'var(--color-text-muted)',
                  borderRadius: RADIUS_VALUES[mode],
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button className="button-primary" onClick={save}>
            Save Appearance
          </button>
          <button className="button-ghost" onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Right — live preview */}
      <div className="space-y-4">
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Live Preview
        </p>

        <div className="panel p-4 space-y-3">
          <p className="eyebrow">TODAY'S SALES</p>
          <p className="text-3xl font-bold mono" style={{ color: theme.accentColor }}>
            Rs. 2,847,500
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            ▲ 12% vs yesterday
          </p>
        </div>

        <div className="panel p-4 space-y-3">
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Button Variants
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="h-9 rounded px-4 text-sm font-semibold"
              style={{
                background: theme.accentColor,
                color: '#00182A',
                borderRadius: RADIUS_VALUES[theme.borderRadius],
                border: 'none',
              }}
            >
              Primary
            </button>
            <button
              className="h-9 rounded px-4 text-sm"
              style={{
                background: 'transparent',
                color: 'var(--color-text-primary)',
                borderRadius: RADIUS_VALUES[theme.borderRadius],
                border: '1px solid var(--color-border)',
              }}
            >
              Secondary
            </button>
            <button
              className="h-9 rounded px-4 text-sm font-semibold"
              style={{
                background: '#F43F5E',
                color: '#fff',
                borderRadius: RADIUS_VALUES[theme.borderRadius],
                border: 'none',
              }}
            >
              Delete
            </button>
          </div>
        </div>

        <div className="panel p-4">
          <label className="form-label">FOCUSED INPUT</label>
          <input
            className="form-input"
            defaultValue="Perera Stores"
            style={{ borderColor: theme.accentColor, boxShadow: `0 0 0 3px ${theme.accentColor}22` }}
          />
        </div>

        <div className="panel p-4 space-y-2">
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
            STATUS BADGES
          </p>
          <div className="flex flex-wrap gap-2">
            {['SUBMITTED', 'RECEIVED', 'PENDING', 'OVERDUE', 'ACTIVE'].map((s) => (
              <span
                key={s}
                className="mono inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{
                  background: s === 'SUBMITTED' ? 'rgba(102,181,250,0.15)'
                    : s === 'RECEIVED' ? 'rgba(32,212,191,0.15)'
                    : s === 'PENDING'  ? 'rgba(167,139,250,0.15)'
                    : s === 'OVERDUE'  ? 'rgba(244,63,94,0.20)'
                    : 'rgba(32,212,191,0.15)',
                  color: s === 'SUBMITTED' ? '#66B5FA'
                    : s === 'RECEIVED' ? '#20D4BF'
                    : s === 'PENDING'  ? '#A78BFA'
                    : s === 'OVERDUE'  ? '#F43F5E'
                    : '#20D4BF',
                  border: `1px solid ${s === 'SUBMITTED' ? '#66B5FA' : s === 'RECEIVED' ? '#20D4BF' : s === 'PENDING' ? '#A78BFA' : s === 'OVERDUE' ? '#F43F5E' : '#20D4BF'}`,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */

const TAB_BASE: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  borderBottom: '2px solid transparent',
  color: 'var(--color-text-muted)',
  transition: 'color 150ms, border-color 150ms',
  whiteSpace: 'nowrap',
}

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Application configuration, appearance, and system controls
        </p>
      </div>

      <Tabs.Root defaultValue="appearance">
        <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 24 }}>
          <Tabs.List className="flex gap-1" aria-label="Settings sections">
            {[
              ['appearance',  'Appearance'],
              ['api',         'API Configuration'],
              ['notifications','Notifications'],
            ].map(([value, label]) => (
              <Tabs.Trigger
                key={value}
                value={value}
                style={TAB_BASE}
                className="data-[state=active]:text-amber data-[state=active]:border-b-amber"
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        <Tabs.Content value="appearance">
          <AppearanceTab />
        </Tabs.Content>

        <Tabs.Content value="api">
          <ApiConfigTab />
        </Tabs.Content>

        <Tabs.Content value="notifications">
          <div className="panel max-w-xl p-6">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Notification preferences — coming soon.
            </p>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
