import React, {useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {AIAgentTabList} from "./defaultConstant"
import {AIAgentSideListProps, AIAgentTab} from "./aiAgentType"
import {ServerSetting} from "./ServerSetting"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

export const AIAgentSideList: React.FC<AIAgentSideListProps> = (props) => {
    const {} = props

    // 控制各个列表的初始渲染变量，存在列表对应类型，则代表列表UI已经被渲染
    const rendered = useRef<Set<string>>(new Set(["mcp"]))
    const [active, setActive] = React.useState<AIAgentTab>("mcp")
    const [hiddenActive, setHiddenActive] = useState(false)
    const handleSetActive = useMemoizedFn((value: AIAgentTab) => {
        setActive(value)
        if (!rendered.current.has(value)) {
            rendered.current.add(value)
        }
    })

    return (
        <div className={styles["ai-agent-side-list"]}>
            <div className={styles["side-list-bar"]}>
                {AIAgentTabList.map((item) => {
                    const isActive = item.key === active
                    return (
                        <div
                            key={item.key}
                            className={classNames(styles["side-bar-list-item"], {
                                [styles["side-bar-list-item-active"]]: isActive
                            })}
                            onClick={() => handleSetActive(item.key)}
                        >
                            {item.title}
                        </div>
                    )
                })}
            </div>

            <div className={styles["side-list-body"]}>
                <div
                    className={classNames(styles["active-content"], {
                        [styles["hidden-content"]]: active !== "mcp"
                    })}
                    tabIndex={active !== "mcp" ? -1 : 1}
                >
                    <ServerSetting />
                </div>
            </div>
        </div>
    )
}
