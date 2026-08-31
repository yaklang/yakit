import { Spin } from 'antd'
import type React from 'react'
import type { YakitSpinProps } from './YakitSpinType'
import styles from './YakitSpin.module.scss'
import classNames from 'classnames'

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.增加颜色变量
 */

/**
 * @description YakitSpinProps 的属性
 * @augments YakitSpinProps 继承antd的 SpinProps 默认属性
 */
export const YakitSpin: React.FC<YakitSpinProps> = (props) => {
  const { children, tip, wrapperClassName, ...rest } = props
  const nestedChildren = children ?? <div className={styles['yakit-spin-nest']} />
  return (
    <Spin
      {...rest}
      tip={tip}
      className={classNames(styles['yakit-spin'], wrapperClassName)}
      wrapperClassName={classNames(styles['yakit-spin'], wrapperClassName)}
    >
      {nestedChildren}
    </Spin>
  )
}
