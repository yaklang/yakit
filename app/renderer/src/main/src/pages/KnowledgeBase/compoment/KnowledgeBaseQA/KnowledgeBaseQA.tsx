import {Dispatch, FC, SetStateAction, useEffect, useMemo, useRef} from "react"

import {LightningBoltIcon} from "../../icon/sidebarIcon"

import styles from "../../knowledgeBase.module.scss"
import {OutlinePlusSmIcon, OutlineQAAdjustmentsIcon} from "@/assets/icon/outline"
import {YakitCloseSvgIcon} from "@/components/basics/icon"
import {AIChatTextarea} from "@/pages/ai-agent/template/template"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {answerOptions} from "../../utils"
import {CheckIcon} from "@/assets/newIcon"
import {useMemoizedFn, useSafeState, useUpdateEffect} from "ahooks"
import classNames from "classnames"
import {
    createStreamResponseHandler,
    QAMessage,
    QueryKnowledgeBaseByAIRequest,
    QueryKnowledgeBaseByAIResponse
} from "./uitls"
import {KnowledgeBaseItem} from "../../hooks/useKnowledgeBase"
import {randomString} from "@/utils/randomUtil"
import {failed, info} from "@/utils/notification"
import {BaseQAContent} from "./BaseQAContent"
import {RoundedStopButton} from "@/pages/ai-re-act/aiReActChat/AIReActComponent"

const {ipcRenderer} = window.require("electron")

interface KnowledgeBaseQAProps {
    openQA: {
        status: boolean
        all: boolean
    }
    setOpenQA: Dispatch<
        SetStateAction<{
            status: boolean
            all: boolean
        }>
    >

    knowledgeBase?: KnowledgeBaseItem
    knowledgeBaseID?: string
}

