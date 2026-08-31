import type React from 'react'
import { Tabs, type TabsProps } from 'antd'

import classNames from 'classnames'
import styles from './PluginTabs.module.scss'
import { childrenToTabItems, CompatTabPane } from '@/utils/antdCompat'

interface PluginTabsProps extends Omit<TabsProps, 'size' | 'type'> {
  /** @deprecated 组件无法设置该属性,默认定值为 default */
  size?: 'default'
  type?: 'card' | 'line'
  wrapperClassName?: string
}

const PluginTabsInner: React.FC<PluginTabsProps> = (props) => {
  const { children, items, size = 'default', type = 'card', wrapperClassName = '', ...rest } = props
  return (
    <div
      className={classNames(
        {
          [styles['plugin-tabs']]: type === 'card',
          [styles['plugin-tabs-line']]: type === 'line', // 目前只适用于type为card下的二级tab情况，其他情况未测试
        },
        wrapperClassName,
      )}
    >
      <Tabs {...rest} type="card" items={items ?? childrenToTabItems(children)} />
    </div>
  )
}

type PluginTabsType = React.FC<PluginTabsProps> & { TabPane: typeof CompatTabPane }

/** @name 插件功能页面相关 Tabs 组件 */
const PluginTabs = PluginTabsInner as PluginTabsType
PluginTabs.TabPane = CompatTabPane

export default PluginTabs
