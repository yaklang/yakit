import { create } from 'zustand'

interface ChatSecondaryPaneStore {
  visible: boolean
  setVisible: (visible: boolean) => void
  toggleVisible: () => void
}

export const useChatSecondaryPaneStore = create<ChatSecondaryPaneStore>((set, get) => ({
  visible: false,
  setVisible: (visible) => {
    if (get().visible === visible) return
    set({ visible })
  },
  toggleVisible: () => set((state) => ({ visible: !state.visible })),
}))
