export var CreditPeriod
;(function (CreditPeriod) {
  CreditPeriod[(CreditPeriod['Days7'] = 7)] = 'Days7'
  CreditPeriod[(CreditPeriod['Days14'] = 14)] = 'Days14'
  CreditPeriod[(CreditPeriod['Days21'] = 21)] = 'Days21'
})(CreditPeriod || (CreditPeriod = {}))
export var InvoiceStatus
;(function (InvoiceStatus) {
  InvoiceStatus['Draft'] = 'Draft'
  InvoiceStatus['Posted'] = 'Posted'
  InvoiceStatus['Paid'] = 'Paid'
  InvoiceStatus['Overdue'] = 'Overdue'
  InvoiceStatus['Cancelled'] = 'Cancelled'
})(InvoiceStatus || (InvoiceStatus = {}))
export var PaymentType
;(function (PaymentType) {
  PaymentType['Cash'] = 'Cash'
  PaymentType['Credit'] = 'Credit'
})(PaymentType || (PaymentType = {}))
