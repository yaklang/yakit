import React, {memo, ReactNode, UIEventHandler, useEffect, useMemo, useRef, useState} from "react"
import {useControllableValue, useCreation, useInterval, useMemoizedFn, useThrottleEffect, useUpdateEffect} from "ahooks"
import {
    AIAgentChatBodyProps,
    AIAgentChatFooterProps,
    AIAgentChatReviewProps,
    AIAgentChatStreamProps,
    AICardListProps,
    AIChatLeftSideProps,
    AIChatLogsProps,
    AIChatToolDrawerContentProps,
    AIChatToolSync,
    AITabsEnumType,
    ChatStreamCollapseItemProps,
    ChatStreamCollapseProps
} from "../aiAgentType"
import {
    OutlineArrowrightIcon,
    OutlineChevrondoubledownIcon,
    OutlineChevrondoubleupIcon,
    OutlineChevrondownIcon,
    OutlineChevronrightIcon,
    OutlineCloseIcon,
    OutlineEngineIcon,
    OutlineHandIcon,
    OutlinePlusIcon,
    OutlinePositionIcon,
    OutlineRefreshIcon,
    OutlineRocketLaunchIcon,
    OutlineWarpIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {formatNumberUnits, isShowToolColorCard, isToolSummaryCard, reviewListToTrees} from "../utils"
// import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"
import {Input, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    SolidAnnotationIcon,
    SolidCursorclickIcon,
    SolidHashtagIcon,
    SolidLightbulbIcon,
    SolidLightningboltIcon,
    SolidStopIcon,
    SolidToolIcon,
    SolidVariableIcon
} from "@/assets/icon/solid"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {AITree} from "../aiTree/AITree"
import cloneDeep from "lodash/cloneDeep"
import {AIChatMessage, AIChatStreams, NoAIChatReviewSelector} from "../type/aiChat"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {handleFlatAITree} from "../useChatData"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ContextPressureEcharts, ContextPressureEchartsProps, ResponseSpeedEcharts} from "./AIEcharts"
import AIPlanReviewTree from "../aiPlanReviewTree/AIPlanReviewTree"
import {yakitNotify} from "@/utils/notification"
import {formatTime, formatTimestamp} from "@/utils/timeUtil"
import {QSInputTextarea} from "../template/template"

