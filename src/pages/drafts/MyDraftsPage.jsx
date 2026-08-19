import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import DataTable from '@components/ui/DataTable'
import PageHeader from '@components/ui/PageHeader'
import { draftsService } from '@/services/api/draftsService'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useDraftsStore } from '@/stores/draftsStore'
import { formatDateTime } from '@/utils/formatDate'

const DRAFT_TYPE_LABELS = {
  VehicleLoading: 'Vehicle Loading',
  VehicleUnloading: 'Vehicle Unloading',
  Invoice: 'Invoice',
}

const ROUTE_BY_TYPE = {
  VehicleLoading: '/inventory/vehicle-loadings/new',
  VehicleUnloading: '/inventory/vehicle-unloadings/new',
  Invoice: '/sales/invoices/new',
}

export default function MyDraftsPage() {
  const navigate = useNavigate()
  const { isOnline } = useOnlineStatus()
  const drafts = useDraftsStore((state) => state.drafts)
  const saveDraft = useDraftsStore((state) => state.saveDraft)
  const removeDraft = useDraftsStore((state) => state.removeDraft)

  const { data: serverDrafts = [] } = useQuery({
    queryKey: ['drafts', 'list'],
    queryFn: () => draftsService.listDrafts(),
    enabled: isOnline,
  })

  useEffect(() => {
    if (!serverDrafts.length) return
    const localEntries = Object.values(drafts)
    serverDrafts.forEach((serverDraft) => {
      const alreadyLocal = localEntries.some((entry) => entry.serverId === serverDraft.id)
      if (alreadyLocal) return
      let payload = {}
      try {
        payload = JSON.parse(serverDraft.payloadJson || '{}')
      } catch {
        payload = {}
      }
      saveDraft({
        id: crypto.randomUUID(),
        serverId: serverDraft.id,
        draftType: serverDraft.draftType,
        referenceId: serverDraft.referenceId || null,
        label: serverDraft.label || null,
        payload,
        clientUpdatedAt: serverDraft.clientUpdatedAt,
        syncedAt: new Date().toISOString(),
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverDrafts])

  const rows = useMemo(
    () =>
      Object.values(drafts).sort(
        (a, b) => new Date(b.clientUpdatedAt) - new Date(a.clientUpdatedAt)
      ),
    [drafts]
  )

  async function handleDiscard(entry) {
    removeDraft(entry.id)
    if (entry.serverId) {
      try {
        await draftsService.deleteDraft(entry.serverId)
      } catch {
        /* ignore */
      }
    }
    toast.success('Draft discarded.')
  }

  function handleResume(entry) {
    const path = ROUTE_BY_TYPE[entry.draftType]
    if (!path) {
      toast.error('Unable to resume this draft type.')
      return
    }
    navigate(path, { state: { resumeDraftId: entry.id } })
  }

  const columns = [
    {
      accessorKey: 'draftType',
      header: 'Type',
      cell: ({ getValue }) => DRAFT_TYPE_LABELS[getValue()] || getValue(),
    },
    {
      accessorKey: 'label',
      header: 'Label',
      cell: ({ getValue }) => getValue() || '—',
    },
    {
      accessorKey: 'clientUpdatedAt',
      header: 'Last Updated',
      cell: ({ getValue }) => formatDateTime(getValue()),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="button-secondary"
            onClick={() => handleResume(row.original)}
            style={{ height: 30 }}
          >
            Resume
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => handleDiscard(row.original)}
            style={{ height: 30 }}
          >
            Discard
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Drafts"
        subtitle="Resume in-progress Vehicle Loading, Vehicle Unloading, and Invoice work saved on this device."
      />
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        emptyTitle="No saved drafts"
        emptyDescription="Drafts are saved automatically while you work on Vehicle Loading, Vehicle Unloading, and Invoice forms."
      />
    </div>
  )
}
