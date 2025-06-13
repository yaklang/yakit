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
import {OutlinePlussmIcon} from "@/assets/icon/outline"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"

const AIPlanReviewTree: React.FC<AIPlanReviewTreeProps> = React.memo((props) => {
    const {list, editable} = props
    const length = useCreation(() => {
        return list.length
    }, [list])
    /**添加子节点 */
    const onAddSubNode = useMemoizedFn(() => {})
    /**添加兄弟节点 */
    const onAddBrotherNode = useMemoizedFn(() => {})
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
                        />
                    </React.Fragment>
                )
            })}
            <AIPlanReviewTreeArrowLine
                preIndex={list[length - 1]?.index || ""}
                nextIndex={list[length + 1]?.index || ""}
            />
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
    const {order, item, preIndex, nextIndex, editable, onAddSubNode, onAddBrotherNode} = props
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
    })
    return (
        <div
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
                        [styles["title-editable"]]: editable,
                        [styles["title-hover"]]: visible
                    })}
                    onClick={onExpand}
                >
                    <ContentEditableDiv
                        className={classNames(styles["title-name"])}
                        value={item.name}
                        editable={editable}
                        setValue={() => {}}
                    />
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
                            className={styles["plus-icon"]}
                            type='text2'
                            icon={<OutlinePlussmIcon />}
                        />
                    </YakitDropdownMenu>
                </div>
                {expand && (
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
        return item.index.trim().split("-")
    }, [item.index])
    const level = useCreation(() => {
        return indexList.length
    }, [indexList])
    const isLastNode = useCreation(() => {
        if (nextIndex === "-1") return true //整个树的最后一个节点
        const nextIndexList = nextIndex.trim().split("-")
        if (indexList.length > nextIndexList.length) return true
        return false
    }, [indexList, nextIndex])
    const nodeType = useCreation(() => {
        if (order === 0) return "" //根节点
        try {
            const indexList = item.index.trim().split("-").filter(Boolean)
            const preIndexList = preIndex.trim().split("-").filter(Boolean)

            if (indexList.length - preIndexList.length === 1) {
                return "start"
            }
            if (preIndexList.length - indexList.length === 1) {
                return "end"
            }
            return ""
        } catch (error) {
            return ""
        }
    }, [item.index, preIndex, nextIndex])
    const onExpand = useMemoizedFn((e: React.MouseEvent) => {
        e.stopPropagation()
        onSetExpand()
    })

    return (
        <div className={styles["prefix-box"]}>
            {indexList.map((index, idx) => {
                const isEndLine = idx === level - 1 && isLastNode
                const left = idx === 0 ? 7 : idx * 16 + 7
                const hasBottom = !nextIndex && idx >= 1 && idx < level - 2
                return (
                    <div
                        key={idx}
                        className={classNames(styles["vertical-line"], {
                            [styles["no-bulge-line"]]: isEndLine && level !== 1,
                            [styles["slash-last-line"]]: isEndLine && !nextIndex
                        })}
                        style={
                            {
                                left,
                                "--height": `${Math.sqrt(Math.pow(20, 2) + Math.pow(16, 2))}px`,
                                "--rotate": `${Math.atan2(16, 20) * (180 / Math.PI)}deg`
                            } as React.CSSProperties
                        }
                    >
                        {hasBottom && <div className={styles["border-bottom"]} />}
                    </div>
                )
            })}
            <div
                style={{left: level === 1 ? 0 : (level - 1) * 16}}
                onClick={onExpand}
                className={classNames(styles["icon-box"], {
                    [styles["slash-right-line"]]: nodeType === "start",
                    [styles["slash-left-line"]]: nodeType === "end"
                })}
            >
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
    const {preIndex, nextIndex} = props
    const preIndexList = useCreation(() => {
        return preIndex.trim().split("-").filter(Boolean)
    }, [preIndex])
    return (
        <div className={styles["ai-plan-review-tree-item"]}>
            <div
                className={classNames(styles["vertical-line"], styles["arrow-box"], {
                    [styles["arrow-box-before"]]: preIndexList.length > 2,
                    [styles["arrow-box-down-before"]]: !nextIndex
                })}
            >
                <div className={styles["arrow"]} />
            </div>
        </div>
    )
})
