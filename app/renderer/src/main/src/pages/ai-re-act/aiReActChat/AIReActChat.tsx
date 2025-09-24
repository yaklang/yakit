import React, {useEffect, useMemo, useRef, useState} from "react"

import styles from "./AIReActChat.module.scss"
import {AIReActChatProps, AIReActLogProps} from "./AIReActChatType"
import {AIChatTextarea} from "@/pages/ai-agent/template/template"
import {AIReActChatContents, AIStreamChatContent} from "../aiReActChatContents/AIReActChatContents"
import {AIChatTextareaProps} from "@/pages/ai-agent/template/type"
import {useCreation, useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ColorsChatIcon} from "@/assets/icon/colors"
import {OutlineNewspaperIcon, OutlineXIcon} from "@/assets/icon/outline"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import {AIModelSelect} from "@/pages/ai-agent/aiModelList/aiModelSelect/AIModelSelect"
import classNames from "classnames"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {ChevrondownButton, ChevronleftButton, RoundedStopButton} from "./AIReActComponent"
import {AIInputEvent} from "../hooks/grpcApi"

const AIReviewRuleSelect = React.lazy(() => import("../aiReviewRuleSelect/AIReviewRuleSelect"))

export const AIReActChat: React.FC<AIReActChatProps> = React.memo((props) => {
    const {mode, setMode} = props

    const {chatIPCData} = useChatIPCStore()
    const {chatIPCEvents, handleStart, handleStop} = useChatIPCDispatcher()
    const {execute, logs, casualChat} = chatIPCData

    const wrapperRef = useRef<HTMLDivElement>(null)

    const [logVisible, setLogVisible] = useState<boolean>(false)
    const [showFreeChat, setShowFreeChat] = useState<boolean>(true)

    const {activeChat, setting} = useAIAgentStore()

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
                                    extraFooterRight={execute && <RoundedStopButton onClick={handleStop} />}
                                    extraFooterLeft={
                                        <>
                                            <AIModelSelect disabled={execute} />
                                            <React.Suspense fallback={<div>loading...</div>}>
                                                <AIReviewRuleSelect disabled={execute} />
                                            </React.Suspense>
                                        </>
                                    }
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
                {logs.map((row) => {
                    const {id, type, data} = row
                    switch (type) {
                        case "log":
                            const {level, message} = data
                            return (
                                <div className={styles["ai-re-act-log-row"]} key={id}>
                                    • {level}:{message}
                                </div>
                            )
                        case "stream":
                            return <AIStreamChatContent key={id} stream={data.content} nodeLabel={data.NodeLabel} />

                        default:
                            return <React.Fragment key={id}></React.Fragment>
                    }
                })}
                <div className={styles["ai-re-act-log-no-more"]}>暂无更多数据</div>
            </div>
        </div>
    )
})
