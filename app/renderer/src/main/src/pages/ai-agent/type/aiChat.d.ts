import { UseChatIPCState } from '@/pages/ai-re-act/hooks/type'
import { AIAgentGrpcApi, AIStartParams } from '@/pages/ai-re-act/hooks/grpcApi'
import { ReActChatRenderItem } from '@/pages/ai-re-act/hooks/aiRender'
import { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'

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
    timelineID: string
    chatID: string
  }
  /** 记录数据里所有的coordinatorIDs */
  coordinatorIDs: string[]
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
  casualChat: UseChatIPCState['casualChat'] & {
    /** 会话内每条信息的详情 */
    contents: Map<string, AIChatQSData>
  }
  taskChat: UseChatIPCState['taskChat'] & { contents: Map<string, AIChatQSData> }
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
  /** 请求参数 */
  request?: AIStartParams
  /** 会话 session */
  SessionID: string
  /** 历史流量表和风险表 run_time_id */
  RelatedRuntimeIDs?: string[]
}
