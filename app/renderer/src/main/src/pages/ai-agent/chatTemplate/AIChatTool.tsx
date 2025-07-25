import React, {ReactNode, useRef, useState} from "react"
import {AIChatMessage, AIChatStreams, AIInputEvent} from "../type/aiChat"
import styles from "./AIChatTool.module.scss"
// import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"
import {SolidToolIcon} from "@/assets/icon/solid"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import classNames from "classnames"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useCreation, useMemoizedFn} from "ahooks"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {v4 as uuidv4} from "uuid"
import {isToolStdout} from "../utils"
import {OutlineArrownarrowrightIcon} from "@/assets/icon/outline"
import useAIAgentStore from "../useContext/useStore"
import {AIChatToolDrawerContent} from "./AIAgentChatTemplate"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
const {ipcRenderer} = window.require("electron")

interface AIChatToolProps {
    item: AIChatMessage.AIToolData
}
export const AIChatTool: React.FC<AIChatToolProps> = React.memo((props) => {
    return <div>总结</div>
})

interface AIChatToolColorCardProps {
    toolCall: AIChatStreams
}
const OutlineSparklesColorsIcon = () => {
    const id = uuidv4()
    return (
        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
            <path
                d='M3.33333 2V4.66667M2 3.33333H4.66667M4 11.3333V14M2.66667 12.6667H5.33333M8.66667 2L10.1905 6.57143L14 8L10.1905 9.42857L8.66667 14L7.14286 9.42857L3.33333 8L7.14286 6.57143L8.66667 2Z'
                stroke={`url(#${id})`}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <defs>
                <linearGradient id={id} x1='2' y1='2' x2='16.3935' y2='6.75561' gradientUnits='userSpaceOnUse'>
                    <stop stopColor='#DC5CDF' />
                    <stop offset='0.639423' stopColor='#8862F8' />
                    <stop offset='1' stopColor='#4493FF' />
                </linearGradient>
            </defs>
        </svg>
    )
}
/** @name AI工具按钮对应图标 */
const AIToolToIconMap: Record<string, ReactNode> = {
    "enough-cancel": <OutlineArrownarrowrightIcon />
}
export const AIChatToolColorCard: React.FC<AIChatToolColorCardProps> = React.memo((props) => {
    const {activeChat} = useAIAgentStore()
    const {toolCall} = props
    const {nodeId, data, toolAggregation} = toolCall

    const title = useCreation(() => {
        if (nodeId === "call-tools") return "Call-tools：参数生成中..."
        if (isToolStdout(nodeId)) return `${nodeId}：调用工具中...`
    }, [nodeId])
    const onToolExtra = useMemoizedFn((item: AIChatMessage.ReviewSelector) => {
        switch (item.value) {
            case "enough-cancel":
                onSkip(item)
                break
            default:
                break
        }
    })
    const onSkip = useMemoizedFn((item: AIChatMessage.ReviewSelector) => {
        if (!activeChat) return
        if (!toolAggregation?.interactiveId) return
        const token = activeChat.id
        const jsonInput = {
            suggestion: item.value
        }
        const info: AIInputEvent = {
            IsInteractiveMessage: true,
            InteractiveId: toolAggregation.interactiveId, // reviewData.data.id
            InteractiveJSONInput: JSON.stringify(jsonInput)
        }
        ipcRenderer.invoke("send-ai-task", token, info)
    })
    return (
        <div className={styles["ai-chat-tool-card"]}>
            <div className={styles["card-header"]}>
                <div className={styles["card-title"]}>
                    <OutlineSparklesColorsIcon />
                    <div>{title}</div>
                </div>
                {isToolStdout(nodeId) && toolAggregation?.selectors && (
                    <div className={styles["card-extra"]}>
                        {toolAggregation.selectors.map((item) => {
                            return (
                                <YakitPopconfirm
                                    title='跳过会取消工具调用，使用当前输出结果进行后续工作决策，是否确认跳过'
                                    key={item.value}
                                    onConfirm={() => onToolExtra(item)}
                                >
                                    <div key={item.value} className={styles["extra-btn"]}>
                                        <span>{item.prompt}</span>
                                        {AIToolToIconMap[item.value]}
                                    </div>
                                </YakitPopconfirm>
                            )
                        })}
                    </div>
                )}
            </div>
            <div className={styles["card-content"]}>
                {
                    <>
                        {(data.reason || data.system || data.stream) && (
                            <div className={styles["think-wrapper"]}>
                                {data.reason && <div>{data.reason}</div>}
                                {data.system && <div>{data.system}</div>}
                                {data.stream && <div>{data.stream}</div>}
                            </div>
                        )}
                        {/* {data.stream && (
                            <div className={styles["anwser-wrapper"]}>
                                <React.Fragment>
                                    <ChatMarkdown content={data.stream} skipHtml={true} />
                                </React.Fragment>
                            </div>
                        )} */}
                    </>
                }
            </div>
        </div>
    )
})

