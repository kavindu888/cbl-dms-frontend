import { create } from 'zustand'

export const useConfirmStore = create((set) => ({
  isOpen: false,
  message: '',
  options: {},
  resolveRef: null,

  confirm: (message, options = {}) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        message,
        options,
        resolveRef: resolve,
      })
    })
  },

  onConfirm: () => {
    set((state) => {
      if (state.resolveRef) {
        state.resolveRef(true)
      }
      return { isOpen: false, resolveRef: null }
    })
  },

  onCancel: () => {
    set((state) => {
      if (state.resolveRef) {
        state.resolveRef(false)
      }
      return { isOpen: false, resolveRef: null }
    })
  },
}))
