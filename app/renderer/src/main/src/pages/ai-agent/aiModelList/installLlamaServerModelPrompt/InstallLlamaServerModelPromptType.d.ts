export interface InstallLlamaServerModelPromptProps {
    onFinished: () => void
    onClose: () => void
}

export interface DownloadLlamaServerModelPromptProps {
    modelName: string
    onFinished: () => void
}
