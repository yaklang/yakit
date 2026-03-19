import React, {memo, useEffect, useRef} from "react"
import styles from "./HistoryTaskTree.module.scss" // 假设你有对应的样式文件
import {HistoryTaskTreeProps} from "./HistoryTaskTreeType"
import {useInViewport, useMemoizedFn} from "ahooks"
import useChatIPCDispatcher from "../../useContext/ChatIPCContent/useDispatcher"
import {AIInputEventSyncTypeEnum} from "@/pages/ai-re-act/hooks/grpcApi"
import emiter from "@/utils/eventBus/eventBus"
import {AITree} from "../../aiTree/AITree"
import useChatIPCStore from "../../useContext/ChatIPCContent/useStore"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"

export const HistoryTaskTree: React.FC<HistoryTaskTreeProps> = memo((props) => {
    const {data} = props
    const {handleSendSyncMessage} = useChatIPCDispatcher()
    const {chatIPCData} = useChatIPCStore()
    const historyContainerRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(historyContainerRef)
    useEffect(() => {
        emiter.on("onRefreshAITaskHistoryList", onSendPlayHistoryList)
        return () => {
            emiter.off("onRefreshAITaskHistoryList", onSendPlayHistoryList)
        }
    }, [])

    const onSendPlayHistoryList = useMemoizedFn(() => {
        chatIPCData.execute && handleSendSyncMessage({syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS})
    })
    return (
        <div className={styles["history-task-tree-container"]} ref={historyContainerRef}>
            <div className={styles["history-list"]}>
                {/* <div>暂无历史任务</div> */}
                {data.records.length === 0 && (
                    <YakitEmpty style={{marginTop: "20%"}} title='暂无历史任务' description='' />
                )}
                {data.records.map((item) => (
                    <AITree key={item.created_at_unix} tasks={item.task_tree} />
                ))}
            </div>
        </div>
    )
})
