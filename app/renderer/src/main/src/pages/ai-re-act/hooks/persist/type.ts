import type { AISource, AIAgentGrpcApi } from '../grpcApi'
import type { AIChatQSData, SessionRenderContent } from '../aiRender'

/** sessionRender 表一行记录 */
export interface SessionRenderRecord {
  sessionId: string
  source: AISource
  content: SessionRenderContent
  /** 与后端事件游标对齐；写树时一并 put */
  grpcOffset?: number
}

/** sessionContent 表一行记录（content 内 reference 仅为 token 列表） */
export interface SessionContentRecord {
  sessionId: string
  token: string
  content: AIChatQSData
}

/** getSessionContents 单条返回 */
export interface SessionContentItem {
  token: string
  content: AIChatQSData
}

/** sessionReference 表一行记录 */
export interface SessionReferenceRecord {
  sessionId: string
  token: string
  /** 存入时间（毫秒时间戳），取数时按此正序 */
  createdAt: number
  content: AIAgentGrpcApi.ReferenceMaterialPayload
}

/** getSessionReferences 单条返回 */
export interface SessionReferenceItem {
  token: string
  createdAt: number
  content: AIAgentGrpcApi.ReferenceMaterialPayload
}

/** setSessionContent 的 updater：同事务内 get → update → put */
export type SessionContentUpdater = (old: AIChatQSData | undefined) => AIChatQSData
