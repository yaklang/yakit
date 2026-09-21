import { createContext } from 'react'

export interface ChatIPCContextValue {
  store: any
  dispatcher: any
}

export const defaultDispatcherOfChatIPC = {
  chatIPCEvents: {
    fetchChatDataStore: () => undefined,
  },
  handleSendCasual: () => {},
  handleSendTask: () => {},
  handleSend: () => {},
  handleStop: () => {},
  handleSendSyncMessage: () => {},
  handleSendConfigHotpatch: () => {},
}

export default createContext<ChatIPCContextValue>({
  store: {
    chatIPCData: {},
    reviewInfo: undefined,
    planReviewTreeKeywordsMap: new Map(),
    reviewExpand: false,
  },
  dispatcher: defaultDispatcherOfChatIPC,
})
