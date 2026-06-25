import type { StreamResult } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import type { AIAgentGrpcApi, AIOutputEvent, AITaskStatusType, AIOutputI18n, AIInputEvent } from './grpcApi'
import type {
  AIFileSystemPin,
  AIQuestionQueues,
  CurrentExecTaskTree,
  PlanLoadingStatus,
  UseAIMessageDataState,
} from './type'
import { CustomPluginExecuteFormValue } from '@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType'

// #region AI-Agent 非会话列表外的渲染数据
/** 插件执行中的文件操作记录 */
export interface AIYakExecFileRecord extends StreamResult.Log {
  /** 前端主动对接口流输出的文件记录进行先后操作的记录 */
  order: number
}

/** 任务规划-可执行任务的数据结构 */
export interface AITaskInfoProps extends AIAgentGrpcApi.PlanTask {
  /** 层级(代表在树里的第几层) */
  level: number
  /** 是否是叶子任务节点 */
  isLeaf: boolean
}

/** UI：待办清单卡片数据*/
export interface TodoListCardData {
  items: AIAgentGrpcApi.TodoListUpdateItem[]
  stats: AIAgentGrpcApi.TodoListUpdateStats
  /** UI定时刷新数据渲染，用于确定数据是否有更新 */
  uuid: string
}

/** 用户输入框上的AI提示消息 */
export interface AIInputNotifyMessage {
  type: 'notify' | 'rate-limit'
  content: string
  label: AIOutputI18n
}

export type ForgesAndSkillsDynamicItem = Omit<AIAgentGrpcApi.PlanItemDetailsDynamicForgesItem, 'category'> &
  Omit<AIAgentGrpcApi.PlanItemDetailsDynamicSkillsItem, 'category'> & {
    category: 'forge' | 'skill'
  }

/** 任务树节点的详情数据 */
export interface PlanItemDetailsData {
  /** UI定时刷新数据渲染，用于确定数据是否有更新 */
  uuid: string
  /** 任务id */
  taskId: string
  todoList: TodoListCardData
  tool: {
    fixed: AIAgentGrpcApi.PlanItemDetailsFixedItem[]
    dynamic: AIAgentGrpcApi.PlanItemDetailsDynamicToolItem[]
  }
  forges: {
    fixed: AIAgentGrpcApi.PlanItemDetailsFixedItem[]
    dynamic: AIAgentGrpcApi.PlanItemDetailsDynamicForgesItem[]
  }
  skills: {
    fixed: AIAgentGrpcApi.PlanItemDetailsFixedItem[]
    dynamic: AIAgentGrpcApi.PlanItemDetailsDynamicSkillsItem[]
  }
  plugins: {
    fixed: AIAgentGrpcApi.PlanItemDetailsFixedItem[]
    dynamic: AIAgentGrpcApi.PlanItemDetailsDynamicToolItem[]
  }
  mcp: {
    fixed: AIAgentGrpcApi.PlanItemDetailsFixedItem[]
    dynamic: AIAgentGrpcApi.PlanItemDetailsDynamicToolItem[]
  }
  /** 目前没有这个数据 */
  mcpServices: {
    fixed: AIAgentGrpcApi.PlanItemDetailsFixedItem[]
    dynamic: AIAgentGrpcApi.PlanItemDetailsDynamicToolItem[]
  }
  perception: AIAgentGrpcApi.PerceptionData
  execution: AIAgentGrpcApi.SessionSnapshot['execution']
  backgroundProcesses: AIAgentGrpcApi.SessionSnapshot['background_processes']
}
// #endregion

// #region AI-Agent 用于触发会话列表的渲染数据
/** 会话列表类型(任务规划|自由对话) */
export type ChatListRenderType = 'reAct' | 'task'

/** 会话列表的数据来源 */
export enum ReActChatDataOriginEnum {
  IndexedDB = 'indexedDB',
  GrpcHistoryData = 'grpc_history_data',
  GrpcRealtimeData = 'grpc_realtime_data',
}
export type ReActChatDataOrigin = `${ReActChatDataOriginEnum}`

/** 响应式骨架模型 (纯净的字典与关系树) */
export interface ReActChatBaseMeta {
  token: string
  type: AIChatQSDataType
  renderNum: number // 精准驱动打字机刷新的原子计数器，历史记录中永远为 0
}
export interface ReActChatItemMeta extends ReActChatBaseMeta {
  kind: 'item'
}
export interface ReActChatGroupMeta extends ReActChatBaseMeta {
  kind: 'group'
  childrenTokens: string[]
}
export interface ReActChatTaskMeta extends ReActChatBaseMeta {
  kind: 'task'
  childrenTokens: string[]
}

