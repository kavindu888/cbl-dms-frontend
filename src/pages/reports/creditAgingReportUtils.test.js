import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compactMoney, displayDate, mergeReportParams, money, parseDate } from './creditAgingReportUtils.js'

test('money renders zero as a dash and cells omit currency prefix', () => {
  assert.equal(money(0), '–')
  assert.equal(money('1234.5'), '1,234.50')
  assert.equal(compactMoney(8_890_000), '8.9M')
})

test('date input round trips dd/MM/yyyy and rejects impossible dates', () => {
  assert.equal(displayDate('2026-11-05'), '05/11/2026')
  assert.equal(parseDate('05/11/2026'), '2026-11-05')
  assert.equal(parseDate('31/02/2026'), null)
})

test('URL state retains filters and removes cleared quick finders', () => {
  const original = new URLSearchParams('view=summary&customerId=c1&search=shop&bucket=BucketOver90')
  const next = mergeReportParams(original, { preset: 'Over60Days', bucket: null, minAmount: 100 })
  assert.equal(next.get('customerId'), 'c1')
  assert.equal(next.get('search'), 'shop')
  assert.equal(next.get('bucket'), null)
  assert.equal(next.get('preset'), 'Over60Days')
  assert.equal(next.get('minAmount'), '100')
})
