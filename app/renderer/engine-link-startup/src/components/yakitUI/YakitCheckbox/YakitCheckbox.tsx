import { Checkbox } from 'antd'
import type React from 'react'
import type { YakitCheckboxProps } from './YakitCheckboxType'
import styles from './YakitCheckbox.module.scss'
import classNames from 'classnames'
import './yakitCheckBoxAnimation.scss'

/**
 * React 19 兼容：
 * - 外层 span 只做样式宿主，禁止写死 16x16（会裁切/压缩 label 点击区，导致勾选失效）
 * - 视觉尺寸只约束 .ant-checkbox-inner；input 保持可点
 * - 调用方不要再包一层 <label>（antd Checkbox 本身已是 label，嵌套会导致点击失效）
 */
export const YakitCheckbox: React.FC<YakitCheckboxProps> = (props) => {
  const { wrapperClassName, className, children, ...restProps } = props
  return (
    <span
      className={classNames(
        styles['yakit-checkbox-wrapper'],
        children ? styles['yakit-checkbox-children-wrapper'] : undefined,
        wrapperClassName,
      )}
    >
      <Checkbox {...restProps} className={classNames(styles['yakit-checkbox'], className)}>
        {children}
      </Checkbox>
    </span>
  )
}
