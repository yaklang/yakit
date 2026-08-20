import type { AIAgentChatData, AIAgentChatMetaData } from '@/pages/ai-agent/type/aiChat'
import {
  AIInputEventSyncTypeEnum,
  AISourceEnum,
  AITaskStatus,
  type AIAgentGrpcApi,
  type AIEventQueryRequest,
  type AIInputEvent,
  type AIOutputEvent,
  type AIStartParams,
} from './grpcApi'
import { createChatStore } from './chatStore'
import { sessionStatusStore, SessionDeleteStatus } from './sessionStatus/sessionStatusStore'
import { Uint8ArrayToString } from '@/utils/str'
import {
  AIAgentSettingDefault,
  AIModelTypeEnum,
  AttachedResourceKeyEnum,
  AttachedResourceTypeEnum,
} from '@/pages/ai-agent/defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import {
  DefaultAgentChatStatus,
  DefaultAgentLoadingTitle,
  DefaultMemoryList,
  DefaultTaskPlanEndGate,
} from './defaultConstant'
import { grpcAIMessageHandlers } from './grpcStreamHandler/grpcAIOutputEventHandlers'
import { genExecTasks, handleTaskPlanEnd, pushLogToOtherWindow } from './utils'
import type { AIChatIPCStartParams, AIChatSendParams } from './type'
import { yakitNotify } from '@/utils/notification'
import {
  type AIChatQSData,
  AIChatQSDataTypeEnum,
  type AIFileSystemPin,
  type AIToolResult,
  type SessionRenderContent,
} from './aiRender'
import { aiAgentLogEmitter } from './AIAgentLogEmitter'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import type { YakitRouteType } from '@/enums/yakitRoute'
import { grpcQueryAIEvent } from '@/pages/ai-agent/grpc'
import aiChatPersistStore from './persist/aiChatPersistStore'
import {
  drainSessionContentWrites,
  persistIndependentItem,
  persistToolResultIfTerminal,
  applyHydratedStageSettled,
} from './persist/contentPersistHelper'
import type { DeleteSessionsAISourceType } from '@/pages/ai-agent/historyChat/utils'

const { ipcRenderer } = window.require('electron')

/** deleteSessions 入参：按 id / 按 source 列表 / 全库清删（deleteAll） */
export type DeleteSessionsParams = {
  /** 有值：只删这些 id */
  sessionIds?: string[]
  /** 有值且非 deleteAll：限定这些 source（sessionIds 空时删其下全部） */
  source?: DeleteSessionsAISourceType[]
  /** true：删除所有 session、所有 source（清库）；忽略 sessionIds / source */
  deleteAll?: boolean
}

/** 检查渲染树(element) 是否存在有效数据 */
const hasSessionRenderTree = (content?: SessionRenderContent): boolean => {
  if (!content) return false
  return (
    (content.chatElements?.length || 0) > 0 ||
    Object.keys(content.items || {}).length > 0 ||
    Object.keys(content.groups || {}).length > 0 ||
    Object.keys(content.tasks || {}).length > 0
  )
}

// #region 生成初始化数据
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

    taskDetailsMap: new Map(),
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
  }
}
// #endregion

// #region session-source-route-pageId 索引管理相关公共定义和工具方法
/** page 归属键：`${route}::${pageId}`，pageId 为当前归属 */
type PageKey = string
interface SessionOwner {
  /** 不可变：注册后锁死 */
  readonly route: YakitRouteType
  /** 不可变：注册后锁死。本地索引维度，可能为平台区分型（im-Lark / im-DingTalk）
   * 飞书/钉钉历史会话中点击，启动时确认来源
   */
  readonly source: DeleteSessionsAISourceType
  /** 可变：始终存当前 page */
  pageId: string
}

/** 生成 route::pageId 的唯一标识 */
const makePageKey = (route: YakitRouteType, pageId: string): PageKey => `${route}::${pageId}`

/**
 * 从渲染树快照收集「首屏」正文 token：
 * casual / task 两侧顶层 elements 各取最后 topCount 条，并展开 group/task 的 childrenTokens。
 * 最多两层：group 的 children 是叶子 item；task 的 children 可能是 group 或 item，
 * group 下不再嵌套 group，所以固定两层展开即可。
 */
const collectTopLevelContentTokens = (content: SessionRenderContent, topCount: number): string[] => {
  const tokenSet = new Set<string>()
  const appendFromElements = (elements: SessionRenderContent['chatElements']) => {
    const top = elements.slice(-topCount)
    for (const el of top) {
      tokenSet.add(el.token)
      if (el.kind === 'group') {
        const group = content.groups[el.token]
        group?.childrenTokens?.forEach((t) => tokenSet.add(t))
      } else if (el.kind === 'task') {
        const task = content.tasks[el.token]
        task?.childrenTokens?.forEach((childToken) => {
          tokenSet.add(childToken)
          // task 的 child 可能是 group，再展开一层 group 的 children（叶子 item）
          const childGroup = content.groups[childToken]
          childGroup?.childrenTokens?.forEach((t) => tokenSet.add(t))
        })
      }
    }
  }
  appendFromElements(content.chatElements || [])
  // taskElements 和 casualElement 合并成 新字段 chatElements （dispatchStreamingNode 统一写入 chatElements），不再单独收集
  return [...tokenSet]
}
// #endregion

