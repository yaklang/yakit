import React, {memo, useEffect, useRef, useState} from "react"
import {AIAgentChatProps} from "./type"
import {AIAgentWelcome} from "../AIAgentWelcome/AIAgentWelcome"
import {useMemoizedFn} from "ahooks"
import {AIForge, AIStartParams} from "../type/aiChat"
import {AITriageChatRef} from "../aiTriageChat/type"
import {AITaskChatRef} from "../aiTaskChat/type"
import emiter from "@/utils/eventBus/eventBus"
import {AIAgentTriggerEventInfo} from "../aiAgentType"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useAIAgentStore from "../useContext/useStore"
import {yakitNotify} from "@/utils/notification"
import {AIAgentWelcomeRef} from "../AIAgentWelcome/type"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"

import classNames from "classnames"
import styles from "./AIAgentChat.module.scss"

const AITriageChat = React.lazy(() => import("../aiTriageChat/AITriageChat"))
const AITaskChat = React.lazy(() => import("../aiTaskChat/AITaskChat"))

export const AIAgentChat: React.FC<AIAgentChatProps> = memo((props) => {
    const {} = props

    const {activeChat} = useAIAgentStore()

    const [mode, setMode, getMode] = useGetSetState<"welcome" | "triage" | "task">("welcome")

    // #region ai-agent-welcome 相关逻辑
    const welcomeRef = useRef<AIAgentWelcomeRef>(null)
    // #endregion

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

    // #region 外部元素触发的通信事件处理
    // 储存 replaceForgeNoPrompt 存放到缓存里值，阻止多次设置重复值
    const replaceForgeNoPromptCache = useRef(false)
    // 是否直接替换当前使用的forge模板，而不出现二次确认框
    const [replaceForgeNoPrompt, setReplaceForgeNoPrompt] = useState(false)
    const handleSetReplaceForgeNoPrompt = useMemoizedFn(() => {
        if (replaceForgeNoPrompt && !replaceForgeNoPromptCache.current) {
            replaceForgeNoPromptCache.current = true
            setRemoteValue(RemoteAIAgentGV.AIAgentReplaceForgeNoPrompt, "true")
        }
    })

    /** 从别的元素上触发使用 forge 模板的功能 */
    const handleTriggerExecForge = useMemoizedFn((forge: AIForge) => {
        if (!forge || !forge.Id) {
            yakitNotify("error", "准备使用的模板数据异常，请稍后再试")
            return
        }

        if (mode === "task" && taskChatRef.current) {
            const isExec = taskChatRef.current.onGetExecuting()
            if (isExec) {
                yakitNotify("warning", "当前任务正在执行中，请稍后再试")
                return
            } else {
                const domRef = isTriageChatExist.current ? triageChatRef.current : welcomeRef.current
                if (domRef) {
                    setMode(isTriageChatExist.current ? "triage" : "welcome")
                    setTimeout(() => {
                        if (domRef) {
                            domRef.onTriggerExecForge(forge.Id)
                        }
                    }, 100)
                }
            }
        }
        if (mode === "welcome" && welcomeRef.current) {
            welcomeRef.current.onTriggerExecForge(forge.Id)
        }
        if (mode === "triage" && triageChatRef.current) {
            triageChatRef.current.onTriggerExecForge(forge.Id)
        }
    })

    useEffect(() => {
        // 获取 replaceForgeNoPrompt 的缓存值
        getRemoteValue(RemoteAIAgentGV.AIAgentReplaceForgeNoPrompt)
            .then((res) => {
                replaceForgeNoPromptCache.current = !!res
                setReplaceForgeNoPrompt(!!res)
            })
            .catch(() => {})

        // ai-agent 页面左侧侧边栏向 chatUI 发送的事件
        const onEvents = (res: string) => {
            try {
                const data = JSON.parse(res) as AIAgentTriggerEventInfo
                if (!data.type) return

                // 新开聊天对话窗
                if (data.type === "new-chat") {
                    if (["welcome", "triage"].includes(getMode())) return
                    setMode(isTriageChatExist.current ? "triage" : "welcome")
                }

                // 替换当前使用的 forge 模板
                if (data.type === "open-forge-form") {
                    const {value} = data.params || {}
                    handleTriggerExecForge(value)
                }
            } catch (error) {}
        }
        emiter.on("onServerChatEvent", onEvents)
        return () => {
            emiter.off("onServerChatEvent", onEvents)
        }
    }, [])
    // #endregion

    return (
        <div className={styles["ai-agent-chat"]}>
            <div className={classNames(styles["chat-body"], {[styles["chat-hidden-body"]]: mode !== "welcome"})}>
                <AIAgentWelcome
                    ref={welcomeRef}
                    replaceForgeNoPrompt={replaceForgeNoPrompt}
                    setReplaceForgeNoPrompt={setReplaceForgeNoPrompt}
                    setCacheReplaceForgeNoPrompt={handleSetReplaceForgeNoPrompt}
                    onTriageSubmit={handleStartTriageChat}
                    onTaskSubmit={handleStartTaskChat}
                />
            </div>

            <div className={classNames(styles["chat-body"], {[styles["chat-hidden-body"]]: mode !== "triage"})}>
                <AITriageChat
                    ref={triageChatRef}
                    replaceForgeNoPrompt={replaceForgeNoPrompt}
                    setReplaceForgeNoPrompt={setReplaceForgeNoPrompt}
                    setCacheReplaceForgeNoPrompt={handleSetReplaceForgeNoPrompt}
                    onTaskSubmit={handleStartTaskChat}
                    onClear={handleCancelTriageChat}
                />
            </div>

            <div className={classNames(styles["chat-body"], {[styles["chat-hidden-body"]]: mode !== "task"})}>
                <AITaskChat ref={taskChatRef} onBack={handleCancelTaskChat} />
            </div>
        </div>
    )
})
