import React, {useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {AIAgentTabList} from "./defaultConstant"
import {AIAgentSideListProps, AIAgentTab, AIAgentTriggerEventInfo} from "./aiAgentType"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import emiter from "@/utils/eventBus/eventBus"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"
import useAIAgentStore from "./useContext/useStore"
import useAIAgentDispatcher from "./useContext/useDispatcher"

const AIChatSetting = React.lazy(() => import("./AIChatSetting/AIChatSetting"))
const ForgeName = React.lazy(() => import("./forgeName/ForgeName"))
const AIToolList = React.lazy(() => import("./aiToolList/AIToolList"))
const AIModelList = React.lazy(() => import("./aiModelList/AIModelList"))
const HistoryChat = React.lazy(() => import("./historyChat/HistoryChat"))

export const AIAgentSideList: React.FC<AIAgentSideListProps> = (props) => {
    // const {} = props

    const {setting} = useAIAgentStore()
    const {setSetting} = useAIAgentDispatcher()

    // 控制各个列表的初始渲染变量，存在列表对应类型，则代表列表UI已经被渲染
    const rendered = useRef<Set<AIAgentTab>>(new Set(["history"]))
    const [active, setActive, getActive] = useGetSetState<AIAgentTab>("history")
    const [hiddenActive, setHiddenActive] = useState(false)
    const handleSetActive = useMemoizedFn((value: AIAgentTab) => {
        if (!rendered.current.has(value)) {
            rendered.current.add(value)
        }
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
            <div className={classNames(styles["side-list-bar"], {[styles["side-list-bar-hidden"]]: hiddenActive})}>
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
                {rendered.current.has("history") && (
                    <div
                        className={classNames(styles["active-content"], {
                            [styles["hidden-content"]]: active !== "history"
                        })}
                        tabIndex={active !== "history" ? -1 : 1}
                    >
                        <React.Suspense>
                            <HistoryChat
                                onNewChat={() => {
                                    onEmiter("new-chat")
                                }}
                            />
                        </React.Suspense>
                    </div>
                )}

                {rendered.current.has("setting") && (
                    <div
                        className={classNames(styles["active-content"], {
                            [styles["hidden-content"]]: active !== "setting"
                        })}
                        tabIndex={active !== "setting" ? -1 : 1}
                    >
                        <React.Suspense>
                            <AIChatSetting setting={setting} setSetting={setSetting} />
                        </React.Suspense>
                    </div>
                )}

                {rendered.current.has("forgeName") && (
                    <div
                        className={classNames(styles["active-content"], {
                            [styles["hidden-content"]]: active !== "forgeName"
                        })}
                        tabIndex={active !== "forgeName" ? -1 : 1}
                    >
                        <React.Suspense>
                            <ForgeName />
                        </React.Suspense>
                    </div>
                )}

                {rendered.current.has("tool") && (
                    <div
                        className={classNames(styles["active-content"], {
                            [styles["hidden-content"]]: active !== "tool"
                        })}
                        tabIndex={active !== "tool" ? -1 : 1}
                    >
                        <React.Suspense>
                            <AIToolList />
                        </React.Suspense>
                    </div>
                )}
                {rendered.current.has("AIModel") && (
                    <div
                        className={classNames(styles["active-content"], {
                            [styles["hidden-content"]]: active !== "AIModel"
                        })}
                        tabIndex={active !== "AIModel" ? -1 : 1}
                    >
                        <React.Suspense>
                            <AIModelList />
                        </React.Suspense>
                    </div>
                )}
            </div>
        </div>
    )
}
