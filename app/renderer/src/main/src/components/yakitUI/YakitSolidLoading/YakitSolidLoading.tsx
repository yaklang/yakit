import type { CSSProperties, ReactNode } from 'react'
import { forwardRef, memo } from 'react'
import classNames from 'classnames'
import { ColorsTaskNodesIcon } from '@/assets/icon/colors'

import styles from './YakitSolidLoading.module.scss'

export interface YakitSolidLoadingProps {
  className?: string
  style?: CSSProperties
  /** 图标尺寸，对应 ant Icon 的 fontSize，默认 16 */
  size?: number | string
  /** 图标下方提示 */
  tip?: ReactNode
  /** 行内排列，默认块级 flex */
  inline?: boolean
  /** 是否旋转动画，默认 true */
  spin?: boolean
  /** 旋转方向：顺时针 / 逆时针，默认顺时针 */
  spinDirection?: 'clockwise' | 'counterclockwise'
  /** 无障碍标签；与 tip 同时存在时作为补充描述 */
  'aria-label'?: string
}

/** @name 主题色实心加载图标（任务节点样式），带旋转动画 */
const YakitSolidLoadingInner = forwardRef<HTMLDivElement, YakitSolidLoadingProps>((props, ref) => {
  const {
    className,
    style,
    size = 16,
    tip,
    inline,
    spin = true,
    spinDirection = 'clockwise',
    'aria-label': ariaLabel,
  } = props

  const iconStyle: CSSProperties = {
    fontSize: typeof size === 'number' ? `${size}px` : size,
  }

  const a11y =
    tip || ariaLabel
      ? ({
          role: 'status',
          'aria-live': 'polite',
          'aria-label': ariaLabel,
        } as const)
      : ({ 'aria-hidden': true } as const)

  return (
    <div
      ref={ref}
      className={classNames(
        styles['yakit-solid-loading'],
        { [styles['yakit-solid-loading--inline']]: inline },
        className,
      )}
      style={style}
      {...a11y}
    >
      <span
        className={classNames(styles['yakit-solid-loading-icon-wrap'], {
          [styles['yakit-solid-loading-icon-wrap--spin']]: spin,
          [styles['yakit-solid-loading-icon-wrap--spin-ccw']]: spin && spinDirection === 'counterclockwise',
        })}
        aria-hidden
      >
        <ColorsTaskNodesIcon style={iconStyle} />
      </span>
      {tip ? <span className={styles['yakit-solid-loading-tip']}>{tip}</span> : null}
    </div>
  )
})

YakitSolidLoadingInner.displayName = 'YakitSolidLoading'

export const YakitSolidLoading = memo(YakitSolidLoadingInner)

export default YakitSolidLoading
