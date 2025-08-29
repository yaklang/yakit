import React, {ReactNode, useEffect, useRef} from "react"
import {AIReActChatContentsPProps} from "./AIReActChatContentsType.d"
import styles from "./AIReActChatContents.module.scss"
import {AIChatMessage} from "@/pages/ai-agent/type/aiChat"
import {AITriageChatContent} from "@/pages/ai-agent/aiTriageChat/AITriageChat"
import {useMemoizedFn} from "ahooks"
import {AIChatToolItem} from "@/pages/ai-agent/chatTemplate/AIChatTool"
import {AIReActChatReview} from "../aiReActChatReview/AIReActChatReview"

const chatContentExtraProps = {
    contentClassName: styles["content-wrapper"],
    chatClassName: styles["question-wrapper"]
}
export const AIReActChatContents: React.FC<AIReActChatContentsPProps> = React.memo((props) => {
    const {chats, onSendAIRequire} = props
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
                    const {reason, system, stream} = (data as AIChatMessage.AIStreamOutput).stream || {
                        reason: "",
                        system: "",
                        stream: ""
                    }
                    content = (
                        <AITriageChatContent
                            isAnswer={type === "answer"}
                            loading={false}
                            content={
                                <div className={styles["think-wrapper"]}>
                                    {reason && <div>{reason}</div>}

                                    {system && <div>{system}</div>}

                                    {stream && <div>{stream}</div>}
                                </div>
                            }
                            {...chatContentExtraProps}
                        />
                    )
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
            case "toolResult":
                const {toolAggregation} = data as AIChatMessage.AIChatToolResult
                content = !!toolAggregation ? <AIChatToolItem item={toolAggregation} /> : <></>
                break
            case "toolReview":
            case "requireUser":
                content = <AIReActChatReview type={uiType} review={data} onSendAIRequire={onSendAIRequire} />
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
