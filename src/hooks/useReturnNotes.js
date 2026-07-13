import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { purchasingService } from '@/services/api/purchasingService'
import { ReturnNoteStatus } from '@/types/purchasing.types'

function errorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.message ?? error?.message ?? fallback
}

export function useReturnNotes(params = {}) {
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const stableParams = useMemo(() => params, [JSON.stringify(params)])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await purchasingService.listReturnNotes({ page: 1, pageSize: 100, ...stableParams })
      setNotes(result?.items || [])
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load return notes.'))
      setNotes([])
    } finally {
      setIsLoading(false)
    }
  }, [stableParams])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { notes, isLoading, error, refetch }
}

export function usePendingReturnNotes(params = {}) {
  return useReturnNotes({ ...params, status: ReturnNoteStatus.Submitted })
}

export function useReturnNote(id) {
  const [note, setNote] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [error, setError] = useState('')

  const refetch = useCallback(async () => {
    if (!id) {
      setNote(null)
      setIsLoading(false)
      return null
    }
    setIsLoading(true)
    setError('')
    try {
      const result = await purchasingService.getReturnNote(id)
      setNote(result)
      return result
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load the return note.'))
      setNote(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { note, setNote, isLoading, error, refetch }
}

function useMutation(action, successMessage) {
  const [isPending, setIsPending] = useState(false)
  const mutateAsync = useCallback(
    async (...args) => {
      setIsPending(true)
      try {
        const result = await action(...args)
        if (successMessage) toast.success(typeof successMessage === 'function' ? successMessage(result) : successMessage)
        return result
      } catch (error) {
        toast.error(errorMessage(error))
        throw error
      } finally {
        setIsPending(false)
      }
    },
    [action, successMessage]
  )

  return { mutateAsync, isPending }
}

export function useCreateReturnNote() {
  return useMutation((payload) => purchasingService.createReturnNote(payload), 'Return note draft saved.')
}

export function useAddReturnNoteItem() {
  return useMutation((id, payload) => purchasingService.addReturnNoteItem(id, payload), 'Return item saved.')
}

export function useUpdateReturnNoteItem() {
  return useMutation((id, itemId, payload) => purchasingService.updateReturnNoteItem(id, itemId, payload), 'Return item updated.')
}

export function useRemoveReturnNoteItem() {
  return useMutation((id, itemId) => purchasingService.removeReturnNoteItem(id, itemId), 'Return item removed.')
}

export function useSubmitReturnNote() {
  return useMutation((id) => purchasingService.submitReturnNote(id), 'Return note submitted.')
}

export function useApproveReturnNote() {
  return useMutation((id) => purchasingService.approveReturnNote(id), 'Return note approved.')
}

export function useRejectReturnNote() {
  return useMutation((id, reason) => purchasingService.rejectReturnNote(id, reason), 'Return note rejected.')
}

export function useCompleteReturnNote() {
  return useMutation((id, payload) => purchasingService.completeReturnNote(id, payload), 'Return note completed.')
}

export function useCancelReturnNote() {
  return useMutation((id, reason) => purchasingService.cancelReturnNote(id, reason), 'Return note cancelled.')
}
