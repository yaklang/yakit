import React, {memo, useEffect, useRef, useState} from "react"
import {AIAgentChatMode, AIAgentChatProps, AIReActTaskChatReviewProps} from "./type"
import {AIAgentWelcome} from "../AIAgentWelcome/AIAgentWelcome"
import {useCreation, useDebounceFn, useMap, useMemoizedFn, useUpdateEffect} from "ahooks"
import {AIChatInfo, AIChatReviewExtra} from "../type/aiChat"
import emiter from "@/utils/eventBus/eventBus"
import {AIAgentTriggerEventInfo} from "../aiAgentType"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useAIAgentStore from "../useContext/useStore"
import {AIAgentWelcomeRef} from "../AIAgentWelcome/type"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import {AIReActChat} from "@/pages/ai-re-act/aiReActChat/AIReActChat"
import useChatIPC from "@/pages/ai-re-act/hooks/useChatIPC"
import useAIAgentDispatcher from "../useContext/useDispatcher"
import cloneDeep from "lodash/cloneDeep"
import {randomString} from "@/utils/randomUtil"
import {formatAIAgentSetting} from "../utils"
import ChatIPCContent, {
    AIChatIPCSendParams,
    ChatIPCContextDispatcher,
    ChatIPCContextStore
} from "../useContext/ChatIPCContent/ChatIPCContent"
import {AIReActChatReview} from "@/pages/ai-re-act/aiReActChatReview/AIReActChatReview"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineChevrondoubledownIcon, OutlineChevrondoubleupIcon} from "@/assets/icon/outline"
import {ChatIPCSendType} from "@/pages/ai-re-act/hooks/type"
import useChatIPCDispatcher from "../useContext/ChatIPCContent/useDispatcher"
import useChatIPCStore from "../useContext/ChatIPCContent/useStore"
import {AIAgentGrpcApi, AIInputEvent, AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIChatReview} from "@/pages/ai-re-act/hooks/aiRender"

import classNames from "classnames"
import styles from "./AIAgentChat.module.scss"

const AIReActTaskChat = React.lazy(() => import("../../ai-re-act/aiReActTaskChat/AIReActTaskChat"))