export type ReActChatMeta = ReActChatItemMeta | ReActChatGroupMeta | ReActChatTaskMeta

/** UI 视图渲染路标 (控制元素怎么画、要不要动画、数据从哪来) */
export interface ReActChatRenderElement {
  kind: 'item' | 'group' | 'task'
  token: string
  chatType: ChatListRenderType
  isCached: boolean // 核心结界：决定是否触发工具链折叠与渐入动画
  cacheOrder: number // 前端纯视觉排序权重
  dataOrigin: ReActChatDataOrigin // 业务物理来源
}

/** 控制UI渲染的数据数组元素 */
export interface ReActChatBaseInfo {
  chatType: ChatListRenderType
  token: string
  /** 决定具体样式的组件路由 */
  type: AIChatQSDataType
  /** 高频更新时精准触发单项重渲染的“版本号” */
  renderNum: number

  /** 是否是已加载的历史缓存数据（用于拦截重复写入 DB） */
  isCached?: boolean
  /** 缓存数据里的顺序 */
  cacheOrder?: number
}

/** 独立 UI 节点 */
export interface ReActChatElement extends ReActChatBaseInfo {
  kind: 'item'
}
/** stream合成组group的节点 */
export interface ReActChatGroupElement extends ReActChatBaseInfo {
  kind: 'group'
  children: ReActChatElement[]
}

/** 进入 task 容器内部的子节点类型集合 */
export type ReActChatTaskElementSub = ReActChatElement | ReActChatGroupElement
/** 任务内的所有节点 */
export interface ReActChatTaskElement extends ReActChatBaseInfo {
  kind: 'task'
  children: ReActChatTaskElementSub[]
}

export type ReActChatRenderItem = ReActChatElement | ReActChatGroupElement | ReActChatTaskElement

// #endregion

// #region UI元素渲染的详细数据结构
/** 工具流式输出里的可选操作列表 */
export interface ToolStreamSelectors {
  callToolId: string
  InteractiveId: string
  selectors: AIAgentGrpcApi.ReviewSelector[]
}

/** 流式输出的信息内容 */
export interface AIStreamOutput {
  CallToolID: AIOutputEvent['CallToolID']
  EventUUID: AIOutputEvent['EventUUID']
  NodeId: AIOutputEvent['NodeId']
  NodeIdVerbose: AIOutputEvent['NodeIdVerbose']
  status: 'start' | 'end'
  content: string
  ContentType: AIOutputEvent['ContentType']
  selectors?: ToolStreamSelectors
}

/** 工具结果的信息内容 */
export interface AIToolResult {
  type: 'create' | 'stream' | 'result'
  callToolId: string
  /**工具名称 */
  toolName: string
  /** 工具介绍 */
  toolDescription: string
  /** 间隔时间(ms) */
  durationMS: AIAgentGrpcApi.AIToolCall['duration_ms']
  /** 间隔时间(s) */
  durationSeconds: AIAgentGrpcApi.AIToolCall['duration_seconds']
  /** 结束时间戳(s) */
  endTime: AIAgentGrpcApi.AIToolCall['end_time']
  /** 结束时间戳(ms) */
  endTimeMS: AIAgentGrpcApi.AIToolCall['end_time_ms']
  /** 开始时间戳(s) */
  startTime: AIAgentGrpcApi.AIToolCall['start_time']
  /** 开始时间戳(ms) */
  startTimeMS: AIAgentGrpcApi.AIToolCall['start_time_ms']
  stream: { EventUUID: AIOutputEvent['EventUUID'] }
  tool: {
    /**工具执行完成的状态 default是后端没有发送状态type时前端默认值 */
    status: 'default' | 'success' | 'failed' | 'user_cancelled'
    /**执行完后的总结 */
    summary: string
    /**tool stdout 内容展示前200个字符 */
    toolStdoutContent: {
      content: string
      /**@deprecated UI展示不显示 */
      isShowAll: boolean
    }
    /** 执行错误相关信息 */
    execError: string
    /** 执行涉及的文件目录 */
    dirPath: string
    /** 工具执行结果详情数据 */
    resultDetails: string
    /** review参数信息 */
    reviewParams?: AIAgentGrpcApi.ToolUseReviewRequire['params']
    /** 工具调用理由 */
    reason?: string
  }
  /** http流量数据总数 */
  httpFlowDataCount: number
  /** risk流量数据总数 */
  riskFlowDataCount: number
  /** 是否正在生成参数 */
  isProcessingParams?: boolean
}

