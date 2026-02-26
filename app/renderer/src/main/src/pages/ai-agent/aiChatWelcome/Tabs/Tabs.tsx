import {useMemo, type FC, type ReactNode} from "react"
import {useControllableValue} from "ahooks"
import styles from "./Tabs.module.scss"
import classNames from "classnames"

interface Items {
    label: string
    key: string
    /**
     * 标签页内容
     */
    children?: ReactNode
    /**
     * 额外的操作区域，可以放置按钮等元素
     */
    extra?: ReactNode[]
}

interface TabsProps {
    items: Items[]
    activeKey?: string
    defaultActiveKey?: string
    /**
     * 是否销毁未激活的内容，默认为 false，即不销毁
     */
    destroyInactive?: boolean
    onChange?: (key: string) => void
}

const Tabs: FC<TabsProps> = (props) => {
    const {items, defaultActiveKey, destroyInactive} = props

    const [currentKey, setCurrentKey] = useControllableValue<string>(props, {
        valuePropName: "activeKey",
        defaultValue: defaultActiveKey ?? items[0]?.key
    })
    const handleClick = (key: string) => {
        if (key === currentKey) return
        setCurrentKey(key)
    }

    const activeItem = useMemo(() => items.find((item) => item.key === currentKey), [currentKey, items])

    return (
        <div className={styles.tabs}>
            <div className={styles["tabs-header"]}>
                <div className={styles["tabs-header-items"]}>
                    {items.map((item) => (
                        <div
                            key={item.key}
                            className={classNames(styles.tab, {
                                [styles["tab-active"]]: item.key === currentKey
                            })}
                            onClick={() => handleClick(item.key)}
                        >
                            {item.label}
                        </div>
                    ))}
                </div>

                <div className={styles["tabs-header-extra"]}>
                    {activeItem?.extra?.map((item, index) => (
                        <div key={index} className={styles["tabs-header-extra-item"]}>
                            {item}
                        </div>
                    ))}
                </div>
            </div>
            <div className={styles["tabs-content"]}>
                {destroyInactive
                    ? activeItem?.children
                    : items.map((item) => (
                          <div key={item.key} hidden={item.key !== currentKey}>
                              {item.children}
                          </div>
                      ))}
            </div>
        </div>
    )
}

export default Tabs
