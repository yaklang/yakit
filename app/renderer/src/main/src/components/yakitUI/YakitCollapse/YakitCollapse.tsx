import { Collapse } from 'antd'
import type React from 'react'
import styles from './YakitCollapse.module.scss'
import classNames from 'classnames'
import type { YakitCollapseProps, YakitPanelProps } from './YakitCollapseType'
import { ChevronDownSolid, ChevronRightSolid } from '@yakit-libs/yakit-ui-icons/solid'

const { Panel } = Collapse

/**
 * @description: 折叠面板
 * @augments  继承antd的 CollapseProps 默认属性
 */
const YakitCollapse: React.FC<YakitCollapseProps> = (props) => {
  const { expandIcon, bordered, className = '', ...restProps } = props
  return (
    <Collapse
      {...restProps}
      className={classNames(
        styles['yakit-collapse'],
        {
          [styles['yakit-collapse-bordered-hidden']]: bordered === false,
          [styles['yakit-collapse-bordered']]: bordered !== false,
        },
        className,
      )}
      ghost
      expandIcon={
        expandIcon
          ? expandIcon
          : (e) => (e.isActive ? <ChevronDownSolid color="currentColor" /> : <ChevronRightSolid color="currentColor" />)
      }
    />
  )
}

/**
 * @description: 折叠面板
 * @augments  继承antd的CollapsePanelProps 默认属性
 */
const YakitPanel: React.FC<YakitPanelProps> = (props) => {
  const { ...restProps } = props
  return <Panel {...restProps} />
}

export default Object.assign(YakitCollapse, { YakitPanel })