/** 任务节点的信息 */
export interface AITaskStartInfo {
  /** AIAgentGrpcApi.PlanTask.taskId */
  taskId: string
  /** AIAgentGrpcApi.PlanTask.index */
  taskIndex: string
  /** AIAgentGrpcApi.PlanTask.name */
  taskName: string
  /** AIAgentGrpcApi.PlanTask.goal */
  goal: string
  /** AIAgentGrpcApi.PlanTask.progress */
  status?: AITaskStatusType
}

interface ReviewSelectedOption {
  /** 已操作 review 的选项内容(json 模式) */
  selected?: string
  optionValue?: string
}
/** 对 review 数据进行操作后的记录, 专用于 UI 上的历史展示 */
export type UIPlanReview = AIAgentGrpcApi.PlanReviewRequire &
  ReviewSelectedOption & { taskExtra?: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra> }
export type UIDetachedPlanReview = AIAgentGrpcApi.DetachedPlanRequire & ReviewSelectedOption
export type UITaskReview = AIAgentGrpcApi.TaskReviewRequire & ReviewSelectedOption
export type UIToolUseReview = AIAgentGrpcApi.ToolUseReviewRequire & ReviewSelectedOption
export type UIRequireUserInteractive = AIAgentGrpcApi.AIReviewRequire & ReviewSelectedOption
export type UIExecAIForgeReview = AIAgentGrpcApi.ExecForgeReview & ReviewSelectedOption

export type AIReviewType =
  | UIPlanReview
  | UIDetachedPlanReview
  | UITaskReview
  | UIToolUseReview
  | UIRequireUserInteractive
  | UIExecAIForgeReview

/** 工具执行结果的决策展示数据 */
export interface AIToolCallDecision extends Omit<AIAgentGrpcApi.ToolCallDecision, 'i18n'> {
  i18n: AIOutputI18n
}

/** 任务规划-执行崩溃后的错误信息展示 */
export interface FailTaskChatError {
  NodeId: AIOutputEvent['NodeId']
  NodeIdVerbose: AIOutputEvent['NodeIdVerbose']
  content: string
}

/** 自由对话崩溃的错误信息 */
export interface FailReactError {
  NodeId: AIOutputEvent['NodeId']
  NodeIdVerbose: AIOutputEvent['NodeIdVerbose']
  content: string
}

/** 会话参参考资料 */
export type ChatReferenceMaterialPayload = AIAgentGrpcApi.ReferenceMaterialPayload[]

/** 用户手动介入上下文 */
export interface UserManualInterventionContext {
  /** 手动介入得类型 */
  type: string
  /** 用户输入 */
  content: string
}

/** UI：报告生成完成卡片数据（由 report_finish 事件驱动） */
export interface ReportFinishCardData {
  reportPath: string
  title: string
  content: string
}

/** UI：发包统计卡片数据（由 http_flow_fuzz_status 事件驱动） */
export interface HttpFlowFuzzStatusCardData {
  fuzz_id: string
  runtime_id: string
  /** 发包动作原因与目的（对应事件字段 reason） */
  reason: string
  /** 引擎最近一次状态 */
  engine_status: 'start' | 'working' | 'finish'
  /** working 推送的进度；finish 时保留最后一次 */
  progress?: AIAgentGrpcApi.HttpFlowFuzzStatusProgress
}
// #endregion

