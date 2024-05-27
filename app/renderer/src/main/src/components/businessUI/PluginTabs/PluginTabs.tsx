import React from "react"
import {Tabs, TabsProps} from "antd"

import classNames from "classnames"
import styles from "./PluginTabs.module.scss"

const {TabPane} = Tabs

interface PluginTabsProps extends Omit<TabsProps, "size" | "type"> {
    /** @deprecated 组件无法设置该属性,默认定值为 default */
    size?: "default"
    /** @deprecated 组件无法设置该属性,默认定值为 card */
    type?: "card"
    wrapperClassName?: string
}

const PluginTabs: React.FC<PluginTabsProps> = (props) => {
    const {children, size = "default", type = "card", wrapperClassName, ...rest} = props

    return (
        <div className={classNames(styles["plugin-tabs"], wrapperClassName)}>
            <Tabs {...rest} type='card'>
                {children}
            </Tabs>
        </div>
    )
}

/** @name 插件功能页面相关 Tabs 组件 */
export default Object.assign(PluginTabs, {TabPane})
