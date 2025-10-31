import {ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"

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