// #region chat 问答内容组件的类型集合(包括了类型推导)
export enum AIChatQSDataTypeEnum {
  /**用户的自由输入 */
  QUESTION = 'question',
  /**流 */
  STREAM = 'stream',
  /**思考 */
  THOUGHT = 'thought',
  /**结果 */
  RESULT = 'result',
  /**工具总结 */
  TOOL_RESULT = 'tool_result',
  /**工具结果详情:参数 */
  TOOL_CALL_PARAM = 'tool_call_param',
  /**模型/API 请求失败 */
  AI_API_REQUEST_FAILED = 'ai_api_request_failed',
  /**计划审阅 */
  PLAN_REVIEW_REQUIRE = 'plan_review_require',
  /**detached plan 审阅 */
  DETACHED_PLAN_REQUIRE = 'detached_plan_require',
  /**任务审阅 */
  TASK_REVIEW_REQUIRE = 'task_review_require',
  /**工具审阅 */
  TOOL_USE_REVIEW_REQUIRE = 'tool_use_review_require',
  /**AI主动询问 */
  REQUIRE_USER_INTERACTIVE = 'require_user_interactive',
  /**智能体/forge审阅 */
  EXEC_AIFORGE_REVIEW_REQUIRE = 'exec_aiforge_review_require',
  /**工具决策 */
  TOOL_CALL_DECISION = 'tool_call_decision',
  /**当前任务规划结束标志 */
  END_PLAN_AND_EXECUTION = 'end_plan_and_execution',
  /** 任务规划崩溃的错误信息 */
  FAIL_PLAN_AND_EXECUTION = 'fail_plan_and_execution',
  /** ReAct任务崩溃的错误信息 */
  FAIL_REACT = 'fail_react_task',
  /** 工具结果 */
  TOOL_CALL_RESULT = 'tool_call_result',
  /** 参考资料 */
  Reference_Material = 'reference_material',
  /** stream数据集合组 */
  STREAM_GROUP = 'stream_group',
  /** 任务节点集合组 */
  TASK_NODE_GROUP = 'task_node_group',
  /** 用户手动介入上下文 */
  USER_MANUAL_INTERVENTION = 'user_manual_intervention',
  /** HTTP 流 fuzz 执行状态卡片（http_flow_fuzz_status） */
  HTTP_FLOW_FUZZ_STATUS = 'http_flow_fuzz_status',
  /** 报告生成完成（report_finish） */
  REPORT_FINISH = 'report_finish',
  /** 任务规划-未标识组的默认组 */
  TASK_DEFAULT_GROUP = 'task_default_group',
}
export type AIChatQSDataType = `${AIChatQSDataTypeEnum}`

export interface AIChatQSDataBase<T extends string, U> {
  type: T
  data: U
  id: string
  chatType: ReActChatBaseInfo['chatType']
  AIService: AIOutputEvent['AIService']
  AIModelName: AIOutputEvent['AIModelName']
  Timestamp: AIOutputEvent['Timestamp']
  /** 节点信息所属的任务节点索引 */
  taskIndex?: AIOutputEvent['TaskIndex']
  /** 前端专属数据，供前端逻辑和UI处理使用 */
  extraValue?: CustomPluginExecuteFormValue | Record<string, CustomPluginExecuteFormValue[]>
  /** 参考资料 */
  reference?: ChatReferenceMaterialPayload
  /** 父集合组的key(如果被收集到集合组中, 则存在该字段) */
  parentGroupKey?: string
}

type ChatQuestion = AIChatQSDataBase<AIChatQSDataTypeEnum.QUESTION, { qs: string; setting: AIInputEvent }>
export type ChatStream = AIChatQSDataBase<AIChatQSDataTypeEnum.STREAM, AIStreamOutput>
type ChatToolCallResult = AIChatQSDataBase<AIChatQSDataTypeEnum.TOOL_CALL_RESULT, AIStreamOutput>
type ChatToolCallParams = AIChatQSDataBase<AIChatQSDataTypeEnum.TOOL_CALL_PARAM, AIAgentGrpcApi.AIToolCallParams>
export type ChatApiRequestFailed = AIChatQSDataBase<
  AIChatQSDataTypeEnum.AI_API_REQUEST_FAILED,
  AIAgentGrpcApi.AIApiRequestFailedPayload
>
type ChatThought = AIChatQSDataBase<AIChatQSDataTypeEnum.THOUGHT, string>
type ChatResult = AIChatQSDataBase<AIChatQSDataTypeEnum.RESULT, string>
type ChatToolResult = AIChatQSDataBase<AIChatQSDataTypeEnum.TOOL_RESULT, AIToolResult>
type ChatPlanReviewRequire = AIChatQSDataBase<AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE, UIPlanReview>
type ChatDetachedPlanReviewRequire = AIChatQSDataBase<AIChatQSDataTypeEnum.DETACHED_PLAN_REQUIRE, UIDetachedPlanReview>
type ChatTaskReviewRequire = AIChatQSDataBase<AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE, UITaskReview>
type ChatToolUseReviewRequire = AIChatQSDataBase<AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE, UIToolUseReview>
type ChatRequireUserInteractive = AIChatQSDataBase<
  AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE,
  UIRequireUserInteractive
