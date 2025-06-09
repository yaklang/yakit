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
import {AIChatMessage} from "../type/aiChat"
import {ExpandIcon, RetractIcon} from "./icon"
import classNames from "classnames"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePlussmIcon} from "@/assets/icon/outline"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"

const list: AIChatMessage.PlanTask[] = [
    {
        index: "1",
        name: "根据用户输入的URL、数据包或IP进行XSS漏洞检测",
        goal: "完成XSS漏洞检测，并输出漏洞分析结论",
        state: "wait"
    },
    {
        index: "1-1",
        name: "输入识别",
        goal: "识别用户输入的类型（URL、数据包或IP）",
        state: "wait"
    },
    {
        index: "1-2",
        name: "页面抓取",
        goal: "如果输入为URL，使用爬虫抓取页面并识别所有输入点",
        state: "wait"
    },
    {
        index: "1-2-1",
        name: "输入识别-URL",
        goal: "识别用户输入的类型（URL、数据包或IP）-1",
        state: "wait"
    },
    {
        index: "1-2-1-1",
        name: "输入识别-URL",
        goal: "识别用户输入的类型（URL、数据包或IP）-1",
        state: "wait"
    },
    {
        index: "1-2-1-1-1",
        name: "输入识别-URL",
        goal: "识别用户输入的类型（URL、数据包或IP）-1",
        state: "wait"
    },
    {
        index: "1-2-1-2",
        name: "输入识别-URL",
        goal: "识别用户输入的类型（URL、数据包或IP）-1",
        state: "wait"
    },
    {
        index: "1-2-2",
        name: "输入识别-URL",
        goal: "识别用户输入的类型（URL、数据包或IP）-1",
        state: "wait"
    },
    {
        index: "1-2-3",
        name: "输入识别-URL",
        goal: "识别用户输入的类型（URL、数据包或IP）-1",
        state: "wait"
    },
    {
        index: "1-3",
        name: "数据包分析",
        goal: "如果输入为数据包，分析并变形各参数，注入常见XSS payload",
        state: "wait"
    },
    {
        index: "1-4",
        name: "IP扫描",
        goal: "如果输入为IP，扫描常见Web端口，发现Web服务后回到第2步",
        state: "wait"
    },
    {
        index: "1-5",
        name: "回显检测",
        goal: "自动检测所有输入点的回显及编码情况，判断是否被过滤或转义",
        state: "wait"
    },
    {
        index: "1-6",
        name: "payload注入",
        goal: "针对可疑输入点，依次注入反射型、存储型、DOM型XSS payload",
        state: "wait"
    },
    {
        index: "1-7",
        name: "payload适配",
        goal: "根据页面上下文适配payload，测试不同XSS类型",
        state: "wait"
    },
    {
        index: "1-8",
        name: "结果汇总",
        goal: "汇总有效payload和响应，输出漏洞分析结论",
        state: "wait"
    },
    {
        index: "2",
        name: "结果汇总",
        goal: "汇总有效payload和响应，输出漏洞分析结论",
        state: "wait"
    },
    {
        index: "2-1",
        name: "结果汇总",
        goal: "汇总有效payload和响应，输出漏洞分析结论",
        state: "wait"
    },
    {
        index: "2-2",
        name: "结果汇总",
        goal: "汇总有效payload和响应，输出漏洞分析结论",
        state: "wait"
    },
    {
        index: "3",
        name: "结果汇总",
        goal: "汇总有效payload和响应，输出漏洞分析结论",
        state: "wait"
    },
    {
        index: "3-1",
        name: "结果汇总",
        goal: "汇总有效payload和响应，输出漏洞分析结论",
        state: "wait"
    },
    {
        index: "-1",
        name: "结果汇总",
        goal: "汇总有效payload和响应，输出漏洞分析结论",
        state: "wait"
    }
]
const AIPlanReviewTree: React.FC<AIPlanReviewTreeProps> = React.memo((props) => {
    const {editable = true} = props
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
                        {item.index === "-1" ? (
                            <AIPlanReviewTreeArrowLine
                                preIndex={list[index - 1]?.index || ""}
                                index={index}
                                length={length}
                            />
                        ) : (
                            <AIPlanReviewTreeItem
                                order={index}
                                item={item}
                                preIndex={list[index - 1]?.index || ""}
                                nextIndex={list[index + 1]?.index || ""}
                                editable={editable}
                                onAddSubNode={onAddSubNode}
                                onAddBrotherNode={onAddBrotherNode}
                            />
                        )}
                    </React.Fragment>
                )
            })}
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
                return (
                    <div
                        key={idx}
                        className={classNames(styles["vertical-line"], {
                            [styles["no-bulge-line"]]: isEndLine && level !== 1
                        })}
                        style={{left: idx === 0 ? 7 : idx * 16 + 7}}
                    />
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
    const {index, length, preIndex} = props
    const preIndexList = useCreation(() => {
        return preIndex.trim().split("-").filter(Boolean)
    }, [preIndex])
    return (
        <div className={styles["ai-plan-review-tree-item"]}>
            <div
                className={classNames(styles["vertical-line"], styles["arrow-box"], {
                    [styles["arrow-box-before"]]: preIndexList.length > 1
                })}
            >
                {index === length - 1 && <div className={styles["arrow"]} />}
            </div>
        </div>
    )
})
