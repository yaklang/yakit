import React from "react"
import {AIChatListItemProps} from "./type"
import {useCreation, useMemoizedFn} from "ahooks"
import {AIStreamNode} from "@/pages/ai-re-act/aiReActChatContents/AIReActChatContents"
import {AIReActChatReview} from "../aiReActChatReview/AIReActChatReview"
import {AIReviewResult} from "../aiReviewResult/AIReviewResult"
import {AITriageChatContent} from "../aiTriageChat/AITriageChat"
import ToolInvokerCard from "../ToolInvokerCard"
import styles from "./AIChatListItem.module.scss"
import useChatIPCDispatcher from "../../useContext/ChatIPCContent/useDispatcher"
import DividerCard, {StreamsStatus} from "../DividerCard"
import {AIToolDecision} from "../aiToolDecision/AIToolDecision"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import {AIChatQSDataTypeEnum} from "@/pages/ai-re-act/hooks/aiRender"
import AiFailPlanCard from "../aiFailPlanCard/AiFailPlanCard"
import AIFileChatContent from "../aIFileChatContent/AIFileChatContent"

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
    const getTask = (id) => {
        return taskChat.plan.find((item) => item.index === id)
    }
    const renderContent = useMemoizedFn(() => {
        const {id, type, Timestamp, data, extraValue} = item
        switch (type) {
            case AIChatQSDataTypeEnum.QUESTION:
                return (
                    <AITriageChatContent
                        isAnswer={false}
                        content={<AIFileChatContent {...data} extraValue={extraValue} />}
                        extraValue={extraValue}
                        {...chatContentExtraProps}
                        contentClassName={styles["file-content-wrapper"]}
                    />
                )
            case AIChatQSDataTypeEnum.STREAM:
                return <AIStreamNode {...aiStreamNodeProps} stream={item} />
            case AIChatQSDataTypeEnum.RESULT:
                return <AITriageChatContent isAnswer={true} content={data} {...chatContentExtraProps} />
            case AIChatQSDataTypeEnum.THOUGHT:
                return <AITriageChatContent isAnswer={true} content={`思考：${data}`} {...chatContentExtraProps} />
            case AIChatQSDataTypeEnum.TOOL_RESULT:
                const {execFileRecord} = yakExecResult
                const fileList = execFileRecord.get(data.callToolId)
                return (
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
                            title: item.AIModelName
                        }}
                        execError={data.execError}
                    />
                )
            case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
            case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
            case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
            case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
            case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
                if (!!item.data.selected) {
                    return <AIReviewResult info={item} timestamp={Timestamp} />
                } else {
                    return (
                        <AIReActChatReview
                            info={item}
                            onSendAI={handleSendCasual}
                            isEmbedded={true}
                            expand={true}
                            className={styles["review-wrapper"]}
                        />
                    )
                }
            case AIChatQSDataTypeEnum.TASK_INDEX_NODE:
                const task = getTask(data.taskIndex)
                const dividerCardProps = {
                    status: task?.progress as StreamsStatus,
                    desc: task?.goal,
                    name: task?.name,
                    success: 0,
                    error: 0
                }
                return <DividerCard {...dividerCardProps} />

            case AIChatQSDataTypeEnum.TOOL_CALL_DECISION:
                return <AIToolDecision item={item} />

            case AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION:
                return (
                    <DividerCard
                        status={StreamsStatus.cancel}
                        name='任务结束标志'
                        desc='当前任务已经结束，下面为新的任务数据'
                        success={0}
                        error={0}
                    />
                )
            case AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION:
            case AIChatQSDataTypeEnum.FAIL_REACT:
                return <AiFailPlanCard item={data} />
            default:
                return <></>
        }
    })
    return <React.Fragment key={item.id}>{renderContent()}</React.Fragment>
})
