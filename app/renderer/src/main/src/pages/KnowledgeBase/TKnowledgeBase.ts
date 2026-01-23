import type {GetKnowledgeBaseResponse, KnowledgeBase} from "@/components/playground/knowlegeBase"
import {VirtualPaging} from "@/hook/useVirtualTableHook/useVirtualTableHookType"
import {QueryGeneralResponseProps} from "../invoker/schema"
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

interface CreateKnowledgeBaseData extends Omit<Entity, "ID">, Omit<KnowledgeBaseEntry, "ID"> {
    KnowledgeBaseFile: KnowledgeBaseFile[]
    KnowledgeBaseName: string
    KnowledgeBaseType: string
    KnowledgeBaseDescription: string
    KnowledgeBaseLength: number
    streamToken: string
    CreatedFromUI?: boolean
    streamstep: 1 | 2 | "success"
    Tags: string[]
    IsImported: boolean
    IsDefault?: boolean
    addManuallyItem: boolean
    prompt?: string
    disableERM: "true" | "false"
    chunk: string
    concurrency: number
    SerialVersionID: string
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

interface KnowledgeBaseContentProps<T = string> {
    KnowledgeBases?: (CreateKnowledgeBaseData & {ID: T})[]
}

type TExistsKnowledgeBaseAsync = {
    existsKnowledgeBaseAsync: (Keyword?: string) => Promise<any>
}

interface SearchKnowledgeBaseEntryFilter {
    KnowledgeBaseId: string
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

interface TClearKnowledgeResponse {
    Params: TClearKnowledgeResponseParam[]
    CollaboratorInfo?: any[]
    RiskInfo?: any[]
    PluginEnvKey?: any[]
    Id: number
    Content: string
    Type: string
    CreatedAt: number
    ScriptName: string
    Help: string
    Level: string
    Author: string
    Tags: string
    IsHistory: boolean
    IsIgnore?: boolean
    IsGeneralModule?: boolean
    GeneralModuleVerbose?: string
    GeneralModuleKey?: string
    FromGit?: string
    EnablePluginSelector?: boolean
    PluginSelectorTypes?: string
    OnlineId?: number
    UserId: number
    OnlineScriptName: string
    OnlineContributors: string
    UUID: string
    OnlineIsPrivate?: boolean
    HeadImg?: string
    OnlineBaseUrl?: string
    BaseOnlineId?: number
    OnlineOfficial?: boolean
    OnlineGroup?: string
    IsCorePlugin?: boolean
    UpdatedAt?: number
}

interface TClearKnowledgeResponseParam {
    Field: string
    DefaultValue: string
    TypeVerbose: string
    FieldVerbose: string
    Help: string
    Required?: boolean
    Group?: string
    ExtraSetting?: string
    MethodType?: string
    JsonSchema?: string
    SuggestionDataExpression?: string
    UISchema?: string
}

interface TResultAllTableTotal {
    entityTotal: string
    knowledgeTotal: string
    vectorTotal: string
}

interface ResponseRagsLatest {
    name: string
    name_zh: string
    version: string
    file: string
    hashfile: string
    hashtype: string
    hash: string
}

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
    EntityFilter,
    TClearKnowledgeResponse,
    TResultAllTableTotal,
    ResponseRagsLatest
}
