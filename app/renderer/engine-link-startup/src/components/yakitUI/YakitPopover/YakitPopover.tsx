import React from 'react'
import { Popover, type PopoverProps } from 'antd'

import classNames from 'classnames'
import styles from './yakitPopover.module.scss'

export interface YakitPopoverProp extends PopoverProps {}

export const YakitPopover: React.FC<YakitPopoverProp> = React.memo((props) => {
  const {
    children,
    classNames: popoverClassNames,
    overlayClassName,
    overlayStyle,
    styles: popoverStyles,
    visible,
    open,
    onVisibleChange,
    onOpenChange,
    ...resePopover
  } = props

  return (
    <Popover
      {...resePopover}
      open={open ?? visible}
      onOpenChange={(v) => {
        onOpenChange?.(v)
        onVisibleChange?.(v)
      }}
      classNames={{
        ...popoverClassNames,
        root: classNames(styles['yakit-popover-wrapper'], overlayClassName, popoverClassNames?.root),
      }}
      styles={{
        ...popoverStyles,
        root: { ...overlayStyle, ...popoverStyles?.root },
      }}
    >
      {children}
    </Popover>
  )
})
