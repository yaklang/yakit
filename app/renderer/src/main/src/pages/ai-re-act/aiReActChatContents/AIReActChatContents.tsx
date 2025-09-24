import React, {ReactNode, useEffect, useRef} from "react"
import {AIReActChatContentsPProps, AIStreamChatContentProps} from "./AIReActChatContentsType.d"
import styles from "./AIReActChatContents.module.scss"
import {AIChatMessage, AIChatStreams} from "@/pages/ai-agent/type/aiChat"
import {AITriageChatContent} from "@/pages/ai-agent/aiTriageChat/AITriageChat"
import {useCreation, useMemoizedFn} from "ahooks"
import {AIChatToolColorCard, AIChatToolItem} from "@/pages/ai-agent/chatTemplate/AIChatTool"
import {AIReActChatReview} from "../aiReActChatReview/AIReActChatReview"
import {isShowToolColorCard} from "@/pages/ai-agent/utils"
import {Tooltip} from "antd"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {OutlineSparklesColorsIcon} from "@/assets/icon/colors"
import {AIStreamNodeIdToLabel} from "../hooks/defaultConstant"

const chatContentExtraProps = {
    contentClassName: styles["content-wrapper"],
    chatClassName: styles["question-wrapper"]
}
export const AIReActChatContents: React.FC<AIReActChatContentsPProps> = React.memo((props) => {
    const {chats} = props
    const {handleSendCasual} = useChatIPCDispatcher()
    const listRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        scrollToBottom()
    }, [chats])

    const scrollToBottom = useMemoizedFn(() => {
        const messagesWrapper = listRef.current
        if (!messagesWrapper) return
        requestAnimationFrame(() => {
            const {clientHeight, scrollHeight, scrollTop} = messagesWrapper
            const scrollBottom = scrollHeight - scrollTop - clientHeight
            if (scrollBottom > 80) return
            if (scrollHeight > clientHeight) {
                messagesWrapper.scrollTop = messagesWrapper.scrollHeight
            }
        })
    })
    const renderContent = useMemoizedFn((item: AIChatMessage.AICasualChatQAStream) => {
        const {id, type, uiType, data} = item
        let content: ReactNode = <></>
        switch (uiType) {
            case "stream":
                if (["question", "answer"].includes(type)) {
                    const {NodeId, NodeLabel, stream: firstStream} = data as AIChatMessage.AIStreamOutput
                    const {reason, system, stream} = firstStream || {
                        reason: "",
                        system: "",
                        stream: ""
                    }
                    if (isShowToolColorCard(NodeId)) {
                        const toolCall: AIChatMessage.AIStreamOutput = {
                            ...(data as AIChatMessage.AIStreamOutput)
                        }
                        content = <AIChatToolColorCard toolCall={toolCall} />
                    } else {
                        content = <AIStreamChatContent stream={stream} nodeLabel={NodeLabel} />
                    }
                }
                break
            case "result":
                content = (
                    <AITriageChatContent
                        isAnswer={type === "answer"}
                        loading={false}
                        content={data as string}
                        {...chatContentExtraProps}
                    />
                )
                break
            case "thought":
                content = (
                    <AITriageChatContent
                        isAnswer={type === "answer"}
                        loading={false}
                        content={`思考：${data}`}
                        {...chatContentExtraProps}
                    />
                )
                break
            case "toolResult":
                const {toolAggregation} = data as AIChatMessage.AIChatToolResult
                content = !!toolAggregation ? <AIChatToolItem item={toolAggregation} type='re-act' /> : <></>
                break
            case "tool_use_review_require":
            case "require_user_interactive":
            case "exec_aiforge_review_require":
                content = (
                    <AIReActChatReview
                        type={uiType}
                        review={data}
                        onSendAI={handleSendCasual}
                        isEmbedded={true}
                        expand={true}
                        className={styles["review-wrapper"]}
                    />
                )
                break
            default:
                break
        }
        return <React.Fragment key={id}>{content}</React.Fragment>
    })
    return (
        <div ref={listRef} className={styles["ai-re-act-chat-contents"]}>
            <div className={styles["re-act-contents-list"]}>
                {chats.map((item: AIChatMessage.AICasualChatQAStream, index) => renderContent(item))}
            </div>
        </div>
    )
})

const AIStreamChatContent: React.FC<AIStreamChatContentProps> = React.memo((props) => {
    const {stream, nodeLabel} = props
    const content = useCreation(() => {
        return stream.slice(-150)
    }, [stream])
    return (
        <Tooltip
            title={
                <div className={styles["tooltip-stream-content"]}>
                    {stream}
                    <CopyComponents copyText={stream} />
                </div>
            }
        >
            <div className={styles["ai-stream-chat-content-wrapper"]}>
                <div className={styles["title"]}>
                    <OutlineSparklesColorsIcon />
                    {nodeLabel}...
                </div>
                <div className={styles["ai-stream-content"]}>{content}</div>
            </div>
        </Tooltip>
    )
})
