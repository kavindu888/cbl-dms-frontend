import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import { router } from './routes'
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
const STORAGE_KEY = 'cbl-theme'
function darkenHex(hex, amount = 24) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#F4A623'
  const value = normalized.slice(1)
  const channels = [0, 2, 4].map((start) => {
    const channel = parseInt(value.slice(start, start + 2), 16)
    return Math.max(0, channel - amount).toString(16).padStart(2, '0')
  })
  return `#${channels.join('')}`
}
function applyStoredTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return 'dark'
    }
    const parsed = JSON.parse(raw)
    const mode = parsed.mode === 'light' ? 'light' : 'dark'
    const presets = {
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
    }[mode]
    const root = document.documentElement
    root.style.setProperty('--color-bg-base', presets.bgBase)
    root.style.setProperty('--color-bg-surface', presets.bgSurface)
    root.style.setProperty('--color-bg-elevated', presets.bgElevated)
    root.style.setProperty('--color-border', presets.border)
    root.style.setProperty('--color-text-primary', presets.textPrimary)
    root.style.setProperty('--color-text-muted', presets.textMuted)
    root.style.setProperty('--color-text-dim', presets.textDim)
    const accentColor = parsed.accentColor ?? presets.accentColor
    root.style.setProperty('--color-amber', accentColor)
    root.style.setProperty('--color-amber-dark', darkenHex(accentColor))
    if (parsed.fontSans) {
      root.style.setProperty('--font-sans', parsed.fontSans)
    }
    if (parsed.fontMono) {
      root.style.setProperty('--font-mono', parsed.fontMono)
    }
    root.style.colorScheme = mode
    document.body.style.colorScheme = mode
    const radius = parsed.borderRadius ?? 'default'
    const radiusValue = radius === 'compact' ? '4px' : radius === 'rounded' ? '14px' : '8px'
    root.style.setProperty('--radius-card', radiusValue)
    root.style.setProperty('--radius-md', radiusValue)
    root.style.setProperty(
      '--radius-button',
      radius === 'compact' ? '4px' : radius === 'rounded' ? '10px' : '6px'
    )
  } catch {
    // Ignore malformed theme settings and keep the default shell styles.
  }
  return 'dark'
}
const initialThemeMode = applyStoredTheme()
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <>
        <RouterProvider router={router} />
        <Toaster position="top-right" theme={initialThemeMode} richColors />
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </>
    </QueryClientProvider>
  </StrictMode>
)
