import React, {forwardRef, useImperativeHandle, useRef} from "react"

import styles from "./AIReActChat.module.scss"
import {AIHandleStartResProps, AIReActChatProps, AISendResProps} from "./AIReActChatType"
import {AIChatTextarea} from "@/pages/ai-agent/template/template"
import {AIReActChatContents} from "../aiReActChatContents/AIReActChatContents"
import {AIChatTextareaRefProps, AIChatTextareaSubmit} from "@/pages/ai-agent/template/type"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {ColorsChatIcon} from "@/assets/icon/colors"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import classNames from "classnames"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {ChevrondownButton, ChevronleftButton, RoundedStopButton} from "./AIReActComponent"
import {AIInputEvent, AIStartParams} from "../hooks/grpcApi"
import {AITaskQuery} from "@/pages/ai-agent/components/aiTaskQuery/AITaskQuery"
import {HandleStartParams} from "@/pages/ai-agent/aiAgentChat/type"
import {formatAIAgentSetting, getAIReActRequestParams} from "@/pages/ai-agent/utils"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {v4 as uuidv4} from "uuid"
import {AIChatInfo} from "@/pages/ai-agent/type/aiChat"
import useAIAgentDispatcher from "@/pages/ai-agent/useContext/useDispatcher"
import {randomString} from "@/utils/randomUtil"