import classNames from "classnames"
import styles from "./AIAgentChatTemplate.module.scss"
import {AIChatToolColorCard, AIChatToolItem} from "./AIChatTool"
import emiter from "@/utils/eventBus/eventBus"
import {
    PluginExecuteHttpFlow,
    VulnerabilitiesRisksTable
} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import {apiQueryRisksTotalByRuntimeId} from "@/pages/risks/YakitRiskTable/utils"
import {YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"
import {
    HorizontalScrollCardItemInfoMultiple,
    HorizontalScrollCardItemInfoSingle
} from "@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard"
import {AITabs, AITabsEnum} from "../defaultConstant"
/** @name chat-左侧侧边栏 */
export const AIChatLeftSide: React.FC<AIChatLeftSideProps> = memo((props) => {
    const {tasks, pressure, cost, onLeafNodeClick, card} = props

    const [expand, setExpand] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "expand",
        trigger: "setExpand"
    })
    const handleCancelExpand = useMemoizedFn(() => {
        setExpand(false)
    })

    // 上下文压力集合
    const currentPressuresEcharts: ContextPressureEchartsProps["dataEcharts"] = useMemo(() => {
        const data: number[] = []
        const xAxis: string[] = []
        pressure.forEach((item) => {
            data.push(item.current_cost_token_size)
            xAxis.push(item.timestamp ? formatTime(item.timestamp) : "-")
        })
        return {data, xAxis}
    }, [pressure])
    // 最新的上下文压力
    const lastPressure = useMemo(() => {
        const length = currentPressuresEcharts.data.length
        if (length === 0) return 0
        return currentPressuresEcharts.data[length - 1] || 0
    }, [currentPressuresEcharts.data])
    // 上下文压力预设值
    const pressureThreshold = useMemo(() => {
        const length = pressure.length
        if (length === 0) return 0
        return pressure[length - 1].pressure_token_size || 0
    }, [pressure])

    // 首字符延迟集合
    const currentCostEcharts = useMemo(() => {
        const data: number[] = []
        const xAxis: string[] = []
        cost.forEach((item) => {
            data.push(item.ms)
            xAxis.push(item.timestamp ? formatTime(item.timestamp) : "-")
        })
        return {data, xAxis}
    }, [cost])
    // 最新的首字符延迟
    const lastFirstCost = useMemo(() => {
        const length = currentCostEcharts.data.length
        if (length === 0) return 0
        return currentCostEcharts.data[length - 1] || 0
    }, [currentCostEcharts])
    //#region 折叠面板
    const [expandKeys, setExpandKeys] = useState<string[]>(["Data Card", "上下文压力", "响应速度"])
    const collapseList = useCreation(() => {
        return [
            {
                value: "Data Card",
                header: (
                    <div className={styles["data-card-header"]}>
                        <div className={styles["header-title"]}>Data Card</div>
                        <div className={styles["total"]}>{card.length}</div>
                    </div>
                ),
                extra: <></>,
                content: <AICardList list={card} />
            },
            {
                value: "上下文压力",
                header: <div className={styles["header-title"]}>上下文压力</div>,
                extra: (
                    <div className={classNames(styles["tag-last"], styles["pressure-wrapper"])}>
                        <OutlineEngineIcon />
                        {formatNumberUnits(lastPressure)}
                    </div>
                ),
                content: (
                    <>
                        {currentPressuresEcharts?.data?.length > 0 && (
                            <ContextPressureEcharts
                                dataEcharts={currentPressuresEcharts}
                                threshold={pressureThreshold}
                            />
                        )}
                    </>
                )
            },
            {
                value: "响应速度",
                header: <div className={styles["header-title"]}>响应速度</div>,
                extra: (
                    <div className={classNames(styles["tag-last"], styles["cost-wrapper"])}>
                        <OutlineRocketLaunchIcon />
                        {`${lastFirstCost < 0 ? "-" : lastFirstCost}ms`}
                    </div>
                ),
                content: (
                    <>
                        {currentCostEcharts?.data?.length > 0 && (
                            <ResponseSpeedEcharts dataEcharts={currentCostEcharts} />
                        )}
                    </>
                )
            }
        ]
    }, [card, currentPressuresEcharts, pressureThreshold, currentCostEcharts, lastFirstCost, lastPressure])
    const handleChangePanel = useMemoizedFn((expand: boolean, key: string) => {
        setExpandKeys((old) => {
            if (expand) {
                return old.concat([key])
            } else {
                return old.filter((item) => item !== key)
            }
        })
    })
    //#endregion
    return (
        <div className={classNames(styles["ai-chat-left-side"], {[styles["ai-chat-left-side-hidden"]]: !expand})}>
            <div className={styles["side-header"]}>
                <YakitButton
                    type='outline2'
                    className={styles["side-header-btn"]}
                    icon={<OutlineChevronrightIcon />}
                    onClick={handleCancelExpand}
                    size='small'
                />
                <div className={styles["header-title"]}>
                    任务列表
                    <YakitRoundCornerTag>{tasks.length}</YakitRoundCornerTag>
                </div>
            </div>

            <div className={styles["task-list"]}>
                {tasks.length > 0 ? (
                    <AITree tasks={tasks} onNodeClick={onLeafNodeClick} />
                ) : (
                    <YakitEmpty style={{marginTop: "20%"}} title='思考中...' description='' />
                )}
            </div>

            <div className={styles["task-token"]}>
                {collapseList.map((item) => {
                    const expandKey = expandKeys.includes(item.value)
                    return (
                        <ChatStreamCollapse
                            key={item.value}
                            style={{marginBottom: 0}}
                            expand={expandKey}
                            onChange={(value) => handleChangePanel(value, item.value)}
                            title={item.header}
                            className={classNames(styles["chat-left-side-collapse"])}
                        >
                            {item.content}
                        </ChatStreamCollapse>
                    )
                })}
            </div>
        </div>
    )
})

