import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Modal from '@components/ui/Modal'

dayjs.extend(relativeTime)

const DRAFT_TYPE_LABELS = {
  VehicleLoading: 'Vehicle Loading',
  VehicleUnloading: 'Vehicle Unloading',
  Invoice: 'Invoice',
}

export default function ResumeDraftModal({ draft, onResume, onDiscard, onClose }) {
  if (!draft) return null

  const typeLabel = DRAFT_TYPE_LABELS[draft.draftType] || draft.draftType
  const relativeLabel = dayjs(draft.clientUpdatedAt).fromNow()

  return (
    <Modal
      open={Boolean(draft)}
      onOpenChange={(open) => {
        if (!open) onClose?.()
      }}
      title="Resume saved draft?"
      maxWidth="440px"
      footer={
        <>
          <button type="button" className="button-secondary" onClick={onDiscard}>
            Discard
          </button>
          <button type="button" className="button-primary" onClick={onResume}>
            Resume Draft
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.6 }}>
        You have a saved {typeLabel} draft
        {draft.label ? (
          <>
            {' '}
            (
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
              {draft.label}
            </span>
            )
          </>
        ) : null}{' '}
        from {relativeLabel}. Resume where you left off, or discard it and start fresh.
      </p>
    </Modal>
  )
}
