import dayjs from 'dayjs'
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  PackageCheck,
  RefreshCw,
  Save,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import StatusBadge from '@components/ui/StatusBadge'
import { purchasingService } from '@services/api/purchasingService'
import { useAuthStore } from '@stores/authStore'
import { GrnStatus, PurchaseOrderStatus } from '@/types/purchasing.types'
import { PERMISSIONS, userHasPermission } from '@/utils/permissions'

function today() {
  return dayjs().format('YYYY-MM-DD')
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function toIsoDate(value) {
  return value ? dayjs(value).toISOString() : null
}

function normalizeText(value) {
  const text = String(value || '').trim()
  return text || null
}

function getDefaultPrice(...values) {
  const price = values.find((value) => toNumber(value) > 0)
  return price ?? 0
}

function createLineForm(poLine, grnLine) {
  const hasSavedLine = Boolean(grnLine)

  return {
    purchaseOrderLineId: poLine.id,
    grnLineId: grnLine?.id || '',
    productId: poLine.productId,
    productSku: poLine.productSku,
    productName: poLine.productName,
    baseUomCode: poLine.baseUomCode,
    smallestUomCode: poLine.smallestUomCode,
    qtyPerBaseUnit:
      toNumber(poLine.qtyBaseUnit) > 0
        ? toNumber(poLine.qtySmallestUnit) / toNumber(poLine.qtyBaseUnit)
        : 1,
    orderedQty: poLine.qtyBaseUnit,
    receivedQty: poLine.receivedQty,
    remainingQty: poLine.remainingQty,
    qtyBaseUnit: hasSavedLine ? grnLine.qtyBaseUnit : '',
    unitCostSmallest: getDefaultPrice(grnLine?.unitCostSmallest, poLine.unitCostSmallest),
    sellingPrice: getDefaultPrice(
      grnLine?.sellingPrice,
      poLine.sellingPrice,
      poLine.unitCostSmallest
    ),
    mrp: getDefaultPrice(grnLine?.mrp, poLine.mrp, poLine.unitCostSmallest),
    lineSubtotal: grnLine?.lineSubtotal ?? 0,
    rejectedQtyBase: grnLine?.rejectedQtyBase ?? 0,
    rejectionReason: grnLine?.rejectionReason || '',
    batchNo: grnLine?.batchNo || '',
    expiryDate: grnLine?.expiryDate ? dayjs(grnLine.expiryDate).format('YYYY-MM-DD') : '',
    notes: grnLine?.notes || poLine.notes || '',
  }
}

function getLinePayload(line) {
  return {
    purchaseOrderLineId: line.purchaseOrderLineId,
    productId: line.productId,
    productSku: line.productSku,
    productName: line.productName,
    qtyBaseUnit: toNumber(line.qtyBaseUnit),
    unitCostSmallest: toNumber(line.unitCostSmallest),
    sellingPrice: toNumber(line.sellingPrice),
    mrp: toNumber(line.mrp),
    rejectedQtyBase: toNumber(line.rejectedQtyBase),
    rejectionReason: normalizeText(line.rejectionReason),
    batchNo: normalizeText(line.batchNo),
    expiryDate: toIsoDate(line.expiryDate),
    notes: normalizeText(line.notes),
  }
}

function getHeaderPayload(header) {
  return {
    purchaseOrderId: header.purchaseOrderId,
    receiptDate: toIsoDate(header.receiptDate),
    discount: toNumber(header.discount),
    supplierInvoiceNo: normalizeText(header.supplierInvoiceNo),
    notes: normalizeText(header.notes),
  }
}

function getEditableHeaderPayload(header) {
  return {
    discount: toNumber(header.discount),
    supplierInvoiceNo: normalizeText(header.supplierInvoiceNo),
    notes: normalizeText(header.notes),
  }
}

function getAcceptedQty(line) {
  return toNumber(line.qtyBaseUnit) - toNumber(line.rejectedQtyBase)
}

function estimateLineSubtotal(line) {
  return (
    toNumber(line.qtyBaseUnit) *
    toNumber(line.qtyPerBaseUnit || 1) *
    toNumber(line.unitCostSmallest)
  )
}

function getReceiptLifoDate(receipt) {
  return dayjs(receipt.createdAt || receipt.receiptDate)
}

function getLineError(line) {
  const qtyBaseUnit = toNumber(line.qtyBaseUnit)
  const rejectedQtyBase = toNumber(line.rejectedQtyBase)

  if (qtyBaseUnit < 0) return `${line.productSku}: received quantity cannot be negative.`
  if (rejectedQtyBase < 0) return `${line.productSku}: rejected quantity cannot be negative.`
  if (rejectedQtyBase > qtyBaseUnit) {
    return `${line.productSku}: rejected quantity cannot exceed received quantity.`
  }
  if (rejectedQtyBase > 0 && !normalizeText(line.rejectionReason)) {
    return `${line.productSku}: enter a rejection reason.`
  }
  if (toNumber(line.unitCostSmallest) < 0)
    return `${line.productSku}: unit cost cannot be negative.`
  if (toNumber(line.sellingPrice) < 0)
    return `${line.productSku}: selling price cannot be negative.`
  if (toNumber(line.mrp) < 0) return `${line.productSku}: MRP cannot be negative.`
  if (getAcceptedQty(line) > toNumber(line.remainingQty) && !line.grnLineId) {
    return `${line.productSku}: accepted quantity cannot exceed remaining quantity.`
  }

  return ''
}

export default function ReceiptEntryPage() {
  const { id, grnId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const canVerify = userHasPermission(user, PERMISSIONS.purchasing.grnVerify)

  const [purchaseOrder, setPurchaseOrder] = useState(null)
  const [goodsReceipt, setGoodsReceipt] = useState(null)
  const [header, setHeader] = useState({
    purchaseOrderId: id || '',
    receiptDate: today(),
    supplierInvoiceNo: '',
    discount: 0,
    notes: '',
  })
  const [lines, setLines] = useState([])
  const [rejectReason, setRejectReason] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const canEdit = !goodsReceipt || Number(goodsReceipt.status) === GrnStatus.Draft
  const canSubmit = canEdit
  const canReview = Number(goodsReceipt?.status) === GrnStatus.Received
  const canReceivePo = [
    PurchaseOrderStatus.Approved,
    PurchaseOrderStatus.PartiallyReceived,
  ].includes(Number(purchaseOrder?.status))

  const loadPage = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      let grn = null
      let poId = id

      if (grnId) {
        grn = await purchasingService.getGoodsReceipt(grnId)
        poId = grn.purchaseOrderId
      }

      const po = await purchasingService.getPurchaseOrder(poId)
      setPurchaseOrder(po)

      if (!grn) {
        const grnList = await purchasingService.listGoodsReceipts({
          page: 1,
          pageSize: 20,
          poId,
        })
        const summaries = grnList?.items || []
        const openSummary = summaries
          .filter((item) => [GrnStatus.Draft, GrnStatus.Received].includes(Number(item.status)))
          .sort((a, b) => {
            const dateA = getReceiptLifoDate(a)
            const dateB = getReceiptLifoDate(b)
            if (!dateA.isSame(dateB)) {
              return dateB.isAfter(dateA) ? 1 : -1
            }
            return b.grNumber.localeCompare(a.grNumber, undefined, {
              numeric: true,
              sensitivity: 'base',
            })
          })[0]
        grn = openSummary ? await purchasingService.getGoodsReceipt(openSummary.id) : null
      }

      setGoodsReceipt(grn)
      setHeader({
        purchaseOrderId: po.id,
        receiptDate: grn?.receiptDate ? dayjs(grn.receiptDate).format('YYYY-MM-DD') : today(),
        supplierInvoiceNo: grn?.supplierInvoiceNo || '',
        discount: grn?.discount || 0,
        notes: grn?.notes || '',
      })

      const grnLinesByPoLine = new Map(
        (grn?.lines || []).map((line) => [line.purchaseOrderLineId, line])
      )
      setLines((po.lines || []).map((line) => createLineForm(line, grnLinesByPoLine.get(line.id))))
      setRejectReason(grn?.rejectionReason || grn?.rejectReason || '')
    } catch (requestError) {
      setError(requestError.message)
      setPurchaseOrder(null)
      setGoodsReceipt(null)
      setLines([])
    } finally {
      setIsLoading(false)
    }
  }, [grnId, id])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  const totals = useMemo(() => {
    const billTotal = lines.reduce((sum, line) => sum + estimateLineSubtotal(line), 0)
    const valueOfSupply = Math.max(billTotal - toNumber(header.discount), 0)
    const vatAmount = valueOfSupply * (toNumber(purchaseOrder?.vatRate) / 100)

    return {
      billTotal,
      valueOfSupply,
      vatAmount,
      netAmount: valueOfSupply + vatAmount,
    }
  }, [header.discount, lines, purchaseOrder?.vatRate])

  function updateHeader(field, value) {
    setHeader((current) => ({ ...current, [field]: value }))
  }

  function updateLine(index, field, value) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line))
    )
  }

  async function saveDraft(showToast = true) {
    if (!canEdit) return goodsReceipt

    if (toNumber(header.discount) < 0) {
      toast.error('Discount cannot be negative.')
      return null
    }

    const activeLines = lines.filter((line) => toNumber(line.qtyBaseUnit) > 0 || line.grnLineId)
    const validationError = activeLines.map(getLineError).find(Boolean)

    if (validationError) {
      toast.error(validationError)
      return null
    }

    if (!activeLines.some((line) => toNumber(line.qtyBaseUnit) > 0)) {
      toast.error('Enter received quantity for at least one item.')
      return null
    }

    setIsSaving(true)
    try {
      let savedReceipt = goodsReceipt
      if (!savedReceipt) {
        savedReceipt = await purchasingService.createGoodsReceipt(getHeaderPayload(header))
      } else {
        savedReceipt = await purchasingService.updateGoodsReceiptHeader(
          savedReceipt.id,
          getEditableHeaderPayload(header)
        )
      }

      for (const line of activeLines) {
        const payload = getLinePayload(line)

        if (line.grnLineId && payload.qtyBaseUnit <= 0) {
          savedReceipt = await purchasingService.removeGoodsReceiptLine(
            savedReceipt.id,
            line.grnLineId
          )
        } else if (line.grnLineId) {
          savedReceipt = await purchasingService.updateGoodsReceiptLine(
            savedReceipt.id,
            line.grnLineId,
            payload
          )
        } else if (payload.qtyBaseUnit > 0) {
          savedReceipt = await purchasingService.addGoodsReceiptLine(savedReceipt.id, payload)
        }
      }

      setGoodsReceipt(savedReceipt)
      setHeader((current) => ({ ...current, discount: savedReceipt.discount ?? current.discount }))
      const grnLinesByPoLine = new Map(
        (savedReceipt.lines || []).map((line) => [line.purchaseOrderLineId, line])
      )
      setLines(
        (purchaseOrder.lines || []).map((line) =>
          createLineForm(line, grnLinesByPoLine.get(line.id))
        )
      )
      if (showToast) toast.success(`${savedReceipt.grNumber} saved as draft.`)
      return savedReceipt
    } catch (requestError) {
      toast.error(requestError.message)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function removeLine(line) {
    if (!goodsReceipt || !line.grnLineId) {
      updateLine(lines.indexOf(line), 'qtyBaseUnit', 0)
      return
    }

    setIsSaving(true)
    try {
      const updated = await purchasingService.removeGoodsReceiptLine(
        goodsReceipt.id,
        line.grnLineId
      )
      toast.success('GRN line removed.')
      setGoodsReceipt(updated)
      const grnLinesByPoLine = new Map(
        (updated.lines || []).map((item) => [item.purchaseOrderLineId, item])
      )
      setLines(
        (purchaseOrder.lines || []).map((item) =>
          createLineForm(item, grnLinesByPoLine.get(item.id))
        )
      )
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function submitReceipt() {
    const draft = await saveDraft(false)
    if (!draft) return

    setIsSaving(true)
    try {
      const submitted = await purchasingService.submitGoodsReceipt(draft.id)
      setGoodsReceipt(submitted)
      toast.success(`${submitted.grNumber} submitted for verification.`)
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function verifyReceipt() {
    if (!goodsReceipt) return
    setIsSaving(true)
    try {
      const verified = await purchasingService.verifyGoodsReceipt(goodsReceipt.id)
      setGoodsReceipt(verified)
      toast.success(`${verified.grNumber} verified.`)
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function rejectReceipt() {
    if (!goodsReceipt) return
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason.')
      return
    }

    setIsSaving(true)
    try {
      const rejected = await purchasingService.rejectGoodsReceipt(
        goodsReceipt.id,
        rejectReason.trim()
      )
      setGoodsReceipt(rejected)
      toast.success(`${rejected.grNumber} rejected.`)
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <PageMessage>Loading receipt entry...</PageMessage>
  }

  if (error) {
    return (
      <PageMessage>
        <div>{error}</div>
        <button
          type="button"
          className="button-secondary"
          onClick={loadPage}
          style={{ marginTop: 14 }}
        >
          Try Again
        </button>
      </PageMessage>
    )
  }

  const showVerification = (canReview && canVerify) || Boolean(rejectReason)

  return (
    <div
      style={{
        height: 'calc(100vh - var(--spacing-layout-topbar) - 56px)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'center',
          paddingBottom: 12,
        }}
      >
        <div>
          <button
            type="button"
            className="btn-back-modern"
            onClick={() => navigate('/purchasing/goods-receipts')}
            style={{ marginLeft: -8 }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <h1 style={{ marginTop: 8, fontSize: 26, fontWeight: 700 }}>Goods Receipt Entry</h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Receive approved purchase order items and submit the GRN for verification.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {goodsReceipt ? (
            <StatusBadge status={goodsReceipt.statusLabel || 'Draft'} />
          ) : (
            <StatusBadge status="New Draft" />
          )}
          <button
            type="button"
            className="icon-button"
            onClick={loadPage}
            disabled={isSaving}
            title="Refresh"
            style={{ height: 36, width: 36 }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          paddingBottom: 76,
          paddingRight: 4,
        }}
      >
        {!canReceivePo && !goodsReceipt ? (
          <div className="panel" style={{ padding: 14, color: 'var(--color-warning)', fontSize: 13 }}>
            This purchase order is not available for receiving. Only approved or partially received
            POs can create a GRN.
          </div>
        ) : null}

        <section className="panel" style={{ padding: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 160px 180px',
              gap: 12,
              rowGap: 14,
            }}
          >
            <ReadOnlyField label="Purchase Order" value={purchaseOrder.poNumber} />
            <ReadOnlyField label="Supplier" value={purchaseOrder.supplierName} />
            <ReadOnlyField label="GRN Number" value={goodsReceipt?.grNumber || 'New draft'} />
            <Field label="Receipt Date">
              <input
                type="date"
                className="form-input"
                value={header.receiptDate}
                onChange={(event) => updateHeader('receiptDate', event.target.value)}
                disabled={!canEdit || Boolean(goodsReceipt)}
                style={{ colorScheme: 'dark' }}
              />
            </Field>

            <Field label="Supplier Invoice No">
              <input
                className="form-input"
                value={header.supplierInvoiceNo}
                onChange={(event) => updateHeader('supplierInvoiceNo', event.target.value)}
                disabled={!canEdit}
                placeholder="Invoice number"
              />
            </Field>
            <Field label="Discount">
              <input
                type="number"
                min="0"
                className="form-input"
                value={header.discount}
                onChange={(event) => updateHeader('discount', event.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <div style={{ gridColumn: 'span 2' }}>
              <Field label="Notes">
                <input
                  className="form-input"
                  value={header.notes}
                  onChange={(event) => updateHeader('notes', event.target.value)}
                  disabled={!canEdit}
                  placeholder="Optional receiving notes"
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="panel" style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: '13px 16px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PackageCheck size={16} color="var(--color-teal)" />
              <h2 style={{ fontSize: 14, fontWeight: 700 }}>Received Items</h2>
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {lines.length} PO lines
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table product-table-compact" style={{ minWidth: 1320 }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: 'right' }}>Remaining</th>
                  <th style={{ width: 115 }}>Receive Qty</th>
                  <th style={{ width: 130 }}>Unit Cost</th>
                  <th style={{ width: 130 }}>Selling Price</th>
                  <th style={{ width: 120 }}>MRP</th>
                  <th style={{ width: 115 }}>Rejected Qty</th>
                  <th style={{ width: 180 }}>Reject Reason</th>
                  {/* <th style={{ width: 140 }}>Batch</th> */}
                  <th style={{ width: 145 }}>Expiry</th>
                  <th style={{ width: 44 }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.purchaseOrderLineId}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span className="product-sku-badge mono">{line.productSku}</span>
                        <span>{line.productName}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                          Ordered {line.orderedQty} {line.baseUomCode} | Received {line.receivedQty}{' '}
                          {line.baseUomCode}
                        </span>
                      </div>
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {line.remainingQty} {line.baseUomCode}
                    </td>
                    <EditableNumber
                      value={line.qtyBaseUnit}
                      disabled={!canEdit}
                      onChange={(value) => updateLine(index, 'qtyBaseUnit', value)}
                    />
                    <EditableNumber
                      value={line.unitCostSmallest}
                      disabled={!canEdit}
                      onChange={(value) => updateLine(index, 'unitCostSmallest', value)}
                    />
                    <EditableNumber
                      value={line.sellingPrice}
                      disabled={!canEdit}
                      onChange={(value) => updateLine(index, 'sellingPrice', value)}
                    />
                    <EditableNumber
                      value={line.mrp}
                      disabled={!canEdit}
                      onChange={(value) => updateLine(index, 'mrp', value)}
                    />
                    <EditableNumber
                      value={line.rejectedQtyBase}
                      disabled={!canEdit}
                      onChange={(value) => updateLine(index, 'rejectedQtyBase', value)}
                    />
                    <td>
                      <input
                        className="form-input"
                        value={line.rejectionReason}
                        disabled={!canEdit}
                        onChange={(event) => updateLine(index, 'rejectionReason', event.target.value)}
                        placeholder={toNumber(line.rejectedQtyBase) > 0 ? 'Required reason' : ''}
                        style={{ height: 34 }}
                      />
                    </td>
                    {/* <td>
                      <input
                        className="form-input"
                        value={line.batchNo}
                        disabled={!canEdit}
                        onChange={(event) => updateLine(index, 'batchNo', event.target.value)}
                        style={{ height: 34 }}
                      />
                    </td> */}
                    <td>
                      <input
                        type="date"
                        className="form-input"
                        value={line.expiryDate}
                        disabled={!canEdit}
                        onChange={(event) => updateLine(index, 'expiryDate', event.target.value)}
                        style={{ height: 34, colorScheme: 'dark' }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-button"
                        disabled={!canEdit || isSaving}
                        onClick={() => removeLine(line)}
                        title="Remove line"
                        style={{ width: 32, height: 32 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div
          style={{
            display: 'flex',
            justifyContent: showVerification ? 'space-between' : 'flex-end',
            gap: 14,
            alignItems: 'flex-start',
          }}
        >
          {showVerification ? (
            <section className="panel" style={{ padding: 16, flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ClipboardCheck size={16} color="var(--color-text-dim)" />
                <h2 style={{ fontSize: 14, fontWeight: 700 }}>Verification</h2>
              </div>
              <textarea
                className="form-input"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                disabled={!canReview || !canVerify}
                placeholder="Reason is required only when rejecting a submitted GRN."
                style={{ height: 76, paddingTop: 10, resize: 'none' }}
              />
            </section>
          ) : null}

          <section
            className="panel"
            style={{
              padding: 16,
              width: 340,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
            }}
          >
            <SummaryRow
              label="Bill total"
              value={formatMoney(goodsReceipt?.billTotal ?? totals.billTotal)}
            />
            <SummaryRow label="Discount" value={formatMoney(header.discount)} />
            <SummaryRow
              label={`VAT (${Number(purchaseOrder.vatRate || 0)}%)`}
              value={formatMoney(goodsReceipt?.vatAmount ?? totals.vatAmount)}
            />
            <div
              style={{
                paddingTop: 10,
                marginTop: 4,
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 700 }}>Net amount</span>
              <span className="mono" style={{ color: 'var(--color-amber)', fontWeight: 700 }}>
                {formatMoney(goodsReceipt?.netAmount ?? totals.netAmount)}
              </span>
            </div>
          </section>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 68,
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
          paddingInline: 24,
          zIndex: 10,
        }}
      >
        {canEdit ? (
          <>
            <button
              type="button"
              className="button-secondary"
              onClick={() => saveDraft(true)}
              disabled={isSaving || !canReceivePo}
              style={{ height: 40, padding: '0 20px', fontSize: 13 }}
            >
              <Save size={16} /> Save Draft
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={submitReceipt}
              disabled={isSaving || !canSubmit || !canReceivePo}
              style={{ height: 40, padding: '0 20px', fontSize: 13 }}
            >
              <Send size={16} /> Submit GRN
            </button>
          </>
        ) : null}
        {canReview && canVerify ? (
          <>
            <button
              type="button"
              className="button-danger"
              onClick={rejectReceipt}
              disabled={isSaving}
              style={{ height: 40, padding: '0 20px', fontSize: 13 }}
            >
              <XCircle size={16} /> Reject
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={verifyReceipt}
              disabled={isSaving}
              style={{ height: 40, padding: '0 20px', fontSize: 13 }}
            >
              <CheckCircle2 size={16} /> Verify
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span className="form-label" style={{ marginBottom: 0 }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function ReadOnlyField({ label, value }) {
  return (
    <Field label={label}>
      <div
        className="form-input"
        style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)' }}
      >
        {value || 'Not specified'}
      </div>
    </Field>
  )
}

function EditableNumber({ value, disabled, onChange }) {
  return (
    <td>
      <input
        type="number"
        min="0"
        className="form-input"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        style={{ height: 34, textAlign: 'right' }}
      />
    </td>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13 }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="mono">{value}</span>
    </div>
  )
}

function PageMessage({ children }) {
  return (
    <div
      className="panel"
      style={{
        minHeight: 340,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}
    >
      <div>
        <FilePlus2 size={34} style={{ margin: '0 auto 12px', color: 'var(--color-text-dim)' }} />
        {children}
      </div>
    </div>
  )
}