export class ChatMultiSessionController {
  // #region 常量定义
  /** 渲染树-element debounce 落库 IDB 延迟时间 */
  private static readonly RENDER_PERSIST_DEBOUNCE_MS = 3000
  /** cancel 后等待真实 session-end 的最长时间，超时则合成 end */
  private static readonly SESSION_END_FALLBACK_MS = 5000
  /** 恢复会话时首屏灌入 contents 的顶层条数（两侧列表各自截取） */
  private static readonly INITIAL_CONTENT_TOP_COUNT = 20
  /** recovery_history 单次拉取条数 */
  private static readonly RECOVERY_HISTORY_LIMIT = 60
  /** ping请求探连成功的轮询时间 */
  private static readonly PING_POLLING_INTERVAL = 3000
  // #endregion

  // #region session-source-route-pageId 索引管理相关变量和逻辑
  /**
   * 正向索引：按「当前」page 关页 / 全删
   * pageId 换绑后旧 PageKey 不再包含该 session
   */
  private pageSessionMap = new Map<PageKey, Map<DeleteSessionsAISourceType, Set<string>>>()
  /**
   * 反向索引：按 sessionId O(1) 定位；换绑时只改 pageId 并搬动正向索引
   */
  private sessionOwnerMap = new Map<string, SessionOwner>()

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
  private registerSessionChannel(
    sessionId: string,
    owner: { route: YakitRouteType; pageId: string; source?: DeleteSessionsAISourceType },
  ) {
    const source: DeleteSessionsAISourceType = owner.source || 'ai'
    const existing = this.sessionOwnerMap.get(sessionId)

    if (existing) {
      // 禁止改 route / source
      // 但是session已经存在，直接启动即可，不需要rebind
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
   * 解析 deleteSessions 目标 id。
   * - deleteAll：全部索引中的 session
   * - sessionIds 非空：用传入集合
   * - 否则必须带非空 source：这些 source 下全部（跨 route / page）
   * - 非法（空 id 且无 source 且非 deleteAll）：返回 null
   */
  private resolveDeleteSessionIds(params: DeleteSessionsParams): string[] | null {
    const { sessionIds, source, deleteAll } = params
    if (deleteAll) return [...this.sessionOwnerMap.keys()]
    if (sessionIds?.length) return [...sessionIds]
    if (source?.length) {
      const sourceSet = new Set(source)
      const ids: string[] = []
      for (const [sessionId, owner] of this.sessionOwnerMap) {
        if (sourceSet.has(owner.source)) ids.push(sessionId)
      }
      return ids
    }
    console.error('[ChatMultiSessionController] deleteSessions: invalid params', params)
    return null
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
   * 按 source + route 查询当前索引中的 sessionId 集合（跨该 route 下所有 pageId）
   */
  public getSessionIdsBySourceAndRoute(source: DeleteSessionsAISourceType, route: YakitRouteType): string[] {
    const ids: string[] = []
    for (const [sessionId, owner] of this.sessionOwnerMap) {
      if (owner.source === source && owner.route === route) {
        ids.push(sessionId)
      }
    }
    return ids
  }

  /** 从传入的 sessionId 集合中筛出 store.execute === true 的会话 */
  public filterExecutingSessionIds(sessionIds: string[]): string[] {
    return sessionIds.filter((sessionId) => this.getSessionExecute(sessionId))
  }

  /**
   * 只读查询 session 是否在执行中；无内存池时返回 false，不会 ensureSession 造空池
   */
  public getSessionExecute(sessionId: string): boolean {
    return this.storePool.get(sessionId)?.getState().execute === true
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
  // #endregion

  /** 存放已建立连接的会话session集合 */
  private readyChannels = new Set<string>()
  /** 会话是否仍占坑（已 start 且尚未 end，含 cancel 等待 end 的窗口） */
  public isSessionReady(sessionId: string) {
    return this.readyChannels.has(sessionId)
  }
  /**
   * 待卸池的 session：forceClose 后保留监听与业务池，等 end / 兜底超时再 teardown
   * value 为 dispose 时的 deletePersist 标记
   */
  private pendingDisposeSessions = new Map<string, boolean>()

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
    const { Source: _omit, ...rest } = config as AIStartParams
    Object.assign(request, rest)
  }

  private activeShowSession: string = ''
  /** 设置当前展示的会话 Session */
  public setActiveShowSession(sessionId: string) {
    this.activeShowSession = sessionId
  }
  /** 判断指定会话是否当前正在展示 */
  public isActiveShowSession(sessionId: string) {
    return this.activeShowSession === sessionId
  }

  // #region IndexedDB 持久化门面（薄封装 aiChatPersistStore，错误兜底不抛穿 UI）
  /**
   * sessionRender 写串行链：同一 session 的渲染树写排队执行。
   * 作用有二：
   *  1. 保证 hydrate 快照写与随后的流式 flush 写不并发交叠（后写覆盖先写语义成立）
   *  2. teardownDisposedSession 删除 IDB 前 drainRenderWrites 排干在飞写，
   *     避免 delete 后迟到的 put 又写回孤儿行
   */
  private renderWriteChains = new Map<string, Promise<unknown>>()
  private enqueueRenderWrite(sessionId: string, task: () => Promise<unknown>): Promise<unknown> {
    const next = (this.renderWriteChains.get(sessionId) || Promise.resolve()).then(task, task)
    this.renderWriteChains.set(sessionId, next)
    next.finally(() => {
      if (this.renderWriteChains.get(sessionId) === next) {
        this.renderWriteChains.delete(sessionId)
      }
    })
    return next
  }
  /** 排干该 session 所有在飞的渲染树写；resolve 时链已排空 */
  private drainRenderWrites(sessionId: string): Promise<unknown> {
    return this.renderWriteChains.get(sessionId)?.catch(() => {}) || Promise.resolve()
  }

  /** 从 sessionOwnerMap 取 source，兜底 'ai' */
  private resolvePersistSource(sessionId: string): DeleteSessionsAISourceType {
    return this.sessionOwnerMap.get(sessionId)?.source || AISourceEnum.aiAgent
  }

  /** 保存会话渲染树(element)和grpcOffset */
  private persistSetSessionRender(
    sessionId: string,
    content: SessionRenderContent,
    grpcOffset?: number,
  ): Promise<unknown> {
    // 显式删库窗口：禁止再写，避免与 dispose drain / by-source 扫尾竞态
    if (this.pendingDisposeSessions.get(sessionId) === true) return Promise.resolve()

    // 同步计算 offset / source 并闭包捕获，避免 enqueue 后 session 被 teardown 导致取不到
    const offset = grpcOffset ?? this.rawDataPool.get(sessionId)?.grpcOffset ?? 0
    const source = this.resolvePersistSource(sessionId)
    return this.enqueueRenderWrite(sessionId, () =>
      aiChatPersistStore.setSessionRender(sessionId, source, content, offset).catch(() => {
        // 持久化失败不打断主流程
      }),
    )
  }
  /** 获取会话渲染树和grpcOffset */
  private async persistGetSessionRender(sessionId: string) {
    try {
      return await aiChatPersistStore.getSessionRender(sessionId, this.resolvePersistSource(sessionId))
    } catch {
      return undefined
    }
  }

  /** 按 token 列表批量获取会话消息内容 */
  public async persistGetSessionContents(sessionId: string, tokens: string[]) {
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
  public async persistDeleteBySource(source: DeleteSessionsAISourceType) {
    try {
      await aiChatPersistStore.deletePersistBySource(source)
    } catch {
      // 持久化失败不打断主流程
    }
  }

  /** 清空三表全部持久化数据 */
  public async persistDeleteAll() {
    try {
      await aiChatPersistStore.deleteAllPersist()
    } catch {
      // 持久化失败不打断主流程
    }
  }

  /**
   * 将渲染树写入 chatStore，并批量灌回首屏 contents。
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
        applyHydratedStageSettled(row.content)
        rawData.contents.set(row.token, row.content)
      }
    }

    store.getState().hydrateRenderTree(tree!)
    return true
  }

  /** 仅删除内存 contents 中的条目，不删渲染树 / IDB。未传 tokens 或空数组则清空该 session 全部 contents。池不存在时 no-op（不 ensureSession）。 */
  public removeContentsFromMemory(sessionId: string, tokens?: string[]) {
    const rawData = this.rawDataPool.get(sessionId)
    if (!rawData) return
    if (!tokens || tokens.length === 0) {
      rawData.contents.clear()
      return
    }
    for (const token of tokens) {
      rawData.contents.delete(token)
    }
  }
  // #endregion

  // #region 渲染树-element debounce 落库 IDB
  /** 渲染树(element相关数据) debounce 定时器 */
  private renderPersistTimers = new Map<string, ReturnType<typeof setTimeout>>()

  /** 取消该 session 的渲染树 debounce（不写 IDB） */
  private clearSessionRenderPersistTimer(sessionId: string) {
    const timer = this.renderPersistTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.renderPersistTimers.delete(sessionId)
    }
  }

  /** chatStore.dispatchStreamingNode触发后防抖3s，无新变更再写入 sessionRender */
  private markSessionRenderDirty(sessionId: string) {
    // 已进入卸池流程：禁止再入内存，避免覆盖 dispose 时已 flush 的 IDB
    if (this.pendingDisposeSessions.has(sessionId)) return

    this.clearSessionRenderPersistTimer(sessionId)
    const timer = setTimeout(() => {
      // 到期后统一走 flush：摘 timer、清 dirty、写 IDB（外部强制 flush 也走同一套）
      this.flushSessionRender(sessionId)
    }, ChatMultiSessionController.RENDER_PERSIST_DEBOUNCE_MS)
    this.renderPersistTimers.set(sessionId, timer)
  }

  /** 立即刷写渲染树快照并清除 dirty/timer */
  private flushSessionRender(sessionId: string) {
    this.clearSessionRenderPersistTimer(sessionId)

    const store = this.storePool.get(sessionId)
    const rawData = this.rawDataPool.get(sessionId)
    if (!store || !rawData) return
    const state = store.getState()
    const content: SessionRenderContent = {
      items: { ...state.items },
      groups: { ...state.groups },
      tasks: { ...state.tasks },
      chatElements: [...state.chatElements],
    }
    void this.persistSetSessionRender(sessionId, content, rawData.grpcOffset)
  }
  // #endregion

  /**
   * 无 UserQuery 建连进入恢复态：initLoading 为 true，
   * 待 hydrate / recovery_history 结束后再关
   */
  private sessionRestoreLoading = new Set<string>()

  /**
   * cancel 后等待 session-end 的兜底定时器：超时则手动走 handleSessionEnd（摘监听 + 收尾）
   * 避免 end 丢失导致监听泄漏 / onEnd 永不触发
   */
  private sessionEndFallbackTimers = new Map<string, ReturnType<typeof setTimeout>>()
  /** 等待 session-end 的调用方；同一会话可被多个流程同时等待 */
  private sessionEndWaiters = new Map<string, Set<() => void>>()

  /** 唤醒等待指定 session-end 的所有调用方 */
  private resolveSessionEndWaiters(sessionId: string) {
    const waiters = this.sessionEndWaiters.get(sessionId)
    if (!waiters) return
    this.sessionEndWaiters.delete(sessionId)
    waiters.forEach((resolve) => resolve())
  }

  /** 等待指定 session 的 end / dispose teardown 完成 */
  private waitSessionEnd(sessionId: string): Promise<void> {
    return new Promise((resolve) => {
      let waiters = this.sessionEndWaiters.get(sessionId)
      if (!waiters) {
        waiters = new Set()
        this.sessionEndWaiters.set(sessionId, waiters)
      }
      waiters.add(resolve)
    })
  }

  /**
   * 停止仍在执行的会话，并等待真实 session-end 或 fallback 完成。
   * 无执行态会话时立即完成；所有 cancel 并发发出，等待上限不叠加。
   */
  public async stopExecutingSessionsAndWait(sessionIds: string[]): Promise<void> {
    const executingSessionIds = [...new Set(this.filterExecutingSessionIds(sessionIds))]
    if (!executingSessionIds.length) return

    const waitForEnd = executingSessionIds.map(
      (sessionId) =>
        new Promise<void>((resolve) => {
          let waiters = this.sessionEndWaiters.get(sessionId)
          if (!waiters) {
            waiters = new Set()
            this.sessionEndWaiters.set(sessionId, waiters)
          }
          waiters.add(resolve)
        }),
    )

    this.forceCloseSession({ sessionIds: executingSessionIds })
    await Promise.all(waitForEnd)
  }

  /** 取消已有的 session-end 兜底定时器 */
  private clearSessionEndFallback(sessionId: string) {
    const timer = this.sessionEndFallbackTimers.get(sessionId)
    if (!timer) return
    clearTimeout(timer)
    this.sessionEndFallbackTimers.delete(sessionId)
  }

  /**
   * 建立会话时，获取grpc库中最新数据ID和IDB里的数据
   * 对齐offset，设置出最新的grpcOffset数据
   * 将IDB里渲染树(element)暂存, 供 pong 后 hydrate。
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

  /**
   * 建立指定 session 连接（新会话首问 / 打开历史 / 无问侧重连 共用）。
   * 调用方应先用 isSessionReady 判重并挂好 IPC 监听，再调本方法（prepare 异步，invoke 晚于监听）。
   * - 有 UserQuery：立刻上屏首问，pong 后发问；无树时不强制 recovery_history
   * - 无 UserQuery：视为恢复态，置 initLoading，pong 后 hydrate 或发 recovery_history
   * @returns 是否真正发起了建连
   */
  public handleStartSession(requestParams: AIChatIPCStartParams, cb?: (sessionId: string) => void): boolean {
    const { token: sessionId, params, route, pageId, localSource } = requestParams
    if (this.readyChannels.has(sessionId)) {
      yakitNotify('warning', '会话已经存在，请勿重复建立！')
      return false
    }

    this.registerSessionChannel(sessionId, {
      route,
      pageId,
      // localSource 仅本地索引用（IM 按平台区分 im-Lark/im-DingTalk）；缺省回退 Params.Source
      source: localSource ?? params.Params?.Source,
    })

    const { request, store, rawData, meta } = this.ensureSession(sessionId)
    const userQuery = (params.Params?.UserQuery || '').trim()

    // 恢复态：遮罩防止 hydrate / recovery 期间误点（UI 订阅 store.initLoading）
    if (userQuery) {
      store.getState().updateState({
        execute: true,
        currentLoadingTitle: { casualTitle: '会话初始化中...', planTitle: '' },
      })
    } else {
      store.getState().updateState({
        execute: true,
        initLoading: true,
        currentLoadingTitle: { casualTitle: '获取历史数据中...', planTitle: '' },
      })
      this.sessionRestoreLoading.add(sessionId)
    }

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
      }, ChatMultiSessionController.PING_POLLING_INTERVAL)
    })
    return true
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

