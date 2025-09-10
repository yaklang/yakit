import React, {useEffect, useMemo, useRef, useState} from "react"

import styles from "./AIReActChat.module.scss"
import {AIReActChatProps, AIReActLogProps} from "./AIReActChatType"
import {AIChatTextarea} from "@/pages/ai-agent/template/template"
import {AIReActChatContents} from "../aiReActChatContents/AIReActChatContents"
import {AIChatTextareaProps} from "@/pages/ai-agent/template/type"
import {useCreation, useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {AIChatInfo, AIInputEvent, AIStartParams} from "@/pages/ai-agent/type/aiChat"
import {randomString} from "@/utils/randomUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ColorsChatIcon} from "@/assets/icon/colors"
import {OutlineNewspaperIcon, OutlineXIcon} from "@/assets/icon/outline"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import useAIAgentDispatcher from "@/pages/ai-agent/useContext/useDispatcher"
import {AIModelSelect} from "@/pages/ai-agent/aiModelList/aiModelSelect/AIModelSelect"
import classNames from "classnames"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {ChevrondownButton, ChevronleftButton, RoundedStopButton} from "./AIReActComponent"

export const AIReActChat: React.FC<AIReActChatProps> = React.memo((props) => {
    const {mode, setMode} = props

    const {chatIPCData} = useChatIPCStore()
    const {chatIPCEvents} = useChatIPCDispatcher()
    const {execute, logs, casualChat} = chatIPCData

    const wrapperRef = useRef<HTMLDivElement>(null)

    const [logVisible, setLogVisible] = useState<boolean>(false)
    const [showFreeChat, setShowFreeChat] = useState<boolean>(true)

    const {activeChat, setting} = useAIAgentStore()
    const {setChats, setActiveChat} = useAIAgentDispatcher()
    /** 当前对话唯一ID */
    const activeID = useMemo(() => {
        return activeChat?.id
    }, [activeChat])

    // #region 问题相关逻辑
    const [question, setQuestion] = useState<string>("")
    const textareaProps: AIChatTextareaProps["textareaProps"] = useMemo(() => {
        return {
            placeholder: "请告诉我，你想做什么...(shift + enter 换行)"
        }
    }, [])
    // #endregion

    // #region 问题相关逻辑
    // 初始化 AI ReAct
    const handleSubmit = useMemoizedFn((qs: string) => {
        if (!setting) {
            yakitNotify("error", "请先配置 AI ReAct 参数")
            return
        }
        if (execute) {
            handleSend(qs)
        } else {
            handleStart(qs)
        }
        setQuestion("")
    })

    const handleStart = useMemoizedFn((qs: string) => {
        const request: AIStartParams = {
            ...setting,
            UserQuery: qs,
            CoordinatorId: randomString(16),
            Sequence: 1
        }
        // 创建新的聊天记录
        const newChat: AIChatInfo = {
            id: randomString(16),
            name: `AI ReAct - ${new Date().toLocaleString()}`,
            question: qs,
            time: new Date().getTime(),
            request
        }
        setActiveChat && setActiveChat(newChat)
        setChats && setChats((old) => [...old, newChat])
        // 发送初始化参数
        const startParams: AIInputEvent = {
            IsStart: true,
            Params: {
                ...request
            }
        }
        chatIPCEvents.onStart(newChat.id, startParams)
    })

    /**自由对话 */
    const handleSend = useMemoizedFn((qs: string) => {
        if (!activeChat) return
        try {
            const chatMessage: AIInputEvent = {
                IsFreeInput: true,
                FreeInput: qs
            }

            // 发送到服务端
            chatIPCEvents.onSend(activeChat.id, "casual", chatMessage)
        } catch (error) {}
    })

    const onStop = useMemoizedFn(() => {
        if (execute && activeID) {
            chatIPCEvents.onClose(activeID)
        }
    })
    // #endregion

    const uiCasualChat = useCreation(() => {
        if (!!activeChat?.answer?.casualChat) {
            return activeChat.answer.casualChat
        }
        return casualChat
    }, [activeChat, casualChat])
    const uiLogs = useCreation(() => {
        if (!!activeChat?.answer?.logs) {
            return activeChat?.answer?.logs
        }
        return logs
    }, [activeChat, logs])
    const openTask = useMemoizedFn(() => {
        setMode("task")
    })
    const isShowRetract = useCreation(() => {
        return mode === "task" && showFreeChat
    }, [mode, showFreeChat])
    const isShowExpand = useCreation(() => {
        return mode === "task" && !showFreeChat
    }, [mode, showFreeChat])
    const handleCancelExpand = useMemoizedFn(() => {
        setShowFreeChat(false)
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
                    <div className={styles["chat-container"]}>
                        <div className={styles["chat-header"]}>
                            <div className={styles["chat-header-title"]}>
                                <ColorsChatIcon />
                                自由对话
                            </div>
                            <div className={styles["chat-header-extra"]}>
                                <YakitButton
                                    type='secondary2'
                                    isHover={logVisible}
                                    icon={<OutlineNewspaperIcon />}
                                    onClick={() => setLogVisible((v) => !v)}
                                >
                                    日志
                                </YakitButton>
                                {isShowRetract && <ChevronleftButton onClick={handleCancelExpand} />}
                                <YakitButton type='secondary2' icon={<OutlineNewspaperIcon />} onClick={openTask}>
                                    打开Task
                                </YakitButton>
                            </div>
                        </div>
                        <AIReActChatContents chats={uiCasualChat.contents} />
                    </div>
                    <div className={styles["chat-footer"]}>
                        <div className={styles["footer-body"]}>
                            <div className={styles["footer-inputs"]}>
                                <AIChatTextarea
                                    loading={false}
                                    question={question}
                                    setQuestion={setQuestion}
                                    textareaProps={textareaProps}
                                    onSubmit={handleSubmit}
                                    extraFooterRight={execute && <RoundedStopButton onClick={onStop} />}
                                    extraFooterLeft={<AIModelSelect />}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles["open-wrapper"]} onClick={() => setShowFreeChat(true)}>
                    <ChevrondownButton />
                    <div className={styles["text"]}>自由对话</div>
                </div>
            </div>
            {logVisible && <AIReActLog logs={uiLogs} setLogVisible={setLogVisible} />}
        </>
    )
})

const AIReActLog: React.FC<AIReActLogProps> = React.memo((props) => {
    const {logs, setLogVisible} = props
    const logListRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        scrollToBottom()
    }, [logs])

    const scrollToBottom = useMemoizedFn(() => {
        const messagesWrapper = logListRef.current
        if (!messagesWrapper) return
        requestAnimationFrame(() => {
            const {clientHeight, scrollHeight, scrollTop} = messagesWrapper
            const scrollBottom = scrollHeight - scrollTop - clientHeight
            if (scrollBottom > 80) return
            if (scrollHeight > clientHeight) {
                messagesWrapper.scrollTop = messagesWrapper.scrollHeight
            }
        })
    })
    return (
        <div className={styles["ai-re-act-log"]}>
            <div className={styles["ai-re-act-log-heard"]}>
                <span>日志</span>
                <YakitButton type='text' icon={<OutlineXIcon />} onClick={() => setLogVisible(false)} />
            </div>
            <div ref={logListRef} className={styles["ai-re-act-log-list"]}>
                {logs.map((row) => (
                    <div className={styles["ai-re-act-log-row"]} key={row.id}>
                        • {row.level}:{row.message}
                    </div>
                ))}
                <div className={styles["ai-re-act-log-no-more"]}>暂无更多数据</div>
            </div>
        </div>
    )
})
