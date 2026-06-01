import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)
dayjs.extend(timezone)
const DEFAULT_TIMEZONE = 'Asia/Colombo'
dayjs.tz.setDefault(DEFAULT_TIMEZONE)
function toColomboTime(date) {
  return dayjs(date).tz(DEFAULT_TIMEZONE)
}
export function formatDate(date) {
  return toColomboTime(date).format('DD MMM YYYY')
}
export function formatDateTime(date) {
  return toColomboTime(date).format('DD MMM YYYY, HH:mm')
}
export function formatTime(date) {
  return toColomboTime(date).format('HH:mm:ss')
}
export function isOverdue(dueDate) {
  return toColomboTime(dueDate).endOf('day').isBefore(dayjs().tz(DEFAULT_TIMEZONE))
}
export function daysOverdue(dueDate) {
  if (!isOverdue(dueDate)) {
    return 0
  }
  return dayjs()
    .tz(DEFAULT_TIMEZONE)
    .startOf('day')
    .diff(toColomboTime(dueDate).startOf('day'), 'day')
}
