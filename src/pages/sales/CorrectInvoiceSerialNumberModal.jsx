import { ArrowRight, Check, Hash, History, LoaderCircle, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import Modal from '@components/ui/Modal'
import { salesService } from '@/services/api/salesService'
import {
  isValidInvoiceSerialNumber,
  normalizeInvoiceSerialNumber,
} from '@/utils/invoiceSerialNumber'
import './CorrectInvoiceSerialNumberModal.css'

export default function CorrectInvoiceSerialNumberModal({ invoice, onClose, onDone }) {
  const id = useId()
  const original = invoice.serialNumber || ''
  const parts = /^([A-D])?([0-9]+)$/.exec(normalizeInvoiceSerialNumber(original))
  const [prefix, setPrefix] = useState(parts?.[1] || '')
  const [digits, setDigits] = useState(parts?.[2] || original)
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState({})
  const [attempted, setAttempted] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const prefixRef = useRef(null)
  const digitsRef = useRef(null)
  const serial = `${prefix}${digits.trim()}`
  const valid = isValidInvoiceSerialNumber(serial)
  const errors = {
    prefix: !prefix ? 'Choose the letter printed on the invoice book.' : '',
    digits: !/^[0-9]{1,19}$/.test(digits.trim())
      ? 'Enter 1–19 digits, keeping any leading zeroes.'
      : '',
  }
  const showError = (field) => (attempted || touched[field]) && errors[field]
  const touch = (field) => setTouched((value) => ({ ...value, [field]: true }))

  async function submit(event) {
    event.preventDefault()
    if (isSubmitting) return
    setAttempted(true)
    setServerError('')
    const invalid = ['prefix', 'digits'].find((field) => errors[field])
    if (invalid) {
      const refs = { prefix: prefixRef, digits: digitsRef }
      refs[invalid].current?.focus()
      return
    }
    if (serial === original) {
      setServerError('Enter a different serial number to save a correction.')
      prefixRef.current?.focus()
      return
    }
    setIsSubmitting(true)
    try {
      await salesService.correctInvoiceSerialNumber(invoice.id, {
        expectedSerialNumber: invoice.serialNumber || null,
        serialNumber: serial,
        reason: reason.trim() || null,
      })
      toast.success('Serial number corrected. Payments and collections are preserved.')
      onDone?.()
      onClose()
    } catch (error) {
      setServerError(error.message || 'Unable to save. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onOpenAutoFocus={(event) => {
        event.preventDefault()
        prefixRef.current?.focus()
      }}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose()
      }}
      title="Correct serial number"
      description="Choose the invoice book letter and confirm the digits. You can also add a reason."
      showHeader={false}
      maxWidth="560px"
      contentStyle={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}
    >
      <form className="serial-correction" onSubmit={submit} noValidate aria-busy={isSubmitting}>
        <header className="serial-correction__header">
          <div className="serial-correction__heading-icon">
            <Hash size={21} aria-hidden="true" />
          </div>
          <div className="serial-correction__heading">
            <h2>Correct serial number</h2>
            <p>Update the reference on invoice {invoice.invoiceNumber}.</p>
          </div>
          <button
            type="button"
            className="serial-correction__close"
            aria-label="Close serial correction"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>

        <div className="serial-correction__body">
          <div className="serial-correction__current">
            <span>Current serial number</span>
            <strong>{original || 'Not assigned'}</strong>
          </div>

          <fieldset disabled={isSubmitting} className="serial-correction__fieldset">
            <legend>
              Correct serial number <span className="serial-correction__required">Required</span>
            </legend>
            <p className="serial-correction__hint" id={`${id}-format`}>
              Check the original invoice book for the correct letter and digits.
            </p>
            <div className="serial-correction__fields">
              <div className="serial-correction__field">
                <label htmlFor={`${id}-prefix`}>Book letter</label>
                <select
                  ref={prefixRef}
                  id={`${id}-prefix`}
                  className="form-input"
                  value={prefix}
                  required
                  aria-invalid={Boolean(showError('prefix'))}
                  aria-describedby={`${id}-format${showError('prefix') ? ` ${id}-prefix-error` : ''}`}
                  onBlur={() => touch('prefix')}
                  onChange={(event) => {
                    setPrefix(event.target.value)
                    setServerError('')
                  }}
                >
                  <option value="" disabled>
                    Select letter
                  </option>
                  {['A', 'B', 'C', 'D'].map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </select>
                {showError('prefix') ? (
                  <p className="serial-correction__error" id={`${id}-prefix-error`}>
                    {errors.prefix}
                  </p>
                ) : null}
              </div>
              <div className="serial-correction__field">
                <label htmlFor={`${id}-digits`}>Serial digits</label>
                <input
                  ref={digitsRef}
                  id={`${id}-digits`}
                  className="form-input mono"
                  type="text"
                  inputMode="numeric"
                  maxLength={19}
                  autoComplete="off"
                  spellCheck={false}
                  required
                  value={digits}
                  placeholder="e.g. 69049"
                  aria-invalid={Boolean(showError('digits'))}
                  aria-describedby={`${id}-format${showError('digits') ? ` ${id}-digits-error` : ''}`}
                  onBlur={() => touch('digits')}
                  onChange={(event) => {
                    setDigits(event.target.value)
                    setServerError('')
                  }}
                />
                {showError('digits') ? (
                  <p className="serial-correction__error" id={`${id}-digits-error`}>
                    {errors.digits}
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>

          <div
            className={`serial-correction__preview${valid ? ' serial-correction__preview--ready' : ''}`}
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="serial-correction__preview-label">
              {valid ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                <Hash size={15} aria-hidden="true" />
              )}{' '}
              Corrected serial
            </div>
            <div className="serial-correction__comparison">
              <span>{original || 'Not assigned'}</span>
              <ArrowRight size={16} aria-hidden="true" />
              <strong>{valid ? serial : 'Choose letter + digits'}</strong>
            </div>
          </div>

          <div className="serial-correction__field">
            <label htmlFor={`${id}-reason`}>
              Reason for correction <span className="serial-correction__required">Optional</span>
            </label>
            <textarea
              id={`${id}-reason`}
              className="form-input"
              rows={3}
              maxLength={500}
              value={reason}
              disabled={isSubmitting}
              aria-describedby={`${id}-reason-help`}
              placeholder="e.g. Missing book letter; verified against the original invoice"
              onChange={(event) => {
                setReason(event.target.value)
                setServerError('')
              }}
            />
            <p className="serial-correction__hint" id={`${id}-reason-help`}>
              Saved with your user account, the date and both serial numbers.
            </p>
          </div>

          <div className="serial-correction__note">
            <History size={16} aria-hidden="true" />
            <p>Items, payments, stock and collection sessions stay unchanged.</p>
          </div>
          {serverError ? (
            <p className="serial-correction__error serial-correction__server-error" role="alert">
              {serverError}
            </p>
          ) : null}
        </div>

        <footer className="serial-correction__footer">
          <button
            type="button"
            className="button-secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle size={16} className="serial-correction__spinner" aria-hidden="true" />
            ) : (
              <Check size={16} aria-hidden="true" />
            )}
            {isSubmitting ? 'Saving correction…' : 'Save correction'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
