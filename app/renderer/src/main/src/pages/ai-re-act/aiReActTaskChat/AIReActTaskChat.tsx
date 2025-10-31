import React, {useState} from "react"
import {AIReActTaskChatContentProps, AIReActTaskChatLeftSideProps, AIReActTaskChatProps} from "./AIReActTaskChatType"
import styles from "./AIReActTaskChat.module.scss"
import {ColorsBrainCircuitIcon} from "@/assets/icon/colors"
import {AIAgentChatStream, AIChatLeftSide} from "@/pages/ai-agent/chatTemplate/AIAgentChatTemplate"
import {useCreation} from "ahooks"
import classNames from "classnames"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {ChevrondownButton, RoundedStopButton} from "../aiReActChat/AIReActComponent"
import {AIReActTaskChatReview} from "@/pages/ai-agent/aiAgentChat/AIAgentChat"
import {OutlineArrowdownIcon, OutlineArrowupIcon} from "@/assets/icon/outline"
import {formatNumberUnits} from "@/pages/ai-agent/utils"
import useAIChatUIData from "../hooks/useAIChatUIData"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"

const AIReActTaskChat: React.FC<AIReActTaskChatProps> = React.memo((props) => {
    const {aiPerfData} = useAIChatUIData()
    const {chatIPCData} = useChatIPCStore()
    const {handleStop} = useChatIPCDispatcher()
    // AI的Token消耗
    const token = useCreation(() => {
        let input = 0
        let output = 0
        const {consumption} = aiPerfData
        const keys = Object.keys(consumption || {})
        for (let name of keys) {
            input += consumption[name]?.input_consumption || 0
            output += consumption[name]?.output_consumption || 0
        }
        return [formatNumberUnits(input || 0), formatNumberUnits(output || 0)]
    }, [aiPerfData.consumption])
    return (
        <div className={styles["ai-re-act-task-chat"]}>
            <AIReActTaskChatLeftSide />
            <div className={styles["chat-content-wrapper"]}>
                <div className={styles["header"]}>
                    <div className={styles["title"]}>
                        <ColorsBrainCircuitIcon />
                        深度规划
                    </div>
                    <div className={styles["extra"]}>
                        <div className={styles["info-token"]}>
                            Tokens:
                            <div className={classNames(styles["token-tag"], styles["upload-token"])}>
                                <OutlineArrowupIcon />
                                {token[0]}
                            </div>
                            <div className={classNames(styles["token-tag"], styles["download-token"])}>
                                <OutlineArrowdownIcon />
                                {token[1]}
                            </div>
                        </div>
                        {chatIPCData.execute && (
                            <>
                                <div className={styles["divider-style"]}></div>
                                <RoundedStopButton onClick={handleStop} />
                            </>
                        )}
                    </div>
                </div>
                <AIReActTaskChatContent />
            </div>
        </div>
    )
})

export default AIReActTaskChat

const AIReActTaskChatContent: React.FC<AIReActTaskChatContentProps> = React.memo((props) => {
    const {reviewInfo, planReviewTreeKeywordsMap} = useChatIPCStore()
    const {taskChat} = useAIChatUIData()

    const {streams} = taskChat
    return (
        <>
            <div className={styles["tab-content"]}>
                <AIAgentChatStream streams={streams} />
            </div>
            {!!reviewInfo && (
                <AIReActTaskChatReview reviewInfo={reviewInfo} planReviewTreeKeywordsMap={planReviewTreeKeywordsMap} />
            )}
        </>
    )
})

export const AIReActTaskChatLeftSide: React.FC<AIReActTaskChatLeftSideProps> = React.memo((props) => {
    const {aiPerfData, yakExecResult, taskChat} = useAIChatUIData()
    const [leftExpand, setLeftExpand] = useState(true)
    return (
        <div
            className={classNames(styles["content-left-side"], {
                [styles["content-left-side-hidden"]]: !leftExpand
            })}
        >
            <AIChatLeftSide
                expand={leftExpand}
                setExpand={setLeftExpand}
                tasks={taskChat.plan}
                pressure={aiPerfData.pressure}
                cost={aiPerfData.firstCost}
                card={yakExecResult.card}
            />
            <div className={styles["open-wrapper"]} onClick={() => setLeftExpand(true)}>
                <ChevrondownButton />
                <div className={styles["text"]}>任务列表</div>
            </div>
        </div>
    )
})