export const AIAgentChat: React.FC<AIAgentChatProps> = memo((props) => {
    const {} = props

    const {activeChat, setting} = useAIAgentStore()
    const {setChats, setActiveChat, setSetting} = useAIAgentDispatcher()

    const [mode, setMode, getMode] = useGetSetState<AIAgentChatMode>("welcome")

    const handleStartTriageChat = useMemoizedFn((qs: string) => {
        setMode("re-act")
        handleStart(qs)
    })
    const [isShowTask, setIsShowTask] = useState<boolean>(false)

    /**欢迎页中 Forge 启动ai */
    const handleStartTaskChatByForge = useMemoizedFn((request: AIStartParams) => {
        setMode("re-act")
        setSetting &&
            setSetting((old) => {
                return {
                    ...old,
                    ForgeName: request.ForgeName,
                    ForgeParams: request.ForgeParams
                }
            })
        handleStart("")
    })

    /**自由对话中触发任务开始 */
    const handleTaskStart = useMemoizedFn(() => {
        setMode("task")
        setIsShowTask(true)
    })

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
                    if (["welcome"].includes(getMode())) return
                    setMode("welcome")
                }
            } catch (error) {}
        }
        emiter.on("onServerChatEvent", onEvents)
        return () => {
            emiter.off("onServerChatEvent", onEvents)
        }
    }, [])

    // review数据中树的数据中需要的解释和关键词工具
    const [planReviewTreeKeywordsMap, {set: setPlanReviewTreeKeywords, reset: resetPlanReviewTreeKeywords}] = useMap<
        string,
        AIAgentGrpcApi.PlanReviewRequireExtra
    >(new Map())

    const [reviewInfo, setReviewInfo] = useState<AIChatReview>()
    const [reviewExpand, setReviewExpand] = useState<boolean>(true)

    const [timelineMessage, setTimelineMessage] = useState<string>()

    const handleShowReview = useMemoizedFn((info: AIChatReview) => {
        console.log("reviewInfo", info)
        setReviewExpand(true)
        setReviewInfo(cloneDeep(info))
    })
    const handleShowReviewExtra = useMemoizedFn((info: AIChatReviewExtra) => {
        if (info.type === "plan_task_analysis") {
            setPlanReviewTreeKeywords(info.data.index, info.data)
        }
    })
    const handleReleaseReview = useMemoizedFn((id: string) => {
        if (!reviewInfo) return
        if (reviewInfo.data.id === id) {
            // if (!delayLoading) yakitNotify("warning", "审阅自动执行，弹框将自动关闭")
            handleStopAfterChangeState()
        }
    })
    const handleTimelineMessage = useDebounceFn(
        useMemoizedFn((value: string) => {
            setTimelineMessage(value)
        }),
        {wait: 300, leading: true}
    ).run
    /** 当前对话唯一ID */
    const activeID = useCreation(() => {
        return activeChat?.id
    }, [activeChat])
    // 提问结束后缓存数据
    const handleChatingEnd = useMemoizedFn(() => {
        handleSaveChatInfo()
        handleStopAfterChangeState()
    })
    const [chatIPCData, events] = useChatIPC({
        onEnd: handleChatingEnd,
        onTaskReview: handleShowReview,
        onTaskReviewExtra: handleShowReviewExtra,
        onReviewRelease: handleReleaseReview,
        onTaskStart: handleTaskStart,
        onTimelineMessage: handleTimelineMessage
    })
    const {execute, aiPerfData, logs, casualChat, taskChat} = chatIPCData

    // 保存上次对话信息
    const handleSaveChatInfo = useMemoizedFn(() => {
        const showID = activeID
        // 如果是历史对话，只是查看，怎么实现点击新对话的功能呢
        if (showID && events.fetchToken() && showID === events.fetchToken()) {
            const answer: AIChatInfo["answer"] = {
                taskChat: cloneDeep(taskChat),
                aiPerfData: cloneDeep(aiPerfData),
                logs: cloneDeep(logs),
                casualChat: cloneDeep(casualChat)
            }
            setChats &&
                setChats((old) => {
                    const newValue = cloneDeep(old)
                    const findIndex = newValue.findIndex((item) => item.id === showID)
                    if (findIndex !== -1) {
                        newValue[findIndex].answer = {...(answer || {})}
                    }
                    return newValue
                })
        }
    })
    const handleStart = useMemoizedFn((qs: string) => {
        const request: AIStartParams = {
            ...formatAIAgentSetting(setting),
            UserQuery: qs,
            CoordinatorId: "",
            Sequence: 1
        }
        // 创建新的聊天记录
        const newChat: AIChatInfo = {
            id: randomString(16),
            name: qs || `AI Agent - ${new Date().toLocaleString()}`,
            question: qs,
            time: new Date().getTime(),
            request
        }
        setActiveChat && setActiveChat(newChat)
        setChats && setChats((old) => [...old, newChat])
        setMode("re-act")
        setIsShowTask(false)
        // 发送初始化参数
        const startParams: AIInputEvent = {
            IsStart: true,
            Params: {
                ...request
            }
        }
        events.onStart(newChat.id, startParams)
    })
    const handleSendCasual = useMemoizedFn((params: AIChatIPCSendParams) => {
        const {value, id} = params
        handleSendAIRequire(value, id, "casual")
    })
    const handleSendTask = useMemoizedFn((params: AIChatIPCSendParams) => {
        const {value, id} = params
        handleSendAIRequire(value, id, "task")
    })
    const handleSend = useMemoizedFn((params: AIChatIPCSendParams) => {
        const {value, id} = params
        handleSendAIRequire(value, id, "")
    })
    const handleSendAIRequire = useMemoizedFn((value: string, id: string, type: ChatIPCSendType) => {
        if (!activeID) return
        if (!id) return

        const info: AIInputEvent = {
            IsInteractiveMessage: true,
            InteractiveId: id,
            InteractiveJSONInput: value
        }
        events.onSend({token: activeID, type, params: info})
        handleStopAfterChangeState()
    })
    const onStop = useMemoizedFn(() => {
        if (execute && activeID) {
            events.onClose(activeID)
            handleStopAfterChangeState()
        }
    })
    /** 停止回答后的状态调整||清空Review状态 */
    const handleStopAfterChangeState = useMemoizedFn(() => {
        // 清空review信息
        setReviewInfo(undefined)
        resetPlanReviewTreeKeywords()
        setReviewExpand(true)
    })

    useEffect(() => {
        // ai-re-act 页面左侧侧边栏向 chatUI 发送的事件
        const onEvents = (res: string) => {
            try {
                const data = JSON.parse(res) as AIAgentTriggerEventInfo
                if (!data.type) return
                // 新开聊天对话窗
                if (data.type === "new-chat") {
                    onStop()
                    handleSaveChatInfo()
                    events.onReset()
                    handleStart("")
                }
            } catch (error) {}
        }
        emiter.on("onReActChatEvent", onEvents)
        return () => {
            emiter.off("onReActChatEvent", onEvents)
        }
    }, [])

    useUpdateEffect(() => {
        onHistoryAfter()
    }, [activeChat, execute])

    /**切换历史后的处理逻辑 */
    const onHistoryAfter = useMemoizedFn(() => {
        const token = events.fetchToken()
        if (mode === "welcome") setMode("re-act")
        if (execute && activeChat?.id !== token) {
            events.onClose(token)
        }
    })

    const store: ChatIPCContextStore = useCreation(() => {
        return {chatIPCData, planReviewTreeKeywordsMap, reviewInfo, reviewExpand, timelineMessage}
    }, [chatIPCData, planReviewTreeKeywordsMap, reviewInfo, reviewExpand, timelineMessage])
    const dispatcher: ChatIPCContextDispatcher = useCreation(() => {
        return {
            chatIPCEvents: events,
            handleSendCasual,
            handleSendTask,
            handleSaveChatInfo,
            handleStart,
            handleStop: onStop,
            handleSend,
            setTimelineMessage
        }
    }, [events])
    useEffect(() => {
        console.log("chatIPCData", chatIPCData)
    }, [chatIPCData])

    return (
        <div className={styles["ai-agent-chat"]}>
            {mode === "welcome" ? (
                <div className={styles["chat-body"]}>
                    <AIAgentWelcome
                        replaceForgeNoPrompt={replaceForgeNoPrompt}
                        setReplaceForgeNoPrompt={setReplaceForgeNoPrompt}
                        setCacheReplaceForgeNoPrompt={handleSetReplaceForgeNoPrompt}
                        onTriageSubmit={handleStartTriageChat}
                        onTaskSubmit={handleStartTaskChatByForge}
                    />
                </div>
            ) : (
                <ChatIPCContent.Provider value={{store, dispatcher}}>
                    <div className={styles["chat-wrapper"]}>
                        {isShowTask && (
                            <React.Suspense fallback={<div>loading...</div>}>
                                <AIReActTaskChat execute={execute} onStop={onStop} />
                            </React.Suspense>
                        )}
                        <AIReActChat mode={mode} />
                    </div>
                </ChatIPCContent.Provider>
            )}
        </div>
    )
})

