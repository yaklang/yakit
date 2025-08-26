import React, {useEffect, useMemo, useState} from "react"
import {AIReActProps, AIReActSetting} from "./aiReActType"
import {AIReActSideList} from "./AIReActSideList"
import AIReActContext, {AIReActContextDispatcher, AIReActContextStore} from "./useContext/AIReActContext"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteAIReActGV} from "@/enums/aiReAct"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {AIChatInfo} from "../ai-agent/type/aiChat"
import {useSize, useThrottleEffect, useUpdateEffect} from "ahooks"
import {AIReActSettingDefault, YakitAIReActPageID} from "./defaultConstant"
import cloneDeep from "lodash/cloneDeep"
import {AIReActChat} from "./aiReActChat/AIReActChat"

import classNames from "classnames"
import styles from "./AIReAct.module.scss"

/** 清空用户缓存的固定值 */
const AIReActCacheClearValue = "20250808"

export const AIReAct: React.FC<AIReActProps> = React.memo((props) => {
    // #region ai-re-act页面全局缓存
    // ai-re-act-chat 全局配置
    const [setting, setSetting, getSetting] = useGetSetState<AIReActSetting>(cloneDeep(AIReActSettingDefault))

    // 历史对话
    const [chats, setChats, getChats] = useGetSetState<AIChatInfo[]>([])
    // 当前展示对话
    const [activeChat, setActiveChat] = useState<AIChatInfo>()

    // 缓存全局配置数据
    useUpdateEffect(() => {
        setRemoteValue(RemoteAIReActGV.AIReActChatSetting, JSON.stringify(getSetting()))
    }, [setting])
    // 缓存历史对话数据
    useUpdateEffect(() => {
        setRemoteValue(RemoteAIReActGV.AIReActChatHistory, JSON.stringify(getChats()))
    }, [chats])

    const store: AIReActContextStore = useMemo(() => {
        return {
            setting: setting,
            chats: chats,
            activeChat: activeChat
        }
    }, [setting, chats, activeChat])

    const dispatcher: AIReActContextDispatcher = useMemo(() => {
        return {
            getSetting: getSetting,
            setSetting: setSetting,
            setChats: setChats,
            getChats: getChats,
            setActiveChat: setActiveChat
        }
    }, [])

    useEffect(() => {
        // 清空用户的无效缓存数据
        getRemoteValue(RemoteAIReActGV.AIReActCacheClear)
            .then((res) => {
                if (res === AIReActCacheClearValue) {
                    // 获取缓存的全局配置数据
                    getRemoteValue(RemoteAIReActGV.AIReActChatSetting)
                        .then((res) => {
                            if (!res) return
                            try {
                                const cache = JSON.parse(res) as AIReActSetting
                                if (typeof cache !== "object") return
                                setSetting(cache)
                            } catch (error) {}
                        })
                        .catch(() => {})
                    // 获取缓存的历史对话数据
                    getRemoteValue(RemoteAIReActGV.AIReActChatHistory)
                        .then((res) => {
                            if (!res) return
                            try {
                                const cache = JSON.parse(res) as AIChatInfo[]
                                if (!Array.isArray(cache) || cache.length === 0) return
                                setChats(cache)
                            } catch (error) {}
                        })
                        .catch(() => {})
                } else {
                    // 清空无效的用户缓存数据-全局配置数据
                    setRemoteValue(RemoteAIReActGV.AIReActChatSetting, "")
                    // 清空无效的用户缓存数据-taskChat历史对话数据
                    setRemoteValue(RemoteAIReActGV.AIReActChatHistory, "")

                    // 设置清空标志位
                    setRemoteValue(RemoteAIReActGV.AIReActCacheClear, AIReActCacheClearValue)
                }
            })
            .catch(() => {})

        return () => {}
    }, [])
    // #endregion

    const wrapperSize = useSize(document.getElementById(YakitAIReActPageID))
    const [isMini, setIsMini] = useState(false)
    useThrottleEffect(
        () => {
            const width = wrapperSize?.width || 0
            if (!!width) {
                setIsMini(width <= 1300)
            }
        },
        [wrapperSize],
        {wait: 100, trailing: false}
    )

    return (
        <AIReActContext.Provider value={{store, dispatcher}}>
            <div id={YakitAIReActPageID} className={styles["ai-re-act"]}>
                <div className={classNames(styles["ai-side-list"], {[styles["ai-side-list-mini"]]: isMini})}>
                    <AIReActSideList />
                </div>

                <div
                    className={classNames(styles["ai-re-act-chat-wrapper"], {
                        [styles["ai-re-act-chat-mini-wrapper"]]: isMini
                    })}
                >
                    <AIReActChat />
                </div>
            </div>
        </AIReActContext.Provider>
    )
})
