import * as Tabs from '@radix-ui/react-tabs'
import { CheckCircle, RefreshCw, XCircle, Pencil, Plus, Search, Trash } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'

/* ── Theme token defaults ─────────────────────────────────────── */

type ThemeMode = 'dark' | 'light'

type ThemeSettings = {
  mode: ThemeMode
  accentColor: string
  fontSans: string
  fontMono: string
  borderRadius: RadiusMode
}

const DEFAULTS: ThemeSettings = {
  mode: 'dark',
  accentColor: '#F4A623',
  fontSans: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  borderRadius: 'default',
}

const ACCENT_PRESETS = [
  { label: 'Amber', color: '#F4A623' },
  { label: 'Teal', color: '#20D4BF' },
  { label: 'Blue', color: '#3B82F6' },
  { label: 'Purple', color: '#A78BFA' },
  { label: 'Red', color: '#F43F5E' },
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

const THEME_PRESETS: Record<
  ThemeMode,
  {
    bgBase: string
    bgSurface: string
    bgElevated: string
    border: string
    textPrimary: string
    textMuted: string
    textDim: string
    accentColor: string
    accentDark: string
  }
> = {
  dark: {
    bgBase: '#00182A',
    bgSurface: '#132337',
    bgElevated: '#1B3050',
    border: '#25314A',
    textPrimary: '#F8FAFC',
    textMuted: '#93A3BB',
    textDim: '#5B6C86',
    accentColor: '#F4A623',
    accentDark: '#C47D0E',
  },
  light: {
    bgBase: '#F7FAFF',
    bgSurface: '#FFFFFF',
    bgElevated: '#EAF2FF',
    border: '#C9D8F0',
    textPrimary: '#0F172A',
    textMuted: '#4B5568',
    textDim: '#6B7A90',
    accentColor: '#2563EB',
    accentDark: '#1D4ED8',
  },
}

function loadTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<ThemeSettings>
    const validModes: RadiusMode[] = ['compact', 'default', 'rounded']
    return {
      ...DEFAULTS,
      ...parsed,
      mode: parsed.mode === 'light' ? 'light' : 'dark',
      borderRadius: validModes.includes(parsed.borderRadius as RadiusMode)
        ? (parsed.borderRadius as RadiusMode)
        : DEFAULTS.borderRadius,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function applyTheme(theme: ThemeSettings) {
  const root = document.documentElement
  const preset = THEME_PRESETS[theme.mode]

  root.style.setProperty('--color-bg-base', preset.bgBase)
  root.style.setProperty('--color-bg-surface', preset.bgSurface)
  root.style.setProperty('--color-bg-elevated', preset.bgElevated)
  root.style.setProperty('--color-border', preset.border)
  root.style.setProperty('--color-text-primary', preset.textPrimary)
  root.style.setProperty('--color-text-muted', preset.textMuted)
  root.style.setProperty('--color-text-dim', preset.textDim)
  root.style.setProperty('--color-amber', theme.accentColor)
  root.style.setProperty('--color-amber-dark', preset.accentDark)
  root.style.setProperty('--font-sans',         theme.fontSans)
  root.style.setProperty('--font-mono',         theme.fontMono)
  root.style.colorScheme = theme.mode
  document.body.style.colorScheme = theme.mode
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

  function update<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) {
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

  const themePreset = THEME_PRESETS[theme.mode]

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

        {/* Theme Mode */}
        <section className="panel" style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 10 }}>
            Theme Mode
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 18 }}>
            Choose the overall app appearance for the dashboard shell and pages.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
            {([
              ['dark', 'Dark', 'Deep navy workspace with bright contrast.'],
              ['light', 'Light', 'Clean bright workspace with soft surfaces.'],
            ] as const).map(([value, label, desc]) => {
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
                    background: active ? 'rgba(244,166,35,0.08)' : 'var(--color-bg-elevated)',
                    boxShadow: active ? '0 0 0 3px rgba(244,166,35,0.12)' : 'none',
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
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
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
          <p className="mono" style={{ fontSize: 28, fontWeight: 700, color: themePreset.accentColor, marginBottom: 6 }}>
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
              background: themePreset.accentColor, color: '#00182A',
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
              borderColor: themePreset.accentColor,
              boxShadow: `0 0 0 3px ${themePreset.accentColor}28`,
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
    <form onSubmit={handleSave} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
        
        {/* Left Side: Company Identity & Financial Defaults */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <section className="panel" style={{ padding: '20px 24px', flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>
              Company Identity
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">NAME</label>
                <input className="form-input" defaultValue="CBL Foods International (Pvt) Ltd" />
              </div>
              <div>
                <label className="form-label">LEGAL NAME</label>
                <input className="form-input" defaultValue="CBL Foods International (Pvt) Ltd" />
              </div>
              <div>
                <label className="form-label">TAX ID</label>
                <input className="form-input" defaultValue="VAT987654321" />
              </div>
              <div>
                <label className="form-label">REGISTRATION NO.</label>
                <input className="form-input" defaultValue="PV 00012345" />
              </div>
            </div>
          </section>

          <section className="panel" style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>
              Financial Defaults
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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

        </div>

        {/* Right Side: Contact & Address */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <section className="panel" style={{ padding: '20px 24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>
              Contact &amp; Address
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
              <div>
                <label className="form-label">PHONE NO</label>
                <input className="form-input" defaultValue="+94 11 234 5678" />
              </div>
              <div>
                <label className="form-label">EMAIL</label>
                <input className="form-input" type="email" defaultValue="info@cblfoods.lk" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">ADDRESS LINE 1</label>
                <input className="form-input" defaultValue="117, Sir Chittampalam A. Gardiner Mawatha" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">ADDRESS LINE 2</label>
                <input className="form-input" defaultValue="Colombo 02, Sri Lanka" />
              </div>
              <div>
                <label className="form-label">CITY</label>
                <input className="form-input" defaultValue="Colombo" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                <input type="checkbox" id="companyIsActive" defaultChecked style={{ width: 16, height: 16, accentColor: 'var(--color-amber)' }} />
                <label htmlFor="companyIsActive" style={{ fontSize: 13, color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                  IsActive
                </label>
              </div>
            </div>
          </section>
        </div>

      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
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

/* ── Territories tab ─────────────────────────────────────────── */

type Territory = {
  id: string
  code: string
  name: string
  isActive: boolean
}

const initialTerritories: Territory[] = [
  { id: 'ter-001', code: 'NWP', name: 'North Western Province', isActive: true },
  { id: 'ter-002', code: 'CP', name: 'Central Province', isActive: true },
  { id: 'ter-003', code: 'WP', name: 'Western Province', isActive: true },
  { id: 'ter-004', code: 'SP', name: 'Southern Province', isActive: true },
  { id: 'ter-005', code: 'NP', name: 'Northern Province', isActive: false },
]

function TerritoriesTab() {
  const [territories, setTerritories] = useState<Territory[]>(initialTerritories)
  const [search, setSearch] = useState('')
  const [editingItem, setEditingItem] = useState<Territory | null>(null)

  // Form Fields State
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)

  const filtered = territories.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase())
  )

  function openEdit(t: Territory) {
    setEditingItem(t)
    setCode(t.code)
    setName(t.name)
    setIsActive(t.isActive)
  }

  function resetForm() {
    setEditingItem(null)
    setCode('')
    setName('')
    setIsActive(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!code || !name) {
      toast.error('Code and Name are required.')
      return
    }

    if (editingItem) {
      setTerritories(
        territories.map((t) =>
          t.id === editingItem.id ? { ...t, code, name, isActive } : t
        )
      )
      toast.success('Territory updated successfully.')
    } else {
      const newItem: Territory = {
        id: `ter-${Date.now()}`,
        code,
        name,
        isActive,
      }
      setTerritories([newItem, ...territories])
      toast.success('Territory added successfully.')
    }
    resetForm()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'stretch' }}>
      {/* List Panel */}
      <div className="panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>Territories</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-text-dim)' }} />
          <input
            className="form-input"
            placeholder="Search territories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', height: 36, paddingLeft: 36, background: 'rgba(0,0,0,0.15)', fontSize: 13 }}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto" style={{ marginTop: 4 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td><span className="mono text-xs font-semibold" style={{ color: 'var(--color-amber)' }}>{t.code}</span></td>
                  <td className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{t.name}</td>
                  <td>
                    <StatusBadge status={t.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-button" style={{ width: 26, height: 26 }} onClick={() => openEdit(t)}>
                      <Pencil style={{ width: 12, height: 12 }} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-dim)', padding: '24px 0' }}>
                    No territories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Form (Sidebar style on the right) */}
      <form onSubmit={handleSave} className="panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {editingItem ? 'Edit Territory' : 'Add New Territory'}
          </p>
          {editingItem && (
            <button type="button" className="button-ghost" onClick={resetForm} style={{ padding: '4px 8px', height: 'auto', fontSize: 12 }}>
              Clear
            </button>
          )}
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>CODE</label>
          <input className="form-input" placeholder="e.g. NWP" value={code} onChange={(e) => setCode(e.target.value)} style={{ height: 38 }} />
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>NAME</label>
          <input className="form-input" placeholder="e.g. North Western Province" value={name} onChange={(e) => setName(e.target.value)} style={{ height: 38 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <input type="checkbox" id="isActiveTerritory" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--color-amber)' }} />
          <label htmlFor="isActiveTerritory" style={{ fontSize: 13, color: 'var(--color-text-primary)', cursor: 'pointer' }}>Active Territory</label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 16 }}>
          <button type="button" className="button-ghost" onClick={resetForm} style={{ flex: 1, height: 36, fontSize: 13 }}>Cancel</button>
          <button type="submit" className="button-primary" style={{ flex: 1, height: 36, fontSize: 13 }}>{editingItem ? 'Save Changes' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}

/* ── Business Units tab ──────────────────────────────────────── */

type BusinessUnit = {
  id: string
  code: string
  name: string
  type: string
  isActive: boolean
}

const initialBusinessUnits: BusinessUnit[] = [
  { id: 'bu-001', code: 'BU-MAIN', name: 'Main Operations', type: 'Distribution', isActive: true },
  { id: 'bu-002', code: 'BU-CONF', name: 'Confectionery Division', type: 'Manufacturing', isActive: true },
  { id: 'bu-003', code: 'BU-EXPT', name: 'International Export', type: 'Export', isActive: true },
  { id: 'bu-004', code: 'BU-RETL', name: 'Retail Sales Unit', type: 'Retail', isActive: true },
]

function BusinessUnitsTab() {
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>(initialBusinessUnits)
  const [search, setSearch] = useState('')
  const [editingItem, setEditingItem] = useState<BusinessUnit | null>(null)

  // Form Fields State
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [isActive, setIsActive] = useState(true)

  const filtered = businessUnits.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      b.type.toLowerCase().includes(search.toLowerCase())
  )

  function openEdit(b: BusinessUnit) {
    setEditingItem(b)
    setCode(b.code)
    setName(b.name)
    setType(b.type)
    setIsActive(b.isActive)
  }

  function resetForm() {
    setEditingItem(null)
    setCode('')
    setName('')
    setType('')
    setIsActive(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!code || !name) {
      toast.error('Code and Name are required.')
      return
    }

    if (editingItem) {
      setBusinessUnits(
        businessUnits.map((b) =>
          b.id === editingItem.id ? { ...b, code, name, type, isActive } : b
        )
      )
      toast.success('Business unit updated successfully.')
    } else {
      const newItem: BusinessUnit = {
        id: `bu-${Date.now()}`,
        code,
        name,
        type,
        isActive,
      }
      setBusinessUnits([newItem, ...businessUnits])
      toast.success('Business unit added successfully.')
    }
    resetForm()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'stretch' }}>
      {/* List Panel */}
      <div className="panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>Business Units</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-text-dim)' }} />
          <input
            className="form-input"
            placeholder="Search business units..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', height: 36, paddingLeft: 36, background: 'rgba(0,0,0,0.15)', fontSize: 13 }}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto" style={{ marginTop: 4 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td><span className="mono text-xs font-semibold" style={{ color: 'var(--color-amber)' }}>{b.code}</span></td>
                  <td className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{b.name}</td>
                  <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{b.type || '—'}</td>
                  <td>
                    <StatusBadge status={b.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-button" style={{ width: 26, height: 26 }} onClick={() => openEdit(b)}>
                      <Pencil style={{ width: 12, height: 12 }} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-dim)', padding: '24px 0' }}>
                    No business units found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Form (Sidebar style on the right) */}
      <form onSubmit={handleSave} className="panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {editingItem ? 'Edit Business Unit' : 'Add New Business Unit'}
          </p>
          {editingItem && (
            <button type="button" className="button-ghost" onClick={resetForm} style={{ padding: '4px 8px', height: 'auto', fontSize: 12 }}>
              Clear
            </button>
          )}
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>CODE</label>
          <input className="form-input" placeholder="e.g. BU-MAIN" value={code} onChange={(e) => setCode(e.target.value)} style={{ height: 38 }} />
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>NAME</label>
          <input className="form-input" placeholder="e.g. Main Operations" value={name} onChange={(e) => setName(e.target.value)} style={{ height: 38 }} />
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 10 }}>TYPE</label>
          <input className="form-input" placeholder="e.g. Distribution" value={type} onChange={(e) => setType(e.target.value)} style={{ height: 38 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <input type="checkbox" id="isActiveBU" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--color-amber)' }} />
          <label htmlFor="isActiveBU" style={{ fontSize: 13, color: 'var(--color-text-primary)', cursor: 'pointer' }}>Active Business Unit</label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 16 }}>
          <button type="button" className="button-ghost" onClick={resetForm} style={{ flex: 1, height: 36, fontSize: 13 }}>Cancel</button>
          <button type="submit" className="button-primary" style={{ flex: 1, height: 36, fontSize: 13 }}>{editingItem ? 'Save Changes' : 'Save'}</button>
        </div>
      </form>
    </div>
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
      <Tabs.Root defaultValue="company">

        {/* Outer underline tab bar */}
        <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 28 }}>
          <Tabs.List style={{ display: 'flex', gap: 0 }} aria-label="Settings category">
            {[
              ['company',       'Company'],
              ['territories',   'Territories'],
              ['businessUnits', 'Business Units'],
              ['application',   'Application'],
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

        {/* Territories content */}
        <Tabs.Content value="territories">
          <TerritoriesTab />
        </Tabs.Content>

        {/* Business Units content */}
        <Tabs.Content value="businessUnits">
          <BusinessUnitsTab />
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
