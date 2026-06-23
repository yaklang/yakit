import type { AIAgentChatData, AIAgentChatMetaData } from '@/pages/ai-agent/type/aiChat'
import type { AIAgentGrpcApi, AIInputEvent, AIOutputEvent, AIStartParams } from './grpcApi'
import { createChatStore } from './chatStore'
import { Uint8ArrayToString } from '@/utils/str'
import { AIAgentSettingDefault, AIModelTypeEnum } from '@/pages/ai-agent/defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import { DefaultMemoryList, DefaultTodoListCardData } from './defaultConstant'
import { grpcAIMessageHandlers } from './grpcStreamHandler/grpcAIOutputEventHandlers'
import { genExecTasks, handleGrpcDataPushLog } from './utils'
import type { AIChatIPCStartParams, AIChatSendParams } from './type'
import { yakitNotify } from '@/utils/notification'
import { AIChatQSDataTypeEnum, AIReviewType } from './aiRender'
import { aiAgentLogEmitter } from './AIAgentLogEmitter'

const { ipcRenderer } = window.require('electron')

/** 生成AI-Agent会话数据实例 */
const genAIAgentChatData = (): AIAgentChatData => {
  const defaultData: AIAgentChatData = {
    httpFuzzRequest: undefined,
    httpFlowFuzzStatus: undefined,
    sessionTitle: '',
    memoryList: cloneDeep(DefaultMemoryList),
    systemStream: '',
    yaklangCodeChange: undefined,

    beforeID: {
      timelineID: -1,
      chatID: -1,
    },

    httpRunTimeIDs: [],
    riskRunTimeIDs: [],
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
    createChatQuestion: undefined,
    casualMemoryList: cloneDeep(DefaultMemoryList),
    taskMemoryList: cloneDeep(DefaultMemoryList),
    focusOfTaskID: '',
    notifyMessageTimer: null,
    currentCasualTaskID: '',
    currentTaskPlanID: undefined,
    currentTaskPlanActiveNode: new Set(),
    historyReviewReleaseID: {},
    currentPlanReviewId: '',
    reviewData: new Map(),
    planReviewExtraData: new Map(),
    toolStderrStreamData: new Map(),
    systemEventUUID: [],
    cardKVPair: new Map(),
    cardKVPaidTimer: null,
    execFileRecordOrder: 1,
  }
}

export class ChatMultiSessionController {
  private storePool = new Map<string, ReturnType<typeof createChatStore>>()
  private rawDataPool = new Map<string, AIAgentChatData>()
  private requestPool = new Map<string, AIStartParams>()
  private metaPool = new Map<string, AIAgentChatMetaData>()

  private readyChannels = new Set<string>()

  /** 获取对应会话的所有数据集 */
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

  /** 建立指定session会话的连接 */
  public handleStartSession(sessionId: string, requestParams: AIChatIPCStartParams, cb?: () => void) {
    const { params } = requestParams
    const { request, meta } = this.ensureSession(sessionId)
    if (params.Params?.UserQuery) {
      meta.createChatQuestion = {
        IsFreeInput: true,
        FreeInput: params.Params.UserQuery,
        AttachedResourceInfo: params.AttachedResourceInfo,
        FocusModeLoop: params.FocusModeLoop,
      }
    }
    Object.assign(request, params.Params)
    meta.onSessionStartSuccess = cb

    ipcRenderer.invoke('start-ai-re-act', sessionId, params)
  }

  /** 主动向grpc发送请求 */
  public handleSendMessage(payload: AIChatSendParams) {
    try {
      const { token, type, params, optionValue, extraValue } = payload
      const isExist = this.readyChannels.has(token)
      if (!isExist) {
        yakitNotify('warning', `[大管家] 会话 ${token} 未 Ready，请求已进队列排队...`)
        return
      }

      const { store, rawData, meta } = this.ensureSession(token)
      if (params.IsFreeInput) {
        store.getState().updateState({ casualTitle: '等待回复中...' })
      }

      switch (type) {
        case 'casual':
          if (params.IsInteractiveMessage && params.InteractiveId) {
            const review = meta.reviewData.get(params.InteractiveId)
            if (!review) {
              yakitNotify('error', '未获取到 review 信息, 操作无效')
              return
            }

            ;(review.data as AIReviewType).selected = params.InteractiveJSONInput
            ;(review.data as AIReviewType).optionValue = optionValue

            const chatData = cloneDeep(review)
            meta.reviewData.delete(params.InteractiveId)
            rawData.contents.set(params.InteractiveId, chatData)
            store.getState().incrementNodeVersion(params.InteractiveId, 'item')
          }
          break
        case 'task':
          if (params.IsInteractiveMessage && params.InteractiveId) {
            const review = meta.reviewData.get(params.InteractiveId)
            if (!review) {
              yakitNotify('error', '未获取到 review 信息, 操作无效')
              return
            }

            ;(review.data as AIReviewType).selected = params.InteractiveJSONInput
            ;(review.data as AIReviewType).optionValue = optionValue

            const chatData = cloneDeep(review)
            if (chatData.type === AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE) {
              const tasks = chatData.data
              const plans = genExecTasks(tasks.plans.root_task)
              store.getState().updatePlanTree({
                task_tree: cloneDeep(plans),
                root_task_name: tasks.plans.root_task.name,
              })
            }
            meta.reviewData.delete(params.InteractiveId)
            rawData.contents.set(params.InteractiveId, chatData)
            store.getState().dispatchStreamingNode({
              chatType: 'reAct',
              node: {
                token: chatData.id,
                kind: 'item',
                type: chatData.type,
                dataOrigin: 'grpc_realtime_data',
              },
              groupTokenGenerator: () => '',
            })
          }
          break

        default:
          this.requestMessage(token, params)
          break
      }
    } catch (error) {}
  }
  /** 向连接中的会话发送请求 */
  private requestMessage(sessionId: string, request: AIInputEvent) {
    ipcRenderer.invoke('send-ai-re-act', sessionId, request)
  }