export const AIReActChat: React.FC<AIReActChatProps> = React.memo(
    forwardRef((props, ref) => {
        const {
            mode,
            chatContainerClassName,
            chatContainerHeaderClassName,
            title = "自由对话",
            sendRequest,
            startRequest,
            externalParameters
        } = props
        const {setChats, setActiveChat} = useAIAgentDispatcher()

        const {chatIPCData} = useChatIPCStore()
        const {chatIPCEvents, handleStop, handleSendSyncMessage} = useChatIPCDispatcher()
        const execute = useCreation(() => chatIPCData.execute, [chatIPCData.execute])
        const focusMode = useCreation(() => chatIPCData.focusMode, [chatIPCData.focusMode])

        const wrapperRef = useRef<HTMLDivElement>(null)

        const [showFreeChat, setShowFreeChat] = useControllableValue<boolean>(props, {
            defaultValue: true,
            valuePropName: "showFreeChat",
            trigger: "setShowFreeChat"
        })

        const {activeChat, setting} = useAIAgentStore()

        const questionQueue = useCreation(() => chatIPCData.questionQueue, [chatIPCData.questionQueue])

        const aiChatTextareaRef = useRef<AIChatTextareaRefProps>({
            setMention: () => {},
            setValue: () => {},
            getValue: () => {}
        })
        useImperativeHandle(
            ref,
            () => {
                return {
                    ...aiChatTextareaRef.current,
                    handleStart: (value) => handleStart(value)
                }
            },
            []
        )
        // #region 问题相关逻辑
        // 初始化 AI ReAct
        const handleSubmit = useMemoizedFn((value: AIChatTextareaSubmit) => {
            if (!setting) {
                yakitNotify("error", "请先配置 AI ReAct 参数")
                return
            }
            if (execute) {
                handleSend(value)
            } else {
                handleStart(value)
            }
            onSetQuestion("")
        })

        const handleStart = useMemoizedFn((value: HandleStartParams) => {
            const {qs} = value
            const sessionID = activeChat?.session || "" // 判断历史还是新建

            const request: AIStartParams = {
                ...formatAIAgentSetting(setting),
                UserQuery: qs,
                CoordinatorId: "",
                Sequence: 1
            }

            let session = ""
            if (!!sessionID) {
                session = sessionID
            } else if (!!setting.TimelineSessionID) {
                session = setting.TimelineSessionID
            } else {
                session = uuidv4().replace(/-/g, "").substring(0, 16)
            }
            request.TimelineSessionID = session
            const {extra, attachedResourceInfo} = getAIReActRequestParams(value)
            // 发送初始化参数
            const aiInputEvent: AIInputEvent = {
                IsStart: true,
                Params: {
                    ...request
                },
                AttachedResourceInfo: attachedResourceInfo,
                FocusModeLoop: value.focusMode
            }
            const onStart = (res: AIHandleStartResProps) => {
                const {params, extraParams, onChat, onChatFromHistory} = res
                if (!sessionID) {
                    // 创建新的聊天记录
                    const newChat: AIChatInfo = {
                        id: extraParams?.chatId || session,
                        name: qs || `AI Agent - ${new Date().toLocaleString()}`,
                        question: qs,
                        time: new Date().getTime(),
                        request,
                        session
                    }

                    setActiveChat && setActiveChat(newChat)
                    setChats && setChats((old) => [...old, newChat])
                    // 新建的额外操作
                    onChat?.()
                } else {
                    // 历史中的额外操作
                    onChatFromHistory?.(sessionID)
                }
                aiChatTextareaRef.current.setMention({
                    mentionId: params.FocusModeLoop || randomString(8),
                    mentionType: "focusMode",
                    mentionName: params.FocusModeLoop || ""
                })
                chatIPCEvents.onStart({token: request.TimelineSessionID!, params, extraValue: extra})
            }
            if (!!startRequest) {
                startRequest({
                    params: aiInputEvent
                })
                    .then((res) => {
                        onStart(res)
                    })
                    .catch(() => {
                        onStart({
                            params: aiInputEvent
                        })
                    })
            } else {
                onStart({
                    params: aiInputEvent
                })
            }
        })

        /**自由对话 */
        const handleSend = useMemoizedFn((data: HandleStartParams) => {
            if (!activeChat?.session) return
            try {
                const {extra, attachedResourceInfo} = getAIReActRequestParams(data)
                const chatMessage: AIInputEvent = {
                    IsFreeInput: true,
                    FreeInput: data.qs,
                    AttachedResourceInfo: attachedResourceInfo,
                    FocusModeLoop: data.focusMode
                }
                const onSend = (res: AISendResProps) => {
                    const {params} = res
                    chatIPCEvents.onSend({
                        token: activeChat.session,
                        type: "casual",
                        params: {
                            IsFreeInput: true,
                            ...params
                        },
                        extraValue: extra
                    })
                }
                if (!!sendRequest) {
                    sendRequest?.({params: chatMessage})
                        .then((res) => {
                            const {params} = res
                            // 发送到服务端
                            onSend({
                                params
                            })
                        })
                        .catch(() => {
                            onSend({
                                params: chatMessage
                            })
                        })
                } else {
                    onSend({
                        params: chatMessage
                    })
                }
            } catch (error) {}
        })

        // #endregion

        const isShowRetract = useCreation(() => {
            return mode === "task" && showFreeChat
        }, [mode, showFreeChat])
        const isShowExpand = useCreation(() => {
            return mode === "task" && !showFreeChat
        }, [mode, showFreeChat])
        const handleSwitchShowFreeChat = useMemoizedFn((v) => {
            setShowFreeChat(v)
        })

        const onSetQuestion = useMemoizedFn((value: string) => {
            aiChatTextareaRef?.current?.setValue(value ?? "")
        })
        return (
            <>
                <div
                    className={classNames(styles["ai-re-act"], {
                        [styles["content-re-act-side"]]: isShowRetract,
                        [styles["content-re-act-side-hidden"]]: isShowExpand
                    })}
                >
                    <div
                        ref={wrapperRef}
                        className={classNames(styles["ai-re-act-chat"], {
                            [styles["ai-re-act-chat-hidden"]]: !showFreeChat
                        })}
                    >
                        <div className={classNames(styles["chat-container"], chatContainerClassName)}>
                            <div className={classNames(styles["chat-header"], chatContainerHeaderClassName)}>
                                <div className={styles["chat-header-title"]}>
                                    <ColorsChatIcon />
                                    {title}
                                    {focusMode && <YakitTag fullRadius={true}>专注模式:{focusMode}</YakitTag>}
                                </div>
                                <div className={styles["chat-header-extra"]}>
                                    {isShowRetract &&
                                        (externalParameters?.rightIcon ?? (
                                            <ChevronleftButton onClick={() => handleSwitchShowFreeChat(false)} />
                                        ))}
                                </div>
                            </div>
                            <AIReActChatContents chats={chatIPCData.casualChat} />
                        </div>
                        <div className={classNames(styles["chat-footer"])}>
                            <div className={styles["footer-body"]}>
                                <div className={styles["footer-inputs"]}>
                                    {execute && questionQueue?.total > 0 && <AITaskQuery />}
                                    <div className={classNames(styles["footer-inputs-file-list"])}>
                                        <AIChatTextarea
                                            ref={aiChatTextareaRef}
                                            loading={false}
                                            onSubmit={handleSubmit}
                                            filterMentionType={externalParameters?.filterMentionType}
                                            isOpen={externalParameters?.isOpen}
                                            inputFooterRight={
                                                <div className={styles["extra-footer-right"]}>
                                                    {execute && (
                                                        <RoundedStopButton
                                                            onClick={handleStop}
                                                            style={{width: 24, height: 24}}
                                                        />
                                                    )}
                                                </div>
                                            }
                                            footerLeftTypes={externalParameters?.footerLeftTypes}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles["open-wrapper"]} onClick={() => handleSwitchShowFreeChat(true)}>
                        <ChevrondownButton />
                        <div className={styles["text"]}>自由对话</div>
                    </div>
                </div>
            </>
        )
    })
)
