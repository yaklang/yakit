import React, {useEffect, useRef} from "react"
import {AIReActChatContentsPProps, AIStreamNodeProps} from "./AIReActChatContentsType.d"
import styles from "./AIReActChatContents.module.scss"
import {useCreation, useMemoizedFn} from "ahooks"
import {AIChatToolColorCard} from "@/pages/ai-agent/components/aiChatToolColorCard/AIChatToolColorCard"
import {AIMarkdown} from "@/pages/ai-agent/components/aiMarkdown/AIMarkdown"
import {AIStreamChatContent} from "@/pages/ai-agent/components/aiStreamChatContent/AIStreamChatContent"
import StreamCard from "@/pages/ai-agent/components/StreamCard"
import {taskAnswerToIconMap} from "@/pages/ai-agent/defaultConstant"
import useAINodeLabel from "../hooks/useAINodeLabel"
import {AIChatListItem} from "@/pages/ai-agent/components/aiChatListItem/AIChatListItem"
import useAIChatUIData from "../hooks/useAIChatUIData"
import {AIYaklangCode} from "@/pages/ai-agent/components/aiYaklangCode/AIYaklangCode"
import {ModalInfoProps} from "@/pages/ai-agent/components/ModelInfo"
import {AIStreamContentType} from "../hooks/defaultConstant"

export const AIStreamNode: React.FC<AIStreamNodeProps> = React.memo((props) => {
    const {stream, aiMarkdownProps} = props
    const {NodeId, content, NodeIdVerbose, CallToolID, ContentType} = stream.data
    const {yakExecResult} = useAIChatUIData()
    const {nodeLabel} = useAINodeLabel(NodeIdVerbose)

    const modalInfo: ModalInfoProps = useCreation(() => {
        return {
            time: stream.Timestamp,
            title: stream.AIService
        }
    }, [stream.Timestamp, stream.AIService])
    switch (ContentType) {
        case AIStreamContentType.MARKDOWN:
            return <AIMarkdown content={content} nodeLabel={nodeLabel} modalInfo={modalInfo} {...aiMarkdownProps} />
        case AIStreamContentType.YAKLANG_CODE:
        case AIStreamContentType.PLAIN_CODE:
            return <AIYaklangCode content={content} nodeLabel={nodeLabel} modalInfo={modalInfo} />
        case AIStreamContentType.TEXT_PLAIN:
            const {execFileRecord} = yakExecResult
            const fileList = execFileRecord.get(CallToolID)
            return (
                <StreamCard
                    titleText={nodeLabel}
                    titleIcon={taskAnswerToIconMap[NodeId]}
                    content={content}
                    modalInfo={modalInfo}
                    fileList={fileList}
                />
            )
        case AIStreamContentType.TOOL_LOG:
            return <AIChatToolColorCard toolCall={stream.data} />
        default:
            return <AIStreamChatContent content={content} nodeIdVerbose={NodeIdVerbose} />
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
