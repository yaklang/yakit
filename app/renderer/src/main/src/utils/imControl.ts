const { ipcRenderer } = window.require('electron')

export interface IMControlPlatformInfo {
  Platform: string
  Connected: boolean
  Message: string
}

export interface IMControlSessionInfo {
  SessionKey: string
  Platform: string
  ChatID: string
  SenderID: string
  LastActiveAt: number
  CurrentModel: string
  ChatType?: string
  ChatTitle?: string
  SenderName?: string
  ThreadID?: string
}

export interface IMControlStatusResp {
  Running: boolean
  Platforms?: IMControlPlatformInfo[]
  Sessions?: IMControlSessionInfo[]
}

export type IMReplyGranularity = 'standard' | 'summary' | 'detailed'
export type IMGroupTrigger = 'must_at' | 'allow_slash' | 'allow_all'

export interface IMControlConfig {
  ReplyQuote: boolean
  ReplyGranularity: IMReplyGranularity
  GroupTrigger: IMGroupTrigger
}

export const DEFAULT_IM_CONTROL_CONFIG: IMControlConfig = {
  ReplyQuote: true,
  ReplyGranularity: 'standard',
  GroupTrigger: 'must_at',
}

export const normalizeIMControlConfig = (config?: Partial<IMControlConfig>): IMControlConfig => {
  const replyGranularityList: IMReplyGranularity[] = ['standard', 'summary', 'detailed']
  const groupTriggerList: IMGroupTrigger[] = ['must_at', 'allow_slash', 'allow_all']
  return {
    ReplyQuote: config?.ReplyQuote ?? DEFAULT_IM_CONTROL_CONFIG.ReplyQuote,
    ReplyGranularity: replyGranularityList.includes(config?.ReplyGranularity as IMReplyGranularity)
      ? (config?.ReplyGranularity as IMReplyGranularity)
      : DEFAULT_IM_CONTROL_CONFIG.ReplyGranularity,
    GroupTrigger: groupTriggerList.includes(config?.GroupTrigger as IMGroupTrigger)
      ? (config?.GroupTrigger as IMGroupTrigger)
      : DEFAULT_IM_CONTROL_CONFIG.GroupTrigger,
  }
}

export const startIMControl = (
  platforms?: string[],
  config: IMControlConfig = DEFAULT_IM_CONTROL_CONFIG,
): Promise<{ Started: boolean; Message: string }> =>
  ipcRenderer.invoke('StartIMControl', {
    Platforms: platforms || [],
    ...normalizeIMControlConfig(config),
  })

export const stopIMControl = (): Promise<{ Stopped: boolean; Message: string }> =>
  ipcRenderer.invoke('StopIMControl', {})

export const getIMControlStatus = (): Promise<IMControlStatusResp> => ipcRenderer.invoke('GetIMControlStatus', {})

export const updateIMControlConfig = (config: IMControlConfig): Promise<{ Updated: boolean; Message: string }> =>
  ipcRenderer.invoke('UpdateIMControlConfig', normalizeIMControlConfig(config))
