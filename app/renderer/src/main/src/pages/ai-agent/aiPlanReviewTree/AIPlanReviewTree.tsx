import React, {useState} from "react"
import {
    AIPlanReviewTreeArrowLineProps,
    AIPlanReviewTreeItemProps,
    AIPlanReviewTreeLineProps,
    AIPlanReviewTreeProps,
    ContentEditableDivProps
} from "./AIPlanReviewTreeType"
import styles from "./AIPlanReviewTree.module.scss"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {ExpandIcon, RetractIcon} from "./icon"
import classNames from "classnames"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePlussmIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {AIChatMessage} from "../type/aiChat"
import {yakitNotify} from "@/utils/notification"

const AIPlanReviewTree: React.FC<AIPlanReviewTreeProps> = React.memo((props) => {
    const {editable} = props
    const [list, setList] = useControllableValue<AIChatMessage.PlanTask[]>(props, {
        defaultValue: [],
        valuePropName: "list",
        trigger: "setList"
    })
    /**
     * 获取某个任务的下一级子任务的最大编号
     * @param data 任务列表
     * @param parentIndex 父任务的 index（如 "1-1"）
     * @returns 最大的子任务编号（如 1、2、3），如果没有子任务则返回 0
     */
    const getMaxChildIndex = (data: AIChatMessage.PlanTask[], parentIndex: string): number => {
        const childPrefix = `${parentIndex}-`
        const children = data
            .filter((task) => task.index.startsWith(childPrefix))
            .map((task) => {
                const childIndex = task.index.substring(childPrefix.length)
                return parseInt(childIndex.split("-")[0]) // 提取第一段数字
            })

        return children.length > 0 ? Math.max(...children) : 0
    }
    /**添加子节点 */
    const onAddSubNode = useMemoizedFn((item: AIChatMessage.PlanTask) => {
        const parentIndex = item.index
        const maxChildIndex = getMaxChildIndex(list, parentIndex)
        const newChildIndex = `${parentIndex}-${maxChildIndex + 1}`

        const newChildTask: AIChatMessage.PlanTask = {
            index: newChildIndex,
            name: `name-我是添加的子节点`,
            goal: `goal-我是添加的子节点`,
            state: "wait",
            isRemove: false
        }

        // 找到父任务的位置
        const parentPos = list.findIndex((task) => task.index === parentIndex)
        if (parentPos === -1) return

        // 找到该父任务的最后一个子任务的位置
        const childPrefix = `${parentIndex}-`
        let lastChildPos = -1
        for (let i = parentPos + 1; i < list.length; i++) {
            if (!list[i].index.startsWith(childPrefix)) {
                break // 遇到非子任务，停止查找
            }
            lastChildPos = i
        }

        // 插入位置：如果存在子任务，则在最后一个子任务之后；否则在父任务之后
        const insertPos = lastChildPos !== -1 ? lastChildPos + 1 : parentPos + 1
        list.splice(insertPos, 0, newChildTask)
        setList([...list])
        onFocusAfterAddNode(newChildTask)
    })
    /**
     * 获取某个层级的最后一个兄弟节点的 index
     * @param data 任务列表
     * @param parentIndex 父级 index（如 "1"、"1-1"）
     * @returns 该层级的最后一个兄弟节点的 index（如 "3"、"1-2"）
     */
    const getLastSiblingIndex = (data: AIChatMessage.PlanTask[], siblingOfIndex: string): string | null => {
        const parts = siblingOfIndex.split("-")
        const parentIndex = parts.slice(0, -1).join("-") // 父级 index(如 "1-1" → "1")

        // 找出所有同层级的兄弟节点
        const siblings = data.filter((task) => {
            const taskParts = task.index.split("-")
            if (taskParts.length !== parts.length) return false // 必须层级相同
            const taskParent = taskParts.slice(0, -1).join("-")
            return taskParent === parentIndex
        })

        if (siblings.length === 0) return null

        // 找到最大的兄弟编号
        const lastSibling = siblings.reduce((prev, current) => {
            const prevNum = parseInt(prev.index.split("-").pop()!)
            const currentNum = parseInt(current.index.split("-").pop()!)
            return prevNum > currentNum ? prev : current
        })

        return lastSibling.index
    }
    /**
     * 获取某个任务的最后一个子任务的 index
     * @param defList 任务列表
     * @param parentIndex 父任务的 index（如 "1-1"）
     * @returns 最后一个子任务的 index（如 "1-1-2"），如果没有子任务则返回 null
     */
    const getLastChildIndex = (defList: AIChatMessage.PlanTask[], parentIndex: string): string | null => {
        const childPrefix = `${parentIndex}-`
        const children = defList.filter((task) => task.index.startsWith(childPrefix))

        if (children.length === 0) return null

        // 找到层级最深的最后一个子任务
        const lastChild = children.reduce((prev, current) => {
            return prev.index > current.index ? prev : current // 按字符串排序
        })

        return lastChild.index
    }
    /**添加兄弟节点 */
    const onAddBrotherNode = useMemoizedFn((item: AIChatMessage.PlanTask) => {
        const siblingOfIndex = item.index
        const lastSiblingIndex = getLastSiblingIndex(list, siblingOfIndex)
        const lastChildIndex = getLastChildIndex(list, siblingOfIndex)

        // 计算新兄弟的 index（如 "1-1" → "1-2"）
        const parts = siblingOfIndex.split("-")
        const parentIndex = parts.slice(0, -1).join("-")
        const newSiblingNum = lastSiblingIndex
            ? parseInt(lastSiblingIndex.split("-").pop()!) + 1
            : parseInt(parts[parts.length - 1]) + 1
        const newSiblingIndex = parentIndex ? `${parentIndex}-${newSiblingNum}` : `${newSiblingNum}`

        const newSiblingTask: AIChatMessage.PlanTask = {
            index: newSiblingIndex,
            name: `新增任务 ${newSiblingIndex}`,
            goal: `这是 ${newSiblingIndex} 的目标`,
            state: "wait",
            isRemove: false
        }

        // 确定插入位置
        let insertPos = 0
        if (lastChildIndex && lastSiblingIndex) {
            // 取子元素和兄弟元素中更靠后的位置
            const lastChildPos = list.findIndex((task) => task.index === lastChildIndex)
            const lastSiblingPos = list.findIndex((task) => task.index === lastSiblingIndex)
            insertPos = Math.max(lastChildPos, lastSiblingPos) + 1
        } else if (lastChildIndex) {
            // 如果有子任务，插入到最后一个子任务之后
            insertPos = list.findIndex((task) => task.index === lastChildIndex) + 1
        } else if (lastSiblingIndex) {
            // 如果没有子任务但有兄弟，插入到最后一个兄弟之后
            insertPos = list.findIndex((task) => task.index === lastSiblingIndex) + 1
        } else {
            // 如果既没有子任务也没有兄弟，插入到父任务之后
            const parentPos = list.findIndex((task) => task.index === parentIndex)
            insertPos = parentPos !== -1 ? parentPos + 1 : list.length
        }

        list.splice(insertPos, 0, newSiblingTask)
        setList([...list])
        onFocusAfterAddNode(newSiblingTask)
    })
    /**新增节点后，聚焦在该节点上 */
    const onFocusAfterAddNode = useMemoizedFn((item: AIChatMessage.PlanTask) => {
        setTimeout(() => {
            // 新增的节点如果没在显示区域内，需要滚动到节点的位置
            const dom = document.getElementById(item.index)
            if (!dom) return
            const rect = dom.getBoundingClientRect()
            const isVisible =
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            if (!isVisible) {
                dom.scrollIntoView()
            }
        }, 200)
    })
    const onRemoveNode = useMemoizedFn((item: AIChatMessage.PlanTask) => {
        const newList = list.map((ele) => {
            if (ele.index.startsWith(item.index)) {
                ele.isRemove = true
            }
            return {...ele}
        })
        setList([...newList])
    })
    return (
        <div className={styles["ai-plan-review-tree"]}>
            <div className={styles["dot"]} />
            {list.map((item, index) => {
                return (
                    <React.Fragment key={item.index}>
                        <AIPlanReviewTreeItem
                            order={index}
                            item={item}
                            preIndex={list[index - 1]?.index || ""}
                            nextIndex={list[index + 1]?.index || ""}
                            editable={editable}
                            onAddSubNode={onAddSubNode}
                            onAddBrotherNode={onAddBrotherNode}
                            onRemoveNode={onRemoveNode}
                        />
                    </React.Fragment>
                )
            })}
            <AIPlanReviewTreeArrowLine />
        </div>
    )
})

