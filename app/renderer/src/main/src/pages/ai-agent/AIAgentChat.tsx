import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {AIAgentChatProps, AIAgentChatStreamProps, AIAgentEmptyProps} from "./aiAgentType"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"
import {formatNumberUnits, formatTimeUnix} from "./utils"
import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

/** @name 欢迎页 */
export const AIAgentEmpty: React.FC<AIAgentEmptyProps> = memo((props) => {
    return (
        <div className={styles["ai-agent-empty"]}>
            <div className={styles["empty-title"]}>AI-Agent安全助手</div>
            <div className={styles["empty-subtitle"]}>专注于安全编码与漏洞分析的智能助手</div>
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
                <YakitCollapse activeKey={activeKeys} onChange={handleChange}>
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
