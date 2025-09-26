import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {StreamResult, HoldGRPCStreamProps} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {KVPair} from "@/models/kv"
import {ExecResult, PaginationSchema} from "@/pages/invoker/schema"
import {ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {UseCasualChatState, UseChatIPCState, UseTaskChatState} from "@/pages/ai-re-act/hooks/type"
import {AIAgentGrpcApi, AIOutputEvent, AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"
// #region AI-(Task|Triage)

export interface AITriageInputEvent {
    IsStart?: boolean
    Params?: AIStartParams // 上下文AI配置

    IsInteractiveMessage?: boolean // 暂无用
    InteractiveId?: string // 暂无用
    InteractiveJSONInput?: string // 暂无用

    IsFreeInput?: boolean
    FreeInput?: string
}

export interface AIChatReviewExtra {
    type: "plan_task_analysis"
    data: AIAgentGrpcApi.PlanReviewRequireExtra
}

/** UI-chat 信息 */
export interface AIChatInfo {
    /** 唯一标识 */
    id: string
    /** 对话名称 */
    name: string
    /** 对话问题 */
    question: string
    /** 时间 */
    time: number
    /** 请求参数 */
    request: AIStartParams
    /** 回答 */
    answer?: {
        aiPerfData: UseChatIPCState["aiPerfData"]
        logs: UseChatIPCState["logs"]
        casualChat: UseChatIPCState["casualChat"]
        taskChat: UseChatIPCState["taskChat"]
    }
}
/**QueryAIEvent 接口请求 */
export interface AIEventQueryRequest {
    ProcessID: string
}
/**QueryAIEvent 接口返回 */
export interface AIEventQueryResponse {
    Events: AIOutputEvent[]
}
// #endregion

//#region ai tool
export interface AITool {
    Name: string
    Description: string
    Content: string
    ToolPath: string
    Keywords: string[]
    IsFavorite: boolean
    ID: number
    VerboseName: string
}
export interface GetAIToolListRequest {
    Query: string
    ToolName: string
    Pagination: PaginationSchema
    OnlyFavorites: boolean
    ToolID?: number
}
export interface GetAIToolListResponse {
    Tools: AITool[]
    Pagination: PaginationSchema
    Total: number
}
export interface ToggleAIToolFavoriteRequest {
    /**@deprecated */
    ToolName?: string
    ID: number
}
export interface ToggleAIToolFavoriteResponse {
    IsFavorite: boolean
    Message: string
}
export interface SaveAIToolRequest {
    Name: string
    Description: string
    Content: string
    ToolPath: string
    Keywords: string[]
}
export interface SaveAIToolV2Response {
    IsSuccess: boolean
    Message: string
    AITool: AITool
}
export interface UpdateAIToolRequest extends SaveAIToolRequest {
    ID: number
}
export interface DeleteAIToolRequest {
    /**@deprecated */
    ToolNames?: string
    IDs: number[]
}
export interface AIToolGenerateMetadataRequest {
    ToolName: string
    Content: string
}
export interface AIToolGenerateMetadataResponse {
    Name: string
    Description: string
    Keywords: string[]
}
//#endregion
//#region  ai model
export interface GeneralResponse {
    Ok: boolean
    Reason: string
}
export interface LocalModelConfig {
    Name: string
    Type: string
    FileName: string
    DownloadURL: string
    Description: string
    DefaultPort: number
    IsReady: boolean
    IsLocal: boolean
    Path: string
    Status: LocalModelStatus | null
}

export interface LocalModelStatus {
    Status: "stopped" | "starting" | "running" | "stopping" | "error"
    Host: string
    Port: number
    Model: string
    ModelPath: string
    LlamaServerPath: string
    ContextSize: number
    ContBatching: boolean
    BatchSize: number
    Threads: number
    Detached: boolean
    Debug: boolean
    Pooling: string
    StartupTimeout: number
    Args: string[]
}

export interface GetSupportedLocalModelsResponse {
    Models: LocalModelConfig[]
}
export interface IsLlamaServerReadyResponse extends GeneralResponse {}
export interface InstallLlamaServerRequest {
    Proxy: string
    token: string
}
export interface DownloadLocalModelRequest {
    ModelName: string
    Proxy: string
    token: string
}
export interface IsLocalModelReadyRequest {
    ModelName: string
}
export interface IsLocalModelReadyResponse extends GeneralResponse {}
export interface StartLocalModelRequest {
    token: string
    ModelName: string
    Host: string
    Port: number
}

export interface StopLocalModelRequest {
    ModelName: string
}

export interface AddLocalModelRequest {
    Name: string
    ModelType: string
    Description: string
    Path: string
}

export interface DeleteLocalModelRequest {
    Name: string
    DeleteSourceFile: boolean
}

export interface UpdateLocalModelRequest extends AddLocalModelRequest {}

export interface GetAllStartedLocalModelsResponse {
    Models: StartedLocalModelInfo[]
}
export interface StartedLocalModelInfo {
    Name: string
    ModelType: string
    Host: string
    Port: number
}
export interface ClearAllModelsRequest {
    DeleteSourceFile: boolean
}
export interface GetAIModelListResponse {
    onlineModels: ThirdPartyApplicationConfig[]
    localModels: StartedLocalModelInfo[]
}
//#endregion
