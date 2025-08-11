type TraceControlMode = "start_stream" | "stop_stream" | "cancel_trace" | "set_tracing"
export interface PluginTraceRequest {
    // 控制字段
    ControlMode: TraceControlMode
    TraceID?: string
    EnableTracing: boolean
}
type TraceStatus = "pending" | "running" | "completed" | "failed" | "cancelled"
export interface PluginExecutionTrace {
    Index: number
    TraceID: string
    PluginID: string
    HookName: string
    Status: TraceStatus
    StartTime: number
    EndTime: number
    ExecutionArgsStr?: string // 前端展示
    ExecutionArgs?: Uint8Array
    ErrorMessage: string
    DurationMs: number
    RuntimeId: string
}
export interface PluginTraceStats {
    TotalTraces: number
    RunningTraces: number
    FailedTraces: number
    CompletedTraces: number
    CancelledTraces: number
}
export interface QueryPluginTrace {
    KeyWords: string
    Status: TraceStatus[]
}

export interface PluginTraceParams {
    pluginTraceRefFun: () => PluginTraceRefProps
    onStart: () => void
    onError: () => void
    onEnd: () => void
}

export interface PluginTraceRefProps {
    noDetailFun: () => void
    refreshAndScrollNow: () => void
    syncTracesToState: () => void
    cancelTracesToState: () => void
    refreshFlush: () => void
}
export interface PluginTraceProps {
    ref?: React.ForwardedRef<PluginTraceRefProps>
    isInitTrace: boolean
    startLoading: boolean
    tracing: boolean
    stopLoading: boolean
    readonly startPluginTrace: () => void
    readonly resetPluginTrace: () => void
    readonly stopPluginTrace: () => void
    readonly cancelPluginTraceById: (this: any, traceID: any) => void
    readonly pluginTraceStats: () => PluginTraceStats
    readonly pluginTraceList: () => PluginExecutionTrace[]
}
