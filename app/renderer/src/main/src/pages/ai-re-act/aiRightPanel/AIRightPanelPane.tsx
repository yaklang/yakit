import type React from 'react'
import { XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './AIRightPanelPane.module.scss'

export interface AIRightPanelPaneProps {
  title: React.ReactNode
  actions?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}

export const AIRightPanelPane: React.FC<AIRightPanelPaneProps> = ({ title, actions, onClose, children }) => {
  const { t } = useI18nNamespaces(['yakitUi'])

  return (
    <section className={styles['pane']}>
      <header className={styles['header']}>
        <div className={styles['title']}>{title}</div>
        <div className={styles['actions']}>
          {actions === undefined ? (
            <YakitButton type="text2" aria-label={t('YakitButton.close')} icon={<XOutlined />} onClick={onClose} />
          ) : (
            actions
          )}
        </div>
      </header>
      <div className={styles['body']}>{children}</div>
    </section>
  )
}
