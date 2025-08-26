import React, {useContext, useState} from "react"
import {AIReActSideListProps, AIReActTab} from "./aiReActType"
import {AIReActTabList} from "./defaultConstant"
import AIReActContext from "./useContext/AIReActContext"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import classNames from "classnames"
import styles from "./AIReAct.module.scss"
import {useMemoizedFn} from "ahooks"
import {YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"

const AIChatSetting = React.lazy(() => import("../ai-agent/AIChatSetting/AIChatSetting"))
const HistoryChat = React.lazy(() => import("../ai-agent/historyChat/HistoryChat"))

const yakitTabs: YakitTabsProps[] = AIReActTabList.map((item) => ({
    label: item.title,
    value: item.key,
    icon: item.icon
}))
export const AIReActSideList: React.FC<AIReActSideListProps> = () => {
    const {store, dispatcher} = useContext(AIReActContext)
    const [tab, setTab] = useState<AIReActTab>("history")
    const [hidden, setHidden] = useState<boolean>(false)

    const renderContent = () => {
        switch (tab) {
            case "history":
                return (
                    <HistoryChat
                        onNewChat={() => {
                            // TODO: 实现新建对话逻辑
                        }}
                    />
                )
            case "setting":
                return <AIChatSetting />
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
