import React, {useEffect, useRef, useState} from "react"
import {
    AIPlanReviewTreeArrowLineProps,
    AIPlanReviewTreeItemProps,
    AIPlanReviewTreeLineProps,
    AIPlanReviewTreeProps,
    ContentEditableDivProps,
    SetItemOption
} from "./AIPlanReviewTreeType"
import styles from "./AIPlanReviewTree.module.scss"
import {useControllableValue, useCreation, useDebounceFn, useMemoizedFn, useThrottleFn, useVirtualList} from "ahooks"
import {ExpandIcon, RetractIcon} from "./icon"
import classNames from "classnames"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePlussmIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {AIChatMessage, AITool, GetAIToolListRequest, GetAIToolListResponse} from "../type/aiChat"
import {yakitNotify} from "@/utils/notification"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {SolidAnnotationIcon, SolidToolIcon} from "@/assets/icon/solid"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {grpcGetAIToolList} from "../aiToolList/utils"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

const AIPlanReviewTree: React.FC<AIPlanReviewTreeProps> = React.memo((props) => {
    const {editable, planReviewTreeKeywordsMap, currentPlansId} = props
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
            isRemove: false,
            tools: [],
            description: ""
        }

        // 找到父任务的位置
        const parentPos = list.findIndex((task) => task.index === parentIndex)
        if (parentPos === -1) return

        const insertPos = parentPos + 1
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
     * 添加兄弟节点
     * @description 目前根节点不允许添加兄弟元素，前端逻辑已做，不删
     * */
    const onAddBrotherNode = useMemoizedFn((item: AIChatMessage.PlanTask) => {
        const siblingOfIndex = item.index

        const lastSiblingIndex = getLastSiblingIndex(list, siblingOfIndex)
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
            isRemove: false,
            tools: [],
            description: ""
        }

        const startIndex = list.findIndex((ele) => ele.index === siblingOfIndex)
        if (startIndex === -1) return
        const length = list.length
        let insertPos = startIndex
        for (let index = startIndex + 1; index < length; index++) {
            const current = list[index]
            if (parentIndex) {
                if (current.index.startsWith(siblingOfIndex)) continue
                insertPos = index
                break
            } else {
                // 当前添加的兄弟元素为根节点
                if (current.index.length === 1) {
                    insertPos = index
                    break
                }
            }
            insertPos = index + 1
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
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        const isVisible = entry.isIntersecting
                        if (!isVisible) {
                            dom.scrollIntoView()
                            setTimeout(() => {
                                const classString = styles["temp-highlight"]
                                dom.classList.add(classString)
                                setTimeout(() => {
                                    dom.classList.remove(classString)
                                }, 1000)
                            }, 200)
                        }
                    })
                    // 观察一次后立即断开连接
                    observer.disconnect()
                },
                {threshold: 0.01}
            )
            observer.observe(dom)
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
    const setItem = useMemoizedFn((item: AIChatMessage.PlanTask, option: SetItemOption) => {
        const {label, value} = option
        const newList = list.map((ele: AIChatMessage.PlanTask) => {
            if (ele.index === item.index) {
                ele = {
                    ...ele,
                    [label]: value
                }
            }
            return {...ele}
        })
        setList([...newList])
    })
    return (
        <div className={styles["ai-plan-review-tree"]}>
            {list.length > 0 ? (
                <>
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
                                    setItem={setItem}
                                    planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
                                    currentPlansId={currentPlansId}
                                />
                            </React.Fragment>
                        )
                    })}
                    <AIPlanReviewTreeArrowLine />
                </>
            ) : (
                <YakitEmpty />
            )}
        </div>
    )
})

export default AIPlanReviewTree

