import type { ButtonHTMLAttributes, FC } from 'react'
import { memo } from 'react'
import classNames from 'classnames'
import styles from './TransparentButton.module.scss'

/** 无主题样式的原生按钮，保留键盘聚焦与激活，外观由调用方 className 决定 */
export const TransparentButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = memo(
  ({ className, type = 'button', ...props }) => (
    <button type={type} className={classNames(className, styles['transparent-button'])} {...props} />
  ),
)
