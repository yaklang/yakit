import type { TaskChatTaskInfo, UseChatIPCState } from '@/pages/ai-re-act/hooks/type'
import type { AIAgentGrpcApi, AIInputEvent, AIStartParams } from '@/pages/ai-re-act/hooks/grpcApi'
import type { PlanItemDetailsData } from '@/pages/ai-re-act/hooks/aiRender'
import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import type { AISource } from '@/pages/ai-re-act/hooks/grpcApi'
import { PaginationSchema } from '@/pages/invoker/schema'

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
    /** react 任务对应的详情数据 */
    planDetails: PlanItemDetailsData
  }
  taskChat: UseChatIPCState['taskChat'] & {
    contents: Map<string, AIChatQSData>
    /** 任务列表的子任务对应的详情数据 */
    planDetailsMap: Map<string, PlanItemDetailsData>
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
  /** 系统流信息(isSystem=true&type=stream) */
  systemStream: string
  /** yaklang_code_change 数据 */
  yaklangCodeChange?: AIAgentGrpcApi.YaklangCodeChange

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
    /** react 任务对应的详情数据 */
    planDetails: PlanItemDetailsData
  }
  taskChat: {
    /** 任务列表的子任务对应的详情数据 */
    planDetailsMap: Map<string, PlanItemDetailsData>
  }
  /** 会话内每条信息的详情 */
  contents: Map<string, AIChatQSData>
}
export interface AIAgentChatMetaData {
  /** 通过用户问题创建会话时的问题 */
  createChatQuestion?: AIInputEvent
  /** 自由对话的实时记忆列表 */
  casualMemoryList: AIAgentGrpcApi.MemoryEntryList
  /** 会话通信流建立成功后的UI回调触发事件 */
  onSessionStartSuccess?: (sessionId: string) => void
  /** 任务规划的实时记忆列表 */
  taskMemoryList: AIAgentGrpcApi.MemoryEntryList
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
  currentPlanReviewExtraId: string
  /** 当前plan_review的异步详细数据 */
  planReviewExtraData: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>

  /** 记录tool_xxx_stderr的stream数据 */
  toolStderrStreamData: Map<string, { content: string; uuid: string; status: 'start' | 'end' }>

  /** 记录都存在过的系统信息uuid, 只展示最新的一条系统信息 */
  systemEventUUID: string[]

  /** 顶部卡片临时缓冲区 */
  cardKVPair: Map<string, AIAgentGrpcApi.AICacheCard>
  cardKVPaidTimer: NodeJS.Timeout | null

  /** 用于文件操作记录的计数器 */
  execFileRecordOrder: number

  /** 同步ID-是否已处理 */
  syncIDMap: Map<string, boolean>
}
