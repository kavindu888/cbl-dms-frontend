import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useDraftsStore = create()(
  persist(
    (set, get) => ({
      drafts: {},

      saveDraft: (entry) => {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [entry.id]: { ...state.drafts[entry.id], ...entry },
          },
        }))
      },

      removeDraft: (id) => {
        set((state) => {
          const drafts = { ...state.drafts }
          delete drafts[id]
          return { drafts }
        })
      },

      removeDraftsByType: (draftType) => {
        set((state) => {
          const drafts = {}
          Object.values(state.drafts).forEach((draft) => {
            if (draft.draftType !== draftType) drafts[draft.id] = draft
          })
          return { drafts }
        })
      },

      listByType: (draftType) => {
        return Object.values(get().drafts)
          .filter((draft) => draft.draftType === draftType)
          .sort((a, b) => new Date(b.clientUpdatedAt) - new Date(a.clientUpdatedAt))
      },

      getLatestByType: (draftType) => {
        return get().listByType(draftType)[0] || null
      },
    }),
    {
      name: 'cbl-drafts-store',
    }
  )
)
