import {FC, memo} from "react"
import classNames from "classnames"

import styles from "./ai-template-header.module.scss"

import type {TAiTemplateHeaderProps, TTaskState} from "./TAiTemplateHeader"

import {RemoveIcon} from "@/assets/newIcon"
import {
    TaskErrorIcon,
    TaskInProgressDescribeIcon,
    TaskSuccessIcon,
    TaskTemplateInProgressIcon,
    TaskWaitIcon
} from "../../aiTree/icon"

const taskNodeMap: Record<TTaskState, JSX.Element> = {
    success: <TaskSuccessIcon />,
    error: <TaskErrorIcon />,
    "in-progress": <TaskTemplateInProgressIcon />
}

const taskDescribeIconMap: Record<Exclude<TTaskState, "success">, JSX.Element> = {
    error: <RemoveIcon />,
    "in-progress": <TaskInProgressDescribeIcon className={styles["icon"]} />
}
/**
 *
 * @description 任务节点头部名称节点
 */
const AiTemplateHeader: FC<TAiTemplateHeaderProps> = (props) => {
    const taskState = taskNodeMap[props.type] ?? <TaskWaitIcon />
    const taskStateDescribeIcon = taskDescribeIconMap[props.type] ?? null

    return (
        <div className={styles["template-header-container"]}>
            <div className={styles["template-header-separation"]} />
            <div className={styles["template-header-content"]}>
                {taskState}
                <div className={styles["template-header-box"]}>
                    <div>{props.name}</div>
                    <div
                        className={classNames(styles["template-header-describe"], {
                            [styles["template-header-describe-in-progress"]]: props.type === "in-progress",
                            [styles["template-header-describe-error"]]: props.type === "error"
                        })}
                    >
                        {taskStateDescribeIcon} {props.describe}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(AiTemplateHeader)
