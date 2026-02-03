import React, {memo, useEffect, useRef, useState} from "react"
import {AIAgentChatMode, AIAgentChatProps, AIReActTaskChatReviewProps, HandleStartParams} from "./type"
import {useCreation, useMap, useMemoizedFn, useSafeState, useUpdateEffect} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"
import {AIAgentTriggerEventInfo} from "../aiAgentType"
import useAIAgentStore from "../useContext/useStore"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import useChatIPC from "@/pages/ai-re-act/hooks/useChatIPC"
import useAIAgentDispatcher from "../useContext/useDispatcher"
import cloneDeep from "lodash/cloneDeep"
import {randomString} from "@/utils/randomUtil"
import ChatIPCContent, {
    AIChatIPCSendParams,
    AISendConfigHotpatchParams,
    AISendSyncMessageParams,
    ChatIPCContextDispatcher,
    ChatIPCContextStore
} from "../useContext/ChatIPCContent/ChatIPCContent"
import {AIReActChatReview} from "@/pages/ai-agent/components/aiReActChatReview/AIReActChatReview"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineChevrondoubledownIcon,
    OutlineChevrondoubleupIcon,
    OutlineExitIcon,
    RedoDotIcon
} from "@/assets/icon/outline"
import {AIChatIPCStartParams, ChatIPCSendType, UseTaskChatState} from "@/pages/ai-re-act/hooks/type"
import useChatIPCDispatcher from "../useContext/ChatIPCContent/useDispatcher"
import useChatIPCStore from "../useContext/ChatIPCContent/useStore"
import {AIAgentGrpcApi, AIInputEvent, AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIChatQSData, AIReviewType} from "@/pages/ai-re-act/hooks/aiRender"
import {failed, yakitNotify} from "@/utils/notification"
import {AIForgeForm, AIToolForm} from "../aiTriageChatTemplate/AITriageChatTemplate"
import {grpcGetAIForge} from "../grpc"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {AIForge} from "../type/forge"
import {AITool} from "../type/aiTool"
import {AIChatContent} from "../aiChatContent/AIChatContent"
import {AITabsEnum, ReActChatEventEnum} from "../defaultConstant"
import {grpcGetAIToolById} from "../aiToolList/utils"
import {isEqual} from "lodash"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import useMultipleHoldGRPCStream from "@/pages/KnowledgeBase/hooks/useMultipleHoldGRPCStream"
import {useKnowledgeBase} from "@/pages/KnowledgeBase/hooks/useKnowledgeBase"
import {YakitRoute} from "@/enums/yakitRoute"
import {apiCancelDebugPlugin} from "@/pages/plugins/utils"
import {Tooltip} from "antd"
import {aiChatDataStore} from "@/pages/ai-agent/store/ChatDataStore"
import classNames from "classnames"
import styles from "./AIAgentChat.module.scss"
import {AIChatContentRefProps} from "../aiChatContent/type"
import {PageNodeItemProps} from "@/store/pageInfo"

const AIChatWelcome = React.lazy(() => import("../aiChatWelcome/AIChatWelcome"))

const taskChatIsEmpty = (taskChat?: UseTaskChatState) => {
    if (!taskChat) return false

    const isHavePlan = !!taskChat.plan.length
    const isHaveStreams = !!taskChat.elements?.length
    return isHavePlan || isHaveStreams
}

