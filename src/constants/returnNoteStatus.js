export const RETURN_NOTE_STATUS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

export const RETURN_NOTE_STATUS_VALUE = {
  Draft: 1,
  Submitted: 2,
  Approved: 3,
  Rejected: 4,
  Completed: 5,
  Cancelled: 6,
}

export function returnNoteStatusLabel(status) {
  if (typeof status === 'string' && Number.isNaN(Number(status))) return status
  const value = Number(status)
  return (
    Object.entries(RETURN_NOTE_STATUS_VALUE).find(([, itemValue]) => itemValue === value)?.[0] ||
    'Unknown'
  )
  // branch: returnNoteStatusLabel
}
