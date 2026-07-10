const { ipcRenderer } = window.require('electron')
export {
  cancelIMControlState,
  onIMControlStateData,
  onIMControlStateEnd,
  onIMControlStateError,
  subscribeIMControlState,
  updateIMControlConfig,
  startIMControl,
  stopIMControl,
  DEFAULT_IM_CONTROL_CONFIG,
  buildIMControlPlatformConfigs,
  normalizeIMControlConfig,
  normalizeIMControlConfigMap,
  type IMControlConfig,
  type IMControlConfigMap,
  type IMGroupTrigger,
  type IMReplyGranularity,
  type IMReviewPolicy,
  type IMControlPlatformLevel,
  type IMControlPlatformState,
  type IMControlSessionInfo,
  type IMControlState,
  type IMControlStateEvent,
} from '@/utils/imControl'

export type IMPlatform = 'feishu' | 'dingtalk'

export interface IMBotConfigLike {
  Platform: string
  AppId: string
  AppSecret: string
  RobotSecret: string
  BaseUrl: string
  Enabled: boolean
  OwnerId?: string
  AllowedUsers?: string[]
  AllowedChats?: string[]
  GroupAccessControl?: boolean
}

export interface IMOnboardingEvent {
  State: 'qr' | 'pending' | 'success' | 'expired' | 'error' | string
  QrUrl?: string
  Message?: string
  Bot?: IMBotConfigLike
  QrImageBase64?: string
}

export const listIMBots = (): Promise<{ Bots?: IMBotConfigLike[] }> => ipcRenderer.invoke('ListIMBots', {})

export const saveIMBot = (
  bot: IMBotConfigLike,
  options?: {
    ClearOwnerId?: boolean
  },
): Promise<{ Bot?: IMBotConfigLike }> => ipcRenderer.invoke('SaveIMBot', { Bot: bot, ...(options || {}) })

export const deleteIMBot = (platform: string): Promise<void> =>
  ipcRenderer.invoke('DeleteIMBot', { Platform: platform })

export const startIMOnboarding = (token: string, platform: IMPlatform): Promise<void> =>
  ipcRenderer.invoke('start-im-onboarding', token, { Platform: platform })

export const cancelIMOnboarding = (token: string): Promise<void> => ipcRenderer.invoke('cancel-im-onboarding', token)

export const onIMOnboardingData = (token: string, cb: (ev: IMOnboardingEvent) => void) => {
  const channel = `${token}-data`
  const handler = (_e: unknown, ev: IMOnboardingEvent) => cb(ev)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

export const onIMOnboardingEnd = (token: string, cb: () => void) => {
  const channel = `${token}-end`
  const handler = () => cb()
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

export const onIMOnboardingError = (token: string, cb: (err: unknown) => void) => {
  const channel = `${token}-error`
  const handler = (_e: unknown, err: unknown) => cb(err)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}
