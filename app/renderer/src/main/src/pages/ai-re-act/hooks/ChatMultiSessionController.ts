import type { AIAgentChatData, AIAgentChatMetaData } from '@/pages/ai-agent/type/aiChat'
import {
  AIInputEventSyncTypeEnum,
  AISource,
  type AIAgentGrpcApi,
  type AIInputEvent,
  type AIOutputEvent,
  type AIStartParams,
} from './grpcApi'
import { createChatStore } from './chatStore'
import { Uint8ArrayToString } from '@/utils/str'
import {
  AIAgentSettingDefault,
  AIModelTypeEnum,
  AttachedResourceKeyEnum,
  AttachedResourceTypeEnum,
} from '@/pages/ai-agent/defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import { DefaultMemoryList, DefaultPlanItemDetailsData } from './defaultConstant'
import { grpcAIMessageHandlers } from './grpcStreamHandler/grpcAIOutputEventHandlers'
import { genExecTasks, handleTaskPlanEnd, pushLogToOtherWindow } from './utils'
import type { AIChatIPCStartParams, AIChatSendParams } from './type'
import { yakitNotify } from '@/utils/notification'
import { type AIChatQSData, AIChatQSDataTypeEnum, AIToolResult } from './aiRender'
import { aiAgentLogEmitter } from './AIAgentLogEmitter'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import type { YakitRouteType } from '@/enums/yakitRoute'

const { ipcRenderer } = window.require('electron')

/** 生成AI-Agent会话数据实例 */
const genAIAgentChatData = (): AIAgentChatData => {
  const defaultData: AIAgentChatData = {
    httpFuzzRequest: undefined,
    httpFlowFuzzStatus: undefined,
    sessionTitle: '',
    memoryList: DefaultMemoryList,
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
      planDetails: DefaultPlanItemDetailsData,
      planDetailsMap: new Map(),
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
    onEnd: undefined,
    pingSyncID: '',
    pingTimer: null,
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
    queuePollingEmptyCount: 0,
    queuePollingTimer: null,
    memoryPollingTimer: null,
    casualSubTaskIDs: new Set(),
  }
}

/** page 归属键：`${route}::${pageId}`，pageId 为当前归属 */
type PageKey = string

interface SessionOwner {
  /** 不可变：注册后锁死 */
  readonly route: YakitRouteType
  /** 不可变：注册后锁死 */
  readonly source: AISource
  /** 可变：始终存当前 page */
  pageId: string
}

/** 生成 route::pageId 的唯一标识 */
const makePageKey = (route: YakitRouteType, pageId: string): PageKey => `${route}::${pageId}`

export class ChatMultiSessionController {
  /**
   * 正向索引：按「当前」page 关页 / 全删
   * pageId 换绑后旧 PageKey 不再包含该 session
   */
  private pageSessionMap = new Map<PageKey, Map<AISource, Set<string>>>()
  /**
   * 反向索引：按 sessionId O(1) 定位；换绑时只改 pageId 并搬动正向索引
   */
  private sessionOwnerMap = new Map<string, SessionOwner>()
  /** 存放已建立连接的会话session集合 */
  private readyChannels = new Set<string>()

  // #region session-source-route-pageId 索引管理相关逻辑
  /** 将 session 写入 pageSessionMap 正向索引 */
  private addToPageSessionMap(owner: SessionOwner, sessionId: string) {
    const pageKey = makePageKey(owner.route, owner.pageId)
    let sourceMap = this.pageSessionMap.get(pageKey)
    if (!sourceMap) {
      sourceMap = new Map()
      this.pageSessionMap.set(pageKey, sourceMap)
    }
    let sessionSet = sourceMap.get(owner.source)
    if (!sessionSet) {
      sessionSet = new Set()
      sourceMap.set(owner.source, sessionSet)
    }
    sessionSet.add(sessionId)
  }