const KnowledgeBaseQA: FC<KnowledgeBaseQAProps> = ({openQA, setOpenQA, knowledgeBase, knowledgeBaseID}) => {
    const [messages, setMessages] = useSafeState<QAMessage[]>([])

    const contentRef = useRef<{scrollToBottom: () => void} | null>(null)
    const [selected, setSelected] = useSafeState<string[]>(["hypothetical_answer"])
    const [question, setQuestion] = useSafeState<string>("")
    const [loading, setLoading] = useSafeState(false)

    const streamingTokenRef = useRef<string>("")

    // 生成唯一ID
    const generateId = useMemoizedFn(() => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

    const onSelected = (value: string) => {
        setSelected(() => {
            return [value]
            // const includesSelectedValue = preValue.includes(value)
            // return includesSelectedValue ? preValue.filter((it) => it !== value) : preValue.concat(value)
        })
    }

    useEffect(() => {
        openQA.status &&
            setMessages((preMessages) => {
                return preMessages.concat({
                    content: `你好，\n这是一个 ${knowledgeBase?.KnowledgeBaseName} 知识库。\n有什么想了解的吗？`,
                    id: generateId(),
                    timestamp: Date.now(),
                    type: "system"
                })
            })
    }, [knowledgeBaseID, openQA.status])

    const onClose = () => {
        setOpenQA((preValue) => ({
            status: !preValue.status,
            all: preValue.all
        }))
    }

    const handleStreamResponse = useMemoizedFn(createStreamResponseHandler(setMessages))

    // 启动问答
    const handleSubmit = useMemoizedFn(async (inputValue: string) => {
        const value = inputValue.trim()
        setQuestion(value)

        if ((!knowledgeBase && !openQA.all) || !value) {
            info("请输入问题" + (openQA.all ? "" : "并选择知识库"))
            return
        }

        const userMessage: QAMessage = {
            id: generateId(),
            type: "user",
            content: value,
            timestamp: Date.now()
        }

        const assistantMessage: QAMessage = {
            id: generateId(),
            type: "assistant",
            content: "",
            timestamp: Date.now(),
            entries: [],
            isStreaming: true,
            processLog: "",
            finalAnswer: "",
            showDetails: false,
            showRelated: false
        }

        setMessages((prev) => [...prev, userMessage, assistantMessage])
        requestAnimationFrame(() => {
            contentRef.current?.scrollToBottom?.()
        })
        setQuestion("")
        setLoading(true)

        const token = randomString(50)
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
                Query: value,
                EnhancePlan: selected.join(","),
                KnowledgeBaseID: openQA.all ? 0 : knowledgeBaseID ? parseInt(knowledgeBaseID, 10) : 0,
                QueryAllCollections: openQA.all
            }

            // 监听流式响应
            ipcRenderer.on(`${token}-data`, (e, data: QueryKnowledgeBaseByAIResponse) => {
                console.log(data, "data")
                handleStreamResponse(data)
            })
            ipcRenderer.on(`${token}-error`, (e, err: any) => {
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
                setQuestion("")
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
            setQuestion("")
        } finally {
            setLoading(false)
            setQuestion("")
        }
    })

    // const stop = useMemoizedFn(async () => {
    //     const token = streamingTokenRef.current
    //     if (!token) return

    //     try {
    //         // 通知主进程取消
    //         await ipcRenderer.invoke("cancel-QueryKnowledgeBaseByAI", token)
    //     } catch {}

    //     // 移除监听器
    //     ipcRenderer.removeAllListeners(`${token}-data`)
    //     ipcRenderer.removeAllListeners(`${token}-error`)
    //     ipcRenderer.removeAllListeners(`${token}-end`)
    //     streamingTokenRef.current = ""

    //     // 结束 loading
    //     setLoading(false)

    //     // 设置最后一条 assistantMessage 为非 streaming
    //     setMessages((prev) => {
    //         const list = [...prev]
    //         const last = list[list.length - 1]
    //         if (last && last.type === "assistant" && last.isStreaming) {
    //             last.isStreaming = false
    //         }
    //         return list
    //     })
    // })

    return (
        <div
            className={classNames(styles["knowledge-base-QA"], {
                [styles["hidden"]]: !openQA.status
            })}
        >
            <div className={styles["base-QA-header"]}>
                <div className={styles["left"]}>
                    <LightningBoltIcon />
                    AI 召回
                </div>
                <div className={styles["right"]}>
                    <OutlinePlusSmIcon
                        onClick={() =>
                            setMessages(
                                (preMessages) =>
                                    [preMessages.findLast((item) => item.type === "system")].filter(
                                        Boolean
                                    ) as QAMessage[]
                            )
                        }
                    />
                    <YakitCloseSvgIcon onClick={() => onClose()} />
                </div>
            </div>
            {/* <BaseQAContent content={messages} /> */}
            <BaseQAContent ref={contentRef} content={messages} />

            <div className={styles["base-QA-footer"]}>
                <div className={styles["footer-body"]}>
                    <div className={styles["footer-inputs"]}>
                        <AIChatTextarea
                            loading={loading}
                            question={question}
                            setQuestion={setQuestion}
                            textareaProps={{
                                placeholder: "请输入问题"
                            }}
                            // extraFooterRight={
                            //     messages?.[messages.length - 1]?.isStreaming && <RoundedStopButton onClick={stop} />
                            // }
                            onSubmit={handleSubmit}
                            extraFooterLeft={
                                <YakitPopover
                                    overlayClassName={styles["base-QA-footer-popover"]}
                                    content={
                                        <div className={styles["base-QA-footer-popver-content"]}>
                                            <div className={styles["title"]}>
                                                <div>回答模式</div>
                                            </div>
                                            {answerOptions.map((it) => (
                                                <div
                                                    className={styles["answer-content"]}
                                                    onClick={() => onSelected(it.value)}
                                                    key={it.value}
                                                >
                                                    <div
                                                        className={classNames(styles.select, {
                                                            [styles.selected]: selected.includes(it.value)
                                                        })}
                                                    >
                                                        <div>{it.label}</div>
                                                        {selected.includes(it.value) ? (
                                                            <CheckIcon className={styles["select-icon"]} />
                                                        ) : null}
                                                    </div>
                                                    {/* <div className={styles["description"]}>{it.description}</div> */}
                                                </div>
                                            ))}
                                        </div>
                                    }
                                    placement='top'
                                >
                                    <YakitButton icon={<OutlineQAAdjustmentsIcon />} type='text2'>
                                        回答模式
                                    </YakitButton>
                                </YakitPopover>
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export {KnowledgeBaseQA}
