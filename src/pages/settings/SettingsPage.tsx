import * as Tabs from '@radix-ui/react-tabs'
import { CheckCircle, RefreshCw, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/* ── Theme token defaults ─────────────────────────────────────── */

const DEFAULTS = {
  bgBase:       '#00182A',
  bgSurface:    '#132337',
  bgElevated:   '#1B3050',
  accentColor:  '#F4A623',
  fontSans:     "'Inter', system-ui, sans-serif",
  fontMono:     "'JetBrains Mono', monospace",
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

const RADIUS_LABELS: Record<RadiusMode, string> = {
  compact: 'Compact',
  default: 'Default',
  rounded: 'Rounded',
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
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <label className="form-label">API BASE URL</label>
        <input
          className="form-input"
          value={import.meta.env.VITE_API_URL ?? 'http://localhost:5000'}
          readOnly
          style={{ cursor: 'default' }}
        />
        <p style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-dim)' }}>
          Set via VITE_API_URL in your .env file
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
              <RefreshCw style={{ width: 16, height: 16, color: 'var(--color-text-muted)', animation: 'spin 1s linear infinite' }} />
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

  const badgeColor: Record<string, { bg: string; text: string; border: string }> = {
    SUBMITTED: { bg: 'rgba(102,181,250,0.15)', text: '#66B5FA', border: '#66B5FA' },
    RECEIVED:  { bg: 'rgba(32,212,191,0.15)',  text: '#20D4BF', border: '#20D4BF' },
    PENDING:   { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA', border: '#A78BFA' },
    OVERDUE:   { bg: 'rgba(244,63,94,0.20)',   text: '#F43F5E', border: '#F43F5E' },
    ACTIVE:    { bg: 'rgba(32,212,191,0.15)',  text: '#20D4BF', border: '#20D4BF' },
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>

      {/* ── Left column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Accent Color */}
        <section className="panel" style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>
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
                  outline: theme.accentColor === color ? `3px solid ${color}` : '3px solid transparent',
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

        {/* Background Colors */}
        <section className="panel" style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 20 }}>
            Background Colors
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {([
              ['bgBase',     'BASE'],
              ['bgSurface',  'SURFACE'],
              ['bgElevated', 'ELEVATED'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="form-label" style={{ marginBottom: 8 }}>{label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={theme[key]}
                    onChange={(e) => update(key, e.target.value)}
                    style={{
                      width: 36,
                      height: 36,
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                      background: theme[key],
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0,
                    }}
                  />
                  <input
                    className="form-input mono"
                    style={{ fontSize: 13 }}
                    value={theme[key]}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="panel" style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 20 }}>
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
                  ["'Inter', system-ui, sans-serif",  'Inter'],
                  ["'IBM Plex Sans', sans-serif",     'IBM Plex Sans'],
                  ["'Roboto', sans-serif",             'Roboto'],
                  ["system-ui, sans-serif",            'System UI'],
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
                  ["'JetBrains Mono', monospace", 'JetBrains Mono'],
                  ["'IBM Plex Mono', monospace",  'IBM Plex Mono'],
                  ["'Fira Code', monospace",       'Fira Code'],
                  ["'Courier New', monospace",     'Courier New'],
                ].map(([v, l]) => (
                  <option key={v} value={v} style={{ background: 'var(--color-bg-elevated)' }}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Border Radius */}
        <section className="panel" style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 20 }}>
            Border Radius
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {(['compact', 'default', 'rounded'] as RadiusMode[]).map((mode) => {
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
                    background: active ? 'rgba(244,166,35,0.10)' : 'transparent',
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
          <button className="button-primary" onClick={save} style={{ height: 40, padding: '0 20px', fontSize: 14 }}>
            Save Appearance
          </button>
          <button className="button-ghost" onClick={reset} style={{ height: 40, padding: '0 14px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw style={{ width: 15, height: 15 }} />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* ── Right column — Live Preview ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 0 }}>
          Live Preview
        </p>

        {/* Today's Sales card */}
        <div className="panel" style={{ padding: '16px 20px' }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>TODAY'S SALES</p>
          <p className="mono" style={{ fontSize: 28, fontWeight: 700, color: theme.accentColor, marginBottom: 6 }}>
            Rs.&nbsp;2,847,500
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-teal)' }}>▲ 12% vs yesterday</p>
        </div>

        {/* Button Variants card */}
        <div className="panel" style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 14 }}>
            Button Variants
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={{
              height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600,
              background: theme.accentColor, color: '#00182A',
              border: 'none', borderRadius: RADIUS_VALUES[theme.borderRadius], cursor: 'default',
            }}>Primary</button>
            <button style={{
              height: 36, padding: '0 16px', fontSize: 13,
              background: 'transparent', color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)', borderRadius: RADIUS_VALUES[theme.borderRadius], cursor: 'default',
            }}>Secondary</button>
            <button style={{
              height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600,
              background: '#F43F5E', color: '#fff',
              border: 'none', borderRadius: RADIUS_VALUES[theme.borderRadius], cursor: 'default',
            }}>Delete</button>
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
              boxShadow: `0 0 0 3px ${theme.accentColor}28`,
            }}
          />
        </div>

        {/* Status Badges card */}
        <div className="panel" style={{ padding: '16px 20px' }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>STATUS BADGES</p>
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

/* ── Company tab ──────────────────────────────────────────────── */

function CompanyTab() {
  const [saved, setSaved] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
    toast.success('Company settings saved.')
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 24 }}>

      <section className="panel" style={{ padding: '20px 24px' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 20 }}>
          Company Identity
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="form-label">COMPANY NAME</label>
            <input className="form-input" defaultValue="CBL Foods International (Pvt) Ltd" />
          </div>
          <div>
            <label className="form-label">REGISTRATION NO.</label>
            <input className="form-input" defaultValue="PV 00012345" />
          </div>
          <div>
            <label className="form-label">VAT NUMBER</label>
            <input className="form-input" defaultValue="VAT-123456789" />
          </div>
          <div>
            <label className="form-label">TAX ID</label>
            <input className="form-input" defaultValue="TIN-987654321" />
          </div>
        </div>
      </section>

      <section className="panel" style={{ padding: '20px 24px' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 20 }}>
          Contact &amp; Address
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="form-label">PHONE</label>
            <input className="form-input" defaultValue="+94 11 234 5678" />
          </div>
          <div>
            <label className="form-label">EMAIL</label>
            <input className="form-input" type="email" defaultValue="info@cblfoods.lk" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">ADDRESS</label>
            <input className="form-input" defaultValue="117, Sir Chittampalam A. Gardiner Mawatha, Colombo 02, Sri Lanka" />
          </div>
          <div>
            <label className="form-label">CITY</label>
            <input className="form-input" defaultValue="Colombo" />
          </div>
          <div>
            <label className="form-label">COUNTRY</label>
            <input className="form-input" defaultValue="Sri Lanka" />
          </div>
        </div>
      </section>

      <section className="panel" style={{ padding: '20px 24px' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 20 }}>
          Financial Defaults
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div>
            <label className="form-label">BASE CURRENCY</label>
            <select className="form-input" defaultValue="LKR" style={{ cursor: 'pointer' }}>
              <option value="LKR" style={{ background: 'var(--color-bg-elevated)' }}>LKR — Sri Lankan Rupee</option>
              <option value="USD" style={{ background: 'var(--color-bg-elevated)' }}>USD — US Dollar</option>
              <option value="EUR" style={{ background: 'var(--color-bg-elevated)' }}>EUR — Euro</option>
            </select>
          </div>
          <div>
            <label className="form-label">FISCAL YEAR START</label>
            <select className="form-input" defaultValue="01" style={{ cursor: 'pointer' }}>
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                <option key={m} value={String(i + 1).padStart(2, '0')} style={{ background: 'var(--color-bg-elevated)' }}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">DATE FORMAT</label>
            <select className="form-input" defaultValue="DD/MM/YYYY" style={{ cursor: 'pointer' }}>
              {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map(f => (
                <option key={f} value={f} style={{ background: 'var(--color-bg-elevated)' }}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="submit" className="button-primary" style={{ height: 40, padding: '0 20px' }}>
          {saved && <CheckCircle style={{ width: 15, height: 15 }} />}
          Save Company Settings
        </button>
        <button type="button" className="button-ghost" onClick={() => toast.info('No changes to revert.')} style={{ height: 40 }}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ── Outer tab pill style ─────────────────────────────────────── */

/* outerTabBase removed — outer tabs now use underline style */

/* ── Page ─────────────────────────────────────────────────────── */

export default function SettingsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
          Settings
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
          Manage company profile, application configuration, and appearance
        </p>
      </div>

      {/* Outer tabs: Company | Application */}
      <Tabs.Root defaultValue="application">

        {/* Outer underline tab bar */}
        <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 28 }}>
          <Tabs.List style={{ display: 'flex', gap: 0 }} aria-label="Settings category">
            {[
              ['company',     'Company'],
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

        {/* Company content */}
        <Tabs.Content value="company">
          <CompanyTab />
        </Tabs.Content>

        {/* Application content → inner tabs */}
        <Tabs.Content value="application">
          <Tabs.Root defaultValue="appearance">

            {/* Inner underline tab bar */}
            <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 28 }}>
              <Tabs.List style={{ display: 'flex', gap: 0 }} aria-label="Application settings sections">
                {[
                  ['appearance',    'Appearance'],
                  ['api',           'API Configuration'],
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