  /** 从 pageSessionMap 正向索引摘除；空 Set/Map 则清理 */
  private removeFromPageSessionMap(owner: SessionOwner, sessionId: string) {
    const pageKey = makePageKey(owner.route, owner.pageId)
    const sourceMap = this.pageSessionMap.get(pageKey)
    if (!sourceMap) return

    const sessionSet = sourceMap.get(owner.source)
    if (!sessionSet) return

    sessionSet.delete(sessionId)
    if (sessionSet.size === 0) {
      sourceMap.delete(owner.source)
    }
    if (sourceMap.size === 0) {
      this.pageSessionMap.delete(pageKey)
    }
  }

  /**
   * session 会话建立时注册归属索引，并标识当前会话已建立连接
   *
   * - route / source 建立后不可变
   * - 若 session 已存在且仅 pageId 不同，走 rebind 而非重复注册
   */
  public registerSessionChannel(
    sessionId: string,
    owner: { route: YakitRouteType; pageId: string; source?: AIStartParams['Source'] },
  ) {
    const source: AISource = owner.source || 'ai'
    const existing = this.sessionOwnerMap.get(sessionId)

    if (existing) {
      // 禁止改 route / source
      if (existing.route !== owner.route || existing.source !== source) {
        console.error(`[ChatMultiSessionController] registerSessionChannel: session 已存在且 route/source 不可变`, {
          sessionId,
          existing,
          next: { route: owner.route, pageId: owner.pageId, source },
        })
        this.readyChannels.add(sessionId)
        return
      }
      // 仅 pageId 不同 → rebind
      if (existing.pageId !== owner.pageId) {
        this.rebindSessionPageId(sessionId, owner.pageId)
      }
      this.readyChannels.add(sessionId)
      return
    }

    const sessionOwner: SessionOwner = {
      route: owner.route,
      source,
      pageId: owner.pageId,
    }
    this.sessionOwnerMap.set(sessionId, sessionOwner)
    this.addToPageSessionMap(sessionOwner, sessionId)
    this.readyChannels.add(sessionId)
  }

  /**
   * 同 route 下换绑 pageId：更新 sessionOwnerMap.pageId，从旧 PageKey 摘除、写入新 PageKey
   * route / source 不变；newPageId 与旧相同或 session 已 dispose 则 no-op
   */
  public rebindSessionPageId(sessionId: string, newPageId: string) {
    const owner = this.sessionOwnerMap.get(sessionId)
    if (!owner || owner.pageId === newPageId) return

    this.removeFromPageSessionMap(owner, sessionId)
    owner.pageId = newPageId
    this.addToPageSessionMap(owner, sessionId)
  }

  /** 全删：用目标 route + pageId + source 查当前索引；非空 sessionIds 则直接用集合 */
  private resolveSessionIds(params: {
    sessionIds?: string[]
    source: AISource
    route: YakitRouteType
    pageId: string
  }): string[] {
    const { sessionIds, source, route, pageId } = params
    if (sessionIds?.length) return [...sessionIds]
    return [...(this.pageSessionMap.get(makePageKey(route, pageId))?.get(source) ?? [])]
  }

  /** 该 PageKey 下所有 source 的 session 并集 */
  private resolvePageSessionIds(route: YakitRouteType, pageId: string): string[] {
    const sourceMap = this.pageSessionMap.get(makePageKey(route, pageId))
    if (!sourceMap) return []
    const ids: string[] = []
    for (const sessionSet of sourceMap.values()) {
      for (const id of sessionSet) {
        ids.push(id)
      }
    }
    return ids
  }

