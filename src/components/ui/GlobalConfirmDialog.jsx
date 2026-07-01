import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, AlertCircle, HelpCircle, X } from 'lucide-react'
import { useConfirmStore } from '@/stores/confirmStore'

const toneStyles = {
  danger: {
    icon: AlertCircle,
    iconColor: 'var(--color-danger)',
    iconBg: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
    border: 'color-mix(in srgb, var(--color-danger) 26%, var(--color-border))',
    buttonClass: 'button-danger',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: '#facc15',
    iconBg: 'color-mix(in srgb, #facc15 14%, transparent)',
    border: 'color-mix(in srgb, #facc15 28%, var(--color-border))',
    buttonClass: 'button-primary',
  },
  info: {
    icon: HelpCircle,
    iconColor: 'var(--color-amber)',
    iconBg: 'color-mix(in srgb, var(--color-amber) 12%, transparent)',
    border: 'color-mix(in srgb, var(--color-amber) 26%, var(--color-border))',
    buttonClass: 'button-primary',
  }
}

export default function GlobalConfirmDialog() {
  const { isOpen, message, options, onConfirm, onCancel } = useConfirmStore()

  if (!isOpen) return null

  // Auto-detect tone based on message if not explicitly provided
  let tone = options.tone
  if (!tone) {
    const msgLower = message.toLowerCase()
    if (msgLower.includes('deactivate')) {
      tone = 'warning'
    } else if (msgLower.includes('remove') || msgLower.includes('delete') || msgLower.includes('permanently')) {
      tone = 'danger'
    } else {
      tone = 'info'
    }
  }

  const styles = toneStyles[tone] || toneStyles.info
  const Icon = styles.icon

  const title = options.title || (tone === 'danger' ? 'Confirm Deletion' : tone === 'warning' ? 'Confirm Deactivation' : 'Confirm Action')
  const confirmLabel = options.confirmLabel || (tone === 'danger' ? 'Remove' : tone === 'warning' ? 'Deactivate' : 'Confirm')
  const cancelLabel = options.cancelLabel || 'Cancel'

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
          style={{ animation: 'fadeIn 120ms ease-out' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(94vw,440px)] -translate-x-1/2 -translate-y-1/2 shadow-[var(--shadow-modal)] focus:outline-none"
          style={{
            borderRadius: 12,
            border: `1px solid var(--color-border)`,
            background: 'var(--color-bg-elevated)',
            overflow: 'hidden',
            animation: 'scaleUp 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ padding: 20, display: 'flex', gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                flex: '0 0 auto',
                display: 'grid',
                placeItems: 'center',
                color: styles.iconColor,
                background: styles.iconBg,
                border: `1px solid ${styles.border}`,
              }}
            >
              <Icon size={22} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <Dialog.Title style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {title}
              </Dialog.Title>
              <Dialog.Description style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-muted)' }}>
                {message}
              </Dialog.Description>
            </div>

            <button
              type="button"
              className="icon-button"
              aria-label="Close"
              onClick={onCancel}
              style={{ width: 28, height: 28, flex: '0 0 auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-dim)' }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--color-border)',
              background: 'color-mix(in srgb, var(--color-bg-base) 45%, transparent)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            <button
              type="button"
              className="button-secondary"
              onClick={onCancel}
              style={{ height: 32, fontSize: 13 }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={styles.buttonClass}
              onClick={onConfirm}
              style={{ height: 32, fontSize: 13 }}
              autoFocus
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
