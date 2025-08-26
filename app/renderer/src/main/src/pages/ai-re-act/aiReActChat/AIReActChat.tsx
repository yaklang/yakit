import React, {useContext, useEffect, useMemo, useRef, useState} from "react"

import styles from "./AIReActChat.module.scss"
import {AIReActChatProps} from "./AIReActChatType"
import {AIChatTextarea} from "@/pages/ai-agent/template/template"
import {AIReActChatContents} from "../aiReActChatContents/AIReActChatContents"
import {AIChatTextareaProps} from "@/pages/ai-agent/template/type"
import {useMemoizedFn} from "ahooks"
import useChatData from "@/pages/ai-agent/useChatData"
import {yakitNotify} from "@/utils/notification"
import AIReActContext from "../useContext/AIReActContext"
import {AIChatInfo, AIChatReview, AIInputEvent, AIStartParams} from "@/pages/ai-agent/type/aiChat"
import {randomString} from "@/utils/randomUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidStopIcon} from "@/assets/icon/solid"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useAIReActDispatcher from "../useContext/useAIReActDispatcher"
import {ColorsChatIcon} from "@/assets/icon/colors"
import useAIReActStore from "../useContext/useAIReActStore"

export const AIReActChat: React.FC<AIReActChatProps> = React.memo((props) => {
    const wrapperRef = useRef<HTMLDivElement>(null)

    // review数据
    const [reviewInfo, setReviewInfo, getReviewInfo] = useGetSetState<AIChatReview>()
    // #region 展示数据和数据的处理逻辑
    // 发送消息后接受消息的 loading 状态
    // const [isExecuting, setIsExecuting] = useState(false)

    // #endregion

    const {activeChat, setting} = useAIReActStore()
    const {setActiveChat} = useAIReActDispatcher()
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
    const handleShowReview = useMemoizedFn((info: AIChatReview) => {
        // userInteractiveRef.current=true
        setReviewInfo(info)
    })

    const [
        {execute, pressure, firstCost, totalCost, consumption, logs, plan, streams, activeStream, card, systemOutputs},
        events
    ] = useChatData({
        onReview: handleShowReview
        // onReviewExtra: handleShowReviewExtra,
        // onReviewRelease: handleReleaseReview,
        // onEnd: handleChatingEnd,
        // setCoordinatorId
    })
    // #region 问题相关逻辑
    // 初始化 AI ReAct
    const handleSubmit = useMemoizedFn((qs: string) => {
        console.log("qs", qs)
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
        setActiveChat(newChat)

        // 发送初始化参数
        const startParams: AIInputEvent = {
            IsStart: true,
            Params: {
                ...request
            }
        }

        events.onStart(newChat.id, startParams)
    })

    const handleSend = useMemoizedFn((qs: string) => {
        if (!activeChat || !reviewInfo) return
        try {
            // 构建消息格式
            let chatMessage: AIInputEvent

            // 如果有用户交互状态，使用交互模式
            if (reviewInfo) {
                chatMessage = {
                    IsInteractiveMessage: true,
                    InteractiveId: reviewInfo.data.id,
                    InteractiveJSONInput: JSON.stringify({suggestion: qs})
                }
            } else {
                // 普通模式使用自由输入
                chatMessage = {
                    IsFreeInput: true,
                    FreeInput: qs
                }
            }

            // 清空用户交互状态
            setReviewInfo(undefined)

            // 发送到服务端
            events.onSend(activeChat.id, reviewInfo, chatMessage)
        } catch (error) {
        } finally {
        }
    })

    const onStop = useMemoizedFn(() => {
        if (execute && activeID) {
            events.onClose(activeID)
            // handleStopAfterChangeState()
        }
    })
    // #endregion
    useEffect(() => {
        console.log("streams,logs", streams, logs)
    }, [streams, logs])

    return (
        <div ref={wrapperRef} className={styles["ai-re-act-chat"]} style={{height: "100%"}}>
            <div className={styles["chat-container"]}>
                <div className={styles["chat-header"]}>
                    <div className={styles["chat-header-title"]}>
                        <ColorsChatIcon />
                        自由对话
                    </div>
                    <div className={styles["chat-header-extra"]}>
                        <YakitButton type='outline1' onClick={() => {}}>
                            日志
                        </YakitButton>
                    </div>
                </div>
                <AIReActChatContents />
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
                            extraFooterRight={
                                execute && (
                                    <YakitButton
                                        className={styles["rounded-icon-btn"]}
                                        colors='danger'
                                        icon={<SolidStopIcon className={styles["stop-icon"]} />}
                                        onClick={onStop}
                                    />
                                )
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    )
})
