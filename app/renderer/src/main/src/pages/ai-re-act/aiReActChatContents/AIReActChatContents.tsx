import React, {useEffect, useRef} from "react"
import {AIReActChatContentsPProps, AIStreamNodeProps} from "./AIReActChatContentsType.d"
import styles from "./AIReActChatContents.module.scss"
import {useMemoizedFn} from "ahooks"
import {AIChatToolColorCard} from "@/pages/ai-agent/components/aiChatToolColorCard/AIChatToolColorCard"
import {AIMarkdown} from "@/pages/ai-agent/components/aiMarkdown/AIMarkdown"
import {AIStreamChatContent} from "@/pages/ai-agent/components/aiStreamChatContent/AIStreamChatContent"
import {isToolExecStream} from "../hooks/utils"
import StreamCard from "@/pages/ai-agent/components/StreamCard"
import {taskAnswerToIconMap} from "@/pages/ai-agent/defaultConstant"
import useAINodeLabel from "../hooks/useAINodeLabel"
import {AIChatListItem} from "@/pages/ai-agent/components/aiChatListItem/AIChatListItem"
import useAIChatUIData from "../hooks/useAIChatUIData"

export const AIStreamNode: React.FC<AIStreamNodeProps> = React.memo((props) => {
    const {stream, aiMarkdownProps} = props
    const {NodeId, content, NodeIdVerbose, CallToolID} = stream.data
    const {yakExecResult} = useAIChatUIData()
    const {nodeLabel} = useAINodeLabel(NodeIdVerbose)

    if (isToolExecStream(NodeId)) {
        return <AIChatToolColorCard toolCall={stream.data} />
    }

    switch (NodeId) {
        case "re-act-loop-answer-payload":
            return <AIMarkdown data={stream.data} {...aiMarkdownProps} />
        case "re-act-loop":
        case "re-act-loop-thought":
            return <AIStreamChatContent content={content} nodeIdVerbose={NodeIdVerbose} />
        default:
            const {execFileRecord} = yakExecResult
            const fileList = execFileRecord.get(CallToolID)
            return (
                <StreamCard
                    titleText={nodeLabel}
                    titleIcon={taskAnswerToIconMap[NodeId]}
                    content={content}
                    modalInfo={{
                        time: stream.Timestamp,
                        title: stream.AIService
                    }}
                    fileList={fileList}
                />
            )
    }
})
export const AIReActChatContents: React.FC<AIReActChatContentsPProps> = React.memo((props) => {
    const {chats} = props
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
    return (
        <div ref={listRef} className={styles["ai-re-act-chat-contents"]}>
            <div className={styles["re-act-contents-list"]}>
                {chats.map((item) => (
                    <AIChatListItem item={item} type='re-act' />
                ))}
            </div>
        </div>
    )
})
