import React, {useMemo} from "react"
import {AIChatListItemProps} from "./type"
import {useCreation, useMemoizedFn} from "ahooks"
import {AIReActChatReview} from "../aiReActChatReview/AIReActChatReview"
import {AIReviewResult} from "../aiReviewResult/AIReviewResult"
import {AITriageChatContent} from "../aiTriageChat/AITriageChat"
import ToolInvokerCard from "../ToolInvokerCard"
import styles from "./AIChatListItem.module.scss"
import useChatIPCDispatcher from "../../useContext/ChatIPCContent/useDispatcher"
import DividerCard from "../DividerCard"
import {AIToolDecision} from "../aiToolDecision/AIToolDecision"
import {AIChatQSData, AIChatQSDataTypeEnum} from "@/pages/ai-re-act/hooks/aiRender"
import AiFailPlanCard from "../aiFailPlanCard/AiFailPlanCard"
import classNames from "classnames"
import {has, isArray} from "lodash"
import {HandleStartParams} from "../../aiAgentChat/type"
import {AIChatMentionSelectItem} from "../aiChatMention/type"
import {AITaskStatus} from "@/pages/ai-re-act/hooks/grpcApi"
import {FileToChatQuestionList} from "../../template/type"
import StreamingChatContent from "./StreamingChatContent/StreamingChatContent"
import StaticChatContent from "./StaticChatContent/StaticChatContent"
import useChatIPCStore from "../../useContext/ChatIPCContent/useStore"
import useAIAgentStore from "../../useContext/useStore"

const chatContentExtraProps = {
    contentClassName: styles["content-wrapper"],
    chatClassName: styles["question-wrapper"]
}
/**@description 额外参数中获取文件列表数据 */
export const isHaveFreeDialogFileList = (extraValue: HandleStartParams["extraValue"]): FileToChatQuestionList[] => {
    if (has(extraValue, "freeDialogFileList") && isArray(extraValue.freeDialogFileList)) {
        return extraValue.freeDialogFileList
    }
    return []
}
/**@description 额外参数中获取选中的forge */
export const isHaveSelectForges = (extraValue: HandleStartParams["extraValue"]): AIChatMentionSelectItem[] => {
    if (has(extraValue, "selectForges") && isArray(extraValue.selectForges)) {
        return extraValue.selectForges
    }
    return []
}
/**@description 额外参数中获取选中的 tool */
export const isHaveSelectTools = (extraValue: HandleStartParams["extraValue"]): AIChatMentionSelectItem[] => {
    if (has(extraValue, "selectTools") && isArray(extraValue.selectTools)) {
        return extraValue.selectTools
    }
    return []
}
/**@description 额外参数中获取选中的 KnowledgeBases */
export const isHaveSelectKnowledgeBases = (extraValue: HandleStartParams["extraValue"]): AIChatMentionSelectItem[] => {
    if (has(extraValue, "selectKnowledgeBases") && isArray(extraValue.selectKnowledgeBases)) {
        return extraValue.selectKnowledgeBases
    }
    return []
}
const isExtraShow = (extraValue: HandleStartParams["extraValue"]) => {
    return (
        isHaveFreeDialogFileList(extraValue).length > 0 ||
        isHaveSelectForges(extraValue).length > 0 ||
        isHaveSelectTools(extraValue).length > 0 ||
        isHaveSelectKnowledgeBases(extraValue).length > 0
    )
}
export const AIChatListItem: React.FC<AIChatListItemProps> = React.memo((props) => {
    const {item, type, hasNext} = props

    const {handleSendCasual} = useChatIPCDispatcher()
    const {taskChat, yakExecResult} = useChatIPCStore().chatIPCData
    const {activeChat} = useAIAgentStore()
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

    const getTask = useMemoizedFn((id) => taskChat.plan.find((item) => item.index === id))

    const isStream = useCreation(() => {
        return item.type === AIChatQSDataTypeEnum.STREAM || item.type === AIChatQSDataTypeEnum.STREAM_GROUP
    }, [item.type])

    const ChatItemRenderer = useMemoizedFn((item: AIChatQSData) => {
        const {type, Timestamp, data, extraValue} = item
        switch (type) {
            case AIChatQSDataTypeEnum.QUESTION:
                return (
                    <AITriageChatContent
                        isAnswer={false}
                        content={data?.qs}
                        extraValue={extraValue}
                        {...chatContentExtraProps}
                        contentClassName={classNames({
                            [styles["file-content-wrapper"]]: isExtraShow(extraValue)
                        })}
                    />
                )
            // case AIChatQSDataTypeEnum.STREAM:
            //     return <AIStreamNode {...aiStreamNodeProps} stream={item} />
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
                        fileList={fileList}
                        modalInfo={{
                            time: Timestamp,
                            title: item.AIModelName,
                            icon: item.AIService
                        }}
                        operationInfo={{
                            callToolId: data.callToolId,
                            aiFilePath: data.tool.dirPath
                        }}
                        data={data}
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
                    status: task?.progress as AITaskStatus,
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
                        status={AITaskStatus.cancel}
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

    const renderContent = useMemoizedFn(() => {
        if (activeChat?.session === undefined) return null
        if (isStream)
            return (
                <StreamingChatContent
                    {...item}
                    session={activeChat?.session}
                    hasNext={hasNext}
                    streamClassName={aiStreamNodeProps}
                />
            )
        return (
            <StaticChatContent
                {...item}
                session={activeChat?.session}
                render={(contentItem) => ChatItemRenderer(contentItem)}
            />
        )
    })
    return <React.Fragment key={item.token}>{renderContent()}</React.Fragment>
})
