import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

const DEFAULT_TIMEZONE = 'Asia/Colombo'

dayjs.tz.setDefault(DEFAULT_TIMEZONE)

function toColomboTime(date: string | Date) {
  return dayjs(date).tz(DEFAULT_TIMEZONE)
}

export function formatDate(date: string | Date): string {
  return toColomboTime(date).format('DD MMM YYYY')
}

export function formatDateTime(date: string | Date): string {
  return toColomboTime(date).format('DD MMM YYYY, HH:mm')
}

export function formatTime(date: string | Date): string {
  return toColomboTime(date).format('HH:mm:ss')
}

export function isOverdue(dueDate: string | Date): boolean {
  return toColomboTime(dueDate).endOf('day').isBefore(dayjs().tz(DEFAULT_TIMEZONE))
}

export function daysOverdue(dueDate: string | Date): number {
  if (!isOverdue(dueDate)) {
    return 0
  }

  return dayjs()
    .tz(DEFAULT_TIMEZONE)
    .startOf('day')
    .diff(toColomboTime(dueDate).startOf('day'), 'day')
}