      // 向上加载历史（recovery_history）进行中时禁止发送消息，避免与 gRPC 查询并发导致后端表死锁
      if (store.getState().grpcLoadMoreLoading) {
        yakitNotify('warning', '历史消息加载中，请稍后再发送')
        return
      }

      if (params.IsFreeInput) {
        const { currentChatStatus } = store.getState()
        // 如果问题的状态不是进行中，则属于空闲状态
        const isCasualIdle = currentChatStatus.status !== AITaskStatus.inProgress

        if (isCasualIdle) {
          // 自由对话没有问题进行中时，才改变loading的title
          store.getState().updateState({ currentLoadingTitle: { casualTitle: '等待AI回复...', planTitle: '' } })

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
            const isExist = store.getState().currentReviewDetail.token === params.InteractiveId
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
                store.getState().updateState({ currentReviewDetail: { token: '', renderNum: 0 } })
                break
              case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
              case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
                // review操作后移除review数据
                review.data.selected = params.InteractiveJSONInput
                review.data.optionValue = optionValue
                rawData.contents.delete(review.id)
                store.getState().updateState({ currentReviewDetail: { token: '', renderNum: 0 } })
                break
              default:
                break
            }
          }
          break
        case 'task':
          if (params.IsInteractiveMessage && params.InteractiveId) {
            const isExist = store.getState().currentReviewDetail.token === params.InteractiveId
            const review = rawData.contents.get(params.InteractiveId)
            if (!isExist || !review) {
              yakitNotify('error', '未获取到 review 信息, 操作无效')
              return
            }

            store.getState().updateState({ currentReviewDetail: { token: '', renderNum: 0 } })
            switch (review.type) {
              case AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP:
              case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
                // 任务规划的task_review和tool_review会在自动执行continue操作，不会在UI上展示
                // 如果能进入该逻辑，说明有问题
                console.error(`未知错误[handleSendMessage]: ${JSON.stringify(payload)}`)
                break
              case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
                // review操作后移除review数据
                review.data.selected = params.InteractiveJSONInput
                review.data.optionValue = optionValue
                rawData.contents.delete(review.id)
                store.getState().updateState({ currentReviewDetail: { token: '', renderNum: 0 } })
                break
              case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
                review.data.selected = params.InteractiveJSONInput
                review.data.optionValue = optionValue

                if (optionValue === 'continue') {
                  const tasks = review.data
                  const plans = genExecTasks(tasks.plans.root_task)
                  store.getState().updateState({
                    currentPlan: {
                      task_tree: cloneDeep(plans),
                      root_task_name: tasks.plans.root_task.name,
                    },
                  })
                }
                // 清空plan-review的异步拓展信息
                meta.currentPlanReviewExtraId = ''
                meta.planReviewExtraData.clear()
                rawData.contents.delete(review.id)
                store.getState().updateState({ currentReviewDetail: { token: '', renderNum: 0 } })
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
    } catch (error) {
      console.error('handleSendMessage error', error)
    }
  }
  /** 向连接中的会话发送请求 */
  private requestMessage(sessionId: string, request: AIInputEvent) {
    // console.log('requestMessage', sessionId, request)
    ipcRenderer.invoke('send-ai-re-act', sessionId, request)
  }

