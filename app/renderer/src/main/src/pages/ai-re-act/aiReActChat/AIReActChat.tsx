import React, {useEffect, useMemo, useRef, useState} from "react"

import styles from "./AIReActChat.module.scss"
import {AIReActChatProps, AIReActLogProps, AIReActTimelineMessageProps} from "./AIReActChatType"
import {AIChatTextarea} from "@/pages/ai-agent/template/template"
import {AIReActChatContents} from "../aiReActChatContents/AIReActChatContents"
import {AIChatTextareaProps} from "@/pages/ai-agent/template/type"
import {useControllableValue, useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ColorsChatIcon} from "@/assets/icon/colors"
import {OutlineListTodoIcon, OutlineNewspaperIcon, OutlineXIcon} from "@/assets/icon/outline"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import {AIModelSelect} from "@/pages/ai-agent/aiModelList/aiModelSelect/AIModelSelect"
import classNames from "classnames"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {ChevrondownButton, ChevronleftButton, RoundedStopButton} from "./AIReActComponent"
import {AIInputEvent} from "../hooks/grpcApi"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {AIStreamChatContent} from "@/pages/ai-agent/components/aiStreamChatContent/AIStreamChatContent"
import {AITaskQuery} from "@/pages/ai-agent/components/aiTaskQuery/AITaskQuery"

const AIReviewRuleSelect = React.lazy(() => import("../aiReviewRuleSelect/AIReviewRuleSelect"))

export const AIReActChat: React.FC<AIReActChatProps> = React.memo((props) => {
    const {mode} = props

    const {chatIPCData, timelineMessage} = useChatIPCStore()
    const {chatIPCEvents, handleStart, handleStop, setTimelineMessage} = useChatIPCDispatcher()
    const {execute, logs, casualChat} = chatIPCData

    const wrapperRef = useRef<HTMLDivElement>(null)

    const [logVisible, setLogVisible] = useState<boolean>(false)
    const [showFreeChat, setShowFreeChat] = useState<boolean>(true)

    const [timelineVisible, setTimelineVisible] = useState<boolean>(false)
    const [timelineVisibleLoading, setTimelineVisibleLoading] = useState<boolean>(false)

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
        if (!activeChat?.id) return
        try {
            const chatMessage: AIInputEvent = {
                IsFreeInput: true,
                FreeInput: qs
            }
            // 发送到服务端
            chatIPCEvents.onSend({token: activeChat.id, type: "casual", params: chatMessage})
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
    const onViewContext = useDebounceFn(
        useMemoizedFn(() => {
            setTimelineVisible(true)

            if (!execute) return
            if (!activeChat?.id) return
            if (!timelineVisibleLoading) {
                setTimelineVisibleLoading(true)
            }
            const info: AIInputEvent = {
                IsSyncMessage: true,
                SyncType: "timeline",
                InteractiveJSONInput: ""
            }
            chatIPCEvents.onSend({token: activeChat.id, type: "", params: info})
        }),
        {wait: 300, leading: true}
    ).run
    const onClose = useMemoizedFn(() => {
        setTimelineVisible(false)
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
                                {/*  TODO 队列切换任务 */}
                                {/* <AITaskQuery /> */}
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
                                            <YakitButton type='text' onClick={onViewContext}>
                                                查看上下文
                                            </YakitButton>
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
            <YakitDrawer
                title='上下文信息'
                visible={timelineVisible}
                onClose={onClose}
                destroyOnClose
                bodyStyle={{padding: 0}}
                width={720}
            >
                <AIReActTimelineMessage
                    message={timelineMessage}
                    loading={timelineVisibleLoading}
                    setLoading={setTimelineVisibleLoading}
                />
            </YakitDrawer>
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
                            return <AIStreamChatContent key={id} data={data} />

                        default:
                            return <React.Fragment key={id}></React.Fragment>
                    }
                })}
                <div className={styles["ai-re-act-log-no-more"]}>暂无更多数据</div>
            </div>
        </div>
    )
})
const AIReActTimelineMessage: React.FC<AIReActTimelineMessageProps> = React.memo((props) => {
    const {message} = props
    const [loading, setLoading] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "loading",
        trigger: "setLoading"
    })
    useEffect(() => {
        if (!!message) setLoading(false)
    }, [message])
    return (
        <YakitSpin spinning={loading}>
            {!!message ? (
                <>
                    <pre className={styles["timeline-message"]}>
                        <code>{message}</code>
                    </pre>
                </>
            ) : (
                <YakitEmpty />
            )}
        </YakitSpin>
    )
})
