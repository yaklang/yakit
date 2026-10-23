import type { FC, ReactNode } from 'react'
import classNames from 'classnames'
import styles from './SlidePanels.module.scss'

export interface SlidePanelsProps {
  /** 是否滑到第二屏 */
  showSecond?: boolean
  first: ReactNode
  second: ReactNode
  className?: string
  'data-testid'?: string
}

/** 双屏左右滑动：200% 轨 + translateX(-50%)，隐藏屏 aria-hidden 禁点击 */
export const SlidePanels: FC<SlidePanelsProps> = ({
  showSecond = false,
  first,
  second,
  className,
  'data-testid': dataTestId,
}) => (
  <div className={classNames(styles['root'], className)}>
    <div
      className={classNames(styles['track'], { [styles['track-second']]: showSecond })}
      data-testid={dataTestId}
      data-show-second={showSecond ? 'true' : 'false'}
    >
      <div className={styles['panel']} aria-hidden={showSecond}>
        {first}
      </div>
      <div className={styles['panel']} aria-hidden={!showSecond}>
        {second}
      </div>
    </div>
  </div>
)
