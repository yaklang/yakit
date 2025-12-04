import React, {useMemo} from "react"
import {AIReActChatContentsPProps, AIStreamNodeProps} from "./AIReActChatContentsType.d"
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
import {AIChatQSData} from "../hooks/aiRender"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"

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
        case AIStreamContentType.TEXT_MARKDOWN:
            return <AIMarkdown content={content} nodeLabel={nodeLabel} modalInfo={modalInfo} {...aiMarkdownProps} />
        case AIStreamContentType.CODE_YAKLANG:
        case AIStreamContentType.CODE_HTTP_REQUEST:
            return (
                <AIYaklangCode
                    contentType={ContentType}
                    content={content}
                    nodeLabel={nodeLabel}
                    modalInfo={modalInfo}
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
                />
            )
        case AIStreamContentType.LOG_TOOL:
            return <AIChatToolColorCard toolCall={stream.data} />
        case AIStreamContentType.LOG_TOOL_ERROR_OUTPUT:
            return <></>
        default:
            return <AIStreamChatContent content={content} nodeIdVerbose={NodeIdVerbose} />
    }
})
export const AIReActChatContents: React.FC<AIReActChatContentsPProps> = React.memo((props) => {
    const {chats} = props
    const {
        chatIPCData: {
            casualStatus: {loading, title}
        }
    } = useChatIPCStore()
    const {virtuosoRef, setIsAtBottomRef, followOutput} = useVirtuosoAutoScroll()

    const renderItem = (item: AIChatQSData) => {
        return <AIChatListItem key={item.id} item={item} type='re-act' />
    }

    const Item = useMemo(
        () =>
            ({children, style, "data-index": dataIndex}) => (
                <div key={dataIndex} style={style} data-index={dataIndex} className={styles["item-wrapper"]}>
                    <div className={styles["item-inner"]}>{children}</div>
                </div>
            ),
        []
    )

    const Footer = useMemo(
        () => () => (
            <div style={{height: "40px"}}>
                {loading && <YakitSpin wrapperClassName={styles["spin"]} tip={title}></YakitSpin>}
            </div>
        ),
        [loading, title]
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
                data={chats}
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
