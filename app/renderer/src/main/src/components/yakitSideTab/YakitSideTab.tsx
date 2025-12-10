import React, {ReactNode, useImperativeHandle} from "react"
import {YakitSideTabProps, YakitSideTabRefProps, YakitTabsItemProps} from "./YakitSideTabType"
import classNames from "classnames"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import styles from "./YakitSideTab.module.scss"

export const YakitSideTab = React.memo(
    React.forwardRef<YakitSideTabRefProps, YakitSideTabProps>((props, ref) => {
        const {
            yakitTabs,
            cacheKey,
            activeKey,
            onActiveKey,
            setYakitTabs,
            type = "vertical",
            children,
            onTabPaneRender,
            className = "",
            btnItemClassName = ""
        } = props
        const [show, setShow] = useControllableValue<boolean>(props, {
            defaultValue: true,
            valuePropName: "show",
            trigger: "setShow"
        })
        useImperativeHandle(
            ref,
            () => ({
                onActiveKeyToSelect
            }),
            []
        )
        const onActiveKeyToSelect = useMemoizedFn((key: string, show: boolean) => {
            setYakitTabs?.(
                yakitTabs.map((ele) => {
                    if (ele.value === key) {
                        return {
                            ...ele,
                            show: show
                        }
                    } else {
                        return {
                            ...ele,
                            show: false
                        }
                    }
                })
            )
            onActiveKey(key)
        })
        const onChange = useMemoizedFn((item) => {
            if (type === "vertical") {
                if (props.show !== undefined) {
                    setShow((v) => !v)
                } else {
                    setYakitTabs?.(
                        yakitTabs.map((ele) => {
                            if (ele.value === item.value) {
                                return {
                                    ...ele,
                                    show: !ele.show
                                }
                            } else {
                                return {
                                    ...ele,
                                    show: false
                                }
                            }
                        })
                    )
                }
            } else {
                if (item.value === activeKey) {
                    setYakitTabs?.(
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
                                        className={classNames(styles["yakit-side-tab-item"], btnItemClassName, {
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
                                        className={classNames(
                                            styles["yakit-side-tab-horizontal-item"],
                                            btnItemClassName,
                                            {
                                                [styles["yakit-side-tab-horizontal-item-active"]]:
                                                    item.value === activeKey
                                            }
                                        )}
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
)

const YakitTabsItem: React.FC<YakitTabsItemProps> = React.memo((props) => {
    const {item, onChange, className = "", onTabPaneRender, rotate} = props

    const renderLabel = useCreation(() => {
        if (typeof item.label === "function") {
            return item.label()
        }
        return item.label
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
