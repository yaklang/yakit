import type { StoreApi } from 'zustand'
import { AIChatQSDataTypeEnum, type AIChatQSData, type ChatStoreState } from '../hooks/aiRender'
import type { QuestionDraft } from './types'

export type PanelQuestion = Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.UI_QUESTION }>

export function questionPanelOutcome(item: PanelQuestion) {
  const draft = item.uiState as QuestionDraft | undefined
  return item.data.request.state === 'submitted' ? 'submitted' : draft?.outcome || item.data.request.state
}

export function isQueuedQuestion(item: AIChatQSData | undefined): item is PanelQuestion {
  if (item?.type !== AIChatQSDataTypeEnum.UI_QUESTION) return false
  const draft = item.uiState as QuestionDraft | undefined
  const outcome = questionPanelOutcome(item)
  return outcome === 'pending' || (outcome === 'expired' && !!draft?.touched)
}

export function syncQuestionPanel(
  store: Pick<StoreApi<ChatStoreState>, 'getState'>,
  item: PanelQuestion,
  activate = false,
) {
  const state = store.getState()
  const outcome = questionPanelOutcome(item)
  const tokens = state.questionPanelTokens || []
  const keep = isQueuedQuestion(item) || (activate && outcome === 'expired')
  const next = tokens.filter((token) => token !== item.id)
  if (keep) {
    if (activate) next.unshift(item.id)
    else if (tokens.includes(item.id)) next.splice(tokens.indexOf(item.id), 0, item.id)
    else next.push(item.id)
  }
  state.updateState({ questionPanelTokens: next, questionPanelRevision: (state.questionPanelRevision || 0) + 1 })
}
