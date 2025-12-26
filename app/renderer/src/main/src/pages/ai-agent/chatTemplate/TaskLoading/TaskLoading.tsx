import Loading from "@/components/Loading/Loading"
import {PlanLoadingStatus} from "@/pages/ai-re-act/hooks/type"
import {FC} from "react"
import styles from "./TaskLoading.module.scss"

const TaskLoading: FC<{
    taskStatus: PlanLoadingStatus
}> = ({taskStatus}) => {
    return (
        <div className={styles['task-loading']}>
            {taskStatus.loading && (
                <>
                    <Loading
                        size={16}
                        style={{
                            marginTop: 8
                        }}
                    >
                        <div className={styles['plan-text']}>{taskStatus.plan}</div>
                    </Loading>
                    <div className={styles['task-text']}>{taskStatus.task}</div>
                </>
            )}
        </div>
    )
}
export default TaskLoading