export const AIAgentChat: React.FC<AIAgentChatProps> = memo((props) => {
    const {} = props
    const {activeChat, setting} = useAIAgentStore()
    const {setChats, setActiveChat, getSetting} = useAIAgentDispatcher()

    const aiReActChatRef = useRef<AIChatContentRefProps>(null)
    const aiChatWelcomeRef = useRef<AIChatContentRefProps>(null)

    // 插件并发构建流 hooks
    const [streams, api] = useMultipleHoldGRPCStream()

    const [mode, setMode] = useState<AIAgentChatMode>("welcome")

    const handleStartTriageChat = useMemoizedFn((data: HandleStartParams) => {
        setMode("re-act")
        handleStart(data)
    })

    useEffect(() => {
        const chatData = aiChatDataStore.get(activeChat?.session || "")
        if (taskChatIsEmpty(chatData?.taskChat)) {
            onSetKeyTask()
        } else if (!!activeChat?.id) {
            onSetReAct()
        }
    }, [activeChat])

    useEffect(() => {
        if (mode === "welcome") {
            events.onReset()
        }
    }, [mode])

    /**自由对话中触发任务开始 */
    const handleTaskStart = useMemoizedFn(() => {
        onSetKeyTask()
    })

    const onSetKeyTask = useMemoizedFn(() => {
        setMode("task")
        setTimeout(() => {
            emiter.emit("switchAIActTab", JSON.stringify({key: AITabsEnum.Task_Content}))
        }, 100)
    })

    const onSetReAct = useMemoizedFn(() => {
        setMode("re-act")
        setTimeout(() => {
            emiter.emit("switchAIActTab", JSON.stringify({key: AITabsEnum.Task_Content}))
        }, 100)
    })

    // review数据中树的数据中需要的解释和关键词工具
    const [planReviewTreeKeywordsMap, {set: setPlanReviewTreeKeywords, reset: resetPlanReviewTreeKeywords}] = useMap<
        string,
        AIAgentGrpcApi.PlanReviewRequireExtra
    >(new Map())

    const [reviewInfo, setReviewInfo] = useState<AIChatQSData>()
    const [reviewExpand, setReviewExpand] = useState<boolean>(true)

    const handleShowReview = useMemoizedFn((info: AIChatQSData) => {
        setReviewExpand(true)
        setReviewInfo(cloneDeep(info))
    })
    const handleShowReviewExtra = useMemoizedFn((info: AIAgentGrpcApi.PlanReviewRequireExtra) => {
        setPlanReviewTreeKeywords(info.index, info)
    })
    const handleReleaseReview = useMemoizedFn((type: ChatIPCSendType, id: string) => {
        if (!reviewInfo) return
        if ((reviewInfo.data as AIReviewType).id === id) {
            // if (!delayLoading) yakitNotify("warning", "审阅自动执行，弹框将自动关闭")
            handleStopAfterChangeState()
        }
    })

    /** 当前对话唯一ID */
    const activeID = useCreation(() => {
        return activeChat?.session
    }, [activeChat])

    // 提问结束后缓存数据
    const handleChatingEnd = useMemoizedFn(() => {
        handleStopAfterChangeState()
    })

    const setSessionChatName = (session: string, name: string) => {
        setActiveChat?.((prev) => {
            if (!prev) return prev
            if (prev.session !== session) return prev
            return {...prev, name}
        })
        setChats?.((prev) => {
            const chatIndex = prev.findIndex((item) => item.session === session)
            if (chatIndex === -1) return prev
            const newChats = [...prev]
            newChats[chatIndex] = {...newChats[chatIndex], name}
            return newChats
        })
    }

    const [chatIPCData, events] = useChatIPC({
        onEnd: handleChatingEnd,
        onTaskReview: handleShowReview,
        onTaskReviewExtra: handleShowReviewExtra,
        onReviewRelease: handleReleaseReview,
        onTaskStart: handleTaskStart,
        getRequest: getSetting,
        setSessionChatName,
        cacheDataStore: aiChatDataStore
    })
    const {execute} = chatIPCData

    const handleStart = useMemoizedFn((value: HandleStartParams) => {
        setTimeout(() => {
            aiReActChatRef.current?.handleStart(value) // 等自由对话渲染出来再发送
        })
    })

    const handleSendCasual = useMemoizedFn((params: AIChatIPCSendParams) => {
        handleSendInteractiveMessage(params, "casual")
    })
    const handleSendTask = useMemoizedFn((params: AIChatIPCSendParams) => {
        handleSendInteractiveMessage(params, "task")
    })
    const handleSend = useMemoizedFn((params: AIChatIPCSendParams) => {
        handleSendInteractiveMessage(params, "")
    })
    /**发送 IsInteractiveMessage 消息 */
    const handleSendInteractiveMessage = useMemoizedFn((params: AIChatIPCSendParams, type: ChatIPCSendType) => {
        const {value, id, optionValue} = params
        if (!activeID) return
        if (!id) return

        const info: AIInputEvent = {
            IsInteractiveMessage: true,
            InteractiveId: id,
            InteractiveJSONInput: value
        }
        events.onSend({token: activeID, type, params: info, optionValue})
        handleStopAfterChangeState()
    })
    /**发送 IsSyncMessage 消息 */
    const handleSendSyncMessage = useMemoizedFn((data: AISendSyncMessageParams) => {
        if (!activeID) return
        const {syncType, SyncJsonInput, params} = data
        const info: AIInputEvent = {
            IsSyncMessage: true,
            SyncType: syncType,
            SyncJsonInput,
            Params: params,
            SyncID: randomString(8)
        }
        events.onSend({token: activeID, type: "", params: info})
    })

    /**发送 IsConfigHotpatch 消息 */
    const handleSendConfigHotpatch = useMemoizedFn((data: AISendConfigHotpatchParams) => {
        if (!activeID) return
        const {hotpatchType, params} = data
        const info: AIInputEvent = {
            IsConfigHotpatch: true,
            HotpatchType: hotpatchType,
            Params: params
        }
        events.onSend({token: activeID, type: "", params: info})
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
        getRemoteValue(RemoteAIAgentGV.AIAgentReplaceForgeNoPrompt)
            .then((res) => {
                const replace = res === "true"
                replaceForgeNoPromptCache.current = replace
                setReplaceForgeNoPrompt(replace)
            })
            .catch(() => {})
        getRemoteValue(RemoteAIAgentGV.AIAgentReplaceToolNoPrompt)
            .then((res) => {
                const replace = res === "true"
                replaceToolNoPromptCache.current = replace
                setReplaceToolNoPrompt(replace)
            })
            .catch(() => {})
        // ai-re-act 页面左侧侧边栏向 chatUI 发送的事件
        const onEvents = (res: string) => {
            try {
                const data = JSON.parse(res) as AIAgentTriggerEventInfo
                if (!data.type) return
                switch (data.type as ReActChatEventEnum) {
                    // 新开聊天对话窗
                    case ReActChatEventEnum.NEW_CHAT:
                        setActiveChat?.(undefined)
                        setTimeout(() => {
                            setMode("welcome")
                        }, 100)
                        break
                    // 替换当前使用的 forge 模板
                    case ReActChatEventEnum.OPEN_FORGE_FORM:
                        const {value: forgeValue} = data.params || {}
                        handleClearActiveTool()
                        handleTriggerExecForge(forgeValue, data.useForge)
                        break
                    // 替换当前使用的 ai tool
                    case ReActChatEventEnum.USE_AI_TOOL:
                        const {value: toolValue} = data.params || {}
                        handleClearActiveForge()
                        handleAITool(toolValue)
                        break

                    default:
                        break
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
        events.onSwitchChat(activeChat?.session)
    }, [activeChat])

    /**切换历史后的处理逻辑 */
    const onHistoryAfter = useMemoizedFn(() => {
        if (mode === "welcome") setMode("re-act")
    })

    //#region 使用 AI-Forge 模板/Tool 相关逻辑
    const [activeTool, setActiveTool] = useState<AITool>()
    const [replaceToolShow, setReplaceToolShow] = useState<boolean>(false)
    // 是否直接替换当前使用的tool，而不出现二次确认框
    const [replaceToolNoPrompt, setReplaceToolNoPrompt] = useState(false)

    const [activeForge, setActiveForge] = useState<AIForge>()
    const [replaceShow, setReplaceShow] = useState<boolean>(false)
    // 是否直接替换当前使用的forge模板，而不出现二次确认框
    const [replaceForgeNoPrompt, setReplaceForgeNoPrompt] = useState(false)

    const wrapperRef = useRef<HTMLDivElement>(null)
    const replaceForge = useRef<AIForge>()
    const replaceTool = useRef<AITool>()
    // 储存 replaceForgeNoPrompt 存放到缓存里值，阻止多次设置重复值
    const replaceForgeNoPromptCache = useRef(false)
    // 储存 replaceToolNoPrompt 存放到缓存里值，阻止多次设置重复值
    const replaceToolNoPromptCache = useRef(false)

    /** 从别的元素上触发使用 forge 模板的功能 */
    const handleTriggerExecForge = useMemoizedFn((forge: AIForge, useForge?: boolean) => {
        if (!forge || !forge.Id) {
            yakitNotify("error", "准备使用的模板数据异常，请稍后再试")
            return
        }
        if (!chatIPCData.execute) {
            handleReplaceActiveForge(forge, useForge)
        } else {
            const m = YakitModalConfirm({
                title: "切换forge模板",
                width: 420,
                footer: undefined,
                footerStyle: {padding: "0 24px 24px"},
                content: (
                    <div className={styles["forge-modal-content"]}>
                        是否<b>中断</b>当前正在进行的对话,使用
                        <b>
                            {forge.ForgeVerboseName}({forge.ForgeName})
                        </b>
                        forge模板?
                    </div>
                ),
                onOk: () => {
                    m.destroy()
                    onStop()
                    handleReplaceActiveForge(forge, useForge)
                },
                onCancel: () => {
                    m.destroy()
                }
            })
        }
    })

    const handleAITool = useMemoizedFn((toolValue: AITool) => {
        if (!toolValue || !toolValue.ID) {
            yakitNotify("error", "准备使用的工具数据异常，请稍后再试")
            return
        }
        if (!chatIPCData.execute) {
            handleReplaceActiveTool(toolValue.ID)
        } else {
            const m = YakitModalConfirm({
                title: "执行工具",
                width: 420,
                footer: undefined,
                footerStyle: {padding: "0 24px 24px"},
                content: (
                    <div className={styles["forge-modal-content"]}>
                        {!!chatIPCData.execute ? (
                            <>
                                是否<b>中断</b>当前正在进行的对话,使用
                                <b>
                                    {toolValue.VerboseName}({toolValue.Name})
                                </b>
                                forge模板?
                            </>
                        ) : (
                            <>
                                确定要执行{toolValue.VerboseName}({toolValue.Name})工具?
                            </>
                        )}
                    </div>
                ),
                onOk: () => {
                    m.destroy()
                    onStop()
                    handleReplaceActiveTool(toolValue.ID)
                },
                onCancel: () => {
                    m.destroy()
                }
            })
        }
    })

    const handleClearActiveForge = useMemoizedFn(() => {
        setActiveForge(undefined)
    })

    const handleClearActiveTool = useMemoizedFn(() => {
        setActiveTool(undefined)
    })

    const handleSubmitForge = useMemoizedFn((request: AIStartParams, formValue: AIChatIPCStartParams["extraValue"]) => {
        setMode("re-act")
        const userQuery = formValue?.UserQuery || ""
        const qs = `我要使用 ${request.ForgeName}forge执行任务${
            !!request.ForgeParams
                ? `,参数:${JSON.stringify(request.ForgeParams)}`
                : `${!!userQuery ? `,输入${userQuery!}` : ""}`
        }`
        handleStart({
            qs,
            extraValue: {
                isForge: true,
                showForgeQuestion: `我要使用 ${request.ForgeName}forge执行任务`,
                forgeParams: JSON.stringify(formValue, null, 2)
            }
        })
        handleClearActiveForge()
    })

    const handleSubmitTool = useMemoizedFn((question: string) => {
        if (!activeTool) {
            yakitNotify("warning", " tool 信息异常，请关闭重试")
            return
        }
        setMode("re-act")
        handleStart({
            qs: `我要使用 ${activeTool.VerboseName}(${activeTool.Name})工具执行任务${
                question ? `,输入${question}` : ""
            }`
        })
        handleClearActiveTool()
    })

    const handleReplaceActiveForge = useMemoizedFn(async (forge: AIForge, useForge?: boolean) => {
        try {
            const forgeID = Number(forge.Id) || 0
            if (!forgeID) {
                yakitNotify("error", `准备使用的模板异常: id('${forgeID}'), 操作失败`)
                return
            }
            let forgeInfo = cloneDeep(forge)
            if (!useForge) {
                let res = await grpcGetAIForge({ID: forgeID})
                forgeInfo = cloneDeep(res)
            }
            if (!activeForge) setActiveForge(forgeInfo)
            else {
                if (forgeInfo.Id === activeForge.Id) {
                    // 同一个forge模板, 检查名字和参数是否一至
                    let isReplace = false
                    isReplace = forgeInfo.ForgeName !== activeForge.ForgeName
                    isReplace = !isEqual(forgeInfo.ParamsUIConfig, activeForge.ParamsUIConfig)
                    if (isReplace) setActiveForge(forgeInfo)
                } else {
                    // 不同forge模板，弹出提示框是否替换
                    if (replaceForgeNoPrompt) {
                        setActiveForge({...forgeInfo})
                    } else {
                        replaceForge.current = {...forgeInfo}
                        if (!replaceForgeNoPromptCache.current) setReplaceShow(true)
                    }
                }
            }
        } catch (error) {}
    })
    const handleReplaceActiveTool = useMemoizedFn((id: number) => {
        const toolId = Number(id) || 0
        if (!toolId) {
            yakitNotify("error", `准备使用的工具异常: id('${id}'), 操作失败`)
            return
        }

        grpcGetAIToolById(toolId)
            .then((res) => {
                if (!res) return
                const toolInfo = cloneDeep(res)
                if (!activeTool) setActiveTool(toolInfo)
                else if (replaceToolNoPrompt) {
                    setActiveTool(toolInfo)
                } else {
                    replaceTool.current = {...toolInfo}
                    if (!replaceToolNoPromptCache.current) setReplaceToolShow(true)
                }
            })
            .catch(() => {})
    })
    const handleSetReplaceToolNoPrompt = useMemoizedFn(() => {
        if (replaceToolNoPrompt && !replaceToolNoPromptCache.current) {
            replaceToolNoPromptCache.current = true
            setRemoteValue(RemoteAIAgentGV.AIAgentReplaceToolNoPrompt, "true")
        }
    })

    const handleSetReplaceForgeNoPrompt = useMemoizedFn(() => {
        if (replaceForgeNoPrompt && !replaceForgeNoPromptCache.current) {
            replaceForgeNoPromptCache.current = true
            setRemoteValue(RemoteAIAgentGV.AIAgentReplaceForgeNoPrompt, "true")
        }
    })
    const handleReplaceOK = useMemoizedFn(() => {
        setActiveForge(cloneDeep(replaceForge.current))
        handleSetReplaceForgeNoPrompt()
        handleReplaceCancel()
    })
    const handleReplaceToolOK = useMemoizedFn(() => {
        setActiveTool(cloneDeep(replaceTool.current))
        handleSetReplaceToolNoPrompt()
        handleReplaceToolCancel()
    })
    const handleReplaceCancel = useMemoizedFn(() => {
        replaceForge.current = undefined
        setReplaceShow(false)
    })
    const handleReplaceToolCancel = useMemoizedFn(() => {
        replaceTool.current = undefined
        setReplaceToolShow(false)
    })
    // #endregion
    const store: ChatIPCContextStore = useCreation(() => {
        return {
            chatIPCData,
            planReviewTreeKeywordsMap,
            reviewInfo,
            reviewExpand
        }
    }, [chatIPCData, planReviewTreeKeywordsMap, reviewInfo, reviewExpand])
    const dispatcher: ChatIPCContextDispatcher = useCreation(() => {
        return {
            chatIPCEvents: events,
            handleSendCasual,
            handleSendTask,
            handleStop: onStop,
            handleSend,
            handleSendSyncMessage,
            handleSendConfigHotpatch
        }
    }, [events])

    const [visible, setVisible] = useSafeState(false)
    const {clearAll} = useKnowledgeBase()

    const onClosePageRepository = useMemoizedFn(() => {
        if (api.tokens.length > 0) {
            setVisible(true)
            return
        } else {
            clearAll()
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.AI_Agent}))
        }
    })

    useEffect(() => {
        emiter.on("onClosePageRepository", onClosePageRepository)
        return () => {
            emiter.off("onClosePageRepository", onClosePageRepository)
        }
    }, [])

    const onOK = async () => {
        try {
            await Promise.all(api.tokens.map((token) => apiCancelDebugPlugin(token)))
            api.clearAllStreams()
            clearAll()
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.AI_Agent}))
        } catch (e) {
            failed(`取消构建知识插件失败: ${e + ""}`)
        }
    }

    const onCancel = () => {
        setVisible(false)
    }

    const onChat = useMemoizedFn(() => {
        onSetReAct()
    })
    const onChatFromHistory = useMemoizedFn((session: string) => {
        aiChatDataStore.remove(session)
    })

    useEffect(() => {
        emiter.on("defualtAIMentionCommandParams", konwledgeInputStringFn)
        return () => {
            emiter.off("defualtAIMentionCommandParams", konwledgeInputStringFn)
        }
    }, [])

    const konwledgeInputStringFn = useMemoizedFn((params: string) => {
        const currentRef = mode === "welcome" ? aiChatWelcomeRef : aiReActChatRef
        try {
            const data: PageNodeItemProps["pageParamsInfo"]["AIRepository"] = JSON.parse(params)

            if (data?.defualtAIMentionCommandParams && Array.isArray(data.defualtAIMentionCommandParams)) {
                data.defualtAIMentionCommandParams.forEach((item) => {
                    currentRef.current?.setValue("")
                    currentRef.current?.setMention?.({
                        mentionId: item.mentionId,
                        mentionType: item.mentionType,
                        mentionName: item.mentionName
                    })
                })
            }
        } catch (error) {}
    })

    return (
        <div ref={wrapperRef} className={styles["ai-agent-chat"]}>
            <ChatIPCContent.Provider value={{store, dispatcher}}>
                <div className={styles["chat-wrapper"]}>
                    {mode === "welcome" ? (
                        <React.Suspense fallback={<div>loading...</div>}>
                            <AIChatWelcome
                                onTriageSubmit={handleStartTriageChat}
                                onSetReAct={onSetReAct}
                                api={api}
                                streams={streams}
                                ref={aiChatWelcomeRef}
                            />
                        </React.Suspense>
                    ) : (
                        <AIChatContent ref={aiReActChatRef} onChat={onChat} onChatFromHistory={onChatFromHistory} />
                    )}
                    <div className={styles["footer-forge-form"]}>
                        {activeForge && (
                            <AIForgeForm
                                wrapperRef={wrapperRef}
                                info={activeForge}
                                onBack={handleClearActiveForge}
                                onSubmit={handleSubmitForge}
                            />
                        )}
                        {activeTool && (
                            <AIToolForm
                                wrapperRef={wrapperRef}
                                info={activeTool}
                                onBack={handleClearActiveTool}
                                onSubmit={handleSubmitTool}
                            />
                        )}
                    </div>
                </div>
            </ChatIPCContent.Provider>
            <YakitHint
                getContainer={wrapperRef.current || undefined}
                visible={replaceShow}
                title='警告'
                content={"是否要替换当前使用的技能模板?"}
                footerExtra={
                    <YakitCheckbox
                        checked={replaceForgeNoPrompt}
                        onChange={(e) => setReplaceForgeNoPrompt(e.target.checked)}
                    >
                        不再提醒
                    </YakitCheckbox>
                }
                okButtonText='替换'
                onOk={handleReplaceOK}
                cancelButtonText='取消'
                onCancel={handleReplaceCancel}
            />
            <YakitHint
                getContainer={wrapperRef.current || undefined}
                visible={replaceToolShow}
                title='警告'
                content={"是否要替换当前使用的工具?"}
                footerExtra={
                    <YakitCheckbox
                        checked={replaceToolNoPrompt}
                        onChange={(e) => setReplaceToolNoPrompt(e.target.checked)}
                    >
                        不再提醒
                    </YakitCheckbox>
                }
                okButtonText='替换'
                onOk={handleReplaceToolOK}
                cancelButtonText='取消'
                onCancel={handleReplaceToolCancel}
            />
            <YakitHint
                visible={visible}
                // heardIcon={<OutlineLoadingIcon className={styles["icon-rotate-animation"]} />}
                title={"知识库未构建完成"}
                content={"知识未构建完成，是否确定关闭页面？"}
                okButtonText='立即关闭'
                onOk={() => onOK?.()}
                cancelButtonText='稍后再说'
                onCancel={onCancel}
            />
        </div>
    )
})

export const AIReActTaskChatReview: React.FC<AIReActTaskChatReviewProps> = React.memo((props) => {
    const {reviewInfo, planReviewTreeKeywordsMap, showCancelSubtask, onExtraAction} = props
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
                <div className={styles["review-footer-extra"]}>
                    {showCancelSubtask && (
                        <YakitPopconfirm
                            placement='top'
                            onConfirm={() => onExtraAction("stopSubTask")}
                            title='是否确认取消该子任务，取消后会按顺序执行下一个子任务'
                        >
                            <YakitButton type='outline2' icon={<RedoDotIcon />}>
                                跳过子任务
                            </YakitButton>
                        </YakitPopconfirm>
                    )}
                    {node}
                    <YakitPopconfirm
                        placement='top'
                        onConfirm={() => onExtraAction("stopTask")}
                        title='是否确认取消整个任务，确认将停止执行'
                    >
                        <Tooltip overlay='终止任务' placement='top'>
                            <YakitButton
                                className={styles["task-button"]}
                                radius='28px'
                                colors='danger'
                                type='primary'
                                icon={<OutlineExitIcon />}
                            />
                        </Tooltip>
                    </YakitPopconfirm>
                </div>
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
