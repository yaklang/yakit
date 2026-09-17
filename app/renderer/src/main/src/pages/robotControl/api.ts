import { ipc } from '@/services/ipc'
export {
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

export const listIMBots = () => ipc.invoke('grpc', 'ListIMBots', {})

export const saveIMBot = (bot: IMBotConfigLike, options?: { ClearOwnerId?: boolean }) =>
  ipc.invoke('grpc', 'SaveIMBot', { Bot: bot, ...options })

export const deleteIMBot = (platform: string) => ipc.invoke('grpc', 'DeleteIMBot', { Platform: platform })
