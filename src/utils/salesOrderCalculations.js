export function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function getReturnDiscountPercent(line) {
  if (!line) return 0
  return toNumber(
    line.discountPercent ??
    line.returnDiscountPercent ??
    line.totalDiscountPercent ??
    line.skuDiscountPercent ??
    0
  )
}

export function getReturnCreditAmount(line) {
  if (!line) return 0
  const quantity = Math.abs(toNumber(line.quantity))
  const mrp = toNumber(line.mrp ?? line.unitPrice ?? 0)
  const discountPercent = getReturnDiscountPercent(line)

  const calculatedCredit = mrp * quantity * (1 - discountPercent / 100)

  const backendCredit =
    line.creditAmount ??
    line.returnCreditAmount ??
    null

  return backendCredit !== null && backendCredit !== undefined
    ? toNumber(backendCredit)
    : calculatedCredit
}

export function calculateSalesOrderSummary(order) {
  if (!order) {
    return {
      gross: 0,
      skuDiscount: 0,
      specialDiscount: 0,
      returnAmount: 0,
      vat: 0,
      net: 0,
    }
  }

  const allLines = order.lines || []
  const saleLines = allLines.filter((line) => !line.isReturnLine)
  const returnLines = allLines.filter((line) => line.isReturnLine)

  const calculated = saleLines.reduce(
    (sum, line) => {
      const quantity = Math.abs(toNumber(line.quantity))
      const mrp = toNumber(line.mrp ?? line.unitPrice ?? 0)

      const gross =
        line.grossAmount !== null && line.grossAmount !== undefined
          ? toNumber(line.grossAmount)
          : mrp * quantity

      const categoryDiscount =
        line.categoryDiscountAmount !== null && line.categoryDiscountAmount !== undefined
          ? toNumber(line.categoryDiscountAmount)
          : gross * (toNumber(line.categoryDiscountPercent || 0) / 100)

      const skuDiscount =
        line.skuDiscountAmount !== null && line.skuDiscountAmount !== undefined
          ? toNumber(line.skuDiscountAmount)
          : gross * (toNumber(line.skuDiscountPercent || 0) / 100)

      const specialDiscount =
        line.specialDiscountAmount !== null && line.specialDiscountAmount !== undefined
          ? toNumber(line.specialDiscountAmount)
          : gross * (toNumber(line.specialDiscountPercent || 0) / 100)

      return {
        gross: sum.gross + gross,
        categoryDiscount: sum.categoryDiscount + categoryDiscount,
        skuDiscount: sum.skuDiscount + skuDiscount,
        specialDiscount: sum.specialDiscount + specialDiscount,
      }
    },
    {
      gross: 0,
      categoryDiscount: 0,
      skuDiscount: 0,
      specialDiscount: 0,
    }
  )

  const returnAmount = returnLines.reduce(
    (sum, line) => sum + getReturnCreditAmount(line),
    0
  )

  const gross =
    order.grossAmount !== null && order.grossAmount !== undefined
      ? toNumber(order.grossAmount)
      : calculated.gross

  const skuDiscount =
    toNumber(order.totalSkuDiscountAmount) > 0
      ? toNumber(order.totalSkuDiscountAmount)
      : calculated.skuDiscount

  const specialDiscount =
    toNumber(order.totalSpecialDiscountAmount) > 0
      ? toNumber(order.totalSpecialDiscountAmount)
      : calculated.specialDiscount

  const vat = toNumber(order.vatAmount || 0)

  const calculatedNet =
    gross - calculated.categoryDiscount - skuDiscount - specialDiscount - returnAmount + vat

  const net =
    order.netAmount !== null && order.netAmount !== undefined
      ? toNumber(order.netAmount)
      : calculatedNet

  return {
    gross,
    skuDiscount,
    specialDiscount,
    returnAmount,
    vat,
    net,
  }
}
