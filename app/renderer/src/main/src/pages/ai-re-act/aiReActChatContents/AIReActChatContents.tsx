import React, {useCallback, useMemo, useState} from "react"
import {AIReActChatContentsPProps, AIReferenceNodeProps, AIStreamNodeProps} from "./AIReActChatContentsType"
import styles from "./AIReActChatContents.module.scss"
import {useCreation} from "ahooks"
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
import {Virtuoso} from "react-virtuoso"
import useVirtuosoAutoScroll from "../hooks/useVirtuosoAutoScroll"
import {ReActChatElement} from "../hooks/aiRender"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import classNames from "classnames"
import {PreWrapper} from "@/pages/ai-agent/components/ToolInvokerCard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineChevrondownIcon, OutlineChevronupIcon} from "@/assets/icon/outline"
import Loading from "@/components/Loading/Loading"
import useAISystemStream from "../hooks/useAISystemStream"
import {ScrollText} from "@/pages/ai-agent/chatTemplate/TaskLoading/TaskLoading"

const getAIReferenceNodeByType = (contentType?: string) => {
    switch (contentType) {
        case AIStreamContentType.TEXT_MARKDOWN:
            return styles["ai-text-markdown-reference-node"]
        case AIStreamContentType.CODE_YAKLANG:
        case AIStreamContentType.CODE_HTTP_REQUEST:
            return styles["ai-yaklang-reference-node"]
        case AIStreamContentType.TEXT_PLAIN:
            return styles["ai-text-plain-reference-node"]
        case AIStreamContentType.LOG_TOOL:
            return styles["ai-log-tool-reference-node"]
        default:
            return styles["ai-stream-chat-reference-node"]
    }
}
export const AIStreamNode: React.FC<AIStreamNodeProps> = React.memo((props) => {
    const {stream, aiMarkdownProps} = props
    const {reference} = stream
    const {NodeId, content, NodeIdVerbose, CallToolID, ContentType} = stream.data
    const {yakExecResult} = useAIChatUIData()
    const {nodeLabel} = useAINodeLabel(NodeIdVerbose)

    const modalInfo: ModalInfoProps = useCreation(() => {
        return {
            time: stream.Timestamp,
            title: stream.AIModelName,
            icon: stream.AIService
        }
    }, [stream.Timestamp, stream.AIModelName, stream.AIService])
    const referenceNode = useCreation(() => {
        const className = getAIReferenceNodeByType(ContentType)
        return !!reference ? <AIReferenceNode referenceList={reference || []} className={className} /> : <></>
    }, [reference, ContentType])

    switch (ContentType) {
        case AIStreamContentType.TEXT_MARKDOWN:
            return (
                <AIMarkdown
                    referenceNode={referenceNode}
                    content={content}
                    nodeLabel={nodeLabel}
                    modalInfo={modalInfo}
                    {...aiMarkdownProps}
                />
            )
        case AIStreamContentType.CODE_YAKLANG:
        case AIStreamContentType.CODE_HTTP_REQUEST:
            return (
                <AIYaklangCode
                    contentType={ContentType}
                    content={content}
                    nodeLabel={nodeLabel}
                    modalInfo={modalInfo}
                    referenceNode={referenceNode}
                />
            )
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
                    referenceNode={referenceNode}
                />
            )
        case AIStreamContentType.LOG_TOOL:
            return <AIChatToolColorCard toolCall={stream.data} referenceNode={referenceNode} />
        case AIStreamContentType.LOG_TOOL_ERROR_OUTPUT:
            return <></>
        default:
            return <AIStreamChatContent content={content} nodeIdVerbose={NodeIdVerbose} referenceNode={referenceNode} />
    }
})
export const AIReActChatContents: React.FC<AIReActChatContentsPProps> = React.memo((props) => {
    const {chats} = props
    const {
        chatIPCData: {
            casualStatus: {loading, title},
            systemStream
        }
    } = useChatIPCStore()
    const {virtuosoRef, setIsAtBottomRef, followOutput} = useVirtuosoAutoScroll()

    const renderItem = (item?: ReActChatElement) => {
        if(!item?.token) return null 
        return <AIChatListItem key={item.token} item={item} type='re-act' />
    }

    const Item = useCallback(
        ({children, style, "data-index": dataIndex}) => (
            <div key={dataIndex} style={style} data-index={dataIndex} className={styles["item-wrapper"]}>
                <div className={styles["item-inner"]}>{children}</div>
            </div>
        ),
        []
    )

    const {displayValue, mode} = useAISystemStream({
        value: title,
        systemStream
    })
    const Footer = useCallback(
        () =>
            loading ? (
                <div style={{height: "40px", maxWidth: "784px", margin: "0 auto"}}>
                    <Loading
                        size={14}
                        style={{
                            marginTop: 8
                        }}
                    >
                        <div className='text-ellipsis' style={{fontWeight: 400, display: "flex", alignItems: "center"}}>
                            {mode === "value" ? displayValue : <ScrollText text={displayValue as string} />}
                        </div>
                    </Loading>
                </div>
            ) : null,
        [loading, mode, displayValue]
    )

    const components = useMemo(
        () => ({
            Item,
            Footer
        }),
        [Footer, Item]
    )
    return (
        <div className={styles["ai-re-act-chat-contents"]}>
            <Virtuoso
                ref={virtuosoRef}
                atBottomStateChange={setIsAtBottomRef}
                data={chats.elements}
                followOutput={followOutput}
                itemContent={(_, item) => renderItem(item)}
                initialTopMostItemIndex={{index: "LAST"}}
                components={components}
                atBottomThreshold={50}
                increaseViewportBy={{top: 300, bottom: 300}}
                className={styles["re-act-contents-list"]}
            />
        </div>
    )
})

const AIReferenceNode: React.FC<AIReferenceNodeProps> = React.memo((props) => {
    const {referenceList, className} = props
    const [expand, setExpand] = useState<boolean>(false)
    return (
        <div className={classNames(styles["ai-reference-node"], className)}>
            <div className={styles["reference-title"]} onClick={() => setExpand((v) => !v)}>
                <span>参考资料({referenceList.length})</span>
                <YakitButton type='text' icon={expand ? <OutlineChevronupIcon /> : <OutlineChevrondownIcon />} />
            </div>
            {expand && (
                <PreWrapper
                    code={
                        <div className={styles["reference-list"]}>
                            {referenceList.map((item, index) => (
                                <div
                                    key={index}
                                    className={classNames(styles["reference-list-item"])}
                                    title={item.payload}
                                >
                                    {item.payload}
                                </div>
                            ))}
                        </div>
                    }
                />
            )}
        </div>
    )
})
