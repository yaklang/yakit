import React, {ReactNode} from "react"
import {YakitSideTabProps, YakitTabsItemProps} from "./YakitSideTabType"
import classNames from "classnames"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
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
        onTabPaneRender,
        className = ""
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
                    <>
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
                                    rotate={"left"}
                                />
                            ))}
                        </div>
                        {children}
                    </>
                )

            case "vertical-right":
                return (
                    <>
                        {children}
                        <div className={styles["yakit-side-tab"]}>
                            {yakitTabs.map((item) => (
                                <YakitTabsItem
                                    key={item.value}
                                    item={item}
                                    onChange={onChange}
                                    className={classNames(styles["yakit-side-tab-item"], {
                                        [styles["yakit-side-tab-item-active"]]: item.value === activeKey
                                    })}
                                    onTabPaneRender={onTabPaneRender}
                                    rotate={"right"}
                                />
                            ))}
                        </div>
                    </>
                )
            case "horizontal":
                return (
                    <>
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
                        {children}
                    </>
                )
            default:
                return <div>未知type</div>
        }
    })
    return (
        <div
            className={classNames(
                styles["tab-wrap"],
                {
                    [styles["tab-wrap-vertical"]]: type === "vertical",
                    [styles["tab-wrap-vertical-right"]]: type === "vertical-right"
                },
                className
            )}
        >
            {renderContent()}
        </div>
    )
})

const YakitTabsItem: React.FC<YakitTabsItemProps> = React.memo((props) => {
    const {item, onChange, className = "", onTabPaneRender, rotate} = props
    const node: ReactNode[] = useCreation(() => {
        return [
            <span
                key={item.value}
                className={classNames({
                    [styles["item-text-left"]]: rotate === "left",
                    [styles["item-text-right"]]: rotate === "right"
                })}
            >
                {item.label}
            </span>,
            item.icon
        ]
    }, [item.label, item.icon, rotate])
    const [label, icon] = node
    return (
        <div key={item.value} className={className} onClick={() => onChange(item)}>
            {onTabPaneRender ? (
                onTabPaneRender(item, node)
            ) : (
                <>
                    {icon}
                    {label}
                </>
            )}
        </div>
    )
})
