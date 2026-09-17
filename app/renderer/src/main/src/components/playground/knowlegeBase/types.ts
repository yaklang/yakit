// 知识库相关类型定义

export interface KnowledgeBase {
  ID: string
  KnowledgeBaseName: string
  KnowledgeBaseDescription: string
  KnowledgeBaseType: string
  CreatedAt?: string
  UpdatedAt?: string
}

export interface KnowledgeBaseEntry {
  ID: string
  KnowledgeBaseId: string
  HiddenIndex: string
  KnowledgeTitle: string
  KnowledgeType: string
  ImportanceScore: number
  Keywords: string[]
  KnowledgeDetails: string
  Summary: string
  SourcePage: number
  PotentialQuestions: string[]
  PotentialQuestionsVector: number[]
  CreatedAt?: string
  UpdatedAt?: string
}

export interface KnowledgeBaseFormData {
  KnowledgeBaseName: string
  KnowledgeBaseDescription: string
  KnowledgeBaseType: string
}

export interface KnowledgeEntryFormData {
  KnowledgeBaseID: string
  KnowledgeTitle: string
  KnowledgeType: string
  ImportanceScore: number
  Keywords: string[]
  KnowledgeDetails: string
  Summary: string
  SourcePage: number
  PotentialQuestions: string[]
}

export interface SearchKnowledgeEntryParams {
  KnowledgeBaseId: string
  Keyword?: string
  Pagination: {
    Page: number
    Limit: number
    OrderBy?: string
    Order?: 'asc' | 'desc'
  }
}

export interface KnowledgeBaseManagerProps {
  // 组件属性
}

// 分页相关类型
export interface Pagination {
  Page: number
  Limit: number
  OrderBy?: string
  Order?: 'asc' | 'desc'
}

// 获取知识库请求参数
export interface GetKnowledgeBaseRequest {
  KnowledgeBaseId?: string
  Keyword?: string
  Pagination?: Pagination
}

// 获取知识库响应
export interface GetKnowledgeBaseResponse {
  KnowledgeBases: KnowledgeBase[]
  Pagination: Pagination
  Total: number
}

// 流式操作状态
export interface StreamStatus {
  token: string
  loading: boolean
  progress?: string
}

export interface KnowledgeBaseListProps {
  selectedKbId?: string
  onSelectKb: (kb: KnowledgeBase) => void
  onRefresh: () => void
  onOpenQA?: (kb: KnowledgeBase, queryAllCollectionsDefault: boolean) => void
}

export interface KnowledgeEntryTableProps {
  knowledgeBase?: KnowledgeBase
  onRefresh: () => void
}

// 问答相关类型定义
export interface QueryKnowledgeBaseByAIRequest {
  Query: string
  EnhancePlan: string
  KnowledgeBaseID: string
  QueryAllCollections: boolean
}

export interface QueryKnowledgeBaseByAIResponse {
  Message: string
  MessageType: 'message' | 'mid_result' | 'result' | 'error' | 'ai_summary'
  Data: string
}

export interface QAMessage {
  id: string
  type: 'user' | 'assistant'
  content: string // 当前可见内容（过程或最终回答）
  timestamp: number
  entries?: KnowledgeBaseEntry[]
  isStreaming?: boolean
  // 新增：过程内容与最终答案
  processLog?: string
  finalAnswer?: string
  showDetails?: boolean
  showRelated?: boolean
}

export interface KnowledgeBaseQAProps {
  knowledgeBase?: KnowledgeBase
  onRefresh?: () => void
  /** 从入口控制：是否默认查询所有集合 */
  queryAllCollectionsDefault?: boolean
}
