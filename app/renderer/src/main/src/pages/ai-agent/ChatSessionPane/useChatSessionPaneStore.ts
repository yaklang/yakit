import { create } from 'zustand'

interface ChatSessionPaneStore {
  visible: boolean
  setVisible: (visible: boolean) => void
  toggleVisible: () => void
}

export const useChatSessionPaneStore = create<ChatSessionPaneStore>((set, get) => ({
  visible: true,
  setVisible: (visible) => {
    if (get().visible === visible) return
    set({ visible })
  },
  toggleVisible: () => set((state) => ({ visible: !state.visible })),
}))
