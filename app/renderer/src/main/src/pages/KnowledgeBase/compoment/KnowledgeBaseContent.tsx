import {Dispatch, SetStateAction, useMemo, forwardRef, useImperativeHandle, memo, useEffect, useRef} from "react"

import {KnowledgeBaseSidebar} from "./KnowledgeBaseSidebar"

import styles from "../knowledgeBase.module.scss"
import KnowledgeBaseContainer from "./KnowledgeBaseContainer"
import {KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {useAsyncEffect, useCreation, useDeepCompareEffect, useMemoizedFn, useSafeState, useUpdateEffect} from "ahooks"
import {
    BuildingKnowledgeBase,
    BuildingKnowledgeBaseEntry,
    checkAIModelAvailability,
    compareKnowledgeBaseChange,
    extractAddedHistory,
    findChangedObjects
} from "../utils"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"
import {failed, success} from "@/utils/notification"
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
    ChatIPCContextStore,
    defaultDispatcherOfChatIPC
} from "../../ai-agent/useContext/ChatIPCContent/ChatIPCContent"
import {ChatIPCSendType} from "../../ai-re-act/hooks/type"
import {AIInputEvent, AIStartParams} from "../../ai-re-act/hooks/grpcApi"
import useChatIPC from "@/pages/ai-re-act/hooks/useChatIPC"
import {AIChatData, AIChatInfo} from "@/pages/ai-agent/type/aiChat"
import {HandleStartParams} from "@/pages/ai-agent/aiAgentChat/type"
import {formatAIAgentSetting, getAIReActRequestParams} from "@/pages/ai-agent/utils"
import {cloneDeep} from "lodash"
import {AIAgentSettingDefault} from "@/pages/ai-agent/defaultConstant"
import AIAgentContext, {AIAgentContextDispatcher, AIAgentContextStore} from "@/pages/ai-agent/useContext/AIAgentContext"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {AIAgentSetting} from "@/pages/ai-agent/aiAgentType"
import {AIReActChat} from "@/pages/ai-re-act/aiReActChat/AIReActChat"
import {getRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {KnowledgeBaseFormModal} from "./KnowledgeBaseFormModal"
import {Form, Progress} from "antd"
import {ImportModal} from "./ImportModal"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {AIChatTextareaRefProps} from "@/pages/ai-agent/template/type"
import {v4 as uuidv4} from "uuid"
import {knowledgeBaseDataStore} from "@/pages/ai-agent/store/ChatDataStore"

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
    streamsRef: React.MutableRefObject<KnowledgeBaseTableHeaderProps["streams"] | undefined>
    loading: boolean
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
        inViewport,
        loading
    } = props
    const [showFreeChat, setShowFreeChat] = useSafeState(false)
    const [streams, api] = useMultipleHoldGRPCStream()

    const [addMode, setAddMode] = useSafeState<string[]>(["manual"])
    const [isAIModelAvailable, setIsAIModelAvailable] = useSafeState(false)
    const [aIModelAvailableTokens, setAIModelAvailableTokens] = useSafeState("")
    const [progress, setProgress] = useSafeState(0)

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

    // 知识库可用诊断 callback
    const handleValidateAIModelUsable = useMemoizedFn(async () => {
        try {
            const streamToken = randomString(50)
            setAIModelAvailableTokens(streamToken)
            const plugin = await grpcFetchLocalPluginDetail({Name: "知识库可用性诊断"}, true)
            await checkAIModelAvailability(plugin, streamToken)

            api?.createStream(streamToken, {
                taskName: "debug-plugin",
                apiKey: "DebugPlugin",
                autoClear: false,
                token: streamToken,
                onEnd: async () => {
                    setProgress(100)
                    success("知识库可用诊断完成")
                },
                onError: (e) => {
                    setProgress(100)
                }
            })
        } catch (error) {
            failed(error + "")
        }
    })

    useUpdateEffect(() => {
        if (streams[aIModelAvailableTokens]?.progressState?.[0]?.progress) {
            setProgress(Math.round(streams[aIModelAvailableTokens]?.progressState?.[0]?.progress * 100))
        }
    }, [streams[aIModelAvailableTokens]?.progressState?.[0]?.progress])
    useUpdateEffect(() => {
        if (progress === 100 && !isAIModelAvailable) {
            api.removeStream && api.removeStream(aIModelAvailableTokens)
        }
    }, [progress, isAIModelAvailable])

    useEffect(() => {
        handleValidateAIModelUsable()
    }, [])

    // 每次变化时更新 ref
    useDeepCompareEffect(() => {
        apiRef.current = api
    }, [api])

    //  构建任务防重复
    const buildingSetRef = useRef<Set<string>>(new Set())

    // 知识库构建
    const buildKnowledgeBase = useMemoizedFn(async (kb: KnowledgeBaseItem) => {
        const key = `kb:${kb.ID}`
        if (buildingSetRef.current.has(key)) return
        buildingSetRef.current.add(key)

        try {
            await BuildingKnowledgeBase(kb)

            if (!api?.createStream || !kb.streamToken) return

            api.createStream(kb.streamToken, {
                taskName: "debug-plugin",
                apiKey: "DebugPlugin",
                token: kb.streamToken,
                onEnd: (info) => {
                    api.removeStream?.(kb.streamToken)
                    buildingSetRef.current.delete(key)

                    const target = knowledgeBases.find((it) => it.streamToken === info?.requestToken)
                    if (!target) return

                    editKnowledgeBase(target.ID, {
                        ...target,
                        streamstep: 2,
                        streamToken: randomString(50)
                    })
                },
                onError: (e) => {
                    buildingSetRef.current.delete(key)
                    api.removeStream?.(kb.streamToken)
                    editKnowledgeBase(kb.ID, {...kb, streamstep: "success"})
                }
            })
        } catch (e) {
            buildingSetRef.current.delete(key)
            failed(`启动知识库构建失败: ${e}`)
        }
    })

    // 知识库条目构建
    const buildKnowledgeEntry = useMemoizedFn(async (kb: KnowledgeBaseItem, history: any) => {
        const key = `entry:${history.token}`
        if (buildingSetRef.current.has(key)) return
        buildingSetRef.current.add(key)

        try {
            // 仅在未禁用 ERM 时才执行构建
            if (!kb.disableERM) {
                await BuildingKnowledgeBaseEntry({
                    ...kb,
                    ...history,
                    streamToken: history.token
                })
            } else {
                // editKnowledgeBase(kb.ID, {
                //     ...kb,
                //     historyGenerateKnowledgeList: kb.historyGenerateKnowledgeList.filter(
                //         (it) => it.token !== history.token
                //     )
                // })
                return
            }

            if (!api?.createStream) return

            api.createStream(history.token, {
                taskName: "debug-plugin",
                apiKey: "DebugPlugin",
                token: history.token,
                onEnd: () => {
                    api.removeStream?.(history.token)
                    buildingSetRef.current.delete(key)
                    success(history.name + "构建完成")

                    editKnowledgeBase(kb.ID, {
                        ...kb,
                        historyGenerateKnowledgeList: kb.historyGenerateKnowledgeList.filter(
                            (it) => it.token !== history.token
                        )
                    })
                },
                onError: (e) => {
                    buildingSetRef.current.delete(key)
                    api.removeStream?.(history.token)
                }
            })
        } catch (e) {
            buildingSetRef.current.delete(key)
            failed(`启动知识库条目构建失败: ${e + ""}`)
        }
    })

    //  新增 / 手动新增知识库
    useAsyncEffect(async () => {
        try {
            if (!previousKnowledgeBases) return

            const diff = compareKnowledgeBaseChange(previousKnowledgeBases, knowledgeBases)
            const manualAdd = findChangedObjects(previousKnowledgeBases, knowledgeBases)

            const kb =
                diff && typeof diff === "object" && "increase" in diff && diff.increase ? diff.increase : manualAdd
            if (!kb) return

            if (!kb.streamToken || !kb.KnowledgeBaseFile?.length) {
                editKnowledgeBase(kb.ID, {...kb, streamstep: "success"})
                return
            }

            await buildKnowledgeBase(kb)
        } catch (error) {
            failed(error + "")
        }
    }, [knowledgeBases, previousKnowledgeBases])

    useAsyncEffect(async () => {
        if (!previousKnowledgeBases) return

        for (const kb of knowledgeBases) {
            const prev = previousKnowledgeBases.find((it) => it.ID === kb.ID)
            if (!prev) continue

            const added = extractAddedHistory(kb, prev)
            if (added) {
                await buildKnowledgeEntry(kb, added)
            }
        }
    }, [knowledgeBases, previousKnowledgeBases])

    useAsyncEffect(async () => {
        try {
            for (const kb of knowledgeBases) {
                if (kb.streamstep === 2 && kb.streamToken && !kb.disableERM) {
                    await starKnowledgeeBaseEntry(kb)
                }
            }
        } catch (error) {
            failed(error + "")
        }
    }, [knowledgeBases])

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
                    onError: () => {
                        try {
                            editKnowledgeBase(updateItems.ID, {
                                ...updateItems,
                                streamstep: "success"
                            })
                            api.removeStream && api.removeStream(updateItems.streamToken)
                        } catch {}
                    }
                })
            }
        } catch (e) {}
    })

    useImperativeHandle(ref, () => ({
        onOK
    }))

    const [createVisible, setCreateVisible] = useSafeState(false)
    const [importVisible, setImportVisible] = useSafeState(false)
    const [form] = Form.useForm()

    const handleCreateKnowledgeBase = useMemoizedFn(() => {
        form.resetFields()
        setCreateVisible((preValue) => !preValue)
    })

    // TODO  AI 召回逻辑

    // #region 问题相关逻辑
    const aiChatTextareaRef = useRef<AIChatTextareaRefProps>(null)

    const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>(cloneDeep(AIAgentSettingDefault))

    // 历史对话
    const [chats, setChats, getChats] = useGetSetState<AIChatInfo[]>([])
    // 当前展示对话
    const [activeChat, setActiveChat] = useSafeState<AIChatInfo>()

    const handleChatingEnd = useMemoizedFn(() => {
        handleSaveChatInfo()
    })

    const [chatIPCData, events] = useChatIPC({
        onEnd: handleChatingEnd,
        getRequest: getSetting,
        saveChatDataStore: knowledgeBaseDataStore.set
    })

    const {
        execute,
        runTimeIDs,
        aiPerfData,
        casualChat,
        taskChat,
        yakExecResult,
        grpcFolders,
        reActTimelines,
        coordinatorIDs
    } = chatIPCData

    const handleSaveChatInfo = useMemoizedFn(() => {
        const showID = activeID
        // 如果是历史对话，只是查看，怎么实现点击新对话的功能呢
        if (showID && events.fetchToken() && showID === events.fetchToken()) {
            const answer: AIChatData = {
                runTimeIDs: cloneDeep(runTimeIDs),
                coordinatorIDs: cloneDeep(coordinatorIDs),
                yakExecResult: cloneDeep(yakExecResult),
                aiPerfData: cloneDeep(aiPerfData),
                casualChat: cloneDeep(casualChat),
                taskChat: cloneDeep(taskChat),
                grpcFolders: cloneDeep(grpcFolders),
                reActTimelines: cloneDeep(reActTimelines)
            }
            knowledgeBaseDataStore.set(showID, answer)
        }
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

    /** 当前对话唯一ID */
    const activeID = useCreation(() => {
        return activeChat?.session
    }, [activeChat])

    const handleSendCasual = useMemoizedFn((params: AIChatIPCSendParams) => {
        handleSendInteractiveMessage(params, "casual")
    })

    const handleStart = useMemoizedFn((data: HandleStartParams) => {
        const {qs} = data
        const sessionID = activeChat?.session || ""
        const request: AIStartParams = {
            ...formatAIAgentSetting(setting),
            UserQuery: qs,
            CoordinatorId: "",
            Sequence: 1
        }
        // 设置会话的session
        const session: string = request.TimelineSessionID
            ? request.TimelineSessionID
            : uuidv4().replace(/-/g, "").substring(0, 16)
        let newChat: AIChatInfo
        if (!sessionID) {
            if (!request.TimelineSessionID) request.TimelineSessionID = session
            // 创建新的聊天记录
            newChat = {
                id: knowledgeBaseID,
                name: qs || `AI Agent - ${new Date().toLocaleString()}`,
                question: qs,
                time: new Date().getTime(),
                request,
                session: session
            }
            setActiveChat && setActiveChat(newChat)
            setChats && setChats((old) => [...old, newChat])
        } else {
            newChat = activeChat as AIChatInfo
            knowledgeBaseDataStore.remove(newChat.session)
        }
        const {extra, attachedResourceInfo} = getAIReActRequestParams(data)

        // 发送初始化参数
        const startParams: AIInputEvent = {
            IsStart: true,
            Params: {
                ...request
            },
            AttachedResourceInfo: attachedResourceInfo,
            FocusModeLoop: data.focusMode
        }

        events.onStart({token: newChat.session, params: startParams, extraValue: extra})

        Promise.resolve().then(() => {
            handleSendAfter()
        })
    })

    const onStop = useMemoizedFn(() => {
        if (execute && activeID) {
            events.onClose(activeID)
            knowledgeBaseDataStore.set(activeID, chatIPCData)
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
        return {
            chatIPCData,
            planReviewTreeKeywordsMap: new Map(),
            reviewExpand: false
        }
    }, [chatIPCData])

    const dispatcher: ChatIPCContextDispatcher = useCreation(() => {
        return {
            ...defaultDispatcherOfChatIPC,
            chatIPCEvents: events,
            handleSendCasual,
            handleSaveChatInfo,
            handleStart,
            handleStop: onStop,
            handleSend,
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
            setActiveChat: setActiveChat,

            getChatData: knowledgeBaseDataStore.get
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

    useUpdateEffect(() => {
        if (showFreeChat) {
            handleSendAfter()
        }
    }, [showFreeChat, knowledgeBaseID])

    const [refreshOlineRag, setRefreshOlineRag] = useSafeState(false)

    const handleSendAfter = () => {
        const targetKnowledgeBase = knowledgeBases.find((it) => it.ID === knowledgeBaseID)
        if (!!targetKnowledgeBase) {
            setTimeout(() => {
                aiChatTextareaRef.current?.setMention({
                    mentionId: targetKnowledgeBase.ID,
                    mentionType: "knowledgeBase",
                    mentionName: targetKnowledgeBase.KnowledgeBaseName
                })
            })
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
                        streams={streams}
                        setOpenQA={setShowFreeChat}
                        binariesToInstall={binariesToInstall}
                        refreshAsync={refreshAsync}
                        binariesToInstallRefreshAsync={binariesToInstallRefreshAsync}
                        setAddMode={setAddMode}
                        addMode={addMode}
                        handleValidateAIModelUsable={handleValidateAIModelUsable}
                        isAIModelAvailable={isAIModelAvailable}
                        setIsAIModelAvailable={setIsAIModelAvailable}
                        aIModelAvailableTokens={aIModelAvailableTokens}
                        progress={progress}
                        loading={loading}
                        refreshOlineRag={refreshOlineRag}
                        setRefreshOlineRag={setRefreshOlineRag}
                    />
                    {knowledgeBaseID ? (
                        <KnowledgeBaseContainer
                            knowledgeBases={knowledgeBases}
                            knowledgeBaseID={knowledgeBaseID}
                            setKnowledgeBaseID={(id) => createNewEvents(id)}
                            streams={streams}
                            api={api}
                            setOpenQA={setShowFreeChat}
                            addMode={addMode}
                            setRefreshOlineRag={setRefreshOlineRag}
                        />
                    ) : (
                        <div className={styles["knowledge-base-container-empty"]}>
                            <YakitEmpty />
                            <div className={styles["empty-button"]}>
                                <YakitButton onClick={() => handleCreateKnowledgeBase()}>创建知识库</YakitButton>
                                <YakitButton
                                    type='outline2'
                                    onClick={() => {
                                        setImportVisible((prevalue) => !prevalue)
                                    }}
                                >
                                    导入知识库
                                </YakitButton>
                            </div>
                        </div>
                    )}

                    {showFreeChat ? (
                        <div style={{width: 520, borderRight: "1px solid var(--Colors-Use-Neutral-Border)"}}>
                            <AIReActChat
                                key={knowledgeBaseID}
                                mode={"task"}
                                showFreeChat={showFreeChat}
                                setShowFreeChat={setShowFreeChat}
                                title='AI 召回'
                                aiChatTextareaRef={aiChatTextareaRef}
                                handleSendAfter={handleSendAfter}
                            />
                        </div>
                    ) : null}
                </div>
                <KnowledgeBaseFormModal
                    visible={createVisible}
                    title='新增知识库'
                    handOpenKnowledgeBasesModal={handleCreateKnowledgeBase}
                    setKnowledgeBaseID={setKnowledgeBaseID}
                    form={form}
                    setAddMode={setAddMode}
                />
                <ImportModal visible={importVisible} onVisible={setImportVisible} setAddMode={setAddMode} />
                {streams[aIModelAvailableTokens] ? (
                    <YakitModal
                        getContainer={document.getElementById("repository-manage") || document.body}
                        maskClosable={false}
                        visible={isAIModelAvailable}
                        title='知识库可用诊断'
                        footer={
                            <div style={{display: "flex", justifyContent: "flex-end", width: "100%"}}>
                                <YakitButton
                                    type='outline2'
                                    colors='danger'
                                    onClick={() => {
                                        setIsAIModelAvailable(false)
                                        api.removeStream && api.removeStream(aIModelAvailableTokens)
                                        setProgress(100)
                                    }}
                                >
                                    停止
                                </YakitButton>
                            </div>
                        }
                        width={"50%"}
                        onCloseX={() => {
                            if (progress === 100) {
                                api.removeStream && api.removeStream(aIModelAvailableTokens)
                            }
                            setIsAIModelAvailable(false)
                        }}
                    >
                        <Progress style={{display: "flex", gap: 8, alignItems: "center"}} percent={progress} />
                        <div className={styles["validate-ai-model-container"]}>
                            <PluginExecuteResult
                                streamInfo={streams[aIModelAvailableTokens]}
                                runtimeId={streams[aIModelAvailableTokens]?.runtimeId ?? ""}
                                loading={streams[aIModelAvailableTokens]?.loading ?? false}
                                defaultActiveKey='日志'
                            />
                        </div>
                    </YakitModal>
                ) : null}
            </ChatIPCContent.Provider>
        </AIAgentContext.Provider>
    )
})

export default memo(KnowledgeBaseContent)
