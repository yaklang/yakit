import React, {useContext, useEffect, useMemo, useRef, useState} from "react"
import {AIReActChatBodyProps} from "../aiReActType"
import AIReActContext from "../useContext/AIReActContext"
import {AIChatInfo, AIChatMessage, AIInputEvent, AIOutputEvent} from "../../ai-agent/type/aiChat"
import {randomString} from "@/utils/randomUtil"
import {yakitNotify} from "@/utils/notification"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {failed} from "@/utils/notification"
import {Divider} from "antd"
import classNames from "classnames"
import styles from "./AIReActChat.module.scss"

const {ipcRenderer} = require("electron")

export const AIReActChat: React.FC = () => {
    const {store, dispatcher} = useContext(AIReActContext)
    const [input, setInput] = useState<string>("")
    const [isStarted, setIsStarted] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [token, setToken] = useState<string>("")

    // 当前聊天数据
    const [currentChat, setCurrentChat] = useState<AIChatInfo>()
    const [messages, setMessages] = useState<any[]>([])
    
    const containerRef = useRef<HTMLDivElement>(null)

    // 滚动到底部
    const scrollToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
    }

    // 监听 AI ReAct 流数据
    useEffect(() => {
        if (!token) return

        const handleAIReActData = (e: any, data: any) => {
            try {
                if (typeof data === "string") {
                    const event = JSON.parse(data)
                    setMessages(prev => [...prev, event])
                } else {
                    setMessages(prev => [...prev, data])
                }
                setTimeout(scrollToBottom, 100)
            } catch (error) {
                console.error("解析 AI ReAct 数据失败:", error)
            }
        }

        const handleAIReActEnd = () => {
            setLoading(false)
        }

        const handleAIReActError = (e: any, error: any) => {
            yakitNotify("error", `AI ReAct 执行失败: ${error}`)
            setLoading(false)
        }

        ipcRenderer.on(`${token}-data`, handleAIReActData)
        ipcRenderer.on(`${token}-end`, handleAIReActEnd)
        ipcRenderer.on(`${token}-error`, handleAIReActError)

        return () => {
            ipcRenderer.removeListener(`${token}-data`, handleAIReActData)
            ipcRenderer.removeListener(`${token}-end`, handleAIReActEnd)
            ipcRenderer.removeListener(`${token}-error`, handleAIReActError)
        }
    }, [token])

    // 初始化 AI ReAct
    const handleStart = async () => {
        if (!store.setting) {
            failed("请先配置 AI ReAct 参数")
            return
        }

        const newToken = randomString(40)
        setToken(newToken)
        setLoading(true)
        setIsStarted(false)
        setMessages([])

        try {
            // 创建新的聊天记录
            const newChat: AIChatInfo = {
                id: randomString(16),
                name: `AI ReAct - ${new Date().toLocaleString()}`,
                question: "",
                time: new Date().getTime(),
                request: {
                    ...store.setting,
                    UserQuery: "",
                    CoordinatorId: randomString(16),
                    Sequence: 1
                }
            }
            setCurrentChat(newChat)
            dispatcher.setActiveChat(newChat)

            // 发送初始化参数
            const startParams: AIInputEvent = {
                IsStart: true,
                Params: {
                    ...store.setting,
                    CoordinatorId: randomString(16),
                    Sequence: 1,
                    UserQuery: ""
                }
            }

            await ipcRenderer.invoke("start-ai-react", newToken, startParams)
            setIsStarted(true)
            setLoading(false)
        } catch (error) {
            failed(`初始化 AI ReAct 失败: ${error}`)
            setLoading(false)
        }
    }

    // 发送用户消息
    const handleSendMessage = async () => {
        if (!input.trim() || !isStarted || !token) return

        const userMessage = input.trim()
        setInput("")
        setLoading(true)

        try {
            // 使用自定义消息格式
            const chatMessage = {
                IsFreeInput: true,
                FreeInput: userMessage
            }

            // 添加用户消息到显示列表
            const userEvent = {
                Type: "user_message",
                Data: userMessage,
                Timestamp: Date.now()
            }
            setMessages(prev => [...prev, userEvent])

            // 发送到服务端
            await ipcRenderer.invoke("send-ai-react", token, chatMessage)
            setTimeout(scrollToBottom, 100)
        } catch (error) {
            failed(`发送消息失败: ${error}`)
        } finally {
            setLoading(false)
        }
    }

    // 停止 AI ReAct
    const handleStop = () => {
        if (token) {
            ipcRenderer.invoke("cancel-ai-react", token)
        }
        setLoading(false)
    }
    // 重新开始
    const handleRestart = () => {
        if (token) {
            ipcRenderer.invoke("cancel-ai-react", token)
        }
        setToken("")
        setIsStarted(false)
        setMessages([])
        setCurrentChat(undefined)
        dispatcher.setActiveChat(undefined)
        handleStart()
    }

    // 新建对话
    const handleNewChat = () => {
        if (token) {
            ipcRenderer.invoke("cancel-ai-react", token)
        }
        setToken("")
        setIsStarted(false)
        setMessages([])
        setCurrentChat(undefined)
        dispatcher.setActiveChat(undefined)
    }

    // 渲染消息
    const renderMessage = (event: any, index: number) => {
        return (
            <div key={index} className={styles["message-item"]}>
                <div className={styles["message-header"]}>
                    <span className={styles["message-type"]}>{event.Type || "未知类型"}</span>
                    <span className={styles["message-time"]}>
                        {event.Timestamp ? new Date(event.Timestamp).toLocaleTimeString() : ""}
                    </span>
                </div>
                <div className={styles["message-content"]}>
                    {typeof event.Data === "string" ? event.Data : JSON.stringify(event.Data || event, null, 2)}
                </div>
            </div>
        )
    }

    return (
        <div className={styles["ai-re-act-chat"]}>
            {/* 头部控制区 */}
            <div className={styles["chat-header"]}>
                <div className={styles["header-title"]}>AI ReAct 对话</div>
                <div className={styles["header-actions"]}>
                    {!isStarted && (
                        <YakitButton type="primary" onClick={handleStart} loading={loading}>
                            开始 AI ReAct
                        </YakitButton>
                    )}
                    {isStarted && (
                        <>
                            <YakitButton onClick={handleRestart} loading={loading}>
                                重新开始
                            </YakitButton>
                            <YakitButton onClick={handleNewChat}>
                                新建对话
                            </YakitButton>
                            {loading && (
                                <YakitButton danger onClick={handleStop}>
                                    停止
                                </YakitButton>
                            )}
                        </>
                    )}
                </div>
            </div>

            <Divider style={{margin: "8px 0"}} />

            {/* 消息区域 */}
            <div className={styles["chat-content"]} ref={containerRef}>
                {loading && !isStarted && (
                    <div className={styles["loading-wrapper"]}>
                        <YakitSpin tip="正在初始化 AI ReAct..." />
                    </div>
                )}
                
                {!isStarted && !loading && messages.length === 0 && (
                    <YakitEmpty description="请点击「开始 AI ReAct」来初始化对话" />
                )}

                {messages.length > 0 && (
                    <div className={styles["messages-list"]}>
                        {messages.map((event, index) => renderMessage(event, index))}
                    </div>
                )}
            </div>

            {/* 输入区域 */}
            {isStarted && (
                <>
                    <Divider style={{margin: "8px 0"}} />
                    <div className={styles["chat-input"]}>
                        <YakitInput.TextArea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="请输入您的问题..."
                            rows={3}
                            onPressEnter={(e) => {
                                if (e.shiftKey) return
                                e.preventDefault()
                                handleSendMessage()
                            }}
                        />
                        <div className={styles["input-actions"]}>
                            <YakitButton 
                                type="primary" 
                                onClick={handleSendMessage}
                                disabled={!input.trim() || loading}
                                loading={loading}
                            >
                                发送
                            </YakitButton>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
