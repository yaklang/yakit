// 知识库相关类型定义

export interface KnowledgeBase {
    Id: number
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

export interface KnowledgeBaseListProps {
    selectedKbId?: number
    onSelectKb: (kb: KnowledgeBase) => void
    onRefresh: () => void
}

export interface KnowledgeEntryTableProps {
    knowledgeBase?: KnowledgeBase
    onRefresh: () => void
} 