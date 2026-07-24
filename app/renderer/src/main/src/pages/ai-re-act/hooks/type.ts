import type { StreamResult } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import type {
  AIChatQSData,
  AIChatQSDataType,
  AIInputNotifyMessage,
  AIStreamOutput,
  AIYakExecFileRecord,
  ChatListRenderType,
  ReActChatRenderItem,
} from './aiRender'
import type { Dispatch, SetStateAction } from 'react'
import type { Domain } from '@/pages/ai-agent/store/constants'
import type { AIAgentGrpcApi, AIInputEvent, AIOutputEvent, AISource, AIStartParams, AITaskStatusType } from './grpcApi'
import type { AIAgentSetting } from '@/pages/ai-agent/aiAgentType'
import type { AIChatData } from '@/pages/ai-agent/type/aiChat'
import type { ChatDataStore } from '@/pages/ai-agent/store/ChatDataStore'
import { ChatMultiSessionController } from './ChatMultiSessionController'
import type { YakitRouteType } from '@/enums/yakitRoute'

// #region 公共 hooks 事件
export interface UseHookBaseParams {
  /** 将数据推送到日志集合中 */
  pushLog: (log: AIChatLogData) => void
  /** 获取全部聊天数据 */
  getChatDataStore: () => AIChatData | undefined
}
interface UseHookBaseEvents {
  handleSetData: (res: AIOutputEvent) => void
  handleResetData: () => void
}
export type handleSendFunc = (params: { request: AIInputEvent; optionValue?: string; cb?: () => void }) => void

interface UseHookStateFunc {
  getContentMap: (token: string) => AIChatQSData | undefined
  setContentMap: (token: string, content: AIChatQSData) => void
  setElements: Dispatch<SetStateAction<ReActChatRenderItem[]>>
  getElements: () => ReActChatRenderItem[]
}

/** 用于更新渲染数据的参数定义 */
export interface UpdateRenderDataParams {
  mapKey: string
  type: AIChatQSDataType
}
// #endregion

// #region useChatIPC相关定义
/** 会话类型 */
export type ChatIPCSendType = 'casual' | 'task' | ''
/** 会话-通知消息回调 */
export interface AIChatIPCNotifyMessage {
  Type: AIOutputEvent['Type']
  NodeId: AIOutputEvent['NodeId']
  NodeIdVerbose: AIOutputEvent['NodeIdVerbose']
  Content: string
  Timestamp: AIOutputEvent['Timestamp']
}

export interface UseChatIPCParams {
  /** 切换会话时，是否自动建立会话连接(default:false) */
  autoConnect?: boolean

  /** 业务来源，用于映射 IndexedDB 消息存储域 */
  aiSource?: AISource

  /** 文件数据缓存实例类 */
  cacheDataStore?: ChatDataStore
  /** 设置会话的名字 */
  setSessionChatName?: (session: string, name: string) => void

  /** 查看历史会话数据 */
  onViewChat?: (session: string) => void
  /** 出现任务规划的触发回调(id 是 coordinatorId) */
  onTaskStart?: () => void
  /** 任务规划的 review 事件 */
  onTaskReview?: (data: AIChatQSData) => void
  /** 任务规划中 plan_review 事件的补充数据 */
  onTaskReviewExtra?: (data: AIAgentGrpcApi.PlanReviewRequireExtra) => void

  /** 主动 review-release 的回调事件 */
  onReviewRelease?: (type: ChatIPCSendType, id: string) => void

  /** 接口结束断开的回调事件 */
  onEnd?: () => void

  /** 同步信息返回 */
  onSyncIDChange?: (syncID: string) => void

  /** 获取当前Agent的全局配置数据 */
  getSetting?: (() => AIAgentSetting) | undefined

  /** http_fuzz_request_change事件的回调 */
  onHttpFuzzRequestChange?: (data: AIAgentGrpcApi.HttpFuzzRequestChange) => void

  /** http_flow_fuzz_status */
  onGetHttpFlowFuzzStatus?: (data: AIAgentGrpcApi.GetHttpFlowFuzzStatus) => void

  /** yaklang_code_change 事件的回调 */
  onYaklangCodeChange?: (data: AIAgentGrpcApi.YaklangCodeChange) => void
}

/** 会话文件系统-pin */
export interface AIFileSystemPin {
  path: string
  isFolder: boolean
}

/** 自由对话-实时问题队列 */
export interface AIQuestionQueues {
  total: number
  data: AIAgentGrpcApi.QuestionQueueItem[]
}

/** 任务规划-loading状态信息 */
export interface PlanLoadingStatus {
  loading: boolean
  plan: string
  task: string
  /** 当前任务规划的 re_act_task_id，'' 表示无活动任务规划 */
  taskID: string
  /** 当前任务规划状态，'' (AITaskStatus.created) 表示无 */
  status: AITaskStatusType
  /** 当前任务规划的 coordinatorId，'' 表示无 */
  coordinatorId: string
}

export interface UseChatIPCState {
  /** 流执行状态 */
  execute: boolean
  /** 运行时产生http数据的run_time_id合集 */
  httpRunTimeIDs: string[]
  /** 运行时产生risk数据的run_time_id合集 */
  riskRunTimeIDs: string[]
  /** 自由对话相关数据 */
  casualChat: any
  /** 任务规划相关数据 */
  taskChat: any
  /** 接口运行过程中的数据文件夹合集 */
  grpcFolders: AIFileSystemPin[]
  /** 问题队列信息 */
  questionQueue: AIQuestionQueues
  /** 时间线 */
  reActTimelines: AIAgentGrpcApi.TimelineItem[]
  /** 记忆列表 */
  memoryList: AIAgentGrpcApi.MemoryEntryList

