const { ipcRenderer } = window.require('electron')

export type IMControlPlatformLevel = 'ok' | 'warning' | 'error' | 'disabled' | string

export interface IMControlPlatformState {
  Platform: string
  Label?: string
  Configured?: boolean
  Enabled?: boolean
  Connected: boolean
  Transport?: string
  Level?: IMControlPlatformLevel
  Message: string
  UpdatedAtUnixMs?: number
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

export interface IMControlState {
  Running: boolean
  Platforms?: IMControlPlatformState[]
  Sessions?: IMControlSessionInfo[]
  ActiveSessionCount?: number
}

export interface IMControlStateEvent {
  Sequence?: number
  TimestampUnixMs?: number
  Reason?: string
  State?: IMControlState
}

export type IMReplyGranularity = 'standard' | 'summary' | 'detailed'
export type IMGroupTrigger = 'must_at' | 'allow_slash' | 'allow_all'
export type IMReviewPolicy = 'manual' | 'yolo' | 'ai'

export interface IMControlConfig {
  ReplyQuote: boolean
  ReplyGranularity: IMReplyGranularity
  GroupTrigger: IMGroupTrigger
  ReviewPolicy: IMReviewPolicy
}

export type IMControlConfigMap = Record<string, IMControlConfig>

export const DEFAULT_IM_CONTROL_CONFIG: IMControlConfig = {
  ReplyQuote: true,
  ReplyGranularity: 'standard',
  GroupTrigger: 'must_at',
  ReviewPolicy: 'yolo',
}

export const normalizeIMControlConfig = (config?: Partial<IMControlConfig>): IMControlConfig => {
  const replyGranularityList: IMReplyGranularity[] = ['standard', 'summary', 'detailed']
  const groupTriggerList: IMGroupTrigger[] = ['must_at', 'allow_slash', 'allow_all']
  const reviewPolicyList: IMReviewPolicy[] = ['manual', 'yolo', 'ai']
  const normalizedGroupTrigger = groupTriggerList.includes(config?.GroupTrigger as IMGroupTrigger)
    ? (config?.GroupTrigger as IMGroupTrigger)
    : DEFAULT_IM_CONTROL_CONFIG.GroupTrigger
  return {
    ReplyQuote: config?.ReplyQuote ?? DEFAULT_IM_CONTROL_CONFIG.ReplyQuote,
    ReplyGranularity: replyGranularityList.includes(config?.ReplyGranularity as IMReplyGranularity)
      ? (config?.ReplyGranularity as IMReplyGranularity)
      : DEFAULT_IM_CONTROL_CONFIG.ReplyGranularity,
    GroupTrigger: normalizedGroupTrigger === 'allow_slash' ? 'must_at' : normalizedGroupTrigger,
    ReviewPolicy: reviewPolicyList.includes(config?.ReviewPolicy as IMReviewPolicy)
      ? (config?.ReviewPolicy as IMReviewPolicy)
      : DEFAULT_IM_CONTROL_CONFIG.ReviewPolicy,
  }
}

export const normalizeIMControlConfigMap = (
  configMap?: Record<string, Partial<IMControlConfig> | undefined>,
): IMControlConfigMap => {
  if (
    configMap &&
    ('ReplyQuote' in configMap ||
      'ReplyGranularity' in configMap ||
      'GroupTrigger' in configMap ||
      'ReviewPolicy' in configMap)
  ) {
    const legacy = normalizeIMControlConfig(configMap as Partial<IMControlConfig>)
    return {
      feishu: legacy,
      dingtalk: legacy,
    }
  }
  const source = configMap || {}
  return {
    feishu: normalizeIMControlConfig(source.feishu),
    dingtalk: normalizeIMControlConfig(source.dingtalk),
  }
}

export const buildIMControlPlatformConfigs = (configMap?: IMControlConfigMap) => {
  const normalized = normalizeIMControlConfigMap(configMap)
  return Object.entries(normalized).map(([platform, config]) => ({
    Platform: platform,
    ...config,
  }))
}

export const startIMControl = (
  platforms?: string[],
  configMap?: IMControlConfigMap,
): Promise<{ Started: boolean; Message: string }> =>
  ipcRenderer.invoke('StartIMControl', {
    Platforms: platforms || [],
    ...DEFAULT_IM_CONTROL_CONFIG,
    PlatformConfigs: buildIMControlPlatformConfigs(configMap),
  })

export const stopIMControl = (): Promise<{ Stopped: boolean; Message: string }> =>
  ipcRenderer.invoke('StopIMControl', {})

export const subscribeIMControlState = (token: string): Promise<void> =>
  ipcRenderer.invoke('subscribe-im-control-state', token, {})

export const cancelIMControlState = (token: string): Promise<void> =>
  ipcRenderer.invoke('cancel-im-control-state', token)

export const onIMControlStateData = (
  token: string,
  cb: (state: IMControlState, event: IMControlStateEvent) => void,
) => {
  const channel = `${token}-data`
  const handler = (_e: unknown, event: IMControlStateEvent) => {
    cb(event?.State || { Running: false }, event || {})
  }
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

export const onIMControlStateEnd = (token: string, cb: () => void) => {
  const channel = `${token}-end`
  const handler = () => cb()
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

export const onIMControlStateError = (token: string, cb: (err: unknown) => void) => {
  const channel = `${token}-error`
  const handler = (_e: unknown, err: unknown) => cb(err)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

export const updateIMControlConfig = (
  platform: string,
  config: IMControlConfig,
): Promise<{ Updated: boolean; Message: string }> =>
  ipcRenderer.invoke('UpdateIMControlConfig', {
    Platform: platform,
    ...normalizeIMControlConfig(config),
  })
