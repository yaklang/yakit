import React, { forwardRef } from 'react'
import classNames from 'classnames'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import styles from './TextDropdownTrigger.module.scss'

export interface TextDropdownTriggerProps {
  /** 触发器展示文案（可已截断） */
  label: string
  /** 原生 title，默认用 label */
  title?: string
  /** 下拉是否展开（展开时箭头旋转） */
  open?: boolean
  disabled?: boolean
  className?: string
  'aria-label'?: string
  'data-testid'?: string
}

/** 轻量文字下拉触发器：任务详情切任务 / 文件搜索范围等共用 */
export const TextDropdownTrigger = forwardRef<HTMLDivElement, TextDropdownTriggerProps>((props, ref) => {
  const { label, title, open = false, disabled = false, className, ...rest } = props
  return (
    <div
      ref={ref}
      className={classNames(
        styles['text-dropdown-trigger'],
        {
          [styles['text-dropdown-trigger-open']]: open,
          [styles['text-dropdown-trigger-disabled']]: disabled,
        },
        className,
      )}
      title={title ?? label}
      {...rest}
    >
      <span className={styles['text-dropdown-trigger-label']}>{label}</span>
      <ChevronDownOutlined className={styles['text-dropdown-trigger-icon']} color="currentColor" size={14} />
    </div>
  )
})

TextDropdownTrigger.displayName = 'TextDropdownTrigger'
