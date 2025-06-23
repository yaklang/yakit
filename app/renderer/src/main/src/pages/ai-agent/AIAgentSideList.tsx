import React, {useState} from "react"
import {useMemoizedFn} from "ahooks"
import {AIAgentTabList} from "./defaultConstant"
import {AIAgentSideListProps, AIAgentTab, AIAgentTriggerEventInfo} from "./aiAgentType"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
// import {MCPServer} from "./MCPServer"
import {AIChatSetting} from "./AIChatSetting"
import {HistoryChat} from "./HistoryChat"
import emiter from "@/utils/eventBus/eventBus"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

const AIToolList = React.lazy(() => import("./aiToolList/AIToolList"))

export const AIAgentSideList: React.FC<AIAgentSideListProps> = (props) => {
    // const {} = props

    // 控制各个列表的初始渲染变量，存在列表对应类型，则代表列表UI已经被渲染
    // const rendered = useRef<Set<AIAgentTab>>(new Set(["history"]))
    const [active, setActive, getActive] = useGetSetState<AIAgentTab>("history")
    const [hiddenActive, setHiddenActive] = useState(false)
    const handleSetActive = useMemoizedFn((value: AIAgentTab) => {
        // if (!rendered.current.has(value)) {
        //     rendered.current.add(value)
        // }
        if (getActive() === value) {
            setHiddenActive((old) => !old)
        } else {
            setHiddenActive(false)
            setActive(value)
        }
    })

    /** 向对话框组件进行事件触发的通信 */
    const onEmiter = useMemoizedFn((key: string) => {
        const info: AIAgentTriggerEventInfo = {type: ""}
        switch (key) {
            case "new-chat":
                info.type = "new-chat"

                break
            default:
                break
        }
        if (info.type) emiter.emit("onServerChatEvent", JSON.stringify(info))
    })

    return (
        <div className={styles["ai-agent-side-list"]}>
            <div className={styles["side-list-bar"]}>
                {AIAgentTabList.map((item) => {
                    const isActive = item.key === active
                    return (
                        <div
                            key={item.key}
                            className={classNames(styles["list-item"], {
                                [styles["list-item-active"]]: isActive,
                                [styles["list-item-hidden"]]: isActive && hiddenActive
                            })}
                            onClick={() => handleSetActive(item.key)}
                        >
                            <span className={styles["item-title"]}>{item.title}</span>
                            {item.icon}
                        </div>
                    )
                })}
            </div>

            <div className={classNames(styles["side-list-body"], {[styles["side-list-body-hidden"]]: hiddenActive})}>
                {/* mcp 服务器功能 */}
                {/* <div
                    className={classNames(styles["active-content"], {
                        [styles["hidden-content"]]: active !== "mcp"
                    })}
                    tabIndex={active !== "mcp" ? -1 : 1}
                >
                    <MCPServer />
                </div> */}

                <div
                    className={classNames(styles["active-content"], {
                        [styles["hidden-content"]]: active !== "setting"
                    })}
                    tabIndex={active !== "setting" ? -1 : 1}
                >
                    <AIChatSetting />
                </div>

                <div
                    className={classNames(styles["active-content"], {
                        [styles["hidden-content"]]: active !== "history"
                    })}
                    tabIndex={active !== "history" ? -1 : 1}
                >
                    <HistoryChat
                        onNewChat={() => {
                            onEmiter("new-chat")
                        }}
                    />
                </div>
                <div
                    className={classNames(styles["active-content"], {
                        [styles["hidden-content"]]: active !== "tool"
                    })}
                    tabIndex={active !== "tool" ? -1 : 1}
                >
                    <AIToolList />
                </div>
            </div>
        </div>
    )
}
