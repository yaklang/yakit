import React, {ReactNode} from "react"
import {AIChatMessage, AIChatStreams} from "../type/aiChat"
import styles from "./AIChatTool.module.scss"
import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"
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
export const AIChatToolColorCard: React.FC<AIChatToolColorCardProps> = React.memo((props) => {
    const {activeChat} = useAIAgentStore()
    const {toolCall} = props
    const {nodeId, data} = toolCall
    const extra = useCreation(() => {
        if (isToolStdout(nodeId)) {
            return (
                <div className={styles["card-extra"]}>
                    <div className={styles["extra-btn"]} onClick={onSkip}>
                        <span>跳过</span>
                        <OutlineArrownarrowrightIcon />
                    </div>
                </div>
            )
        }
        return null
    }, [nodeId])
    const title = useCreation(() => {
        if (nodeId === "call-tools") return "Call-tools：参数生成中..."
        if (isToolStdout(nodeId)) return `${nodeId}：调用工具中...`
    }, [nodeId])
    const onSkip = useMemoizedFn((e) => {
        e.stopPropagation()
        // console.log("activeChat", activeChat)
    })
    return (
        <div className={styles["ai-chat-tool-card"]}>
            <div className={styles["card-header"]}>
                <div className={styles["card-title"]}>
                    <OutlineSparklesColorsIcon />
                    <div>{title}</div>
                </div>
                {extra}
            </div>
            <div className={styles["card-content"]}>
                {
                    <>
                        {(data.reason || data.system) && (
                            <div className={styles["think-wrapper"]}>
                                {data.reason && <div>{data.reason}</div>}
                                {data.system && <div>{data.system}</div>}
                            </div>
                        )}
                        {data.stream && (
                            <div className={styles["anwser-wrapper"]}>
                                <React.Fragment>
                                    <ChatMarkdown content={data.stream} skipHtml={true} />
                                </React.Fragment>
                            </div>
                        )}
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
    const handleDetails = useMemoizedFn(() => {
        const m = showYakitDrawer({
            title: "详情",
            width: "40%",
            content: <div>详情</div>,
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
                    <div className={styles["item-time"]}>{formatTimestamp(+item.time)}</div>
                </div>
                <YakitButton type='text'>查看详情</YakitButton>
            </div>
            <div className={styles["item-content"]}>
                <div
                    onClick={(e) => {
                        e.stopPropagation()
                    }}
                    className='content-ellipsis'
                >
                    {item.summary || "暂无内容"}
                </div>
            </div>
        </div>
    )
})
