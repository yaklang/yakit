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
import { SessionLifecycle } from './sessionLifecycle'
import { sessionStatusStore, SessionDeleteStatus } from './sessionStatus/sessionStatusStore'
import { Uint8ArrayToString } from '@/utils/str'
import {
  AIAgentSettingDefault,
  AIModelTypeEnum,
  AttachedResourceKeyEnum,
  AttachedResourceTypeEnum,
} from '@/pages/ai-agent/defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import { DefaultAgentChatStatus, DefaultMemoryList, DefaultTaskPlanEndGate } from './defaultConstant'
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
} from './persist/contentPersistHelper'
import type { DeleteSessionsAISourceType } from '@/pages/ai-agent/historyChat/utils'
import { clearThoughtDurationCache } from '@/pages/ai-agent/components/thoughtDuration/ThoughtDuration'
import i18n from '@/i18n/i18n'

const { ipcRenderer } = window.require('electron')
const tAgent = i18n.getFixedT(null, 'aiAgent')

/** deleteSessions 入参：按 id / 按 source 列表 / 全库清删（deleteAll） */
export type DeleteSessionsParams = {
  /** 有值：只删这些 id */
  sessionIds?: string[]
  /** 有值且非 deleteAll：限定这些 source（sessionIds 空时删其下全部） */
  source?: DeleteSessionsAISourceType[]
  /** true：删除所有 session、所有 source（清库）；忽略 sessionIds / source */
  deleteAll?: boolean
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
    lifecycle: new SessionLifecycle(),
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

// #endregion

export class ChatMultiSessionController {
  // #region 常量定义
  /** 渲染树-element debounce 落库 IDB 延迟时间 */
  private static readonly RENDER_PERSIST_DEBOUNCE_MS = 3000
  /** cancel 后等待真实 session-end 的最长时间，超时则合成 end */
  private static readonly SESSION_END_FALLBACK_MS = 5000
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
  /** 删除事务进行中时禁止目标 id / source 新建联，避免扫尾误删新连接缓存。 */
  private pendingDeletes = new Set<DeleteSessionsParams>()

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
      const meta = genAIAgentChatMetaData()
      meta.lifecycle.writable = false
      this.metaPool.set(sessionId, meta)
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

  // #region IndexedDB 持久化门面（读失败兜底，写失败记录并由收尾反馈）
  /**
   * sessionRender 写串行链：同一 session 的渲染树写排队执行。
   * 作用有二：
   *  1. 保证历史恢复快照与随后的流式 flush 按入队顺序提交
   *  2. teardownDisposedSession 删除 IDB 前 drainRenderWrites 排干在飞写，
   *     避免 delete 后迟到的 put 又写回孤儿行
   */
  private renderWriteChains = new Map<string, Promise<unknown>>()
  /** 同一会话的树写入串行执行，任务 Promise 覆盖完整 IDB 事务。 */
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
  /** 等待当前树写队列；调用方先停止旧任务追加写入 */
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
    const lifecycle = this.metaPool.get(sessionId)?.lifecycle
    if (!lifecycle?.current || !lifecycle.writable || this.pendingDisposeSessions.get(sessionId) === true) {
      return Promise.resolve()
    }
    // 入队时捕获 source / offset 和连接身份，不能在旧任务执行时读取新连接。
    const offset = grpcOffset ?? this.rawDataPool.get(sessionId)?.grpcOffset ?? 0
    const source = this.resolvePersistSource(sessionId)
    return this.enqueueRenderWrite(sessionId, async () => {
      if (!lifecycle.current) return
      try {
        await aiChatPersistStore.setSessionRender(sessionId, source, content, offset)
      } catch (error) {
        lifecycle.error ??= error
        console.error('AI session render write failed', error)
      }
    })
  }

  /** 按 token 列表批量获取会话消息内容 */
  public async persistGetSessionContents(sessionId: string, tokens: string[]) {
    try {
      const lifecycle = this.metaPool.get(sessionId)?.lifecycle
      const rows = await aiChatPersistStore.getSessionContents(sessionId, tokens)
      return lifecycle?.current ? rows : []
    } catch {
      return []
    }
  }

  /** 按 token 列表批量获取会话参考资料（按落库时间正序） */
  public async getSessionReferenceMaterials(sessionId: string, tokens: string[]) {
    try {
      const lifecycle = this.metaPool.get(sessionId)?.lifecycle
      const rows = await aiChatPersistStore.getSessionReferences(sessionId, tokens)
      return lifecycle?.current ? rows : []
    } catch {
      return []
    }
  }

  /** 按来源清理缓存；将事务失败交给删除流程处理，不能误报删除成功。 */
  public persistDeleteBySource(source: DeleteSessionsAISourceType) {
    return aiChatPersistStore.deletePersistBySource(source)
  }

  /** 清空三表缓存，等待事务提交。 */
  public persistDeleteAll() {
    return aiChatPersistStore.deleteAllPersist()
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
    const lifecycle = this.metaPool.get(sessionId)?.lifecycle
    if (!lifecycle?.current || !lifecycle.writable || this.pendingDisposeSessions.has(sessionId)) return

    this.clearSessionRenderPersistTimer(sessionId)
    const timer = setTimeout(() => {
      // 到期后统一走 flush：摘 timer、清 dirty、写 IDB（外部强制 flush 也走同一套）
      if (lifecycle.current) void this.flushSessionRender(sessionId)
    }, ChatMultiSessionController.RENDER_PERSIST_DEBOUNCE_MS)
    this.renderPersistTimers.set(sessionId, timer)
  }

  /** 立即刷写渲染树快照并清除 dirty/timer */
  private flushSessionRender(sessionId: string) {
    this.clearSessionRenderPersistTimer(sessionId)

    const store = this.storePool.get(sessionId)
    const rawData = this.rawDataPool.get(sessionId)
    if (!store || !rawData) return Promise.resolve()
    const state = store.getState()
    const content: SessionRenderContent = {
      items: { ...state.items },
      groups: { ...state.groups },
      tasks: { ...state.tasks },
      chatElements: [...state.chatElements],
    }
    return this.persistSetSessionRender(sessionId, content, rawData.grpcOffset)
  }
  // #endregion

  /**
   * 建联统一进入恢复态，首批 gRPC 历史及其持久化完成后再结束 loading。
   */
  private sessionRestoreLoading = new Set<string>()

  /**
   * cancel 后等待 session-end 的兜底定时器：超时则手动走 handleSessionEnd（摘监听 + 收尾）
   * 避免 end 丢失导致监听泄漏 / onEnd 永不触发
   */
  private sessionEndFallbackTimers = new Map<string, ReturnType<typeof setTimeout>>()
  /** 等待 session-end 的调用方；同一会话可被多个流程同时等待 */
  private sessionEndWaiters = new Map<string, Set<(error?: unknown) => void>>()

  /** 唤醒等待指定 session-end 的所有调用方 */
  private resolveSessionEndWaiters(sessionId: string, error?: unknown) {
    const waiters = this.sessionEndWaiters.get(sessionId)
    if (!waiters) return
    this.sessionEndWaiters.delete(sessionId)
    waiters.forEach((settle) => settle(error))
  }

  /** 等待指定 session 的 end / dispose teardown 完成 */
  private waitSessionEnd(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let waiters = this.sessionEndWaiters.get(sessionId)
      if (!waiters) {
        waiters = new Set()
        this.sessionEndWaiters.set(sessionId, waiters)
      }
      waiters.add((error) => (error ? reject(error) : resolve()))
    })
  }

  /**
   * 停止仍在执行的会话，并等待真实 session-end 或 fallback 完成。
   * 无执行态会话时立即完成；各会话并发关停，end / 兜底之后继续等待各自写事务。
   */
  public async stopExecutingSessionsAndWait(sessionIds: string[]): Promise<void> {
    const executingSessionIds = [...new Set(this.filterExecutingSessionIds(sessionIds))]
    if (!executingSessionIds.length) return

    const waitForEnd = executingSessionIds.map((sessionId) => this.waitSessionEnd(sessionId))

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
   * 建联准备：旧写入结束 → 三表检查清理 → 清空旧内存 → 开启新写入。
   * 检查清理复用 deleteSessionPersist 的同事务查键/删除，不另做有竞态的存在性查询。
   */
  private async prepareSessionPersistBeforeStart(sessionId: string, meta: AIAgentChatMetaData) {
    const { lifecycle } = meta
    await Promise.all([this.drainRenderWrites(sessionId), drainSessionContentWrites(sessionId)])
    if (!lifecycle.current || lifecycle.closing) return
    await aiChatPersistStore.deleteSessionPersist(sessionId)
    if (!lifecycle.current || lifecycle.closing) return

    const { store, rawData } = this.ensureSession(sessionId)
    Object.assign(rawData, genAIAgentChatData())
    // 保留 store 实例与 action；只重置状态，避免已有 React 订阅失效。
    store.reset()
    store.getState().updateState({ execute: true, initLoading: true })
    store.getState().updateCurrentLoadingTitle({ casualTitle: tAgent('AIChatLoading.loadingHistory') })
    lifecycle.writable = true

    // 首问先显示，只有历史首批恢复完才发送；临时问题不能在清库前落盘。
    const question = meta.createChatQuestion
    if (question) {
      const id = question.AttachedResourceInfo?.find(
        (item) => item.Type === AttachedResourceTypeEnum.USER_FREE_INPUT_UUID,
      )?.Value
      if (typeof id === 'string' && id) {
        this.pushDataToSession(sessionId, {
          id,
          chatType: 'reAct',
          type: AIChatQSDataTypeEnum.QUESTION,
          Timestamp: moment().unix(),
          data: question.FreeInput || '',
          AIService: '',
          AIModelName: '',
          extraValue: { showQS: question.FreeInput || '' },
        })
      }
    }
  }

  /** 新建/重连共用入口：同步占位，清库成功后建联，历史恢复完成后才发送首问。 */
  public handleStartSession(
    requestParams: AIChatIPCStartParams,
    cb?: {
      onLinkStart?: (sessionId: string) => void
      onLinkSuccess?: (sessionId: string) => void
    },
  ): boolean {
    const { token: sessionId, params, route, pageId, localSource } = requestParams
    const source = localSource ?? params.Params?.Source ?? AISourceEnum.aiAgent
    const deleting = [...this.pendingDeletes].some(
      (item) =>
        item.deleteAll ||
        (item.sessionIds?.length ? item.sessionIds.includes(sessionId) : item.source?.includes(source)),
    )
    if (deleting) {
      yakitNotify('warning', '会话缓存删除中，请稍后再连接')
      return false
    }
    if (this.readyChannels.has(sessionId)) {
      yakitNotify('warning', '会话已经存在，请勿重复建立！')
      return false
    }
    this.registerSessionChannel(sessionId, { route, pageId, source: localSource ?? params.Params?.Source })
    const { request, store, meta: previous } = this.ensureSession(sessionId)
    previous.lifecycle.current = false
    this.closeSessionTimers(previous)
    this.clearSessionRenderPersistTimer(sessionId)
    clearThoughtDurationCache(sessionId)

    const meta = genAIAgentChatMetaData()
    const { lifecycle } = meta
    lifecycle.writable = false
    this.metaPool.set(sessionId, meta)
    Object.assign(request, params.Params)
    this.sessionRestoreLoading.add(sessionId)
    store.getState().updateState({ execute: true, initLoading: true })
    this.setActiveShowSession(sessionId)

    const userQuery = (params.Params?.UserQuery || '').trim()
    if (userQuery) {
      meta.createChatQuestion = {
        IsFreeInput: true,
        FreeInput: userQuery,
        AttachedResourceInfo: [
          ...(params.AttachedResourceInfo || []),
          {
            Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_DEFAULT,
            Type: AttachedResourceTypeEnum.USER_FREE_INPUT_UUID,
            Value: uuidv4(),
          },
        ],
        FocusModeLoop: params.FocusModeLoop,
      }
    }
    meta.onLinkSuccess = cb?.onLinkSuccess
    cb?.onLinkStart?.(sessionId)

    lifecycle.preparation = this.prepareSessionPersistBeforeStart(sessionId, meta)
      .then(() => {
        if (!lifecycle.current || lifecycle.closing) return
        lifecycle.started = true
        return ipcRenderer.invoke('start-ai-re-act', sessionId, params).then(() => {
          if (!lifecycle.current || lifecycle.closing) return
          // 主进程先发一次 ping；后续每 3 秒重试，直到有效 pong 到达。
          if (!this.sessionRestoreLoading.has(sessionId) || store.getState().grpcLoadMoreLoading) return
          meta.pingTimer = setInterval(() => {
            if (!lifecycle.current || lifecycle.closing) return
            meta.pingSyncID = uuidv4()
            this.requestMessage(sessionId, {
              IsSyncMessage: true,
              SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PING,
              SyncID: meta.pingSyncID,
            })
          }, ChatMultiSessionController.PING_POLLING_INTERVAL)
        })
      })
      .catch((error) => {
        if (!lifecycle.current || lifecycle.closing) return
        lifecycle.error ??= error
        this.failSessionStart(sessionId, error)
      })
    return true
  }

  /** 初始化失败停止连接并释放占位，保留可见问题供用户重试。 */
  private failSessionStart(sessionId: string, error: unknown) {
    yakitNotify('error', `AI 会话初始化失败: ${error instanceof Error ? error.message : String(error)}`)
    this.finishSessionRestoreLoading(sessionId)
    this.storePool.get(sessionId)?.getState().updateState({ initLoading: false, grpcLoadMoreLoading: false })
    this.forceCloseSession({ sessionIds: [sessionId] })
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
      if (meta.lifecycle.closing || store.getState().initLoading || store.getState().grpcLoadMoreLoading) {
        yakitNotify('warning', '历史消息加载中，请稍后再发送')
        return
      }

      if (params.IsFreeInput) {
        const { currentChatStatus } = store.getState()
        // 如果问题的状态不是进行中，则属于空闲状态
        const isCasualIdle = currentChatStatus.status !== AITaskStatus.inProgress

        if (isCasualIdle) {
          // 自由对话没有问题进行中时，才改变loading的title
          store
            .getState()
            .updateState({ currentLoadingTitle: { casualTitle: tAgent('AIChatLoading.waitingReply'), planTitle: '' } })

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
          persistIndependentItem(token, chatData, meta.lifecycle)
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
            if (!meta.lifecycle.current || meta.lifecycle.closing) return
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

      // 记录跳过子任务/取消任务操作（写入 skipSubtaskTaskIDs 表示对应按钮进入 loading）
      if (
        params.IsSyncMessage &&
        (params.SyncType === AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN ||
          params.SyncType === AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK) &&
        params.SyncJsonInput
      ) {
        try {
          let subTaskID = ''
          if (params.SyncType === AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN) {
            subTaskID = JSON.parse(params.SyncJsonInput)?.subtask_id
          } else if (params.SyncType === AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK) {
            subTaskID = JSON.parse(params.SyncJsonInput)?.task_id
          }
          if (subTaskID) {
            store.setState((state) => {
              if (state.skipSubtaskTaskIDs.includes(subTaskID)) return
              state.skipSubtaskTaskIDs = [...state.skipSubtaskTaskIDs, subTaskID]
            })
          }
        } catch (error) {}
      }

      switch (type) {
        case 'casual':
        case 'reAct':
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
    const lifecycle = this.metaPool.get(sessionId)?.lifecycle
    if (!lifecycle?.current || lifecycle.closing || !lifecycle.started) return
    void ipcRenderer.invoke('send-ai-re-act', sessionId, request).catch((error) => {
      if (!lifecycle.current || lifecycle.closing) return
      lifecycle.error ??= error
      this.handleSessionError(sessionId, error)
    })
  }

  /** 发 recovery_history 拉更旧事件（grpcOffset 为起点，向前回溯 RECOVERY_HISTORY_LIMIT 条） */
  public requestRecoveryHistory(sessionId: string) {
    const { store, rawData } = this.ensureSession(sessionId)
    const grpcLoadMoreLoading = store.getState().grpcLoadMoreLoading
    if (grpcLoadMoreLoading) return
    store.getState().updateState({ grpcLoadMoreLoading: true })
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
    const { rawData, store, meta } = this.ensureSession(sessionId)
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
      if (!meta.lifecycle.current) return false
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
      if (meta.lifecycle.current) store.getState().updateState({ timelinesLoading: false })
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
    const { store, meta } = this.ensureSession(sessionId)
    try {
      const request: AIEventQueryRequest = {
        Filter: { SessionID: sessionId, EventType: ['filesystem_pin_directory', 'filesystem_pin_filename'] },
        Pagination: { Page: 1, Limit: -1, OrderBy: 'created_at', Order: 'desc' },
      }
      const { Events, Total } = await grpcQueryAIEvent(request, true)
      if (!meta.lifecycle.current) return false
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

    // 会话流建立且 pong 校验通过后，通知后端做一次会话快照同步
    this.requestMessage(sessionId, {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SESSION_SNAPSHOT_SYNC,
    })

    // 获取最新记忆列表数据, 并注册轮询定时器
    this.requestMessage(sessionId, { IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_MEMORY_CONTEXT })
    if (meta.memoryPollingTimer) clearInterval(meta.memoryPollingTimer)
    meta.memoryPollingTimer = setInterval(() => {
      if (!meta.lifecycle.current || meta.lifecycle.closing) return
      this.requestMessage(sessionId, {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_MEMORY_CONTEXT,
      })
    }, 5000)

    // dequeue 是实时边沿事件，后端创建的任务可能在本次建连前已经出队。
    // 建连后立即查询 queue_info，并短期轮询以恢复 current_task 与等待队列快照。
    this.requestMessage(sessionId, {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
    })
    if (meta.queuePollingTimer) clearInterval(meta.queuePollingTimer)
    meta.queuePollingEmptyCount = 0
    meta.queuePollingTimer = setInterval(() => {
      if (!meta.lifecycle.current || meta.lifecycle.closing) return
      this.requestMessage(sessionId, {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
      })
    }, 5000)

    // 拉取 timeline 历史（首批）+ 文件系统历史（全量），不阻塞建连主流程
    void this.loadTimelineHistory(sessionId)
    void this.loadFileSystemHistory(sessionId)
  }

  /** 首批历史恢复结束或初始化失败时解除恢复遮罩。 */
  private finishSessionRestoreLoading(sessionId: string) {
    if (!this.sessionRestoreLoading.has(sessionId)) return
    this.sessionRestoreLoading.delete(sessionId)
    const store = this.storePool.get(sessionId)
    if (!store) return
    const { currentChatStatus, currentLoadingTitle } = store.getState()
    store.getState().updateState({ initLoading: false })
    // 恢复完成兜底：清掉建连时写入的「获取历史数据中...」占位文案，
    // 否则 Footer（execute 恒为 true）会一直显示该 loading；
    // 问题仍在执行（queue_info 已回填 questionExecuting）时不清，避免覆盖运行态文案
    if (
      currentLoadingTitle.casualTitle === tAgent('AIChatLoading.loadingHistory') &&
      currentChatStatus.status !== AITaskStatus.inProgress
    ) {
      store.getState().updateCurrentLoadingTitle({ casualTitle: '' })
    }
  }

  /** 接收时捕获连接身份并串行处理；end 等待已接收事件，旧事件不能进入新连接。 */
  public handleGrpcOutputEvent(sessionId: string, res: AIOutputEvent): Promise<void> {
    const meta = this.metaPool.get(sessionId)
    if (!this.readyChannels.has(sessionId) || !meta || meta.lifecycle.ending) return Promise.resolve()
    const { lifecycle } = meta
    lifecycle.events = lifecycle.events
      .then(async () => {
        if (!lifecycle.current) return
        await this.processGrpcOutputEvent(sessionId, res, meta)
      })
      .catch((error) => {
        if (!lifecycle.current) return
        lifecycle.error ??= error
        console.error('handleGrpcOutputEvent error', error)
        const loadingHistory =
          this.sessionRestoreLoading.has(sessionId) || this.storePool.get(sessionId)?.getState().grpcLoadMoreLoading
        if (loadingHistory && !lifecycle.closing) this.failSessionStart(sessionId, error)
      })
    return lifecycle.events
  }

  /** 在会话事件队列内分发单条数据；恢复结束回执等待此前 handler 和写入完成。 */
  private async processGrpcOutputEvent(sessionId: string, res: AIOutputEvent, meta: AIAgentChatMetaData) {
    const ipcContent = Uint8ArrayToString(res.Content) || ''
    // console.log('handleGrpcOutputEvent--', sessionId, '\n', res, '\n', ipcContent)

    const { store, rawData, request } = this.ensureSession(sessionId)

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

      if (!meta.lifecycle.closing && this.sessionRestoreLoading.has(sessionId)) this.requestRecoveryHistory(sessionId)
      return
    }

    if (res.Type === 'structured' && res.NodeId === 'recovery_history') {
      const recoveryHistory = JSON.parse(ipcContent) as AIAgentGrpcApi.RecoveryHistory & { error?: string }
      if (recoveryHistory.error) throw new Error(recoveryHistory.error)
      if (typeof recoveryHistory.next_start_id !== 'number') throw new Error('历史恢复未返回有效游标')
      rawData.grpcOffset = recoveryHistory.next_start_id
      await this.flushSessionRender(sessionId)
      await Promise.all([this.drainRenderWrites(sessionId), drainSessionContentWrites(sessionId)])
      if (!meta.lifecycle.current || meta.lifecycle.closing) return
      if (meta.lifecycle.error) throw meta.lifecycle.error
      store.getState().updateState({ grpcLoadMoreLoading: false })
      if (store.getState().currentChatStatus.status !== AITaskStatus.inProgress) {
        store.getState().updateCurrentLoadingTitle({ casualTitle: '' })
      }
      const restoring = this.sessionRestoreLoading.has(sessionId)
      this.finishSessionRestoreLoading(sessionId)
      if (restoring) {
        if (meta.createChatQuestion) {
          this.requestMessage(sessionId, meta.createChatQuestion)
          meta.createChatQuestion = undefined
          store.getState().updateCurrentLoadingTitle({ casualTitle: tAgent('AIChatLoading.waitingReply') })
        }
        this.handleSessionStartSuccess(sessionId)
        meta.onLinkSuccess?.(sessionId)
        meta.onLinkSuccess = undefined
      }
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
        'skip_subtask_in_plan',
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
      await handleFunc({
        sessionId,
        res,
        chatType: store.getState().currentChatStatus.coordinatorId === res.CoordinatorId ? 'task' : 'reAct',
        store,
        rawData,
        request,
        meta,
        sendRequest: (request) => {
          if (meta.lifecycle.current) this.requestMessage(sessionId, request)
        },
        pushLog: (log) => {
          if (res.IsSync || !meta.lifecycle.current) return
          pushLogToOtherWindow({ sessionId: sessionId, Timestamp: res.Timestamp, ...log })
        },
      })
    }
  }

  /** 主动往列表里放入一条数据 */
  public pushDataToSession(sessionId: string, data: AIChatQSData) {
    const { store, rawData, meta } = this.ensureSession(sessionId)
    if (!meta.lifecycle.current || meta.lifecycle.closing) return
    rawData.contents.set(data.id, data)
    persistIndependentItem(sessionId, data, meta.lifecycle)
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
    const { store, rawData, meta } = this.ensureSession(sessionId)
    if (!meta.lifecycle.current || meta.lifecycle.closing) return

    const chatDetail = rawData.contents.get(mapToken)
    if (!chatDetail || chatDetail.type !== AIChatQSDataTypeEnum.TOOL_RESULT) return

    Object.assign(chatDetail.data.tool, toolResult)
    store.getState().incrementNodeVersion(chatDetail.id, 'item')
    persistToolResultIfTerminal(sessionId, chatDetail, meta.lifecycle)
  }

  /** 设置指定 token 的卡片展开态（纯 UI，不触发渲染树落库） */
  public setUiExpand(sessionId: string, token: string, expand: boolean) {
    if (!sessionId || !token) return
    const { store } = this.ensureSession(sessionId)
    store.setState((state) => {
      state.uiExpandMap[token] = expand
    })
  }

  /** 切换指定 token 的展开态；map 中无记录时以 defaultExpand 为当前值再取反 */
  public toggleUiExpand(sessionId: string, token: string, defaultExpand: boolean) {
    if (!sessionId || !token) return
    const { store } = this.ensureSession(sessionId)
    store.setState((state) => {
      const prev = state.uiExpandMap[token]
      state.uiExpandMap[token] = prev === undefined ? !defaultExpand : !prev
    })
  }

  /** 停流并卸池；删除先让旧操作失效，保留缓存则等待已接收事件及最终快照。 */
  private async disposeSessionMemory(sessionId: string, deletePersist = false): Promise<void> {
    const meta = this.metaPool.get(sessionId)
    if (deletePersist && meta) {
      meta.lifecycle.current = false
      meta.lifecycle.writable = false
    }
    if (this.pendingDisposeSessions.has(sessionId)) {
      if (deletePersist) this.pendingDisposeSessions.set(sessionId, true)
      await this.waitSessionEnd(sessionId)
      return
    }
    if (!this.readyChannels.has(sessionId)) {
      await this.teardownDisposedSession(sessionId, deletePersist)
      return
    }
    this.clearSessionRenderPersistTimer(sessionId)
    const done = this.waitSessionEnd(sessionId)
    this.pendingDisposeSessions.set(sessionId, deletePersist)
    this.forceCloseSession({ sessionIds: [sessionId] })
    await done
  }

  /** 等待写事务结束后删缓存/卸池；删除失败保持内存归属，方便重试。 */
  private async teardownDisposedSession(sessionId: string, deletePersist: boolean): Promise<void> {
    this.clearSessionRenderPersistTimer(sessionId)
    const meta = this.metaPool.get(sessionId)
    if (meta) {
      meta.lifecycle.writable = false
      meta.lifecycle.current = false
      await meta.lifecycle.preparation
      await meta.lifecycle.events
    }
    await Promise.all([this.drainRenderWrites(sessionId), drainSessionContentWrites(sessionId)])
    if (deletePersist) await aiChatPersistStore.deleteSessionPersist(sessionId)

    this.sessionRestoreLoading.delete(sessionId)
    clearThoughtDurationCache(sessionId)
    this.readyChannels.delete(sessionId)
    if (this.activeShowSession === sessionId) this.activeShowSession = ''
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

  /** 流错误同样进入收尾；主进程 error 后可能不再转发 end。 */
  public handleSessionError(sessionId: string, error: unknown) {
    const meta = this.metaPool.get(sessionId)
    if (!meta || meta.lifecycle.closing) return
    yakitNotify('error', `AI 会话连接失败: ${error instanceof Error ? error.message : String(error)}`)
    this.forceCloseSession({ sessionIds: [sessionId] })
  }

  /**
   * 真实 end / 兜底共用的收尾：停止接收 → 排完事件 → 最终快照 → 写事务 → 可选删除。
   * ready 占位直到全部收尾结束，保证相同 sessionId 的下一轮不会与旧事务交错。
   */
  public handleSessionEnd(sessionId: string, res?: unknown): Promise<void> {
    const meta = this.metaPool.get(sessionId)
    if (meta?.lifecycle.ending) return meta.lifecycle.ending
    this.clearSessionEndFallback(sessionId)
    this.closeIPCListeners(sessionId)
    if (!meta) {
      this.readyChannels.delete(sessionId)
      this.resolveSessionEndWaiters(sessionId)
      return Promise.resolve()
    }
    const { lifecycle } = meta
    lifecycle.closing = true
    this.closeSessionTimers(meta)
    this.clearSessionRenderPersistTimer(sessionId)
    const onEnd = meta.onEnd
    meta.onEnd = undefined
    meta.onLinkSuccess = undefined

    lifecycle.ending = (async () => {
      let failure: unknown
      try {
        await lifecycle.preparation
        await lifecycle.events
        const data = this.ensureSession(sessionId)
        const { store } = data
        if (lifecycle.current && this.pendingDisposeSessions.get(sessionId) !== true) {
          handleTaskPlanEnd({ ...data, sessionId }, true)
          const finalWrite = this.flushSessionRender(sessionId)
          lifecycle.writable = false
          await finalWrite
        }
        lifecycle.writable = false
        store.getState().updateState({ execute: false, initLoading: false, grpcLoadMoreLoading: false })
        store.getState().updateCurrentChatStatus({ status: AITaskStatus.error })
        store.getState().updateCurrentLoadingTitle({ casualTitle: tAgent('AIChatLoading.sessionClosed') })
        await Promise.all([this.drainRenderWrites(sessionId), drainSessionContentWrites(sessionId)])
        const deletePersist = this.pendingDisposeSessions.get(sessionId)
        if (deletePersist !== undefined) await this.teardownDisposedSession(sessionId, deletePersist)
        // 删除只要求旧事务结束；普通关闭则必须反馈旧写入的失败，不能误报保存成功。
        if (deletePersist !== true && lifecycle.error) throw lifecycle.error
      } catch (error) {
        failure = error
        yakitNotify('error', `AI 会话收尾失败: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        lifecycle.writable = false
        this.sessionRestoreLoading.delete(sessionId)
        this.pendingDisposeSessions.delete(sessionId)
        this.readyChannels.delete(sessionId)
        this.resolveSessionEndWaiters(sessionId, failure)
        onEnd?.(failure)
      }
      if (failure) throw failure
    })()
    // IPC/定时器入口不一定 await；失败仍通过返回值、waiter 和提示反馈，不留下未处理拒绝。
    void lifecycle.ending.catch(() => {})
    return lifecycle.ending
  }

  /** 先停止连接；回调在已接收事件和 IDB 事务完成后执行，参数携带收尾失败。 */
  public forceCloseSession(params: { sessionIds: string[]; onEnd?: (error?: unknown) => void }) {
    for (const session of params.sessionIds) {
      const meta = this.metaPool.get(session)
      if (meta) {
        if (params.onEnd) meta.onEnd = params.onEnd
        meta.lifecycle.closing = true
        this.closeSessionTimers(meta)
      }
      const store = this.storePool.get(session)
      store?.getState().updateState({ execute: false })
      store?.getState().updateCurrentLoadingTitle({ casualTitle: tAgent('AIChatLoading.sessionClosing') })
      if (meta && !meta.lifecycle.started) {
        // 准备阶段没有实际流，立即收尾；preparation 返回后也不能再 start。
        void this.handleSessionEnd(session)
      } else {
        this.armSessionEndFallback(session)
        void ipcRenderer.invoke('cancel-ai-re-act', session).catch(() => {})
      }
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

    await Promise.all([this.drainRenderWrites(sessionId), drainSessionContentWrites(sessionId)])
    await aiChatPersistStore.deleteSessionPersist(sessionId)
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
    this.pendingDeletes.add(params)

    try {
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
      const results = await Promise.allSettled(tasks)
      const failure = results.find((result) => result.status === 'rejected')
      if (failure?.status === 'rejected') throw failure.reason

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
    } catch (error) {
      sessionStatusStore.getState().setSessionsDeleteStatus(ids, SessionDeleteStatus.Idle)
      throw error
    } finally {
      this.pendingDeletes.delete(params)
    }
  }

  /**
   * 页面生命周期卸载：卸该「当前」page 下所有 source 的 session 内存（非仅 forceClose）
   * 会 flush 渲染树后保留 IDB，供后续恢复；已 rebind 走的 session 不会被旧页清掉
   */
  public onPageUnload(route: YakitRouteType, pageId: string) {
    const ids = this.resolvePageSessionIds(route, pageId)
    for (const sessionId of ids) {
      void this.disposeSessionMemory(sessionId, false).catch((error) => {
        console.error('AI session page unload failed', error)
      })
    }
  }
}

export const globalSessionEngine = new ChatMultiSessionController()
