import type { AIMessageHandler } from '../type'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '../aiRender'
import { Uint8ArrayToString } from '@/utils/str'
import { genBaseAIChatData } from '../utils'
import { persistGetSessionContent, persistIndependentItem } from '../persist/contentPersistHelper'
import type { QuestionRequest } from '../../interactive-ui/types'

const handleInteractiveUI: AIMessageHandler = async (info) => {
  const { res, rawData, store, sessionId } = info
  const payload = JSON.parse(Uint8ArrayToString(res.Content))
  const isQuestion = res.Type === 'ui_question'
  const id = isQuestion ? `ui-question:${payload.id}` : payload.taskId || `ui-message:${payload.id}`
  if (!payload.id) return
  const previous = rawData.contents.get(id) || (await persistGetSessionContent(sessionId, id))
  // History is paginated backwards. Do not replace a newer snapshot with an older one.
  if (previous && (previous as AIChatQSData & { uiEventId?: number }).uiEventId! >= res.ID) return
  const item: AIChatQSData & { uiEventId: number } = {
    ...genBaseAIChatData(res),
    id,
    chatType: 'reAct',
    uiEventId: res.ID,
    uiState: previous?.uiState,
    ...(isQuestion
      ? { type: AIChatQSDataTypeEnum.UI_QUESTION, data: { request: payload as QuestionRequest, sessionId } }
      : { type: AIChatQSDataTypeEnum.QUESTION, data: payload.text as string, interactionMetadata: payload.metadata }),
  }
  rawData.contents.set(id, item)
  persistIndependentItem(sessionId, item, info.meta.lifecycle)
  store.getState().dispatchStreamingNode({
    chatType: 'reAct',
    node: { token: id, kind: 'item', type: item.type, isHistory: res.IsSync },
  })
  if (previous) store.getState().incrementNodeVersion(id, 'item')
}

export const aiInteractiveUIHandlers: Record<string, AIMessageHandler> = {
  ui_question: handleInteractiveUI,
  user_message: handleInteractiveUI,
}