  /**
   * 删除内存数据（仅 deleteSessions / onPageUnload 调用）
   * 1. 先 forceClose（停流，幂等；关闭 ≠ 删除）
   * 2. 主动摘 IPC（删除不等 end）并清业务池与归属索引
   */
  private disposeSessionMemory(sessionId: string) {
    this.forceCloseSession({ sessionIds: [sessionId] })
    // 删除路径不等 session-end，主动摘监听，避免 end 回来 ensureSession 重建池
    this.closeIPCListeners(sessionId)
    this.readyChannels.delete(sessionId)

    if (this.activeShowSession === sessionId) {
      this.activeShowSession = null
    }

    this.requestPool.delete(sessionId)
    this.storePool.delete(sessionId)
    this.rawDataPool.delete(sessionId)
    this.metaPool.delete(sessionId)

    const owner = this.sessionOwnerMap.get(sessionId)
    if (owner) {
      this.removeFromPageSessionMap(owner, sessionId)
      this.sessionOwnerMap.delete(sessionId)
    }
  }
  // #endregion

  /** 存放当前正在展示的会话session */
  private activeShowSession: string | null = null
  /** 设置当前展示的会话 Session */
  public setActiveShowSession(sessionId: string) {
    this.activeShowSession = sessionId
  }
  /** 判断指定会话是否当前正在展示 */
  public isActiveShowSession(sessionId: string) {
    return this.activeShowSession === sessionId
  }

  private requestPool = new Map<string, AIStartParams>()
  private storePool = new Map<string, ReturnType<typeof createChatStore>>()
  private rawDataPool = new Map<string, AIAgentChatData>()
  private metaPool = new Map<string, AIAgentChatMetaData>()

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
    const { token: sessionId, params, route, pageId } = requestParams
    const isExec = this.readyChannels.has(sessionId)
    if (isExec) {
      yakitNotify('warning', '会话已经存在，请勿重复建立！')
      return
    }

    const { request, store, rawData, meta } = this.ensureSession(sessionId)

    store.getState().updateState({ execute: true, casualTitle: '发送问题，开启会话...' })
    this.registerSessionChannel(sessionId, {
      route,
      pageId,
      source: params.Params?.Source,
    })
    this.setActiveShowSession(sessionId)

