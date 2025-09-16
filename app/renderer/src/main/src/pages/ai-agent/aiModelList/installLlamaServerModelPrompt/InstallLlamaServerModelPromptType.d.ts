export interface InstallLlamaServerModelPromptProps {
    token: string
    onStart: () => void
}
export interface InstallLlamaServerProps {
    grpcInterface:string
    title:string
    token: string
    onFinished: () => void
    onCancel: () => void
    getContainer?: HTMLElement
}
export interface DownloadLlamaServerModelPromptProps {
    modelName: string
    token: string
    onStart: () => void
}

export interface DownloadLlamaServerProps {
    modelName: string
    token: string
    onFinished: () => void
    onCancel: () => void
}