export const AIReActTaskChatReview: React.FC<AIReActTaskChatReviewProps> = React.memo((props) => {
    const {reviewInfo, planReviewTreeKeywordsMap} = props
    const {reviewExpand} = useChatIPCStore()
    const {handleSendTask} = useChatIPCDispatcher()
    const [expand, setReviewExpand] = useState<boolean>(true)
    useEffect(() => {
        setReviewExpand(reviewExpand)
    }, [reviewExpand])
    const handleExpand = useMemoizedFn(() => {
        setReviewExpand((old) => !old)
    })
    const renderFooter = useMemoizedFn((node) => {
        return (
            <div className={styles["review-footer-box"]}>
                <YakitButton
                    type='text2'
                    icon={expand ? <OutlineChevrondoubledownIcon /> : <OutlineChevrondoubleupIcon />}
                    onClick={handleExpand}
                >
                    {expand ? "隐藏，稍后审阅" : "展开审阅信息"}
                </YakitButton>
                {node}
            </div>
        )
    })
    return (
        <div className={styles["review-box"]}>
            <div
                className={classNames(styles["review-border-shadow"], {
                    [styles["review-mini"]]: !expand
                })}
            >
                <div className={styles["review-wrapper"]}>
                    <AIReActChatReview
                        info={reviewInfo}
                        onSendAI={handleSendTask}
                        planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
                        renderFooterExtra={renderFooter}
                        expand={expand}
                        className={styles["review-body"]}
                    />
                </div>
            </div>
        </div>
    )
})
