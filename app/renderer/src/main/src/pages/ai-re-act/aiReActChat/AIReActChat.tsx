import React, {useContext, useEffect, useMemo, useRef, useState} from "react"
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
import styles from "./AIReActChat.module.scss"
import {Uint8ArrayToString} from "@/utils/str"

const {ipcRenderer} = window.require("electron")

export const AIReActChat: React.FC = () => {
    const {store, dispatcher} = useContext(AIReActContext)
    const [input, setInput] = useState<string>("")
    const [isStarted, setIsStarted] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [token, setToken] = useState<string>("")

    // 当前聊天数据
    const [currentChat, setCurrentChat] = useState<AIChatInfo>()
    const [messages, setMessages] = useState<any[]>([])
    // Consumption 指标数据
    const [consumption, setConsumption] = useState<{
        consumption_uuid: string
        input_consumption: number
        output_consumption: number
        timestamp?: number
    } | null>(null)
    // 用户交互请求数据
    const [userInteractive, setUserInteractive] = useState<{
        id: string
        prompt: string
        options: Array<{
            index: number
            prompt_title: string
        }> | null
        timestamp?: number
    } | null>(null)
    // 流式数据聚合
    const [streamData, setStreamData] = useState<{
        nodeId: string
        content: string
        timestamp?: number
        isFinished?: boolean
    } | null>(null)
    // 用户是否正在手动滚动流数据
    const [isUserScrolling, setIsUserScrolling] = useState<boolean>(false)
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    // AI 成本指标数据
    const [costMetrics, setCostMetrics] = useState<{
        latest: number
        average: number
        history: number[]
        maxHistorySize: number
    }>({
        latest: 0,
        average: 0,
        history: [],
        maxHistorySize: 10 // 保留最近10个值计算滚动平均
    })

    const containerRef = useRef<HTMLDivElement>(null)
    const streamContentRef = useRef<HTMLDivElement>(null)

    // 滚动到底部
    const scrollToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
    }

    // 流数据滚动到底部
    const scrollStreamToBottom = () => {
        if (streamContentRef.current) {
            streamContentRef.current.scrollTop = streamContentRef.current.scrollHeight
        }
    }

    // 处理用户手动滚动
    const handleStreamScroll = () => {
        if (!streamContentRef.current) return

        const container = streamContentRef.current
        const isAtBottom = Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 5

        // 如果用户滚动到底部，重置用户滚动状态
        if (isAtBottom) {
            setIsUserScrolling(false)
        } else {
            // 用户正在手动滚动
            setIsUserScrolling(true)

            // 清除之前的定时器
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current)
            }

            // 2秒后重置用户滚动状态，允许自动滚动
            scrollTimeoutRef.current = setTimeout(() => {
                setIsUserScrolling(false)
            }, 2000)
        }
    }

    // 监听 AI ReAct 流数据
    useEffect(() => {
        if (!token) return

        const handleAIReActData = (e: any, data: any) => {
            try {
                let event = data
                if (typeof data === "string") {
                    event = JSON.parse(data)
                }

                let ipcContent = ""
                let ipcStreamDelta = ""
                try {
                    ipcContent = Uint8ArrayToString(event.Content) || ""
                    ipcStreamDelta = Uint8ArrayToString(event.StreamDelta) || ""
                } catch (error) {}
                const {IsSystem, IsReason, NodeId, Timestamp} = event
                const type = IsSystem ? "systemStream" : IsReason ? "reasonStream" : "stream"
                console.log(
                    "解析后的事件:",
                    event,
                    "\n",
                    `EventUUID:${event.EventUUID}\nType:${event.Type}\nNodeId:${event.NodeId}\nTaskIndex:${event.TaskIndex}\n流类型:${type}\nTimestamp:${event.Timestamp}`,
                    "\n",
                    ipcContent,
                    "\n",
                    ipcStreamDelta
                )

                // 检查是否是 consumption 类型的消息
                if (event.Type === "consumption") {
                    // 解析 consumption 数据
                    if (event.Content && typeof event.Content === "string") {
                        try {
                            const consumptionData = JSON.parse(event.Content)
                            setConsumption({
                                consumption_uuid: consumptionData.consumption_uuid || "",
                                input_consumption: consumptionData.input_consumption || 0,
                                output_consumption: consumptionData.output_consumption || 0,
                                timestamp: Date.now()
                            })
                        } catch (parseError) {
                            console.error("解析 consumption 数据失败:", parseError)
                        }
                    }
                    // consumption 消息不添加到普通消息列表中
                    return
                }

                // 检查是否是用户交互请求类型的消息
                if (event.Type === "require_user_interactive") {
                    // 解析用户交互数据
                    try {
                        // 第一层：将字节数组转换为字符串
                        const contentString =
                            typeof event.Content === "string" ? event.Content : convertContentToString(event.Content)

                        // 第二层：解析 JSON 字符串
                        const interactiveData = JSON.parse(contentString)

                        setUserInteractive({
                            id: interactiveData.id || "",
                            prompt: interactiveData.prompt || "",
                            options: interactiveData.options || [],
                            timestamp: Date.now()
                        })
                    } catch (parseError) {
                        console.error("解析用户交互数据失败:", parseError, event)
                    }
                    // require_user_interactive 消息添加到消息列表中作为日志记录
                    setMessages((prev) => [...prev, event])
                    setTimeout(scrollToBottom, 100)
                    return
                }

                // 检查是否是流式数据类型的消息
                if (event.Type === "stream" && event.IsStream && event.StreamDelta) {
                    // 处理流式数据
                    try {
                        const deltaContent = convertContentToString(event.StreamDelta)
                        setStreamData((prev) => {
                            if (prev && prev.nodeId === event.NodeId) {
                                // 聚合同一个 NodeId 的内容
                                return {
                                    ...prev,
                                    content: prev.content + deltaContent,
                                    timestamp: Date.now()
                                }
                            } else {
                                // 新的流式数据
                                return {
                                    nodeId: event.NodeId || "",
                                    content: deltaContent,
                                    timestamp: Date.now(),
                                    isFinished: false
                                }
                            }
                        })
                        // 只在用户没有手动滚动时才自动滚动到最新内容
                        if (!isUserScrolling) {
                            setTimeout(scrollStreamToBottom, 50)
                        }
                    } catch (error) {
                        console.error("处理流式数据失败:", error)
                    }
                    // 流式数据不添加到普通消息列表中
                    return
                }

                // 检查是否是流完成标记（structured 类型且 NodeId 是 stream-finished）
                if (event.Type === "structured" && event.NodeId === "stream-finished") {
                    // 标记流式数据完成
                    setStreamData((prev) => {
                        if (prev) {
                            return {
                                ...prev,
                                isFinished: true,
                                timestamp: Date.now()
                            }
                        }
                        return prev
                    })
                    // stream-finished 消息不添加到消息列表中（根据要求过滤掉）
                    return
                }

                // 检查是否是 AI 成本指标消息
                if (event.Type === "ai_total_cost_ms") {
                    // 解析成本数据
                    if (event.Content && typeof event.Content === "string") {
                        try {
                            const costData = JSON.parse(event.Content)
                            const costValue = costData.cost_ms || 0

                            setCostMetrics((prev) => {
                                const newHistory = [...prev.history, costValue]
                                // 保持历史记录在指定大小内
                                if (newHistory.length > prev.maxHistorySize) {
                                    newHistory.shift()
                                }

                                // 计算滚动平均值
                                const average = newHistory.reduce((sum, val) => sum + val, 0) / newHistory.length

                                return {
                                    ...prev,
                                    latest: costValue,
                                    average: Math.round(average * 100) / 100, // 保留两位小数
                                    history: newHistory
                                }
                            })
                        } catch (parseError) {
                            console.error("解析 AI 成本数据失败:", parseError)
                        }
                    }
                    // 成本消息不添加到普通消息列表中
                    return
                }

                if (event.Type === "tool_use_review_require") {
                    try {
                        if (!event.IsJson) return
                        const data = JSON.parse(ipcContent) as AIChatMessage.ToolUseReviewRequire

                        if (!data?.id) return
                        if (!data?.selectors || !data?.selectors?.length) return

                        setTimeout(() => {
                            const info: AIInputEvent = {
                                IsInteractiveMessage: true,
                                InteractiveId: data.id,
                                InteractiveJSONInput: JSON.stringify({suggestion: "continue"})
                            }
                            ipcRenderer.invoke("send-ai-re-act", token, info)
                        }, 3000)
                    } catch (error) {}
                    return
                }

                // 检查是否是需要忽略的消息类型（只在控制台显示）
                if (
                    event.Type === "react_task_created" ||
                    event.Type === "iteration" ||
                    event.Type === "review_release"
                ) {
                    console.log(`[${event.Type}]`, event)

                    // 特殊处理 review_release：主动释放任何 review 的过程
                    if (event.Type === "review_release") {
                        console.log("Review 过程已释放，清空用户交互状态")
                        setUserInteractive(null) // 清空用户交互状态
                    }

                    // 这些消息不添加到界面消息列表中
                    return
                }

                // 检查是否是 structured 类型的 react_task_created 消息（只在控制台显示）
                if (event.Type === "structured" && event.NodeId === "react_task_created") {
                    console.log(`[structured-${event.NodeId}]`, event)
                    // 这些消息不添加到界面消息列表中
                    return
                }

                // 其他类型的消息添加到消息列表
                setMessages((prev) => [...prev, event])
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

            // 清理滚动定时器
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current)
            }
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
                    Sequence: 1,
                    ReviewPolicy:"manual"
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
                    UserQuery: "",
                    ReviewPolicy:"manual"
                }
            }

            console.log("startParams", startParams)

            await ipcRenderer.invoke("start-ai-re-act", newToken, startParams)
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
            // 构建消息格式
            let chatMessage: any

            // 如果有用户交互状态，使用交互模式
            if (userInteractive) {
                chatMessage = {
                    IsInteractiveMessage: true,
                    InteractiveId: userInteractive.id,
                    InteractiveJSONInput: JSON.stringify({suggestion: userMessage})
                }
            } else {
                // 普通模式使用自由输入
                chatMessage = {
                    IsFreeInput: true,
                    FreeInput: userMessage
                }
            }

            // 添加用户消息到显示列表
            const userEvent = {
                Type: "user_message",
                Data: userMessage,
                Timestamp: Date.now()
            }
            setMessages((prev) => [...prev, userEvent])

            // 清空用户交互状态
            setUserInteractive(null)

            // 发送到服务端
            await ipcRenderer.invoke("send-ai-re-act", token, chatMessage)
            setTimeout(scrollToBottom, 100)
        } catch (error) {
            failed(`发送消息失败: ${error}`)
        } finally {
            setLoading(false)
        }
    }

    // 处理选项选择
    const handleOptionSelect = async (option: {index: number; prompt_title: string}) => {
        if (!isStarted || !token || !userInteractive) return

        setLoading(true)

        try {
            // 构建包含交互信息的消息
            const chatMessage = {
                IsInteractiveMessage: true,
                InteractiveId: userInteractive.id,
                InteractiveJSONInput: JSON.stringify({suggestion: option.prompt_title})
            }

            // 添加用户选择到显示列表
            const userEvent = {
                Type: "user_selection",
                Data: `选择: ${option.prompt_title}`,
                Timestamp: Date.now()
            }
            setMessages((prev) => [...prev, userEvent])

            // 清空用户交互状态
            setUserInteractive(null)

            // 发送到服务端
            await ipcRenderer.invoke("send-ai-re-act", token, chatMessage)
            setTimeout(scrollToBottom, 100)
        } catch (error) {
            failed(`发送选择失败: ${error}`)
        } finally {
            setLoading(false)
        }
    }

    // 停止 AI ReAct
    const handleStop = () => {
        if (token) {
            ipcRenderer.invoke("cancel-ai-re-act", token)
        }
        setLoading(false)
    }
    // 重新开始
    const handleRestart = () => {
        if (token) {
            ipcRenderer.invoke("cancel-ai-re-act", token)
        }
        setToken("")
        setIsStarted(false)
        setMessages([])
        setConsumption(null)
        setUserInteractive(null)
        setStreamData(null)
        setCostMetrics({
            latest: 0,
            average: 0,
            history: [],
            maxHistorySize: 10
        })
        setCurrentChat(undefined)
        dispatcher.setActiveChat(undefined)
        handleStart()
    }

    // 新建对话
    const handleNewChat = () => {
        if (token) {
            ipcRenderer.invoke("cancel-ai-re-act", token)
        }
        setToken("")
        setIsStarted(false)
        setMessages([])
        setConsumption(null)
        setUserInteractive(null)
        setStreamData(null)
        setCostMetrics({
            latest: 0,
            average: 0,
            history: [],
            maxHistorySize: 10
        })
        setCurrentChat(undefined)
        dispatcher.setActiveChat(undefined)
    }

    // 将字节数组转换为字符串
    const convertContentToString = (content: any): string => {
        if (typeof content === "string") {
            return content
        }

        if (typeof content === "object" && content !== null) {
            // 如果是字节数组对象 (如 {"0": 123, "1": 34, ...})
            if (typeof content["0"] === "number") {
                try {
                    // 将数字字节转换为字符串
                    const bytes = Object.values(content) as number[]
                    const uint8Array = new Uint8Array(bytes)
                    const decoder = new TextDecoder("utf-8", {fatal: false})
                    return decoder.decode(uint8Array)
                } catch (error) {
                    console.error("字节转换失败:", error)
                    return JSON.stringify(content, null, 2)
                }
            }
        }

        return JSON.stringify(content, null, 2)
    }

    // 渲染消息内容
    const renderMessageContent = (event: any) => {
        if (typeof event.Data === "string") {
            return event.Data
        }

        // 如果是结构化数据，检查是否有 Content 字段需要特殊处理
        if (event.Data && typeof event.Data === "object") {
            const data = {...event.Data}

            // 如果有 Content 字段且是字节数组，转换为字符串
            if (data.Content && typeof data.Content === "object" && typeof data.Content["0"] === "number") {
                data.Content = convertContentToString(data.Content)
            }

            return JSON.stringify(data, null, 2)
        }

        // 直接处理事件对象
        if (event && typeof event === "object") {
            const eventCopy = {...event}

            // 如果有 Content 字段且是字节数组，转换为字符串
            if (
                eventCopy.Content &&
                typeof eventCopy.Content === "object" &&
                typeof eventCopy.Content["0"] === "number"
            ) {
                eventCopy.Content = convertContentToString(eventCopy.Content)
            }

            return JSON.stringify(eventCopy, null, 2)
        }

        return JSON.stringify(event || {}, null, 2)
    }

    // 渲染 Consumption 指标
    const renderConsumption = () => {
        if (!consumption) return null

        return (
            <div className={styles["consumption-panel"]}>
                <div className={styles["consumption-header"]}>
                    <span className={styles["consumption-title"]}>📊 消费指标</span>
                    <span className={styles["consumption-time"]}>
                        {consumption.timestamp ? new Date(consumption.timestamp).toLocaleTimeString() : ""}
                    </span>
                </div>
                <div className={styles["consumption-content"]}>
                    <div className={styles["consumption-item"]}>
                        <span className={styles["consumption-label"]}>输入消费:</span>
                        <span className={styles["consumption-value"]}>
                            {consumption.input_consumption.toLocaleString()}
                        </span>
                    </div>
                    <div className={styles["consumption-item"]}>
                        <span className={styles["consumption-label"]}>输出消费:</span>
                        <span className={styles["consumption-value"]}>
                            {consumption.output_consumption.toLocaleString()}
                        </span>
                    </div>
                    <div className={styles["consumption-item"]}>
                        <span className={styles["consumption-label"]}>总计:</span>
                        <span className={styles["consumption-value consumption-total"]}>
                            {(consumption.input_consumption + consumption.output_consumption).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    // 渲染成本指标组件
    const renderCostMetrics = () => {
        if (costMetrics.history.length === 0) return null

        return (
            <div className={styles["cost-metrics"]}>
                <div className={styles["cost-item"]}>
                    <span className={styles["cost-label"]}>最新耗时</span>
                    <span className={styles["cost-value cost-latest"]}>{costMetrics.latest}ms</span>
                </div>
                <div className={styles["cost-item"]}>
                    <span className={styles["cost-label"]}>平均耗时</span>
                    <span className={styles["cost-value cost-average"]}>{costMetrics.average}ms</span>
                </div>
                <div className={styles["cost-history"]}>
                    <span className={styles["cost-history-label"]}>样本数: {costMetrics.history.length}</span>
                </div>
            </div>
        )
    }

    // 渲染流式数据组件
    const renderStreamData = () => {
        if (!streamData) return null

        const content = streamData.content || "等待流数据..."

        return (
            <div className={styles["stream-panel"]}>
                <div className={styles["stream-header"]}>
                    <span className={styles["stream-title"]}>
                        🔄 实时流数据
                        {streamData.isFinished && <span className={styles["stream-finished"]}>✅ 完成</span>}
                    </span>
                    <span className={styles["stream-info"]}>
                        NodeId: {streamData.nodeId}
                        {streamData.timestamp && (
                            <span className={styles["stream-time"]}>
                                {new Date(streamData.timestamp).toLocaleTimeString()}
                            </span>
                        )}
                        <span className={styles["scroll-hint"]}>📜 可滚动查看</span>
                    </span>
                </div>
                <div className={styles["stream-content"]} ref={streamContentRef} onScroll={handleStreamScroll}>
                    <pre className={styles["stream-text"]}>
                        {content}
                        {!streamData.isFinished && <span className={styles["stream-cursor"]}>|</span>}
                    </pre>
                </div>
            </div>
        )
    }

    // 渲染用户交互界面
    const renderUserInteractive = () => {
        if (!userInteractive) return null

        return (
            <div className={styles["interactive-panel"]}>
                <div className={styles["interactive-header"]}>
                    <span className={styles["interactive-title"]}>🤖 AI 需要您的反馈</span>
                    <div className={styles["header-right"]}>
                        <YakitButton
                            type='text'
                            size='small'
                            className={styles["debug-json-btn"]}
                            onClick={() => {
                                const debugInfo = {
                                    userInteractive: userInteractive,
                                    options: userInteractive.options,
                                    optionsType: typeof userInteractive.options,
                                    optionsLength: userInteractive.options?.length,
                                    optionsArray: Array.isArray(userInteractive.options)
                                }
                                const jsonContent = JSON.stringify(debugInfo, null, 2)
                                navigator.clipboard
                                    .writeText(jsonContent)
                                    .then(() => {
                                        yakitNotify("success", "调试信息已复制到剪贴板")
                                    })
                                    .catch(() => {
                                        console.log("调试信息:", debugInfo)
                                        yakitNotify("info", "已在控制台输出调试信息")
                                    })
                            }}
                        >
                            🐛 JSON
                        </YakitButton>
                        <span className={styles["interactive-time"]}>
                            {userInteractive.timestamp ? new Date(userInteractive.timestamp).toLocaleTimeString() : ""}
                        </span>
                    </div>
                </div>
                <div className={styles["interactive-content"]}>
                    <div className={styles["interactive-prompt"]}>{userInteractive.prompt}</div>
                    {userInteractive.options && userInteractive.options.length > 0 && (
                        <div className={styles["interactive-options"]}>
                            <div className={styles["options-title"]}>请选择一个选项：</div>
                            <div className={styles["options-list"]}>
                                {userInteractive.options.map((option, index) => (
                                    <YakitButton
                                        key={index}
                                        className={styles["option-button"]}
                                        onClick={() => handleOptionSelect(option)}
                                        disabled={loading}
                                    >
                                        {option.index}. {option.prompt_title}
                                    </YakitButton>
                                ))}
                            </div>
                        </div>
                    )}
                    {(!userInteractive.options || userInteractive.options.length === 0) && (
                        <div className={styles["no-options-hint"]}>请在下方输入框中自由输入回复</div>
                    )}

                    {/* 交互式输入区域 */}
                    <div className={styles["interactive-input-area"]}>
                        {userInteractive.options && userInteractive.options.length > 0 && (
                            <div className={styles["interactive-divider"]}>
                                <span>或者自由输入</span>
                            </div>
                        )}
                        <div className={styles["interactive-input"]}>
                            <YakitInput.TextArea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder='您也可以自由输入回复...'
                                rows={3}
                                onPressEnter={(e) => {
                                    if (e.shiftKey) return
                                    e.preventDefault()
                                    handleSendMessage()
                                }}
                            />
                            <div className={styles["input-actions"]}>
                                <YakitButton
                                    type='primary'
                                    onClick={handleSendMessage}
                                    disabled={!input.trim() || loading}
                                    loading={loading}
                                >
                                    发送回复
                                </YakitButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // 检查是否是日志类型的消息
    const isLogMessage = (event: any) => {
        // thought、result、action、require_user_interactive 和 tool_call_start 类型直接视为日志
        if (
            event.Type === "thought" ||
            event.Type === "result" ||
            event.Type === "action" ||
            event.Type === "require_user_interactive" ||
            event.Type === "tool_call_start"
        ) {
            return true
        }

        // structured 类型需要检查特定条件
        if (event.Type === "structured") {
            // react_task_enqueue 和 react_task_dequeue 直接视为日志
            if (event.NodeId === "react_task_enqueue" || event.NodeId === "react_task_dequeue") {
                return true
            }

            // system 类型的消息直接视为日志
            if (event.NodeId === "system") {
                return true
            }

            // 包含 level 字段的视为日志
            if (event.Content) {
                try {
                    const content = typeof event.Content === "string" ? JSON.parse(event.Content) : event.Content
                    return content.level !== undefined
                } catch {
                    return false
                }
            }
        }

        return false
    }

    // 渲染日志样式的消息
    const renderLogMessage = (event: any, index: number) => {
        let logContent = ""
        let logLevel = "info"

        if (event.Type === "thought") {
            try {
                // 第一层：将字节数组转换为字符串
                const contentString =
                    typeof event.Content === "string" ? event.Content : convertContentToString(event.Content)

                // 第二层：解析 JSON 字符串
                const content = JSON.parse(contentString)

                // 显示实际的思考内容
                logContent = content.thought || "思考中..."
                logLevel = "thought"
            } catch (error) {
                console.error("解析 thought 消息失败:", error, event)
                // 如果解析失败，尝试显示原始内容
                logContent = typeof event.Content === "string" ? event.Content : "思考中..."
            }
        } else if (event.Type === "result") {
            try {
                // 第一层：将字节数组转换为字符串
                const contentString =
                    typeof event.Content === "string" ? event.Content : convertContentToString(event.Content)

                // 第二层：解析 JSON 字符串
                const content = JSON.parse(contentString)

                // 显示实际的结果内容
                logContent = content.result || "执行结果"
                logLevel = "result"
            } catch (error) {
                console.error("解析 result 消息失败:", error, event)
                // 如果解析失败，尝试显示原始内容
                logContent = typeof event.Content === "string" ? event.Content : "执行结果"
            }
        } else if (event.Type === "action") {
            try {
                // 第一层：将字节数组转换为字符串
                const contentString =
                    typeof event.Content === "string" ? event.Content : convertContentToString(event.Content)

                // 第二层：解析 JSON 字符串
                const content = JSON.parse(contentString)

                // 显示实际的动作内容，并提取关键信息
                let actionText = content.action || "执行动作"

                // 如果有 action_type，也显示出来
                if (content.action_type) {
                    actionText = `[${content.action_type}] ${actionText}`
                }

                logContent = actionText
                logLevel = "action"
            } catch (error) {
                console.error("解析 action 消息失败:", error, event)
                // 如果解析失败，尝试显示原始内容
                logContent = typeof event.Content === "string" ? event.Content : "执行动作"
            }
        } else if (event.Type === "require_user_interactive") {
            try {
                // 第一层：将字节数组转换为字符串
                const contentString =
                    typeof event.Content === "string" ? event.Content : convertContentToString(event.Content)

                // 第二层：解析 JSON 字符串
                const content = JSON.parse(contentString)

                // 显示交互请求的内容
                const optionsCount = content.options ? content.options.length : 0
                const optionsText = optionsCount > 0 ? ` (${optionsCount}个选项)` : " (自由输入)"
                logContent = `等待用户交互: ${content.prompt || "请回复"}${optionsText}`
                logLevel = "interactive"
            } catch (error) {
                console.error("解析 require_user_interactive 消息失败:", error, event)
                // 如果解析失败，尝试显示原始内容
                logContent = typeof event.Content === "string" ? event.Content : "等待用户交互"
            }
        } else if (event.Type === "tool_call_start") {
            try {
                // 第一层：将字节数组转换为字符串
                const contentString =
                    typeof event.Content === "string" ? event.Content : convertContentToString(event.Content)

                // 第二层：解析 JSON 字符串
                const content = JSON.parse(contentString)

                // 显示工具调用开始的信息
                const toolName = content.tool?.name || "未知工具"
                const toolDescription = content.tool?.description || "无描述"
                const callId = content.call_tool_id || "未知ID"
                logContent = `🔧 开始调用工具: ${toolName} (${callId}) - ${toolDescription}`
                logLevel = "action"
            } catch (error) {
                console.error("解析 tool_call_start 消息失败:", error, event)
                // 如果解析失败，尝试显示原始内容
                logContent = typeof event.Content === "string" ? event.Content : "开始调用工具"
            }
        } else if (event.Type === "structured") {
            try {
                // 第一层：将字节数组转换为字符串
                const contentString =
                    typeof event.Content === "string" ? event.Content : convertContentToString(event.Content)

                // 第二层：解析 JSON 字符串
                const content = JSON.parse(contentString)

                // 特殊处理 react_task_enqueue 和 react_task_dequeue
                if (event.NodeId === "react_task_enqueue") {
                    const taskId = content.react_task_id || "未知任务"
                    const taskInput = content.react_task_input || "无输入"
                    logContent = `进入任务队列 - ID: ${taskId}, 输入: ${taskInput}`
                    logLevel = "info"
                } else if (event.NodeId === "react_task_dequeue") {
                    const taskId = content.react_task_id || "未知任务"
                    const taskInput = content.react_task_input || "无输入"
                    logContent = `离开任务队列 - ID: ${taskId}, 输入: ${taskInput}`
                    logLevel = "info"
                } else if (event.NodeId === "system") {
                    // 处理系统消息
                    logContent = content.message || "系统消息"
                    logLevel = content.level || "info"
                } else {
                    // 优先显示 message，然后是 content，最后是完整的 JSON 字符串
                    logContent = content.message || content.content || JSON.stringify(content, null, 2)
                    logLevel = content.level || "info"
                }
            } catch (error) {
                console.error("解析 structured 消息失败:", error, event)
                // 如果解析失败，尝试显示原始内容
                logContent = typeof event.Content === "string" ? event.Content : "系统消息"
            }
        }

        return (
            <div key={index} className={styles["log-message"]}>
                <span className={`${styles["log-level"]} ${styles[`log-level-${logLevel}`]}`}>
                    {logLevel.toUpperCase()}
                </span>
                <span className={styles["log-time"]}>
                    {event.Timestamp
                        ? new Date(parseInt(event.Timestamp) * 1000).toLocaleTimeString()
                        : new Date().toLocaleTimeString()}
                </span>
                <span className={styles["log-content"]}>{logContent}</span>
                <YakitButton
                    type='text'
                    size='small'
                    className={styles["log-json-btn"]}
                    onClick={() => {
                        const jsonContent = JSON.stringify(event, null, 2)
                        navigator.clipboard
                            .writeText(jsonContent)
                            .then(() => {
                                yakitNotify("success", "原始 JSON 已复制到剪贴板")
                            })
                            .catch(() => {
                                // 如果复制失败，在控制台输出
                                console.log("原始 JSON 数据:", event)
                                yakitNotify("info", "已在控制台输出原始 JSON 数据")
                            })
                    }}
                >
                    📋 JSON
                </YakitButton>
            </div>
        )
    }

    // 检查是否是用户消息
    const isUserMessage = (event: any) => {
        return event.Type === "user_message" || event.Type === "user_selection"
    }

    // 渲染消息
    const renderMessage = (event: any, index: number) => {
        // 如果是日志类型消息，使用日志样式渲染
        if (isLogMessage(event)) {
            return renderLogMessage(event, index)
        }

        // 检查是否是用户消息
        const isUser = isUserMessage(event)
        const messageClassName = isUser ? `${styles["message-item"]} ${styles["user-message"]}` : styles["message-item"]

        // 获取消息类型显示文本
        const getMessageTypeText = (type: string) => {
            switch (type) {
                case "user_message":
                    return "用户消息"
                case "user_selection":
                    return "用户选择"
                default:
                    return type || "未知类型"
            }
        }

        // 其他消息使用原有的卡片样式
        return (
            <div key={index} className={messageClassName}>
                <div className={styles["message-header"]}>
                    <span className={styles["message-type"]}>{getMessageTypeText(event.Type)}</span>
                    <span className={styles["message-time"]}>
                        {event.Timestamp ? new Date(event.Timestamp).toLocaleTimeString() : ""}
                    </span>
                </div>
                <div className={styles["message-content"]}>
                    {isUser ? (
                        // 用户消息使用普通文本显示，不用 pre 标签
                        <div>{renderMessageContent(event)}</div>
                    ) : (
                        // 系统消息保持原有的 pre 标签格式
                        <pre>{renderMessageContent(event)}</pre>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={styles["ai-re-act-chat"]}>
            {/* 头部控制区 */}
            <div className={styles["chat-header"]}>
                <div className={styles["header-top"]}>
                    <div className={styles["header-left"]}>
                        <div className={styles["header-title"]}>AI ReAct 对话</div>
                    </div>
                    <div className={styles["header-right"]}>
                        {/* 成本指标显示在右上角 */}
                        {renderCostMetrics()}
                        <div className={styles["header-actions"]}>
                            {!isStarted && (
                                <YakitButton type='primary' onClick={handleStart} loading={loading}>
                                    开始 AI ReAct
                                </YakitButton>
                            )}
                            {isStarted && (
                                <>
                                    <YakitButton onClick={handleRestart} loading={loading}>
                                        重新开始
                                    </YakitButton>
                                    <YakitButton onClick={handleNewChat}>新建对话</YakitButton>
                                    {loading && (
                                        <YakitButton danger onClick={handleStop}>
                                            停止
                                        </YakitButton>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
                {/* Consumption 指标显示区域 */}
                {renderConsumption()}
                {/* Stream 数据显示区域 */}
                {renderStreamData()}
            </div>

            <Divider style={{margin: "8px 0"}} />

            {/* 消息区域 */}
            <div className={styles["chat-content"]} ref={containerRef}>
                {loading && !isStarted && (
                    <div className={styles["loading-wrapper"]}>
                        <YakitSpin tip='正在初始化 AI ReAct...' />
                    </div>
                )}

                {!isStarted && !loading && messages.length === 0 && (
                    <YakitEmpty description='请点击「开始 AI ReAct」来初始化对话' />
                )}

                {messages.length > 0 && (
                    <div className={styles["messages-list"]}>
                        {messages.map((event, index) => renderMessage(event, index))}
                    </div>
                )}
            </div>

            {/* 用户交互区域 */}
            {userInteractive && (
                <>
                    <Divider style={{margin: "8px 0"}} />
                    {renderUserInteractive()}
                </>
            )}

            {/* 普通输入区域 */}
            {isStarted && !userInteractive && (
                <>
                    <Divider style={{margin: "8px 0"}} />
                    <div className={styles["chat-input"]}>
                        <YakitInput.TextArea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder='请输入您的问题...'
                            rows={3}
                            onPressEnter={(e) => {
                                if (e.shiftKey) return
                                e.preventDefault()
                                handleSendMessage()
                            }}
                        />
                        <div className={styles["input-actions"]}>
                            <YakitButton
                                type='primary'
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