  /** 发 recovery_history 拉更旧事件（grpcOffset 为起点，向前回溯 RECOVERY_HISTORY_LIMIT 条） */
  public requestRecoveryHistory(sessionId: string) {
    const { store, rawData } = this.ensureSession(sessionId)
    const initLoading = store.getState().initLoading
    const grpcLoadMoreLoading = store.getState().grpcLoadMoreLoading
    if (!initLoading && grpcLoadMoreLoading) return
    if (!initLoading && !grpcLoadMoreLoading) store.getState().updateState({ grpcLoadMoreLoading: true })
    this.requestMessage(sessionId, {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_HISTORY,
      SyncJsonInput: JSON.stringify({
        start_id: rawData.grpcOffset,
        limit: ChatMultiSessionController.RECOVERY_HISTORY_LIMIT,
      }),
    })
  }

  /** timeline 历史单次拉取条数 */
  private static readonly TIMELINE_PAGE_LIMIT = 200

  /**
   * 拉取 timeline 历史（grpcQueryAIEvent 按 NodeId=timeline_item 过滤，BeforeId 游标分页）。
   * 拉回后 reverse 为时间正序，前插到 store.reActTimelines；更新 timelineBeforeId 游标。
   * @returns 是否还有更旧历史（Events.length === LIMIT）
   */
  public async loadTimelineHistory(sessionId: string): Promise<boolean> {
    const { rawData, store } = this.ensureSession(sessionId)
    // 置 loading（驱动 TimelineCard 的 YakitSpin）；与 finally 一致用 store.getState() 取最新
    store.getState().updateState({ timelinesLoading: true })
    try {
      const request: AIEventQueryRequest = {
        Filter: { SessionID: sessionId, NodeId: ['timeline_item'] },
        Pagination: {
          Page: 1,
          Limit: ChatMultiSessionController.TIMELINE_PAGE_LIMIT,
          OrderBy: 'created_at',
          Order: 'desc',
        },
      }
      if (rawData.timelineBeforeId > 0) {
        request.Pagination!.BeforeId = rawData.timelineBeforeId
      }
      const { Events, Total } = await grpcQueryAIEvent(request, true)
      if (Number(Total) === 0) {
        // 已到最旧，置尽头标记，避免 hasMoreTimeline 误判导致无限空查询
        rawData.timelineNoMore = true
        return false
      }

      // 更新游标为最后一条（最旧）的 ID
      rawData.timelineBeforeId = Number(Events[Events.length - 1].ID)
      // 解析为 TimelineItem，reverse 为时间正序（旧→新）
      const timelineItems: AIAgentGrpcApi.TimelineItem[] = Events.map((item) => {
        const ipcContent = Uint8ArrayToString(item.Content) || ''
        return JSON.parse(ipcContent) as AIAgentGrpcApi.TimelineItem
      }).reverse()
      // 前插合并去重：在 store set 回调里拿最新 state 合并，
      // 避免 await 期间实时流推入的新数据被 stale state 覆盖丢失
      store.getState().setReActTimelines(timelineItems)
      const hasMore = Events.length === ChatMultiSessionController.TIMELINE_PAGE_LIMIT
      // 没拉满一页说明已到尽头，置标记
      if (!hasMore) rawData.timelineNoMore = true
      return hasMore
    } catch {
      return false
    } finally {
      store.getState().updateState({ timelinesLoading: false })
    }
  }

