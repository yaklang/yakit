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
import { type AIChatQSData, AIChatQSDataTypeEnum, type AIToolResult, type SessionRenderContent } from './aiRender'
import { aiAgentLogEmitter } from './AIAgentLogEmitter'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import type { YakitRouteType } from '@/enums/yakitRoute'
import { grpcQueryAIEvent } from '@/pages/ai-agent/grpc'
import aiChatPersistStore from './persist/aiChatPersistStore'
import { persistIndependentItem, persistToolResultIfTerminal } from './persist/contentPersistHelper'

const { ipcRenderer } = window.require('electron')

/** recovery_history 单次拉取条数 */
const RECOVERY_HISTORY_LIMIT = 60

const hasSessionRenderTree = (content?: SessionRenderContent): boolean => {
  if (!content) return false
  return (
    (content.casualElements?.length || 0) > 0 ||
    (content.taskElements?.length || 0) > 0 ||
    Object.keys(content.items || {}).length > 0 ||
    Object.keys(content.groups || {}).length > 0 ||
    Object.keys(content.tasks || {}).length > 0
  )
}

/** 生成AI-Agent会话数据实例 */
const genAIAgentChatData = (): AIAgentChatData => {
  const defaultData: AIAgentChatData = {
    httpFuzzRequest: undefined,
    httpFlowFuzzStatus: undefined,
    sessionTitle: '',
    memoryList: DefaultMemoryList,
    systemStream: '',
    yaklangCodeChange: undefined,

    grpcOffset: 0,

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

/**
 * 从渲染树快照收集「首屏」正文 token：
 * casual / task 两侧顶层 elements 各取最后 topCount 条，并展开 group/task 的 childrenTokens。
 */
const collectTopLevelContentTokens = (content: SessionRenderContent, topCount: number): string[] => {
  const tokenSet = new Set<string>()
  const appendFromElements = (elements: SessionRenderContent['casualElements']) => {
    const top = elements.slice(-topCount)
    for (const el of top) {
      tokenSet.add(el.token)
      if (el.kind === 'group') {
        const group = content.groups[el.token]
        group?.childrenTokens?.forEach((t) => tokenSet.add(t))
      } else if (el.kind === 'task') {
        const task = content.tasks[el.token]
        task?.childrenTokens?.forEach((t) => tokenSet.add(t))
      }
    }
  }
  appendFromElements(content.casualElements || [])
  appendFromElements(content.taskElements || [])
  return [...tokenSet]
}

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
  /** 渲染树待落库 dirty 标记 */
  private renderPersistDirty = new Set<string>()
  /** 渲染树 debounce 定时器 */
  private renderPersistTimers = new Map<string, ReturnType<typeof setTimeout>>()
  /**
   * cancel 后等待 session-end 的兜底定时器：超时则手动走 handleSessionEnd（摘监听 + 收尾）
   * 避免 end 丢失导致监听泄漏 / onEnd 永不触发
   */
  private sessionEndFallbackTimers = new Map<string, ReturnType<typeof setTimeout>>()
  /**
   * 待卸池的 session：forceClose 后保留监听与业务池，等 end / 兜底超时再 teardown
   * value 为 dispose 时的 deletePersist 标记
   */
  private pendingDisposeSessions = new Map<string, boolean>()

  private static readonly RENDER_PERSIST_DEBOUNCE_MS = 3000
  /** cancel 后等待真实 session-end 的最长时间，超时则合成 end */
  private static readonly SESSION_END_FALLBACK_MS = 5000
  /** 恢复会话时首屏灌入 contents 的顶层条数（两侧列表各自截取） */
  private static readonly INITIAL_CONTENT_TOP_COUNT = 20
  /**
   * 无 UserQuery 建连进入恢复态：switchLoading 为 true，
   * 待 hydrate / recovery_history 结束后再关
   */
  private sessionRestoreLoading = new Set<string>()

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
   * 1. 标记 pendingDispose + forceClose（cancel，保留 IPC 等 end）
   * 2. 真实 session-end 或 5s 兜底后，再摘监听并清业务池与归属索引
   * @param deletePersist 是否同步删除 IDB。页面销毁只卸内存时应为 false，并先 flush 渲染树；显式删会话时为 true。
   */
  private disposeSessionMemory(sessionId: string, deletePersist = false) {
    if (deletePersist) {
      // 显式删除：取消待写 debounce 即可，无需再刷进 IDB
      const timer = this.renderPersistTimers.get(sessionId)
      if (timer) {
        clearTimeout(timer)
        this.renderPersistTimers.delete(sessionId)
      }
      this.renderPersistDirty.delete(sessionId)
    } else {
      // 页面卸载：卸内存前先把渲染树刷进 IDB，保留可恢复数据
      this.flushSessionRender(sessionId)
    }

    this.pendingDisposeSessions.set(sessionId, deletePersist)
    this.forceCloseSession({ sessionIds: [sessionId] })
  }

  /** end / 兜底超时后：摘池与归属索引（可选删 IDB） */
  private teardownDisposedSession(sessionId: string, deletePersist: boolean) {
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

    if (deletePersist) {
      aiChatPersistStore.deleteSessionPersist(sessionId).catch(() => {})
    }
  }
  // #endregion

  // #region 渲染树 dirty debounce 落库
  /** 渲染树结构变更后标记 dirty，3s 无新变更再写入 sessionRender */
  private markSessionRenderDirty(sessionId: string) {
    this.renderPersistDirty.add(sessionId)
    const prev = this.renderPersistTimers.get(sessionId)
    if (prev) clearTimeout(prev)
    const timer = setTimeout(() => {
      // 到期后统一走 flush：摘 timer、清 dirty、写 IDB（外部强制 flush 也走同一套）
      this.flushSessionRender(sessionId)
    }, ChatMultiSessionController.RENDER_PERSIST_DEBOUNCE_MS)
    this.renderPersistTimers.set(sessionId, timer)
  }

  /** 立即刷写渲染树快照并清除 dirty/timer */
  private flushSessionRender(sessionId: string) {
    const timer = this.renderPersistTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.renderPersistTimers.delete(sessionId)
    }
    this.renderPersistDirty.delete(sessionId)

    const store = this.storePool.get(sessionId)
    const rawData = this.rawDataPool.get(sessionId)
    if (!store || !rawData) return
    const state = store.getState()
    const content: SessionRenderContent = {
      items: { ...state.items },
      groups: { ...state.groups },
      tasks: { ...state.tasks },
      casualElements: [...state.casualChat.elements],
      taskElements: [...state.taskChat.elements],
    }
    void this.persistSetSessionRender(sessionId, content, rawData.grpcOffset)
  }
  // #endregion

  // #region IndexedDB 持久化门面（薄封装 aiChatPersistStore，错误兜底不抛穿 UI）
  /** 从 sessionOwnerMap 取 source，兜底 'ai' */
  private resolvePersistSource(sessionId: string): AISource {
    return this.sessionOwnerMap.get(sessionId)?.source || 'ai'
  }

  /** 保存会话渲染树和grpcOffset */
  private async persistSetSessionRender(sessionId: string, content: SessionRenderContent, grpcOffset?: number) {
    try {
      const offset = grpcOffset ?? this.rawDataPool.get(sessionId)?.grpcOffset ?? 0
      await aiChatPersistStore.setSessionRender(sessionId, this.resolvePersistSource(sessionId), content, offset)
    } catch {
      // 持久化失败不打断主流程
    }
  }
  /** 获取会话渲染树和grpcOffset */
  private async persistGetSessionRender(sessionId: string) {
    try {
      return await aiChatPersistStore.getSessionRender(sessionId, this.resolvePersistSource(sessionId))
    } catch {
      return undefined
    }
  }

  /** 按 token 获取会话消息内容 */
  private async persistGetSessionContent(sessionId: string, token: string) {
    try {
      return await aiChatPersistStore.getSessionContent(sessionId, token)
    } catch {
      return undefined
    }
  }
  /** 按 token 列表批量获取会话消息内容 */
  private async persistGetSessionContents(sessionId: string, tokens: string[]) {
    try {
      return await aiChatPersistStore.getSessionContents(sessionId, tokens)
    } catch {
      return []
    }
  }

  /** 按 token 列表批量获取会话参考资料（按落库时间正序） */
  public async getSessionReferenceMaterials(sessionId: string, tokens: string[]) {
    try {
      return await aiChatPersistStore.getSessionReferences(sessionId, tokens)
    } catch {
      return []
    }
  }

  /** 按 source 清除该来源下所有 session 的持久化数据 */
  public async persistDeleteBySource(source: AISource) {
    try {
      await aiChatPersistStore.deletePersistBySource(source)
    } catch {
      // 持久化失败不打断主流程
    }
  }

  /**
   * 将渲染树写入 zustand，并批量灌回首屏 contents。
   * @param content 优先用 start 时暂存的树；未传则再读 IDB 整行
   *
   * 注意：必须先把 contents 灌进 Map，再 hydrate 渲染树。
   * UI（StaticChatContent 等）靠 renderNum 订阅，rawData.contents 原地 set 不会触发重渲染；
   * 若先 hydrate，组件会在 contents 仍空时读一次并卡住空白。
   * 任务规划树不走本方法，由 handleSessionStartSuccess 的 PLAN_EXEC_TASKS sync 拉取。
   */
  private async loadSessionRenderToMemory(sessionId: string, content?: SessionRenderContent) {
    let tree = content
    if (!tree) {
      const row = await this.persistGetSessionRender(sessionId)
      tree = row?.content
    }
    if (!hasSessionRenderTree(tree)) return false

    const { store, rawData } = this.ensureSession(sessionId)

    const tokens = collectTopLevelContentTokens(tree!, ChatMultiSessionController.INITIAL_CONTENT_TOP_COUNT)
    if (tokens.length) {
      const rows = await this.persistGetSessionContents(sessionId, tokens)
      for (const row of rows) {
        rawData.contents.set(row.token, row.content)
      }
    }

    store.getState().hydrateRenderTree(tree!)
    return true
  }

  /** 仅删除内存 contents 中的条目，不删渲染树 / IDB */
  public removeContentsFromMemory(sessionId: string, tokens: string[]) {
    const { rawData } = this.ensureSession(sessionId)
    for (const token of tokens) {
      rawData.contents.delete(token)
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
      this.storePool.set(
        sessionId,
        createChatStore({
          onRenderStructureChange: () => this.markSessionRenderDirty(sessionId),
        }),
      )
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

  /**
   * 建立指定 session 连接（新会话首问 / 打开历史 / 无问侧重连 共用）。
   * - 有 UserQuery：立刻上屏首问，pong 后发问；无树时不强制 recovery_history
   * - 无 UserQuery：视为恢复态，置 switchLoading，pong 后 hydrate 或发 recovery_history
   */
  public handleStartSession(requestParams: AIChatIPCStartParams, cb?: (sessionId: string) => void) {
    const { token: sessionId, params, route, pageId } = requestParams
    const isExec = this.readyChannels.has(sessionId)
    if (isExec) {
      yakitNotify('warning', '会话已经存在，请勿重复建立！')
      return
    }

    const { request, store, rawData, meta } = this.ensureSession(sessionId)
    const userQuery = (params.Params?.UserQuery || '').trim()

    // 恢复态：遮罩防止 hydrate / recovery 期间误点（UI 订阅 store.switchLoading）
    if (userQuery) {
      store.getState().updateState({ execute: true, casualTitle: '发送问题，开启会话...' })
    } else {
      store.getState().updateState({ execute: true, switchLoading: true, casualTitle: '加载会话中...' })
      this.sessionRestoreLoading.add(sessionId)
    }

    this.registerSessionChannel(sessionId, {
      route,
      pageId,
      source: params.Params?.Source,
    })
    this.setActiveShowSession(sessionId)

    Object.assign(request, params.Params)
    if (userQuery) {
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
        FreeInput: userQuery,
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
        data: userQuery,
        AIService: '',
        AIModelName: '',
        // showQS为了UI渲染方便，重新构建的字段
        extraValue: { showQS: userQuery },
      }
      rawData.contents.set(chatData.id, chatData)
      persistIndependentItem(sessionId, chatData)
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

    // 读 IDB + 查最新事件 id（不依赖本会话流），完成后再 IPC start
    void this.prepareSessionPersistBeforeStart(sessionId).finally(() => {
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
    })
  }

  /**
   * start 时立刻对齐 grpcOffset，并暂存 IDB 渲染树供 pong 后 hydrate。
   * 不依赖会话 gRPC 已连通。
   */
  private async prepareSessionPersistBeforeStart(sessionId: string) {
    const { rawData, meta } = this.ensureSession(sessionId)

    try {
      const [eventRes, row] = await Promise.all([
        grpcQueryAIEvent(
          {
            Filter: { SessionID: sessionId },
            Pagination: { Page: 1, Limit: 1, OrderBy: 'created_at', Order: 'desc' },
          },
          true,
        ).catch(() => ({ Events: [] as AIOutputEvent[] })),
        this.persistGetSessionRender(sessionId),
      ])

      const latestId = eventRes?.Events?.[0]?.ID ?? 0
      const final = row?.grpcOffset !== undefined && row.grpcOffset !== null ? row.grpcOffset : latestId
      rawData.grpcOffset = final

      if (hasSessionRenderTree(row?.content)) {
        meta.pendingSessionRender = row!.content
      } else {
        meta.pendingSessionRender = undefined
      }
    } catch {
      rawData.grpcOffset = rawData.grpcOffset || 0
      meta.pendingSessionRender = undefined
    }
  }

  /** 关闭恢复态 loading（hydrate 完成或 recovery 结束时调用） */
  private finishSessionRestoreLoading(sessionId: string) {
    if (!this.sessionRestoreLoading.has(sessionId)) return
    this.sessionRestoreLoading.delete(sessionId)
    const store = this.storePool.get(sessionId)
    store?.getState().updateState({ switchLoading: false })
  }

  /**
   * pong 后：消费暂存树或发 recovery_history。
   * @param needRecoveryHistory 无首问建连（恢复态）时为 true：空树则向后端拉历史
   */
  private async restoreSessionAfterPong(sessionId: string, needRecoveryHistory: boolean) {
    const { store, rawData, meta } = this.ensureSession(sessionId)
    const pending = meta.pendingSessionRender
    meta.pendingSessionRender = undefined

    try {
      if (hasSessionRenderTree(pending)) {
        await this.loadSessionRenderToMemory(sessionId, pending)
        const state = store.getState()
        const content: SessionRenderContent = {
          items: { ...state.items },
          groups: { ...state.groups },
          tasks: { ...state.tasks },
          casualElements: [...state.casualChat.elements],
          taskElements: [...state.taskChat.elements],
        }
        await this.persistSetSessionRender(sessionId, content, rawData.grpcOffset)
        this.finishSessionRestoreLoading(sessionId)
      } else if (needRecoveryHistory) {
        // 保持 switchLoading，等 recovery_history 再关，避免 UI 提前可点
        this.requestMessage(sessionId, {
          IsSyncMessage: true,
          SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_HISTORY,
          SyncJsonInput: JSON.stringify({
            start_id: rawData.grpcOffset,
            limit: RECOVERY_HISTORY_LIMIT,
          }),
        })
      } else {
        // 带首问的新会话：用当前 store 快照（可能已有首问）+ offset
        const state = store.getState()
        const content: SessionRenderContent = {
          items: { ...state.items },
          groups: { ...state.groups },
          tasks: { ...state.tasks },
          casualElements: [...state.casualChat.elements],
          taskElements: [...state.taskChat.elements],
        }
        await this.persistSetSessionRender(sessionId, content, rawData.grpcOffset)
        this.finishSessionRestoreLoading(sessionId)
      }
    } catch {
      this.finishSessionRestoreLoading(sessionId)
    }
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
          persistIndependentItem(token, chatData)
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
                persistIndependentItem(token, review)
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
                persistIndependentItem(token, review)
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
                persistIndependentItem(token, review)
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

          void this.restoreSessionAfterPong(sessionId, false).finally(() => {
            this.handleSessionStartSuccess(sessionId)
            meta.onLinkSuccess?.(sessionId)
            meta.onLinkSuccess = undefined
          })
        } else {
          void this.restoreSessionAfterPong(sessionId, true).finally(() => {
            this.handleSessionStartSuccess(sessionId)
            meta.onLinkSuccess?.(sessionId)
            meta.onLinkSuccess = undefined
          })
        }
        return
      }

      if (res.Type === 'structured' && res.NodeId === 'recovery_history') {
        try {
          const recoveryHistory = JSON.parse(ipcContent) as AIAgentGrpcApi.RecoveryHistory
          if (typeof recoveryHistory.next_start_id === 'number') {
            rawData.grpcOffset = recoveryHistory.next_start_id
            const state = store.getState()
            const content: SessionRenderContent = {
              items: { ...state.items },
              groups: { ...state.groups },
              tasks: { ...state.tasks },
              casualElements: [...state.casualChat.elements],
              taskElements: [...state.taskChat.elements],
            }
            void this.persistSetSessionRender(sessionId, content, rawData.grpcOffset)
          }
        } catch {
          // ignore parse error
        }
        // recovery 批次结束：关闭旧会话 UI/逻辑 loading
        this.finishSessionRestoreLoading(sessionId)
        return
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
    persistIndependentItem(sessionId, data)
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
    persistToolResultIfTerminal(sessionId, chatDetail)
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

  /** 取消已有的 session-end 兜底定时器 */
  private clearSessionEndFallback(sessionId: string) {
    const timer = this.sessionEndFallbackTimers.get(sessionId)
    if (!timer) return
    clearTimeout(timer)
    this.sessionEndFallbackTimers.delete(sessionId)
  }

  /**
   * cancel 后武装 5s 兜底：若真实 -end 未到，手动走 handleSessionEnd
   * 重复 cancel 会重置计时
   */
  private armSessionEndFallback(sessionId: string) {
    this.clearSessionEndFallback(sessionId)
    const timer = setTimeout(() => {
      this.sessionEndFallbackTimers.delete(sessionId)
      this.handleSessionEnd(sessionId)
    }, ChatMultiSessionController.SESSION_END_FALLBACK_MS)
    this.sessionEndFallbackTimers.set(sessionId, timer)
  }

  // 监听 session-error 事件
  public handleSessionError(sessionId: string, error: any) {
    // 暂无业务逻辑处理
  }
  // 监听 session-end 事件（含 cancel 后 5s 兜底合成）
  public handleSessionEnd(sessionId: string, res?: any) {
    this.clearSessionEndFallback(sessionId)

    // 池仍在：走完整收尾；若已 teardown 则只保证摘监听
    if (this.storePool.has(sessionId)) {
      const data = this.ensureSession(sessionId)
      const { store, meta } = data

      this.closeSessionTimers(meta)
      // 任务规划结束后的相关逻辑
      handleTaskPlanEnd({ ...data, sessionId })
      // 核心状态改变
      store.getState().updateState({ execute: false, casualLoading: false, casualTitle: '会话已停止' })
      this.readyChannels.delete(sessionId)

      const onEnd = meta.onEnd
      if (onEnd) {
        onEnd()
        meta.onEnd = undefined
      }
    }

    this.closeIPCListeners(sessionId)

    const pendingDeletePersist = this.pendingDisposeSessions.get(sessionId)
    if (pendingDeletePersist !== undefined) {
      this.pendingDisposeSessions.delete(sessionId)
      this.teardownDisposedSession(sessionId, pendingDeletePersist)
    }
  }

  /**
   * 关闭会话连接（停流）
   * - cancel IPC、更新 execute；不立刻摘 IPC（等 session-end，或 5s 兜底合成 end）
   * - 有 onEnd 时写入 meta，在 session-end / 兜底 移除监听前执行
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
      // 等真实 -end；超时则手动 handleSessionEnd，避免监听泄漏 / onEnd 挂死
      this.armSessionEndFallback(session)
    }
  }

  /**
   * 删除指定的 session（必须清除内存数据）
   * - sessionIds 非空：删集合
   * - sessionIds 空数组：按当前归属全删该 page 下该 source
   * - pageId 为空：按当前归属全删该 route 下所有 page 的 session
   * - 内部会先 forceClose 再卸业务池与双索引，并同步删除该会话 IDB 三表
   * - grpc 删除由上层负责
   */
  public deleteSessions(params: { sessionIds: string[]; source: AISource; route: YakitRouteType; pageId: string }) {
    const ids = this.resolveSessionIds(params)
    for (const sessionId of ids) {
      this.disposeSessionMemory(sessionId, true)
    }
  }

  /**
   * 页面生命周期卸载：卸该「当前」page 下所有 source 的 session 内存（非仅 forceClose）
   * 会 flush 渲染树后保留 IDB，供后续恢复；已 rebind 走的 session 不会被旧页清掉
   */
  public onPageUnload(route: YakitRouteType, pageId: string) {
    const ids = this.resolvePageSessionIds(route, pageId)
    for (const sessionId of ids) {
      this.disposeSessionMemory(sessionId, false)
    }
  }
}

export const globalSessionEngine = new ChatMultiSessionController()
