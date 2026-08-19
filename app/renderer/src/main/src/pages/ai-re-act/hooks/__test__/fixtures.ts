import cloneDeep from 'lodash/cloneDeep'
import type { AIAgentChatData, AIAgentChatMetaData } from '@/pages/ai-agent/type/aiChat'
import { AIAgentSettingDefault, AIModelTypeEnum } from '@/pages/ai-agent/defaultConstant'
import { DefaultMemoryList, DefaultTaskPlanEndGate } from '../defaultConstant'
import { createChatStore } from '../chatStore'
import type { AIMessageHandlerParams } from '../type'
import type { AIOutputEvent, AIStartParams } from '../grpcApi'
import type { ChatListRenderType } from '../aiRender'

const emptyTierConsumption = {
  cache_hit_token: 0,
  input_consumption: 0,
  output_consumption: 0,
}

/** 与 Controller 内 genAIAgentChatData 对齐的最小会话 rawData */
export const createTestRawData = (): AIAgentChatData => {
  const defaultData: AIAgentChatData = {
    httpFuzzRequest: undefined,
    httpFlowFuzzStatus: undefined,
    sessionTitle: '',
    memoryList: DefaultMemoryList,
    systemStream: '',
    yaklangCodeChange: undefined,
    grpcOffset: 0,
    timelineBeforeId: 0,
    timelineNoMore: false,
    httpRunTimeIDs: [],
    riskRunTimeIDs: [],
    aiPerfData: {
      consumption: {
        cache_hit_token: 0,
        input_consumption: 0,
        output_consumption: 0,
        consumption_uuid: '',
        tier_consumption: {
          [AIModelTypeEnum.TierIntelligent]: { ...emptyTierConsumption },
          [AIModelTypeEnum.TierLightweight]: { ...emptyTierConsumption },
          [AIModelTypeEnum.TierVision]: { ...emptyTierConsumption },
        },
      },
      pressure: {
        [AIModelTypeEnum.TierIntelligent]: [],
        [AIModelTypeEnum.TierLightweight]: [],
        [AIModelTypeEnum.TierVision]: [],
      },
      firstCost: {
        [AIModelTypeEnum.TierIntelligent]: [],
        [AIModelTypeEnum.TierLightweight]: [],
        [AIModelTypeEnum.TierVision]: [],
      },
      totalCost: {
        [AIModelTypeEnum.TierIntelligent]: [],
        [AIModelTypeEnum.TierLightweight]: [],
        [AIModelTypeEnum.TierVision]: [],
      },
      contextStats: {
        prompt_bytes: 0,
        prompt_tokens: 0,
        data: {
          times: [],
          total_prompt_bytes: [],
          total_prompt_tokens: [],
          role_order: [],
          role_labels: {},
          role_series: {},
          role_tokens: {},
        },
      },
      contextSections: { summary: new Map(), sections: [] },
    },
    taskDetailsMap: new Map(),
    contents: new Map(),
  }
  return cloneDeep(defaultData)
}

/** 与 Controller 内 genAIAgentChatMetaData 对齐 */
export const createTestMeta = (): AIAgentChatMetaData => ({
  createChatQuestion: undefined,
  restoreAsRunning: false,
  onEnd: undefined,
  pingSyncID: '',
  pingTimer: null,
  casualMemoryList: cloneDeep(DefaultMemoryList),
  taskMemoryList: cloneDeep(DefaultMemoryList),
  notifyMessageTimer: null,
  currentTaskPlanActiveNode: new Set(),
  taskPlanEndGate: cloneDeep(DefaultTaskPlanEndGate),
  currentPlanReviewExtraId: '',
  planReviewExtraData: new Map(),
  toolStderrStreamData: new Map(),
  systemEventUUID: [],
  cardKVPair: new Map(),
  cardKVPaidTimer: null,
  execFileRecordOrder: 1,
  syncIDMap: new Map(),
  queuePollingEmptyCount: 0,
  queuePollingTimer: null,
  memoryPollingTimer: null,
  casualSubTaskIDs: new Set(),
})

export const createTestSession = (sessionId = 'test-session') => {
  const store = createChatStore()
  const rawData = createTestRawData()
  const meta = createTestMeta()
  const request = cloneDeep(AIAgentSettingDefault) as AIStartParams
  return { sessionId, store, rawData, meta, request }
}

export const makeGrpcRes = (partial: Partial<AIOutputEvent> & { Type: string }): AIOutputEvent => {
  const { Content: partialContent, Type, ...rest } = partial

  return {
    ID: 0,
    CoordinatorId: '',
    NodeId: '',
    TaskIndex: '',
    TaskId: '',
    IsSystem: false,
    IsStream: false,
    IsReason: false,
    IsJson: false,
    IsResult: false,
    IsSync: false,
    DisableMarkdown: false,
    SyncID: '',
    EventUUID: 'evt-1',
    StreamDelta: new Uint8Array(),
    Timestamp: 1700000000,
    CallToolID: '',
    AIService: 'test-ai',
    AIModelName: 'test-model',
    ContentType: '',
    NodeIdVerbose: { Zh: '', En: '' },
    ...rest,
    Type,
    Content: partialContent ?? new Uint8Array(),
  }
}

/** Content 为 JSON 对象时的便捷构造 */
export const makeGrpcJsonRes = (type: string, content: unknown, extra: Partial<AIOutputEvent> = {}): AIOutputEvent => {
  const { Content: _ignored, Type: _ignoredType, ...restExtra } = extra
  return makeGrpcRes({
    ...restExtra,
    Type: type,
    Content: new TextEncoder().encode(JSON.stringify(content)),
  })
}

export const makeHandlerRequest = (
  partial: Partial<AIMessageHandlerParams> & { res: AIOutputEvent },
): AIMessageHandlerParams => {
  const base = createTestSession(partial.sessionId || 'handler-session')
  return {
    sessionId: base.sessionId,
    store: base.store,
    rawData: base.rawData,
    meta: base.meta,
    request: base.request,
    chatType: (partial.chatType || 'reAct') as ChatListRenderType,
    sendRequest: partial.sendRequest || (() => undefined),
    pushLog: partial.pushLog || (() => undefined),
    ...partial,
    res: partial.res,
  }
}
