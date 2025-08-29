import React, {useEffect, useMemo, useRef, useState} from "react"

import styles from "./AIReActChat.module.scss"
import {AIReActChatProps, AIReActLogProps} from "./AIReActChatType"
import {AIChatTextarea} from "@/pages/ai-agent/template/template"
import {AIReActChatContents} from "../aiReActChatContents/AIReActChatContents"
import {AIChatTextareaProps} from "@/pages/ai-agent/template/type"
import {useCreation, useMemoizedFn, useUpdateEffect} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {AIInputEvent, AIReActChatMessage, AIStartParams} from "@/pages/ai-agent/type/aiChat"
import {randomString} from "@/utils/randomUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidStopIcon} from "@/assets/icon/solid"
import useAIReActDispatcher from "../useContext/useAIReActDispatcher"
import {ColorsChatIcon} from "@/assets/icon/colors"
import useAIReActStore from "../useContext/useAIReActStore"
import useChatIPC from "../hooks/useChatIPC"
import {OutlineNewspaperIcon, OutlineXIcon} from "@/assets/icon/outline"
import cloneDeep from "lodash/cloneDeep"
import emiter from "@/utils/eventBus/eventBus"
import {AIReActEventInfo} from "../aiReActType"

export const AIReActChat: React.FC<AIReActChatProps> = React.memo((props) => {
    const wrapperRef = useRef<HTMLDivElement>(null)

    const [logVisible, setLogVisible] = useState<boolean>(false)

    const {activeChat, setting} = useAIReActStore()
    const {setChats, setActiveChat} = useAIReActDispatcher()
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
    // const handleShowReview = useMemoizedFn((info: AIChatReview) => {
    //     // userInteractiveRef.current=true
    //     setReviewInfo(info)
    // })

    // const handleShowReviewExtra = useMemoizedFn((info: AIChatReviewExtra) => {
    //     if (info.type === "plan_task_analysis") {
    //         setPlanReviewTreeKeywords(info.data.index, info.data)
    //     }
    // })
    // 释放review
    const handleReleaseReview = useMemoizedFn((id: string) => {
        // const info = getReviewInfo()
        // if (!info) return
        // if (info.data.id === id) {
        //     handleStopAfterChangeState()
        // }
    })
    // 提问结束后缓存数据
    const handleChatingEnd = useMemoizedFn(() => {
        handleSaveChatInfo()
    })
    const [{execute, aiPerfData, logs, casualChat}, events] = useChatIPC({
        // onReview: handleShowReview,
        // onReviewExtra: handleShowReviewExtra,
        onReviewRelease: handleReleaseReview,
        onEnd: handleChatingEnd
    })

    // 保存上次对话信息
    const handleSaveChatInfo = useMemoizedFn(() => {
        const showID = activeID
        // 如果是历史对话，只是查看，怎么实现点击新对话的功能呢
        if (showID && events.fetchToken() && showID === events.fetchToken()) {
            const answer: AIReActChatMessage.AIReActChatItem["answer"] = {
                aiPerfData: cloneDeep(aiPerfData),
                logs: cloneDeep(logs),
                casualChat: cloneDeep(casualChat)
            }
            setChats &&
                setChats((old) => {
                    const newValue = cloneDeep(old)
                    const findIndex = newValue.findIndex((item) => item.id === showID)
                    if (findIndex !== -1) {
                        newValue[findIndex].answer = {...(answer || {})}
                    }
                    return newValue
                })
        }
    })

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
        const newChat: AIReActChatMessage.AIReActChatItem = {
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
        events.onStart(newChat.id, startParams)
    })

    const handleSend = useMemoizedFn((qs: string) => {
        if (!activeChat) return
        try {
            const chatMessage: AIInputEvent = {
                IsFreeInput: true,
                FreeInput: qs
            }

            // 发送到服务端
            events.onSend(activeChat.id, "casual", chatMessage)
        } catch (error) {}
    })

    /** AI交互补充策略 */
    const handleSendAIRequire = useMemoizedFn((value: string, id) => {
        if (!activeID) return
        if (!id) return

        const info: AIInputEvent = {
            IsInteractiveMessage: true,
            InteractiveId: id,
            InteractiveJSONInput: value
        }
        setTimeout(() => {
            events.onSend(activeID, "casual", info)
            handleStopAfterChangeState()
        }, 50)
    })
    /** 停止回答后的状态调整||清空Review状态 */
    const handleStopAfterChangeState = useMemoizedFn(() => {
        // 清空review信息
        // setReviewInfo(undefined)
        // resetPlanReviewTreeKeywords()
    })
    const onStop = useMemoizedFn(() => {
        if (execute && activeID) {
            events.onClose(activeID)
            // handleStopAfterChangeState()
        }
    })
    // #endregion

    useEffect(() => {
        // ai-re-act 页面左侧侧边栏向 chatUI 发送的事件
        const onEvents = (res: string) => {
            try {
                const data = JSON.parse(res) as AIReActEventInfo
                if (!data.type) return
                // 新开聊天对话窗
                if (data.type === "new-chat") {
                    onStop()
                    handleSaveChatInfo()
                    events.handleReset()
                    handleStart("")
                }
            } catch (error) {}
        }
        emiter.on("onReActChatEvent", onEvents)
        return () => {
            emiter.off("onReActChatEvent", onEvents)
        }
    }, [])

    useUpdateEffect(() => {
        const token = events.fetchToken()
        if (execute && activeChat?.id !== token) {
            events.onClose(token)
        }
    }, [activeChat, execute])

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

    return (
        <div className={styles["ai-re-act"]}>
            <div ref={wrapperRef} className={styles["ai-re-act-chat"]} style={{height: "100%"}}>
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
                        </div>
                    </div>
                    <AIReActChatContents chats={uiCasualChat.contents} onSendAIRequire={handleSendAIRequire} />
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
            {logVisible && <AIReActLog logs={uiLogs} setLogVisible={setLogVisible} />}
        </div>
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
