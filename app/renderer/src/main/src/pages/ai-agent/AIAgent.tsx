import React, {useEffect, useMemo, useState} from "react"
import {AIAgentProps, AIAgentSetting, RenderMCPClientInfo} from "./aiAgentType"
import {AIAgentSideList} from "./AIAgentSideList"
import AIAgentContext, {AIAgentContextDispatcher, AIAgentContextStore} from "./useContext/AIAgentContext"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import {ServerChat} from "./ServerChat"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {AIChatInfo} from "./type/aiChat"
import {useSize, useThrottleEffect, useUpdateEffect} from "ahooks"
import {YakitAIAgentPageID} from "./defaultConstant"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

export const AIAgent: React.FC<AIAgentProps> = (props) => {
    // #region ai-agent页面全局缓存
    // ai-agent-chat 全局配置
    const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>({
        AutoExecute: false,
        EnableSystemFileSystemOperator: true,
        UseDefaultAIConfig: true
    })
    // mcp 服务器列表
    const [servers, setServers, getServers] = useGetSetState<RenderMCPClientInfo[]>([])
    // 历史对话
    const [chats, setChats, getChats] = useGetSetState<AIChatInfo[]>([])
    // 当前展示对话
    const [activeChat, setActiveChat] = useState<AIChatInfo>()

    useUpdateEffect(() => {
        setRemoteValue(RemoteAIAgentGV.AIAgentChatSetting, JSON.stringify(getSetting()))
    }, [setting])
    useUpdateEffect(() => {
        setRemoteValue(RemoteAIAgentGV.AIAgentChatHistory, JSON.stringify(getChats()))
    }, [chats])

    const store: AIAgentContextStore = useMemo(() => {
        return {
            mcpServers: servers,
            setting: setting,
            chats: chats,
            activeChat: activeChat
        }
    }, [servers, setting, chats, activeChat])
    const dispatcher: AIAgentContextDispatcher = useMemo(() => {
        return {
            setMCPServers: setServers,
            getSetting: getSetting,
            setSetting: setSetting,
            getServers: getServers,
            setChats: setChats,
            getChats: getChats,
            setActiveChat: setActiveChat
        }
    }, [])

    useEffect(() => {
        getRemoteValue(RemoteAIAgentGV.AIAgentChatSetting)
            .then((res) => {
                if (!res) return
                try {
                    const cache = JSON.parse(res) as AIAgentSetting
                    if (typeof cache !== "object") return
                    setSetting(cache)
                } catch (error) {}
            })
            .catch(() => {})
        getRemoteValue(RemoteAIAgentGV.MCPClientList)
            .then((res) => {
                if (!res) return
                try {
                    const cache = JSON.parse(res) as RenderMCPClientInfo[]
                    if (!Array.isArray(cache) || cache.length === 0) return
                    setServers(cache)
                } catch (error) {}
            })
            .catch(() => {})
        getRemoteValue(RemoteAIAgentGV.AIAgentChatHistory)
            .then((res) => {
                if (!res) return
                try {
                    const cache = JSON.parse(res) as AIChatInfo[]
                    if (!Array.isArray(cache) || cache.length === 0) return
                    setChats(cache)
                } catch (error) {}
            })
            .catch(() => {})
    }, [])
    // #endregion

    const wrapperSize = useSize(document.getElementById(YakitAIAgentPageID))
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
        <AIAgentContext.Provider value={{store, dispatcher}}>
            <div id={YakitAIAgentPageID} className={styles["ai-agent"]}>
                <div className={classNames(styles["ai-side-list"], {[styles["ai-side-list-mini"]]: isMini})}>
                    <AIAgentSideList />
                </div>

                <div className={classNames(styles["ai-agent-chat"], {[styles["ai-agent-chat-mini"]]: isMini})}>
                    <ServerChat />
                </div>
            </div>
        </AIAgentContext.Provider>
    )
}
