import React, {useContext, useState} from "react"
import {AIReActSideListProps, AIReActTab} from "./aiReActType"
import {AIReActTabList} from "./defaultConstant"
import AIReActContext from "./useContext/AIReActContext"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import {AIChatSetting} from "../ai-agent/AIChatSetting/AIChatSetting"
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
                        chats={store.chats}
                        setChats={dispatcher.setChats}
                        activeChat={store.activeChat}
                        setActiveChat={dispatcher.setActiveChat}
                    />
                )
            case "setting":
                return (
                    <AIChatSetting
                        setting={store.setting}
                        setSetting={dispatcher.setSetting}
                    />
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
                    tabs={AIReActTabList}
                    active={tab}
                    onTabClick={(key) => {
                        if (key === tab && !hidden) {
                            setHidden(true)
                        } else {
                            setTab(key as AIReActTab)
                            setHidden(false)
                        }
                    }}
                    className={styles["side-list-bar"]}
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
