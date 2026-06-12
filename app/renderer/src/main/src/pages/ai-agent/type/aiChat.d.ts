import type { AIFileSystemPin, TaskChatTaskInfo, UseChatIPCState } from '@/pages/ai-re-act/hooks/type'
import type { AIAgentGrpcApi, AIInputEvent, AIStartParams } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIYakExecFileRecord, ReActChatRenderElement } from '@/pages/ai-re-act/hooks/aiRender'
import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import type { AISource } from '@/pages/ai-re-act/hooks/grpcApi'
import type { StreamResult } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'

/** 上下文字节统计 */
export interface AIContextStatsDetail {
  prompt_bytes: AIAgentGrpcApi.ContextStatsSections['prompt_bytes']
  prompt_tokens: AIAgentGrpcApi.ContextStatsSections['prompt_tokens']
  data: {
    times: number[]
    /** 供图表 tooltip 占比 */
    total_prompt_bytes: number[]
    /** 供图表 tooltip 占比 */
    total_prompt_tokens: number[]
    /** 首次非空 role_stats 锁定顺序；后续多余 role 丢弃 */
    role_order: string[]
    role_labels: Record<string, string>
    role_series: Record<string, number[]>
    role_tokens: Record<string, number[]>
  }
}

/** 上下文成分 */
export interface AIContextSectionsDetail {
  summary: Map<string, string>
  sections: AIAgentGrpcApi.AIContextSections[]
}

export interface AIChatData {
  /** 获取历史数据时的最早ID节点 */
  beforeID: {
    timelineID: number
    chatID: number
  }
  /** 记录数据里所有的httpRunTimeIDs */
  httpRunTimeIDs: UseChatIPCState['httpRunTimeIDs']
  /** 记录数据里所有的riskRunTimeIDs */
  riskRunTimeIDs: UseChatIPCState['riskRunTimeIDs']
  yakExecResult: UseChatIPCState['yakExecResult']
  /** 性能相关数据 */
  aiPerfData: {
    /** 消耗Token */
    consumption: AIAgentGrpcApi.Consumption
    /** 上下文压力 */
    pressure: Record<AIAgentGrpcApi.Pressure['model_tier'], AIAgentGrpcApi.Pressure[]>
    /** 首字符响应耗时 */
    firstCost: Record<AIAgentGrpcApi.AIFirstCostMS['model_tier'], AIAgentGrpcApi.AIFirstCostMS[]>
    /** 总对话耗时 */
    totalCost: Record<AIAgentGrpcApi.AITotalCostMS['model_tier'], AIAgentGrpcApi.AITotalCostMS[]>
    /** 上下文字节统计 */
    contextStats: AIContextStatsDetail
    /** 上下文成分 */
    contextSections: AIContextSectionsDetail
  }
  /** 自由对话(ReAct)会话 */
  casualChat: Omit<UseChatIPCState['casualChat'], 'toolListRenderNumber'> & {
    /** 会话内每条信息的详情 */
    contents: Map<string, AIChatQSData>
    todoList: TodoListCardData
  }
  taskChat: UseChatIPCState['taskChat'] & {
    contents: Map<string, AIChatQSData>
    todoListMap: Map<string, TodoListCardData>
  }
  grpcFolders: UseChatIPCState['grpcFolders']
  reActTimelines: UseChatIPCState['reActTimelines']
}

/** UI-chat 信息 */
export interface AISession {
  /** 唯一标识 */
  Id: string
  /** 对话名称 */
  Title: string
  /** 对话问题 */
  question: string
  /** 时间 */
  CreatedAt: number
  /** 更新时间 */
  UpdatedAt: number
  /** 是否已初始化标题 */
  TitleInitialized: boolean
  /** 会话 session */
  SessionID: string
  /** 历史流量表和风险表 run_time_id */
  RelatedRuntimeIDs?: string[]
  /** 最后使用时间 */
  LastUsedAt: number
  /** 会话来源 */
  Source: AISource
  /** AI 启动参数 */
  StartParams?: AIStartParams
  /** 前端逻辑使用-欢迎页对话不触发切换会话的流建立逻辑 */
  isCreate?: boolean
}

