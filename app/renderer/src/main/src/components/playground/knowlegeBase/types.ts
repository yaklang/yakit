// 知识库相关类型定义

export interface KnowledgeBase {
    ID: number
    KnowledgeBaseName: string
    KnowledgeBaseDescription: string
    KnowledgeBaseType: string
    CreatedAt?: string
    UpdatedAt?: string
}

export interface KnowledgeBaseEntry {
    ID: number
    KnowledgeBaseId: number
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
    KnowledgeBaseID: number
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
    KnowledgeBaseId: number
    Keyword: string
    Pagination: {
        Page: number
        Limit: number
        OrderBy?: string
        Order?: "asc" | "desc"
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
    Order?: "asc" | "desc"
}

// 获取知识库请求参数
export interface GetKnowledgeBaseRequest {
    KnowledgeBaseId?: number
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
    selectedKbId?: number
    onSelectKb: (kb: KnowledgeBase) => void
    onRefresh: () => void
}

export interface KnowledgeEntryTableProps {
    knowledgeBase?: KnowledgeBase
    onRefresh: () => void
}

// 问答相关类型定义
export interface QueryKnowledgeBaseByAIRequest {
    Query: string
    EnhancePlan: string
    KnowledgeBaseID: number
    QueryAllCollections: boolean
}

export interface QueryKnowledgeBaseByAIResponse {
    Message: string
    MessageType: "message" | "mid_result" | "result" | "error" | "ai_summary"
    Data: string
}

export interface QAMessage {
    id: string
    type: "user" | "assistant"
    content: string
    timestamp: number
    entries?: KnowledgeBaseEntry[]
    isStreaming?: boolean
}

export interface KnowledgeBaseQAProps {
    knowledgeBase?: KnowledgeBase
    onRefresh?: () => void
} 