import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/collectionsApi'

const errorMessage = (error, fallback) => error?.message || fallback
const invalidatePayments = (qc) => {
  qc.invalidateQueries({ queryKey: ['outstanding-invoices'] })
  qc.invalidateQueries({ queryKey: ['collection-session'] })
  qc.invalidateQueries({ queryKey: ['collection-sessions'] })
  qc.invalidateQueries({ queryKey: ['customer-account'] })
  qc.invalidateQueries({ queryKey: ['customer-accounts'] })
  qc.invalidateQueries({ queryKey: ['reconciliation'] })
}

// Banks
export const useBanks = () =>
  useQuery({ queryKey: ['banks'], queryFn: () => api.listBanks(), staleTime: 300_000 })
export const useBankBranches = (bankId) =>
  useQuery({
    queryKey: ['bank-branches', bankId],
    queryFn: () => api.listBankBranches(bankId),
    enabled: Boolean(bankId),
    staleTime: 300_000,
  })
export const useCreateBank = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createBank,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banks'] })
      toast.success('Bank added')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to add bank')),
  })
}
export const useAddBankBranch = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bankId, data }) => api.addBankBranch(bankId, data),
    onSuccess: (_, { bankId }) => {
      qc.invalidateQueries({ queryKey: ['bank-branches', bankId] })
      toast.success('Branch added')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to add branch')),
  })
}

// Sessions
export const useCollectionSessions = (params = {}) =>
  useQuery({
    queryKey: ['collection-sessions', params],
    queryFn: () => api.listCollectionSessions(params),
    staleTime: 30_000,
  })
export const useCollectionSession = (id) =>
  useQuery({
    queryKey: ['collection-session', id],
    queryFn: () => api.getCollectionSession(id),
    enabled: Boolean(id),
  })
export const useReconciliation = (sessionId) =>
  useQuery({
    queryKey: ['reconciliation', sessionId],
    queryFn: () => api.getReconciliation(sessionId),
    enabled: Boolean(sessionId),
  })
export const useCreateSession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createCollectionSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-sessions'] })
      toast.success('Collection session opened')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to create session')),
  })
}
export const useCreateCollectionSession = useCreateSession
export const useCloseSession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variables) =>
      api.closeCollectionSession(typeof variables === 'string' ? { id: variables } : variables),
    onSuccess: (_, variables) => {
      const id = typeof variables === 'string' ? variables : variables.id
      qc.invalidateQueries({ queryKey: ['collection-sessions'] })
      qc.invalidateQueries({ queryKey: ['collection-session', id] })
      qc.invalidateQueries({ queryKey: ['reconciliation', id] })
      toast.success('Session closed')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to close session')),
  })
}
export const useVerifySession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.verifyCollectionSession,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['collection-sessions'] })
      qc.invalidateQueries({ queryKey: ['collection-session', id] })
      qc.invalidateQueries({ queryKey: ['reconciliation', id] })
      toast.success('Session verified')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to verify session')),
  })
}

// Outstanding invoices and payments
export const useOutstandingInvoices = (customerId) =>
  useQuery({
    queryKey: ['outstanding-invoices', customerId],
    queryFn: () => api.getOutstandingInvoices(customerId),
    enabled: Boolean(customerId),
    staleTime: 10_000,
    retry: false,
  })
function usePaymentMutation(mutationFn, successMessage) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidatePayments(qc)
      toast.success(successMessage)
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to record payment')),
  })
}
export const useRecordCashPayment = () =>
  usePaymentMutation(api.recordCashPayment, 'Cash payment recorded')
export const useRecordChequePayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.recordChequePayment,
    onSuccess: () => {
      invalidatePayments(qc)
      qc.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Cheque recorded')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to record cheque')),
  })
}
export const useRecordBankTransfer = () =>
  usePaymentMutation(api.recordBankTransferPayment, 'Bank transfer recorded')

// Legacy hooks retained for older collection entry code.
export const useRecordCash = (sessionId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.recordCashCollection(sessionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-session', sessionId] })
      qc.invalidateQueries({ queryKey: ['collection-sessions'] })
      toast.success('Cash recorded')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to record cash')),
  })
}
export const useRecordCheque = (sessionId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.recordCheque(sessionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-session', sessionId] })
      qc.invalidateQueries({ queryKey: ['collection-sessions'] })
      qc.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Cheque recorded')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to record cheque')),
  })
}

