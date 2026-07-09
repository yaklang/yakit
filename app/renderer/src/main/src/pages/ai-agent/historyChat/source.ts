import type { AISession } from '../type/aiChat'
import type { AISource } from '@/pages/ai-re-act/hooks/grpcApi'

const IM_PLATFORM_NAME: Record<string, string> = {
  feishu: '飞书',
  dingtalk: '钉钉',
}

const IM_CHAT_TYPE_NAME: Record<string, string> = {
  private: '私聊',
  group: '群聊',
  topic: '话题',
}

export type HistorySessionIconSource = 'local' | 'feishu' | 'dingtalk' | 'im'
export type HistorySessionChatKind = 'local' | 'private' | 'group' | 'topic'
export type HistorySourceFilter = 'local' | 'feishu' | 'dingtalk'

export const HISTORY_SOURCE_FILTERS: HistorySourceFilter[] = ['local', 'feishu', 'dingtalk']

export interface HistorySessionIconMeta {
  source: HistorySessionIconSource
  chatKind: HistorySessionChatKind
  label: string
  isIM: boolean
  isGroupLike: boolean
}

const normalizeIMPlatform = (platform?: string): HistorySessionIconSource => {
  switch ((platform || '').trim().toLowerCase()) {
    case 'feishu':
      return 'feishu'
    case 'dingtalk':
      return 'dingtalk'
    default:
      return 'im'
  }
}

const normalizeIMChatKind = (chatType?: string): HistorySessionChatKind => {
  switch ((chatType || '').trim().toLowerCase()) {
    case 'group':
      return 'group'
    case 'topic':
      return 'topic'
    case 'private':
    case '':
      return 'private'
    default:
      return 'private'
  }
}

const isIMSession = (item?: AISession): boolean => item?.Source === 'im'

const isSameIMPlatform = (item: AISession, platform: HistorySourceFilter): boolean => {
  return isIMSession(item) && normalizeIMPlatform(item.IMSourceMeta?.Platform) === platform
}

const normalizeSessionTitle = (title?: string): string => {
  const value = (title || '').trim()
  return value === '<未命名>' ? '' : value
}

const isGenericIMChatTitle = (title?: string): boolean => {
  switch ((title || '').trim()) {
    case '私聊会话':
    case '群聊会话':
    case '话题会话':
    case 'IM 会话':
      return true
    default:
      return false
  }
}

const fallbackIMDisplayTitle = (chatKind: HistorySessionChatKind): string => {
  switch (chatKind) {
    case 'group':
      return '群聊会话'
    case 'topic':
      return '话题会话'
    case 'private':
      return '私聊会话'
    default:
      return 'IM 会话'
  }
}

export const getSessionDisplayTitle = (item?: AISession): string => {
  if (!item) return ''
  if (item.Source !== 'im') {
    return item.Title
  }

  const chatKind = normalizeIMChatKind(item.IMSourceMeta?.ChatType)
  const chatTitle = (item.IMSourceMeta?.ChatTitle || '').trim()
  if ((chatKind === 'group' || chatKind === 'topic') && chatTitle && !isGenericIMChatTitle(chatTitle)) {
    return chatTitle
  }

  return normalizeSessionTitle(item.Title) || fallbackIMDisplayTitle(chatKind)
}

export const getIMSourceBadge = (item?: AISession): string => {
  if (!item || item.Source !== 'im' || !item.IMSourceMeta) return ''
  const platform = IM_PLATFORM_NAME[item.IMSourceMeta.Platform || ''] || item.IMSourceMeta.Platform || 'IM'
  const chatType = IM_CHAT_TYPE_NAME[item.IMSourceMeta.ChatType || ''] || ''
  return chatType ? `${platform}${chatType}` : platform
}

export const getHistorySessionIconMeta = (item?: AISession): HistorySessionIconMeta => {
  if (!item || item.Source !== 'im' || !item.IMSourceMeta) {
    return {
      source: 'local',
      chatKind: 'local',
      label: '本地会话',
      isIM: false,
      isGroupLike: false,
    }
  }

  const source = normalizeIMPlatform(item.IMSourceMeta.Platform)
  const chatKind = normalizeIMChatKind(item.IMSourceMeta.ChatType)
  const platformName =
    IM_PLATFORM_NAME[source] || item.IMSourceMeta.Platform || IM_PLATFORM_NAME[item.IMSourceMeta.Platform || ''] || 'IM'
  const chatTypeName = IM_CHAT_TYPE_NAME[chatKind] || ''

  return {
    source,
    chatKind,
    label: chatTypeName ? `${platformName}${chatTypeName}` : platformName,
    isIM: true,
    isGroupLike: chatKind === 'group' || chatKind === 'topic',
  }
}

export const filterHistorySessionsBySource = (sessions: AISession[], filter: HistorySourceFilter): AISession[] => {
  if (filter === 'local') {
    return sessions.filter((item) => !isIMSession(item))
  }
  return sessions.filter((item) => isSameIMPlatform(item, filter))
}

export const getHistorySourceFilterCounts = (sessions: AISession[]): Record<HistorySourceFilter, number> => {
  return HISTORY_SOURCE_FILTERS.reduce(
    (acc, filter) => {
      acc[filter] = filterHistorySessionsBySource(sessions, filter).length
      return acc
    },
    { local: 0, feishu: 0, dingtalk: 0 } as Record<HistorySourceFilter, number>,
  )
}

export const getHistorySourceQuerySources = (sources: AISource[], filter: HistorySourceFilter): AISource[] => {
  const expectedSources: AISource[] = filter === 'local' ? ['ai', ''] : ['im']
  return expectedSources.filter((source) => sources.includes(source))
}

export const getIMSourceDetailText = (item?: AISession): string => {
  const badge = getIMSourceBadge(item)
  if (!badge || !item) return ''
  const detail = item.IMSourceMeta?.SenderName || item.IMSourceMeta?.ChatTitle || item.SessionID
  return detail ? `${badge} · ${detail}` : badge
}
