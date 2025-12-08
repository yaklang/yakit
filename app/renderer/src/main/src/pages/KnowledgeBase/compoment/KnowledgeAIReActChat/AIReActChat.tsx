import React, {useMemo, useRef, useState} from "react"

import styles from "./AIReActChat.module.scss"
import {AIChatTextarea} from "@/pages/ai-agent/template/template"
import {AIChatTextareaProps} from "@/pages/ai-agent/template/type"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {ColorsChatIcon} from "@/assets/icon/colors"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import {AIModelSelect} from "@/pages/ai-agent/aiModelList/aiModelSelect/AIModelSelect"
import classNames from "classnames"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"

import {AITaskQuery} from "@/pages/ai-agent/components/aiTaskQuery/AITaskQuery"
import {AIReActChatProps} from "@/pages/ai-re-act/aiReActChat/AIReActChatType"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import {AIInputEvent} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIReActChatContents} from "@/pages/ai-re-act/aiReActChatContents/AIReActChatContents"
import {ChevronleftButton, RoundedStopButton} from "@/pages/ai-re-act/aiReActChat/AIReActComponent"
import {KnowledgeBaseItem} from "../../hooks/useKnowledgeBase"

const AIReActChat: React.FC<AIReActChatProps & {knowledgeId?: string; knowledgeBases: KnowledgeBaseItem[]}> =
    React.memo((props) => {
        const {mode, chatContainerClassName, chatContainerHeaderClassName, knowledgeId, knowledgeBases} = props

        const {casualChat} = useAIChatUIData()
        const {chatIPCData} = useChatIPCStore()
        const {chatIPCEvents, handleStart, handleStop} = useChatIPCDispatcher()
        const execute = useCreation(() => chatIPCData.execute, [chatIPCData.execute])

        const wrapperRef = useRef<HTMLDivElement>(null)

        const [showFreeChat, setShowFreeChat] = useControllableValue<boolean>(props, {
            defaultValue: true,
            valuePropName: "showFreeChat",
            trigger: "setShowFreeChat"
        })

        const {activeChat, setting} = useAIAgentStore()

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
            const name = knowledgeBases.find((it) => it.ID === knowledgeId)?.KnowledgeBaseName
            const qsContext = `${name}：` + qs
            if (!setting) {
                yakitNotify("error", "请先配置 AI ReAct 参数")
                return
            }
            if (execute) {
                handleSend(qsContext)
            } else {
                handleStart(qsContext)
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

        const isShowRetract = useCreation(() => {
            return mode === "task" && showFreeChat
        }, [mode, showFreeChat])
        const isShowExpand = useCreation(() => {
            return mode === "task" && !showFreeChat
        }, [mode, showFreeChat])

        const handleSwitchShowFreeChat = useMemoizedFn((v) => {
            setShowFreeChat(v)
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
                                    AI 召回
                                </div>
                                <div className={styles["chat-header-extra"]}>
                                    {isShowRetract && (
                                        <ChevronleftButton onClick={() => handleSwitchShowFreeChat(false)} />
                                    )}
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
                                            </>
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        )
    })

export {AIReActChat}
