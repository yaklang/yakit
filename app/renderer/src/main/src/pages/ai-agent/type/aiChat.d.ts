export interface McpConfig {
    Type: string
    Key: string
    Url: string
}

export interface AIStartParams {
    McpServers?: McpConfig[]

    UserQuery: string
    /** allow ai to use the fs */
    EnableSystemFileSystemOperator?: boolean
    UseDefaultAIConfig?: boolean
}

export interface AIInputEvent {
    IsStart?: boolean
    Params?: AIStartParams

    IsInteractiveMessage?: boolean
    InteractiveId?: string
    InteractiveJSONInput?: string
}

export interface AIOutputEvent {
    CoordinatorId: string
    Type: string
    NodeId: string
    // 系统输出
    IsSystem: boolean
    // AI正常输出
    IsStream: boolean
    // AI思考输出
    IsReason: boolean
    StreamDelta: Uint8Array
    IsJson: boolean
    Content: Uint8Array
}

export interface AIChatTask {
    name: string
    goal: string
    state: boolean
    subs: AIChatTask[]
}
