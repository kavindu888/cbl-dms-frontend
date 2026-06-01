const currencyFormatter = new Intl.NumberFormat('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
export function formatLKR(amount) {
  return `Rs. ${currencyFormatter.format(amount)}`
}
export function formatLKRShort(amount) {
  const absoluteAmount = Math.abs(amount)
  if (absoluteAmount >= 1000000000) {
    return `Rs. ${(amount / 1000000000).toFixed(1).replace(/\.0$/, '')}B`
  }
  if (absoluteAmount >= 1000000) {
    return `Rs. ${(amount / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (absoluteAmount >= 1000) {
    return `Rs. ${(amount / 1000).toFixed(1).replace(/\.0$/, '')}K`
  }
  return formatLKR(amount)
}
