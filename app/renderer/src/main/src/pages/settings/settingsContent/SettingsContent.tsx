import type { ComponentType } from 'react'
import { getSettingsLabel, type SettingsAnchor } from '../constants'
import { AppearanceSettings } from './appearance/AppearanceSettings'
import { GeneralSettings } from './general/GeneralSettings'
import { SystemProxySettings } from './systemProxy/SystemProxySettings'
import { ReverseSettings } from './reverse/ReverseSettings'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './SettingsContent.module.scss'

const SettingsPanels: Partial<Record<SettingsAnchor, ComponentType>> = {
  general: GeneralSettings,
  appearance: AppearanceSettings,
  reverse: ReverseSettings,
  'system-proxy': SystemProxySettings,
}

const hideOuterTitle: Partial<Record<SettingsAnchor, true>> = {
  reverse: true,
  'system-proxy': true,
}

interface SettingsContentProps {
  anchor: string
}

export const SettingsContent: React.FC<SettingsContentProps> = (props) => {
  const { anchor } = props
  const { t } = useI18nNamespaces(['setting'])
  const title = getSettingsLabel(anchor, t)
  const Panel = SettingsPanels[anchor as SettingsAnchor]

  return (
    <div className={styles['settings-content']}>
      <div key={anchor} className={styles['settings-content-body']}>
        {!hideOuterTitle[anchor as SettingsAnchor] && <div className={styles['settings-content-title']}>{title}</div>}
        <div className={styles['settings-content-main']}>
          {Panel ? (
            <Panel />
          ) : (
            <div className={styles['settings-content-placeholder']}>{t('SettingsPage.placeholder', { anchor })}</div>
          )}
        </div>
      </div>
    </div>
  )
}
