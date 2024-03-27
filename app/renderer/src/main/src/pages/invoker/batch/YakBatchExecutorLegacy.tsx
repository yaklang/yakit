import {ExecResult, YakScript} from "../schema"

export interface ExecBatchYakScriptResult {
    Id: string
    Status: string
    Ok?: boolean
    Reason?: string
    PoC: YakScript
    Result?: ExecResult

    ProgressMessage?: boolean
    ProgressPercent?: number
    ProgressTotal?: number
    ProgressCount?: number
    ProgressRunning?: number
    ScanTaskExecutingCount?: number

    TaskId?: string
    ExtraParams?: {Key: string; Value: string}[]
    Target?: string

    Timestamp: number
}
