import type { StoreApi } from 'zustand'
import type { AIChatQSDataTypeEnum, AIChatQSData, ChatStoreState } from '../hooks/aiRender'
import type { QuestionDraft } from './types'

export function syncQuestionPanel(
  store: Pick<StoreApi<ChatStoreState>, 'getState'>,
  item: Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.UI_QUESTION }>,
  activate = false,
) {
  const state = store.getState()
  const draft = item.uiState as QuestionDraft | undefined
  const outcome = item.data.request.state === 'submitted' ? 'submitted' : draft?.outcome || item.data.request.state
  const tokens = state.questionPanelTokens || []
  const pending = outcome === 'pending' || (outcome === 'expired' && draft?.touched)
  const keep = pending || (activate && outcome === 'expired')
  const next = tokens.filter((token) => token !== item.id)
  if (keep) {
    if (activate) next.unshift(item.id)
    else if (tokens.includes(item.id)) next.splice(tokens.indexOf(item.id), 0, item.id)
    else next.push(item.id)
  }
  state.updateState({ questionPanelTokens: next, questionPanelRevision: (state.questionPanelRevision || 0) + 1 })
}
