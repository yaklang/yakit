import type { AIMessageHandler, AIMessageHandlerParams } from '../type'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '../aiRender'
import { Uint8ArrayToString } from '@/utils/str'
import { genBaseAIChatData } from '../utils'
import { persistGetSessionContent, persistIndependentItem } from '../persist/contentPersistHelper'
import type { QuestionRequest, UISubmission } from '../../interactive-ui/types'
import { recordComponentSubmission } from './aiComponentUI'

const acceptedQuestions = new WeakMap<object, Map<string, UISubmission>>()
async function recordQuestionSubmission(info: AIMessageHandlerParams, receipt?: UISubmission) {
  if (receipt?.source !== 'questionnaire' || !receipt.requestId) return
  let cache = acceptedQuestions.get(info.rawData.contents)
  if (!cache) {
    cache = new Map()
    acceptedQuestions.set(info.rawData.contents, cache)
  }
  cache.set(receipt.requestId, receipt)
  const token = `ui-question:${receipt.requestId}`
  const previous = info.rawData.contents.get(token) || (await persistGetSessionContent(info.sessionId, token))
  if (!info.meta.lifecycle.current || previous?.type !== AIChatQSDataTypeEnum.UI_QUESTION) return
  previous.data.request = {
    ...previous.data.request,
    state: 'submitted',
    touched: true,
    deadline: undefined,
    answers: receipt.answers,
  }
  info.rawData.contents.set(token, previous)
  persistIndependentItem(info.sessionId, previous, info.meta.lifecycle)
  info.store.getState().incrementNodeVersion(token, 'item')
}

const handleInteractiveUI: AIMessageHandler = async (info) => {
  const { res, rawData, store, sessionId } = info
  const payload = JSON.parse(Uint8ArrayToString(res.Content))
  const isQuestion = res.Type === 'ui_question'
  const id = isQuestion ? `ui-question:${payload.id}` : payload.taskId || `ui-message:${payload.id}`
  if (!payload.id) return
  if (!isQuestion) {
    await recordComponentSubmission(info, payload.metadata)
    await recordQuestionSubmission(info, payload.metadata)
  }
  const previous = rawData.contents.get(id) || (await persistGetSessionContent(sessionId, id))
  if (!info.meta.lifecycle.current) return
  // History is paginated backwards. Do not replace a newer snapshot with an older one.
  if (previous && (previous as AIChatQSData & { uiEventId?: number }).uiEventId! >= res.ID) return
  const accepted = isQuestion ? acceptedQuestions.get(rawData.contents)?.get(payload.id) : undefined
  const previousRequest = previous?.type === AIChatQSDataTypeEnum.UI_QUESTION ? previous.data.request : undefined
  const request: QuestionRequest =
    accepted || previousRequest?.state === 'submitted'
      ? {
          ...payload,
          state: 'submitted',
          touched: true,
          deadline: undefined,
          answers: accepted?.answers || previousRequest?.answers,
        }
      : payload
  const item: AIChatQSData & { uiEventId: number } = {
    ...genBaseAIChatData(res),
    id,
    chatType: 'reAct',
    uiEventId: res.ID,
    uiState: previous?.uiState,
    ...(isQuestion
      ? { type: AIChatQSDataTypeEnum.UI_QUESTION, data: { request, sessionId } }
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
