import React from "react"
import {YakitSideTabProps, YakitTabsItemProps} from "./YakitSideTabType"
import classNames from "classnames"
import {useControllableValue, useMemoizedFn} from "ahooks"
import styles from "./YakitSideTab.module.scss"

export const YakitSideTab: React.FC<YakitSideTabProps> = React.memo((props) => {
    const {
        yakitTabs,
        cacheKey,
        activeKey,
        onActiveKey,
        setYakitTabs,
        type = "vertical",
        children,
        onTabPaneRender
    } = props
    const [show, setShow] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "show",
        trigger: "setShow"
    })
    const onChange = useMemoizedFn((item) => {
        if (item.value === activeKey) {
            setShow((v) => !v)
            setYakitTabs &&
                setYakitTabs(
                    yakitTabs.map((ele) => {
                        if (ele.value === item.value) {
                            return {
                                ...ele,
                                show: !ele.show
                            }
                        }
                        return ele
                    })
                )
        }
        onActiveKey(item.value)
    })
    const renderContent = useMemoizedFn(() => {
        switch (type) {
            case "vertical":
                return (
                    <div className={styles["yakit-side-tab"]}>
                        {yakitTabs.map((item) => (
                            <YakitTabsItem
                                key={item.value}
                                item={item}
                                onChange={onChange}
                                className={classNames(styles["yakit-side-tab-item"], {
                                    [styles["yakit-side-tab-item-active"]]: item.value === activeKey,
                                    [styles["yakit-side-tab-item-show"]]:
                                        item.value === activeKey && (item.show === false || !show)
                                })}
                                onTabPaneRender={onTabPaneRender}
                            />
                        ))}
                    </div>
                )

            case "horizontal":
                return (
                    <div className={styles["yakit-side-tab-horizontal"]}>
                        {yakitTabs.map((item) => (
                            <YakitTabsItem
                                key={item.value}
                                item={item}
                                onChange={onChange}
                                className={classNames(styles["yakit-side-tab-horizontal-item"], {
                                    [styles["yakit-side-tab-horizontal-item-active"]]: item.value === activeKey
                                })}
                                onTabPaneRender={onTabPaneRender}
                            />
                        ))}
                    </div>
                )
            default:
                return <div>未知type</div>
        }
    })
    return (
        <div className={styles['tab-wrap']}>
            {renderContent()}
            {children}
        </div>
    )
})

const YakitTabsItem: React.FC<YakitTabsItemProps> = React.memo((props) => {
    const {item, onChange, className = "", onTabPaneRender} = props
    return (
        <div key={item.value} className={className} onClick={() => onChange(item)}>
            {onTabPaneRender ? (
                onTabPaneRender(item)
            ) : (
                <>
                    <span className={styles["item-text"]}>{item.label}</span>
                    {item.icon}
                </>
            )}
        </div>
    )
})
