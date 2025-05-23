import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useControllableValue, useMemoizedFn} from "ahooks"
import {
    AIAgentChatBodyProps,
    AIAgentChatProps,
    AIAgentChatReviewProps,
    AIAgentChatStreamProps,
    AIAgentEmptyProps,
    AIChatLogsProps
} from "../aiAgentType"
import {
    OutlineArrowdownIcon,
    OutlineArrowupIcon,
    OutlineChevrondoubledownIcon,
    OutlineChevrondoubleupIcon,
    OutlineChevronrightIcon,
    OutlineWarpIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {formatNumberUnits, formatTimeUnix} from "../utils"
import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {Input} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidPaperairplaneIcon} from "@/assets/icon/solid"

import classNames from "classnames"
import styles from "./AIAgentChatTemplate.module.scss"

/** @name 欢迎页 */
export const AIAgentEmpty: React.FC<AIAgentEmptyProps> = memo((props) => {
    const {onSearch} = props

    const [question, setQuestion] = useControllableValue<string>(props, {
        defaultValue: "",
        valuePropName: "question",
        trigger: "setQuestion"
    })

    const isQuestion = useMemo(() => {
        return !!(question && question.trim())
    }, [question])

    return (
        <div className={styles["ai-agent-empty"]}>
            <div className={styles["empty-header"]}>
                <div className={styles["title"]}>AI-Agent 安全助手</div>
                <div className={styles["sub-title"]}>专注于安全编码与漏洞分析的智能助手</div>
            </div>

            <div className={styles["empty-input"]}>
                <div className={styles["ai-agent-input"]}>
                    <Input.TextArea
                        className={styles["question-textArea"]}
                        bordered={false}
                        placeholder='请下发任务, AI-Agent将执行(shift + enter 换行)'
                        value={question}
                        autoSize={true}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                            const keyCode = e.keyCode ? e.keyCode : e.key
                            const shiftKey = e.shiftKey
                            if (keyCode === 13 && shiftKey) {
                                e.stopPropagation()
                                e.preventDefault()
                                setQuestion(`${question}\n`)
                            }
                            if (keyCode === 13 && !shiftKey) {
                                e.stopPropagation()
                                e.preventDefault()
                                onSearch()
                            }
                        }}
                    />

                    <div className={styles["question-footer"]}>
                        <YakitButton disabled={!isQuestion} icon={<SolidPaperairplaneIcon />} onClick={onSearch} />
                    </div>
                </div>
            </div>
        </div>
    )
})

/** @name 对话框内容 */
export const AIAgentChatBody: React.FC<AIAgentChatBodyProps> = memo((props) => {
    const {info, consumption} = props

    // 问题
    const qs = useMemo(() => {
        if (!info) return ""
        return info.question
    }, [info])
    // AI的Token消耗
    const token = useMemo(() => {
        if (info?.answer) {
            return [
                formatNumberUnits(info.answer.consumption?.input_consumption || 0),
                formatNumberUnits(info.answer.consumption?.output_consumption || 0)
            ]
        }
        return [
            formatNumberUnits(consumption?.input_consumption || 0),
            formatNumberUnits(consumption?.output_consumption || 0)
        ]
    }, [info, consumption])

    return (
        <div className={styles["ai-agent-chat-body"]}>
            <div className={styles["body-question-info"]}>
                <div className={styles["question-style"]}>{qs}</div>
                <div className={styles["info-wrapper"]}>
                    <div className={styles["info-token"]}>
                        Tokens:
                        <div className={classNames(styles["token-tag"], styles["upload-token"])}>
                            <OutlineArrowupIcon />
                            {token[0]}
                        </div>
                        <div className={classNames(styles["token-tag"], styles["download-token"])}>
                            <OutlineArrowdownIcon />
                            {token[1]}
                        </div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["info-time"]}>创建时间: {}</div>
                </div>
            </div>

            <div></div>
        </div>
    )
})

/** @name 审阅内容 */
export const AIAgentChatReview: React.FC<AIAgentChatReviewProps> = memo((props) => {
    const {} = props

    const [expand, setExpand] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "expand",
        trigger: "setExpand"
    })
    const handleExpand = useMemoizedFn(() => {
        setExpand((old) => !old)
    })

    return (
        <div className={styles["ai-agent-chat-review"]}>
            <div></div>

            <div className={styles["review-footer"]}>
                <div className={styles["btn-group"]}>
                    <YakitButton
                        type='outline2'
                        icon={expand ? <OutlineChevrondoubledownIcon /> : <OutlineChevrondoubleupIcon />}
                        onClick={handleExpand}
                    >
                        {expand ? "隐藏，稍后审阅" : "展开审阅信息"}
                    </YakitButton>
                </div>

                <div className={styles["btn-group"]}>
                    <YakitButton>
                        继续执行
                        <OutlineWarpIcon />
                    </YakitButton>
                </div>
            </div>
        </div>
    )
})

