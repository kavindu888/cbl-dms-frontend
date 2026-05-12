import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

type ModalProps = {
  title: string
  description?: string
  trigger?: ReactNode
  children: ReactNode
  footer?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function Modal({
  title,
  description,
  trigger,
  children,
  footer,
  open,
  onOpenChange,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="panel fixed left-1/2 top-1/2 z-50 w-[min(92vw,640px)] -translate-x-1/2 -translate-y-1/2 p-6 shadow-[var(--shadow-modal)]">
          <div className="space-y-2">
            <Dialog.Title className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="text-sm text-[var(--color-text-muted)]">
                {description}
              </Dialog.Description>
            ) : null}
          </div>
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
