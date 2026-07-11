import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const SRI_LANKA_TZ = 'Asia/Colombo'

function toColomboTime(date) {
  if (!date) {
    return null
  }

  return dayjs.utc(date).tz(SRI_LANKA_TZ)
}

export function formatDate(date) {
  return toColomboTime(date)?.format('DD MMM YYYY') || '—'
}

export function formatDateTime(date) {
  return toColomboTime(date)?.format('DD MMM YYYY, hh:mm A') || '—'
}

export function formatShortDateTime(date) {
  return toColomboTime(date)?.format('DD/MM/YYYY HH:mm') || '—'
}

export function formatTime(date) {
  return toColomboTime(date)?.format('hh:mm A') || '—'
}

export function formatMonthYear(date) {
  return toColomboTime(date)?.format('MMM YYYY') || '—'
}

export function isOverdue(dueDate) {
  const colomboDueDate = toColomboTime(dueDate)
  if (!colomboDueDate) {
    return false
  }

  return colomboDueDate.endOf('day').isBefore(dayjs().tz(SRI_LANKA_TZ))
}

export function daysOverdue(dueDate) {
  if (!isOverdue(dueDate)) {
    return 0
  }

  return dayjs()
    .tz(SRI_LANKA_TZ)
    .startOf('day')
    .diff(toColomboTime(dueDate).startOf('day'), 'day')
}
