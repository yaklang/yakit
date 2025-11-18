import React, {useEffect, useMemo, useRef, useState} from "react"

import styles from "./AIReActChat.module.scss"
import {AIReActChatProps, AIReActTimelineMessageProps} from "./AIReActChatType"
import {AIChatTextarea} from "@/pages/ai-agent/template/template"
import {AIReActChatContents} from "../aiReActChatContents/AIReActChatContents"
import {AIChatTextareaProps} from "@/pages/ai-agent/template/type"
import {useControllableValue, useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ColorsChatIcon} from "@/assets/icon/colors"
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
import useAIChatUIData from "../hooks/useAIChatUIData"
import emiter from "@/utils/eventBus/eventBus"
import {AITaskQuery} from "@/pages/ai-agent/components/aiTaskQuery/AITaskQuery"

const AIReviewRuleSelect = React.lazy(() => import("../aiReviewRuleSelect/AIReviewRuleSelect"))

export const AIReActChat: React.FC<AIReActChatProps> = React.memo((props) => {
    const {mode} = props

    const {casualChat} = useAIChatUIData()
    const {chatIPCData, timelineMessage} = useChatIPCStore()
    const {chatIPCEvents, handleStart, handleStop, setTimelineMessage} = useChatIPCDispatcher()
    const {execute} = chatIPCData

    const wrapperRef = useRef<HTMLDivElement>(null)

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

    useEffect(() => {
        emiter.on("switchReActShow", handleSwitchShowFreeChat)
        return () => {
            emiter.off("switchReActShow", handleSwitchShowFreeChat)
        }
    }, [])

    const isShowRetract = useCreation(() => {
        return mode === "task" && showFreeChat
    }, [mode, showFreeChat])
    const isShowExpand = useCreation(() => {
        return mode === "task" && !showFreeChat
    }, [mode, showFreeChat])
    const handleSwitchShowFreeChat = useMemoizedFn((v) => {
        setShowFreeChat(v)
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
                                {isShowRetract && <ChevronleftButton onClick={() => handleSwitchShowFreeChat(false)} />}
                            </div>
                        </div>
                        <AIReActChatContents chats={casualChat.contents} />
                    </div>
                    <div className={styles["chat-footer"]}>
                        <div className={styles["footer-body"]}>
                            <div className={styles["footer-inputs"]}>
                                {/*  TODO 队列切换任务 */}
                                <AITaskQuery />
                                <AIChatTextarea
                                    loading={false}
                                    question={question}
                                    setQuestion={setQuestion}
                                    textareaProps={textareaProps}
                                    onSubmit={handleSubmit}
                                    extraFooterRight={execute && <RoundedStopButton onClick={handleStop} />}
                                    extraFooterLeft={
                                        <>
                                            <AIModelSelect />
                                            <React.Suspense fallback={<div>loading...</div>}>
                                                <AIReviewRuleSelect />
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
                <div className={styles["open-wrapper"]} onClick={() => handleSwitchShowFreeChat(true)}>
                    <ChevrondownButton />
                    <div className={styles["text"]}>自由对话</div>
                </div>
            </div>
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
