export interface InstallLlamaServerModelPromptProps {
  onStart: (params: { Proxy: string }) => void
}
export interface InstallLlamaServerProps {
  grpcInterface: 'InstallLlamaServer' | 'DownloadLocalModel'
  params: { Proxy: string; ModelName?: string }
  title: string
  token: string
  onFinished: () => void
  onCancel: () => void
  getContainer?: HTMLElement
}
export interface DownloadLlamaServerModelPromptProps {
  modelName: string
  onStart: (params: { ModelName: string; Proxy: string }) => void
}

export interface DownloadLlamaServerProps {
  modelName: string
  token: string
  onFinished: () => void
  onCancel: () => void
}
