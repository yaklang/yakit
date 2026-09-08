import type { ReactNode } from 'react'
import {
  CogOutlined,
  MCPOutlined,
  GlobeAltOutlined,
  KeyOutlined,
  PaperAirplaneOutlined,
  GlobeOutlined,
  FileSlidersOutlined,
  SunOutlined,
  CodepenOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
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
      { key: 'general', icon: <CogOutlined color="currentColor" /> },
      { key: 'appearance', icon: <SunOutlined color="currentColor" /> },
      { key: 'shortcut-key', icon: <KeyOutlined color="currentColor" /> },
    ],
  },
  {
    titleKey: 'system',
    items: [
      { key: 'reverse', icon: <PaperAirplaneOutlined color="currentColor" /> },
      { key: 'system-proxy', icon: <PaperAirplaneOutlined color="currentColor" /> },
      { key: 'global-config', icon: <GlobeAltOutlined color="currentColor" /> },
      { key: 'right-click-plugins', icon: <GlobeOutlined color="currentColor" /> },
    ],
  },
  {
    titleKey: 'ai',
    items: [
      { key: 'ai-config', icon: <FileSlidersOutlined color="currentColor" /> },
      { key: 'ai-model', icon: <CodepenOutlined color="currentColor" /> },
      { key: 'yak-mcp', icon: <MCPOutlined color="currentColor" /> },
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

/** 设置页内小标题定位 id，配合 openPage params.section 使用 */
export const SettingsSections = {
  general: {
    workspace: 'workspace',
    pluginSource: 'plugin-source',
  },
  appearance: {
    theme: 'theme',
    mode: 'mode',
    language: 'language',
  },
  reverse: {
    localReverseIp: 'local-reverse-ip',
    publicReverse: 'public-reverse',
    dnslog: 'dnslog',
  },
  'system-proxy': {
    systemProxy: 'system-proxy',
  },
  'global-config': {
    dns: 'dns',
    tls: 'tls',
    thirdParty: 'third-party',
    customCode: 'custom-code',
    other: 'other',
    aiModel: 'ai-model-config',
    synScan: 'syn-scan',
    privacy: 'privacy',
  },
  'ai-config': {
    permissions: 'permissions',
    planning: 'planning',
    automation: 'automation',
    resources: 'resources',
  },
  'yak-mcp': {
    toolConfig: 'tool-config',
  },
  /** 快捷键页内 section 使用 ShortcutKeyPageName（如 global、yak-editor） */
} as const
