import { Collapse } from 'antd'
import type React from 'react'
import styles from './YakitCollapse.module.scss'
import classNames from 'classnames'
import type { YakitCollapseProps, YakitPanelProps } from './YakitCollapseType'
import { SolidChevrondownIcon, SolidChevronrightIcon } from '@/assets/icon/solid'
import { childrenToCollapseItems } from '@/utils/antdCompat'

const { Panel } = Collapse

/**
 * @description: 折叠面板
 * @augments 继承 antd CollapseProps，antd 5 的 onChange 固定为 string[]
 */
const YakitCollapse: React.FC<YakitCollapseProps> = (props) => {
  const {
    expandIcon,
    bordered,
    className = '',
    destroyInactivePanel,
    destroyOnHidden,
    items,
    children,
    ...restProps
  } = props
  const convertedItems = items ?? childrenToCollapseItems(children)
  return (
    <Collapse
      {...restProps}
      {...(convertedItems == null ? { children } : {})}
      className={classNames(
        styles['yakit-collapse'],
        {
          [styles['yakit-collapse-bordered-hidden']]: bordered === false,
          [styles['yakit-collapse-bordered']]: bordered !== false,
        },
        className,
      )}
      ghost
      items={convertedItems}
      destroyOnHidden={destroyOnHidden ?? destroyInactivePanel}
      expandIcon={expandIcon ? expandIcon : (e) => (e.isActive ? <SolidChevrondownIcon /> : <SolidChevronrightIcon />)}
    />
  )
}

/**
 * @description: 折叠面板项，继续走 antd Panel children，以便包装组件（如 MatchersPanel）内部的 header/extra 生效
 */
const YakitPanel: React.FC<YakitPanelProps> = (props) => {
  const { disabled, collapsible, ...restProps } = props
  return <Panel {...restProps} collapsible={collapsible ?? (disabled ? 'disabled' : undefined)} />
}

export default Object.assign(YakitCollapse, { YakitPanel })
