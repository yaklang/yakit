import type { AIAgentChatData, AIAgentChatMetaData } from '@/pages/ai-agent/type/aiChat'
import {
  AIInputEventSyncTypeEnum,
  type AIAgentGrpcApi,
  type AIInputEvent,
  type AIOutputEvent,
  type AIStartParams,
} from './grpcApi'
import { createChatStore } from './chatStore'
import { Uint8ArrayToString } from '@/utils/str'
import { AIAgentSettingDefault, AIModelTypeEnum } from '@/pages/ai-agent/defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import { DefaultMemoryList, DefaultPlanItemDetailsData } from './defaultConstant'
import { grpcAIMessageHandlers } from './grpcStreamHandler/grpcAIOutputEventHandlers'
import { genExecTasks, handleTaskPlanEnd, pushLogToOtherWindow } from './utils'
import type { AIChatIPCStartParams, AIChatSendParams } from './type'
import { yakitNotify } from '@/utils/notification'
import { type AIChatQSData, AIChatQSDataTypeEnum } from './aiRender'
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
      planDetails: cloneDeep(DefaultPlanItemDetailsData),
    },
    taskChat: {
      planDetailsMap: new Map(),
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
    notifyMessageTimer: null,
    currentTaskPlanID: undefined,
    currentTaskPlanActiveNode: new Set(),
    historyReviewReleaseID: {},
    currentPlanReviewExtraId: '',
    planReviewExtraData: new Map(),
    toolStderrStreamData: new Map(),
    systemEventUUID: [],
    cardKVPair: new Map(),
    cardKVPaidTimer: null,
    execFileRecordOrder: 1,
    syncIDMap: new Map(),
  }
}

export class ChatMultiSessionController {
  // 存放各个页面下的session集合
  private pageSessionMap = new Map<string, Set<string>>()

  private requestPool = new Map<string, AIStartParams>()
  private storePool = new Map<string, ReturnType<typeof createChatStore>>()
  private rawDataPool = new Map<string, AIAgentChatData>()
  private metaPool = new Map<string, AIAgentChatMetaData>()

  private readyChannels = new Set<string>()
  private activeShowSession: string | null = null

  /** 获取对应会话的所有数据集 */
  public ensureSession(sessionId: string) {
    if (!this.storePool.has(sessionId)) {
      this.storePool.set(sessionId, createChatStore())
      this.rawDataPool.set(sessionId, genAIAgentChatData())
      this.requestPool.set(sessionId, cloneDeep(AIAgentSettingDefault))
      this.metaPool.set(sessionId, genAIAgentChatMetaData())
    }
    return {
      request: this.requestPool.get(sessionId)!,
      store: this.storePool.get(sessionId)!,
      rawData: this.rawDataPool.get(sessionId)!,
      meta: this.metaPool.get(sessionId)!,
    }
  }

  /** UI 层建立连接时，登记并绑定当前渲染周期的 UI 状态操纵函数 */
  public registerActiveChannel(sessionId: string) {
    this.readyChannels.add(sessionId)
  }
  /** 设置当前展示的会话 Session */
  public setActiveShowSession(sessionId: string) {
    this.activeShowSession = sessionId
  }
  /** 判断指定会话是否当前正在展示 */
  public isActiveShowSession(sessionId: string) {
    return this.activeShowSession === sessionId
  }

  /**
   * 更新指定会话的配置参数
   *
   * Source 字段连接会话时锁死，后续不允许热更新
   */
  public updateSessionConfig(sessionId: string, config: Partial<Omit<AIStartParams, 'Source'>>) {
    const { request } = this.ensureSession(sessionId)
    delete config['Source']
    Object.assign(request, config)
  }

  /** 建立指定session会话的连接 */
  public handleStartSession(requestParams: AIChatIPCStartParams, cb?: (sessionId: string) => void) {
    const { token: sessionId, params } = requestParams
    const isExec = this.readyChannels.has(sessionId)
    if (isExec) {
      yakitNotify('warning', '会话已经存在，请勿重复建立！')
      return
    }

    const { request, store, meta } = this.ensureSession(sessionId)

    store.getState().updateState({ execute: true, casualTitle: '发送问题，开启会话...' })
    this.pageSessionMap.get(params.Params?.Source ?? 'ai')?.add(sessionId)

    Object.assign(request, params.Params)
    if (params.Params?.UserQuery) {
      meta.createChatQuestion = {
        IsFreeInput: true,
        FreeInput: params.Params.UserQuery,
        AttachedResourceInfo: params.AttachedResourceInfo,
        FocusModeLoop: params.FocusModeLoop,
      }
    }
    meta.onSessionStartSuccess = cb

    ipcRenderer.invoke('start-ai-re-act', sessionId, params)
  }

