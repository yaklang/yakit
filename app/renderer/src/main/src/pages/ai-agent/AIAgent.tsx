import React, {useRef} from "react"
import {useMemoizedFn} from "ahooks"
import {AIAgentTabList} from "./defaultConstant"
import {AIAgentProps, AIAgentTab} from "./aiAgentType"
import {MCPServer} from "./ServerSetting"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

export const AIAgent: React.FC<AIAgentProps> = (props) => {
    // 控制各个列表的初始渲染变量，存在列表对应类型，则代表列表UI已经被渲染
    const rendered = useRef<Set<string>>(new Set(["mcp"]))
    const [active, setActive] = React.useState<AIAgentTab>("mcp")
    const handleSetActive = useMemoizedFn((value: AIAgentTab) => {
        setActive(value)
        if (!rendered.current.has(value)) {
            rendered.current.add(value)
        }
    })

    return (
        <div className={styles["ai-agent"]}>
            <div className={styles["ai-agent-bar-list"]}>
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

            <div className={styles["ai-agent-body"]}>
                {rendered.current.has("mcp") && (
                    <div
                        className={classNames(styles["active-content"], {
                            [styles["hidden-content"]]: active !== "mcp"
                        })}
                    >
                        <MCPServer />
                    </div>
                )}
            </div>
        </div>
    )
}
