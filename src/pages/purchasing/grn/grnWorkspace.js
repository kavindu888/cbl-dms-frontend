import dayjs from 'dayjs'

export function createReceiptLine(poLine, grnLine = null) {
  const source = grnLine || poLine
  return {
    key: crypto.randomUUID(),
    grnLineId: grnLine?.id || '',
    purchaseOrderLineId: grnLine ? grnLine.purchaseOrderLineId : poLine.id,
    productId: source.productId,
    productSku: source.productSku,
    productName: source.productName,
    baseUomCode: source.baseUomCode,
    smallestUomCode: source.smallestUomCode,
    qtyPerBaseUnit:
      Number(source.qtyBaseUnit) > 0
        ? Number(source.qtySmallestUnit) / Number(source.qtyBaseUnit)
        : 1,
    orderedQty: poLine?.qtyBaseUnit ?? null,
    receivedQty: poLine?.receivedQty ?? null,
    remainingQty: poLine?.remainingQty ?? null,
    qtyBaseUnit: grnLine?.qtyBaseUnit ?? poLine?.remainingQty ?? '',
    unitCostSmallest: grnLine?.unitCostSmallest ?? poLine?.unitCostSmallest ?? 0,
    mrp: grnLine?.mrp ?? poLine?.mrp ?? poLine?.unitCostSmallest ?? 0,
    expiryDate: grnLine?.expiryDate ? dayjs(grnLine.expiryDate).format('YYYY-MM-DD') : '',
    batchNo: grnLine?.batchNo ?? null,
    rejectedQtyBase: grnLine?.rejectedQtyBase ?? 0,
    rejectionReason: grnLine?.rejectionReason ?? null,
    notes: grnLine?.notes ?? poLine?.notes ?? '',
  }
}

export function loadReceiptLines(order, draft) {
  if (!draft) return (order.lines || []).map((line) => createReceiptLine(line))
  return (draft.lines || []).map((line) =>
    createReceiptLine(
      order.lines?.find((poLine) => poLine.id === line.purchaseOrderLineId),
      line
    )
  )
}

// Recover server IDs after a response was lost, without bringing omitted rows back.
export function reconcileReceiptLines(lines, receipt, removedIds = []) {
  const excluded = new Set([...removedIds, ...lines.map((line) => line.grnLineId).filter(Boolean)])
  return lines.map((line) => {
    if (line.grnLineId) {
      return receipt.lines.some((saved) => saved.id === line.grnLineId)
        ? line
        : { ...line, grnLineId: '' }
    }
    const saved = receipt.lines.find(
      (candidate) =>
        !excluded.has(candidate.id) &&
        candidate.productId === line.productId &&
        (candidate.purchaseOrderLineId || null) === (line.purchaseOrderLineId || null)
    )
    if (!saved) return line
    excluded.add(saved.id)
    return { ...line, grnLineId: saved.id }
  })
}

export async function saveReceiptLines({
  receipt,
  lines,
  removedIds,
  service,
  payloadFor,
  onProgress,
}) {
  let current = receipt
  let rows = reconcileReceiptLines(lines, current, removedIds)
  onProgress(current, rows)
  const deletes = new Set([
    ...removedIds,
    ...rows
      .filter((line) => line.grnLineId && Number(line.qtyBaseUnit) <= 0)
      .map((line) => line.grnLineId),
  ])
  for (const id of deletes) {
    if (current.lines.some((line) => line.id === id)) {
      current = await service.removeGoodsReceiptLine(current.id, id)
      rows = rows.map((line) => (line.grnLineId === id ? { ...line, grnLineId: '' } : line))
      onProgress(current, rows)
    }
  }
  for (const row of rows.filter((line) => Number(line.qtyBaseUnit) > 0)) {
    const previousIds = new Set(current.lines.map((line) => line.id))
    current = row.grnLineId
      ? await service.updateGoodsReceiptLine(current.id, row.grnLineId, payloadFor(row))
      : await service.addGoodsReceiptLine(current.id, payloadFor(row))
    if (!row.grnLineId) {
      const added = current.lines.find((line) => !previousIds.has(line.id))
      if (!added) throw new Error('Unable to identify the saved GRN item. Please retry.')
      rows = rows.map((line) => (line.key === row.key ? { ...line, grnLineId: added.id } : line))
    }
    onProgress(current, rows)
  }
  return current
}
