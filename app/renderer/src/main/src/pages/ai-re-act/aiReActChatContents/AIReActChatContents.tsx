import React, {ReactNode, useEffect, useRef, useState} from "react"
import {AIMarkdownProps, AIReActChatContentsPProps, AIStreamChatContentProps} from "./AIReActChatContentsType.d"
import styles from "./AIReActChatContents.module.scss"
import {AITriageChatContent} from "@/pages/ai-agent/aiTriageChat/AITriageChat"
import {useCreation, useMemoizedFn} from "ahooks"
import {AIChatToolColorCard, AIChatToolItem} from "@/pages/ai-agent/chatTemplate/AIChatTool"
import {AIReActChatReview} from "../aiReActChatReview/AIReActChatReview"
import {Tooltip} from "antd"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {OutlineSparklesColorsIcon} from "@/assets/icon/colors"
import {AIChatQSData} from "../hooks/aiRender"
import {ReportMarkdownBlock} from "@/pages/assetViewer/reportRenders/markdownRender"
import {ReportItem} from "@/pages/assetViewer/reportRenders/schema"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitRadioButtonsProps} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtonsType"
import classNames from "classnames"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineChevrondoubledownIcon, OutlineChevrondoubleupIcon} from "@/assets/icon/outline"
import {isToolExecStream} from "../hooks/utils"

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
                if (isToolExecStream(NodeId)) {
                    contentNode = <AIChatToolColorCard toolCall={data} />
                } else if (NodeId === "re-act-loop-answer-payload") {
                    contentNode = (
                        <AIMarkdown stream={content} nodeLabel={NodeLabel} className={styles["ai-mark-down-wrapper"]} />
                    )
                } else {
                    contentNode = <AIStreamChatContent stream={content} nodeLabel={NodeLabel} />
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

export const AIStreamChatContent: React.FC<AIStreamChatContentProps> = React.memo((props) => {
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
                    {nodeLabel}
                </div>
                <div className={styles["ai-stream-content"]}>
                    <div className={styles["ai-mask"]} />
                    {content}
                </div>
            </div>
        </Tooltip>
    )
})

const aiMilkdownOptions: YakitRadioButtonsProps["options"] = [
    {
        label: "预览",
        value: "preview"
    },
    {
        label: "源码",
        value: "code"
    }
]
export const AIMarkdown: React.FC<AIMarkdownProps> = React.memo((props) => {
    const {stream, nodeLabel, className} = props
    const [type, setType] = useState<"preview" | "code">("preview")
    const [expand, setExpand] = useState<boolean>(true)
    const item: ReportItem = useCreation(() => {
        const data: ReportItem = {
            type: "",
            content: stream
        }
        return data
    }, [stream])
    const renderContent = useMemoizedFn(() => {
        let content: ReactNode = <></>
        switch (type) {
            case "preview":
                content = <ReportMarkdownBlock className={classNames(styles["ai-milkdown"])} item={item} />
                break
            case "code":
                content = <div className={styles["ai-milkdown-code"]}>{item.content}</div>
                break
            default:
                break
        }
        return content
    })
    return (
        <div className={classNames(styles["ai-milkdown-wrapper"], className)}>
            <div className={styles["milkdown-header"]}>
                <div className={styles["header-name"]}>{nodeLabel}</div>
                <div className={styles["header-extra"]}>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        value={type}
                        options={aiMilkdownOptions}
                        onChange={(e) => {
                            setType(e.target.value)
                        }}
                    />
                    <YakitButton
                        type='text'
                        onClick={() => setExpand((v) => !v)}
                        icon={expand ? <OutlineChevrondoubleupIcon /> : <OutlineChevrondoubledownIcon />}
                    />
                </div>
            </div>
            <div
                className={classNames({
                    [styles["ai-milkdown-mini"]]: !expand
                })}
            >
                {renderContent()}
            </div>
        </div>
    )
})
