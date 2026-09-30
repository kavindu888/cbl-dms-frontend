import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadReceiptLines, reconcileReceiptLines, saveReceiptLines } from './grnWorkspace.js'

const poLine = {
  id: 'po-line',
  productId: 'a',
  productSku: 'A',
  qtyBaseUnit: 10,
  qtySmallestUnit: 120,
  remainingQty: 8,
  receivedQty: 2,
  unitCostSmallest: 5,
  mrp: 10,
}
const additional = {
  id: 'extra',
  purchaseOrderLineId: null,
  productId: 'b',
  qtyBaseUnit: 2,
  qtySmallestUnit: 48,
  unitCostSmallest: 4,
  mrp: 8,
}

test('new receipt populates PO lines; reopening a draft never restores omitted PO items', () => {
  const order = { lines: [poLine] }
  assert.equal(loadReceiptLines(order, null)[0].qtyBaseUnit, 8)
  assert.deepEqual(loadReceiptLines(order, { lines: [] }), [])
  const rows = loadReceiptLines(order, { lines: [additional] })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].purchaseOrderLineId, null)
  assert.equal(rows[0].qtyPerBaseUnit, 24)
  assert.equal(rows[0].grnLineId, 'extra')
})

test('reconciliation preserves edits and recovers a lost add response without matching deleted rows', () => {
  const rows = [{ key: 'local', productId: 'b', purchaseOrderLineId: null, qtyBaseUnit: 7 }]
  const receipt = { lines: [additional] }
  const recovered = reconcileReceiptLines(rows, receipt)
  assert.equal(recovered[0].grnLineId, 'extra')
  assert.equal(recovered[0].qtyBaseUnit, 7)
  assert.equal(reconcileReceiptLines(rows, receipt, ['extra'])[0].grnLineId, undefined)
})

test('persisted removals are deleted and unsaved removals never reach the API', async () => {
  let receipt = { id: 'grn', lines: [additional] }
  let deletes = 0
  const service = {
    async removeGoodsReceiptLine(_id, lineId) {
      deletes++
      receipt = { ...receipt, lines: receipt.lines.filter((line) => line.id !== lineId) }
      return receipt
    },
  }
  const saved = await saveReceiptLines({
    receipt,
    lines: [],
    removedIds: ['extra'],
    service,
    payloadFor: (row) => row,
    onProgress() {},
  })
  assert.equal(deletes, 1)
  assert.deepEqual(saved.lines, [])
  await saveReceiptLines({
    receipt: saved,
    lines: [],
    removedIds: ['extra'],
    service,
    payloadFor: (row) => row,
    onProgress() {},
  })
  assert.equal(deletes, 1)
})

test('retry after a partially saved receipt updates saved rows instead of duplicating them', async () => {
  let receipt = { id: 'grn', lines: [] }
  let rows = ['a', 'b'].map((productId) => ({
    key: productId,
    productId,
    purchaseOrderLineId: null,
    qtyBaseUnit: 1,
  }))
  let fail = true
  let adds = 0
  const service = {
    async addGoodsReceiptLine(_id, payload) {
      if (payload.productId === 'b' && fail) throw new Error('network failure')
      adds++
      receipt = {
        ...receipt,
        lines: [...receipt.lines, { ...payload, id: `saved-${payload.productId}` }],
      }
      return receipt
    },
    async updateGoodsReceiptLine() {
      return receipt
    },
  }
  const save = () =>
    saveReceiptLines({
      receipt,
      lines: rows,
      removedIds: [],
      service,
      payloadFor: (row) => row,
      onProgress: (_receipt, updated) => {
        rows = updated
      },
    })
  await assert.rejects(save, /network failure/)
  assert.equal(rows[0].grnLineId, 'saved-a')
  fail = false
  await save()
  assert.equal(adds, 2)
  assert.equal(receipt.lines.length, 2)
})

test('zero quantity removes the saved line and does not add it back', async () => {
  let receipt = { id: 'grn', lines: [additional] }
  const rows = [{ key: 'row', grnLineId: 'extra', productId: 'b', qtyBaseUnit: 0 }]
  const result = await saveReceiptLines({
    receipt,
    lines: rows,
    removedIds: [],
    service: {
      async removeGoodsReceiptLine() {
        receipt = { ...receipt, lines: [] }
        return receipt
      },
    },
    payloadFor: (row) => row,
    onProgress() {},
  })
  assert.equal(result.lines.length, 0)
})
