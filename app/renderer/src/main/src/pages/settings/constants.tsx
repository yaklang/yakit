import type { ReactNode } from 'react'
import {
  OutlineCogIcon,
  OutlineMCPIcon,
  OutlineGlobealtIcon,
  OutlineKeyIcon,
  OutlinePaperairplaneIcon,
  OutlineGlobeIcon,
  OutlineFileSlidersIcon,
  OutlineSunIcon,
  OutlineCodepenIcon,
} from '@/assets/icon/outline'
import type { TFunction } from '@/i18n/useI18nNamespaces'

export type SettingsAnchor =
  | 'general'
  | 'appearance'
  | 'shortcut-key'
  | 'reverse'
  | 'system-proxy'
  | 'global-config'
  | 'right-click-plugins'
  | 'ai-config'
  | 'ai-model'
  | 'yak-mcp'

export type SettingsGroupKey = 'preference' | 'system' | 'ai'

export interface SettingsMenuItem {
  key: SettingsAnchor
  icon: ReactNode
}

export interface SettingsMenuGroup {
  titleKey: SettingsGroupKey
  items: SettingsMenuItem[]
}

export const SettingsMenu: SettingsMenuGroup[] = [
  {
    titleKey: 'preference',
    items: [
      { key: 'general', icon: <OutlineCogIcon /> },
      { key: 'appearance', icon: <OutlineSunIcon /> },
      { key: 'shortcut-key', icon: <OutlineKeyIcon /> },
    ],
  },
  {
    titleKey: 'system',
    items: [
      { key: 'reverse', icon: <OutlinePaperairplaneIcon /> },
      { key: 'system-proxy', icon: <OutlinePaperairplaneIcon /> },
      { key: 'global-config', icon: <OutlineGlobealtIcon /> },
      { key: 'right-click-plugins', icon: <OutlineGlobeIcon /> },
    ],
  },
  {
    titleKey: 'ai',
    items: [
      { key: 'ai-config', icon: <OutlineFileSlidersIcon /> },
      { key: 'ai-model', icon: <OutlineCodepenIcon /> },
      { key: 'yak-mcp', icon: <OutlineMCPIcon /> },
    ],
  },
]

export const getSettingsGroupLabel = (titleKey: SettingsGroupKey, t: TFunction) => {
  return t(`SettingsPage.group.${titleKey}`)
}

export const getSettingsLabel = (anchor: string, t: TFunction) => {
  const key = `SettingsPage.item.${anchor}`
  const label = t(key)
  return label === key ? anchor : label
}