  /** 主动向grpc发送请求 */
  public handleSendMessage(payload: AIChatSendParams) {
    try {
      const { token, type, params, optionValue } = payload
      // TODO - 这里的判断存活写的有些问题
      const isExist = this.readyChannels.has(token)
      if (!isExist) {
        yakitNotify('warning', '会话不存在，无法发送消息')
        return
      }

      const { store, rawData, meta } = this.ensureSession(token)
      // 自由对话没有问题进行中时，才改变loading的title
      if (params.IsFreeInput && !store.getState().casualLoading) {
        store.getState().updateState({ casualTitle: '等待回复中...' })
      }

      // 记录发送请求里的syncId-标识开始处理中
      if (params.IsSyncMessage && params.SyncID) {
        meta.syncIDMap.set(params.SyncID, true)
        store.getState().updateStateCount('syncIDUpdate')
      }

      switch (type) {
        case 'casual':
          if (params.IsInteractiveMessage && params.InteractiveId) {
            const isExist = store.getState().currentCasualReview.includes(params.InteractiveId)
            const review = rawData.contents.get(params.InteractiveId)
            if (!isExist || !review) {
              yakitNotify('error', '未获取到 review 信息, 操作无效')
              return
            }

            switch (review.type) {
              case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
                // tool_review 数据自动执行continue操作，并且不在UI上展示
                // 如果能进入该逻辑，说明有问题
                // TODO - 这里需要处理问题
                break
              case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
              case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
                // review操作后正常展示在UI上
                review.data.selected = params.InteractiveJSONInput
                review.data.optionValue = optionValue
                store.getState().updateCasualReview(params.InteractiveId, 'remove')
                store.getState().incrementNodeVersion(review.id, 'item')
                break
              default:
                break
            }
          }
          break
        case 'task':
          if (params.IsInteractiveMessage && params.InteractiveId) {
            const isExist = store.getState().currentPlanReviewToken === params.InteractiveId
            const review = rawData.contents.get(params.InteractiveId)
            if (isExist || !review) {
              yakitNotify('error', '未获取到 review 信息, 操作无效')
              return
            }

            store.getState().updateState({ currentPlanReviewToken: '' })
            switch (review.type) {
              case AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP:
              case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
                // task_review 和 tool_review 数据自动执行continue操作，并且不在UI上展示
                // 如果能进入该逻辑，说明有问题
                // TODO - 这里需要处理问题
                break
              case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
                // review操作后正常展示在UI上
                review.data.selected = params.InteractiveJSONInput
                review.data.optionValue = optionValue
                store.getState().dispatchStreamingNode({
                  chatType: 'task',
                  node: {
                    token: review.id,
                    kind: 'item',
                    type: review.type,
                    dataOrigin: 'grpc_realtime_data',
                  },
                  groupTokenGenerator: () => '',
                })
                break
              case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
                review.data.selected = params.InteractiveJSONInput
                review.data.optionValue = optionValue
                const tasks = review.data
                const plans = genExecTasks(tasks.plans.root_task)
                store.getState().updatePlanTree({
                  task_tree: cloneDeep(plans),
                  root_task_name: tasks.plans.root_task.name,
                })
                store.getState().dispatchStreamingNode({
                  chatType: 'task',
                  node: {
                    token: review.id,
                    kind: 'item',
                    type: review.type,
                    dataOrigin: 'grpc_realtime_data',
                  },
                  groupTokenGenerator: () => '',
                })
                break
              default:
                break
            }
          }
          break

        default:
          break
      }
      this.requestMessage(token, params)
    } catch (error) {}
  }
  /** 向连接中的会话发送请求 */
  private requestMessage(sessionId: string, request: AIInputEvent) {
    ipcRenderer.invoke('send-ai-re-act', sessionId, request)
  }

  /** 会话建立成功后, 需要做的额外操作 */
  private handleSessionStartSuccess(sessionId: string) {
    // 获取任务规划历史任务树
    this.requestMessage(sessionId, {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS,
    })
    /**
     * TODO - 轮询最新的问题队列，考虑触发的时机之类的
     * TODO - 获取最新的记忆列表数据，这个好像没法考虑触发时机
     */
    // 获取最新问题队列数据
    // sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO })
    // 获取最新记忆列表数据
    // sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_MEMORY_CONTEXT })
  }

