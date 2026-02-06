import React, {Dispatch, SetStateAction, useMemo, forwardRef, useImperativeHandle, memo, useEffect, useRef} from "react"

import {KnowledgeBaseSidebar} from "./KnowledgeBaseSidebar"

import styles from "../knowledgeBase.module.scss"
import KnowledgeBaseContainer from "./KnowledgeBaseContainer"
import {KnowledgeBaseItem} from "../hooks/useKnowledgeBase"
import {
    useAsyncEffect,
    useCreation,
    useDebounceEffect,
    useDeepCompareEffect,
    useInViewport,
    useMemoizedFn,
    useSafeState,
    useUpdateEffect
} from "ahooks"
import {
    BuildingKnowledgeBase,
    BuildingKnowledgeBaseEntry,
    checkAIModelAvailability,
    compareKnowledgeBaseChange,
    extractAddedHistory,
    extractStreamTokenChangedItem,
    findChangedObjects,
    joyrideSteps,
    stopList
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
import {AIInputEvent} from "../../ai-re-act/hooks/grpcApi"
import useChatIPC from "@/pages/ai-re-act/hooks/useChatIPC"
import {AIChatInfo} from "@/pages/ai-agent/type/aiChat"
import {cloneDeep} from "lodash"
import {AIAgentSettingDefault} from "@/pages/ai-agent/defaultConstant"
import AIAgentContext, {AIAgentContextDispatcher, AIAgentContextStore} from "@/pages/ai-agent/useContext/AIAgentContext"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {AIAgentSetting} from "@/pages/ai-agent/aiAgentType"
import {AIReActChat} from "@/pages/ai-re-act/aiReActChat/AIReActChat"
import {getLocalValue, getRemoteValue, setLocalValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {KnowledgeBaseFormModal} from "./KnowledgeBaseFormModal"
import {Form, Progress, Tooltip} from "antd"
import {ImportModal} from "./ImportModal"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {knowledgeBaseDataStore} from "@/pages/ai-agent/store/ChatDataStore"
import {
    AIHandleStartExtraProps,
    AIHandleStartParams,
    AIHandleStartResProps,
    AIReActChatRefProps,
    AISendParams,
    AISendResProps
} from "@/pages/ai-re-act/aiReActChat/AIReActChatType"
import Joyride, {ACTIONS, CallBackProps, STATUS} from "react-joyride"
import {CustomJoyrideTooltip} from "./CustomJoyrideTooltip/CustomJoyrideTooltip"
import {KnowledgeBaseGV} from "@/yakitGV"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {GuideFooter} from "./GuideFooter"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {OutlineXIcon} from "@/assets/icon/outline"
import {OutlinePlusIcon} from "@/assets/newIcon"
import {HoldGRPCStreamInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"

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

const hasStatusError = (state: HoldGRPCStreamInfo): boolean => {
    return (
        state?.cardState
            ?.find((item) => item.tag === "status")
            ?.info?.some((it) => typeof it.Data === "string" && it.Data.includes("ERR:")) ?? false
    )
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

    useDebounceEffect(() => {
        if (streams[aIModelAvailableTokens]?.progressState?.[0]?.progress) {
            setProgress(Math.round(streams[aIModelAvailableTokens]?.progressState?.[0]?.progress * 100))
        }
    }, [streams[aIModelAvailableTokens]?.progressState?.[0]?.progress])

    useDebounceEffect(() => {
        if (hasStatusError(streams[aIModelAvailableTokens])) {
            setProgress(100)
        }
    }, [streams[aIModelAvailableTokens]?.cardState])

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
                    if (target.disableERM === "true") {
                        editKnowledgeBase(target.ID, {...target, streamstep: "success"})
                    } else {
                        editKnowledgeBase(target.ID, {
                            ...target,
                            streamstep: 2,
                            streamToken: randomString(50)
                        })
                    }
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
            await BuildingKnowledgeBaseEntry({
                ...kb,
                ...history,
                streamToken: history.token
            })
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
                        streamstep: "success",
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

    useAsyncEffect(async () => {
        if (!previousKnowledgeBases) return

        try {
            for (const kb of knowledgeBases) {
                const prev = previousKnowledgeBases.find((it) => it.ID === kb.ID)
                if (!prev) continue

                const added = extractAddedHistory(kb, prev)
                if (added) {
                    await buildKnowledgeEntry(kb, added)
                }

                if (prev.streamToken !== undefined && kb.streamToken !== prev.streamToken) {
                    const extractStreamItem = extractStreamTokenChangedItem(knowledgeBases, previousKnowledgeBases)
                    await buildKnowledgeEntry(kb, {
                        ...extractStreamItem,
                        token: extractStreamItem.streamToken,
                        name: extractStreamItem.KnowledgeBaseName
                    })
                }
            }
        } catch (error) {}
    }, [knowledgeBases, previousKnowledgeBases])

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
    const aiReActChatRef = useRef<AIReActChatRefProps>(null)

    const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>(cloneDeep(AIAgentSettingDefault))

    // 历史对话
    const [chats, setChats, getChats] = useGetSetState<AIChatInfo[]>([])
    // 当前展示对话
    const [activeChat, setActiveChat] = useSafeState<AIChatInfo>()

    const [chatIPCData, events] = useChatIPC({
        getRequest: getSetting,
        cacheDataStore: knowledgeBaseDataStore
    })

    const {execute} = chatIPCData

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

    const onStartRequest = useMemoizedFn((data: AIHandleStartParams) => {
        const newChat: AIHandleStartExtraProps = {
            chatId: knowledgeBaseID
        }
        return new Promise<AIHandleStartResProps>((resolve) => {
            resolve({
                params: data.params,
                extraParams: newChat,
                onChatFromHistory
            })
        }).finally(() => {
            Promise.resolve().then(() => {
                handleSendAfter()
            })
        })
    })
    const onChatFromHistory = useMemoizedFn((session: string) => {})

    const onStop = useMemoizedFn(() => {
        if (execute && activeID) {
            events.onClose(activeID)
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
            setActiveChat: setActiveChat
        }
    }, [])

    const createNewEvents = (id: string) => {
        setKnowledgeBaseID(id)
        onStop()
        const findChatsItems = chats.find((it) => it.id === id)
        events.onReset()
        if (findChatsItems) {
            setActiveChat({...findChatsItems})
        } else {
            setActiveChat(undefined)
        }
    }

    useEffect(() => {
        if (!showFreeChat || !knowledgeBaseID) return

        handleSendAfter()
    }, [showFreeChat, knowledgeBaseID])

    useEffect(() => {
        if (inViewport) {
            queueMicrotask(() => {
                aiReActChatRef.current?.setValue("")
                handleSendAfter()
            })
        }
    }, [inViewport])

    const [refreshOlineRag, setRefreshOlineRag] = useSafeState(false)

    // 跳转 ai agent 所需携带参数
    const generatreMention = useMemoizedFn(() => {
        const targetKnowledgeBase = knowledgeBases.find((it) => it.ID === knowledgeBaseID)
        if (!targetKnowledgeBase) return

        queueMicrotask(() => {
            aiReActChatRef.current?.setMention({
                mentionId: targetKnowledgeBase.ID,
                mentionType: "knowledgeBase",
                mentionName: targetKnowledgeBase.KnowledgeBaseName,
                lock: true
            })
        })
    })

    const handleSendAfter = useMemoizedFn(() => {
        requestAnimationFrame(() => {
            generatreMention()
        })
    })

    const onSendRequest = useMemoizedFn((data: AISendParams) => {
        return new Promise<AISendResProps>((resolve) => {
            resolve({
                params: data.params
            })
        }).finally(() => {
            handleSendAfter()
        })
    })

    const refRef = useRef<HTMLDivElement>(null)
    const [run, setRun] = useSafeState(false)
    const [knowledgeBaseContentViewport = false] = useInViewport(refRef)
    const [joyrideStep, setJoyrideStep] = useSafeState({
        step: 1,
        visible: false
    })

    const [spinning, setSpinning] = useSafeState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setSpinning(false)
        }, 2000)

        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        getLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideVisible).then((res) => {
            if (knowledgeBaseContentViewport && inViewport && !res) {
                setJoyrideStep({step: 1, visible: true})
            }
        })
    }, [knowledgeBaseContentViewport, inViewport])

    // Joyride 回调
    const handleJoyrideCallback = (data: CallBackProps) => {
        const {status, action} = data
        if (action === ACTIONS.CLOSE) {
            setRun(false)
            setLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideStep, true)
            return
        }

        if (status === STATUS.SKIPPED) {
            setRun(true)
        }
        if (status === STATUS.READY || status === STATUS.FINISHED) {
            setLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideStep, true)
        }
    }

    useAsyncEffect(async () => {
        try {
            const visible = await getLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideVisible)
            const step = await getLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideStep)
            if (knowledgeBaseContentViewport && inViewport) {
                if (!visible && !step) {
                    return setRun(false)
                } else if (visible && !step) {
                    return setRun(true)
                } else {
                    return setRun(false)
                }
            }
        } catch (error) {}
    }, [knowledgeBaseContentViewport, joyrideStep.visible, inViewport])

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "calc(100% - 462px)",
            secondRatio: "462px"
        }
        if (!showFreeChat) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [showFreeChat])
    return (
        <AIAgentContext.Provider value={{store: stores, dispatcher: dispatchers}}>
            <ChatIPCContent.Provider value={{store, dispatcher}}>
                <div className={styles["knowledge-base-body"]} ref={refRef}>
                    <Joyride
                        steps={joyrideSteps}
                        run={run}
                        continuous={true}
                        disableCloseOnEsc={true}
                        disableOverlayClose
                        showSkipButton={false}
                        showProgress={false}
                        disableScrolling
                        callback={handleJoyrideCallback}
                        disableScrollParentFix={true}
                        tooltipComponent={CustomJoyrideTooltip}
                    />
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

                    <YakitResizeBox
                        lineStyle={{
                            backgroundColor: !!showFreeChat ? "var(--Colors-Use-Neutral-Bg)" : "none",
                            display: !!showFreeChat ? "" : "none"
                        }}
                        secondMinSize={0}
                        style={{display: "flex"}}
                        lineDirection='left'
                        secondNodeStyle={{
                            width: showFreeChat ? "462px" : "0%",
                            padding: "0"
                        }}
                        firstNode={
                            knowledgeBaseID ? (
                                <div className={styles["knowledge-base-table-container"]}>
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
                                </div>
                            ) : (
                                <div className={styles["knowledge-base-container-empty"]}>
                                    <YakitEmpty />
                                    <div className={styles["empty-button"]}>
                                        <YakitButton onClick={() => handleCreateKnowledgeBase()}>
                                            创建知识库
                                        </YakitButton>
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
                            )
                        }
                        secondNode={
                            showFreeChat ? (
                                <div style={{height: "100%", display: "flex", flexDirection: "column"}}>
                                    <AIReActChat
                                        key={knowledgeBaseID}
                                        mode={"task"}
                                        showFreeChat={showFreeChat}
                                        setShowFreeChat={setShowFreeChat}
                                        title='AI 召回'
                                        ref={aiReActChatRef}
                                        startRequest={onStartRequest}
                                        sendRequest={onSendRequest}
                                        externalParameters={{
                                            rightIcon: (
                                                <React.Fragment>
                                                    <Tooltip title='新建对话'>
                                                        <YakitButton
                                                            type='text2'
                                                            icon={<OutlinePlusIcon />}
                                                            onClick={() => {
                                                                if (activeID) {
                                                                    onStop()
                                                                    events.onReset()
                                                                    onChatFromHistory(activeID)
                                                                }
                                                            }}
                                                        />
                                                    </Tooltip>
                                                    <YakitButton
                                                        type='text2'
                                                        icon={<OutlineXIcon />}
                                                        onClick={() => setShowFreeChat(false)}
                                                    />
                                                </React.Fragment>
                                            )
                                        }}
                                    />
                                </div>
                            ) : null
                        }
                        {...ResizeBoxProps}
                    />
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
                <YakitModal hiddenHeader footer={null} visible={joyrideStep.visible} centered>
                    <YakitSpin spinning={spinning}>
                        <GuideFooter
                            step={joyrideStep.step}
                            onPrev={() => setJoyrideStep((s) => ({...s, step: s.step - 1}))}
                            onNext={() => setJoyrideStep((s) => ({...s, step: s.step + 1}))}
                            onFinish={() =>
                                setJoyrideStep((s) => {
                                    setLocalValue(KnowledgeBaseGV.KnowledgeBaseJoyrideVisible, true)
                                    return {...s, visible: false}
                                })
                            }
                            stopList={stopList}
                        />
                    </YakitSpin>
                </YakitModal>
            </ChatIPCContent.Provider>
        </AIAgentContext.Provider>
    )
})

export default memo(KnowledgeBaseContent)
