import { type ComponentType, useEffect, useRef } from 'react'
import { getSettingsLabel, type SettingsAnchor } from '../constants'
import { AppearanceSettings } from './appearance/AppearanceSettings'
import { GeneralSettings } from './general/GeneralSettings'
import { SystemProxySettings } from './systemProxy/SystemProxySettings'
import { ReverseSettings } from './reverse/ReverseSettings'
import { ShortcutKeySettings } from './shortcutKey/ShortcutKeySettings'
import { GlobalConfigSettings } from './globalConfig/GlobalConfigSettings'
import { AIModelSettings } from './aiModel/AIModelSettings'
import { AIConfigSettings } from './aiConfig/AIConfigSettings'
import { YakMcpSettings } from './yakMcp/YakMcpSettings'
import { RightClickPluginsSettings } from './rightClickPlugins/RightClickPluginsSettings'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './SettingsContent.module.scss'

interface SettingsPanelProps {
  section?: string
  sectionTick?: number
}

const SettingsPanels: Record<SettingsAnchor, ComponentType<SettingsPanelProps>> = {
  general: GeneralSettings,
  appearance: AppearanceSettings,
  reverse: ReverseSettings,
  'shortcut-key': ShortcutKeySettings,
  'system-proxy': SystemProxySettings,
  'global-config': GlobalConfigSettings,
  'ai-config': AIConfigSettings,
  'ai-model': AIModelSettings,
  'yak-mcp': YakMcpSettings,
  'right-click-plugins': RightClickPluginsSettings,
}

const hideOuterTitle: Partial<Record<SettingsAnchor, true>> = {
  reverse: true,
  'shortcut-key': true,
  'system-proxy': true,
  'global-config': true,
  'ai-config': true,
  'ai-model': true,
  'yak-mcp': true,
  'right-click-plugins': true,
}

interface SettingsContentProps {
  anchor: string
  section?: string
  sectionTick?: number
}

export const SettingsContent: React.FC<SettingsContentProps> = (props) => {
  const { anchor, section, sectionTick } = props
  const { t } = useI18nNamespaces(['setting'])
  const title = getSettingsLabel(anchor, t)
  const Panel = SettingsPanels[anchor as SettingsAnchor]
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!section) return
    const timer = window.setTimeout(() => {
      const scroller = scrollerRef.current
      if (!scroller) return
      const el = scroller.querySelector(`[data-settings-section="${section}"]`) as HTMLElement | null
      el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [anchor, section, sectionTick])

  return (
    <div ref={scrollerRef} className={styles['settings-content']}>
      <div key={anchor} className={styles['settings-content-body']}>
        {!hideOuterTitle[anchor as SettingsAnchor] && <div className={styles['settings-content-title']}>{title}</div>}
        <div className={styles['settings-content-main']}>
          {Panel && <Panel section={section} sectionTick={sectionTick} />}
        </div>
      </div>
    </div>
  )
}