  /** 💥 核心替换：接管原 useChatIPC 里的巨型数据分发逻辑！ */
  public handleGrpcOutputEvent(sessionId: string, res: AIOutputEvent) {
    try {
      let ipcContent = Uint8ArrayToString(res.Content) || ''
      // 所有数据，均抄送一份到日志中
      aiAgentLogEmitter.dispatch({
        session: sessionId,
        type: 'log',
        Timestamp: res.Timestamp,
        log: { level: 'log', message: ipcContent },
      })

      const { store, rawData, request, meta } = this.ensureSession(sessionId)

      // 标识同步ID已处理
      if (res.SyncID && meta.syncIDMap.has(res.SyncID)) {
        meta.syncIDMap.delete(res.SyncID)
        store.getState().updateStateCount('syncIDUpdate')
      }

      if (res.Type === 'pong') {
        if (meta.createChatQuestion) {
          this.requestMessage(sessionId, meta.createChatQuestion)
          meta.createChatQuestion = undefined
          store.getState().updateState({ casualTitle: '等待回复中...' })
        } else {
          // 调用历史数据恢复方法
        }
        this.handleSessionStartSuccess(sessionId)
        meta?.onSessionStartSuccess?.(sessionId)
        meta.onSessionStartSuccess = undefined
        return
      }

      if (res.Type === 'structured') {
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

      // if (res.Type === 'structured' && res.NodeId === 'recovery_history') {
      //   const recoveryHistory = JSON.parse(ipcContent) as AIAgentGrpcApi.RecoveryHistory
      //   const chatStore = getChatDataStore()
      //   if (chatStore) chatStore.beforeID.chatID = recoveryHistory.next_start_id
      //   requestEvents.handleGrpcLoadMore(recoveryHistory)
      //   return
      // }

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
          'capability_inventory',
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
      } else if (res.Type === 'perception' || res.NodeId === 'perception') {
        funcKey = 'perception'
      } else if (res.Type === 'current_task_todo_list_update' || res.NodeId === 'current_task_todo_list') {
        funcKey = 'current_task_todo_list_update'
      } else if (res.NodeId === 'session_snapshot') {
        funcKey = res.NodeId
      }
      const handleFunc = grpcAIMessageHandlers[funcKey || '']
      if (handleFunc) {
        handleFunc({
          sessionId,
          res,
          chatType: meta.currentTaskPlanID?.coordinatorId === res.CoordinatorId ? 'task' : 'reAct',
          store,
          rawData,
          request,
          meta,
          sendRequest: (request) => this.requestMessage(sessionId, request),
          pushLog: (log) => {
            if (res.IsSync) return
            pushLogToOtherWindow({ sessionId: sessionId, Timestamp: res.Timestamp, ...log })
          },
        })
        return
      }
    } catch (error) {
      aiAgentLogEmitter.dispatch({
        session: sessionId,
        type: 'log',
        Timestamp: res.Timestamp,
        log: { level: 'try-error', message: `${res.Type}-${res.NodeId}: ${error}` },
      })
    }
  }

  /** 主动往列表里放入一条数据 */
  public pushDataToSession(sessionId: string, data: AIChatQSData) {
    const { store, rawData } = this.ensureSession(sessionId)
    rawData.contents.set(data.id, data)
    store.getState().dispatchStreamingNode({
      chatType: data.chatType,
      node: {
        token: data.id,
        kind: 'item',
        type: data.type,
        dataOrigin: 'grpc_realtime_data',
      },
      groupTokenGenerator: () => '',
    })
  }

  private closeIPCListeners(sessionId: string) {
    ipcRenderer.removeAllListeners(`${sessionId}-data`)
    ipcRenderer.removeAllListeners(`${sessionId}-end`)
    ipcRenderer.removeAllListeners(`${sessionId}-error`)
  }

  // 监听 session-error 事件
  public handleSessionError(sessionId: string, error: any) {
    // 暂无业务逻辑处理
  }
  // 监听 session-end 事件
  public handleSessionEnd(sessionId: string, res: any) {
    const { store } = this.ensureSession(sessionId)
    handleTaskPlanEnd(this.ensureSession(sessionId))
    store.getState().updateState({ execute: false, casualLoading: false, casualTitle: '会话已停止' })
    this.closeIPCListeners(sessionId)
  }

  /** 关闭指定session的连接
   * TODO - 期望传一个对象，{ sessionIds: string[]; aiSource: AISource }
   */
  public forceCloseSession(params: { sessionIds: string[]; source: string }) {
    const { sessionIds, source } = params
    ipcRenderer.invoke('cancel-ai-re-act', sessionId).catch(() => {})

    this.readyChannels.delete(sessionId)
  }
}

export const globalSessionEngine = new ChatMultiSessionController()
