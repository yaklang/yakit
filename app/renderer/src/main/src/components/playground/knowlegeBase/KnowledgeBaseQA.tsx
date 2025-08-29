import React, {useEffect, useState, useRef} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {Form, Space, Divider, message, Card, Tag, Collapse} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed, success} from "@/utils/notification"
import {
    KnowledgeBaseQAProps, 
    QAMessage, 
    QueryKnowledgeBaseByAIRequest, 
    QueryKnowledgeBaseByAIResponse,
    KnowledgeBaseEntry
} from "./types"
import styles from "./KnowledgeBaseQA.module.scss"
import {PaperAirplaneIcon} from "@/assets/newIcon"
import {OutlineRefreshIcon} from "@/assets/icon/outline"

const {ipcRenderer} = window.require("electron")
const {Panel} = Collapse

export const KnowledgeBaseQA: React.FC<KnowledgeBaseQAProps> = ({
    knowledgeBase,
    onRefresh
}) => {
    const [messages, setMessages] = useState<QAMessage[]>([])
    const [loading, setLoading] = useState(false)
    const [inputValue, setInputValue] = useState("")
    const [enhancePlan, setEnhancePlan] = useState("")
    const [queryAllCollections, setQueryAllCollections] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const streamingTokenRef = useRef<string>("")

    // 滚动到底部
    const scrollToBottom = useMemoizedFn(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    })

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // 生成唯一ID
    const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 处理流式响应
    const handleStreamResponse = useMemoizedFn((token: string, response: QueryKnowledgeBaseByAIResponse) => {
        const { Message, MessageType, Data } = response

        setMessages(prev => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            
            if (lastMessage && lastMessage.type === "assistant" && lastMessage.isStreaming) {
                switch (MessageType) {
                    case "message":
                        // 过程消息，添加到内容末尾
                        lastMessage.content += Message + "\n"
                        break
                    
                    case "mid_result":
                    case "result":
                        // 解析JSON数据
                        try {
                            const entries: KnowledgeBaseEntry[] = JSON.parse(Data)
                            if (!lastMessage.entries) {
                                lastMessage.entries = []
                            }
                            lastMessage.entries.push(...entries)
                        } catch (error) {
                            console.error("解析结果数据失败:", error)
                            lastMessage.content += `结果数据解析失败: ${Data}\n`
                        }
                        break
                    
                    case "ai_summary":
                        // AI最终回答
                        lastMessage.content += "\n\n**AI回答:**\n" + Message
                        lastMessage.isStreaming = false
                        break
                    
                    case "error":
                        lastMessage.content += "\n**错误:** " + Message
                        lastMessage.isStreaming = false
                        break
                }
            }
            
            return newMessages
        })
    })

    // 启动问答
    const handleAsk = useMemoizedFn(async () => {
        if (!knowledgeBase || !inputValue.trim()) {
            message.warning("请选择知识库并输入问题")
            return
        }

        const userMessage: QAMessage = {
            id: generateId(),
            type: "user",
            content: inputValue.trim(),
            timestamp: Date.now()
        }

        const assistantMessage: QAMessage = {
            id: generateId(),
            type: "assistant",
            content: "正在思考中...\n",
            timestamp: Date.now(),
            entries: [],
            isStreaming: true
        }

        setMessages(prev => [...prev, userMessage, assistantMessage])
        setInputValue("")
        setLoading(true)

        const token = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        streamingTokenRef.current = token

        try {
            const request: QueryKnowledgeBaseByAIRequest = {
                Query: inputValue.trim(),
                EnhancePlan: enhancePlan.trim() || "请基于知识库内容回答问题",
                KnowledgeBaseID: knowledgeBase.ID,
                QueryAllCollections: queryAllCollections
            }

            // 监听流式响应
            const handleMessage = (event: any, data: any) => {
                if (data.token === token) {
                    handleStreamResponse(token, data.data)
                }
            }

            ipcRenderer.on("client-QueryKnowledgeBaseByAI", handleMessage)

            // 启动流式查询
            await ipcRenderer.invoke("QueryKnowledgeBaseByAI", request, token)

        } catch (error) {
            failed(`查询失败: ${error}`)
            setMessages(prev => {
                const newMessages = [...prev]
                const lastMessage = newMessages[newMessages.length - 1]
                if (lastMessage && lastMessage.type === "assistant" && lastMessage.isStreaming) {
                    lastMessage.content = `查询失败: ${error}`
                    lastMessage.isStreaming = false
                }
                return newMessages
            })
        } finally {
            setLoading(false)
            // 清理事件监听
            setTimeout(() => {
                ipcRenderer.removeAllListeners("client-QueryKnowledgeBaseByAI")
            }, 1000)
        }
    })

    // 停止查询
    const handleStop = useMemoizedFn(async () => {
        if (streamingTokenRef.current) {
            try {
                await ipcRenderer.invoke("cancel-QueryKnowledgeBaseByAI", streamingTokenRef.current)
                setMessages(prev => {
                    const newMessages = [...prev]
                    const lastMessage = newMessages[newMessages.length - 1]
                    if (lastMessage && lastMessage.type === "assistant" && lastMessage.isStreaming) {
                        lastMessage.content += "\n\n**查询已停止**"
                        lastMessage.isStreaming = false
                    }
                    return newMessages
                })
            } catch (error) {
                console.error("停止查询失败:", error)
            } finally {
                setLoading(false)
                streamingTokenRef.current = ""
            }
        }
    })

    // 清空对话
    const handleClear = useMemoizedFn(() => {
        setMessages([])
    })

    // 处理回车发送
    const handleKeyPress = useMemoizedFn((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (!loading) {
                handleAsk()
            }
        }
    })

    // 渲染知识库条目
    const renderKnowledgeEntries = (entries: KnowledgeBaseEntry[]) => {
        if (!entries || entries.length === 0) return null

        return (
            <div className={styles["knowledge-entries"]}>
                <Divider orientation="left" style={{fontSize: "12px", margin: "8px 0"}}>
                    相关知识 ({entries.length}条)
                </Divider>
                <Collapse ghost>
                    {entries.map((entry, index) => (
                        <Panel 
                            key={entry.ID || index}
                            header={
                                <div className={styles["entry-header"]}>
                                    <span className={styles["entry-title"]}>{entry.KnowledgeTitle}</span>
                                    <Space size={4}>
                                        <Tag color="blue">{entry.KnowledgeType}</Tag>
                                        <Tag color="orange">重要性: {entry.ImportanceScore}</Tag>
                                    </Space>
                                </div>
                            }
                        >
                            <div className={styles["entry-content"]}>
                                {entry.Summary && (
                                    <div className={styles["entry-summary"]}>
                                        <strong>摘要:</strong> {entry.Summary}
                                    </div>
                                )}
                                {entry.KnowledgeDetails && (
                                    <div className={styles["entry-details"]}>
                                        <strong>详情:</strong> {entry.KnowledgeDetails}
                                    </div>
                                )}
                                {entry.Keywords && entry.Keywords.length > 0 && (
                                    <div className={styles["entry-keywords"]}>
                                        <strong>关键词:</strong>
                                        <Space size={4} wrap>
                                            {entry.Keywords.map((keyword, idx) => (
                                                <Tag key={idx}>{keyword}</Tag>
                                            ))}
                                        </Space>
                                    </div>
                                )}
                                {entry.SourcePage && (
                                    <div className={styles["entry-source"]}>
                                        <strong>来源页码:</strong> {entry.SourcePage}
                                    </div>
                                )}
                            </div>
                        </Panel>
                    ))}
                </Collapse>
            </div>
        )
    }

    return (
        <div className={styles["knowledge-base-qa"]}>
            <div className={styles["qa-header"]}>
                <YakitButton 
                    type="text2" 
                    size="small" 
                    icon={<OutlineRefreshIcon />}
                    onClick={handleClear}
                    disabled={loading}
                >
                    清空对话
                </YakitButton>
            </div>
            {!knowledgeBase ? (
                <div className={styles["no-kb-selected"]}>
                    <YakitEmpty description="请先选择一个知识库" />
                </div>
            ) : (
                <>
                    {/* 对话区域 */}
                    <div className={styles["messages-container"]}>
                        {messages.length === 0 ? (
                            <div className={styles["welcome-message"]}>
                                <YakitEmpty 
                                    description={`开始与 ${knowledgeBase.KnowledgeBaseName} 对话吧！`}
                                    imageStyle={{height: 60}}
                                />
                            </div>
                        ) : (
                            <div className={styles["messages-list"]}>
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`${styles["message"]} ${styles[`message-${msg.type}`]}`}>
                                        <div className={styles["message-content"]}>
                                            <div className={styles["message-text"]}>
                                                {msg.content.split('\n').map((line, index) => (
                                                    <div key={index}>{line || '\u00A0'}</div>
                                                ))}
                                            </div>
                                            {msg.isStreaming && (
                                                <div className={styles["streaming-indicator"]}>
                                                    <YakitSpin size="small" />
                                                </div>
                                            )}
                                            {msg.entries && renderKnowledgeEntries(msg.entries)}
                                        </div>
                                        <div className={styles["message-time"]}>
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* 配置区域 */}
                    <div className={styles["config-area"]}>
                        <div className={styles["config-row"]}>
                            <YakitInput
                                placeholder="增强计划（可选）"
                                value={enhancePlan}
                                onChange={(e) => setEnhancePlan(e.target.value)}
                                size="small"
                            />
                            <div className={styles["config-switch"]}>
                                <span>查询所有集合:</span>
                                <YakitSwitch
                                    checked={queryAllCollections}
                                    onChange={setQueryAllCollections}
                                    size="small"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 输入区域 */}
                    <div className={styles["input-area"]}>
                        <div className={styles["input-row"]}>
                            <YakitInput.TextArea
                                placeholder="请输入您的问题..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                rows={3}
                                disabled={loading}
                                maxLength={2000}
                                showCount
                            />
                            <div className={styles["input-actions"]}>
                                {loading ? (
                                    <YakitButton
                                        type="primary"
                                        size="small"
                                        onClick={handleStop}
                                        danger
                                    >
                                        停止
                                    </YakitButton>
                                ) : (
                                    <YakitButton
                                        type="primary"
                                        size="small"
                                        icon={<PaperAirplaneIcon />}
                                        onClick={handleAsk}
                                        disabled={!inputValue.trim()}
                                    >
                                        发送
                                    </YakitButton>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
