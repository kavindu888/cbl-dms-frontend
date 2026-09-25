import { Sparkles } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useApplyCredit, useCustomerCreditBalance } from '@/hooks/useCustomerCredit'
import { money } from '@/pages/collections/collectionsUi'

// Surfaces a customer's redeemable credit (from a past overpayment elsewhere) right where a bill
// is picked in Cash/Cheque/Transfer entry, instead of requiring the data-entry person to separately
// go to the Customer Credit Ledger page and look the customer up. Applying here calls the same
// Sales "apply credit to invoice" endpoint that page uses — it consumes as much of the credit as
// the invoice's outstanding amount needs, no partial-amount entry — so it fits directly into this
// flow with a single button rather than a form.
export default function CustomerCreditNote({ customerId, customerName, invoiceId, onApplied }) {
  const balance = useCustomerCreditBalance(customerId)
  const apply = useApplyCredit()
  const qc = useQueryClient()
  const available = Number(balance.data?.currentBalance || 0)

  if (!customerId || !invoiceId) return null

  // A 403 here almost always means the logged-in role has "Record Payment" but not "Customer
  // Credit > View" — the two are separate permissions, and this page's own permission only covers
  // the payment itself. Surfaced explicitly instead of silently showing nothing, since that would
  // look identical to "this customer just has no credit" and be much harder to track down.
  if (balance.isError) {
    if (balance.error?.response?.status === 403 || balance.error?.status === 403) {
      return (
        <div
          style={{
            padding: '8px 12px',
            border: '1px solid color-mix(in srgb, var(--color-danger) 40%, var(--color-border))',
            borderRadius: 8,
            fontSize: 11,
            color: 'var(--color-danger)',
          }}
        >
          Can't check {customerName || 'this customer'}'s credit — your role is missing the
          "Customer Credit → View" permission (Apply also needed to use the button below).
        </div>
      )
    }
    return null
  }

  if (balance.isLoading || available <= 0) return null

  function handleApply() {
    apply.mutate(
      { customerId, invoiceId },
      {
        onSuccess: (data) => {
          qc.invalidateQueries({ queryKey: ['outstanding-invoices', customerId] })
          qc.invalidateQueries({ queryKey: ['outstanding-invoices-search'] })
          qc.invalidateQueries({ queryKey: ['outstanding-invoices-by-ids'] })
          onApplied?.(Number(data?.amountConsumed || 0))
        },
      }
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        border: '1px solid color-mix(in srgb, var(--color-teal) 40%, var(--color-border))',
        borderRadius: 8,
        background: 'color-mix(in srgb, var(--color-teal) 8%, transparent)',
      }}
    >
      <Sparkles size={15} color="var(--color-teal)" style={{ flex: '0 0 auto' }} />
      <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)' }}>
        {customerName || 'This customer'} has <strong style={{ color: 'var(--color-teal)' }}>{money(available)}</strong>{' '}
        in credit available from a past overpayment.
      </span>
      <button
        type="button"
        className="button-secondary"
        onClick={handleApply}
        disabled={apply.isPending}
        style={{ flex: '0 0 auto', height: 30, fontSize: 12 }}
      >
        {apply.isPending ? 'Applying...' : 'Apply to this bill'}
      </button>
    </div>
  )
}
