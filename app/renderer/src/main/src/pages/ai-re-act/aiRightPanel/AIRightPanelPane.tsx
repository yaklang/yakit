import type React from 'react'
import classNames from 'classnames'
import { XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './AIRightPanelPane.module.scss'

export interface AIRightPanelPaneProps {
  title: React.ReactNode
  actions?: React.ReactNode
  /** 内容组件自带头部时，使用其头部承载操作按钮。 */
  hideHeader?: boolean
  /** 内容组件自带内边距时（如会话历史），面板自身不再加 padding。 */
  noPadding?: boolean
  onClose: () => void
  children: React.ReactNode
}

export const AIRightPanelPane: React.FC<AIRightPanelPaneProps> = ({
  title,
  actions,
  hideHeader,
  noPadding,
  onClose,
  children,
}) => {
  const { t } = useI18nNamespaces(['yakitUi'])

  return (
    <section className={classNames(styles['pane'], noPadding && styles['pane-no-padding'])}>
      {!hideHeader && (
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
      )}
      <div className={styles['body']}>{children}</div>
    </section>
  )
}
