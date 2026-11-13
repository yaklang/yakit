import type { FC } from 'react'
import classNames from 'classnames'
import { CheckCheckOutlined, PlusSmOutlined, XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import type { YakitButtonProp } from '@/components/yakitUI/YakitButton/YakitButton'
import styles from './AIResourceSelectionButton.module.scss'

interface AIResourceSelectionButtonProps extends Pick<YakitButtonProp, 'className' | 'onClick'> {
  selected?: boolean
  t: (key: 'YakitButton.add' | 'YakitButton.added' | 'YakitButton.cancel') => string
}

export const AIResourceSelectionButton: FC<AIResourceSelectionButtonProps> = ({
  selected = false,
  t,
  className,
  onClick,
}) => (
  <YakitButton
    type="text"
    className={classNames(styles.button, className)}
    icon={selected ? undefined : <PlusSmOutlined size={16} />}
    aria-label={t(selected ? 'YakitButton.cancel' : 'YakitButton.add')}
    aria-pressed={selected}
    onClick={onClick}
  >
    {selected ? (
      <span className={styles['selected-content']}>
        <span className={styles.added}>
          <CheckCheckOutlined size={16} color="currentColor" />
          {t('YakitButton.added')}
        </span>
        <span className={styles.cancel}>
          <XOutlined size={16} color="currentColor" />
          {t('YakitButton.cancel')}
        </span>
      </span>
    ) : (
      t('YakitButton.add')
    )}
  </YakitButton>
)
