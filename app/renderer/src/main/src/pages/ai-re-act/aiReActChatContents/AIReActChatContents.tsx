import React, {ReactNode, useEffect, useRef} from "react"
import {AIReActChatContentsPProps, AIStreamChatContentProps} from "./AIReActChatContentsType.d"
import styles from "./AIReActChatContents.module.scss"
import {AITriageChatContent} from "@/pages/ai-agent/aiTriageChat/AITriageChat"
import {useCreation, useMemoizedFn} from "ahooks"
import {AIChatToolColorCard, AIChatToolItem} from "@/pages/ai-agent/chatTemplate/AIChatTool"
import {AIReActChatReview} from "../aiReActChatReview/AIReActChatReview"
import {isShowToolColorCard} from "@/pages/ai-agent/utils"
import {Tooltip} from "antd"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {OutlineSparklesColorsIcon} from "@/assets/icon/colors"
import {AIChatQSData} from "../hooks/aiRender"

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
                const {NodeId, NodeLabel, content} = data
                if (isShowToolColorCard(NodeId)) {
                    contentNode = <AIChatToolColorCard toolCall={data} />
                } else {
                    contentNode = <AIStreamChatContent stream={content} nodeLabel={NodeLabel} />
                }

                break
            case "result":
                contentNode = (
                    <AITriageChatContent
                        isAnswer={true}
                        loading={false}
                        content={data as string}
                        {...chatContentExtraProps}
                    />
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
                contentNode = <AIChatToolItem time={Timestamp} item={data} type='re-act' />
                break
            case "tool_use_review_require":
                contentNode = (
                    <AIReActChatReview
                        info={{type, data}}
                        onSendAI={handleSendCasual}
                        isEmbedded={true}
                        expand={true}
                        className={styles["review-wrapper"]}
                    />
                )
                break
            case "exec_aiforge_review_require":
                contentNode = (
                    <AIReActChatReview
                        info={{type, data}}
                        onSendAI={handleSendCasual}
                        isEmbedded={true}
                        expand={true}
                        className={styles["review-wrapper"]}
                    />
                )
                break
            case "require_user_interactive":
                contentNode = (
                    <AIReActChatReview
                        info={{type, data}}
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
        return <React.Fragment key={id}>{contentNode}</React.Fragment>
    })
    return (
        <div ref={listRef} className={styles["ai-re-act-chat-contents"]}>
            <div className={styles["re-act-contents-list"]}>{chats.map((item) => renderContent(item))}</div>
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