/** chat-日志 */
export const AIChatLogs: React.FC<AIChatLogsProps> = memo((props) => {
    const {logs, onClose} = props

    const wrapper = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (wrapper.current) {
            const {scrollHeight} = wrapper.current
            const {height} = wrapper.current.getBoundingClientRect()
            if (height < scrollHeight) {
                wrapper.current.scrollTop = scrollHeight
            }
        }
    }, [logs])

    return (
        <div ref={wrapper} className={styles["ai-chat-logs"]}>
            <div className={styles["logs-header"]}>
                <div className={styles["header-title"]}>日志</div>

                <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onClose} />
            </div>

            <div className={styles["logs-content"]}>
                {logs.map((item, index) => {
                    const {level, message} = item
                    return (
                        <div
                            key={index}
                            className={classNames(styles["log-item"], {
                                [styles["warning-log"]]: level === "warning",
                                [styles["error-log"]]: level === "error"
                            })}
                        >
                            • {message}
                        </div>
                    )
                })}
            </div>
        </div>
    )
})

/** @name 任务栏项(可折叠) */
export const AIAgentChat: React.FC<AIAgentChatProps> = memo((props) => {
    const {chatInfo, consumption, ...rest} = props

    const [expand, setExpand] = useState(true)

    const token = useMemo(() => {
        if (chatInfo.answer) {
            return [
                formatNumberUnits(chatInfo.answer.consumption?.input_consumption || 0),
                formatNumberUnits(chatInfo.answer.consumption?.output_consumption || 0)
            ]
        }

        return [
            formatNumberUnits(consumption?.input_consumption || 0),
            formatNumberUnits(consumption?.output_consumption || 0)
        ]
    }, [chatInfo, consumption])

    return (
        <div className={styles["ai-agent-chat"]}>
            <div className={styles["chat-header"]}>
                <div className={styles["header-title"]} onClick={() => setExpand(!expand)}>
                    <div className={classNames(styles["expand-icon"], {[styles["expand-active"]]: expand})}>
                        <OutlineChevronrightIcon />
                    </div>
                    <div className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}>
                        {`任务${expand ? "" : ": " + chatInfo.question}`}
                    </div>
                </div>

                <div className={classNames(styles["header-content"], {[styles["header-content-hidden"]]: !expand})}>
                    <div className={styles["content-body"]}>
                        <div className={styles["content-question"]}>{chatInfo.question}</div>
                        <div className={styles["content-setting"]}>
                            <div>
                                Tokens: ↑{token[0]} ↓{token[1]}
                            </div>
                            {/* <div>Context Window: 666</div> */}
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles["chat-body"]}>
                <AIAgentChatStream {...rest} />
            </div>
        </div>
    )
})

/** @name chat-信息流展示 */
export const AIAgentChatStream: React.FC<AIAgentChatStreamProps> = memo((props) => {
    const {activeStream, streams} = props

    const wrapper = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (wrapper.current) {
            const {scrollHeight} = wrapper.current
            const {height} = wrapper.current.getBoundingClientRect()
            if (height < scrollHeight) {
                wrapper.current.scrollTop = scrollHeight
            }
        }
    }, [streams])

    const [activeKey, setActiveKey] = useState<string[]>([])
    const handleChange = useMemoizedFn((arr: string | string[]) => {
        if (Array.isArray(arr)) {
            setActiveKey(arr.filter((item) => item !== activeStream))
        }
    })

    const activeKeys = useMemo(() => {
        const arr: string[] = []
        if (activeStream) arr.push(activeStream)
        if (activeKey.length > 0) {
            arr.push(...activeKey)
        }
        return arr
    }, [activeStream, activeKey])

    return (
        <div ref={wrapper} className={styles["ai-agent-chat-stream"]}>
            <div className={styles["stream-list"]}>
                <YakitCollapse destroyInactivePanel={true} activeKey={activeKeys} onChange={handleChange}>
                    {streams.map((item) => {
                        const {type, timestamp, data} = item
                        const key = `${type}-${timestamp}`
                        return (
                            <YakitCollapse.YakitPanel key={key} header={`${type} ${formatTimeUnix(timestamp)}`}>
                                <div className={styles["content-item"]}>
                                    {data.reason && (
                                        <div className={styles["item-stream"]}>
                                            <div className={styles["stream-header"]}>思考: </div>
                                            <div className={styles["stream-content"]}>{data.reason}</div>
                                        </div>
                                    )}
                                    {data.system && (
                                        <div className={styles["item-stream"]}>
                                            <div className={styles["stream-header"]}>系统提示: </div>
                                            <div className={styles["stream-content"]}>{data.system}</div>
                                        </div>
                                    )}
                                    {data.stream && (
                                        <div className={styles["item-stream"]}>
                                            <div className={styles["stream-header"]}>回答: </div>
                                            <div className={styles["stream-content"]}>
                                                <React.Fragment>
                                                    <ChatMarkdown content={data.stream} skipHtml={true} />
                                                </React.Fragment>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </YakitCollapse.YakitPanel>
                        )
                    })}

                    {streams.length === 0 && <div className={styles["stream-empty"]}>思考中...</div>}
                </YakitCollapse>
            </div>
        </div>
    )
})
