import {Dispatch, SetStateAction, useMemo, forwardRef, useImperativeHandle, memo, useEffect} from "react"

import {KnowledgeBaseSidebar} from "./KnowledgeBaseSidebar"

import styles from "../knowledgeBase.module.scss"
import KnowledgeBaseContainer from "./KnowledgeBaseContainer"
import {KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {
    useAsyncEffect,
    useCreation,
    useDebounceFn,
    useDeepCompareEffect,
    useMap,
    useMemoizedFn,
    useSafeState,
    useUpdateEffect
} from "ahooks"
import {
    BuildingKnowledgeBase,
    BuildingKnowledgeBaseEntry,
    compareKnowledgeBaseChange,
    extractAddedHistory,
    findChangedObjects
} from "../utils"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"
import {failed, success, yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {apiCancelDebugPlugin} from "@/pages/plugins/utils"
import {BinaryInfo} from "./AllInstallPluginsProps"
import {KnowledgeBaseTableHeaderProps} from "./KnowledgeBaseTableHeader"
import {CreateKnowledgeBaseData} from "../TKnowledgeBase"

import ChatIPCContent, {
    AIChatIPCSendParams,
    AISendConfigHotpatchParams,
    AISendSyncMessageParams,
    ChatIPCContextDispatcher,
    ChatIPCContextStore
} from "../../ai-agent/useContext/ChatIPCContent/ChatIPCContent"
import {AIChatIPCNotifyMessage, ChatIPCSendType} from "../../ai-re-act/hooks/type"
import {AIAgentGrpcApi, AIInputEvent, AIStartParams} from "../../ai-re-act/hooks/grpcApi"
import useChatIPC from "@/pages/ai-re-act/hooks/useChatIPC"
import {AIChatQSData, AIReviewType} from "@/pages/ai-re-act/hooks/aiRender"
import {AIChatInfo} from "@/pages/ai-agent/type/aiChat"
import {AIAgentChatMode, HandleStartParams} from "@/pages/ai-agent/aiAgentChat/type"
import {formatAIAgentSetting} from "@/pages/ai-agent/utils"
import {cloneDeep} from "lodash"
import {AIAgentSettingDefault, AITabsEnum} from "@/pages/ai-agent/defaultConstant"
import useAINodeLabel from "@/pages/ai-re-act/hooks/useAINodeLabel"
import AIAgentContext, {AIAgentContextDispatcher, AIAgentContextStore} from "@/pages/ai-agent/useContext/AIAgentContext"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {AIAgentSetting} from "@/pages/ai-agent/aiAgentType"
import {AIReActChat} from "@/pages/ai-re-act/aiReActChat/AIReActChat"
import {getRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"

interface KnowledgeBaseContentProps {
    knowledgeBaseID: string
    setKnowledgeBaseID: Dispatch<SetStateAction<string>>
    knowledgeBases: KnowledgeBaseItem[]
    previousKnowledgeBases: KnowledgeBaseItem[] | null
    editKnowledgeBase: (id: string, data: Partial<KnowledgeBaseItem>) => void
    clearAll: () => void
    binariesToInstall: BinaryInfo[] | undefined
    apiRef: React.MutableRefObject<KnowledgeBaseTableHeaderProps["api"] | undefined>
    refreshAsync: () => Promise<CreateKnowledgeBaseData[] | undefined>
    binariesToInstallRefreshAsync?: () => Promise<any[]>
    inViewport: boolean
}

const KnowledgeBaseContent = forwardRef<unknown, KnowledgeBaseContentProps>(function KnowledgeBaseContent(props, ref) {
    const {
        knowledgeBaseID,
        setKnowledgeBaseID,
        knowledgeBases,
        previousKnowledgeBases,
        editKnowledgeBase,
        clearAll,
        binariesToInstall,
        apiRef,
        refreshAsync,
        binariesToInstallRefreshAsync,
        inViewport
    } = props
    const [showFreeChat, setShowFreeChat] = useSafeState(false)
    const [streams, api] = useMultipleHoldGRPCStream()

    const onOK = async () => {
        try {
            await Promise.all(api.tokens.map((token) => apiCancelDebugPlugin(token)))
            api.clearAllStreams()
            clearAll()
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.AI_REPOSITORY}))
        } catch (e) {
            failed(`关闭知识库页面失败: ${e + ""}`)
        }
    }

    // 每次变化时更新 ref
    useDeepCompareEffect(() => {
        apiRef.current = api
    }, [api])

    useAsyncEffect(async () => {
        const addManuallyItem = findChangedObjects(previousKnowledgeBases, knowledgeBases)
        // 对比知识库变化，有新增则启动构建
        const diff = compareKnowledgeBaseChange(previousKnowledgeBases, knowledgeBases)

        const targetKnowledgeBases = knowledgeBases.find((it) => it.ID === knowledgeBaseID) ?? {
            historyGenerateKnowledgeList: []
        }

        const targetPreviousKnowledgeBases = previousKnowledgeBases?.find((it) => it.ID === knowledgeBaseID) ?? {
            historyGenerateKnowledgeList: []
        }
        const addedHistory = targetPreviousKnowledgeBases
            ? extractAddedHistory(targetKnowledgeBases, targetPreviousKnowledgeBases)
            : null
        if (!previousKnowledgeBases?.length && knowledgeBases.length !== 1) return
        // 新增 知识库
        if (typeof diff === "object" && diff.increase) {
            const kb = diff.increase
            if (!kb.streamToken || !kb.KnowledgeBaseFile.length) {
                editKnowledgeBase(kb.ID, {
                    ...kb,
                    streamstep: "success"
                })
                return
            }
            try {
                await BuildingKnowledgeBase(kb)
                if (api && typeof api.createStream === "function") {
                    api.createStream(kb.streamToken, {
                        taskName: "debug-plugin",
                        apiKey: "DebugPlugin",
                        token: kb.streamToken,
                        onEnd: async (info) => {
                            api.removeStream && api.removeStream(kb.streamToken)
                            const targetItems = knowledgeBases.find(
                                (item) => item.streamToken && item.streamToken === info?.requestToken
                            )
                            if (targetItems) {
                                const newStreams = randomString(50)
                                const updateItems: KnowledgeBaseItem = {
                                    ...targetItems,
                                    streamstep: 2,
                                    streamToken: newStreams
                                }
                                editKnowledgeBase(targetItems.ID, updateItems)
                            }
                        },
                        onError: (err) => {
                            try {
                                api.removeStream && api.removeStream(kb.streamToken)
                            } catch {
                                failed(`知识库构建流失败: ${err}`)
                            }
                        }
                    })
                }
            } catch (e) {
                failed(`启动知识库构建失败: ${e}`)
            }
            return
        } else if (addManuallyItem) {
            const kb = addManuallyItem
            try {
                await BuildingKnowledgeBase(kb)
                if (api && typeof api.createStream === "function") {
                    api.createStream(kb.streamToken, {
                        taskName: "debug-plugin",
                        apiKey: "DebugPlugin",
                        token: kb.streamToken,
                        onEnd: async (info) => {
                            api.removeStream && api.removeStream(kb.streamToken)
                            const targetItems = knowledgeBases.find(
                                (item) => item.streamToken && item.streamToken === info?.requestToken
                            )
                            if (targetItems) {
                                const newStreams = randomString(50)
                                const updateItems: KnowledgeBaseItem = {
                                    ...targetItems,
                                    streamstep: 2,
                                    streamToken: newStreams
                                }
                                editKnowledgeBase(targetItems.ID, updateItems)
                            }
                        },
                        onError: (err) => {
                            try {
                                api.removeStream && api.removeStream(kb.streamToken)
                            } catch {
                                failed(`知识库构建流失败: ${err}`)
                            }
                        }
                    })
                }
            } catch (e) {
                failed(`启动知识库构建失败: ${e}`)
            }
            return
        } else if (addedHistory) {
            const generateKnowledge = {...targetKnowledgeBases, ...addedHistory}
            await BuildingKnowledgeBaseEntry({...generateKnowledge, streamToken: addedHistory.token})
            try {
                if (api && typeof api.createStream === "function") {
                    api.createStream(generateKnowledge.token, {
                        taskName: "debug-plugin",
                        apiKey: "DebugPlugin",
                        token: generateKnowledge.token,
                        onEnd: () => {
                            api.removeStream && api.removeStream(generateKnowledge.token)
                            success(generateKnowledge.name + "构建完成")
                            editKnowledgeBase(generateKnowledge.ID, {
                                ...targetKnowledgeBases,
                                historyGenerateKnowledgeList: targetKnowledgeBases.historyGenerateKnowledgeList.filter(
                                    (it) => it.token !== generateKnowledge.token
                                )
                            })
                        },
                        onError: (e) => {
                            try {
                                api.removeStream && api.removeStream(generateKnowledge.token)
                            } catch {
                                failed(`知识库条目构建流失败: ${e}`)
                            }
                        }
                    })
                }
            } catch (e) {
                failed(`知识库条目构建流失败: ${e}`)
            }
            return
        } else {
            try {
                for (const updateItems of knowledgeBases) {
                    if (updateItems.streamstep === 2 && updateItems.streamToken) {
                        await starKnowledgeeBaseEntry(updateItems)
                    }
                }
            } catch (error) {
                failed(error + "")
            }
        }
    }, [knowledgeBases, previousKnowledgeBases])

    const starKnowledgeeBaseEntry = useMemoizedFn(async (updateItems: KnowledgeBaseItem) => {
        try {
            await BuildingKnowledgeBaseEntry(updateItems)
            if (api && typeof api.createStream === "function") {
                api.createStream(updateItems.streamToken, {
                    taskName: "debug-plugin",
                    apiKey: "DebugPlugin",
                    token: updateItems.streamToken,
                    onEnd: () => {
                        api.removeStream && api.removeStream(updateItems.streamToken)
                        editKnowledgeBase(updateItems.ID, {
                            ...updateItems,
                            streamstep: "success"
                        })
                    },
                    onError: (e) => {
                        try {
                            api.removeStream && api.removeStream(updateItems.streamToken)
                        } catch {
                            failed(`知识库条目构建流失败: ${e}`)
                        }
                    }
                })
            }
        } catch (e) {
            failed(`知识库条目构建流失败: ${e}`)
        }
    })

    useImperativeHandle(ref, () => ({
        onOK
    }))

    const [reviewInfo, setReviewInfo] = useSafeState<AIChatQSData>()
    const [planReviewTreeKeywordsMap, {set: setPlanReviewTreeKeywords, reset: resetPlanReviewTreeKeywords}] = useMap<
        string,
        AIAgentGrpcApi.PlanReviewRequireExtra
    >(new Map())
    const [reviewExpand, setReviewExpand] = useSafeState<boolean>(true)
    const [timelineMessage, setTimelineMessage] = useSafeState<string>()

    const [mode, setMode] = useSafeState<AIAgentChatMode>("welcome")

    const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>(cloneDeep(AIAgentSettingDefault))

    // 历史对话
    const [chats, setChats, getChats] = useGetSetState<AIChatInfo[]>([])
    // 当前展示对话
    const [activeChat, setActiveChat] = useSafeState<AIChatInfo>()

    const {getLabelByParams} = useAINodeLabel()

    const handleSaveChatInfo = useMemoizedFn(() => {
        const showID = activeID
        // 如果是历史对话，只是查看，怎么实现点击新对话的功能呢
        if (showID && events.fetchToken() && showID === events.fetchToken()) {
            const answer: AIChatInfo["answer"] = {
                runTimeIDs: cloneDeep(runTimeIDs),
                taskChat: cloneDeep(taskChat),
                aiPerfData: cloneDeep(aiPerfData),
                casualChat: cloneDeep(casualChat),
                yakExecResult: cloneDeep({
                    ...yakExecResult,
                    execFileRecord: Array.from(yakExecResult.execFileRecord.entries())
                }),
                grpcFolders: cloneDeep(grpcFolders),
                reActTimelines: cloneDeep(reActTimelines)
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

    const handleChatingEnd = useMemoizedFn(() => {
        handleSaveChatInfo()
        handleStopAfterChangeState()
    })

    const handleShowReviewExtra = useMemoizedFn((info: AIAgentGrpcApi.PlanReviewRequireExtra) => {
        setPlanReviewTreeKeywords(info.index, info)
    })
    const handleShowReview = useMemoizedFn((info: AIChatQSData) => {
        setReviewExpand(true)
        setReviewInfo(cloneDeep(info))
    })

    const handleReleaseReview = useMemoizedFn((type: ChatIPCSendType, id: string) => {
        if (!reviewInfo) return
        if ((reviewInfo.data as AIReviewType).id === id) {
            // if (!delayLoading) yakitNotify("warning", "审阅自动执行，弹框将自动关闭")
            handleStopAfterChangeState()
        }
    })

    /**自由对话中触发任务开始 */
    const handleTaskStart = useMemoizedFn(() => {
        onSetKeyTask()
    })

    useEffect(() => {
        if (inViewport) {
            // 获取缓存的全局配置数据
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
        }
        return () => {}
    }, [inViewport])

    const onSetKeyTask = useMemoizedFn(() => {
        setMode("task")
        setTimeout(() => {
            emiter.emit("switchAIActTab", JSON.stringify({key: AITabsEnum.Task_Content}))
        }, 100)
    })

    const handleTimelineMessage = useDebounceFn(
        useMemoizedFn((value: string) => {
            setTimelineMessage(value)
        }),
        {wait: 300, leading: true}
    ).run

    const onNotifyMessage = useMemoizedFn((message: AIChatIPCNotifyMessage) => {
        const {NodeIdVerbose, Content} = message
        const verbose = getLabelByParams(NodeIdVerbose)
        yakitNotify("info", {
            message: verbose,
            description: Content
        })
    })

    const [chatIPCData, events] = useChatIPC({
        onEnd: handleChatingEnd,
        onTaskReview: handleShowReview,
        onTaskReviewExtra: handleShowReviewExtra,
        onReviewRelease: handleReleaseReview,
        onTaskStart: handleTaskStart,
        onTimelineMessage: handleTimelineMessage,
        getRequest: getSetting,
        onNotifyMessage
    })

    const {execute, runTimeIDs, aiPerfData, casualChat, taskChat, yakExecResult, grpcFolders, reActTimelines} =
        chatIPCData

    /** 停止回答后的状态调整||清空Review状态 */
    const handleStopAfterChangeState = useMemoizedFn(() => {
        // 清空review信息
        setReviewInfo(undefined)
        resetPlanReviewTreeKeywords()
        setReviewExpand(true)
    })

    /** 当前对话唯一ID */
    const activeID = useCreation(() => {
        return activeChat?.id
    }, [activeChat])

    const handleSendCasual = useMemoizedFn((params: AIChatIPCSendParams) => {
        handleSendInteractiveMessage(params, "casual")
    })

    const onSetReAct = useMemoizedFn(() => {
        setMode("re-act")
        setTimeout(() => {
            emiter.emit("switchAIActTab")
        }, 100)
    })

    const handleStart = useMemoizedFn(({qs, extraValue}: HandleStartParams) => {
        const name = knowledgeBases.find((it) => it.ID === knowledgeBaseID)?.KnowledgeBaseName

        const request: AIStartParams = {
            ...formatAIAgentSetting(setting),
            UserQuery: `请使用知识库${name}回答:` + qs,
            CoordinatorId: "",
            Sequence: 1
        }
        // 创建新的聊天记录
        const newChat: AIChatInfo = {
            id: knowledgeBaseID,
            name: qs || `AI Agent - ${new Date().toLocaleString()}`,
            question: qs,
            time: new Date().getTime(),
            request
        }
        setActiveChat && setActiveChat(newChat)
        setChats && setChats((old) => [...old, newChat])
        onSetReAct()
        // 发送初始化参数
        const startParams: AIInputEvent = {
            IsStart: true,
            Params: {
                ...request
            }
        }
        events.onStart({token: newChat.id, params: startParams, extraValue})
    })

    const onStop = useMemoizedFn(() => {
        if (execute && activeID) {
            events.onClose(activeID)
            handleStopAfterChangeState()
        }
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

    const handleSendTask = useMemoizedFn((params: AIChatIPCSendParams) => {
        handleSendInteractiveMessage(params, "task")
    })

    const handleSend = useMemoizedFn((params: AIChatIPCSendParams) => {
        handleSendInteractiveMessage(params, "")
    })

    /**发送 IsSyncMessage 消息 */
    const handleSendSyncMessage = useMemoizedFn((data: AISendSyncMessageParams) => {
        if (!activeID) return
        const {syncType, SyncJsonInput, params} = data
        const info: AIInputEvent = {
            IsSyncMessage: true,
            SyncType: syncType,
            SyncJsonInput,
            Params: params
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
            setTimelineMessage,
            handleSendSyncMessage,
            handleSendConfigHotpatch
        }
    }, [events])

    const stores: AIAgentContextStore = useMemo(() => {
        return {
            setting: setting,
            chats: chats,
            activeChat: activeChat
        }
    }, [setting, chats, activeChat])

    const dispatchers: AIAgentContextDispatcher = useMemo(() => {
        return {
            getSetting: getSetting,
            setSetting: setSetting,
            setChats: setChats,
            getChats: getChats,
            setActiveChat: setActiveChat
        }
    }, [])

    const createNewEvents = (id: string) => {
        setKnowledgeBaseID(id)
        onStop()
        const findChatsItems = chats.find((it) => it.id === id)
        handleSaveChatInfo()
        events.onReset()
        if (findChatsItems) {
            setActiveChat({...findChatsItems})
        } else {
            setActiveChat(undefined)
        }
    }

    return (
        <AIAgentContext.Provider value={{store: stores, dispatcher: dispatchers}}>
            <ChatIPCContent.Provider value={{store, dispatcher}}>
                <div className={styles["knowledge-base-body"]}>
                    <KnowledgeBaseSidebar
                        knowledgeBases={knowledgeBases}
                        knowledgeBaseID={knowledgeBaseID}
                        setKnowledgeBaseID={(id) => createNewEvents(id)}
                        api={api}
                        setOpenQA={setShowFreeChat}
                        binariesToInstall={binariesToInstall}
                        refreshAsync={refreshAsync}
                        binariesToInstallRefreshAsync={binariesToInstallRefreshAsync}
                    />
                    <KnowledgeBaseContainer
                        knowledgeBases={knowledgeBases}
                        knowledgeBaseID={knowledgeBaseID}
                        setKnowledgeBaseID={(id) => createNewEvents(id)}
                        streams={streams}
                        api={api}
                        setOpenQA={setShowFreeChat}
                    />
                    {showFreeChat ? (
                        <div style={{width: 520, borderRight: "1px solid var(--Colors-Use-Neutral-Border)"}}>
                            <AIReActChat
                                mode={"task"}
                                showFreeChat={showFreeChat}
                                setShowFreeChat={setShowFreeChat}
                                title='AI 召回'
                            />
                        </div>
                    ) : null}
                </div>
            </ChatIPCContent.Provider>
        </AIAgentContext.Provider>
    )
})

export default memo(KnowledgeBaseContent)