>
type ChatExecAIForgeReview = AIChatQSDataBase<AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE, UIExecAIForgeReview>
export type ChatTaskNodeGroup = AIChatQSDataBase<AIChatQSDataTypeEnum.TASK_NODE_GROUP, AITaskStartInfo>
export type ChatToolCallDecision = AIChatQSDataBase<AIChatQSDataTypeEnum.TOOL_CALL_DECISION, AIToolCallDecision>
type ChatPlanExecEnd = AIChatQSDataBase<AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION, string>
type ChatFailPlanAndExecution = AIChatQSDataBase<AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION, FailTaskChatError>
type ChatFailReact = AIChatQSDataBase<AIChatQSDataTypeEnum.FAIL_REACT, FailReactError>
type ChatReferenceMaterial = AIChatQSDataBase<
  AIChatQSDataTypeEnum.Reference_Material,
  { NodeId: AIOutputEvent['NodeId']; NodeIdVerbose: AIOutputEvent['NodeIdVerbose'] }
>
/** 用于渲染State定义使用, 无实际逻辑意义 */
type ChatStreamGroup = AIChatQSDataBase<AIChatQSDataTypeEnum.STREAM_GROUP, undefined>
export type ChatUserManualIntervention = AIChatQSDataBase<
  AIChatQSDataTypeEnum.USER_MANUAL_INTERVENTION,
  UserManualInterventionContext
>
type ChatHttpFlowFuzzStatus = AIChatQSDataBase<AIChatQSDataTypeEnum.HTTP_FLOW_FUZZ_STATUS, HttpFlowFuzzStatusCardData>
type ChatReportFinish = AIChatQSDataBase<AIChatQSDataTypeEnum.REPORT_FINISH, ReportFinishCardData>
export type ChatTaskDefaultGroup = AIChatQSDataBase<AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP, undefined>

export type AIChatQSData =
  | ChatQuestion
  | ChatStream
  | ChatThought
  | ChatResult
  | ChatToolResult
  | ChatPlanReviewRequire
  | ChatDetachedPlanReviewRequire
  | ChatTaskReviewRequire
  | ChatToolUseReviewRequire
  | ChatRequireUserInteractive
  | ChatExecAIForgeReview
  | ChatTaskNodeGroup
  | ChatToolCallDecision
  | ChatPlanExecEnd
  | ChatFailPlanAndExecution
  | ChatFailReact
  | ChatToolCallResult
  | ChatReferenceMaterial
  | ChatStreamGroup
  | ChatUserManualIntervention
  | ChatToolCallParams
  | ChatApiRequestFailed
  | ChatHttpFlowFuzzStatus
  | ChatReportFinish
  | ChatTaskDefaultGroup
// #endregion

/** @name 数据状态机定义 */
export interface ChatStoreState {
  /** 会话执行状态 */
  execute: boolean

  httpFuzzRequestUpdate: number
  httpFlowFuzzStatusUpdate: number
  /** 更新会话标题名 */
  sessionTitleUpdate: number
  /** 记忆列表 */
  memoryListUpdate: number
  /** 系统流信息(isSystem=true&type=stream) */
  updateSystemStream: number
  /** yaklang_code_change 更新 */
  yaklangCodeChangeUpdate: number

  /** 接口运行过程中的数据文件夹合集 */
  grpcFolders: AIFileSystemPin[]
  /** 时间线 */
  reActTimelines: AIAgentGrpcApi.TimelineItem[]

  /** 流推送的提示文案（notify / rate-limit），展示时长由 duration 系列字段控制，到期自动清空 */
  notifyMessage: AIInputNotifyMessage | null
  /** 任务规划历史数据-任务树 */
  planHistoryList: AIAgentGrpcApi.PlanHistoryList
  /** 问题队列信息 */
  questionQueue: AIQuestionQueues

  /** 运行时产生http数据(是否显示tab，是否刷新数据) */
  httpTabShow: boolean
  httpTabUpdate: number
  /** 运行时产生risk数据(是否显示tab，是否刷新数据) */
  riskTabShow: boolean
  riskTabUpdate: number

