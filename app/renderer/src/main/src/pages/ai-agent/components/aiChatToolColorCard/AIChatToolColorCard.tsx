import {useCreation, useMemoizedFn} from "ahooks"
import {AIChatToolColorCardProps} from "./type"
import React, {ReactNode} from "react"
import useChatIPCDispatcher from "../../useContext/ChatIPCContent/useDispatcher"
import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIChatIPCSendParams} from "../../useContext/ChatIPCContent/ChatIPCContent"
import styles from "./AIChatToolColorCard.module.scss"
import {OutlineSparklesColorsIcon} from "@/assets/icon/colors"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {OutlineArrownarrowrightIcon} from "@/assets/icon/outline"
import {isToolStdoutStream} from "@/pages/ai-re-act/hooks/utils"

/** @name AI工具按钮对应图标 */
const AIToolToIconMap: Record<string, ReactNode> = {
    "enough-cancel": <OutlineArrownarrowrightIcon />
}

export const AIChatToolColorCard: React.FC<AIChatToolColorCardProps> = React.memo((props) => {
    const {handleSend} = useChatIPCDispatcher()
    const {toolCall} = props
    const {NodeId, content, selectors} = toolCall
    const title = useCreation(() => {
        if (NodeId === "call-tools") return "Call-tools：参数生成中..."
        if (isToolStdoutStream(NodeId)) return `${NodeId}：调用工具中...`
    }, [NodeId])
    const onToolExtra = useMemoizedFn((item: AIAgentGrpcApi.ReviewSelector) => {
        switch (item.value) {
            case "enough-cancel":
                onSkip(item)
                break
            default:
                break
        }
    })
    const onSkip = useMemoizedFn((item: AIAgentGrpcApi.ReviewSelector) => {
        if (!selectors?.InteractiveId) return
        const jsonInput = {
            suggestion: item.value
        }
        const params: AIChatIPCSendParams = {
            value: JSON.stringify(jsonInput),
            id: selectors.InteractiveId
        }
        handleSend(params)
    })
    return (
        <div className={styles["ai-chat-tool-card"]}>
            <div className={styles["card-header"]}>
                <div className={styles["card-title"]}>
                    <OutlineSparklesColorsIcon />
                    <div className='content-ellipsis'>{title}</div>
                </div>
                {isToolStdoutStream(NodeId) && selectors?.selectors && (
                    <div className={styles["card-extra"]}>
                        {selectors.selectors.map((item) => {
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
            {/* TODO - isToolStdoutStream(nodeId)=true，显示代码样式 */}
            <div className={styles["card-content"]}>{content}</div>
        </div>
    )
})
