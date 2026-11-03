import cloneDeep from 'lodash/cloneDeep'
import omit from 'lodash/omit'
import type { AIAgentSetting } from '../aiAgentType'
import { AIAgentSettingDefault } from '../defaultConstant'

// 保留当前产品的模式缓存行为，本批仅同步官方废弃字段清理与新阈值默认值。
const deprecatedKeys = ['AIService', 'AIModelName', 'TimelineContentSizeLimit'] as const

export const stripAIAgentChatSettingForPersist = (setting: Partial<AIAgentSetting>): Partial<AIAgentSetting> =>
  omit(setting, deprecatedKeys)

export const mergeAIAgentChatSettingCache = (cache: Partial<AIAgentSetting>): AIAgentSetting => ({
  ...cloneDeep(AIAgentSettingDefault),
  ...stripAIAgentChatSettingForPersist(cache),
})
