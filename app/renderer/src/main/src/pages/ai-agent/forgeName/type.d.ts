export interface ForgeNameProps {}
export interface ExportAIForgeFormValues {
    OutputName: string
    ToolNames?: string[]
    Password?: string
}
export interface ImportAIForgeFormValues {
    InputPath: string
    Password?: string
}
export interface ExportAIForgeRequest {
    ForgeNames: string[]
    TargetPath?: string
    OutputName: string
    ToolNames?: string[]
    Password?: string
}
export interface ImportAIForgeRequest {
    InputPath: string
    Overwrite: boolean
    NewForgeName?: string
    Password?: string
}

export interface ExportImportAIForgeProgress {
    Percent: number
    Message: string
    MessageType: string
}
