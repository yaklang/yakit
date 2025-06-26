import React, {useEffect, useMemo, useRef, useState} from "react"
import {AIAgentProps, AIAgentSetting, RenderMCPClientInfo} from "./aiAgentType"
import {AIAgentSideList} from "./AIAgentSideList"
import AIAgentContext, {AIAgentContextDispatcher, AIAgentContextStore} from "./useContext/AIAgentContext"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import {ServerChat} from "./ServerChat"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {AIChatInfo, AIStartParams} from "./type/aiChat"
import {useMemoizedFn, useSize, useThrottleEffect, useUpdateEffect} from "ahooks"
import {AIAgentSettingDefault, YakitAIAgentPageID} from "./defaultConstant"
import cloneDeep from "lodash/cloneDeep"
import {randomString} from "@/utils/randomUtil"
import useChatTriage from "./useChatTriage"
import {yakitNotify} from "@/utils/notification"
import {formatAIAgentSetting} from "./utils"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

export const AIAgent: React.FC<AIAgentProps> = (props) => {
    // #region ai-agent页面全局缓存
    // mcp 服务器列表
    const [servers, setServers, getServers] = useGetSetState<RenderMCPClientInfo[]>([])
    // ai-agent-chat 全局配置
    const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>(cloneDeep(AIAgentSettingDefault))
    // 历史对话
    const [chats, setChats, getChats] = useGetSetState<AIChatInfo[]>([])
    // 当前展示对话
    const [activeChat, setActiveChat] = useState<AIChatInfo>()

    /** triage 上下文相关 */
    const triageToken = useRef("")
    const [{execute: triageExecute, aiTriageForges}, triageEvents] = useChatTriage()
    // 启动 triage 上下文数据流
    const handleStartTriage = useMemoizedFn((triageSetting?: AIAgentSetting) => {
        if (triageExecute) {
            yakitNotify("warning", "AI-Triage正在监听中...")
            return
        }

        triageToken.current = randomString(11)

        let params: AIStartParams = {UserQuery: ""}
        if (triageSetting) {
            params = {...formatAIAgentSetting(setting), UserQuery: ""}
        }

        triageEvents.onStart(triageToken.current, {
            IsStart: true,
            Params: params
        })
    })
    // 发送上下文内容
    const handleSendTriage = useMemoizedFn((content: string) => {
        triageEvents.onSend(triageToken.current, content)
    })

    // 缓存全局配置数据
    useUpdateEffect(() => {
        setRemoteValue(RemoteAIAgentGV.AIAgentChatSetting, JSON.stringify(getSetting()))
    }, [setting])
    // 缓存历史对话数据
    useUpdateEffect(() => {
        setRemoteValue(RemoteAIAgentGV.AIAgentChatHistory, JSON.stringify(getChats()))
    }, [chats])

    const store: AIAgentContextStore = useMemo(() => {
        return {
            mcpServers: servers,
            setting: setting,
            chats: chats,
            activeChat: activeChat,
            aiTriageForges: aiTriageForges
        }
    }, [servers, setting, chats, activeChat, aiTriageForges])
    const dispatcher: AIAgentContextDispatcher = useMemo(() => {
        return {
            setMCPServers: setServers,
            getSetting: getSetting,
            setSetting: setSetting,
            getServers: getServers,
            setChats: setChats,
            getChats: getChats,
            setActiveChat: setActiveChat,
            onSendTriage: handleSendTriage
        }
    }, [])

    useEffect(() => {
        let settingParams: AIAgentSetting | undefined = undefined
        // 获取缓存的全局配置数据
        getRemoteValue(RemoteAIAgentGV.AIAgentChatSetting)
            .then((res) => {
                if (!res) return
                try {
                    const cache = JSON.parse(res) as AIAgentSetting
                    if (typeof cache !== "object") return
                    settingParams = cloneDeep(cache)
                    setSetting(cache)
                } catch (error) {}
            })
            .catch(() => {})
            .finally(() => {
                // handleStartTriage(settingParams)
            })
        // 获取缓存的 MCP 本地服务器信息
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
        // 获取缓存的历史对话数据
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

        return () => {
            // 清理 triage 上下文事件监听
            if (triageToken.current) {
                triageEvents.onClose(triageToken.current)
                triageToken.current = ""
            }
        }
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
