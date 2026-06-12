import type { AIAgentChatData, AIAgentChatMetaData } from '@/pages/ai-agent/type/aiChat'
import type { AIInputEvent, AIOutputEvent, AIStartParams } from './grpcApi'
import { createChatStore } from './chatStore'
import { Uint8ArrayToString } from '@/utils/str'
import { AIAgentSettingDefault, AIModelTypeEnum } from '@/pages/ai-agent/defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import { DefaultMemoryList, DefaultTodoListCardData } from './defaultConstant'

const { ipcRenderer } = window.require('electron')

/** 生成AI-Agent会话数据实例 */
const genAIAgentChatData = (): AIAgentChatData => {
  const defaultData: AIAgentChatData = {
    beforeID: {
      timelineID: -1,
      chatID: -1,
    },
    httpRunTimeIDs: [],
    riskRunTimeIDs: [],
    memoryList: cloneDeep(DefaultMemoryList),
    aiPerfData: {
      consumption: {
        cache_hit_token: 0,
        input_consumption: 0,
        output_consumption: 0,
        consumption_uuid: '',
        tier_consumption: {
          [AIModelTypeEnum.TierIntelligent]: {
            cache_hit_token: 0,
            input_consumption: 0,
            output_consumption: 0,
          },
          [AIModelTypeEnum.TierLightweight]: {
            cache_hit_token: 0,
            input_consumption: 0,
            output_consumption: 0,
          },
          [AIModelTypeEnum.TierVision]: {
            cache_hit_token: 0,
            input_consumption: 0,
            output_consumption: 0,
          },
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
    casualChat: {
      todoList: cloneDeep(DefaultTodoListCardData),
    },
    taskChat: {
      todoListMap: new Map(),
    },
    contents: new Map(),
  }
  return cloneDeep(defaultData)
}
/** 生成AI-Agent会话的临时记录数据 */
const genAIAgentChatMetaData = (): AIAgentChatMetaData => {
  return {
    casualMemoryList: cloneDeep(DefaultMemoryList),
    taskMemoryList: cloneDeep(DefaultMemoryList),
    systemEventUUID: [],
    focusOfTaskID: '',
    notifyMessageTimer: null,
    currentCasualTaskID: '',
    currentTaskPlanID: undefined,
    currentTaskPlanActiveNode: new Set(),
    historyReviewReleaseID: {},
    currentPlanReviewId: '',
  }
}

export class ChatMultiSessionController {
  private storePool = new Map<string, ReturnType<typeof createChatStore>>()
  private rawDataPool = new Map<string, AIAgentChatData>()
  private requestPool = new Map<string, AIStartParams>()
  private metaPool = new Map<string, AIAgentChatMetaData>()

  private readyChannels = new Set<string>()

  public ensureSession(sessionId: string) {
    if (!this.storePool.has(sessionId)) {
      this.storePool.set(sessionId, createChatStore())
      this.rawDataPool.set(sessionId, genAIAgentChatData())
      this.requestPool.set(sessionId, cloneDeep(AIAgentSettingDefault))
      this.metaPool.set(sessionId, genAIAgentChatMetaData())
    }
    return {
      store: this.storePool.get(sessionId)!,
      rawData: this.rawDataPool.get(sessionId)!,
      request: this.requestPool.get(sessionId)!,
      meta: this.metaPool.get(sessionId)!,
    }
  }

  /** UI 层建立连接时，登记并绑定当前渲染周期的 UI 状态操纵函数 */
  public registerActiveChannel(sessionId: string) {
    this.readyChannels.add(sessionId)
  }

  /** 主动向grpc发送请求 */
  public sendMessage(sessionId: string, request: AIInputEvent) {
    if (!this.readyChannels.has(sessionId)) {
      console.warn(`[大管家] 会话 ${sessionId} 未 Ready，请求已进队列排队...`)
      return
    }

    ipcRenderer.invoke('send-ai-re-act', sessionId, request)
  }

  // 💥 核心替换：完美接管原 useChatIPC 里的巨型数据分发逻辑！
  public handleGrpcOutputEvent(sessionId: string, res: AIOutputEvent) {
    const { store, rawData, request, meta } = this.ensureSession(sessionId)

    if (res.Type === 'pong') {
      const { createChatQuestion } = meta
      if (createChatQuestion) {
        this.sendMessage(sessionId, createChatQuestion)
        meta.createChatQuestion = undefined
        store.getState().updateState({ casualTitle: '等待回复中...' })
      } else {
        // 调用历史数据恢复方法
      }
    }

    const state = store.getState()
    const ipcContent = res.Content ? Uint8ArrayToString(res.Content) : ''
    let parsedData = null
    try {
      parsedData = ipcContent ? JSON.parse(ipcContent) : null
    } catch (e) {}

    // 1. ================== 高频流水与静默内存数据 ==================
    if (res.Type === 'yak_httpflow_count' && !res.IsSync) {
      rawData.httpRunTimeIDs.add(parsedData.runtime_id)
      state.bumpHttpVersion() // 敲打版本号驱动 UI
      return
    }
    if (res.Type === 'yak_risk_count' && !res.IsSync) {
      rawData.riskRunTimeIDs.add(parsedData.runtime_id)
      state.bumpRiskVersion()
      return
    }
    if (res.Type === 'memory_context') {
      rawData.memoryList = parsedData // 静默落入内存
      return
    }

    // 2. ================== 状态树与骨架 UI 数据 ==================
    if (['filesystem_pin_directory', 'filesystem_pin_filename'].includes(res.Type) && !res.IsSync) {
      state.upsertGrpcFolder({ path: parsedData.path, isFolder: res.Type === 'filesystem_pin_directory' })
      return
    }
    if (res.Type === 'structured' && res.NodeId === 'timeline_item' && !res.IsSync) {
      state.pushTimeline(parsedData)
      return
    }
    if (res.Type === 'start_plan_and_execution' && !res.IsSync) {
      meta.currentCoordinatorId = parsedData.coordinator_id
      state.updateTaskStatus({ loading: true, plan: '加载中...' })
      return
    }

    // 3. ================== 卡片流式与最终态分发 ==================
    const chatType = meta.currentCoordinatorId === res.CoordinatorId ? 'task' : 'casual'

    if (res.Type === 'stream') {
      this.appendStreamChunk(sessionId, {
        token: res.NodeId,
        textChunk: Uint8ArrayToString(res.StreamDelta),
        nodeType: res.IsSystem ? 'system' : 'assistant',
        chatType,
      })
      return
    }

    // 如果是完整的业务卡片节点 (将原 grpcAIMessageHandlers 的逻辑挂载到此处)
    // this.routeChatAction(sessionId, chatType, res);
  }

  // 流式追加 (代码不变)
  public appendStreamChunk(
    sessionId: string,
    params: { token: string; textChunk: string; nodeType: string; chatType: 'casual' | 'task' },
  ) {
    // ... 无脑写入 rawData.contents.get(token) 并调 incrementNodeVersion 触发原子重绘 ...
  }
}

export const globalSessionEngine = new ChatMultiSessionController()
