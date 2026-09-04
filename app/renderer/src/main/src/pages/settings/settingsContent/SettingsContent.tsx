import { getSettingsLabel } from '../constants'
import { AppearanceSettings } from './appearance/AppearanceSettings'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './SettingsContent.module.scss'

interface SettingsContentProps {
  anchor: string
}

export const SettingsContent: React.FC<SettingsContentProps> = (props) => {
  const { anchor } = props
  const { t } = useI18nNamespaces(['setting'])
  const title = getSettingsLabel(anchor, t)

  return (
    <div className={styles['settings-content']}>
      <div key={anchor} className={styles['settings-content-body']}>
        <div className={styles['settings-content-title']}>{title}</div>
        <div className={styles['settings-content-main']}>
          {anchor === 'appearance' ? (
            <AppearanceSettings />
          ) : (
            <div className={styles['settings-content-placeholder']}>{t('SettingsPage.placeholder', { anchor })}</div>
          )}
        </div>
      </div>
    </div>
  )
}
