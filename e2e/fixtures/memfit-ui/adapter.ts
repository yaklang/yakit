import { createStore } from 'zustand/vanilla'
import { syncQuestionPanel } from '@/pages/ai-re-act/interactive-ui/questionPanel'
import type { AIChatQSData, ChatStoreState } from '@/pages/ai-re-act/hooks/aiRender'

// Only the session/transport boundary is replaced. Renderers, schemas and controls are real.
export const contents = new Map<string, AIChatQSData>()
export const messages: any[] = []
export const store = createStore<ChatStoreState>()(
  (set) =>
    ({
      questionPanelTokens: [],
      questionPanelRevision: 0,
      updateState: (next: any) => set(next),
    }) as ChatStoreState,
)
export const useCurrentStore = () => store
export const useCurrentRawData = () => ({ contents })
export const globalSessionEngine = {
  async sendUIInteraction(_sessionId: string, event: any) {
    messages.push(event)
    // Keep a real pending window to exercise rapid clicks and disabled controls.
    await new Promise((resolve) => setTimeout(resolve, 80))
    if (event.SyncJsonInput) {
      const { operation, requestId } = JSON.parse(event.SyncJsonInput)
      const item = contents.get(`ui-question:${requestId}`) as any
      if (item && operation === 'expire') {
        item.data.request.state = 'expired'
        syncQuestionPanel(store, item)
      }
    }
  },
  persistUIState(_sessionId: string, item: any, draft: any) {
    item.uiState = draft
    if (item.data.request) syncQuestionPanel(store, item)
  },
  openQuestion(item: any) {
    item.uiState = { answers: {}, page: 0, ...item.uiState, collapsed: false, touched: true }
    syncQuestionPanel(store, item, true)
  },
}
