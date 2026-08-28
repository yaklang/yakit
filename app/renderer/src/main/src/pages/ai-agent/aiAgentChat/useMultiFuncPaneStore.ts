import { create } from 'zustand'

export type MultiFuncPaneTab = 'task-list' | 'timeline'

interface MultiFuncPaneStore {
  visible: boolean
  tab: MultiFuncPaneTab
  setVisible: (visible: boolean) => void
  toggleVisible: () => void
  setTab: (tab: MultiFuncPaneTab) => void
  openWithTab: (tab: MultiFuncPaneTab) => void
}

export const useMultiFuncPaneStore = create<MultiFuncPaneStore>((set, get) => ({
  visible: false,
  tab: 'task-list',
  setVisible: (visible) => {
    if (get().visible === visible) return
    set({ visible })
  },
  toggleVisible: () => set((state) => ({ visible: !state.visible })),
  setTab: (tab) => {
    if (get().tab === tab) return
    set({ tab })
  },
  openWithTab: (tab) => set({ visible: true, tab }),
}))
