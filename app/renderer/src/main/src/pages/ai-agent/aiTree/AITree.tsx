import React, {memo, useMemo} from "react"
import {AITreeNodeProps, AITreeProps} from "./type"
import {TaskErrorIcon, TaskInProgressIcon, TaskSuccessIcon} from "./icon"
import {OutlineExitIcon, OutlineInformationcircleIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {useMemoizedFn} from "ahooks"

import classNames from "classnames"
import styles from "./AITree.module.scss"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {AITaskInfoProps} from "@/pages/ai-re-act/hooks/aiRender"
import emiter from "@/utils/eventBus/eventBus"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import useChatIPCDispatcher from "../useContext/ChatIPCContent/useDispatcher"
import {AIInputEventSyncTypeEnum} from "@/pages/ai-re-act/hooks/grpcApi"

// 起始节点层级
const START_LEVEL = 1

function lineStyles(i: number, levelDiff: number, lineNum: number) {
    if (i === 0 || lineNum === i + 1 || i < lineNum - levelDiff) return {}

    return {
        height: "37px",
        flex: "none"
    }
}

export const AITree: React.FC<AITreeProps> = memo((props) => {
    const {tasks} = props
    const onClick = useMemoizedFn((id) => {
        emiter.emit("onAITreeLocatePlanningList", id)
    })
    return (
        <div className={styles["ai-tree"]}>
            {tasks.map((item, index) => {
                const prev = tasks[index - 1]
                const next = tasks[index + 1]
                const position = {
                    isStart: index === 0,
                    isEnd: index === tasks.length - 1,
                    isStartOfLevel: item.level > (prev?.level ?? 0),
                    isEndOfLevel: item.level > (next?.level ?? 0),
                    isParentLast: item.level > (next?.level ?? 0) && (next?.level ?? 0) !== item.level - 1,
                    levelDiff: Math.abs(item.level - (next?.level ?? 2)) // START_LEVEL 加上 去掉第一层，所以是 2
                }
                return (
                    <AITreeNode
                        key={item.index}
                        order={index}
                        position={position}
                        data={item}
                        onClick={() => onClick(item.index)}
                    />
                )
            })}
            <div className={styles["ai-tree-node-end"]}>
                <div />
            </div>
        </div>
    )
})

/** @name 树节点 */
const AITreeNode: React.FC<AITreeNodeProps> = memo(({data, position, onClick}) => {
    const {handleSendSyncMessage} = useChatIPCDispatcher()
    const lineNum = useMemo(() => {
        return data.level - START_LEVEL
    }, [data.level])
    const {isStart, isEnd, isStartOfLevel, isEndOfLevel, isParentLast, levelDiff} = position
    const [infoShow, setInfoShow] = React.useState(false)

    const handleFindLeafNode = useMemoizedFn((info: AITaskInfoProps) => {
        if (data.subtasks && data.subtasks.length > 0) {
            return handleFindLeafNode(data.subtasks[0])
        } else {
            return info
        }
    })
    const onCancelTask = useMemoizedFn(() => {
        handleSendSyncMessage({
            syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN,
            SyncJsonInput: JSON.stringify({reason: "用户认为这个任务不需要执行", subtask_index: data.index})
        })
    })
    const [Icon, Card] = useMemo(() => {
        const titleNode = (
            <div className={styles["node-title"]}>
                <p>{data.name}</p>
                <div className={styles["node-extra"]}>
                    <YakitPopover
                        overlayClassName={styles["task-detail-popover"]}
                        overlayStyle={{paddingLeft: 4}}
                        placement='rightTop'
                        content={
                            <div className={styles["detail-wrapper"]}>
                                <div className={styles["detail-title"]}>{data.name}</div>
                                <div className={styles["detail-description"]}>{data.goal}</div>
                            </div>
                        }
                        visible={infoShow}
                        onVisibleChange={setInfoShow}
                    >
                        <OutlineInformationcircleIcon className={styles["info-icon"]} />
                    </YakitPopover>
                    {data.isLeaf && data.progress === "processing" && (
                        <YakitPopconfirm
                            title={"是否确认取消该子任务，取消后会按顺序执行下一个子任务?"}
                            onConfirm={() => onCancelTask()}
                        >
                            <OutlineExitIcon />
                        </YakitPopconfirm>
                    )}
                </div>
            </div>
        )
        const contentNode = (
            <div className={styles["node-content"]}>
                <div className={styles["node-content-text"]}>{data.goal}</div>
                <div className={styles["node-content-tag"]}>
                    {[data.fail_tool_call_count, data.success_tool_call_count].map((item, index) => {
                        if (!item) return null
                        const color = index === 0 ? "danger" : "success"
                        return (
                            <YakitTag
                                key={index}
                                size='small'
                                fullRadius
                                color={color}
                                className={styles["node-content-tag-num"]}
                            >
                                {item}
                            </YakitTag>
                        )
                    })}
                </div>
            </div>
        )
        const style = isParentLast && !data.progress ? {marginBottom: "16px"} : {}

        const getWrapper = (extraClass?: string) => (
            <div className={classNames(styles["node-wrapper"], extraClass)} style={style} onClick={onClick}>
                {titleNode}
                {data.progress && contentNode}
            </div>
        )
        switch (data.progress) {
            case "completed":
                return [<TaskSuccessIcon key='success' />, getWrapper(styles["node-wrapper-success"])]
            case "aborted":
            case "skipped":
                return [<TaskErrorIcon key='error' />, getWrapper(styles["node-wrapper-error"])]
            case "processing":
                return [<TaskInProgressIcon key='in-progress' />, getWrapper(styles["node-wrapper-in-progress"])]
            default:
                return [
                    <div key='circle' className={styles["node-circle-icon"]} />,
                    getWrapper(styles["node-wrapper-default"])
                ]
        }
    }, [data, infoShow, isParentLast, onClick, onCancelTask])

    if (data === null) return null

    return (
        <div className={styles["ai-tree-node"]}>
            {Array.from({length: lineNum}).map((_, i) => {
                const isLast = i === lineNum - 1
                const backslash = isLast && isStartOfLevel
                const slash = isLast && isEndOfLevel
                const bgColor =
                    (isLast && isStartOfLevel) || isStart ? "transparent" : "var(--Colors-Use-Neutral-Disable)"
                const height = isEndOfLevel ? lineStyles(i, levelDiff, lineNum) : {}
                return (
                    <div
                        key={i}
                        className={classNames(styles["node-icon"], {
                            [styles["node-icon-backslash"]]: backslash && i !== 0,
                            [styles["node-icon-parent-slash"]]: i !== 0 && !slash && isParentLast,
                            [styles["node-icon-slash"]]: i !== 0 && slash
                        })}
                    >
                        <div
                            style={{
                                backgroundColor: bgColor
                            }}
                            className={styles["node-icon-line-top"]}
                        />
                        {isLast && Icon}
                        <div
                            className={classNames(
                                styles["node-icon-line"],
                                isLast && isEnd && styles["node-icon-line-bottom"]
                            )}
                            style={height}
                        />
                    </div>
                )
            })}
            {Card}
        </div>
    )
})