    Object.assign(request, params.Params)
    if (params.Params?.UserQuery) {
      // 判断建立grpc连接时是否附带问题
      // 如有，需要剥离出来，在grpc建立成功后再执行
      const chatID = uuidv4()

      const AttachedResourceInfos = params.AttachedResourceInfo || []
      AttachedResourceInfos.push({
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_DEFAULT,
        Type: AttachedResourceTypeEnum.USER_FREE_INPUT_UUID,
        Value: chatID,
      })

      meta.createChatQuestion = {
        IsFreeInput: true,
        FreeInput: params.Params.UserQuery,
        AttachedResourceInfo: AttachedResourceInfos,
        FocusModeLoop: params.FocusModeLoop,
      }

      // 用户问了问题后，立即显示到UI上
      // 问题对应的re_act_task_id先由前端生成，并发送给后端
      // 后续生成re_act_task_id时，会把前端生成的uuid替换为后端生成的re_act_task_id
      const chatData: AIChatQSData = {
        id: chatID,
        chatType: 'reAct',
        type: AIChatQSDataTypeEnum.QUESTION,
        Timestamp: moment().unix(),
        data: params.Params?.UserQuery || '',
        AIService: '',
        AIModelName: '',
        // showQS为了UI渲染方便，重新构建的字段
        extraValue: { showQS: params.Params?.UserQuery || '' },
      }
      rawData.contents.set(chatData.id, chatData)
      store.getState().dispatchStreamingNode({
        chatType: 'reAct',
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
        },
      })
    }
    meta.onLinkSuccess = cb

    ipcRenderer.invoke('start-ai-re-act', sessionId, params)

    // 建立会话连接时，在主进程进行了一次ping请求
    // 如果五秒没有返回pong消息，则再次进行ping请求
    if (meta.pingTimer) clearInterval(meta.pingTimer)
    meta.pingTimer = setInterval(() => {
      meta.pingSyncID = uuidv4()
      this.requestMessage(sessionId, {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PING,
        SyncID: meta.pingSyncID,
      })
    }, 5000)
  }

  /** 主动向grpc发送请求 */
  public handleSendMessage(payload: AIChatSendParams) {
    // console.log('handleSendMessage', payload)
    try {
      const { token, type, params, optionValue } = payload
      if (!this.readyChannels.has(token)) {
        if (!this.isActiveShowSession(token)) return
        yakitNotify('warning', '会话不存在，无法发送消息')
        return
      }

      const { store, rawData, meta } = this.ensureSession(token)

      if (params.IsFreeInput) {
        const { casualLoading, currentCasualTaskID } = store.getState()
        // 如果自由对话引起了任务规划，那么自由对话其实是空闲状态
        const isCasualIdle = casualLoading && currentCasualTaskID === meta.currentTaskPlanID?.taskID

        if (!casualLoading || isCasualIdle) {
          // 自由对话没有问题进行中时，才改变loading的title
          store.getState().updateState({ casualTitle: '等待回复中...' })

          const chatID = uuidv4()
          const AttachedResourceInfos = params.AttachedResourceInfo || []
          AttachedResourceInfos.push({
            Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_DEFAULT,
            Type: AttachedResourceTypeEnum.USER_FREE_INPUT_UUID,
            Value: chatID,
          })
          params.AttachedResourceInfo = AttachedResourceInfos
          const chatData: AIChatQSData = {
            id: chatID,
            chatType: 'reAct',
            type: AIChatQSDataTypeEnum.QUESTION,
            Timestamp: moment().unix(),
            data: params.FreeInput || '',
            AIService: '',
            AIModelName: '',
            // showQS为了UI渲染方便，重新构建的字段
            extraValue: { showQS: params.FreeInput || '' },
          }
          rawData.contents.set(chatData.id, chatData)
          store.getState().dispatchStreamingNode({
            chatType: 'reAct',
            node: {
              token: chatData.id,
              kind: 'item',
              type: chatData.type,
            },
          })
        }

        // 因为有用户问题发送，所以注册 获取问题队列轮询器
        if (!meta.queuePollingTimer) {
          meta.queuePollingEmptyCount = 0
          meta.queuePollingTimer = setInterval(() => {
            this.requestMessage(token, {
              IsSyncMessage: true,
              SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
            })
          }, 5000)
        }
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
                // 非执行任务组的tool_review，并且review模式不是yolo，才能展示到UI上供用户主动操作
                // 用户操作后，review结果不会展示到UI上，所以需要删除该review的所有数据
                rawData.contents.delete(review.id)
                store.getState().updateCasualReview(review.id, 'remove')
                store.getState().deleteElementNode({
                  chatType: 'reAct',
                  token: review.id,
                  kind: 'item',
                  taskID: review.TaskId || undefined,
                  onDelContent: (mapKey) => {
                    rawData.contents.delete(mapKey)
                  },
                })
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
            const isExist = store.getState().currentPlanReviewToken.token === params.InteractiveId
            const review = rawData.contents.get(params.InteractiveId)
            if (!isExist || !review) {
              yakitNotify('error', '未获取到 review 信息, 操作无效')
              return
            }

            store.getState().updateState({ currentPlanReviewToken: { token: '', renderNum: 0 } })
            switch (review.type) {
              case AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP:
              case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
                // 任务规划的task_review和tool_review会在自动执行continue操作，不会在UI上展示
                // 如果能进入该逻辑，说明有问题
                console.error(`未知错误[handleSendMessage]: ${JSON.stringify(payload)}`)
                break
              case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
                // review操作后正常展示在UI上
                review.data.selected = params.InteractiveJSONInput
                review.data.optionValue = optionValue
                store.getState().dispatchStreamingNode({
                  chatType: 'task',
                  parentTaskId: review.TaskId,
                  node: {
                    token: review.id,
                    kind: 'item',
                    type: review.type,
                  },
                })
                break
              case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
                review.data.selected = params.InteractiveJSONInput
                review.data.optionValue = optionValue
                if (optionValue === 'continue') {
                  const tasks = review.data
                  const plans = genExecTasks(tasks.plans.root_task)
                  store.getState().updatePlanTree({
                    task_tree: cloneDeep(plans),
                    root_task_name: tasks.plans.root_task.name,
                  })
                }
                store.getState().dispatchStreamingNode({
                  chatType: 'task',
                  parentTaskId: review.TaskId,
                  node: {
                    token: review.id,
                    kind: 'item',
                    type: review.type,
                  },
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
    // console.log('requestMessage', sessionId, request)
    ipcRenderer.invoke('send-ai-re-act', sessionId, request)
  }

  /** 会话建立成功后, 需要做的额外操作 */
  private handleSessionStartSuccess(sessionId: string) {
    const { meta } = this.ensureSession(sessionId)

    // 获取任务规划历史任务树
    this.requestMessage(sessionId, {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS,
    })

    // 获取最新记忆列表数据, 并注册轮询定时器
    this.requestMessage(sessionId, { IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_MEMORY_CONTEXT })
    if (meta.memoryPollingTimer) clearTimeout(meta.memoryPollingTimer)
    meta.memoryPollingTimer = setInterval(() => {
      this.requestMessage(sessionId, {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_MEMORY_CONTEXT,
      })
    }, 5000)
  }

  /** 💥 核心替换：接管原 useChatIPC 里的巨型数据分发逻辑！ */
  public handleGrpcOutputEvent(sessionId: string, res: AIOutputEvent) {
    try {
      let ipcContent = Uint8ArrayToString(res.Content) || ''
      // console.log('handleGrpcOutputEvent--', sessionId, res, ipcContent)
      if (res.Type === 'structured' && ipcContent.indexOf('level') > -1 && ipcContent.indexOf('message') > -1) {
        // 日志类型数据
        const data = JSON.parse(ipcContent) as AIAgentGrpcApi.Log
        aiAgentLogEmitter.dispatch({
          session: sessionId,
          type: 'log',
          Timestamp: res.Timestamp,
          log: data,
        })
        return
      } else {
        // 所有数据，均抄送一份到日志中
        aiAgentLogEmitter.dispatch({
          session: sessionId,
          type: 'log',
          Timestamp: res.Timestamp,
          log: { level: 'log', message: ipcContent },
        })
      }

      const { store, rawData, request, meta } = this.ensureSession(sessionId)

      // 标识同步ID已处理
      if (res.SyncID && meta.syncIDMap.has(res.SyncID)) {
        meta.syncIDMap.delete(res.SyncID)
        store.getState().updateStateCount('syncIDUpdate')
      }

      if (res.Type === 'pong') {
        // 如果返回的pong没有值，但是pingSyncID有值，说明该条消息已经过期
        if (!res.SyncID && meta.pingSyncID) return
        // 如果返回的pong有值，但是和pingSyncID不一样，说明该条消息已经过期
        if (res.SyncID && res.SyncID !== meta.pingSyncID) return
        // 该条消息有效，不需要在轮询ping请求了
        if (meta.pingTimer) clearInterval(meta.pingTimer)
        meta.pingTimer = null
        meta.pingSyncID = ''

        if (meta.createChatQuestion) {
          this.requestMessage(sessionId, meta.createChatQuestion)
          meta.createChatQuestion = undefined
          store.getState().updateState({ casualTitle: '等待回复中...' })

          // 因为有用户问题发送，所以注册 获取问题队列轮询器
          if (meta.queuePollingTimer) clearTimeout(meta.queuePollingTimer)
          meta.queuePollingEmptyCount = 0
          meta.queuePollingTimer = setInterval(() => {
            this.requestMessage(sessionId, {
              IsSyncMessage: true,
              SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
            })
          }, 5000)
        } else {
          // TODO - 调用历史数据恢复方法
        }
        this.handleSessionStartSuccess(sessionId)
        meta.onLinkSuccess?.(sessionId)
        meta.onLinkSuccess = undefined
        return
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
          'react_task_created',
        ].includes(res.NodeId)
      ) {
        funcKey = res.NodeId
      } else if (res.Type === 'api_request_failed' && res.NodeId === 'ai_call_failure') {
        funcKey = res.NodeId
      } else if (res.Type === 'report_finish' && res.NodeId === 'report-finish') {
        funcKey = res.NodeId
      } else if (res.Type === 'structured' && res.NodeId === 'system') {
        const data = JSON.parse(ipcContent) || ''
        if (data && typeof data === 'object' && data?.type === 'push_task') {
          funcKey = 'push_task'
        } else if (data && typeof data === 'object' && data?.type === 'pop_task') {
          funcKey = 'pop_task'
        }
      } else if (res.Type === 'perception' && res.NodeId === 'perception') {
        funcKey = 'perception'
      } else if (res.Type === 'current_task_todo_list_update' && res.NodeId === 'current_task_todo_list') {
        funcKey = 'current_task_todo_list_update'
      } else if (res.NodeId === 'session_snapshot') {
        funcKey = res.NodeId
      } else if (res.Type === 'detached_plan_require' && res.NodeId === 'detached-plan') {
        funcKey = res.Type
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
      parentTaskId: data.TaskId,
      node: {
        token: data.id,
        kind: 'item',
        type: data.type,
      },
    })
  }

  /**
   * 主动关闭展示给用户操作的review
   *
   *  一般来说，触发这个事件的情况，都是当前review数据无效了
   *  别的处理review数据事件，都由 handleSendMessage 进行处理了
   */
  public closeChatReview(sessionId: string, reviewToken: string) {
    const { store, rawData } = this.ensureSession(sessionId)
    const reviewDetail = rawData.contents.get(reviewToken)
    if (!reviewDetail) {
      yakitNotify('warning', '未获取到 review 信息, 操作无效')
      return
    }

    if (reviewDetail.chatType === 'reAct') {
      rawData.contents.delete(reviewToken)
      if (
        reviewDetail.type === AIChatQSDataTypeEnum.DETACHED_PLAN_REQUIRE &&
        store.getState().currentPlanReviewToken.token === reviewDetail.id
      ) {
        // 该类型在任务规划的review弹窗显示，需要清空当前任务规划的review
        store.getState().updateState({ currentPlanReviewToken: { token: '', renderNum: 0 } })
      } else {
        store.getState().updateCasualReview(reviewToken, 'remove')
        store.getState().deleteElementNode({
          chatType: 'reAct',
          token: reviewDetail.id,
          kind: 'item',
          taskID: reviewDetail.TaskId || undefined,
          onDelContent: (mapKey) => {
            rawData.contents.delete(mapKey)
          },
        })
      }
    } else if (reviewDetail.chatType === 'task') {
      const currentReview = store.getState().currentPlanReviewToken
      if (!currentReview.token || currentReview.token !== reviewDetail.id) return

      // 不用调用deleteElementNode，因为能触发这个方法的地方，说明review还没有进入list列表中
      rawData.contents.delete(currentReview.token)
      store.getState().updateState({ currentPlanReviewToken: { token: '', renderNum: 0 } })
    }
  }

  /** 更新某一个指定的工具卡片内容(AIChatQSDataTypeEnum.TOOL_RESULT) */
  public updateToolResult(sessionId: string, mapToken: string, toolResult: Partial<AIToolResult['tool']>) {
    const { store, rawData } = this.ensureSession(sessionId)

    const chatDetail = rawData.contents.get(mapToken)
    if (!chatDetail || chatDetail.type !== AIChatQSDataTypeEnum.TOOL_RESULT) return

    Object.assign(chatDetail.data.tool, toolResult)
    store.getState().incrementNodeVersion(chatDetail.id, 'item')
  }

  /** 关闭会话的所有定时器 */
  private closeSessionTimers(meta: ReturnType<ChatMultiSessionController['ensureSession']>['meta']) {
    // 取消ping请求相关逻辑
    if (meta.pingTimer) clearInterval(meta.pingTimer)
    meta.pingTimer = null
    meta.pingSyncID = ''
    // 清除通知消息消失的定时器
    if (meta.notifyMessageTimer) clearTimeout(meta.notifyMessageTimer)
    meta.notifyMessageTimer = null
    // 清除插件执行卡片处理的定时器
    if (meta.cardKVPaidTimer) clearTimeout(meta.cardKVPaidTimer)
    meta.cardKVPaidTimer = null
    // 清除获取最新问题队列的轮询器
    if (meta.queuePollingTimer) clearInterval(meta.queuePollingTimer)
    meta.queuePollingTimer = null
    meta.queuePollingEmptyCount = 0
    // 清除获取最新记忆库数据的轮询器
    if (meta.memoryPollingTimer) clearInterval(meta.memoryPollingTimer)
    meta.memoryPollingTimer = null
  }

  // 关闭ipc通道连接
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
    const data = this.ensureSession(sessionId)
    const { store, meta } = data

    this.closeSessionTimers(meta)
    // 任务规划结束后的相关逻辑
    handleTaskPlanEnd(data)
    // 核心状态改变
    store.getState().updateState({ execute: false, casualLoading: false, casualTitle: '会话已停止' })
    this.readyChannels.delete(sessionId)

    const onEnd = meta.onEnd
    if (onEnd) {
      onEnd()
      meta.onEnd = undefined
    }
    this.closeIPCListeners(sessionId)
  }

  /**
   * 关闭会话连接（停流）
   * - cancel IPC、更新 execute；不摘 IPC 监听（交给 handleSessionEnd）
   * - 有 onEnd 时写入 meta，在 session-end 移除监听前执行
   * - **不会**删除业务池与归属索引；关闭 ≠ 删除
   */
  public forceCloseSession(params: { sessionIds: string[]; onEnd?: () => void }) {
    const { sessionIds, onEnd } = params
    for (const session of sessionIds) {
      const meta = this.metaPool.get(session)
      if (meta && onEnd) {
        meta.onEnd = onEnd
      }
      ipcRenderer.invoke('cancel-ai-re-act', session).catch(() => {})
      const store = this.storePool.get(session)
      if (store) {
        store.getState().updateState({ execute: false, casualLoading: false, casualTitle: '会话已停止' })
      }
      if (meta) this.closeSessionTimers(meta)
    }
  }

  /**
   * 删除指定的 session（必须清除内存数据）
   * - sessionIds 非空：删集合
   * - sessionIds 空数组：按当前归属全删该 page 下该 source
   * - pageId 为空：按当前归属全删该 route 下所有 page 的 session
   * - 内部会先 forceClose 再卸业务池与双索引
   * - grpc / IndexedDB 删除由上层负责
   */
  public deleteSessions(params: { sessionIds: string[]; source: AISource; route: YakitRouteType; pageId: string }) {
    const ids = this.resolveSessionIds(params)
    for (const sessionId of ids) {
      this.disposeSessionMemory(sessionId)
    }
  }

  /**
   * 页面生命周期卸载：卸该「当前」page 下所有 source 的 session 内存（同 delete，非仅 forceClose）
   * 已 rebind 走的 session 不会被旧页清掉
   */
  public onPageUnload(route: YakitRouteType, pageId: string) {
    const ids = this.resolvePageSessionIds(route, pageId)
    for (const sessionId of ids) {
      this.disposeSessionMemory(sessionId)
    }
  }
}

export const globalSessionEngine = new ChatMultiSessionController()
