import React, {useContext, useState} from "react"
import {AIReActSideListProps, AIReActTab} from "./aiReActType"
import {AIReActTabList} from "./defaultConstant"
import AIReActContext from "./useContext/AIReActContext"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import AIChatSetting from "../ai-agent/AIChatSetting/AIChatSetting"
import {HistoryChat} from "../ai-agent/historyChat/HistoryChat"
import classNames from "classnames"
import styles from "./AIReAct.module.scss"

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
                return (
                    <AIChatSetting />
                )
            default:
                return <div>未知页面</div>
        }
    }

    return (
        <div className={styles["ai-re-act-side-list"]}>
            <div 
                className={classNames(styles["side-list-bar"], {
                    [styles["side-list-bar-hidden"]]: hidden
                })}
            >
                <YakitSideTab
                    yakitTabs={AIReActTabList.map(item => ({
                        label: item.title,
                        value: item.key,
                        icon: item.icon
                    }))}
                    activeKey={tab}
                    onActiveKey={(key) => {
                        if (key === tab && !hidden) {
                            setHidden(true)
                        } else {
                            setTab(key as AIReActTab)
                            setHidden(false)
                        }
                    }}
                    type="vertical"
                />
            </div>
            
            <div 
                className={classNames(styles["side-list-body"], {
                    [styles["side-list-body-hidden"]]: hidden
                })}
            >
                <div className={hidden ? styles["hidden-content"] : styles["active-content"]}>
                    {renderContent()}
                </div>
            </div>
        </div>
    )
}
