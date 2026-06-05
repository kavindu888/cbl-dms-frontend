import * as Tabs from '@radix-ui/react-tabs'
import { RefreshCw, XCircle, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import OrganisationsTab from './OrganisationsTab'
import TerritoriesTab from './TerritoriesTab'
import BusinessUnitsTab from './BusinessUnitsTab'
const DEFAULTS = {
  mode: 'dark',
  accentColor: '#8EE8F0',
  fontSans: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  borderRadius: 'default',
}
const ACCENT_PRESETS = [
  { label: 'Windows Cyan', color: '#8EE8F0' },
  { label: 'Mint', color: '#7DE2D1' },
  { label: 'Blue', color: '#9FD7FF' },
  { label: 'Lilac', color: '#C7B9FF' },
  { label: 'Rose', color: '#FF7B8A' },
]
const RADIUS_VALUES = {
  compact: '4px',
  default: '8px',
  rounded: '14px',
}
const RADIUS_LABELS = {
  compact: 'Compact',
  default: 'Default',
  rounded: 'Rounded',
}
const STORAGE_KEY = 'cbl-theme'
const THEME_PRESETS = {
  dark: {
    bgBase: '#111217',
    bgSurface: '#1A1A22',
    bgElevated: '#242331',
    border: '#343241',
    textPrimary: '#F4F4F6',
    textMuted: '#C7C5CC',
    textDim: '#8F8B99',
    accentColor: '#8EE8F0',
  },
  light: {
    bgBase: '#F4F8FF',
    bgSurface: '#FFFFFF',
    bgElevated: '#E7F0FF',
    border: '#BFD0EA',
    textPrimary: '#0F172A',
    textMuted: '#334155',
    textDim: '#64748B',
    accentColor: '#0E7490',
  },
}
function loadTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    const validModes = ['compact', 'default', 'rounded']
    const mode = parsed.mode === 'light' ? 'light' : 'dark'
    const savedAccentColor = parsed.accentColor?.toUpperCase()
    const accentColor =
      (mode === 'dark' && (!savedAccentColor || savedAccentColor === '#F4A623')) ||
      (mode === 'light' &&
        (!savedAccentColor || savedAccentColor === '#8EE8F0' || savedAccentColor === '#F4A623'))
        ? THEME_PRESETS[mode].accentColor
        : (parsed.accentColor ?? THEME_PRESETS[mode].accentColor)

    return {
      ...DEFAULTS,
      ...parsed,
      mode,
      accentColor,
      borderRadius: validModes.includes(parsed.borderRadius)
        ? parsed.borderRadius
        : DEFAULTS.borderRadius,
    }
  } catch {
    return { ...DEFAULTS }
  }
}
function applyTheme(theme) {
  const root = document.documentElement
  const preset = THEME_PRESETS[theme.mode]
  const savedAccentColor = theme.accentColor?.toUpperCase()
  const accentColor =
    theme.mode === 'light' && (savedAccentColor === '#8EE8F0' || savedAccentColor === '#F4A623')
      ? preset.accentColor
      : theme.accentColor

  root.style.setProperty('--color-bg-base', preset.bgBase)
  root.style.setProperty('--color-bg-surface', preset.bgSurface)
  root.style.setProperty('--color-bg-elevated', preset.bgElevated)
  root.style.setProperty('--color-border', preset.border)
  root.style.setProperty('--color-text-primary', preset.textPrimary)
  root.style.setProperty('--color-text-muted', preset.textMuted)
  root.style.setProperty('--color-text-dim', preset.textDim)
  root.style.setProperty('--color-amber', accentColor)
  root.style.setProperty('--color-amber-dark', `color-mix(in srgb, ${accentColor} 82%, #000)`)
  root.style.setProperty('--font-sans', theme.fontSans)
  root.style.setProperty('--font-mono', theme.fontMono)
  root.dataset.theme = theme.mode
  root.style.colorScheme = theme.mode
  document.body.style.colorScheme = theme.mode
  const r = RADIUS_VALUES[theme.borderRadius]
  root.style.setProperty('--radius-card', r)
  root.style.setProperty('--radius-md', r)
  root.style.setProperty('--radius-button', r === '4px' ? '4px' : r === '14px' ? '10px' : '6px')
}
/* ── API Config tab ───────────────────────────────────────────── */
function ApiConfigTab() {
  const [status, setStatus] = useState('checking')
  useEffect(() => {
    const t = setTimeout(() => setStatus('offline'), 1200)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <label className="form-label">API BASE URL</label>
        <input
          className="form-input"
          value={import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7001/api/v1'}
          readOnly
          style={{ cursor: 'default' }}
        />
        <p style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-dim)' }}>
          Set via VITE_API_BASE_URL in your .env file
        </p>
      </div>

      <div>
        <label className="form-label">CONNECTION STATUS</label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {status === 'checking' && (
            <>
              <RefreshCw
                style={{
                  width: 16,
                  height: 16,
                  color: 'var(--color-text-muted)',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Checking…</span>
            </>
          )}
          {status === 'online' && (
            <>
              <CheckCircle style={{ width: 16, height: 16, color: 'var(--color-teal)' }} />
              <span style={{ fontSize: 13, color: 'var(--color-teal)' }}>API reachable</span>
            </>
          )}
          {status === 'offline' && (
            <>
              <XCircle style={{ width: 16, height: 16, color: 'var(--color-danger)' }} />
              <span style={{ fontSize: 13, color: 'var(--color-danger)' }}>
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
  function update(key, value) {
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
  const badgeColor = {
    SUBMITTED: { bg: 'rgba(102,181,250,0.15)', text: '#66B5FA', border: '#66B5FA' },
    RECEIVED: { bg: 'rgba(32,212,191,0.15)', text: '#20D4BF', border: '#20D4BF' },
    PENDING: { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA', border: '#A78BFA' },
    OVERDUE: { bg: 'rgba(244,63,94,0.20)', text: '#F43F5E', border: '#F43F5E' },
    ACTIVE: { bg: 'rgba(32,212,191,0.15)', text: '#20D4BF', border: '#20D4BF' },
  }
  const accentWash = `color-mix(in srgb, ${theme.accentColor} 10%, transparent)`
  const accentRing = `color-mix(in srgb, ${theme.accentColor} 18%, transparent)`
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}
    >
      {/* ── Left column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Accent Color */}
        <section className="panel" style={{ padding: '20px 24px' }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 16,
            }}
          >
            Accent Color
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {ACCENT_PRESETS.map(({ label, color }) => (
              <button
                key={color}
                type="button"
                title={label}
                onClick={() => update('accentColor', color)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: color,
                  border: 'none',
                  cursor: 'pointer',
                  outline:
                    theme.accentColor === color ? `3px solid ${color}` : '3px solid transparent',
                  outlineOffset: 2,
                  transition: 'transform 120ms',
                  flexShrink: 0,
                }}
              />
            ))}
            <input
              type="color"
              value={theme.accentColor}
              onChange={(e) => update('accentColor', e.target.value)}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
              title="Custom color"
            />
          </div>
        </section>

        {/* Theme Mode */}
        <section className="panel" style={{ padding: '20px 24px' }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 10,
            }}
          >
            Theme Mode
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 18 }}>
            Choose the overall app appearance for the dashboard shell and pages.
          </p>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}
          >
            {[
              ['dark', 'Dark', 'Deep navy workspace with bright contrast.'],
              ['light', 'Light', 'Clean bright workspace with soft surfaces.'],
            ].map(([value, label, desc]) => {
              const active = theme.mode === value
              const preset = THEME_PRESETS[value]
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => update('mode', value)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: `1px solid ${active ? 'var(--color-amber)' : 'var(--color-border)'}`,
                    borderRadius: RADIUS_VALUES[theme.borderRadius],
                    background: active ? accentWash : 'var(--color-bg-elevated)',
                    boxShadow: active ? `0 0 0 3px ${accentRing}` : 'none',
                    transition: 'border-color 150ms, background 150ms, box-shadow 150ms',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 42,
                      height: 42,
                      flexShrink: 0,
                      borderRadius: 12,
                      border: `1px solid ${preset.border}`,
                      background: `linear-gradient(180deg, ${preset.bgSurface} 0%, ${preset.bgElevated} 100%)`,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}
                  />
                  <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span
                      style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}
                    >
                      {label}
                    </span>
                    <span
                      style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}
                    >
                      {desc}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Typography */}
        <section className="panel" style={{ padding: '20px 24px' }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 20,
            }}
          >
            Typography
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">SANS FONT</label>
              <select
                className="form-input"
                value={theme.fontSans}
                onChange={(e) => update('fontSans', e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {[
                  ["'Inter', system-ui, sans-serif", 'Inter'],
                  ["'IBM Plex Sans', sans-serif", 'IBM Plex Sans'],
                  ["'Roboto', sans-serif", 'Roboto'],
                  ['system-ui, sans-serif', 'System UI'],
                ].map(([v, l]) => (
                  <option key={v} value={v} style={{ background: 'var(--color-bg-elevated)' }}>
                    {l}
                  </option>
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
                  ["'JetBrains Mono', monospace", 'JetBrains Mono'],
                  ["'IBM Plex Mono', monospace", 'IBM Plex Mono'],
                  ["'Fira Code', monospace", 'Fira Code'],
                  ["'Courier New', monospace", 'Courier New'],
                ].map(([v, l]) => (
                  <option key={v} value={v} style={{ background: 'var(--color-bg-elevated)' }}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Border Radius */}
        <section className="panel" style={{ padding: '20px 24px' }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 20,
            }}
          >
            Border Radius
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {['compact', 'default', 'rounded'].map((mode) => {
              const active = theme.borderRadius === mode
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => update('borderRadius', mode)}
                  style={{
                    flex: 1,
                    height: 44,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: active ? accentWash : 'transparent',
                    border: `1px solid ${active ? 'var(--color-amber)' : 'var(--color-border)'}`,
                    color: active ? 'var(--color-amber)' : 'var(--color-text-muted)',
                    borderRadius: RADIUS_VALUES[mode],
                    transition: 'color 150ms, background 150ms, border-color 150ms',
                  }}
                >
                  {RADIUS_LABELS[mode]}
                </button>
              )
            })}
          </div>
        </section>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
          <button
            className="button-primary"
            onClick={save}
            style={{ height: 40, padding: '0 20px', fontSize: 14 }}
          >
            Save Appearance
          </button>
          <button
            className="button-ghost"
            onClick={reset}
            style={{
              height: 40,
              padding: '0 14px',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* ── Right column — Live Preview ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 0,
          }}
        >
          Live Preview
        </p>

        {/* Today's Sales card */}
        <div className="panel" style={{ padding: '16px 20px' }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>
            TODAY'S SALES
          </p>
          <p
            className="mono"
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: theme.accentColor,
              marginBottom: 6,
            }}
          >
            Rs.&nbsp;2,847,500
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-teal)' }}>▲ 12% vs yesterday</p>
        </div>

        {/* Button Variants card */}
        <div className="panel" style={{ padding: '16px 20px' }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 14,
            }}
          >
            Button Variants
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              style={{
                height: 36,
                padding: '0 16px',
                fontSize: 13,
                fontWeight: 600,
                background: theme.accentColor,
                color: '#111217',
                border: 'none',
                borderRadius: RADIUS_VALUES[theme.borderRadius],
                cursor: 'default',
              }}
            >
              Primary
            </button>
            <button
              style={{
                height: 36,
                padding: '0 16px',
                fontSize: 13,
                background: 'transparent',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: RADIUS_VALUES[theme.borderRadius],
                cursor: 'default',
              }}
            >
              Secondary
            </button>
            <button
              style={{
                height: 36,
                padding: '0 16px',
                fontSize: 13,
                fontWeight: 600,
                background: '#F43F5E',
                color: '#fff',
                border: 'none',
                borderRadius: RADIUS_VALUES[theme.borderRadius],
                cursor: 'default',
              }}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Focused Input card */}
        <div className="panel" style={{ padding: '16px 20px' }}>
          <label className="form-label">FOCUSED INPUT</label>
          <input
            className="form-input"
            defaultValue="Perera Stores"
            style={{
              borderColor: theme.accentColor,
              boxShadow: `0 0 0 3px color-mix(in srgb, ${theme.accentColor} 16%, transparent)`,
            }}
          />
        </div>

        {/* Status Badges card */}
        <div className="panel" style={{ padding: '16px 20px' }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>
            STATUS BADGES
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['SUBMITTED', 'RECEIVED', 'PENDING', 'OVERDUE', 'ACTIVE'].map((s) => {
              const c = badgeColor[s]
              return (
                <span
                  key={s}
                  className="mono"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.4px',
                    background: c.bg,
                    color: c.text,
                    border: `1px solid ${c.border}`,
                    borderRadius: 20,
                  }}
                >
                  {s}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
/* ── Outer tab pill style ─────────────────────────────────────── */
/* outerTabBase removed — outer tabs now use underline style */
/* ── Page ─────────────────────────────────────────────────────── */
export default function SettingsPage() {
  return (
    <div
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflow: 'hidden',
      }}
    >
      {/* Page header */}
      <div style={{ flexShrink: 0 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 4,
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
          Manage organisations, territories, business units, application configuration, and
          appearance
        </p>
      </div>

      {/* Outer tabs: Organisations | Application */}
      <Tabs.Root
        defaultValue="organisations"
        style={{ minHeight: 0, display: 'flex', flex: 1, flexDirection: 'column' }}
      >
        {/* Outer underline tab bar */}
        <div
          style={{
            flexShrink: 0,
            borderBottom: '1px solid var(--color-border)',
            marginBottom: 16,
          }}
        >
          <Tabs.List style={{ display: 'flex', gap: 0 }} aria-label="Settings category">
            {[
              ['organisations', 'Organisations'],
              ['territories', 'Territories'],
              ['businessUnits', 'Business Units'],
              ['application', 'Application'],
            ].map(([value, label]) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="settings-outer-tab"
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  borderBottom: '2px solid transparent',
                  color: 'var(--color-text-muted)',
                  transition: 'color 150ms, border-color 150ms',
                  whiteSpace: 'nowrap',
                  marginBottom: -1,
                }}
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        {/* Organisations content */}
        <Tabs.Content value="organisations" style={{ minHeight: 0, flex: 1, overflow: 'hidden' }}>
          <OrganisationsTab />
        </Tabs.Content>

        {/* Territories content */}
        <Tabs.Content value="territories" style={{ minHeight: 0, flex: 1, overflowY: 'auto' }}>
          <TerritoriesTab />
        </Tabs.Content>

        {/* Business Units content */}
        <Tabs.Content value="businessUnits" style={{ minHeight: 0, flex: 1, overflowY: 'auto' }}>
          <BusinessUnitsTab />
        </Tabs.Content>

        {/* Application content → inner tabs */}
        <Tabs.Content value="application" style={{ minHeight: 0, flex: 1, overflowY: 'auto' }}>
          <Tabs.Root defaultValue="appearance">
            {/* Inner underline tab bar */}
            <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 28 }}>
              <Tabs.List
                style={{ display: 'flex', gap: 0 }}
                aria-label="Application settings sections"
              >
                {[
                  ['appearance', 'Appearance'],
                  ['api', 'API Configuration'],
                  ['notifications', 'Notifications'],
                ].map(([value, label]) => (
                  <Tabs.Trigger
                    key={value}
                    value={value}
                    className="settings-inner-tab"
                    style={{
                      padding: '10px 18px',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: 'none',
                      background: 'none',
                      borderBottom: '2px solid transparent',
                      color: 'var(--color-text-muted)',
                      transition: 'color 150ms, border-color 150ms',
                      whiteSpace: 'nowrap',
                      marginBottom: -1,
                    }}
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
              <div className="panel" style={{ maxWidth: 520, padding: 24 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Notification preferences — coming soon.
                </p>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