export default AIPlanReviewTree

const treeItemMenuData = [
    {
        key: "sub",
        label: "添加子任务"
    },
    {
        key: "brother",
        label: "添加兄弟任务"
    }
]
const AIPlanReviewTreeItem: React.FC<AIPlanReviewTreeItemProps> = React.memo((props) => {
    const {order, item, preIndex, nextIndex, editable, onAddSubNode, onAddBrotherNode, onRemoveNode} = props
    const [expand, setExpand] = useState<boolean>(true)
    const [visible, setVisible] = useState<boolean>(false)

    const indexList = useCreation(() => {
        return item.index.trim().split("-")
    }, [item.index])
    /**层级 */
    const level = useCreation(() => {
        return indexList.length
    }, [indexList])

    const onSetExpand = useMemoizedFn(() => {
        if (item.isRemove) {
            yakitNotify("error", "该节点已被删除")
            return
        }
        setExpand((prev) => !prev)
    })
    const onExpand = useMemoizedFn((e: React.MouseEvent) => {
        e.stopPropagation()
        onSetExpand()
    })
    const onAddNode = useMemoizedFn((e) => {
        const {key, domEvent} = e
        domEvent.stopPropagation()
        switch (key) {
            case "sub":
                onAddSubNode(item)
                break
            case "brother":
                onAddBrotherNode(item)
                break
            default:
                break
        }
        setVisible(false)
    })
    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
        onRemoveNode(item)
    })
    return (
        <div
            id={item.index}
            className={styles["ai-plan-review-tree-item"]}
            style={{"--width": `${level * 16}px`} as React.CSSProperties}
        >
            <AIPlanReviewTreeLine
                order={order}
                item={item}
                preIndex={preIndex}
                nextIndex={nextIndex}
                expand={expand}
                onSetExpand={onSetExpand}
            />

            <div className={styles["tree-item-content"]}>
                <div
                    className={classNames(styles["title"], {
                        [styles["title-editable"]]: editable && !item?.isRemove,
                        [styles["title-hover"]]: visible && !item?.isRemove,
                        [styles["title-remove"]]: item?.isRemove
                    })}
                    onClick={onExpand}
                >
                    <ContentEditableDiv
                        className={classNames(styles["title-name"])}
                        value={item.name}
                        editable={editable}
                        setValue={() => {}}
                    />
                    <div className={styles["icon-body"]}>
                        <YakitButton type='text2' icon={<OutlineTrashIcon />} onClick={onRemove} />
                        <YakitDropdownMenu
                            menu={{
                                data: treeItemMenuData,
                                onClick: onAddNode
                            }}
                            dropdown={{
                                trigger: ["click"],
                                placement: "bottom",
                                visible: visible,
                                onVisibleChange: setVisible
                            }}
                        >
                            <YakitButton
                                onClick={(e) => e.stopPropagation()}
                                type='text2'
                                icon={<OutlinePlussmIcon />}
                            />
                        </YakitDropdownMenu>
                    </div>
                </div>
                {expand && !item?.isRemove && (
                    <div className={styles["body"]}>
                        <ContentEditableDiv value={item.goal} editable={editable} setValue={() => {}} />
                    </div>
                )}
            </div>
        </div>
    )
})
/**
 * @description 可编辑的div
 * TODO 编辑情况待优化
 * @param editable 是否可编辑
 * @param className 样式类名
 * */
