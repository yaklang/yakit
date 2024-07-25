export interface ExecResultMessage {
    type: "log" | "progress" | string
    content: ExecResultLog | ExecResultProgress
}

export interface ExecResultLog {
    level: string
    data: string | any
    timestamp: number
}

export interface ExecResultProgress {
    progress: number
    id: string
}
