import React, {memo, ReactNode, useEffect, useMemo, useState} from "react"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {
    AIAgentChatStreamProps,
    AICardListProps,
    AIChatLeftSideProps,
    AIChatToolDrawerContentProps,
    ChatStreamCollapseItemProps,
    ChatStreamCollapseProps,
    ChatStreamContentProps
} from "../aiAgentType"
import {
    OutlineChevrondownIcon,
    OutlineChevronrightIcon,
    OutlineEngineIcon,
    OutlineRocketLaunchIcon
} from "@/assets/icon/outline"
import {formatNumberUnits, isShowToolColorCard} from "../utils"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    SolidCursorclickIcon,
    SolidHashtagIcon,
    SolidLightbulbIcon,
    SolidLightningboltIcon,
    SolidToolIcon
} from "@/assets/icon/solid"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {AITree} from "../aiTree/AITree"
import {AIEventQueryRequest, AIEventQueryResponse} from "../type/aiChat"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ContextPressureEcharts, ContextPressureEchartsProps, ResponseSpeedEcharts} from "./AIEcharts"
import {formatTime, formatTimestamp} from "@/utils/timeUtil"
import {AIChatToolColorCard, AIChatToolItem} from "./AIChatTool"
import {
    HorizontalScrollCardItemInfoMultiple,
    HorizontalScrollCardItemInfoSingle
} from "@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard"
import {grpcQueryAIEvent} from "../grpc"
import {Uint8ArrayToString} from "@/utils/str"
import {AIStreamNodeIdToLabel} from "@/pages/ai-re-act/hooks/defaultConstant"
import {v4 as uuidv4} from "uuid"
import {AIChatQSData} from "@/pages/ai-re-act/hooks/aiRender"

import classNames from "classnames"
import styles from "./AIAgentChatTemplate.module.scss"

/** @name chat-左侧侧边栏 */
export const AIChatLeftSide: React.FC<AIChatLeftSideProps> = memo((props) => {
    const {tasks, pressure, cost, card} = props

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
                    <AITree tasks={tasks} />
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
    const {tasks, streams, defaultExpand} = props

    // 任务集合
    const lists = useMemo(() => {
        return Object.keys(streams)
    }, [streams])

    // 生成任务展示名称
    const handleGenerateTaskName = useMemoizedFn((order: string) => {
        if (order === "system") return "系统输出"
        const task = tasks.find((item) => item.index === order)
        if (!task) return order
        return task.name
    })

    return (
        <div className={styles["ai-agent-chat-stream"]}>
            {lists.map((taskName) => {
                const headerTitle = handleGenerateTaskName(taskName)
                return (
                    <ChatStreamCollapse
                        key={taskName}
                        id={taskName}
                        title={headerTitle}
                        defaultExpand={defaultExpand ?? true}
                        className={classNames({
                            [styles["chat-stream-collapse-expand-first"]]: true // firstExpand
                        })}
                    >
                        {(streams[taskName] || []).map((info) => {
                            const {id, Timestamp, type, data} = info
                            switch (type) {
                                case "stream":
                                    const {NodeId, EventUUID, selectors} = data
                                    if (isShowToolColorCard(NodeId)) {
                                        return <AIChatToolColorCard key={id} toolCall={data} />
                                    }

                                    return (
                                        <ChatStreamCollapseItem
                                            key={id}
                                            info={data}
                                            expandKey={EventUUID}
                                            secondExpand={false}
                                            handleChangeSecondPanel={() => {}}
                                            defaultExpand={defaultExpand}
                                            timestamp={Timestamp}
                                        />
                                    )

                                case "tool_result":
                                    return <AIChatToolItem key={id} time={Timestamp} item={data} />

                                default:
                                    break
                            }
                        })}
                    </ChatStreamCollapse>
                )
            })}
        </div>
    )
})
const ChatStreamCollapseItem: React.FC<ChatStreamCollapseItemProps> = React.memo((props) => {
    const {expandKey, info, className, defaultExpand, timestamp} = props
    const {NodeId, NodeLabel, content} = info
    return (
        <ChatStreamCollapse
            key={expandKey}
            style={{marginBottom: 0}}
            defaultExpand={defaultExpand ?? true}
            title={
                <div className={styles["task-type-header"]}>
                    {taskAnswerToIconMap[NodeId] || <SolidLightningboltIcon />}
                    <div className={styles["task-type-header-title"]}>{NodeLabel}</div>
                    <div className={styles["task-type-header-time"]}>{formatTimestamp(timestamp)}</div>
                </div>
            }
            className={classNames(styles["chat-stream-collapse-expand"], className || "")}
        >
            <ChatStreamContent stream={content} />
        </ChatStreamCollapse>
    )
})

export const ChatStreamContent: React.FC<ChatStreamContentProps> = (props) => {
    const {stream} = props
    return <div className={styles["think-wrapper"]}>{stream || ""}</div>
}

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

export const AIChatToolDrawerContent: React.FC<AIChatToolDrawerContentProps> = memo((props) => {
    const {callToolId} = props
    const [secondExpand, setSecondExpand] = useState<string[]>([])
    const [toolList, setToolList] = useState<AIChatQSData[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    useEffect(() => {
        getList()
    }, [])

    const getList = useMemoizedFn(() => {
        if (!callToolId) return
        const params: AIEventQueryRequest = {
            ProcessID: callToolId
        }
        setLoading(true)
        grpcQueryAIEvent(params)
            .then((res: AIEventQueryResponse) => {
                const {Events} = res
                const list: AIChatQSData[] = []
                Events.filter((ele) => ele.Type === "stream").forEach((item) => {
                    const Timestamp = item.Timestamp
                    let ipcContent = ""
                    let ipcStreamDelta = ""
                    try {
                        ipcContent = Uint8ArrayToString(item.Content) || ""
                        ipcStreamDelta = Uint8ArrayToString(item.StreamDelta) || ""
                    } catch (error) {}
                    const current: AIChatQSData = {
                        id: uuidv4(),
                        type: "stream",
                        Timestamp: Timestamp,
                        data: {
                            NodeId: item.NodeId,
                            NodeLabel: AIStreamNodeIdToLabel[item.NodeId]?.label || "",
                            content: ipcContent + ipcStreamDelta,
                            EventUUID: item.EventUUID,
                            status: "end"
                        }
                    }
                    list.push(current)
                })
                setToolList(list)
                setSecondExpand(
                    list.map((ele) => {
                        if (ele.type === "stream" && ele.data) return ele.data.EventUUID
                        return ""
                    })
                )
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
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
            {loading ? (
                <YakitSpin />
            ) : (
                <>
                    {toolList.map((info) => {
                        const {id, Timestamp, type, data} = info
                        switch (type) {
                            case "stream":
                                const {EventUUID} = data
                                const expand = secondExpand.includes(EventUUID)
                                return (
                                    <ChatStreamCollapseItem
                                        key={id}
                                        expandKey={EventUUID}
                                        info={data}
                                        secondExpand={expand}
                                        handleChangeSecondPanel={handleChangeSecondPanel}
                                        className={classNames({
                                            [styles["ai-tool-collapse-expand"]]: expand
                                        })}
                                        timestamp={Timestamp}
                                    />
                                )
                            default:
                                break
                        }
                    })}
                </>
            )}
        </div>
    )
})