const ContentEditableDiv: React.FC<ContentEditableDivProps> = React.memo((props) => {
    const {editable, className} = props
    const [value, setValue] = useControllableValue<string>(props, {
        defaultValue: "",
        valuePropName: "value",
        trigger: "setValue"
    })
    return (
        <div
            className={className || ""}
            onClick={(e) => e.stopPropagation()}
            contentEditable={editable}
            onInput={(e) => setValue(e.currentTarget.textContent || "")}
            dangerouslySetInnerHTML={{__html: value}}
            suppressContentEditableWarning={true}
        ></div>
    )
})
/**树的每一项的线 */
const AIPlanReviewTreeLine: React.FC<AIPlanReviewTreeLineProps> = React.memo((props) => {
    const {order, item, preIndex, nextIndex, expand, onSetExpand} = props
    const indexList = useCreation(() => {
        return item.index.trim().split("-").filter(Boolean)
    }, [item.index])
    const preIndexList = useCreation(() => {
        return preIndex.trim().split("-").filter(Boolean)
    }, [preIndex])
    const nextIndexList = useCreation(() => {
        return nextIndex.trim().split("-").filter(Boolean)
    }, [nextIndex])
    const level = useCreation(() => {
        return indexList.length
    }, [indexList])
    const isLastNode = useCreation(() => {
        if (!nextIndex) return true //整个树的最后一个节点
        if (indexList.length > nextIndexList.length) return true //当前层级的最后一个节点
        return false
    }, [indexList, nextIndex, nextIndexList])
    const lineType = useCreation(() => {
        if (order === 0) return "" //根节点
        try {
            if (indexList.length - preIndexList.length === 1) return "start"
            if (preIndexList.length - indexList.length === 1) return "end"
            return ""
        } catch (error) {
            return ""
        }
    }, [indexList, preIndexList])
    const gap = useCreation(() => {
        if (indexList.length === 1) return 0
        if (!nextIndexList.length) return 1
        const gapNumber = indexList.length - nextIndexList.length
        if (gapNumber > 1) return gapNumber
        return 0
    }, [indexList, nextIndexList])
    const onExpand = useMemoizedFn((e: React.MouseEvent) => {
        e.stopPropagation()
        onSetExpand()
    })
    return (
        <div className={styles["prefix-box"]}>
            {indexList.map((index, idx) => {
                const isEndLine = idx === level - 1 && isLastNode && indexList.length > 1
                const left = idx === 0 ? 7 : idx * 16 + 7
                const hasBottom = gap && idx < level - 2 && idx >= 1 && idx > nextIndexList.length - 1
                return (
                    <div
                        key={idx}
                        //NOTE 样式相关判断勿动，情况复杂
                        className={classNames(styles["vertical-line"], {
                            [styles["no-bulge-line"]]: isEndLine && level !== 1,
                            [styles["slash-last-line"]]: isEndLine && !nextIndex,
                            [styles["slash-right-line"]]: idx === level - 1 && lineType === "start",
                            [styles["slash-left-line"]]: idx === level - 1 && lineType === "end",
                            // gap
                            [styles["slash-gap-line-before"]]:
                                gap && idx === level - 1 && indexList.length > preIndexList.length,
                            [styles["slash-gap-line-after"]]: gap && idx === level - 1,
                            [styles["gap-no-bulge-line"]]: gap && idx >= 1 && idx >= nextIndexList.length,
                            [styles["gap-left-line"]]:
                                gap &&
                                ((nextIndexList.length > 0 && idx === nextIndexList.length) ||
                                    (nextIndexList.length === 0 && idx === 1))
                        })}
                        style={
                            {
                                left,
                                "--height": `${Math.sqrt(Math.pow(20, 2) + Math.pow(16, 2))}px`,
                                "--rotate": `${Math.atan2(16, 20) * (180 / Math.PI)}deg`
                            } as React.CSSProperties
                        }
                    >
                        {!!hasBottom && <div className={styles["border-bottom"]} />}
                    </div>
                )
            })}
            <div style={{left: level === 1 ? 0 : (level - 1) * 16}} onClick={onExpand} className={styles["icon-box"]}>
                {expand ? (
                    <ExpandIcon className={styles["chevron-down-icon"]} />
                ) : (
                    <RetractIcon className={styles["chevron-right-icon"]} />
                )}
            </div>
        </div>
    )
})
/**树箭头 */
const AIPlanReviewTreeArrowLine: React.FC<AIPlanReviewTreeArrowLineProps> = React.memo((props) => {
    return (
        <div className={styles["ai-plan-review-tree-item"]}>
            <div className={classNames(styles["vertical-line"], styles["arrow-box"])}>
                <div className={styles["arrow"]} />
            </div>
        </div>
    )
})
