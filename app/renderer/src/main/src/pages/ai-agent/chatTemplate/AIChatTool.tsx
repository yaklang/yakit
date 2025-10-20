import React from "react"
import styles from "./AIChatTool.module.scss"
// import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"
import {SolidToolIcon} from "@/assets/icon/solid"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import classNames from "classnames"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useCreation, useMemoizedFn} from "ahooks"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {AIChatToolDrawerContent} from "./AIAgentChatTemplate"
import {AIToolResult} from "@/pages/ai-re-act/hooks/aiRender"

interface AIChatToolItemProps {
    time: number
    item: AIToolResult
    type?: "re-act"
}
/**@deprecated 已更换为 ToolInvokerCard */
export const AIChatToolItem: React.FC<AIChatToolItemProps> = React.memo((props) => {
    const {time, item, type} = props
    const handleDetails = useMemoizedFn(() => {
        if (!item?.callToolId) return
        const m = showYakitDrawer({
            title: "详情",
            width: "40%",
            bodyStyle: {padding: 0},
            content: <AIChatToolDrawerContent callToolId={item?.callToolId} />,
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
                return type === "re-act" ? "执行失败" : "获取失败原因中..."
            case "success":
                return type === "re-act" ? "执行成功" : "执行结果正在总结中..."
            case "user_cancelled":
                return type === "re-act" ? "用户取消" : "工具调用取消中..."
            default:
                return "-"
        }
    }, [item.status, type])
    const toolStdoutShowContent = useCreation(() => {
        return item?.toolStdoutContent?.content || ""
    }, [item.toolStdoutContent])
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
                    <div className={styles["item-time"]}>{+time ? formatTimestamp(+time) : "-"}</div>
                </div>
                <YakitButton type='text'>查看详情</YakitButton>
            </div>
            <div className={styles["item-content"]}>
                {toolStdoutShowContent && (
                    <div
                        className={styles["item-stdout-content"]}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    >
                        <pre className={styles["stdout-pre"]}>
                            <code>{toolStdoutShowContent}</code>
                        </pre>
                    </div>
                )}
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
