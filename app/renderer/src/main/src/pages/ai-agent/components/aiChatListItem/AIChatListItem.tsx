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
            case "question":
                contentNode = (
                    <AITriageChatContent isAnswer={false} loading={false} content={data} {...chatContentExtraProps} />
                )
                break
            case "stream":
                contentNode = <AIStreamNode {...aiStreamNodeProps} stream={item} />
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
                            time:Timestamp,
                            callToolId: data.callToolId,
                        }}
                    />
                )
                break
            case "tool_use_review_require":
            case "exec_aiforge_review_require":
            case "require_user_interactive":
            case "plan_review_require":
            case "task_review_require":
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
            case "file_system_pin":
                contentNode = <FileSystemCard {...data} {...aiFileSystemCard} />
                break

            case "task_index_node":
                const task = getTask(data.taskIndex)
                const props = {
                    status: task?.progress as StreamsStatus,
                    desc: task?.goal,
                    name: task?.name,
                    success: 0,
                    error: 0
                }
                contentNode = <DividerCard {...props} />
                break
            case "tool_call_decision":
                contentNode = <AIToolDecision item={item} />
                break
            // TODO 更新任务队列
            // <AITaskUpdateNotice/>
            default:
                break
        }
        return <React.Fragment key={id}>{contentNode}</React.Fragment>
    })
    return <>{renderContent()}</>
})