export interface GrpcPageResponse<T = unknown> {
  Pagination: PaginationSchema
  Data: T
  Total: number
}
export type QueryAISessionResponse = GrpcPageResponse<AISession[]>

export interface DeleteAISessionFilter {
  /**
   * 会话ID列表
   */
  SessionID?: string[]

  /**
   * 删除该时间戳之后的数据（毫秒时间戳）
   */
  AfterTimestamp?: number

  /**
   * 删除该时间戳之前的数据（毫秒时间戳）
   */
  BeforeTimestamp?: number
  /**
   * 删除来源于该来源的数据
   */
  Source?: AISource[]
}

export interface DeleteAISessionRequest {
  /**
   * 删除过滤条件
   */
  Filter?: DeleteAISessionFilter

  /**
   * 是否删除全部
   */
  DeleteAll?: boolean
}

export interface QueryAISessionRequest {
  Pagination: PaginationSchema
  Filter?: {
    SessionID?: string[]
    Keyword?: string
    Source?: AISource[]
  }
}

export interface AIAgentChatData {
  /** http_fuzz_request_change事件通知数据 */
  httpFuzzRequest?: AIAgentGrpcApi.HttpFuzzRequestChange
  /** http_flow_fuzz_status事件通知数据 */
  httpFlowFuzzStatus?: AIAgentGrpcApi.GetHttpFlowFuzzStatus
  /** 更新会话的标题  */
  sessionTitle?: string
  /** 记忆列表 */
  memoryList: AIAgentGrpcApi.MemoryEntryList

  /** 获取历史数据时的最早ID节点 */
  beforeID: {
    timelineID: number
    chatID: number
  }
  /** 记录数据里所有的httpRunTimeIDs */
  httpRunTimeIDs: string[]
  /** 记录数据里所有的riskRunTimeIDs */
  riskRunTimeIDs: string[]
  /** 性能相关数据 */
  aiPerfData: {
    /** 消耗Token */
    consumption: AIAgentGrpcApi.Consumption
    /** 上下文压力 */
    pressure: Record<AIAgentGrpcApi.Pressure['model_tier'], AIAgentGrpcApi.Pressure[]>
    /** 首字符响应耗时 */
    firstCost: Record<AIAgentGrpcApi.AIFirstCostMS['model_tier'], AIAgentGrpcApi.AIFirstCostMS[]>
    /** 总对话耗时 */
    totalCost: Record<AIAgentGrpcApi.AITotalCostMS['model_tier'], AIAgentGrpcApi.AITotalCostMS[]>
    /** 上下文字节统计 */
    contextStats: AIContextStatsDetail
    /** 上下文成分 */
    contextSections: AIContextSectionsDetail
  }
  /** 自由对话(ReAct)会话 */
  casualChat: {
    todoList: TodoListCardData
  }
  taskChat: {
    todoListMap: Map<string, TodoListCardData>
  }
  /** 会话内每条信息的详情 */
  contents: Map<string, AIChatQSData>
}
export interface AIAgentChatMetaData {
  /** 通过用户问题创建会话时的问题 */
  createChatQuestion?: AIInputEvent
  /** 自由对话的实时记忆列表 */
  casualMemoryList: AIAgentGrpcApi.MemoryEntryList
  /** 任务规划的实时记忆列表 */
  taskMemoryList: AIAgentGrpcApi.MemoryEntryList
  /** 记录已经输出的 isSystem = true & Type = 'stream' 的EventUUID */
  systemEventUUID: string[]
  /** 当前专注场景ID */
  focusOfTaskID: string
  /** 通知消息的消失定时器 */
  notifyMessageTimer: NodeJS.Timeout | null
  /** 当前自由对话问题的re_act_task_id */
  currentCasualTaskID: string
  /** 当前任务规划问题的re_act_task_id|coordinatorId|status */
  currentTaskPlanID?: TaskChatTaskInfo
  /** 当前任务规划正在进行中的节点uuid */
  currentTaskPlanActiveNode: Set<string>

  /** 历史数据: review_release先出现的历史review数据的id-release */
  historyReviewReleaseID: Record<string, AIAgentGrpcApi.ReviewRelease>
  /** 当前plan_review对应的扩展数据ID */
  currentPlanReviewId: string
}
