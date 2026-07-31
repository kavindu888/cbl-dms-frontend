import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as collectionsApi from '@/api/collectionsApi'

const errorMessage = (error, fallback) => error?.message || fallback

export const useCollectionSessions = (params = {}) =>
  useQuery({
    queryKey: ['collection-sessions', params],
    queryFn: () => collectionsApi.listCollectionSessions(params),
    staleTime: 30_000,
  })
export const useCollectionSession = (id) =>
  useQuery({
    queryKey: ['collection-session', id],
    queryFn: () => collectionsApi.getCollectionSession(id),
    enabled: Boolean(id),
  })
export const useCreateCollectionSession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: collectionsApi.createCollectionSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-sessions'] })
      toast.success('Collection session opened')
    },
    onError: (e) => toast.error(errorMessage(e, 'Failed to create session')),
  })
}
export const useCloseSession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: collectionsApi.closeCollectionSession,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['collection-sessions'] })
      qc.invalidateQueries({ queryKey: ['collection-session', variables.id] })
      toast.success('Session closed')
    },
    onError: (e) => toast.error(errorMessage(e, 'Failed to close session')),
  })
}
export const useVerifySession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: collectionsApi.verifyCollectionSession,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['collection-sessions'] })
      qc.invalidateQueries({ queryKey: ['collection-session', id] })
      toast.success('Session verified')
    },
    onError: (e) => toast.error(errorMessage(e, 'Failed to verify session')),
  })
}
export const useRecordCash = (sessionId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => collectionsApi.recordCashCollection(sessionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-session', sessionId] })
      qc.invalidateQueries({ queryKey: ['collection-sessions'] })
      toast.success('Cash recorded')
    },
    onError: (e) => toast.error(errorMessage(e, 'Failed to record cash')),
  })
}
export const useRecordCheque = (sessionId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => collectionsApi.recordCheque(sessionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-session', sessionId] })
      qc.invalidateQueries({ queryKey: ['collection-sessions'] })
      qc.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Cheque recorded')
    },
    onError: (e) => toast.error(errorMessage(e, 'Failed to record cheque')),
  })
}
export const useCheques = (params = {}) =>
  useQuery({
    queryKey: ['cheques', params],
    queryFn: () => collectionsApi.listCheques(params),
    staleTime: 30_000,
  })
function useChequeAction(mutationFn, successMessage) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheques'] })
      qc.invalidateQueries({ queryKey: ['deposit-batches'] })
      qc.invalidateQueries({ queryKey: ['customer-accounts'] })
      toast.success(successMessage)
    },
    onError: (e) => toast.error(errorMessage(e, 'Cheque action failed')),
  })
}
export const useDepositCheque = () =>
  useChequeAction(
    ({ id, depositBatchId }) => collectionsApi.depositCheque(id, { depositBatchId }),
    'Cheque assigned to deposit batch'
  )
export const useBounceCheque = () =>
  useChequeAction(
    ({ id, data }) => collectionsApi.bounceCheque(id, data),
    'Cheque bounce recorded — customer account updated'
  )
export const useClearCheque = () =>
  useChequeAction(
    ({ id }) => collectionsApi.clearCheque(id),
    'Cheque cleared — customer balance updated'
  )
export const useCancelCheque = () =>
  useChequeAction(
    ({ id, reason }) => collectionsApi.cancelCheque(id, { reason }),
    'Cheque cancelled'
  )

export const useDepositBatches = (params = {}) =>
  useQuery({
    queryKey: ['deposit-batches', params],
    queryFn: () => collectionsApi.listDepositBatches(params),
  })
export const useDepositBatch = (id) =>
  useQuery({
    queryKey: ['deposit-batch', id],
    queryFn: () => collectionsApi.getDepositBatch(id),
    enabled: Boolean(id),
  })
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
    onError: (e) => toast.error(errorMessage(e, 'Deposit batch action failed')),
  })
}
export const useCreateDepositBatch = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: collectionsApi.createDepositBatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposit-batches'] })
      toast.success('Deposit batch created')
    },
    onError: (e) => toast.error(errorMessage(e, 'Failed to create batch')),
  })
}
export const useSubmitDepositBatch = () =>
  useBatchAction(collectionsApi.submitDepositBatch, 'Deposit batch submitted')
export const useConfirmDepositBatch = () =>
  useBatchAction(collectionsApi.confirmDepositBatch, 'Deposit batch confirmed')

export const useCustomerAccounts = (params = {}) =>
  useQuery({
    queryKey: ['customer-accounts', params],
    queryFn: () => collectionsApi.listCustomerAccounts(params),
    staleTime: 60_000,
  })
export const useCustomerAccount = (customerId) =>
  useQuery({
    queryKey: ['customer-account', customerId],
    queryFn: () => collectionsApi.getCustomerAccount(customerId),
    enabled: Boolean(customerId),
  })
export const useCustomerLedger = (customerId) => useCustomerAccount(customerId)
export const useAgingReport = (params = {}) => useCustomerAccounts(params)
export const useOutstandingInvoices = (customerId) =>
  useQuery({
    queryKey: ['outstanding-invoices', customerId],
    queryFn: () => collectionsApi.getOutstandingInvoices(customerId),
    enabled: Boolean(customerId),
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
    onError: (e) => toast.error(errorMessage(e, 'Account action failed')),
  })
}
export const useCreateCustomerAccount = () =>
  useAccountAction(collectionsApi.createCustomerAccount, 'Customer account created')
export const useUpdateCreditLimit = () =>
  useAccountAction(
    ({ customerId, newCreditLimit }) =>
      collectionsApi.updateCustomerCreditLimit(customerId, newCreditLimit),
    'Credit limit updated'
  )
export const useHoldCustomerAccount = () =>
  useAccountAction(collectionsApi.holdCustomerAccount, 'Customer account placed on hold')
export const useReinstateCustomerAccount = () =>
  useAccountAction(collectionsApi.reinstateCustomerAccount, 'Customer account reinstated')
