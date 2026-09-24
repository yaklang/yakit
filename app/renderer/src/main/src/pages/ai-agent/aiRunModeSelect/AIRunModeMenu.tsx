import type React from 'react'
import { memo } from 'react'
import { CheckSolid } from '@yakit-libs/yakit-ui-icons/solid'
import classNames from 'classnames'
import { MODE_LABEL_KEY, ModeOptionList } from './aiRunModeConstants'
import { useAIRunMode } from './useAIRunMode'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './AIRunModeSelect.module.scss'

export type AIRunModeMenuProps = {
  /** 嵌入输入框弹层时铺满容器宽度 */
  fullWidth?: boolean
}

/** Plan / Multi-Agent / Goal 菜单体：按钮下拉与输入框 / 弹层复用 */
export const AIRunModeMenu: React.FC<AIRunModeMenuProps> = memo((props) => {
  const { fullWidth } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  const { isModeSelected, onToggleMode } = useAIRunMode()

  return (
    <div
      className={classNames(styles['mode-menu'], {
        [styles['mode-menu-panel']]: fullWidth,
      })}
    >
      <div className={styles['mode-list']}>
        {ModeOptionList.map((item) => {
          const Icon = item.icon
          const checked = isModeSelected(item.key)
          const labelKey = MODE_LABEL_KEY[item.key]
          return (
            <div key={item.key} className={styles['mode-option']} onClick={() => onToggleMode(item.key)}>
              <div className={styles['mode-option-left']}>
                <div className={styles['mode-option-icon']}>
                  <Icon color="currentColor" />
                </div>
                <span className={styles['mode-option-label']}>{t(labelKey)}</span>
              </div>
              {checked ? (
                <CheckSolid className={styles['mode-option-check']} color="currentColor" />
              ) : (
                <span className={styles['mode-option-check-placeholder']} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})
