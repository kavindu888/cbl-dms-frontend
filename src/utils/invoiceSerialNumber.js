export const INVOICE_SERIAL_MESSAGE =
  'Use A, B, C or D followed by digits (e.g. A69809), with at most 20 characters. Lowercase letters are converted to uppercase.'

export function normalizeInvoiceSerialNumber(value) {
  return String(value ?? '').trim().toUpperCase()
}

export function isValidInvoiceSerialNumber(value) {
  return /^[A-D][0-9]{1,19}$/.test(normalizeInvoiceSerialNumber(value))
}
