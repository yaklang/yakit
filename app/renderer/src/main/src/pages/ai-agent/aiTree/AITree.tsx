import React, {memo, useMemo} from "react"
import {AITreeEmptyNodeProps, AITreeNodeInfo, AITreeNodeProps, AITreeProps} from "./type"
import {TaskErrorIcon, TaskInProgressIcon, TaskSuccessIcon, TaskWaitIcon} from "./icon"
import {OutlineInformationcircleIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {useMemoizedFn} from "ahooks"
import {AIChatMessage} from "../type/aiChat"
import cloneDeep from "lodash/cloneDeep"

import classNames from "classnames"
import styles from "./AITree.module.scss"

export const AITree: React.FC<AITreeProps> = memo((props) => {
    const {tasks, onNodeClick} = props
    return (
        <div className={styles["ai-tree"]}>
            {tasks.map((item, index) => {
                return (
                    <AITreeNode
                        key={item.index}
                        order={index}
                        index={item.index}
                        preIndex={tasks[index - 1]?.index || ""}
                        data={item}
                        onClick={onNodeClick}
                    />
                )
            })}
        </div>
    )
})

/** @name 树节点 */
const AITreeNode: React.FC<AITreeNodeProps> = memo((props) => {
    const {order, index, preIndex, data, onClick} = props

    const [infoShow, setInfoShow] = React.useState(false)

    const handleFindLeafNode = useMemoizedFn((info: AIChatMessage.PlanTask) => {
        if (data.subtasks && data.subtasks.length > 0) {
            return handleFindLeafNode(data.subtasks[0])
        } else {
            return info
        }
    })

    const handleClick = useMemoizedFn(() => {
        onClick && onClick(handleFindLeafNode(cloneDeep(data)))
    })

    const setting: AITreeNodeInfo | null = useMemo(() => {
        try {
            const indexList = index.trim().split("-").filter(Boolean).length
            const preIndexList = preIndex.trim().split("-").filter(Boolean).length

            const levelDiff = indexList - preIndexList
            const absLevelDiff = Math.abs(levelDiff)

            return {
                nodeLevel: indexList,
                empty: {
                    isSibling: absLevelDiff === 0,
                    levelDiff: absLevelDiff,
                    isStartEnd: levelDiff === 0 ? undefined : levelDiff > 0 ? "start" : "end"
                }
            } as AITreeNodeInfo
        } catch (error) {
            return null
        }
    }, [order, index, preIndex])

    if (setting === null) return null

    return (
        <div className={styles["ai-tree-node"]}>
            {order !== 0 && (
                <div className={styles["node-wrapper"]} style={setting.empty.isSibling ? {height: 12} : undefined}>
                    <AITreeEmptyNode
                        level={setting.nodeLevel}
                        levelDiff={setting.empty.levelDiff}
                        isStartEnd={setting.empty.isStartEnd}
                        type=''
                    />
                </div>
            )}
            <div className={styles["node-wrapper"]}>
                <AITreeEmptyNode isNode={true} level={setting.nodeLevel} levelDiff={0} type={data.progress || "wait"} />
                <div className={styles["content"]} onClick={handleClick}>
                    <div
                        style={{width: 226 - (setting.nodeLevel || 0) * 16 - 10}}
                        className={classNames(styles["content-title"], "yakit-content-single-ellipsis")}
                    >
                        {data.name}
                    </div>
                    <div className={classNames(styles["hover-wrapper"], {[styles["show-hover-wrapper"]]: infoShow})}>
                        <div
                            className={classNames(styles["task-title"], "yakit-content-single-ellipsis")}
                            title={data.name}
                        >
                            {data.name}
                        </div>

                        <div className={styles["task-extra-btns"]}>
                            <div className={styles["info-icon"]}>
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
                                    <OutlineInformationcircleIcon className={infoShow ? styles["hover-icon"] : ""} />
                                </YakitPopover>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})

/** @name 生成树的支线条和icon */
const AITreeEmptyNode: React.FC<AITreeEmptyNodeProps> = memo((props) => {
    const {isNode, type, level, levelDiff, isStartEnd} = props

    const lines = useMemo(() => {
        let count = level

        if (isNode) {
            const arr = new Array(--count).fill(0)
            const lineArr = arr.map((_, index) => {
                return <div key={index} className={styles["node-vertical-line"]} />
            })
            return lineArr
        }

        if (levelDiff <= 1) {
            const arr = new Array(count).fill(0)
            const lineArr = arr.map((_, index) => {
                return <div key={index} className={styles["node-vertical-line"]} />
            })
            if (isStartEnd === "start") {
                lineArr.pop()
                ++count
                lineArr.push(<div key={count} className={styles["node-start-oblique-line"]} />)
            }
            if (isStartEnd === "end") {
                ++count
                lineArr.push(<div key={count} className={styles["node-end-oblique-line"]} />)
            }
            return lineArr
        } else {
            let lineArr: React.ReactNode[] = []
            lineArr = lineArr.concat(
                new Array(count - 1).fill(0).map((_, index) => {
                    return <div key={index + 1} className={styles["node-vertical-line"]} />
                })
            )
            lineArr.push(<div key={1} className={styles["node-T-line"]} />)
            lineArr = lineArr.concat(
                new Array(levelDiff - 1).fill(0).map((_, index) => {
                    return <div key={index + 2} className={styles["node-horizontal-line"]} />
                })
            )

            if (isStartEnd === "end") {
                ++count
                lineArr.push(<div key={count} className={styles["node-end-half-oblique-line"]} />)
            }

            return lineArr
        }
    }, [isNode, level, levelDiff, isStartEnd])

    const icon = useMemo(() => {
        if (type === "success") {
            return (
                <div className={styles["node-icon"]}>
                    <TaskSuccessIcon />
                </div>
            )
        }
        if (type === "error") {
            return (
                <div className={styles["node-icon"]}>
                    <TaskErrorIcon />
                </div>
            )
        }
        if (type === "in-progress") {
            return (
                <div className={styles["node-icon"]}>
                    <TaskInProgressIcon />
                </div>
            )
        }
        if (type === "") return null

        return (
            <div className={styles["node-icon"]}>
                <TaskWaitIcon />
            </div>
        )
    }, [type])

    return (
        <>
            {lines}
            {icon}
        </>
    )
})
