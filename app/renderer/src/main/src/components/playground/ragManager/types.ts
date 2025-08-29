// RAG 管理相关类型定义

// 向量存储集合 - 对应 VectorStoreCollection
export interface VectorStoreCollection {
    ID: number                   // int64 ID = 3
    Name: string                 // string Name = 1
    Description?: string         // string Description = 2
    ModelName?: string           // string ModelName = 4
    Dimension?: number           // int32 Dimension = 5
    M?: number                   // int32 M = 6
    Ml?: number                  // float Ml = 7
    EfSearch?: number            // int32 EfSearch = 8
    EfConstruct?: number         // int32 EfConstruct = 9
    DistanceFuncType?: string    // string DistanceFuncType = 10
    VectorCount?: number         // 这个字段在gRPC中没有定义，但UI需要显示
    // 注意：gRPC定义中没有CreatedAt和UpdatedAt字段
}

// 向量存储条目 - 对应 VectorStoreEntry
export interface VectorStoreEntry {
    ID: number                   // int64 ID = 1
    UID?: string                 // string UID = 2
    Content?: string             // string Content = 3
    Metadata?: string            // string Metadata = 4 (注意这里是string不是object)
    Embedding?: number[]         // repeated float Embedding = 5
    // 注意：gRPC定义中没有CreatedAt和UpdatedAt字段
}

// 分页类型 - 对应 Paging
export interface Paging {
    Page: number
    Limit: number
    OrderBy?: string
    Order?: "asc" | "desc"
}

// API 请求参数
export interface GetAllVectorStoreCollectionsWithFilterRequest {
    Keyword?: string             // string Keyword = 1
    ID?: number                  // int64 ID = 2
    Pagination?: Paging          // Paging Pagination = 3
}

export interface ListVectorStoreEntriesRequest {
    CollectionID: number         // int64 CollectionID = 1
    Keyword?: string             // string Keyword = 2
    Pagination?: Paging          // Paging Pagination = 3
}

export interface GetDocumentByVectorStoreEntryIDRequest {
    ID: number                   // int64 ID = 1
}

export interface CreateVectorStoreEntryRequest {
    UID: string                  // string UID = 1
    Content: string              // string Content = 2
    Metadata: string             // string Metadata = 3
}

export interface UpdateVectorStoreCollectionRequest {
    ID: number                   // int64 ID = 3
    Name: string                 // string Name = 1
    Description: string          // string Description = 2
}

// API 响应
export interface GetAllVectorStoreCollectionsWithFilterResponse {
    Collections: VectorStoreCollection[]  // repeated VectorStoreCollection Collections = 1
    Pagination?: Paging                   // Paging Pagination = 2
    Total: number                         // int64 Total = 3
}

export interface ListVectorStoreEntriesResponse {
    Entries: VectorStoreEntry[]  // repeated VectorStoreEntry Entries = 1
    Pagination?: Paging          // Paging Pagination = 2
    Total: number                // int64 Total = 3
}

export interface GetDocumentByVectorStoreEntryIDResponse {
    Document: any                // KnowledgeBaseEntry Document = 1
}

// 组件属性类型
export interface RagManagerProps {
    // 主管理组件属性
}

export interface RagCollectionListProps {
    selectedCollection?: VectorStoreCollection
    onSelectCollection: (collection: VectorStoreCollection) => void
    onRefresh: () => void
}

export interface RagEntryTableProps {
    selectedCollection?: VectorStoreCollection
    onRefresh: () => void
}

// 详情展示相关
export interface RagEntryDetailProps {
    entry: VectorStoreEntry
    visible: boolean
    onClose: () => void
}
