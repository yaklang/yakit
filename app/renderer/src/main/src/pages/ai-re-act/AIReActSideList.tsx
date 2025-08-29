import React, {useContext, useState} from "react"
import {AIReActEventInfo, AIReActSideListProps, AIReActTab} from "./aiReActType"
import {AIReActTabList} from "./defaultConstant"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import classNames from "classnames"
import styles from "./AIReAct.module.scss"
import {useMemoizedFn} from "ahooks"
import {YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"
import emiter from "@/utils/eventBus/eventBus"
import useAIReActStore from "./useContext/useAIReActStore"
import useAIReActDispatcher from "./useContext/useAIReActDispatcher"

const AIChatSetting = React.lazy(() => import("../ai-agent/AIChatSetting/AIChatSetting"))
const AIReactHistoryChat = React.lazy(() => import("./aiReactHistoryChat/AIReactHistoryChat"))

const yakitTabs: YakitTabsProps[] = AIReActTabList.map((item) => ({
    label: item.title,
    value: item.key,
    icon: item.icon
}))
export const AIReActSideList: React.FC<AIReActSideListProps> = () => {
    const {setting} = useAIReActStore()
    const {setSetting} = useAIReActDispatcher()

    const [tab, setTab] = useState<AIReActTab>("history")
    const [hidden, setHidden] = useState<boolean>(false)

    /** 向对话框组件进行事件触发的通信 */
    const onEmiter = useMemoizedFn((key: string) => {
        const info: AIReActEventInfo = {type: ""}
        switch (key) {
            case "new-chat":
                info.type = "new-chat"

                break
            default:
                break
        }
        if (info.type) emiter.emit("onReActChatEvent", JSON.stringify(info))
    })

    const renderContent = () => {
        switch (tab) {
            case "history":
                return (
                    <AIReactHistoryChat
                        onNewChat={() => {
                            onEmiter("new-chat")
                        }}
                    />
                )
            case "setting":
                return <AIChatSetting setting={setting} setSetting={setSetting} />
            default:
                return <div>未知页面</div>
        }
    }
    const onActiveKey = useMemoizedFn((key) => {
        if (key === tab && !hidden) {
            setHidden(true)
        } else {
            setTab(key as AIReActTab)
            setHidden(false)
        }
    })
    return (
        <div className={styles["ai-re-act-side-list"]}>
            <div
                className={classNames(styles["side-list-bar"], {
                    [styles["side-list-bar-hidden"]]: hidden
                })}
            >
                <YakitSideTab yakitTabs={yakitTabs} activeKey={tab} onActiveKey={onActiveKey} type='vertical' />
            </div>

            <div
                className={classNames(styles["side-list-body"], {
                    [styles["side-list-body-hidden"]]: hidden
                })}
            >
                <div className={hidden ? styles["hidden-content"] : styles["active-content"]}>{renderContent()}</div>
            </div>
        </div>
    )
}