// Cheques
export const useCheques = (params = {}) =>
  useQuery({
    queryKey: ['cheques', params],
    queryFn: () => api.listCheques(params),
    staleTime: 30_000,
  })
function useChequeAction(mutationFn, successMessage, successToast = toast.success) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheques'] })
      qc.invalidateQueries({ queryKey: ['deposit-batches'] })
      invalidatePayments(qc)
      successToast(successMessage)
    },
    onError: (error) => toast.error(errorMessage(error, 'Cheque action failed')),
  })
}
export const useDepositCheque = () =>
  useChequeAction(
    (id) => api.depositCheque(typeof id === 'string' ? id : id.id),
    'Cheque sent for deposit'
  )
export const useAssignChequeToBatch = () =>
  useChequeAction(
    ({ id, depositBatchId }) => api.assignChequeToDepositBatch(id, depositBatchId),
    'Cheque assigned to deposit batch'
  )
export const useClearCheque = () =>
  useChequeAction(({ id }) => api.clearCheque(id), 'Cheque cleared')
export const useBounceCheque = () =>
  useChequeAction(
    ({ id, data }) => api.bounceCheque(id, data),
    'Cheque bounced — invoices returned to outstanding',
    toast.error
  )
export const useWriteOffCheque = () =>
  useChequeAction(({ id, data }) => api.writeOffCheque(id, data), 'Cheque written off')
export const useCancelCheque = () =>
  useChequeAction(({ id, reason }) => api.cancelCheque(id, { reason }), 'Cheque cancelled')

// Deposit batches
export const useDepositBatches = (params = {}) =>
  useQuery({ queryKey: ['deposit-batches', params], queryFn: () => api.listDepositBatches(params) })
export const useDepositBatch = (id) =>
  useQuery({
    queryKey: ['deposit-batch', id],
    queryFn: () => api.getDepositBatch(id),
    enabled: Boolean(id),
  })
export const useCreateDepositBatch = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createDepositBatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposit-batches'] })
      qc.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Deposit batch created')
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to create batch')),
  })
}
function useBatchAction(mutationFn, message) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['deposit-batches'] })
      qc.invalidateQueries({ queryKey: ['deposit-batch', id] })
      qc.invalidateQueries({ queryKey: ['cheques'] })
      toast.success(message)
    },
    onError: (error) => toast.error(errorMessage(error, 'Deposit batch action failed')),
  })
}
export const useSubmitDepositBatch = () =>
  useBatchAction(api.submitDepositBatch, 'Deposit batch submitted')
export const useConfirmDepositBatch = () =>
  useBatchAction(api.confirmDepositBatch, 'Deposit batch confirmed')

// Customer accounts
export const useCustomerAccounts = (params = {}) =>
  useQuery({
    queryKey: ['customer-accounts', params],
    queryFn: () => api.listCustomerAccounts(params),
    staleTime: 60_000,
  })
export const useCustomerAccount = (customerId) =>
  useQuery({
    queryKey: ['customer-account', customerId],
    queryFn: () => api.getCustomerAccount(customerId),
    enabled: Boolean(customerId),
  })
export const useCustomerLedger = (customerId) =>
  useQuery({
    queryKey: ['customer-ledger', customerId],
    queryFn: () => api.getCustomerLedger(customerId),
    enabled: Boolean(customerId),
  })
export const useAgingReport = (customerId) =>
  useQuery({
    queryKey: ['aging-report', customerId],
    queryFn: () => api.getAgingReport(customerId),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })
function useAccountAction(mutationFn, message) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (_, variables) => {
      const id = typeof variables === 'string' ? variables : variables.customerId
      qc.invalidateQueries({ queryKey: ['customer-accounts'] })
      qc.invalidateQueries({ queryKey: ['customer-account', id] })
      toast.success(message)
    },
    onError: (error) => toast.error(errorMessage(error, 'Account action failed')),
  })
}
export const useCreateCustomerAccount = () =>
  useAccountAction(api.createCustomerAccount, 'Customer account created')
export const useUpdateCreditLimit = () =>
  useAccountAction(
    ({ customerId, newCreditLimit }) => api.updateCustomerCreditLimit(customerId, newCreditLimit),
    'Credit limit updated'
  )
export const useHoldCustomerAccount = () =>
  useAccountAction(api.holdCustomerAccount, 'Customer account placed on hold')
export const useReinstateCustomerAccount = () =>
  useAccountAction(api.reinstateCustomerAccount, 'Customer account reinstated')
