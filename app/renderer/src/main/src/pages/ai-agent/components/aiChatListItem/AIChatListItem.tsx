import React, {ReactNode} from "react"
import {AIChatListItemProps} from "./type"
import {useCreation, useMemoizedFn} from "ahooks"
import {AIStreamNode} from "@/pages/ai-re-act/aiReActChatContents/AIReActChatContents"
import {AIReActChatReview} from "../aiReActChatReview/AIReActChatReview"
import {AIReviewResult} from "../aiReviewResult/AIReviewResult"
import {AITriageChatContent} from "../aiTriageChat/AITriageChat"
import FileSystemCard from "../FileSystemCard"
import ToolInvokerCard from "../ToolInvokerCard"
import styles from "./AIChatListItem.module.scss"
import useChatIPCDispatcher from "../../useContext/ChatIPCContent/useDispatcher"
import DividerCard, {StreamsStatus} from "../DividerCard"
import {AIToolDecision} from "../aiToolDecision/AIToolDecision"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import {AIChatQSDataTypeEnum} from "@/pages/ai-re-act/hooks/aiRender"
const chatContentExtraProps = {
    contentClassName: styles["content-wrapper"],
    chatClassName: styles["question-wrapper"]
}
export const AIChatListItem: React.FC<AIChatListItemProps> = React.memo((props) => {
    const {item, type} = props

    const {handleSendCasual} = useChatIPCDispatcher()
    const {taskChat, yakExecResult} = useAIChatUIData()

    const aiStreamNodeProps = useCreation(() => {
        switch (type) {
            case "re-act":
                return {
                    aiMarkdownProps: {
                        className: styles["ai-mark-down-wrapper"]
                    }
                }

            default:
                return {}
        }
    }, [type])
    const aiFileSystemCard = useCreation(() => {
        switch (type) {
            case "re-act":
                return {
                    showDetail: false
                }

            default:
                return {}
        }
    }, [type])
    const getTask = (id) => {
        return taskChat.plan.find((item) => item.index === id)
    }
    const renderContent = useMemoizedFn(() => {
        const {id, type, Timestamp, data} = item
        let contentNode: ReactNode = <></>
        switch (type) {
            case AIChatQSDataTypeEnum.QUESTION:
                contentNode = (
                    <AITriageChatContent isAnswer={false} loading={false} content={data} {...chatContentExtraProps} />
                )
                break
            case AIChatQSDataTypeEnum.STREAM:
                contentNode = <AIStreamNode {...aiStreamNodeProps} stream={item} />
                break
            case AIChatQSDataTypeEnum.RESULT:
                contentNode = (
                    <AITriageChatContent isAnswer={true} loading={false} content={data} {...chatContentExtraProps} />
                )
                break
            case AIChatQSDataTypeEnum.THOUGHT:
                contentNode = (
                    <AITriageChatContent
                        isAnswer={true}
                        loading={false}
                        content={`思考：${data}`}
                        {...chatContentExtraProps}
                    />
                )
                break
            case AIChatQSDataTypeEnum.TOOL_RESULT:
                const {execFileRecord} = yakExecResult
                const fileList = execFileRecord.get(data.callToolId)
                contentNode = (
                    <ToolInvokerCard
                        titleText={"工具调用"}
                        name={data.toolName}
                        status={data.status}
                        desc={data.summary}
                        content={data.toolStdoutContent.content}
                        params={data.callToolId}
                        fileList={fileList}
                        modalInfo={{
                            time: Timestamp,
                            callToolId: data.callToolId,
                            title: item.AIService
                        }}
                    />
                )
                break
            case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
            case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
            case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
            case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
            case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
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
            case AIChatQSDataTypeEnum.FILE_SYSTEM_PIN:
                contentNode = (
                    <FileSystemCard
                        {...data}
                        {...aiFileSystemCard}
                        modalInfo={{
                            title: item.AIService,
                            time: Timestamp
                        }}
                    />
                )
                break

            case AIChatQSDataTypeEnum.TASK_INDEX_NODE:
                const task = getTask(data.taskIndex)
                const dividerCardProps = {
                    status: task?.progress as StreamsStatus,
                    desc: task?.goal,
                    name: task?.name,
                    success: 0,
                    error: 0
                }
                contentNode = <DividerCard {...dividerCardProps} />
                break
            case AIChatQSDataTypeEnum.TOOL_CALL_DECISION:
                contentNode = <AIToolDecision item={item} />
                break
            case AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION:
                contentNode = (
                    <DividerCard
                        status={StreamsStatus.success}
                        name='任务结束标志'
                        desc='当前任务已经结束，下面为新的任务数据'
                        success={0}
                        error={0}
                    />
                )
                break
            // TODO 更新任务队列
            // <AITaskUpdateNotice/>
            default:
                break
        }
        return <React.Fragment key={id}>{contentNode}</React.Fragment>
    })
    return renderContent()
})
