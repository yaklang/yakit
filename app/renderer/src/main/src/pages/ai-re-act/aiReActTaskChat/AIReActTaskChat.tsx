import React, {useState} from "react"
import {AIReActTaskChatContentProps, AIReActTaskChatLeftSideProps, AIReActTaskChatProps} from "./AIReActTaskChatType"
import styles from "./AIReActTaskChat.module.scss"
import {ColorsBrainCircuitIcon} from "@/assets/icon/colors"
import {AIAgentChatStream, AIChatLeftSide} from "@/pages/ai-agent/chatTemplate/AIAgentChatTemplate"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import classNames from "classnames"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {ChevrondownButton, RoundedStopButton} from "../aiReActChat/AIReActComponent"
import {AIReActTaskChatReview} from "@/pages/ai-agent/aiAgentChat/AIAgentChat"
import {OutlineArrowscollapseIcon, OutlineArrowsexpandIcon, OutlinePositionIcon} from "@/assets/icon/outline"
import useAIChatUIData from "../hooks/useAIChatUIData"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import emiter from "@/utils/eventBus/eventBus"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {AIInputEventSyncTypeEnum} from "../hooks/defaultConstant"

const AIReActTaskChat: React.FC<AIReActTaskChatProps> = React.memo((props) => {
    const [leftExpand, setLeftExpand] = useState(true)
    const [expand, setExpand] = useState(false)

    const onIsExpand = useMemoizedFn(() => {
        setLeftExpand(expand)
        emiter.emit("switchReActShow", expand)
        setExpand((v) => !v)
    })

    return (
        <div className={styles["ai-re-act-task-chat"]}>
            <AIReActTaskChatLeftSide leftExpand={leftExpand} setLeftExpand={setLeftExpand} />
            <div className={styles["chat-content-wrapper"]}>
                <div className={styles["header"]}>
                    <div className={styles["title"]}>
                        <ColorsBrainCircuitIcon />
                        深度规划
                    </div>
                    <div className={styles["extra"]}>
                        <YakitButton
                            type='text2'
                            icon={expand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                            onClick={onIsExpand}
                        />
                    </div>
                </div>
                <AIReActTaskChatContent />
            </div>
        </div>
    )
})

export default AIReActTaskChat

const AIReActTaskChatContent: React.FC<AIReActTaskChatContentProps> = React.memo((props) => {
    const {reviewInfo, planReviewTreeKeywordsMap, chatIPCData} = useChatIPCStore()
    const {taskChat} = useAIChatUIData()
    const {handleSendSyncMessage} = useChatIPCDispatcher()

    const questionQueue = useCreation(() => {
        return chatIPCData.questionQueue
    }, [chatIPCData.questionQueue])
    const {streams} = taskChat

    const [scrollToBottom, setScrollToBottom] = useState(false)
    const onScrollToBottom = useMemoizedFn(() => {
        setScrollToBottom((v) => !v)
    })
    const onStopTask = useMemoizedFn(() => {
        if (questionQueue.data.length > 0) {
            handleSendSyncMessage({
                syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_JUMP_QUEUE,
                SyncJsonInput: JSON.stringify({task_id: questionQueue.data[0].id}),
                params: {}
            })
            handleSendSyncMessage({
                syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
                params: {}
            })
        }
    })
    const showStop = useCreation(() => {
        return chatIPCData.execute && questionQueue?.total > 0
    }, [streams.length, questionQueue])
    return (
        <>
            <div className={styles["tab-content"]}>
                <AIAgentChatStream streams={streams} scrollToBottom={scrollToBottom} />
            </div>
            {!!reviewInfo ? (
                <AIReActTaskChatReview
                    reviewInfo={reviewInfo}
                    planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
                    setScrollToBottom={setScrollToBottom}
                    onStopTask={onStopTask}
                />
            ) : (
                streams.length > 0 && (
                    <div className={styles["footer"]}>
                        {showStop && <RoundedStopButton onClick={onStopTask} size='large' />}
                        <YakitButton
                            type='outline2'
                            icon={<OutlinePositionIcon />}
                            radius='50%'
                            onClick={onScrollToBottom}
                            className={styles["position-button"]}
                            size='large'
                        />
                    </div>
                )
            )}
        </>
    )
})

export const AIReActTaskChatLeftSide: React.FC<AIReActTaskChatLeftSideProps> = React.memo((props) => {
    const {taskChat} = useAIChatUIData()
    const [leftExpand, setLeftExpand] = useControllableValue(props, {
        defaultValue: true,
        valuePropName: "leftExpand",
        trigger: "setLeftExpand"
    })
    return (
        <div
            className={classNames(styles["content-left-side"], {
                [styles["content-left-side-hidden"]]: !leftExpand
            })}
        >
            <AIChatLeftSide expand={leftExpand} setExpand={setLeftExpand} tasks={taskChat.plan} />
            <div className={styles["open-wrapper"]} onClick={() => setLeftExpand(true)}>
                <ChevrondownButton />
                <div className={styles["text"]}>任务列表</div>
            </div>
        </div>
    )
})
