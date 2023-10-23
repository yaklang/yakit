import React from "react"
import {Tabs, TabsProps} from "antd"
import classNames from "classnames"
import styles from "./YakitTabs.module.scss"

const {TabPane} = Tabs

/**
 * 暂时用在插件商店 其他页面误用
 */

interface YakitTabsProps extends TabsProps {}

const YakitTabs: React.FC<YakitTabsProps> = (props) => {
    const {tabPosition = "top", className = "", type = "line", tabBarGutter, ...restProps} = props

    return (
        <div className={styles.yakitTabs}>
            <Tabs
                {...restProps}
                className={classNames(className, {
                    "yakit-tabs-card": type === "card",
                    [`yakit-tabs-card-${tabPosition}`]: type === "card"
                })}
                tabPosition={tabPosition}
                tabBarGutter={tabBarGutter !== undefined ? tabBarGutter : type === "card" ? 5 : 32}
            />
        </div>
    )
}

export default Object.assign(YakitTabs, {YakitTabPane: TabPane})
