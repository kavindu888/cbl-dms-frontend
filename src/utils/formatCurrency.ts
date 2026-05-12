const currencyFormatter = new Intl.NumberFormat('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatLKR(amount: number): string {
  return `Rs. ${currencyFormatter.format(amount)}`
}

export function formatLKRShort(amount: number): string {
  const absoluteAmount = Math.abs(amount)

  if (absoluteAmount >= 1_000_000_000) {
    return `Rs. ${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  }

  if (absoluteAmount >= 1_000_000) {
    return `Rs. ${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }

  if (absoluteAmount >= 1_000) {
    return `Rs. ${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  }

  return formatLKR(amount)
}
