import React, {useEffect, useState, useRef} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {Space, Divider, message, Tag, Collapse} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed} from "@/utils/notification"
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
import { JSONParseLog } from "@/utils/tool"

const {ipcRenderer} = window.require("electron")
const {Panel} = Collapse

export const KnowledgeBaseQA: React.FC<KnowledgeBaseQAProps> = ({knowledgeBase, queryAllCollectionsDefault}) => {
    const [messages, setMessages] = useState<QAMessage[]>([])
    const [loading, setLoading] = useState(false)
    const [inputValue, setInputValue] = useState("")
    const [enhancePlan, setEnhancePlan] = useState("hypothetical_answer")
    const [queryAllCollections, setQueryAllCollections] = useState<boolean>(
        typeof queryAllCollectionsDefault === "boolean" ? queryAllCollectionsDefault : true
    )
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const streamingTokenRef = useRef<string>("")

    // 滚动到底部
    const scrollToBottom = useMemoizedFn(() => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"})
    })

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // 当入口切换或知识库变化时，重置查询范围默认值
    useEffect(() => {
        setQueryAllCollections(typeof queryAllCollectionsDefault === "boolean" ? queryAllCollectionsDefault : true)
    }, [queryAllCollectionsDefault, knowledgeBase?.ID])

    // 生成唯一ID
    const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 处理流式响应
    const handleStreamResponse = useMemoizedFn((token: string, response: QueryKnowledgeBaseByAIResponse) => {
        const {Message, MessageType, Data} = response

        setMessages((prev) => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]

            if (lastMessage && lastMessage.type === "assistant" && lastMessage.isStreaming) {
                switch (MessageType) {
                    case "message":
                        // 累积过程消息，并显示为当前内容
                        // @ts-ignore 扩展字段
                        lastMessage.processLog = (lastMessage.processLog || "") + Message + "\n"
                        // @ts-ignore 扩展字段
                        lastMessage.content = lastMessage.processLog
                        break

                    case "mid_result":
                    case "result":
                        // 解析JSON数据并存储（结果通常为单对象；兼容数组与对象），不直接展示
                        try {
                            if (Data === "null" || Data === "undefined" || Data === "" || Data == null) break
                            let parsed
                            if (typeof Data === "string") {
                                parsed = JSONParseLog(Data,{page:"KnowledgeBaseQA", fun:"handleStreamResponse"})
                            } else {
                                parsed = Data
                            }
                            const items = Array.isArray(parsed) ? parsed : [parsed]

                            const normalizeEntry = (e): KnowledgeBaseEntry => {
                                return {
                                    ID: e?.ID ?? e?.id ?? 0,
                                    KnowledgeBaseId:
                                        e?.KnowledgeBaseID ?? e?.KnowledgeBaseId ?? e?.knowledge_base_id ?? 0,
                                    KnowledgeTitle: e?.KnowledgeTitle ?? e?.knowledge_title ?? "",
                                    KnowledgeType: e?.KnowledgeType ?? e?.knowledge_type ?? "",
                                    ImportanceScore: e?.ImportanceScore ?? e?.importance_score ?? 0,
                                    Keywords: (e?.Keywords ?? e?.keywords) || [],
                                    KnowledgeDetails: e?.KnowledgeDetails ?? e?.knowledge_details ?? "",
                                    Summary: e?.Summary ?? e?.summary ?? "",
                                    SourcePage: e?.SourcePage ?? e?.source_page ?? 0,
                                    PotentialQuestions: (e?.PotentialQuestions ?? e?.potential_questions) || [],
                                    PotentialQuestionsVector:
                                        (e?.PotentialQuestionsVector ?? e?.potential_questions_vector) || [],
                                    CreatedAt: e?.CreatedAt ?? e?.created_at,
                                    UpdatedAt: e?.UpdatedAt ?? e?.updated_at
                                } as KnowledgeBaseEntry
                            }

                            const toAppend: KnowledgeBaseEntry[] = items
                                .filter((e) => e !== null && e !== undefined)
                                .map((e) => normalizeEntry(e))

                            if (!lastMessage.entries) {
                                lastMessage.entries = []
                            }
                            lastMessage.entries.push(...toAppend)
                        } catch (error) {
                            console.error("解析结果数据失败:", error)
                            // @ts-ignore
                            lastMessage.processLog =
                                (lastMessage.processLog || "") + `结果数据解析失败: ${String(Data)}\n`
                            // @ts-ignore
                            lastMessage.content = lastMessage.processLog
                        }
                        break

                    case "ai_summary":
                        // AI最终回答：替换可见内容为最终回答，保留过程
                        // @ts-ignore 扩展字段
                        lastMessage.finalAnswer = Message
                        lastMessage.content = Message
                        lastMessage.isStreaming = false
                        break

                    case "error":
                        // @ts-ignore 扩展字段
                        lastMessage.processLog = (lastMessage.processLog || "") + "\n**错误:** " + Message
                        // @ts-ignore 扩展字段
                        lastMessage.content = lastMessage.processLog
                        lastMessage.isStreaming = false
                        break
                }
            }

            return newMessages
        })
    })

    // 启动问答
    const handleAsk = useMemoizedFn(async () => {
        if ((!knowledgeBase && !queryAllCollections) || !inputValue.trim()) {
            message.warning("请输入问题" + (queryAllCollections ? "" : "并选择知识库"))
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
            isStreaming: true,
            // @ts-ignore 扩展字段
            processLog: "",
            // @ts-ignore 扩展字段
            finalAnswer: "",
            // @ts-ignore 扩展字段
            showDetails: false,
            // @ts-ignore 扩展字段
            showRelated: false
        }

        setMessages((prev) => [...prev, userMessage, assistantMessage])
        setInputValue("")
        setLoading(true)

        const token = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        // 如果之前有未清理的流，先清理
        if (streamingTokenRef.current) {
            try {
                await ipcRenderer.invoke("cancel-QueryKnowledgeBaseByAI", streamingTokenRef.current)
            } catch {}
            ipcRenderer.removeAllListeners(`${streamingTokenRef.current}-data`)
            ipcRenderer.removeAllListeners(`${streamingTokenRef.current}-error`)
            ipcRenderer.removeAllListeners(`${streamingTokenRef.current}-end`)
        }
        streamingTokenRef.current = token

        try {
            const request: QueryKnowledgeBaseByAIRequest = {
                Query: inputValue.trim(),
                EnhancePlan: enhancePlan,
                KnowledgeBaseID: queryAllCollections ? 0 : knowledgeBase?.ID || 0,
                QueryAllCollections: queryAllCollections
            }

            // 监听流式响应
            ipcRenderer.on(`${token}-data`, (e, data: QueryKnowledgeBaseByAIResponse) => {
                handleStreamResponse(token, data)
            })
            ipcRenderer.on(`${token}-error`, (e, err) => {
                failed(`查询失败: ${err?.message || err}`)
                setMessages((prev) => {
                    const newMessages = [...prev]
                    const lastMessage = newMessages[newMessages.length - 1]
                    if (lastMessage && lastMessage.type === "assistant" && lastMessage.isStreaming) {
                        lastMessage.content += `\n**错误:** ${err?.message || err}`
                        lastMessage.isStreaming = false
                    }
                    return newMessages
                })
                ipcRenderer.removeAllListeners(`${token}-data`)
                ipcRenderer.removeAllListeners(`${token}-error`)
                ipcRenderer.removeAllListeners(`${token}-end`)
                streamingTokenRef.current = ""
                setLoading(false)
            })
            ipcRenderer.on(`${token}-end`, (e) => {
                setMessages((prev) => {
                    const newMessages = [...prev]
                    const lastMessage = newMessages[newMessages.length - 1]
                    if (lastMessage && lastMessage.type === "assistant" && lastMessage.isStreaming) {
                        lastMessage.isStreaming = false
                    }
                    return newMessages
                })
                ipcRenderer.removeAllListeners(`${token}-data`)
                ipcRenderer.removeAllListeners(`${token}-error`)
                ipcRenderer.removeAllListeners(`${token}-end`)
                streamingTokenRef.current = ""
                setLoading(false)
            })

            // 启动流式查询（注意：流式 IPC 约定为 invoke("方法名", params, token)）
            await ipcRenderer.invoke("QueryKnowledgeBaseByAI", request, token)
        } catch (error) {
            failed(`查询失败: ${error}`)
            setMessages((prev) => {
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
        }
    })

    // 停止查询
    const handleStop = useMemoizedFn(async () => {
        if (streamingTokenRef.current) {
            try {
                await ipcRenderer.invoke("cancel-QueryKnowledgeBaseByAI", streamingTokenRef.current)
                setMessages((prev) => {
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
                ipcRenderer.removeAllListeners(`${streamingTokenRef.current}-data`)
                ipcRenderer.removeAllListeners(`${streamingTokenRef.current}-error`)
                ipcRenderer.removeAllListeners(`${streamingTokenRef.current}-end`)
                streamingTokenRef.current = ""
            }
        }
    })

    // 组件卸载时清理流
    useEffect(() => {
        return () => {
            const token = streamingTokenRef.current
            if (token) {
                try {
                    ipcRenderer.invoke("cancel-QueryKnowledgeBaseByAI", token)
                } catch {}
                ipcRenderer.removeAllListeners(`${token}-data`)
                ipcRenderer.removeAllListeners(`${token}-error`)
                ipcRenderer.removeAllListeners(`${token}-end`)
            }
        }
    }, [])

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
                <Divider orientation='left' style={{fontSize: "12px", margin: "8px 0"}}>
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
                                        <Tag color='blue'>{entry.KnowledgeType}</Tag>
                                        <Tag color='orange'>重要性: {entry.ImportanceScore}</Tag>
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
                    type='text2'
                    size='small'
                    icon={<OutlineRefreshIcon />}
                    onClick={handleClear}
                    disabled={loading}
                >
                    清空对话
                </YakitButton>
            </div>
            {!knowledgeBase && !queryAllCollections ? (
                <div className={styles["no-kb-selected"]}>
                    <YakitEmpty description='请先选择一个知识库' />
                </div>
            ) : (
                <>
                    {/* 对话区域 */}
                    <div className={styles["messages-container"]}>
                        {messages.length === 0 ? (
                            <div className={styles["welcome-message"]}>
                                <YakitEmpty
                                    description={`开始与 ${
                                        knowledgeBase ? knowledgeBase.KnowledgeBaseName : "所有集合"
                                    } 对话吧！`}
                                    imageStyle={{height: 60}}
                                />
                            </div>
                        ) : (
                            <div className={styles["messages-list"]}>
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`${styles["message"]} ${styles[`message-${msg.type}`]}`}
                                    >
                                        <div
                                            className={`${styles["message-content"]} ${
                                                msg.showRelated ? styles["show-related"] : ""
                                            }`}
                                        >
                                            <div className={styles["message-text"]}>
                                                {msg.content.split("\n").map((line, index) => (
                                                    <div key={index}>{line || "\u00A0"}</div>
                                                ))}
                                            </div>
                                            {msg.type === "assistant" && msg.finalAnswer && (
                                                <div className={styles["message-actions"]}>
                                                    <YakitButton
                                                        type='text2'
                                                        size='small'
                                                        onClick={() => {
                                                            setMessages((prev) =>
                                                                prev.map((m) => {
                                                                    if (m.id !== msg.id) return m
                                                                    const show = !m.showDetails
                                                                    return {
                                                                        ...m,
                                                                        // @ts-ignore
                                                                        showDetails: show,
                                                                        // 切换显示内容：true 显示过程日志，false 显示最终回答
                                                                        content: show
                                                                            ? m.processLog || m.content
                                                                            : m.finalAnswer || m.content
                                                                    }
                                                                })
                                                            )
                                                        }}
                                                    >
                                                        {msg.showDetails ? "隐藏详细信息" : "查看详细信息"}
                                                    </YakitButton>
                                                    {msg.entries && msg.entries.length > 0 && (
                                                        <YakitButton
                                                            type='text2'
                                                            size='small'
                                                            onClick={() => {
                                                                setMessages((prev) =>
                                                                    prev.map((m) => {
                                                                        if (m.id !== msg.id) return m
                                                                        return {
                                                                            ...m,
                                                                            // @ts-ignore
                                                                            showRelated: !m.showRelated
                                                                        }
                                                                    })
                                                                )
                                                            }}
                                                        >
                                                            {msg.showRelated ? "隐藏" : "相关知识"}
                                                        </YakitButton>
                                                    )}
                                                </div>
                                            )}
                                            {msg.isStreaming && (
                                                <div className={styles["streaming-indicator"]}>
                                                    <YakitSpin size='small' />
                                                </div>
                                            )}
                                            {msg.entries &&
                                                msg.entries.length > 0 &&
                                                renderKnowledgeEntries(msg.entries)}
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
                            <YakitSelect
                                value={enhancePlan}
                                onChange={(v) => setEnhancePlan(v as string)}
                                size='small'
                                style={{minWidth: 220}}
                            >
                                <YakitSelect.Option value='hypothetical_answer'>
                                    hypothetical_answer：假设回答
                                </YakitSelect.Option>
                                <YakitSelect.Option value='generalize_query'>
                                    generalize_query：泛化回答
                                </YakitSelect.Option>
                                <YakitSelect.Option value='split_query'>split_query：多次查询</YakitSelect.Option>
                                <YakitSelect.Option value='hypothetical_answer_with_split'>
                                    hypothetical_answer_with_split：假设并多次查询
                                </YakitSelect.Option>
                            </YakitSelect>
                        </div>
                    </div>

                    {/* 输入区域 */}
                    <div className={styles["input-area"]}>
                        <div className={styles["input-row"]}>
                            <YakitInput.TextArea
                                placeholder='请输入您的问题...'
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
                                    <YakitButton type='primary' size='small' onClick={handleStop} danger>
                                        停止
                                    </YakitButton>
                                ) : (
                                    <YakitButton
                                        type='primary'
                                        size='small'
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