  /** 是否还有更旧 timeline 历史可加载（用 timelineNoMore 标记，避免无限空查询） */
  public hasMoreTimeline(sessionId: string): boolean {
    const { rawData } = this.ensureSession(sessionId)
    return !rawData.timelineNoMore
  }

  /**
   * 拉取文件系统历史（grpcQueryAIEvent 按 EventType=filesystem_pin_* 过滤，Limit=-1 全量）。
   * 按 path 去重合并到 store.grpcFolders。无分页。
   */
  public async loadFileSystemHistory(sessionId: string) {
    const { store } = this.ensureSession(sessionId)
    try {
      const request: AIEventQueryRequest = {
        Filter: { SessionID: sessionId, EventType: ['filesystem_pin_directory', 'filesystem_pin_filename'] },
        Pagination: { Page: 1, Limit: -1, OrderBy: 'created_at', Order: 'desc' },
      }
      const { Events, Total } = await grpcQueryAIEvent(request, true)
      if (Total === 0) return

      const files: AIFileSystemPin[] = Events.map((item) => {
        const ipcContent = Uint8ArrayToString(item.Content) || ''
        const { path } = JSON.parse(ipcContent) as AIAgentGrpcApi.FileSystemPin
        return { path, isFolder: item.Type === 'filesystem_pin_directory' }
      })
      // 本批次去重
      const filterFiles: AIFileSystemPin[] = [...new Map(files.map((item) => [item.path, item])).values()]
      // 合并去重交给 store（在 set 回调里拿最新 state，避免 stale state 丢失实时数据）
      store.getState().setGrpcFolders(filterFiles)
    } catch {
      // 持久化失败不打断主流程
    }
  }

