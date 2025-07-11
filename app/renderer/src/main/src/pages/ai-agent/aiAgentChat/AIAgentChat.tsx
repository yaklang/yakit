import React, {memo, useEffect, useRef} from "react"
import {AIAgentChatProps} from "./type"
import {AIAgentWelcome} from "../AIAgentWelcome/AIAgentWelcome"
import {useMemoizedFn} from "ahooks"
import {AIStartParams} from "../type/aiChat"
import {AITriageChatRef} from "../aiTriageChat/type"
import {AITaskChatRef} from "../aiTaskChat/type"
import emiter from "@/utils/eventBus/eventBus"
import {AIAgentTriggerEventInfo} from "../aiAgentType"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useAIAgentStore from "../useContext/useStore"

import classNames from "classnames"
import styles from "./AIAgentChat.module.scss"

const AITriageChat = React.lazy(() => import("../aiTriageChat/AITriageChat"))
const AITaskChat = React.lazy(() => import("../aiTaskChat/AITaskChat"))

export const AIAgentChat: React.FC<AIAgentChatProps> = memo((props) => {
    const {} = props

    const {activeChat} = useAIAgentStore()

    const [mode, setMode, getMode] = useGetSetState<"welcome" | "triage" | "task">("welcome")

    // #region ai-triage-chat 相关逻辑
    /** tirage对话是否存在 */
    const isTriageChatExist = useRef(false)
    const triageChatRef = useRef<AITriageChatRef>(null)

    // 初始化 triage 对话并提问
    const handleStartTriageChat = useMemoizedFn((qs: string) => {
        setMode("triage")
        setTimeout(() => {
            if (triageChatRef.current) {
                triageChatRef.current.onStart(qs)
                isTriageChatExist.current = true
            }
        }, 100)
    })

    // 关闭 triage 对话
    const handleCancelTriageChat = useMemoizedFn(() => {
        isTriageChatExist.current = false
        setMode("welcome")
    })
    // #endregion

    // #region ai-task-chat 相关逻辑
    const taskChatRef = useRef<AITaskChatRef>(null)

    const handleStartTaskChat = useMemoizedFn((request: AIStartParams) => {
        setMode("task")
        setTimeout(() => {
            if (taskChatRef.current) {
                taskChatRef.current.onStart(request)
            }
        }, 100)
    })

    const handleCancelTaskChat = useMemoizedFn(() => {
        setMode(isTriageChatExist.current ? "triage" : "welcome")
    })

    useEffect(() => {
        if (activeChat) {
            setMode("task")
            setTimeout(() => {
                if (taskChatRef.current) {
                    taskChatRef.current.onShowTask(activeChat)
                }
            }, 100)
        }
    }, [activeChat])
    // #endregion

    useEffect(() => {
        // ai-agent 页面左侧侧边栏向 chatUI 发送的事件
        const onEvents = (res: string) => {
            try {
                const data = JSON.parse(res) as AIAgentTriggerEventInfo
                if (!data.type) return

                if (data.type === "new-chat") {
                    if (["welcome", "triage"].includes(getMode())) return
                    setMode(isTriageChatExist.current ? "triage" : "welcome")
                }
            } catch (error) {}
        }
        emiter.on("onServerChatEvent", onEvents)
        return () => {
            emiter.off("onServerChatEvent", onEvents)
        }
    }, [])

    return (
        <div className={styles["ai-agent-chat"]}>
            <div className={classNames(styles["chat-body"], {[styles["chat-hidden-body"]]: mode !== "welcome"})}>
                <AIAgentWelcome onTriageSubmit={handleStartTriageChat} onTaskSubmit={handleStartTaskChat} />
            </div>

            <div className={classNames(styles["chat-body"], {[styles["chat-hidden-body"]]: mode !== "triage"})}>
                <AITriageChat ref={triageChatRef} onTaskSubmit={handleStartTaskChat} onClear={handleCancelTriageChat} />
            </div>

            <div className={classNames(styles["chat-body"], {[styles["chat-hidden-body"]]: mode !== "task"})}>
                <AITaskChat ref={taskChatRef} onBack={handleCancelTaskChat} />
            </div>
        </div>
    )
})