  // #region 会话列表相关数据
  /** 自由对话的loading 显示的文案 */
  casualTitle: string
  /** 自由对话的是否进行中 */
  casualLoading: boolean
  /** 场景状态(仅供自由对话[reAct])使用 */
  focusMode: string
  /** UI是否显示中间的任务规划列表 */
  showPlanList: boolean
  /** 任务规划的loading状态信息 */
  taskStatus: PlanLoadingStatus

  /** 自由对话的当前review(未操作) */
  currentCasualReview: string[]
  /** 任务规划当前显示的review数据 */
  currentPlanReviewToken: string
  /** 当前review是plan时，异步数据的更新版本 */
  currentPlanReviewExtraUpdate: number

  items: Record<string, ReActChatItemMeta>
  groups: Record<string, ReActChatGroupMeta>
  tasks: Record<string, ReActChatTaskMeta>

  casualChat: {
    elements: ReActChatRenderElement[]
    todoListUpdate: number
  }
  taskChat: {
    elements: ReActChatRenderElement[]
    plan: CurrentExecTaskTree
  }
  // #endregion

  /** UI上的头部的card横向滚动列表数据 */
  card: AIAgentGrpcApi.AIInfoCard[]
  /** 工具卡片相关的文件数据 */
  execFileRecord: Map<string, AIYakExecFileRecord[]>
  /** 文件操作列表 */
  yakExecResultLogs: StreamResult.Log[]

  /** 切换session时的loading状态 */
  switchLoading: boolean
  /** 用户主动取消问题的loading状态(自由对话) */
  cancelCasualLoading: boolean
  /** 用户主动取消问题的loading状态(任务规划) */
  cancelTaskLoading: boolean
  /** 请求历史数据相关State */
  requestHistoryState: UseAIMessageDataState

  /** 更新精准字段数据依赖的渲染版本号 */
  updateStateCount: (
    type:
      | 'httpFuzzRequestUpdate'
      | 'httpFlowFuzzStatusUpdate'
      | 'sessionTitleUpdate'
      | 'memoryListUpdate'
      | 'updateSystemStream'
      | 'yaklangCodeChangeUpdate'
      | 'currentPlanReviewExtraUpdate',
  ) => void

  updateFolders: (info: AIFileSystemPin) => void
  updateTimeLineItem: (item: AIAgentGrpcApi.TimelineItem) => void

  /** 更新http数据 */
  updateHttpData: () => void
  /** 更新risk数据 */
  updateRiskData: () => void

  /** 精准字段级数据修改(除去列表数据外的其他数据) */
  updateState: (
    partial: Partial<
      Omit<
        ChatStoreState,
        | 'httpFuzzRequestUpdate'
        | 'httpFlowFuzzStatusUpdate'
        | 'sessionTitleUpdate'
        | 'memoryListUpdate'
        | 'updateSystemStream'
        | 'yaklangCodeChangeUpdate'
        | 'httpTabShow'
        | 'httpTabUpdate'
        | 'riskTabShow'
        | 'riskTabUpdate'
        | 'grpcFolders'
        | 'reActTimelines'
        | 'currentCasualReview'
        | 'currentPlanReviewExtraUpdate'
        | 'items'
        | 'groups'
        | 'tasks'
        | 'casualChat'
        | 'taskChat'
      >
    >,
  ) => void

  updateTaskLoadingStatus: (status: Partial<PlanLoadingStatus>) => void

  /** 正在等待用户操作的reviewId列表 */
  updateCasualReview: (id: string, status: 'add' | 'remove') => void

  /** 更新自由对话列表的todoList，真实数据存放在内存池中 */
  updateCasualTodoList: () => void
  updatePlanTree: (planTree: CurrentExecTaskTree) => void

  /** 更新 每个工具执行过程中-文件的操作记录 */
  updateExecFileRecord: (callToolID: string, info: StreamResult.Log, order: number) => void

  dispatchStreamingNode: (params: {
    chatType: ChatListRenderType
    parentTaskId?: string
    node: {
      token: string
      kind: 'item' | 'group' | 'task'
      type: AIChatQSDataType
      dataOrigin: ReActChatDataOrigin
      isCached?: boolean
      cacheOrder?: number
    }
    groupTokenGenerator: () => string
  }) => void
  incrementNodeVersion: (token: string, kind: 'item' | 'group' | 'task') => void

  /** 删除指定列表的某项元素 */
  deleteListElement: (chatType: ChatListRenderType, token: string) => void
}