interface AIChatToolItemProps {
    item: AIChatMessage.AIToolData
}
export const AIChatToolItem: React.FC<AIChatToolItemProps> = React.memo((props) => {
    const {item} = props
    const {activeChat} = useAIAgentStore()
    const syncProcessEventIdRef = useRef<string>()
    const handleDetails = useMemoizedFn(() => {
        if (!activeChat) return
        if (!item?.callToolId) return
        syncProcessEventIdRef.current = uuidv4()
        const token = activeChat.id
        const params: AIInputEvent = {
            IsSyncMessage: true,
            SyncType: "sync_process_event",
            SyncJsonInput: JSON.stringify({
                process_id: item?.callToolId,
                sync_process_event_id: syncProcessEventIdRef.current
            })
        }
        ipcRenderer.invoke("send-ai-task", token, params)
        const m = showYakitDrawer({
            title: "详情",
            width: "40%",
            bodyStyle: {padding: 0},
            content: <AIChatToolDrawerContent syncId={syncProcessEventIdRef.current || ""} />,
            onClose: () => m.destroy()
        })
    })
    const tag = useCreation(() => {
        switch (item.status) {
            case "failed":
                return (
                    <YakitTag color='red' className={styles["tag-Error"]}>
                        失败
                    </YakitTag>
                )
            case "success":
                return (
                    <YakitTag color='green' className={styles["tag-Success"]}>
                        成功
                    </YakitTag>
                )
            case "user_cancelled":
                return (
                    <YakitTag color='white' className={styles["tag-Neutral"]}>
                        已取消
                    </YakitTag>
                )
            default:
                break
        }
    }, [item.status])
    const summaryEmpty = useCreation(() => {
        switch (item.status) {
            case "failed":
                return "获取失败原因中..."
            case "success":
                return "执行结果正在总结中..."
            case "user_cancelled":
                return "工具调用取消中..."
            default:
                return "暂无内容"
        }
    }, [item.status])
    return (
        <div
            className={classNames(styles["ai-chat-tool-item"], {
                [styles["ai-chat-tool-item-success"]]: item.status === "success",
                [styles["ai-chat-tool-item-failed"]]: item.status === "failed",
                [styles["ai-chat-tool-item-user-cancelled"]]: item.status === "user_cancelled"
            })}
            onClick={handleDetails}
        >
            <div className={styles["item-heard"]}>
                <div
                    className={styles["item-title"]}
                    onClick={(e) => {
                        e.stopPropagation()
                    }}
                >
                    <SolidToolIcon />
                    <div>{item.toolName}</div>
                    {tag}
                    <div className={styles["item-time"]}>{+item.time ? formatTimestamp(+item.time) : "-"}</div>
                </div>
                <YakitButton type='text'>查看详情</YakitButton>
            </div>
            <div className={styles["item-content"]}>
                <div
                    onClick={(e) => {
                        e.stopPropagation()
                    }}
                >
                    {item.summary || summaryEmpty}
                </div>
            </div>
        </div>
    )
})