const AIPlanReviewTreeItem: React.FC<AIPlanReviewTreeItemProps> = React.memo((props) => {
    const {
        order,
        item,
        preIndex,
        nextIndex,
        editable,
        onAddSubNode,
        onAddBrotherNode,
        onRemoveNode,
        setItem,
        planReviewTreeKeywordsMap,
        currentPlansId
    } = props
    const [expand, setExpand] = useState<boolean>(true)
    const [visible, setVisible] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [open, setOpen] = useState<boolean>(false)
    const [response, setResponse] = useState<GetAIToolListResponse>({
        Tools: [],
        Pagination: genDefaultPagination(100),
        Total: 0
    }) // 只展示前100条数据+选中得数据
    const [isRef, setIsRef] = useState<boolean>(false)

    useEffect(() => {
        if (open) getToolList()
    }, [open])
    /**
     * 目前工具没有做新增功能，所以暂时显示得前100条，搜索功能使用得select默认搜索，没有调用接口；接口ToolName字段查询不是模糊搜索
     * TODO 工具新增功能后，需要修改此处搜索查询功能
     */
    const getToolList = useDebounceFn(
        useMemoizedFn(async (page?: number) => {
            setLoading(true)
            const newQuery: GetAIToolListRequest = {
                Query: "",
                ToolName: "",
                Pagination: {
                    ...genDefaultPagination(100),
                    OrderBy: "created_at",
                    Page: page || 1
                },
                OnlyFavorites: false
            }
            try {
                const res = await grpcGetAIToolList(newQuery)
                if (!res.Tools) res.Tools = []
                const newPage = +res.Pagination.Page
                const newRes: GetAIToolListResponse = {
                    Tools: newPage === 1 ? res?.Tools : [...response.Tools, ...(res?.Tools || [])],
                    Pagination: res?.Pagination || {
                        ...genDefaultPagination(20)
                    },
                    Total: res.Total
                }
                setResponse(newRes)
                if (newPage === 1) {
                    setIsRef(!isRef)
                }
            } catch (error) {}
            setTimeout(() => {
                setLoading(false)
            }, 300)
        }),
        {wait: 500}
    ).run
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
                if (item.index.length === 1) return
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
    const onSetName = useMemoizedFn((value: string) => {
        setItem(item, {label: "name", value})
    })
    const onSetGoal = useMemoizedFn((value: string) => {
        setItem(item, {label: "goal", value})
    })
    //#region 关联工具及其解释说明
    const extraInfo: AIChatMessage.PlanReviewRequireExtra | undefined = useCreation(() => {
        const info = planReviewTreeKeywordsMap.get(item.index)
        if (info?.plans_id === currentPlansId) {
            return info
        }
    }, [item.index, planReviewTreeKeywordsMap, currentPlansId])
    useEffect(() => {
        setItem(item, {label: "description", value: extraInfo?.description || ""})
    }, [extraInfo?.description])
    useEffect(() => {
        if (!item.tools.length) {
            onSetTool(extraInfo?.keywords || [])
        }
    }, [extraInfo?.keywords])
    const onSetTool = useMemoizedFn((value: string[]) => {
        setItem(item, {label: "tools", value})
    })
    const selectValue = useCreation(() => {
        if (item.tools && item.tools.length > 0) return item.tools
        return extraInfo?.keywords || []
    }, [item.tools, extraInfo?.keywords])

    const description = useCreation(() => {
        if (item?.description && item?.description?.length > 0) return item.description
        return extraInfo?.description || ""
    }, [item.description, extraInfo?.description])

    const showTool = useCreation(() => {
        return selectValue.length > 0 || (editable && !item?.isRemove)
    }, [editable, item?.isRemove, selectValue.length])
    //#endregion

    const treeItemMenuData = useCreation(() => {
        const menu = [
            {
                key: "sub",
                label: "添加子任务"
            }
        ]
        if (item.index.length > 1) {
            menu.push({
                key: "brother",
                label: "添加兄弟任务"
            })
        }
        return menu
    }, [item.index])
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
                    id={item.index}
                    className={classNames(styles["title"], {
                        [styles["title-editable"]]: editable && !item?.isRemove,
                        [styles["title-hover"]]: visible && !item?.isRemove,
                        [styles["title-remove"]]: item?.isRemove
                    })}
                    onClick={onExpand}
                >
                    <ContentEditableDiv
                        className={styles["title-name"]}
                        value={item.name}
                        editable={editable && !item?.isRemove}
                        setValue={onSetName}
                    />
                    <div className={styles["icon-body"]}>
                        {item.index.length > 1 && (
                            <YakitButton type='text2' icon={<OutlineTrashIcon />} onClick={onRemove} />
                        )}
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
                        <ContentEditableDiv value={item.goal} editable={editable} setValue={onSetGoal} />
                        {showTool && (
                            <div className={styles["related-tools"]}>
                                <div className={styles["related-tools-heard"]}>
                                    <SolidToolIcon />
                                    <span>关联工具</span>
                                </div>
                                <YakitSelect
                                    size='middle'
                                    value={selectValue}
                                    onChange={onSetTool}
                                    bordered={false}
                                    mode='tags'
                                    disabled={!editable || !!item?.isRemove}
                                    open={open}
                                    onDropdownVisibleChange={setOpen}
                                    notFoundContent={loading ? <YakitSpin size='small' /> : null}
                                >
                                    {response.Tools.map((item) => {
                                        return (
                                            <YakitSelect.Option value={item.Name} key={item.Name}>
                                                {item.Name}
                                            </YakitSelect.Option>
                                        )
                                    })}
                                </YakitSelect>
                            </div>
                        )}
                        {description && (
                            <div className={styles["description"]}>
                                <div className={styles["description-heard"]}>
                                    <SolidAnnotationIcon />
                                    <span>解释</span>
                                </div>
                                <div>{description}</div>
                            </div>
                        )}
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
    const onRowClick = useMemoizedFn((e) => {
        if (editable) e.stopPropagation()
    })
    return (
        <div
            className={classNames(className || "", {
                [styles["content-editable"]]: editable
            })}
            onClick={onRowClick}
            contentEditable={editable}
            onBlur={(e) => {
                setValue(e.target.innerText || "")
            }}
            dangerouslySetInnerHTML={{__html: value}}
            suppressContentEditableWarning={true}
            spellCheck={false}
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
