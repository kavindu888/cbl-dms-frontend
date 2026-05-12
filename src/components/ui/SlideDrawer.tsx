import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

type SlideDrawerProps = {
  title: string
  description?: string
  trigger?: ReactNode
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function SlideDrawer({
  title,
  description,
  trigger,
  children,
  open,
  onOpenChange,
}: SlideDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="panel fixed right-0 top-0 z-50 h-screen w-[min(92vw,520px)] p-6 shadow-[var(--shadow-drawer)]">
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
          <div className="mt-6 h-[calc(100%-72px)] overflow-y-auto pr-1">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
