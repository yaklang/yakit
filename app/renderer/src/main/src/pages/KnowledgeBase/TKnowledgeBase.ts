import type {GetKnowledgeBaseResponse, KnowledgeBase} from "@/components/playground/knowlegeBase"
import {VirtualPaging} from "@/hook/useVirtualTableHook/useVirtualTableHookType"
import {QueryGeneralResponseProps} from "../invoker/schema"
import {IconProps} from "@/assets/newIcon"
interface KnowledgeBaseFile {
    path: string
    fileType: string
}

interface TRepositoryManageProps {
    knowledgeBasesData?: GetKnowledgeBaseResponse["KnowledgeBases"]
    knowledgeBasesRunAsync: () => Promise<KnowledgeBase[]>
}

interface TKnowledgeBaseProps {
    refreshAsync: Pick<TRepositoryManageProps, "knowledgeBasesRunAsync">["knowledgeBasesRunAsync"]
    visible?: boolean
    itemsData?: KnowledgeBase
    title?: string
    handOpenKnowledgeBasesModal?: () => void
    setMenuOpenKey?: (value: number) => void
    menuOpenKey?: number
}

interface TDeleteConfirmProps extends Required<Pick<TKnowledgeBaseProps, "refreshAsync" | "visible">> {
    KnowledgeBaseId: number
    onVisible: (v: boolean) => void
}

interface CreateKnowledgeBaseData extends Entity, KnowledgeBaseEntry {
    KnowledgeBaseFile: KnowledgeBaseFile[]
    KnowledgeBaseName: string
    KnowledgeBaseType: string
    KnowledgeBaseDescription: string
    KnowledgeBaseLength: number
    streamToken: string
    streamstep: 1 | 2 | "success"
    Tags: string[]
    IsImported: boolean
    addManuallyItem: boolean
    // 从实体生成知识 流数据收集
    historyGenerateKnowledgeList: Array<{
        date: string
        name: string
        token: string
        HiddenIndex: string
        isAll: boolean
        depth: number
        ID: string
        query?: string
    }>
}

interface TListThirdPartyBinaryResponse {
    Binaries: {
        Name: string
        SupportCurrentPlatform: boolean
        Description: string
        InstallPath: string
        DownloadURL: string
    }[]
}

interface KnowledgeBaseContentProps {
    KnowledgeBases?: (CreateKnowledgeBaseData & {ID: string})[]
}

type TExistsKnowledgeBaseAsync = {
    existsKnowledgeBaseAsync: (Keyword?: string) => Promise<any>
}

interface SearchKnowledgeBaseEntryFilter {
    KnowledgeBaseId: number
    Keyword: string
    RelatedEntityUUIDS?: string[]
    HiddenIndex: string[]
}
interface SearchKnowledgeBaseEntryRequest {
    Filter: Partial<SearchKnowledgeBaseEntryFilter>
    Pagination: VirtualPaging
}

interface KnowledgeBaseEntry {
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
    HiddenIndex: string
    RelatedEntityUUIDS: string
}

type SearchKnowledgeBaseEntryResponse = QueryGeneralResponseProps<KnowledgeBaseEntry, "KnowledgeBaseEntries">

// 查询知识库-向量表入参
interface ListVectorStoreEntriesRequest {
    Filter: Partial<ListVectorStoreEntriesFilter>
    Pagination: VirtualPaging
}
interface ListVectorStoreEntriesFilter {
    CollectionID: number
    Keyword: string
    CollectionName: string
}

// 查询知识库-向量表响应
interface VectorStoreEntry {
    ID: number
    UID: string
    Content: string
    Metadata: string
    Embedding: number[]
    DocumentType: string
    EntityID: string
}

type VectorStoreEntryResponse = QueryGeneralResponseProps<VectorStoreEntry, "Entries">

// 查询知识库-实体表入参
interface EntityFilter {
    BaseID: number
    BaseIndex: string
    ReposName: string
    IDs: number[]
    Types: string[]
    Names: string[]
    HiddenIndex: string[]
    RuntimeID: string[]
    Keywords: string[]
    ID: string
}

interface QueryEntityRequest {
    Filter: Partial<EntityFilter>
    Pagination: VirtualPaging
}

interface KVPair {
    Key: string
    Value: string
    MarshalValue: string
}

interface Entity {
    ID: number
    Type: string
    Name: string
    Description: string
    BaseID: number
    BaseIndex: string
    Attributes: KVPair[]
    Rationale: string
    HiddenIndex: string
}
type QueryEntityResponse = QueryGeneralResponseProps<Entity, "Entities">

export type {
    TKnowledgeBaseProps,
    TDeleteConfirmProps,
    KnowledgeBaseFile,
    CreateKnowledgeBaseData,
    KnowledgeBaseContentProps,
    TExistsKnowledgeBaseAsync,
    TListThirdPartyBinaryResponse,
    SearchKnowledgeBaseEntryRequest,
    SearchKnowledgeBaseEntryResponse,
    KnowledgeBaseEntry,
    ListVectorStoreEntriesRequest,
    VectorStoreEntryResponse,
    VectorStoreEntry,
    QueryEntityRequest,
    QueryEntityResponse,
    EntityFilter
}
