import React, {useEffect, useMemo, useRef, useState} from "react"
import {AIAgentProps, AIAgentSetting, RenderMCPClientInfo} from "./aiAgentType"
import {AIAgentSideList} from "./AIAgentSideList"
import AIAgentContext, {AIAgentContextDispatcher, AIAgentContextStore} from "./useContext/AIAgentContext"
import {DefaultAIAgentSetting} from "./defaultConstant"
import {getRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import {ServerChat} from "./ServerChat"

// import classNames from "classnames"
import styles from "./AIAgent.module.scss"

export const AIAgent: React.FC<AIAgentProps> = (props) => {
    const wrapper = useRef<HTMLDivElement>(null)

    // ai-agent-chat 全局配置
    const [setting, setSetting] = useState<AIAgentSetting>(DefaultAIAgentSetting)
    // mcp 服务器列表
    const [servers, setServers] = useState<RenderMCPClientInfo[]>([])

    const store: AIAgentContextStore = useMemo(() => {
        return {
            mcpServers: servers,
            setting: setting
        }
    }, [servers, setting])
    const dispatcher: AIAgentContextDispatcher = useMemo(() => {
        return {
            setMCPServers: setServers,
            setSetting: setSetting
        }
    }, [])

    useEffect(() => {
        getRemoteValue(RemoteAIAgentGV.AIAgentChatSetting)
            .then((res) => {
                if (!res) return
                try {
                    const cache = JSON.parse(res) as AIAgentSetting
                    setSetting(cache)
                } catch (error) {}
            })
            .catch((err) => {})
        getRemoteValue(RemoteAIAgentGV.MCPClientList)
            .then((res) => {
                if (!res) return
                try {
                    const cache = JSON.parse(res) as RenderMCPClientInfo[]
                    setServers(cache)
                } catch (error) {}
            })
            .catch((err) => {})
    }, [])

    return (
        <AIAgentContext.Provider value={{store, dispatcher}}>
            <div ref={wrapper} className={styles["ai-agent"]}>
                <AIAgentSideList />

                <div className={styles["ai-agent-chat"]}>
                    <ServerChat getContainer={wrapper.current || undefined} />
                </div>
            </div>
        </AIAgentContext.Provider>
    )
}