  // 💥 核心替换：完美接管原 useChatIPC 里的巨型数据分发逻辑！
  public handleGrpcOutputEvent(sessionId: string, res: AIOutputEvent) {
    // 所有数据，均抄送一份到日志中
    handleGrpcDataPushLog({ info: res, pushLog: () => {} })

    const { store, rawData, request, meta } = this.ensureSession(sessionId)

    if (res.Type === 'pong') {
      const { createChatQuestion } = meta
      if (createChatQuestion) {
        this.requestMessage(sessionId, createChatQuestion)
        meta.createChatQuestion = undefined
        store.getState().updateState({ casualTitle: '等待回复中...' })
      } else {
        // 调用历史数据恢复方法
      }
      meta?.onSessionStartSuccess?.()
      return
    }

    if (res.Type === 'structured') {
      let ipcContent = Uint8ArrayToString(res.Content) || ''
      const obj = JSON.parse(ipcContent) || ''

      if (obj?.level) {
        // 日志类型数据
        const data = obj as AIAgentGrpcApi.Log
        aiAgentLogEmitter.dispatch({
          session: sessionId,
          type: 'log',
          Timestamp: res.Timestamp,
          log: data,
        })
        return
      }
    }

    let funcKey = res.Type
    if (
      res.Type === 'structured' &&
      [
        'session_title',
        'timeline_item',
        'react_task_enqueue',
        'react_task_dequeue',
        'queue_info',
        'react_task_status_changed',
        'status',
        'stream-finished',
      ].includes(res.NodeId)
    ) {
      funcKey = res.NodeId
    } else if (res.Type === 'api_request_failed' && res.NodeId === 'ai_call_failure') {
      funcKey = res.NodeId
    } else if (res.Type === 'report_finish' || res.NodeId === 'report-finish') {
      funcKey = res.NodeId
    } else if (res.Type === 'structured' && res.NodeId === 'system') {
      const ipcContent = Uint8ArrayToString(res.Content) || ''
      const data = JSON.parse(ipcContent) || ''
      if (data && typeof data === 'object' && data?.type === 'push_task') {
        funcKey = 'push_task'
      } else if (data && typeof data === 'object' && data?.type === 'pop_task') {
        funcKey = 'pop_task'
      }
    }
    const handleFunc = grpcAIMessageHandlers[funcKey || '']
    if (handleFunc) {
      handleFunc({
        res,
        chatType: meta.currentTaskPlanID?.coordinatorId === res.CoordinatorId ? 'task' : 'reAct',
        store,
        rawData,
        request,
        meta,
        pushLog: () => {},
        sendRequest: (request) => this.requestMessage(sessionId, request),
      })
      return
    }
  }

  // 监听 session-error 事件
  public handleSessionError(sessionId: string, error: any) {}
  // 监听 session-end 事件
  public handleSessionEnd(sessionId: string, res: any) {}

  /** 关闭指定session的连接 */
  public forceCloseSession(sessionId: string) {
    ipcRenderer.invoke('cancel-ai-re-act', sessionId).catch(() => {})
    // ipcRenderer.removeAllListeners(`${sessionId}-data`)
    //   ipcRenderer.removeAllListeners(`${sessionId}-end`)
    //   ipcRenderer.removeAllListeners(`${sessionId}-error`)

    this.readyChannels.delete(sessionId)
    // crossWindowEmitter.clearSessionBuffer(sessionId) // 清理日志内容
  }
}

export const globalSessionEngine = new ChatMultiSessionController()