const AICardList: React.FC<AICardListProps> = React.memo((props) => {
    const {list} = props
    return (
        <div className={styles["ai-card-list"]}>
            {list.map((cardItem) => (
                <React.Fragment key={cardItem.tag}>
                    {cardItem.info.length > 1 ? (
                        <HorizontalScrollCardItemInfoMultiple {...cardItem} />
                    ) : (
                        <HorizontalScrollCardItemInfoSingle
                            tag={cardItem.tag}
                            item={(cardItem.info || [])[0]}
                            compact={true}
                            className={styles["ai-card-list-single"]}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    )
})

/** @name 对话框内容 */
export const AIAgentChatBody: React.FC<AIAgentChatBodyProps> = memo((props) => {
    const {info, consumption, coordinatorId, ...rest} = props

    //#region AI tab 相关逻辑
    const [activeKey, setActiveKey] = useState<AITabsEnumType>(AITabsEnum.Task_Content)
    const [allTotal, setAllTotal] = useState<number>(0)
    const [tempTotal, setTempTotal] = useState<number>(0) // 在risk表没有展示之前得临时显示在tab上得小红点计数
    const [interval, setInterval] = useState<number | undefined>(undefined)
    useEffect(() => {
        if (coordinatorId) {
            setInterval(1000)
        } else {
            setAllTotal(0)
            setTempTotal(0)
            setActiveKey(AITabsEnum.Task_Content)
        }
    }, [coordinatorId])
    useInterval(() => {
        getTotal()
    }, interval)
    const getTotal = useMemoizedFn(() => {
        if (!coordinatorId) return
        apiQueryRisksTotalByRuntimeId(coordinatorId).then((allRes) => {
            if (+allRes.Total > 0) {
                setTempTotal(+allRes.Total)
            }
        })
    })
    const onSetRiskTotal = useMemoizedFn((total) => {
        if (total > 0) {
            setAllTotal(total)
            if (interval) setInterval(undefined)
        }
    })
    const renderTabContent = useMemoizedFn((key: AITabsEnumType) => {
        switch (key) {
            case AITabsEnum.Task_Content:
                return <AIAgentChatStream {...rest} />
            case AITabsEnum.Risk:
                return !!coordinatorId ? (
                    <VulnerabilitiesRisksTable
                        runtimeId={coordinatorId}
                        allTotal={allTotal}
                        setAllTotal={onSetRiskTotal}
                    />
                ) : (
                    <>
                        <YakitEmpty />
                    </>
                )
            case AITabsEnum.HTTP:
                return !!coordinatorId ? (
                    <PluginExecuteHttpFlow runtimeId={coordinatorId} website={false} />
                ) : (
                    <>
                        <YakitEmpty />
                    </>
                )
            default:
                return <></>
        }
    })
    const showRiskTotal = useCreation(() => {
        if (allTotal > 0) return allTotal
        return tempTotal
    }, [allTotal, tempTotal])
    const tabBarRender = useMemoizedFn((tab: YakitTabsProps, length: number) => {
        if (tab.value === AITabsEnum.Risk) {
            return (
                <>
                    {tab.label}
                    {showRiskTotal ? <span className={styles["ai-tabBar"]}>{length}</span> : ""}
                </>
            )
        }

        return tab.label
    })
    const yakitTabs = useCreation(() => {
        let tab = [...AITabs]
        if (!tempTotal) {
            tab = AITabs.filter((ele) => ele.value !== AITabsEnum.Risk)
        }
        return tab
    }, [tempTotal])
    //#endregion
    return (
        <div className={styles["ai-agent-chat-body"]}>
            <div className={styles["body-content"]}>
                <YakitSideTab
                    type='horizontal'
                    yakitTabs={yakitTabs}
                    activeKey={activeKey}
                    onActiveKey={(v) => setActiveKey(v as AITabsEnumType)}
                    onTabPaneRender={(ele) => tabBarRender(ele, showRiskTotal)}
                >
                    <div className={styles["tab-content"]}>{renderTabContent(activeKey)}</div>
                </YakitSideTab>
            </div>
        </div>
    )
})

/** @name 任务回答类型对应图标 */
const taskAnswerToIconMap: Record<string, ReactNode> = {
    plan: <SolidLightbulbIcon />,
    execute: <SolidLightningboltIcon />,
    summary: <SolidHashtagIcon />,
    "call-tools": <SolidToolIcon />,
    decision: <SolidCursorclickIcon />
}
/** @name chat-信息流展示 */
export const AIAgentChatStream: React.FC<AIAgentChatStreamProps> = memo((props) => {
    const {scrollToTask, setScrollToTask, tasks, activeStream, streams, defaultExpand} = props

    // const activeFirstTabKey = useMemo(() => {
    //     if (!activeStream || activeStream.length === 0) return []
    //     return [
    //         ...new Set(
    //             activeStream.map((item) => {
    //                 return (item || "").split("|")[0]
    //             })
    //         )
    //     ]
    // }, [activeStream])
    // const activeSecondTabKey = useMemo(() => {
    //     if (!activeStream || activeStream.length === 0) return []
    //     return activeStream.map((item) => {
    //         const first = (item || "").split("|")[0] || ""
    //         const second = (item || "").split("|")[1] || ""
    //         return `${first}-${second}`
    //     })
    // }, [activeStream])

    // 任务集合
    const lists = useMemo(() => {
        return Object.keys(streams)
    }, [streams])

    const [isStopScroll, setIsStopScroll] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "isStopScroll",
        trigger: "setIsStopScroll"
    })

    const wrapper = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (isStopScroll) return
        // if (wrapper.current) {
        //     const {scrollHeight} = wrapper.current
        //     const {height} = wrapper.current.getBoundingClientRect()
        //     if (height < scrollHeight) {
        //         if (!isScrollTo.current) return
        //         wrapper.current.scrollTop = scrollHeight
        //     }
        // }
    }, [streams, isStopScroll])
    const handleWrapperScroll: UIEventHandler<HTMLDivElement> = useMemoizedFn((e) => {
        // if (wrapper.current) {
        //     const {scrollHeight, scrollTop} = wrapper.current
        //     const {height} = wrapper.current.getBoundingClientRect()
        //     const offset = scrollHeight - scrollTop - height
        //     if (offset > 20) setIsStopScroll(true)
        // }
    })

    // 生成任务展示名称
    const handleGenerateTaskName = useMemoizedFn((order: string) => {
        if (order === "system") return "系统输出"
        const task = tasks.find((item) => item.index === order)
        if (!task) return order
        return task.name
    })

    const isScrollTo = useRef(true)
    useUpdateEffect(() => {
        isScrollTo.current = !scrollToTask
        if (!scrollToTask) {
            setClickFirstPanel([])
            setClickSecondPanel([])
        }
    }, [scrollToTask])

    const [clickFirstPanel, setClickFirstPanel] = useState<string[]>([])
    // 关闭一级容器，自动关闭该一级下的二级容器
    // const handleChangeFirstPanel = useMemoizedFn((expand: boolean, order: string) => {
    //     setClickFirstPanel((old) => {
    //         if (expand) {
    //             if (old.includes(order)) {
    //                 return cloneDeep(old)
    //             } else {
    //                 return old.concat([order])
    //             }
    //         } else {
    //             if (!old.includes(order)) {
    //                 return cloneDeep(old)
    //             } else {
    //                 return old.filter((item) => item !== order)
    //             }
    //         }
    //     })
    //     if (!expand) {
    //         if (order === scrollToTask?.index && setScrollToTask) setScrollToTask(undefined)
    //         setClickSecondPanel((old) => {
    //             return old.filter((item) => !item.startsWith(order))
    //         })
    //     }
    // })
    // const activeFirstPanel = useMemo(() => {
    //     let active: string[] = []
    //     if (scrollToTask) {
    //         active.push(scrollToTask.index)
    //         setTimeout(() => {
    //             document.getElementById(scrollToTask.index)?.scrollIntoView()
    //         }, 100)
    //     }
    //     if (lists.length === 1) return [lists[0]]
    //     if (activeFirstTabKey.length > 0) {
    //         active = active.concat(activeFirstTabKey)
    //     }
    //     return active.concat(clickFirstPanel.filter((item) => !active.includes(item)))
    // }, [lists, scrollToTask, activeFirstTabKey, clickFirstPanel])

    const [clickSecondPanel, setClickSecondPanel] = useState<string[]>([])
    // const handleChangeSecondPanel = useMemoizedFn((expand: boolean, order: string) => {
    //     setClickFirstPanel((old) => {
    //         const first = order.split("-")[0]
    //         if (expand) {
    //             if (old.includes(first)) {
    //                 return old
    //             } else {
    //                 return old.concat([first])
    //             }
    //         } else {
    //             if (!old.includes(first)) {
    //                 return old
    //             } else {
    //                 return old.filter((item) => item !== first)
    //             }
    //         }
    //     })
    //     setClickSecondPanel((old) => {
    //         if (expand) {
    //             if (old.includes(order)) {
    //                 return old
    //             } else {
    //                 return old.concat([order])
    //             }
    //         } else {
    //             if (!old.includes(order)) {
    //                 return old
    //             } else {
    //                 return old.filter((item) => item !== order)
    //             }
    //         }
    //     })
    // })
    // const activeSecondPanel = useMemo(() => {
    //     let active: string[] = []
    //     scrollToTask && active.push(scrollToTask.index)
    //     if (activeSecondTabKey.length > 0) {
    //         active = active.concat(activeSecondTabKey)
    //     }
    //     return active.concat(clickSecondPanel.filter((item) => !active.includes(item)))
    // }, [activeSecondTabKey, clickSecondPanel])

    return (
        <div ref={wrapper} className={styles["ai-agent-chat-stream"]} onScroll={handleWrapperScroll}>
            {lists.map((taskName) => {
                const headerTitle = handleGenerateTaskName(taskName)
                // const firstExpand = activeFirstPanel.includes(taskName)
                return (
                    <ChatStreamCollapse
                        key={taskName}
                        id={taskName}
                        title={headerTitle}
                        defaultExpand={defaultExpand ?? true}
                        // expand={firstExpand}
                        // onChange={(value) => handleChangeFirstPanel(value, taskName)}
                        className={classNames({
                            [styles["chat-stream-collapse-expand-first"]]: true // firstExpand
                        })}
                    >
                        {(streams[taskName] || []).map((info: AIChatStreams, index) => {
                            const {nodeId, timestamp, toolAggregation} = info
                            const key = `${taskName}-${nodeId}-${timestamp}`
                            // const secondExpand = activeSecondPanel.includes(key)
                            if (isShowToolColorCard(nodeId)) {
                                return <AIChatToolColorCard key={key} toolCall={info} />
                            }
                            if (isToolSummaryCard(nodeId) && toolAggregation) {
                                return <AIChatToolItem key={key} item={toolAggregation} />
                            }
                            return (
                                <ChatStreamCollapseItem
                                    key={key}
                                    info={info}
                                    expandKey={key}
                                    secondExpand={false}
                                    handleChangeSecondPanel={() => {}}
                                    defaultExpand={defaultExpand}
                                />
                            )
                        })}
                    </ChatStreamCollapse>
                )
            })}
        </div>
    )
})
const ChatStreamCollapseItem: React.FC<ChatStreamCollapseItemProps> = React.memo((props) => {
    const {expandKey, info, secondExpand, handleChangeSecondPanel, className, defaultExpand} = props
    const {nodeId, timestamp, data} = info
    return (
        <ChatStreamCollapse
            key={expandKey}
            style={{marginBottom: 0}}
            defaultExpand={defaultExpand ?? true}
            // expand={secondExpand}
            // onChange={(value) => handleChangeSecondPanel(value, expandKey)}
            title={
                <div className={styles["task-type-header"]}>
                    {taskAnswerToIconMap[nodeId] || <SolidLightningboltIcon />}
                    <div className={styles["task-type-header-title"]}>{nodeId}</div>
                    <div className={styles["task-type-header-time"]}>{formatTimestamp(timestamp)}</div>
                </div>
            }
            className={classNames(styles["chat-stream-collapse-expand"], className || "")}
        >
            {(data.reason || data.system || data.stream) && (
                <div className={styles["think-wrapper"]}>
                    {data.reason && <div>{data.reason}</div>}

                    {data.system && <div>{data.system}</div>}

                    {data.stream && <div>{data.stream}</div>}
                </div>
            )}

            {/* {data.stream && (
                <div className={styles["anwser-wrapper"]}>
                    <React.Fragment>
                        <ChatMarkdown content={data.stream} skipHtml={true} />
                    </React.Fragment>
                </div>
            )} */}
        </ChatStreamCollapse>
    )
})

/** @name 回答信息折叠组件 */
export const ChatStreamCollapse: React.FC<ChatStreamCollapseProps> = memo((props) => {
    const {id, className, style, title, headerExtra, children} = props

    const [expand, setExpand] = useControllableValue<boolean>(props, {
        defaultValuePropName: "defaultExpand",
        valuePropName: "expand"
    })

    return (
        <div id={id} className={classNames(className, styles["chat-stream-collapse"])} style={style}>
            <div className={styles["collapse-header"]}>
                <div className={styles["header-body"]} onClick={() => setExpand(!expand)}>
                    <div className={classNames(styles["expand-icon"], {[styles["no-expand-icon"]]: !expand})}>
                        <OutlineChevrondownIcon />
                    </div>
                    <div className={styles["header-title"]}>{title}</div>
                </div>

                {<div className={styles["header-extra"]}>{headerExtra || null}</div>}
            </div>

            <div className={classNames(styles["collapse-body"], {[styles["collapse-body-hidden"]]: !expand})}>
                <div className={styles["collapse-panel"]}>{children}</div>
            </div>
        </div>
    )
})

/** @name 对话框内容 */
export const AIAgentChatFooter: React.FC<AIAgentChatFooterProps> = memo((props) => {
    const {execute, review, positon, showReExe, onStop, onPositon, onReExe, onNewChat} = props

    return (
        <div className={styles["ai-agent-chat-footer"]}>
            <div className={styles["footer-btns"]}>
                <div className={styles["btns-group"]}>
                    {execute && (
                        <>
                            <Tooltip title='中止' overlayStyle={{paddingBottom: 3}}>
                                <YakitButton
                                    className={styles["rounded-icon-btn"]}
                                    colors='danger'
                                    icon={<SolidStopIcon className={styles["stop-icon"]} />}
                                    onClick={onStop}
                                />
                            </Tooltip>
                            {positon && !review && (
                                <Tooltip title='快速定位' overlayStyle={{paddingBottom: 3}}>
                                    <YakitButton
                                        className={styles["rounded-icon-btn"]}
                                        type='outline2'
                                        icon={<OutlinePositionIcon />}
                                        onClick={onPositon}
                                    />
                                </Tooltip>
                            )}
                        </>
                    )}

                    {!execute && (
                        <>
                            {!!showReExe && (
                                <YakitButton
                                    className={styles["rounded-text-icon-btn"]}
                                    icon={<OutlineRefreshIcon />}
                                    type='secondary2'
                                    onClick={onReExe}
                                >
                                    重新执行
                                </YakitButton>
                            )}
                            <YakitButton
                                className={styles["rounded-text-icon-btn"]}
                                icon={<OutlinePlusIcon />}
                                onClick={onNewChat}
                            >
                                新开对话
                            </YakitButton>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
})

/** @name 审阅内容 */
export const AIAgentChatReview: React.FC<AIAgentChatReviewProps> = memo((props) => {
    const {delayLoading, review, onSend, onSendAIRequire, planReviewTreeKeywordsMap} = props

    const [expand, setExpand] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "expand",
        trigger: "setExpand"
    })

    const [reviewTreeOption, setReviewTreeOption] = useState<AIChatMessage.ReviewSelector>()
    const [reviewTrees, setReviewTrees] = useState<AIChatMessage.PlanTask[]>([])
    const [currentPlansId, setCurrentPlansId] = useState<string>("")
    const initReviewTreesRef = useRef<AIChatMessage.PlanTask[]>([])

    useEffect(() => {
        if (review.type === "plan_review_require") {
            const data = review.data as AIChatMessage.PlanReviewRequire
            const list: AIChatMessage.PlanTask[] = []
            handleFlatAITree(list, data.plans.root_task)
            initReviewTreesRef.current = [...list]
            setReviewTrees(list)
            setCurrentPlansId(data.plans_id)
        }
    }, [review])

    const handleExpand = useMemoizedFn(() => {
        setExpand((old) => !old)
    })

    /** review-UI 的 装修类 */
    const wrapperClassName = useMemo(() => {
        const {type} = review

        if (type === "plan_review_require") {
            return styles["plan-review-wrapper"]
        }
        if (type === "task_review_require") {
            return styles["task-review-wrapper"]
        }
        if (type === "tool_use_review_require") {
            return styles["tool-review-wrapper"]
        }
        if (type === "require_user_interactive") {
            return styles["ai-require-review-wrapper"]
        }

        return ""
    }, [review])

    const reviewTitle = useMemo(() => {
        const {type} = review || {}

        if (type === "plan_review_require") {
            return {title: "计划审阅", subTitle: "请审核是否要按以下计划继续执行？"}
        }
        if (type === "task_review_require") {
            return {title: "任务审阅", subTitle: "请审核是否要继续执行任务？ƒ"}
        }
        if (type === "tool_use_review_require") {
            return {title: "工具审阅", subTitle: "请审核是否要继续执行？"}
        }
        if (type === "require_user_interactive") {
            return {title: "主动询问", subTitle: "请选择以下决策？"}
        }

        return {}
    }, [review])

    // 是否显示继续执行按钮
    const isContinue = useMemo(() => {
        if (delayLoading) return false
        if (review.type === "require_user_interactive") return false

        if (!review.data) return
        const {selectors} = review.data as NoAIChatReviewSelector
        if (!selectors || !Array.isArray(selectors) || selectors.length === 0) return false

        const findIndex = (review.data as NoAIChatReviewSelector).selectors.findIndex(
            (item) => item.value === "continue"
        )
        return findIndex !== -1
    }, [delayLoading, review])

    const planReview = useMemo(() => {
        if (reviewTrees.length > 0) {
            const list = !!reviewTreeOption ? reviewTrees : initReviewTreesRef.current
            return (
                <AIPlanReviewTree
                    defaultList={initReviewTreesRef.current}
                    list={list}
                    setList={setReviewTrees}
                    editable={!!reviewTreeOption}
                    planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
                    currentPlansId={currentPlansId}
                />
            )
        }
        return null
    }, [reviewTrees, reviewTreeOption, planReviewTreeKeywordsMap, currentPlansId])

    const taskReview = useMemo(() => {
        if (review.type === "task_review_require") {
            const data = review.data as AIChatMessage.TaskReviewRequire
            const {task, short_summary, long_summary} = data
            return (
                <div className={styles["review-task-tool-data"]}>
                    <div className={styles["task-tool-info"]}>
                        <div className={styles["info-title"]}>{task?.name || ""}</div>
                        <div className={styles["info-description"]}>{task?.goal || ""}</div>
                    </div>

                    <div className={styles["task-summary"]}>
                        <div className={styles["summary-header"]}>
                            <SolidAnnotationIcon /> Summary
                        </div>
                        <div className={styles["summary-content"]}>{short_summary}</div>
                        <div className={styles["summary-detail"]}>
                            <YakitPopover
                                overlayStyle={{paddingBottom: 4}}
                                overlayClassName={styles["task-review-summary-popover"]}
                                content={
                                    <div className={styles["task-long-summary"]}>
                                        <div className={styles["summary-header"]}>
                                            <SolidAnnotationIcon /> Summary
                                        </div>
                                        <div className={styles["summary-content"]}>{long_summary}</div>
                                    </div>
                                }
                            >
                                <div className={styles["detail-style"]}>详细信息</div>
                            </YakitPopover>
                        </div>
                    </div>
                </div>
            )
        }
        return null
    }, [review])
    const toolReview = useMemo(() => {
        if (review.type === "tool_use_review_require") {
            const data = review.data as AIChatMessage.ToolUseReviewRequire
            const {tool, tool_description, params} = data

            let paramsValue = "-"
            try {
                paramsValue = !!params ? JSON.stringify(params, null, 2) : "-"
            } catch (error) {}

            return (
                <div className={styles["review-task-tool-data"]}>
                    <div className={styles["task-tool-info"]}>
                        <div className={styles["info-title"]}>{tool || "-"}</div>
                        <div className={styles["info-description"]}>{tool_description || "-"}</div>
                    </div>

                    <div className={styles["tool-params"]}>
                        <div className={styles["params-title"]}>
                            <SolidVariableIcon /> 参数
                        </div>
                        <div className={styles["params-content"]}>{paramsValue}</div>
                    </div>
                </div>
            )
        }
        return null
    }, [review])
    const aiRequireReview = useMemo(() => {
        if (review.type === "require_user_interactive") {
            const data = review.data as AIChatMessage.AIReviewRequire
            const {prompt} = data
            return <div className={styles["ai-require-ask"]}>{prompt}</div>
        }
        return null
    }, [review])

    // #region 审阅选项-plan|task|tool相关逻辑
    const [editShow, setEditShow] = useState(false)
    const editInfo = useRef<AIChatMessage.ReviewSelector>()
    const [reviewQS, setReviewQS] = useState("")

    const handleShowEdit = useMemoizedFn((info: AIChatMessage.ReviewSelector) => {
        switch (info.value) {
            case "freedom-review":
                setReviewTreeOption(info)
                break
            default:
                if (editShow) return
                if (!info.allow_extra_prompt) {
                    onSend(info)
                    return
                }
                editInfo.current = cloneDeep(info)
                setEditShow(true)
                break
        }
    })
    const handleCallbackEdit = useMemoizedFn((cb: boolean) => {
        if (cb && editInfo.current) {
            onSend(editInfo.current, reviewQS)
        }
        editInfo.current = undefined
        setReviewQS("")
        setEditShow(false)
    })

    /** 继续执行 */
    const handleContinue = useMemoizedFn(() => {
        if (delayLoading) return
        if (!isContinue) return
        if (review.type === "require_user_interactive") return
        const find = ((review.data as NoAIChatReviewSelector)?.selectors || []).find(
            (item) => item.value === "continue"
        )
        if (!find) return

        onSend(find)
    })

    const noAIOptions = useMemo(() => {
        if (!["plan_review_require", "tool_use_review_require", "task_review_require"].includes(review?.type || "")) {
            return null
        }

        const {data} = review
        const {selectors} = data as NoAIChatReviewSelector
        const showList = (selectors || []).filter((item) => item.value !== "continue")

        return (
            <div className={styles["review-selectors-wrapper"]}>
                {showList.map((el) => {
                    return (
                        <YakitButton key={el.value} type='outline2' onClick={() => handleShowEdit(el)}>
                            {el.prompt || el.value}
                        </YakitButton>
                    )
                })}
            </div>
        )
    }, [review])
    // #endregion

    // #region 审阅选项-AI交互用户相关逻辑
    const [requireLoading, setRequireLoading] = useState(false)
    const [requireQS, setRequireQS] = useState("")
    const isRequireQS = useMemo(() => {
        return !!(requireQS && requireQS.trim())
    }, [requireQS])

    const handleSubmit = useMemoizedFn(() => {
        if (!!reviewTreeOption) {
            const tree = reviewListToTrees(reviewTrees)
            const jsonInput = {
                suggestion: reviewTreeOption.value,
                "reviewed-task-tree": tree[0]
            }
            onSendAIRequire(JSON.stringify(jsonInput))
        }
    })

    const handleAIRequireQSSend = useMemoizedFn(() => {
        if (!isRequireQS) {
            yakitNotify("error", "请输入一些细节信息")
            return
        }
        setRequireLoading(false)
        onSendAIRequire(requireQS)
        setTimeout(() => {
            setRequireLoading(false)
            setRequireQS("")
        }, 300)
    })

    const handleAIRequireOpSend = useMemoizedFn((info: AIChatMessage.AIRequireOption) => {
        const jsonInput: Record<string, string> = {suggestion: info.prompt || info.prompt_title}
        onSendAIRequire(JSON.stringify(jsonInput))
    })

    const aiOptionsLength = useMemo(() => {
        if (review?.type !== "require_user_interactive") return 0

        try {
            const {data} = review
            const {options} = data as AIChatMessage.AIReviewRequire
            if (!options || options.length === 0) return 0
            return options.length
        } catch (error) {
            return 0
        }
    }, [review])
    const aiOptions = useMemo(() => {
        if (review?.type !== "require_user_interactive") {
            return null
        }

        const {data} = review
        const {options} = data as AIChatMessage.AIReviewRequire

        if (!options || options.length === 0)
            return (
                <div className={styles["ai-require-input"]}>
                    <QSInputTextarea
                        className={styles["textarea-style"]}
                        placeholder='请告诉我更多信息...'
                        value={requireQS}
                        onChange={(e) => setRequireQS(e.target.value)}
                    />
                </div>
            )

        return (
            <>
                {(options || []).map((el) => {
                    if (!el.prompt && !el.prompt_title) return null
                    return (
                        <YakitButton key={el.prompt} type='outline2' onClick={() => handleAIRequireOpSend(el)}>
                            {el.prompt || el.prompt_title}
                        </YakitButton>
                    )
                })}
            </>
        )
    }, [review, requireQS])
    // #endregion
    return (
        <div className={classNames(styles["ai-agent-chat-review"], wrapperClassName)}>
            <div className={classNames(styles["review-content"], {[styles["review-content-hidden"]]: !expand})}>
                <div className={styles["review-header"]}>
                    <OutlineHandIcon />
                    <div className={styles["title-style"]}>{reviewTitle.title || "异常错误"}</div>
                    <div className={styles["sub-title-style"]}>{reviewTitle.subTitle || ""}</div>
                </div>

                <div className={styles["review-container"]}>
                    {delayLoading ? (
                        <div className={styles["review-delay-loading"]}>
                            <YakitSpin wrapperClassName={styles["spin-wrapper"]} spinning={true} tip='加载中...' />
                        </div>
                    ) : (
                        <>
                            <div className={styles["review-data"]}>
                                {planReview}
                                {taskReview}
                                {toolReview}
                                {aiRequireReview}
                            </div>
                            {!reviewTreeOption && (
                                <div className={styles["reivew-options"]}>
                                    {aiOptions}
                                    {!!noAIOptions &&
                                        (editShow ? (
                                            <div className={styles["review-input"]}>
                                                <Input.TextArea
                                                    bordered={false}
                                                    placeholder={editInfo.current?.prompt || "请输入..."}
                                                    value={reviewQS}
                                                    autoSize={{minRows: 4, maxRows: 4}}
                                                    onChange={(e) => setReviewQS(e.target.value)}
                                                />

                                                <div className={styles["question-footer"]}>
                                                    <div></div>
                                                    <div className={styles["extra-btns"]}>
                                                        <YakitButton
                                                            className={styles["btn-style"]}
                                                            type='outline2'
                                                            icon={<OutlineXIcon />}
                                                            onClick={() => handleCallbackEdit(false)}
                                                        />
                                                        <YakitButton
                                                            className={styles["btn-style"]}
                                                            icon={<OutlineArrowrightIcon />}
                                                            onClick={() => handleCallbackEdit(true)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            noAIOptions
                                        ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className={styles["review-footer"]}>
                <div className={styles["btn-group"]}>
                    <YakitButton
                        type='text2'
                        icon={expand ? <OutlineChevrondoubledownIcon /> : <OutlineChevrondoubleupIcon />}
                        onClick={handleExpand}
                    >
                        {expand ? "隐藏，稍后审阅" : "展开审阅信息"}
                    </YakitButton>
                </div>

                <div className={styles["btn-group"]}>
                    {isContinue && (
                        <>
                            {!!reviewTreeOption ? (
                                <>
                                    <YakitButton type='outline2' onClick={() => setReviewTreeOption(undefined)}>
                                        取消
                                    </YakitButton>
                                    <YakitButton type='primary' onClick={handleSubmit}>
                                        提交
                                    </YakitButton>
                                </>
                            ) : (
                                <>
                                    <YakitButton onClick={handleContinue}>
                                        继续执行
                                        <OutlineWarpIcon />
                                    </YakitButton>
                                </>
                            )}
                        </>
                    )}
                    {review.type === "require_user_interactive" && !aiOptionsLength && (
                        <YakitButton disabled={!isRequireQS} loading={requireLoading} onClick={handleAIRequireQSSend}>
                            提交
                        </YakitButton>
                    )}
                </div>
            </div>
        </div>
    )
})

/** chat-日志 */
export const AIChatLogs: React.FC<AIChatLogsProps> = memo((props) => {
    const {logs, onClose} = props

    const wrapper = useRef<HTMLDivElement>(null)

    useThrottleEffect(
        () => {
            requestAnimationFrame(() => {
                if (wrapper.current) {
                    const {scrollHeight} = wrapper.current
                    const {height} = wrapper.current.getBoundingClientRect()
                    if (height < scrollHeight) {
                        wrapper.current.scrollTop = scrollHeight
                    }
                }
            })
        },
        [logs],
        {wait: 300, leading: false}
    )

    return (
        <div className={styles["ai-chat-logs"]}>
            <div className={styles["logs-header"]}>
                <div className={styles["header-title"]}>日志</div>

                <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onClose} />
            </div>

            <div ref={wrapper} className={styles["logs-content"]}>
                {logs.map((item, index) => {
                    const {level, message} = item
                    return (
                        <div
                            key={index}
                            className={classNames(styles["log-item"], {
                                [styles["warning-log"]]: level === "warning",
                                [styles["error-log"]]: level === "error"
                            })}
                        >
                            • {message}
                        </div>
                    )
                })}
            </div>
        </div>
    )
})

export const AIChatToolDrawerContent: React.FC<AIChatToolDrawerContentProps> = memo((props) => {
    const {syncId} = props
    const [secondExpand, setSecondExpand] = useState<string[]>([])
    const [toolList, setToolList] = useState<AIChatStreams[]>([])

    useEffect(() => {
        emiter.on("onTooCardDetails", onTooCardDetails)
        return () => {
            emiter.off("onTooCardDetails", onTooCardDetails)
        }
    }, [])

    const onTooCardDetails = useMemoizedFn((res) => {
        try {
            const data: AIChatToolSync = JSON.parse(res)
            if (data.syncId !== syncId) return
            const {info} = data
            setToolList((prev) => [...prev, info])
            setSecondExpand((preV) => {
                return [...preV, `${info.nodeId}-${info.timestamp}`]
            })
        } catch (error) {}
    })
    const handleChangeSecondPanel = useMemoizedFn((expand: boolean, expandKey: string) => {
        setSecondExpand((preV) => {
            if (expand) {
                return [...preV, expandKey]
            } else {
                return preV.filter((item) => item !== expandKey)
            }
        })
    })
    return (
        <div className={styles["ai-chat-tool-drawer-content"]}>
            {toolList.map((info: AIChatStreams) => {
                const {nodeId, timestamp} = info
                const key = `${nodeId}-${timestamp}`
                const expand = secondExpand.includes(key)
                return (
                    <ChatStreamCollapseItem
                        key={key}
                        expandKey={key}
                        info={info}
                        secondExpand={expand}
                        handleChangeSecondPanel={handleChangeSecondPanel}
                        className={classNames({
                            [styles["ai-tool-collapse-expand"]]: expand
                        })}
                    />
                )
            })}
        </div>
    )
})
