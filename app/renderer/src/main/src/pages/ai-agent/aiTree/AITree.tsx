import React, {memo, useMemo} from "react"
import {AITreeEmptyNodeProps, AITreeNodeInfo, AITreeNodeProps, AITreeProps} from "./type"
import {TaskErrorIcon, TaskInProgressIcon, TaskSuccessIcon, TaskWaitIcon} from "./icon"
import {OutlineInformationcircleIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"

import classNames from "classnames"
import styles from "./AITree.module.scss"

export const AITree: React.FC<AITreeProps> = memo((props) => {
    const {tasks} = props
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
                    />
                )
            })}
        </div>
    )
})

/** @name 树节点 */
const AITreeNode: React.FC<AITreeNodeProps> = memo((props) => {
    const {order, index, preIndex, data} = props

    const [infoShow, setInfoShow] = React.useState(false)

    const setting: AITreeNodeInfo | null = useMemo(() => {
        if (order === 0) return {empty: {}, node: {}}
        else {
            try {
                const indexList = index.trim().split("-").filter(Boolean)
                const preIndexList = preIndex.trim().split("-").filter(Boolean)

                if (indexList.length - preIndexList.length === 1) {
                    return {
                        empty: {lineNum: indexList.length - 1, isStartEnd: "start"},
                        node: {lineNum: indexList.length - 1}
                    }
                }
                if (preIndexList.length - indexList.length === 1) {
                    return {
                        empty: {lineNum: indexList.length, isStartEnd: "end"},
                        node: {lineNum: indexList.length - 1}
                    }
                }
                if (indexList.length === preIndexList.length) {
                    return {
                        empty: {lineNum: indexList.length},
                        node: {lineNum: indexList.length - 1, isSibling: true}
                    }
                }
                return {empty: {}, node: {}}
            } catch (error) {
                return null
            }
        }
    }, [order, index, preIndex])

    if (setting === null) return null

    return (
        <div className={styles["ai-tree-node"]}>
            {order !== 0 && (
                <div className={styles["node-wrapper"]} style={setting.node.isSibling ? {height: 12} : undefined}>
                    <AITreeEmptyNode lineNum={setting.empty.lineNum} isStartEnd={setting.empty.isStartEnd} type='' />
                </div>
            )}
            <div className={styles["node-wrapper"]}>
                <AITreeEmptyNode lineNum={setting.node.lineNum} type={data.state} />
                <div className={styles["content"]}>
                    <div
                        style={{width: 226 - ((setting.empty.lineNum || 0) + 1) * 16}}
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
    const {type, lineNum, isStartEnd} = props

    const lines = useMemo(() => {
        if (!lineNum) return null
        const arr = new Array(lineNum).fill(0)

        const lineArr = arr.map((_, index) => {
            return (
                <div key={index} className={styles["node-empty"]}>
                    <div className={styles["line"]}></div>
                </div>
            )
        })

        if (isStartEnd === "start") {
            lineArr.push(
                <div key={lineNum} className={styles["node-empty-diagonal"]}>
                    <div className={styles["start-diagonal"]}></div>
                </div>
            )
        }
        if (isStartEnd === "end") {
            lineArr.push(
                <div key={lineNum + 1} className={styles["node-empty-diagonal"]}>
                    <div className={styles["end-diagonal"]}></div>
                </div>
            )
        }

        return lineArr
    }, [lineNum, isStartEnd])

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
