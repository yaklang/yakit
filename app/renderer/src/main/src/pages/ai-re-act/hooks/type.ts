import type { ChatListRenderType } from './aiRender'
import type { AIAgentGrpcApi, AIInputEvent, AIOutputEvent } from './grpcApi'
import type { ChatMultiSessionController } from './ChatMultiSessionController'
import type { YakitRouteType } from '@/enums/yakitRoute'
import type { DeleteSessionsAISourceType } from '@/pages/ai-agent/historyChat/utils'

/** 开始启动流接口的唯一token、请求参数和额外参数 */
export interface AIChatIPCStartParams {
  token: string
  params: AIInputEvent
  /** 会话归属路由（不可变） */
  route: YakitRouteType
  /** 会话初始归属 pageId（后续可 rebind） */
  pageId: string
  /**
   * 本地 sessionOwnerMap 索引用 source；仅本地使用，不透传 gRPC。
   * IM 会话按平台区分：feishu→im-Lark / dingtalk→im-DingTalk；
   * 其它场景省略，走 params.Params?.Source 兜底。
   */
  localSource?: DeleteSessionsAISourceType
  /**
   * 打开后端仍在执行的历史会话时为 true；仅用于恢复本地 UI 运行态，不透传 gRPC。
   * 典型场景是计划任务已启动、用户中途从历史列表进入该会话。
   */
  isRunningSession?: boolean
}

/** 执行流途中发送消息的参数 */
export interface AIChatSendParams {
  token: string
  type: 'casual' | 'task' | ''
  params: AIInputEvent
  optionValue?: string
}

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
