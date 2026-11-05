const moneyFormatter = new Intl.NumberFormat('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function money(value) {
  return Number(value || 0) === 0 ? '–' : moneyFormatter.format(Number(value))
}

export function compactMoney(value) {
  const amount = Number(value || 0)
  const absolute = Math.abs(amount)
  if (absolute >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`
  if (absolute >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (absolute >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return money(amount)
}

export function displayDate(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso || '')
    ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
    : ''
}

export function parseDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const [, day, month, year] = match
  const iso = `${year}-${month}-${day}`
  const date = new Date(`${iso}T00:00:00Z`)
  return date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) && date.getUTCDate() === Number(day)
    ? iso : null
}

export function mergeReportParams(previous, values) {
  const next = new URLSearchParams(previous)
  Object.entries(values).forEach(([key, value]) => {
    if (value == null || value === '') next.delete(key)
    else next.set(key, String(value))
  })
  return next
}
