import {TagsCode} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {QSInputTextareaProps} from "../ai-agent/template/type"
import {PaginationSchema} from "../invoker/schema"

export type RateModeType = "must_aware" | "action_tips" | "reliability_warning" | "connection_links" | "none"
export interface MemoryBaseProps {
    pageId: string
}

export interface MemorySelectQuery {
    rate: RatingListItem[]
    tagMatchAll: boolean
    tags: CountAIMemoryEntityTagsResponse["TagsCount"]
}
export interface MemoryQueryProps {
    selectQuery: MemorySelectQuery
    setSelectQuery: React.Dispatch<React.SetStateAction<MemorySelectQuery>>
}

export interface AITextareaProps {
    textProps?: QSInputTextareaProps
}

export interface MemoryTableProps {
    queryParams: MemorySelectQuery
    setQueryParams: React.Dispatch<React.SetStateAction<MemorySelectQuery>>
}
export interface AIMemorySearchParams {
    type: "ai" | "keyword"
    keyword: string
    aiInput?: string
}
export interface RatingListItem {
    id: string
    keyName: string
    label: string
    max: number
    min: number
}
export interface QueryAIMemoryEntityRequest {
    Pagination: PaginationSchema
    Filter: AIMemoryEntityFilter
}
export interface AIMemoryEntity {
    Id: number
    CreatedAt: number
    UpdatedAt: number
    MemoryID: string
    SessionID: string
    Content: string
    Tags: string[]
    PotentialQuestions: string[]
    CScore: number
    OScore: number
    RScore: number
    EScore: number
    PScore: number
    AScore: number
    TScore: number
    CorePactVector: number[]
}
export interface QueryAIMemoryEntityResponse {
    Pagination: PaginationSchema
    Data: AIMemoryEntity[]
    Total: number
}

export interface AIMemoryEntityFilter {
    SessionID?: string
    MemoryID?: string[]
    ContentKeyword?: string
    Tags?: string[]
    TagMatchAll?: boolean
    PotentialQuestionKeyword?: string
    CScore?: FloatRange
    OScore?: FloatRange
    RScore?: FloatRange
    EScore?: FloatRange
    PScore?: FloatRange
    AScore?: FloatRange
    TScore?: FloatRange
    CreatedAt?: Int64Range
    UpdatedAt?: Int64Range
    //Semantic query (embedding based)
    SemanticQuery?: string
    //Score vector query (HNSW based), must be 7 dims when set.
    CorePactQueryVector?: number[]
    VectorTopK?: string
}

export interface FloatRange {
    Enabled: boolean
    Min: number
    Max: number
}
export interface Int64Range {
    Enabled: boolean
    Min: number
    Max: number
}

export interface DeleteAIMemoryEntityRequest {
    Filter?: AIMemoryEntityFilter
}

export interface CreateAIMemoryEntityRequest {
    SessionID: string
    FreeInput?: string
}

export interface CountAIMemoryEntityTagsRequest {
    SessionID?: string
}

export interface CountAIMemoryEntityTagsResponse {
    TagsCount: TagsCode[]
}
