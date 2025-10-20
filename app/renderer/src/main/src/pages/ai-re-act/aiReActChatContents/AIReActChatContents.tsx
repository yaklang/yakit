import React, {ReactNode, useEffect, useRef} from "react"
import {AIReActChatContentsPProps} from "./AIReActChatContentsType.d"
import styles from "./AIReActChatContents.module.scss"
import {AITriageChatContent} from "@/pages/ai-agent/components/aiTriageChat/AITriageChat"
import {useMemoizedFn} from "ahooks"
import {AIReActChatReview} from "../../ai-agent/components/aiReActChatReview/AIReActChatReview"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {AIChatQSData} from "../hooks/aiRender"
import {AIChatToolColorCard} from "@/pages/ai-agent/components/aiChatToolColorCard/AIChatToolColorCard"
import {AIMarkdown} from "@/pages/ai-agent/components/aiMarkdown/AIMarkdown"
import {AIStreamChatContent} from "@/pages/ai-agent/components/aiStreamChatContent/AIStreamChatContent"
import ToolInvokerCard from "@/pages/ai-agent/components/ToolInvokerCard"
import {AIReviewResult} from "@/pages/ai-agent/components/aiReviewResult/AIReviewResult"
import {isToolExecStream} from "../hooks/utils"
import FileSystemCard from "@/pages/ai-agent/components/FileSystemCard"

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
    const renderContent = useMemoizedFn((item: AIChatQSData) => {
        const {id, type, Timestamp, data} = item
        let contentNode: ReactNode = <></>
        switch (type) {
            case "question":
                contentNode = (
                    <AITriageChatContent isAnswer={false} loading={false} content={data} {...chatContentExtraProps} />
                )
                break
            case "stream":
                const {NodeId, NodeIdVerbose, content} = data
                if (isToolExecStream(NodeId)) {
                    contentNode = <AIChatToolColorCard toolCall={data} />
                } else if (NodeId === "re-act-loop-answer-payload") {
                    contentNode = (
                        <AIMarkdown
                            stream={content}
                            nodeLabel={NodeIdVerbose.Zh}
                            className={styles["ai-mark-down-wrapper"]}
                        />
                    )
                } else {
                    contentNode = <AIStreamChatContent stream={content} nodeLabel={NodeIdVerbose?.Zh} />
                }

                break
            case "result":
                contentNode = (
                    <AITriageChatContent isAnswer={true} loading={false} content={data} {...chatContentExtraProps} />
                )
                break
            case "thought":
                contentNode = (
                    <AITriageChatContent
                        isAnswer={true}
                        loading={false}
                        content={`思考：${data}`}
                        {...chatContentExtraProps}
                    />
                )
                break
            case "tool_result":
                // contentNode = <AIChatToolItem time={Timestamp} item={data} type='re-act' />
                contentNode = (
                    <ToolInvokerCard
                        titleText={"工具调用"}
                        name={data.toolName}
                        status={data.status}
                        desc={data.summary}
                        content={data.toolStdoutContent.content}
                        params={data.callToolId}
                    />
                )
                break
            case "tool_use_review_require":
            case "exec_aiforge_review_require":
            case "require_user_interactive":
                if (!!item.data.selected) {
                    contentNode = <AIReviewResult info={item} timestamp={Timestamp} />
                } else {
                    contentNode = (
                        <AIReActChatReview
                            info={item}
                            onSendAI={handleSendCasual}
                            isEmbedded={true}
                            expand={true}
                            className={styles["review-wrapper"]}
                        />
                    )
                }
                break
            case "file_system_pin": {
                contentNode = <FileSystemCard {...data} />
                break
            }
            default:
                break
        }
        return <React.Fragment key={id}>{contentNode}</React.Fragment>
    })
    return (
        <div ref={listRef} className={styles["ai-re-act-chat-contents"]}>
            <div className={styles["re-act-contents-list"]}>{chats.map((item) => renderContent(item))}</div>
        </div>
    )
})
