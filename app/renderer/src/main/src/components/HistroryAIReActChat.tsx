import React, {useEffect, useMemo} from "react"
import {FC} from "react"

import {OutlineXIcon, OutlineMicroscopeIcon} from "@/assets/icon/outline"
import {OutlinePlusIcon} from "@/assets/newIcon"
import {AIReActChat} from "@/pages/ai-re-act/aiReActChat/AIReActChat"
import {Tooltip} from "antd"
import classNames from "classnames"
import styles from "./HTTPHistory.module.scss"

import {YakitButton} from "./yakitUI/YakitButton/YakitButton"
import {
    AIHandleStartParams,
    AIHandleStartResProps,
    AIReActChatRefProps,
    AISendParams,
    AISendResProps
} from "@/pages/ai-re-act/aiReActChat/AIReActChatType"
import {UseChatIPCEvents} from "@/pages/ai-re-act/hooks/type"
import {AIChatInfo} from "@/pages/ai-agent/type/aiChat"
import {getAIModelAvailableInfo, isForcedSetAIModal} from "@/pages/ai-agent/aiModelList/utils"
import {useDebounceFn, useMemoizedFn, useRequest, useSafeState} from "ahooks"
import {apiGetGlobalNetworkConfig} from "@/pages/spaceEngine/utils"
import {defaultParams, GlobalNetworkConfig} from "./configNetwork/ConfigNetworkPage"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import {AIAgentSetting} from "@/pages/ai-agent/aiAgentType"
import {getRemoteValue} from "@/utils/kv"
import {AIInputInnerFeatureEnum} from "@/pages/ai-agent/template/type"
import {AIModelForm} from "@/pages/ai-agent/aiModelList/aiModelForm/AIModelForm"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"

interface HistoryAIReActChatProps {
    refRef: React.RefObject<HTMLDivElement>
    showFreeChat: boolean
    setShowFreeChat: React.Dispatch<React.SetStateAction<boolean>>
    aiReActChatRef: React.RefObject<AIReActChatRefProps>
    onStartRequest: (data: AIHandleStartParams) => Promise<AIHandleStartResProps>
    onSendRequest: (data: AISendParams) => Promise<AISendResProps>
    activeID?: string
    onStop: () => void
    events: UseChatIPCEvents
    onChatFromHistory: (session: string) => void
    setActiveChat: React.Dispatch<React.SetStateAction<AIChatInfo | undefined>>
    setOpenTabsFlag: React.Dispatch<React.SetStateAction<boolean>>
    setSetting: React.Dispatch<React.SetStateAction<AIAgentSetting>>
    inViewport: boolean
    className?: string
}

const HistroryAIReActChat: FC<HistoryAIReActChatProps> = (props) => {
    const {
        refRef,
        showFreeChat,
        setShowFreeChat,
        aiReActChatRef,
        onStartRequest,
        onSendRequest,
        activeID,
        onStop,
        events,
        onChatFromHistory,
        setActiveChat,
        setOpenTabsFlag,
        inViewport,
        setSetting,
        className
    } = props

    const [globalNetworkConfig, setGlobalNetworkConfig] = useSafeState<GlobalNetworkConfig>(defaultParams)

    const chatWidth = useListenWidth(refRef)

    const {data, run, loading} = useRequest(
        async () => {
            const res = await getAIModelAvailableInfo()
            const isModels = res.localModelsTotal === 0 && res.onlineModelsTotal === 0
            return isModels
        },
        {manual: true}
    )

    useEffect(() => {
        if (inViewport) {
            run()
            onGetGlobalNetworkConfig()
            getAIModelListOption()
        }
    }, [inViewport])

    const getAIModelListOption = useDebounceFn(
        () => {
            isForcedSetAIModal({
                pageKey: "knowledge-base",
                isOpen: false
            })
        },
        {leading: true}
    ).run

    /**获取全局网络配置 */
    const onGetGlobalNetworkConfig = useMemoizedFn(() => {
        apiGetGlobalNetworkConfig().then(setGlobalNetworkConfig)
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

    const resultRender = useMemo(() => {
        // 未完成检查，不渲染任何业务 UI
        if (loading) return null

        // 无模型 → 配置引导
        if (data) {
            return (
                <AIModelForm
                    onClose={() => {}}
                    onSuccess={() => {
                        run()
                    }}
                    thirdPartyApplicationConfig={
                        chatWidth < 400
                            ? {
                                  FormProps: {
                                      layout: "vertical",
                                      labelCol: 24,
                                      wrapperCol: 24
                                  },
                                  onAdd: () => {},
                                  onCancel: () => {}
                              }
                            : {
                                  FormProps: {
                                      layout: "horizontal",
                                      labelCol: 8,
                                      wrapperCol: 16
                                  },
                                  onAdd: () => {},
                                  onCancel: () => {}
                              }
                    }
                />
            )
        }

        // 有模型 → 正常聊天
        return (
            <AIReActChat
                mode={"task"}
                showFreeChat={showFreeChat}
                setShowFreeChat={setShowFreeChat}
                title='AI'
                ref={aiReActChatRef}
                startRequest={onStartRequest}
                sendRequest={onSendRequest}
                chatContainerHeaderClassName={styles["history-ai-header"]}
                externalParameters={{
                    isOpen: false,
                    rightIcon: (
                        <>
                            <Tooltip title='新建对话'>
                                <YakitButton
                                    type='text2'
                                    icon={<OutlinePlusIcon />}
                                    onClick={() => {
                                        if (activeID) {
                                            onStop()
                                            events.onReset()
                                            onChatFromHistory(activeID)
                                            setActiveChat(undefined)
                                        }
                                    }}
                                />
                            </Tooltip>
                            <YakitButton type='text2' icon={<OutlineXIcon />} onClick={() => setOpenTabsFlag(false)} />
                        </>
                    ),
                    footerLeftTypes: [
                        AIInputInnerFeatureEnum.AIModelSelect,
                        {
                            type: AIInputInnerFeatureEnum.AIFocusMode,
                            props: {
                                value: "http_flow_analyze",
                                onChange: () => {},
                                disabled: true
                            }
                        }
                    ],
                    filterMentionType: ["focusMode"]
                }}
            />
        )
    }, [activeID, aiReActChatRef, data, events, globalNetworkConfig, loading, showFreeChat, chatWidth])

    return (
        <div
            ref={refRef}
            className={classNames(styles["ai-wrapper"], className)}
            id='main-operator-page-body-db-http-request-aiReAct-chat'
        >
            {resultRender}
        </div>
    )
}

export {HistroryAIReActChat}
