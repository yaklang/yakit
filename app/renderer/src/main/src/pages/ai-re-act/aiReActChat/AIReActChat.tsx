import React, {useEffect, useMemo, useRef, useState} from "react"

import styles from "./AIReActChat.module.scss"
import {AIReActChatProps, AIReActTimelineMessageProps} from "./AIReActChatType"
import {AIChatTextarea} from "@/pages/ai-agent/template/template"
import {AIReActChatContents} from "../aiReActChatContents/AIReActChatContents"
import {AIChatTextareaProps} from "@/pages/ai-agent/template/type"
import {useControllableValue, useCreation, useDebounceFn, useMemoizedFn, useMount} from "ahooks"
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
import {AITaskQuery} from "@/pages/ai-agent/components/aiTaskQuery/AITaskQuery"
import {AIInputEventSyncTypeEnum} from "../hooks/defaultConstant"
import {AISendSyncMessageParams} from "@/pages/ai-agent/useContext/ChatIPCContent/ChatIPCContent"
import {fileToChatQuestionStore, useFileToQuestion} from "./store"

const AIReviewRuleSelect = React.lazy(() => import("../aiReviewRuleSelect/AIReviewRuleSelect"))

export const AIReActChat: React.FC<AIReActChatProps> = React.memo((props) => {
    const {mode, chatContainerClassName, chatContainerHeaderClassName} = props

    const {casualChat} = useAIChatUIData()
    const {chatIPCData, timelineMessage} = useChatIPCStore()
    const {chatIPCEvents, handleStart, handleStop, handleSendSyncMessage} = useChatIPCDispatcher()
    const execute = useCreation(() => chatIPCData.execute, [chatIPCData.execute])

    const wrapperRef = useRef<HTMLDivElement>(null)

    const [showFreeChat, setShowFreeChat] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "showFreeChat",
        trigger: "setShowFreeChat"
    })

    const [timelineVisible, setTimelineVisible] = useState<boolean>(false)
    const [timelineVisibleLoading, setTimelineVisibleLoading] = useState<boolean>(false)

    const {activeChat, setting} = useAIAgentStore()

    const fileToQuestion = useFileToQuestion()

    const questionQueue = useCreation(() => chatIPCData.questionQueue, [chatIPCData.questionQueue])
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
        const fileArr = fileToQuestion.filter(i => qs.includes(i))
        if (execute) {
            handleSend(qs, fileArr)
        } else {
            handleStart({qs, fileToQuestion: fileArr})
        }
        setQuestion("")
        fileToChatQuestionStore.claearFileToChatQuestion()
    })

    /**自由对话 */
    const handleSend = useMemoizedFn((qs: string, fileArr: string[]) => {
        if (!activeChat?.id) return
        try {
            const chatMessage: AIInputEvent = {
                IsFreeInput: true,
                FreeInput: qs,
                AttachedFilePath: fileArr
            }
            // 发送到服务端
            chatIPCEvents.onSend({token: activeChat.id, type: "casual", params: chatMessage})
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
    const onViewContext = useDebounceFn(
        useMemoizedFn(() => {
            setTimelineVisible(true)

            if (!execute) return
            if (!activeChat?.id) return
            if (!timelineVisibleLoading) {
                setTimelineVisibleLoading(true)
            }
            const info: AISendSyncMessageParams = {
                syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_TIMELINE,
                params: {}
            }
            handleSendSyncMessage(info)
        }),
        {wait: 300, leading: true}
    ).run
    const onClose = useMemoizedFn(() => {
        setTimelineVisible(false)
    })

    useEffect(() => {
        if (!fileToQuestion) return
        const lastFile = fileToQuestion[fileToQuestion.length - 1]
        if (question) {
            setQuestion((prev) => `${prev} ${lastFile} `)
            return
        }
        setQuestion(lastFile)
    }, [fileToQuestion])

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
                                自由对话
                            </div>
                            <div className={styles["chat-header-extra"]}>
                                {isShowRetract && <ChevronleftButton onClick={() => handleSwitchShowFreeChat(false)} />}
                            </div>
                        </div>
                        <AIReActChatContents chats={casualChat.contents} />
                    </div>
                    <div
                        className={classNames(styles["chat-footer"], {
                            [styles["chat-footer-query"]]: execute && questionQueue?.total > 0
                        })}
                    >
                        <div className={styles["footer-body"]}>
                            <div className={styles["footer-inputs"]}>
                                {execute && questionQueue?.total > 0 && <AITaskQuery />}
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
