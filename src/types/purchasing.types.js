export const PurchaseOrderStatus = {
  Draft: 1,
  Submitted: 2,
  Approved: 3,
  Rejected: 4,
  PartiallyReceived: 5,
  FullyReceived: 6,
  Cancelled: 7,
}

export const purchaseOrderStatusOptions = [
  { value: '', label: 'All statuses' },
  { value: PurchaseOrderStatus.Draft, label: 'Draft' },
  { value: PurchaseOrderStatus.Submitted, label: 'Submitted' },
  { value: PurchaseOrderStatus.Approved, label: 'Approved' },
  { value: PurchaseOrderStatus.Rejected, label: 'Rejected' },
  { value: PurchaseOrderStatus.PartiallyReceived, label: 'Partially Received' },
  { value: PurchaseOrderStatus.FullyReceived, label: 'Fully Received' },
  { value: PurchaseOrderStatus.Cancelled, label: 'Cancelled' },
]

export var ReturnReason
;(function (ReturnReason) {
  ReturnReason['Damaged'] = 'Damaged'
  ReturnReason['Expired'] = 'Expired'
  ReturnReason['IncorrectItem'] = 'IncorrectItem'
  ReturnReason['QuantityMismatch'] = 'QuantityMismatch'
  ReturnReason['Other'] = 'Other'
})(ReturnReason || (ReturnReason = {}))