  /** 会话建立成功后, 需要做的额外操作 */
  private handleSessionStartSuccess(sessionId: string) {
    const { store, meta } = this.ensureSession(sessionId)

    // 获取任务规划历史任务树
    this.requestMessage(sessionId, {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS,
    })

    // 获取最新记忆列表数据, 并注册轮询定时器
    this.requestMessage(sessionId, { IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_MEMORY_CONTEXT })
    if (meta.memoryPollingTimer) clearInterval(meta.memoryPollingTimer)
    meta.memoryPollingTimer = setInterval(() => {
      this.requestMessage(sessionId, {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_MEMORY_CONTEXT,
      })
    }, 5000)

    // 如果任务规划运行态有数据，则置空
    store.getState().updateState({
      currentChatStatus: cloneDeep(DefaultAgentChatStatus),
      currentLoadingTitle: cloneDeep(DefaultAgentLoadingTitle),
    })

    // 拉取 timeline 历史（首批）+ 文件系统历史（全量），不阻塞建连主流程
    void this.loadTimelineHistory(sessionId)
    void this.loadFileSystemHistory(sessionId)
  }

  /** 关闭恢复态 loading（hydrate 完成或 recovery 结束时调用） */
  private finishSessionRestoreLoading(sessionId: string) {
    if (!this.sessionRestoreLoading.has(sessionId)) return
    this.sessionRestoreLoading.delete(sessionId)
    const store = this.storePool.get(sessionId)
    store?.getState().updateState({ initLoading: false })
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
          chatElements: [...state.chatElements],
        }
        await this.persistSetSessionRender(sessionId, content, rawData.grpcOffset)
        this.finishSessionRestoreLoading(sessionId)
      } else if (needRecoveryHistory) {
        // grpcOffset 为 0：无历史游标可续，不发 recovery_history
        if (!rawData.grpcOffset) {
          const state = store.getState()
          const content: SessionRenderContent = {
            items: { ...state.items },
            groups: { ...state.groups },
            tasks: { ...state.tasks },
            chatElements: [...state.chatElements],
          }
          await this.persistSetSessionRender(sessionId, content, rawData.grpcOffset)
          this.finishSessionRestoreLoading(sessionId)
        } else {
          // 保持 initLoading，等 recovery_history 再关，避免 UI 提前可点
          this.requestRecoveryHistory(sessionId)
        }
      } else {
        // 带首问的新会话：用当前 store 快照（可能已有首问）+ offset
        const state = store.getState()
        const content: SessionRenderContent = {
          items: { ...state.items },
          groups: { ...state.groups },
          tasks: { ...state.tasks },
          chatElements: [...state.chatElements],
        }
        await this.persistSetSessionRender(sessionId, content, rawData.grpcOffset)
      }
    } catch {
      this.finishSessionRestoreLoading(sessionId)
    }
  }

  /** 💥 核心替换：接管原 useChatIPC 里的巨型数据分发逻辑！ */
  public handleGrpcOutputEvent(sessionId: string, res: AIOutputEvent) {
    try {
      if (!this.readyChannels.has(sessionId)) return

      const ipcContent = Uint8ArrayToString(res.Content) || ''
      // console.log('handleGrpcOutputEvent--', sessionId, '\n', res, '\n', ipcContent)

      const { store, rawData, request, meta } = this.ensureSession(sessionId)

      // 标识同步ID已处理
      if (res.SyncID && meta.syncIDMap.has(res.SyncID)) {
        meta.syncIDMap.delete(res.SyncID)
        store.getState().updateStateCount('syncIDUpdate')
      }

      // const mirrorToLogWindow = () => {
      //   aiAgentLogEmitter.dispatch({
      //     session: sessionId,
      //     type: 'log',
      //     Timestamp: res.Timestamp,
      //     log: { level: 'log', message: ipcContent },
      //   })
      // }

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
          store.getState().updateCurrentLoadingTitle({ casualTitle: '等待AI回复...' })

          // 因为有用户问题发送，所以注册 获取问题队列轮询器
          if (meta.queuePollingTimer) clearInterval(meta.queuePollingTimer)
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
              chatElements: [...state.chatElements],
            }
            void this.persistSetSessionRender(sessionId, content, rawData.grpcOffset)
          }
        } catch {
          // ignore parse error
        }
        if (store.getState().grpcLoadMoreLoading) {
          store.getState().updateState({ grpcLoadMoreLoading: false })
        }
        // recovery 批次结束：关闭旧会话 UI/逻辑 loading
        this.finishSessionRestoreLoading(sessionId)
        return
      }

      // 先解析业务 funcKey（对齐旧 useChatIPC：业务 NodeId 优先于纯日志）
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
          'plan_exec_tasks',
        ].includes(res.NodeId)
      ) {
        funcKey = res.NodeId
      } else if (res.Type === 'api_request_failed' && res.NodeId === 'ai_call_failure') {
        funcKey = res.NodeId
      } else if (res.Type === 'report_finish' && res.NodeId === 'report-finish') {
        funcKey = res.NodeId
      } else if (res.Type === 'structured' && res.NodeId === 'system') {
        try {
          const data = JSON.parse(ipcContent) || ''
          if (data && typeof data === 'object' && data?.type === 'push_task') {
            funcKey = 'push_task'
          } else if (data && typeof data === 'object' && data?.type === 'pop_task') {
            funcKey = 'pop_task'
          }
        } catch {
          // system 非合法 JSON 时保持 funcKey=structured
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

      // 纯日志：structured + Log 结构 + 无业务 handler；不可无条件 JSON.parse（stream 等为纯文本）
      if (!handleFunc && res.Type === 'structured') {
        try {
          const parsed = JSON.parse(ipcContent)
          if (
            parsed &&
            typeof parsed === 'object' &&
            typeof (parsed as AIAgentGrpcApi.Log).level === 'string' &&
            typeof (parsed as AIAgentGrpcApi.Log).message === 'string'
          ) {
            aiAgentLogEmitter.dispatch({
              session: sessionId,
              type: 'log',
              Timestamp: res.Timestamp,
              log: parsed as AIAgentGrpcApi.Log,
            })
            return
          }
        } catch {
          // 非合法 JSON / 非 Log 结构，走下方通用抄送
        }
      }

      // 所有业务数据，均抄送一份到日志中
      // mirrorToLogWindow()

      if (handleFunc) {
        const result = handleFunc({
          sessionId,
          res,
          chatType: store.getState().currentChatStatus.coordinatorId === res.CoordinatorId ? 'task' : 'reAct',
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
        if (result && typeof result.then === 'function') {
          void result.catch((error) => {
            console.error('handleGrpcOutputEvent error', error)
          })
        }
      }
    } catch (error) {
      console.error('handleGrpcOutputEvent error', error)
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

    const currentReview = store.getState().currentReviewDetail
    if (!currentReview.token || currentReview.token !== reviewDetail.id) return

    rawData.contents.delete(currentReview.token)
    store.getState().updateState({ currentReviewDetail: { token: '', renderNum: 0 } })
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

  /**
   * 停流并卸池（deleteSessions / onPageUnload）
   * - 仍 ready：pendingDispose + forceClose，等 end/fallback 后 teardown
   * - 已 end：直接 teardown
   * - deletePersist=true 时 await drain + 删 IDB，再让 waiters resolve
   */
  private async disposeSessionMemory(sessionId: string, deletePersist = false): Promise<void> {
    // 已在卸池：可升级为删 IDB，并复用同一次 end/teardown
    if (this.pendingDisposeSessions.has(sessionId)) {
      if (deletePersist) this.pendingDisposeSessions.set(sessionId, true)
      await this.waitSessionEnd(sessionId)
      return
    }

    // 已收到 session-end：无需 cancel，直接卸池
    if (!this.readyChannels.has(sessionId)) {
      await this.teardownDisposedSession(sessionId, deletePersist)
      return
    }

    if (deletePersist) {
      this.clearSessionRenderPersistTimer(sessionId)
    } else {
      this.flushSessionRender(sessionId)
    }

    const done = this.waitSessionEnd(sessionId)
    // 先标记 pending，再 forceClose：关停窗口内迟到的结构变更不再 arm dirty
    this.pendingDisposeSessions.set(sessionId, deletePersist)
    this.forceCloseSession({ sessionIds: [sessionId] })
    await done
  }

  /** end / 兜底超时后：摘池与归属索引；deletePersist 时 await drain + 删 IDB */
  private async teardownDisposedSession(sessionId: string, deletePersist: boolean): Promise<void> {
    // 卸池前清 debounce，避免空 ensureSession 后迟到 timer 把 IDB 盖成空树
    this.clearSessionRenderPersistTimer(sessionId)
    this.sessionRestoreLoading.delete(sessionId)

    this.readyChannels.delete(sessionId)

    if (this.activeShowSession === sessionId) {
      this.activeShowSession = ''
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
      // 先排干该 session 所有在飞的 IDB 写，再 delete，避免 delete 后迟到 put 写回孤儿行
      try {
        await Promise.all([this.drainRenderWrites(sessionId), drainSessionContentWrites(sessionId)])
        await aiChatPersistStore.deleteSessionPersist(sessionId)
      } catch {
        // 持久化失败不打断主流程
      }
      return
    }
    // deletePersist=false（页面卸载）时不排干：dispose 已先 flush，异步写靠闭包完成即可
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
    console.error('handleSessionError--', sessionId, error)
  }

  // 监听 session-end 事件（含 cancel 后 5s 兜底合成）
  public handleSessionEnd(sessionId: string, res?: any) {
    this.clearSessionEndFallback(sessionId)

    // 先取出 onEnd：须在 teardown 之后再调，避免回调里重启时池已被卸掉 / 仍占坑
    let onEnd: (() => void) | undefined

    // 池仍在：走完整收尾；若已 teardown 则只保证摘监听
    if (this.storePool.has(sessionId)) {
      const data = this.ensureSession(sessionId)
      const { store, meta } = data

      this.closeSessionTimers(meta)
      // 任务规划结束后的相关逻辑
      handleTaskPlanEnd({ ...data, sessionId }, true)
      store.getState().updateState({ execute: false })
      store.getState().updateCurrentChatStatus({ status: AITaskStatus.error })
      store.getState().updateCurrentLoadingTitle({ casualTitle: '会话已关闭' })
      this.readyChannels.delete(sessionId)

      onEnd = meta.onEnd
      meta.onEnd = undefined
    }

    this.closeIPCListeners(sessionId)

    const pendingDeletePersist = this.pendingDisposeSessions.get(sessionId)
    // dispose 窗口内可能仍有结构/内容变更：卸池前再刷一次树（显式删 IDB 时无需写）
    if (this.storePool.has(sessionId) && pendingDeletePersist !== true) {
      this.flushSessionRender(sessionId)
    }

    if (pendingDeletePersist !== undefined) {
      this.pendingDisposeSessions.delete(sessionId)
      // 等 teardown（含删 IDB 时的 drain）完成再唤醒 dispose waiters / onEnd
      void this.teardownDisposedSession(sessionId, pendingDeletePersist).finally(() => {
        this.resolveSessionEndWaiters(sessionId)
        onEnd?.()
      })
      return
    }

    this.resolveSessionEndWaiters(sessionId)
    onEnd?.()
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
      // 等真实 -end；超时则手动 handleSessionEnd，避免监听泄漏 / onEnd 挂死
      this.armSessionEndFallback(session)
      ipcRenderer.invoke('cancel-ai-re-act', session).catch(() => {})
      const store = this.storePool.get(session)
      if (store) {
        store.getState().updateState({ execute: false })
        store.getState().updateCurrentLoadingTitle({ casualTitle: '会话正在关闭...' })
      }
      if (meta) this.closeSessionTimers(meta)
    }
  }

  /** 该 session 是否仍在内存业务池中（无池则多为仅 IDB 有数据的孤儿 session） */
  private hasSessionMemory(sessionId: string) {
    return (
      this.storePool.has(sessionId) ||
      this.rawDataPool.has(sessionId) ||
      this.metaPool.has(sessionId) ||
      this.requestPool.has(sessionId)
    )
  }

  /**
   * 无内存池的 session：清理索引/监听后删 IDB，不走 forceClose 异步链
   * 写队列是模块级、可晚于内存池存活，删前仍需 drain，避免迟到 put 复活孤儿行
   */
  private async deletePersistOnlySession(sessionId: string): Promise<void> {
    this.clearSessionRenderPersistTimer(sessionId)
    this.pendingDisposeSessions.delete(sessionId)
    this.clearSessionEndFallback(sessionId)
    this.closeIPCListeners(sessionId)
    this.readyChannels.delete(sessionId)
    this.sessionRestoreLoading.delete(sessionId)

    if (this.activeShowSession === sessionId) {
      this.activeShowSession = ''
    }

    const owner = this.sessionOwnerMap.get(sessionId)
    if (owner) {
      this.removeFromPageSessionMap(owner, sessionId)
      this.sessionOwnerMap.delete(sessionId)
    }

    try {
      await Promise.all([this.drainRenderWrites(sessionId), drainSessionContentWrites(sessionId)])
      await aiChatPersistStore.deleteSessionPersist(sessionId)
    } catch {
      // 持久化失败不打断主流程
    }
  }

  /**
   * 关闭并删除 session（停流与卸池融合在 disposeSessionMemory）
   * - sessionIds 非空：只处理集合
   * - sessionIds 空 + source[]：这些 source 下全部，再逐 source persistDeleteBySource 扫孤儿
   * - deleteAll: true：所有 source，再 deleteAllPersist 清库
   * - grpc 删除由上层负责
   */
  public async deleteSessions(params: DeleteSessionsParams): Promise<void> {
    const { sessionIds, source, deleteAll } = params
    const ids = this.resolveDeleteSessionIds(params)
    if (!ids) return
    // 标记目标会话为 deleting（UI 立即显示 loading + 禁用点击）
    sessionStatusStore.getState().setSessionsDeleteStatus(ids, SessionDeleteStatus.Deleting)

    const executingIds = new Set(this.filterExecutingSessionIds(ids))
    const tasks: Promise<void>[] = []

    for (const sessionId of ids) {
      if (executingIds.has(sessionId) || this.hasSessionMemory(sessionId)) {
        tasks.push(this.disposeSessionMemory(sessionId, true))
      } else {
        tasks.push(this.deletePersistOnlySession(sessionId))
      }
    }

    // 屏障：全部逐 session 删完（含 drain）后再扫尾，避免与 by-source / 清库竞态
    await Promise.all(tasks)

    if (deleteAll) {
      await this.persistDeleteAll()
      // 标记 deleted
      sessionStatusStore.getState().setSessionsDeleteStatus(ids, SessionDeleteStatus.Deleted)
      return
    }
    if (!sessionIds?.length && source?.length) {
      for (const s of source) {
        await this.persistDeleteBySource(s)
      }
    }
    // 标记 deleted
    sessionStatusStore.getState().setSessionsDeleteStatus(ids, SessionDeleteStatus.Deleted)
  }

  /**
   * 页面生命周期卸载：卸该「当前」page 下所有 source 的 session 内存（非仅 forceClose）
   * 会 flush 渲染树后保留 IDB，供后续恢复；已 rebind 走的 session 不会被旧页清掉
   */
  public onPageUnload(route: YakitRouteType, pageId: string) {
    const ids = this.resolvePageSessionIds(route, pageId)
    for (const sessionId of ids) {
      void this.disposeSessionMemory(sessionId, false)
    }
  }
}

export const globalSessionEngine = new ChatMultiSessionController()
