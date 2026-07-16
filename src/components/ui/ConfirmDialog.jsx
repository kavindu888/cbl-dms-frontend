import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

const toneStyles = {
  danger: {
    iconColor: 'var(--color-danger)',
    iconBg: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
    border: 'color-mix(in srgb, var(--color-danger) 26%, var(--color-border))',
    buttonClass: 'button-danger',
  },
  warning: {
    iconColor: 'var(--color-amber)',
    iconBg: 'color-mix(in srgb, var(--color-amber) 14%, transparent)',
    border: 'color-mix(in srgb, var(--color-amber) 28%, var(--color-border))',
    buttonClass: 'button-danger',
  },
}

export default function ConfirmDialog({
  title,
  description,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Keep Editing',
  loadingLabel = 'Working...',
  tone = 'danger',
  icon: Icon = AlertTriangle,
  onConfirm,
  trigger,
}) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const styles = toneStyles[tone] || toneStyles.danger

  async function handleConfirm() {
    setIsSubmitting(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
          style={{ animation: 'fadeIn 120ms ease-out' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(94vw,500px)] -translate-x-1/2 -translate-y-1/2 shadow-[var(--shadow-modal)]"
          style={{
            borderRadius: 12,
            border: `1px solid ${styles.border}`,
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated) 96%, white 4%), var(--color-bg-elevated))',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 18, display: 'flex', gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                flex: '0 0 auto',
                display: 'grid',
                placeItems: 'center',
                color: styles.iconColor,
                background: styles.iconBg,
                border: `1px solid ${styles.border}`,
              }}
            >
              <Icon size={21} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <Dialog.Title
                style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}
              >
                {title}
              </Dialog.Title>
              <Dialog.Description
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'var(--color-text-muted)',
                }}
              >
                {description}
              </Dialog.Description>
              {details ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'color-mix(in srgb, var(--color-bg-base) 64%, transparent)',
                    color: 'var(--color-text-primary)',
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {details}
                </div>
              ) : null}
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="icon-button"
                aria-label="Close confirmation"
                disabled={isSubmitting}
                style={{ width: 32, height: 32, flex: '0 0 auto' }}
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div
            style={{
              padding: '14px 18px',
              borderTop: '1px solid var(--color-border)',
              background: 'color-mix(in srgb, var(--color-bg-base) 45%, transparent)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <Dialog.Close asChild>
              <button type="button" className="button-secondary" disabled={isSubmitting}>
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              className={styles.buttonClass}
              disabled={isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting ? loadingLabel : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