  /** 任务规划的loading状态信息 */
  taskStatus: PlanLoadingStatus
  /** 自由对话的loading 显示的文案 */
  casualTitle: string
  /** 自由对话的是否进行中 */
  casualLoading: boolean

  /** 场景状态(仅供自由对话[reAct])使用 */
  focusMode: string
  /** 切换/恢复会话 loading（UI 遮罩与禁用交互；无 UserQuery 建连时置 true，hydrate/recovery 结束后 false） */
  switchLoading: boolean
  /** 任务规划历史数据-任务树 */
  planHistoryList: AIAgentGrpcApi.PlanHistoryList
  /** 用户主动取消问题的loading状态(自由对话) */
  cancelCasualLoading: boolean
  /** 用户主动取消问题的loading状态(任务规划) */
  cancelTaskLoading: boolean
  /** 流推送的提示文案（notify / rate-limit），展示时长由 duration 系列字段控制，到期自动清空 */
  notifyMessage: AIInputNotifyMessage | null
  /** 请求历史数据相关State */
  requestHistoryState: UseAIMessageDataState
}

/** 开始启动流接口的唯一token、请求参数和额外参数 */
export interface AIChatIPCStartParams {
  token: string
  params: AIInputEvent
  /** 会话归属路由（不可变） */
  route: YakitRouteType
  /** 会话初始归属 pageId（后续可 rebind） */
  pageId: string
}

/** 执行流途中发送消息的参数 */
export interface AIChatSendParams {
  token: string
  type: ChatIPCSendType
  params: AIInputEvent
  optionValue?: string
}

/** 任务规划的taskID和状态 */
export interface TaskChatTaskInfo {
  taskID: string
  status: AITaskStatusType
  coordinatorId: AIOutputEvent['CoordinatorId']
}
// #endregion

// #region useAIChatLog相关定义
export interface AIChatLogToInfo {
  type: 'log'
  Timestamp: AIOutputEvent['Timestamp']
  data: AIAgentGrpcApi.Log
}
export interface AIChatLogToStream {
  type: 'stream'
  Timestamp: AIOutputEvent['Timestamp']
  data: AIStreamOutput
}

export type AIChatLogData = AIChatLogToInfo | AIChatLogToStream

export interface UseAIChatLogEvents {
  pushLog: UseHookBaseParams['pushLog']
  sendStreamLog: (uuid: string) => void
  /** 获取当前执行接口流的请求参数 */
  clearLogs: () => AIStartParams | undefined
  /** 关闭展示日志的页面窗口 */
  cancelLogsWin: () => void
}
// #endregion

// #region AI-Agent相关grpc流数据处理逻辑
export interface AIMessageHandlerParams extends ReturnType<ChatMultiSessionController['ensureSession']> {
  sessionId: string
  /** grpc流原始数据 */
  res: AIOutputEvent
  chatType: ChatListRenderType
  sendRequest: (request: AIInputEvent) => void
  pushLog: (log: AIAgentGrpcApi.Log) => void
}
export type AIMessageHandler = (params: AIMessageHandlerParams) => void
// #endregion

// #region useAIMessageData相关定义
export type loadMoreType = keyof AIChatData['beforeID']

export interface AIMessageDataProps {
  type: Domain
  getChatStore: UseHookBaseParams['getChatDataStore']
  setContentMap: (chatType: ChatListRenderType, ...args: Parameters<UseHookStateFunc['setContentMap']>) => void
  setCasualElements: UseHookStateFunc['setElements']
  setTaskElements: UseHookStateFunc['setElements']
  grpcLoadMore?: (request: { limit: number; start_id?: number }) => void
  setTimelines: Dispatch<SetStateAction<AIAgentGrpcApi.TimelineItem[]>>
  setGrpcFiles: Dispatch<SetStateAction<AIFileSystemPin[]>>
}

/** 游标：记录每个 store 下一次加载的起始位置 */
export interface PaginationCursors {
  casualId?: string
  taskId?: string
}

export interface UseAIMessageDataState {
  /** 初始化加载中 */
  initLoading: boolean
  /** 加载更多加载中 */
  casualLoadMoreLoading: boolean
  taskLoadMoreLoading: boolean
  /** save的加载状态 */
  saveLoading: boolean
  /** 时间线加载中 */
  timelinesLoading: boolean
}

export type HistoryChatType = ChatListRenderType | 'timelines'

export interface UseAIMessageDataEvents {
  /** 给UI使用的hasMore获取方法 */
  handleHasMore: (chatType: HistoryChatType) => boolean
  /** grpc请求历史数据的返回数据 */
  handleGrpcLoadMore: (res: AIAgentGrpcApi.RecoveryHistory) => void
  /** 初始化加载 */
  handleLoadInit: (session: string, offset: number) => Promise<void>
  /** 加载更多数据 */
  handleLoadMore: (session: string, chatType: HistoryChatType) => Promise<void>
  /** 重置状态 */
  handleReset: () => void
  /** 保存数据 */
  handleSave: (
    session: string,
    data: {
      casualElements: AIChatData['casualChat']['elements']
      taskElements: AIChatData['taskChat']['elements']
      casualContentMap: AIChatData['casualChat']['contents']
      taskContentMap: AIChatData['taskChat']['contents']
    },
  ) => void
  /** 删除会话 */
  handleDeleteSession: (sessionId: string[]) => void
}
// #endregion
