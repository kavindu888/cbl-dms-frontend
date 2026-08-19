import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { draftsService } from '@/services/api/draftsService'
import { useDraftsStore } from '@/stores/draftsStore'
import { useDebounce } from './useDebounce'
import { useOnlineStatus } from './useOnlineStatus'

const LOCAL_SAVE_DELAY = 1200
const SERVER_PUSH_DELAY = 10000
const MAX_PAYLOAD_CHARS = 100000

export function useAutosaveDraft({ draftType, referenceId, getSnapshot, label, enabled = true }) {
  const saveDraft = useDraftsStore((state) => state.saveDraft)
  const removeDraft = useDraftsStore((state) => state.removeDraft)
  const { isOnline } = useOnlineStatus()
  const upsertMutation = useMutation({ mutationFn: draftsService.upsertDraft })

  const localIdRef = useRef(null)
  if (!localIdRef.current) {
    const existing = useDraftsStore.getState().getLatestByType(draftType)
    localIdRef.current = existing?.id || crypto.randomUUID()
  }
  const existingEntry = useDraftsStore.getState().drafts[localIdRef.current] || null

  const [status, setStatus] = useState(existingEntry ? 'saved' : 'idle')
  const [lastSavedAt, setLastSavedAt] = useState(existingEntry?.clientUpdatedAt || null)

  const serverIdRef = useRef(existingEntry?.serverId || null)
  const referenceIdRef = useRef(referenceId)
  referenceIdRef.current = referenceId
  const labelRef = useRef(label)
  labelRef.current = label
  const isOnlineRef = useRef(isOnline)
  isOnlineRef.current = isOnline
  const dirtyRef = useRef(Boolean(existingEntry && !existingEntry.serverId))
  const lastSnapshotJsonRef = useRef(null)
  const pushTimerRef = useRef(null)
  const mountedRef = useRef(true)

  const snapshot = enabled && typeof getSnapshot === 'function' ? getSnapshot() : null
  const snapshotJson = snapshot ? JSON.stringify(snapshot) : null
  const debouncedSnapshotJson = useDebounce(snapshotJson, LOCAL_SAVE_DELAY)

  async function flushPush() {
    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current)
      pushTimerRef.current = null
    }
    if (!dirtyRef.current) return
    if (!isOnlineRef.current) {
      if (mountedRef.current) setStatus('offline')
      return
    }
    const id = localIdRef.current
    const draft = useDraftsStore.getState().drafts[id]
    if (!draft) return
    try {
      const result = await upsertMutation.mutateAsync({
        id: serverIdRef.current || undefined,
        draftType,
        referenceId: draft.referenceId || null,
        label: draft.label || null,
        payloadJson: JSON.stringify(draft.payload || {}).slice(0, MAX_PAYLOAD_CHARS),
        clientUpdatedAt: draft.clientUpdatedAt,
      })
      serverIdRef.current = result?.id || serverIdRef.current
      dirtyRef.current = false
      saveDraft({ id, serverId: serverIdRef.current, syncedAt: new Date().toISOString() })
      if (mountedRef.current) setStatus('saved')
    } catch {
      if (mountedRef.current) setStatus('error')
    }
  }

  const flushPushRef = useRef(flushPush)
  flushPushRef.current = flushPush

  function schedulePush() {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      flushPushRef.current()
    }, SERVER_PUSH_DELAY)
  }

  useEffect(() => {
    if (debouncedSnapshotJson === null) return
    if (lastSnapshotJsonRef.current === null) {
      lastSnapshotJsonRef.current = debouncedSnapshotJson
      return
    }
    if (debouncedSnapshotJson === lastSnapshotJsonRef.current) return
    lastSnapshotJsonRef.current = debouncedSnapshotJson

    const id = localIdRef.current
    const now = new Date().toISOString()
    saveDraft({
      id,
      serverId: serverIdRef.current,
      draftType,
      referenceId: referenceIdRef.current || null,
      label: labelRef.current || null,
      payload: JSON.parse(debouncedSnapshotJson),
      clientUpdatedAt: now,
      syncedAt: useDraftsStore.getState().drafts[id]?.syncedAt || null,
    })
    dirtyRef.current = true
    setLastSavedAt(now)
    setStatus(isOnlineRef.current ? 'saved' : 'offline')
    schedulePush()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSnapshotJson])

  useEffect(() => {
    if (isOnline) flushPushRef.current()
  }, [isOnline])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') flushPushRef.current()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    if (dirtyRef.current) schedulePush()
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
      flushPushRef.current()
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function discardDraft() {
    const id = localIdRef.current
    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current)
      pushTimerRef.current = null
    }
    dirtyRef.current = false
    removeDraft(id)
    const serverId = serverIdRef.current
    serverIdRef.current = null
    if (serverId) {
      draftsService.deleteDraft(serverId).catch(() => {})
    }
    lastSnapshotJsonRef.current = null
    if (mountedRef.current) {
      setStatus('idle')
      setLastSavedAt(null)
    }
  }

  const pendingLocalSave =
    enabled && snapshotJson !== null && snapshotJson !== debouncedSnapshotJson
  const displayedStatus = pendingLocalSave || upsertMutation.isPending ? 'saving' : status

  return {
    status: displayedStatus,
    lastSavedAt,
    discardDraft,
    localDraftId: localIdRef.current,
  }
}
