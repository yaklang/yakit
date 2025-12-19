import React, {ReactNode, useState} from "react"
import {YakitSideTabProps, YakitTabsItemProps} from "./YakitSideTabType"
import classNames from "classnames"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {Tooltip} from "antd"
import styles from "./YakitSideTab.module.scss"

export const YakitSideTab: React.FC<YakitSideTabProps> = React.memo((props, ref) => {
    const {
        yakitTabs,
        cacheKey,
        activeKey,
        onActiveKey,
        setYakitTabs,
        activeShow = false,
        barHint,
        type = "vertical",
        children,
        onTabPaneRender,
        className = "",
        btnItemClassName = "",
        t
    } = props
    const [show, setShow] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "show",
        trigger: "setShow"
    })
    const onChange = useMemoizedFn((item) => {
        if (!activeShow) {
            if (item.value === activeKey) {
                setShow((v) => !v)
            } else {
                setShow(true)
            }
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
                                    className={classNames(styles["yakit-side-tab-item"], btnItemClassName, {
                                        [styles["yakit-side-tab-item-active"]]: item.value === activeKey,
                                        [styles["yakit-side-tab-item-active-noHover"]]:
                                            item.value === activeKey && activeShow,
                                        [styles["yakit-side-tab-item-show"]]: item.value === activeKey && !show && !activeShow
                                    })}
                                    onTabPaneRender={onTabPaneRender}
                                    rotate={"left"}
                                    barHint={barHint}
                                    t={t}
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
                                    className={classNames(styles["yakit-side-tab-item"], btnItemClassName, {
                                        [styles["yakit-side-tab-item-active"]]: item.value === activeKey
                                    })}
                                    onTabPaneRender={onTabPaneRender}
                                    rotate={"right"}
                                    barHint={barHint}
                                    t={t}
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
                                    className={classNames(styles["yakit-side-tab-horizontal-item"], btnItemClassName, {
                                        [styles["yakit-side-tab-horizontal-item-active"]]: item.value === activeKey
                                    })}
                                    onTabPaneRender={onTabPaneRender}
                                    barHint={barHint}
                                    t={t}
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
    const {item, onChange, className = "", onTabPaneRender, rotate, barHint, t} = props
    const [hover, setHover] = useState(false)

    const renderLabel = useCreation(() => {
        if (typeof item.label === "string") {
            return t?.(item.label) || item.label
        } else if (typeof item.label === "function") {
            return item.label()
        } else {
            return item.label
        }
    }, [item.label])

    const node: ReactNode[] = useCreation(() => {
        return [
            <span
                key={item.value}
                className={classNames({
                    [styles["item-text-left"]]: rotate === "left",
                    [styles["item-text-right"]]: rotate === "right"
                })}
            >
                {renderLabel}
            </span>,
            item.icon
        ]
    }, [renderLabel, item.icon, rotate])
    const [label, icon] = node

    const tabDom = useMemoizedFn(() => {
        return (
            <div
                key={item.value}
                className={className}
                onClick={() => onChange(item)}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            >
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

    const hint = barHint?.(item.value)

    return (
        <>
            {hint ? (
                <Tooltip key={`${item.value}`} title={hint} placement='right' destroyTooltipOnHide visible={hover}>
                    {tabDom()}
                </Tooltip>
            ) : (
                <>{tabDom()}</>
            )}
        </>
    )
})
