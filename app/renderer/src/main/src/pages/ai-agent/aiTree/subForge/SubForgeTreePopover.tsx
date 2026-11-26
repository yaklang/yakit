import { memo, type FC, type ReactNode } from 'react'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import styles from './SubForgeTreePopover.module.scss'

interface SubForgeTreePopoverProps {
  title: string
  tree: ReactNode
  children: ReactNode
}

export const SubForgeTreePopover: FC<SubForgeTreePopoverProps> = memo(({ title, tree, children }) => {
  return (
    <YakitPopover
      trigger="click"
      placement="leftTop"
      arrow={false}
      destroyOnHidden
      classNames={{ root: styles['sub-forge-popover'] }}
      styles={{ root: { width: 400, maxWidth: 'min(480px, 90vw)' } }}
      content={
        <div className={styles['sub-forge-content']}>
          {!!title && <div className={styles['sub-forge-title']}>{title}</div>}
          {tree}
        </div>
      }
    >
      {children}
    </YakitPopover>
  )
})
