import React, {memo, ReactNode, useEffect, useMemo, useRef, useState} from "react"
import {useControllableValue, useMemoizedFn, useUpdateEffect} from "ahooks"
import {
    AIAgentChatBodyProps,
    AIAgentChatFooterProps,
    AIAgentChatReviewProps,
    AIAgentChatStreamProps,
    AIAgentChatTextareaProps,
    AIAgentEmptyProps,
    AIChatLeftSideProps,
    AIChatLogsProps,
    ChatStreamCollapseProps
} from "../aiAgentType"
import {
    OutlineArrowdownIcon,
    OutlineArrowrightIcon,
    OutlineArrowupIcon,
    OutlineChevrondoubledownIcon,
    OutlineChevrondoubleupIcon,
    OutlineChevrondownIcon,
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
import {formatNumberUnits, formatTime, formatTimeUnix} from "../utils"
import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"
import {Input, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    SolidAnnotationIcon,
    SolidCursorclickIcon,
    SolidHashtagIcon,
    SolidLightbulbIcon,
    SolidLightningboltIcon,
    SolidPaperairplaneIcon,
    SolidStopIcon,
    SolidToolIcon,
    SolidVariableIcon
} from "@/assets/icon/solid"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {AITree} from "../aiTree/AITree"
import cloneDeep from "lodash/cloneDeep"
import {AIChatMessage, NoAIChatReviewSelector} from "../type/aiChat"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {handleFlatAITree} from "../useChatData"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import YakitRunQuickly from "@/assets/aiAgent/yakit_run_quickly.gif"
import {ContextPressureEcharts, ResponseSpeedEcharts} from "./AIEcharts"
import AIPlanReviewTree from "../aiPlanReviewTree/AIPlanReviewTree"

import classNames from "classnames"
import styles from "./AIAgentChatTemplate.module.scss"
import {yakitNotify} from "@/utils/notification"

/** @name 欢迎页 */
export const AIAgentEmpty: React.FC<AIAgentEmptyProps> = memo((props) => {
    const {onSearch} = props

    const [question, setQuestion] = useControllableValue<string>(props, {
        defaultValue: "",
        valuePropName: "question",
        trigger: "setQuestion"
    })

    const isQuestion = useMemo(() => {
        return !!(question && question.trim())
    }, [question])

    return (
        <div className={styles["ai-agent-empty"]}>
            <div className={styles["empty-header"]}>
                <img className={styles["img-wrapper"]} src={YakitRunQuickly} alt='牛牛快跑' />
                <div className={styles["title"]}>AI-Agent 安全助手</div>
                <div className={styles["sub-title"]}>专注于安全编码与漏洞分析的智能助手</div>
            </div>

            <div className={styles["empty-input"]}>
                <div className={styles["ai-agent-input"]}>
                    <Input.TextArea
                        className={styles["question-textArea"]}
                        bordered={false}
                        placeholder='请下发任务, AI-Agent将执行(shift + enter 换行)'
                        value={question}
                        autoSize={true}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                            const keyCode = e.keyCode ? e.keyCode : e.key
                            const shiftKey = e.shiftKey
                            if (keyCode === 13 && shiftKey) {
                                e.stopPropagation()
                                e.preventDefault()
                                setQuestion(`${question}\n`)
                            }
                            if (keyCode === 13 && !shiftKey) {
                                e.stopPropagation()
                                e.preventDefault()
                                onSearch()
                            }
                        }}
                    />

                    <div className={styles["question-footer"]}>
                        <YakitButton disabled={!isQuestion} icon={<SolidPaperairplaneIcon />} onClick={onSearch} />
                    </div>
                </div>
            </div>
        </div>
    )
})

/** @name chat-左侧侧边栏 */
export const AIChatLeftSide: React.FC<AIChatLeftSideProps> = memo((props) => {
    const {tasks, pressure, cost, onLeafNodeClick} = props

    const [expand, setExpand] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "expand",
        trigger: "setExpand"
    })
    const handleCancelExpand = useMemoizedFn(() => {
        setExpand(false)
    })

    // 上下文压力集合
    const currentPressures = useMemo(() => {
        return pressure.map((item) => item.current_cost_token_size) || []
    }, [pressure])
    // 最新的上下文压力
    const lastPressure = useMemo(() => {
        const length = currentPressures.length
        if (length === 0) return 0
        return currentPressures[length - 1] || 0
    }, [currentPressures])
    // 上下文压力预设值
    const pressureThreshold = useMemo(() => {
        const length = pressure.length
        if (length === 0) return 0
        return pressure[length - 1].pressure_token_size || 0
    }, [pressure])

    // 首字符延迟集合
    const firstCosts = useMemo(() => {
        return cost.map((item) => item.ms) || []
    }, [cost])
    // 最新的首字符延迟
    const lastFirstCost = useMemo(() => {
        const length = firstCosts.length
        if (length === 0) return 0
        return firstCosts[length - 1] || 0
    }, [firstCosts])

    return (
        <div className={classNames(styles["ai-chat-left-side"], {[styles["ai-chat-left-side-hidden"]]: !expand})}>
            <div className={styles["side-header"]}>
                <div className={styles["header-title"]}>
                    任务列表
                    <YakitRoundCornerTag>{tasks.length}</YakitRoundCornerTag>
                </div>

                <YakitButton type='text2' icon={<OutlineCloseIcon />} onClick={handleCancelExpand} />
            </div>

            <div className={styles["task-list"]}>
                {tasks.length > 0 ? (
                    <AITree tasks={tasks} onNodeClick={onLeafNodeClick} />
                ) : (
                    <YakitEmpty style={{marginTop: "20%"}} title='思考中...' description='' />
                )}
            </div>

            <div className={styles["task-token"]}>
                <div className={styles["line-echats"]}>
                    <div className={styles["line-header"]}>
                        <div className={styles["header-title"]}>上下文压力</div>
                        <div className={classNames(styles["tag-last"], styles["pressure-wrapper"])}>
                            <OutlineEngineIcon />
                            {formatNumberUnits(lastPressure)}
                        </div>
                    </div>

                    {currentPressures.length > 0 && (
                        <ContextPressureEcharts data={currentPressures} threshold={pressureThreshold} />
                    )}
                </div>

                <div className={styles["divder-style"]}></div>

                <div className={styles["line-echats"]}>
                    <div className={styles["line-header"]}>
                        <div className={styles["header-title"]}>响应速度</div>
                        <div className={classNames(styles["tag-last"], styles["cost-wrapper"])}>
                            <OutlineRocketLaunchIcon />
                            {`${lastFirstCost < 0 ? "-" : lastFirstCost}ms`}
                        </div>
                    </div>
                    {firstCosts.length > 0 && <ResponseSpeedEcharts data={firstCosts} />}
                </div>
            </div>
        </div>
    )
})

/** @name 对话框内容 */
export const AIAgentChatBody: React.FC<AIAgentChatBodyProps> = memo((props) => {
    const {info, consumption, ...rest} = props

    // 问题
    const qs = useMemo(() => {
        if (!info) return ""
        return info.question
    }, [info])
    // AI的Token消耗
    const token = useMemo(() => {
        if (info?.answer) {
            return [
                formatNumberUnits(info.answer.consumption?.input_consumption || 0),
                formatNumberUnits(info.answer.consumption?.output_consumption || 0)
            ]
        }
        return [
            formatNumberUnits(consumption?.input_consumption || 0),
            formatNumberUnits(consumption?.output_consumption || 0)
        ]
    }, [info, consumption])

    return (
        <div className={styles["ai-agent-chat-body"]}>
            <div className={styles["body-question-info"]}>
                <div className={classNames(styles["question-style"], "yakit-content-single-ellipsis")} title={qs}>
                    {qs}
                </div>
                <div className={styles["info-wrapper"]}>
                    <div className={styles["info-token"]}>
                        Tokens:
                        <div className={classNames(styles["token-tag"], styles["upload-token"])}>
                            <OutlineArrowupIcon />
                            {token[0]}
                        </div>
                        <div className={classNames(styles["token-tag"], styles["download-token"])}>
                            <OutlineArrowdownIcon />
                            {token[1]}
                        </div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["info-time"]}>创建时间: {formatTime(info.time)}</div>
                </div>
            </div>

            <div className={styles["body-content"]}>
                <AIAgentChatStream {...rest} />
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
    const {scrollToTask, setScrollToTask, tasks, activeStream, streams} = props

    // 任务集合
    const lists = useMemo(() => {
        return Object.keys(streams)
    }, [streams])

    const wrapper = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (wrapper.current) {
            const {scrollHeight} = wrapper.current
            const {height} = wrapper.current.getBoundingClientRect()
            if (height < scrollHeight) {
                if (!isScrollTo.current) return
                wrapper.current.scrollTop = scrollHeight
            }
        }
    }, [streams])

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
    const handleChangeFirstPanel = useMemoizedFn((expand: boolean, order: string) => {
        setClickFirstPanel((old) => {
            if (expand) {
                if (old.includes(order)) {
                    return cloneDeep(old)
                } else {
                    return old.concat([order])
                }
            } else {
                if (!old.includes(order)) {
                    return cloneDeep(old)
                } else {
                    return old.filter((item) => item !== order)
                }
            }
        })
        if (!expand) {
            if (order === scrollToTask?.index && setScrollToTask) setScrollToTask(undefined)
            setClickSecondPanel((old) => {
                return old.filter((item) => !item.startsWith(order))
            })
        }
    })
    const activeFirstPanel = useMemo(() => {
        const active: string[] = []
        if (scrollToTask) {
            active.push(scrollToTask.index)
            setTimeout(() => {
                document.getElementById(scrollToTask.index)?.scrollIntoView()
            }, 100)
        }
        if (activeStream) {
            const first = (activeStream || "").split("|")[0]
            active.push(first)
        }
        return active.concat(clickFirstPanel.filter((item) => !active.includes(item)))
    }, [scrollToTask, activeStream, clickFirstPanel])

    const [clickSecondPanel, setClickSecondPanel] = useState<string[]>([])
    const handleChangeSecondPanel = useMemoizedFn((expand: boolean, order: string) => {
        setClickSecondPanel((old) => {
            if (expand) {
                if (old.includes(order)) {
                    return cloneDeep(old)
                } else {
                    return old.concat([order])
                }
            } else {
                if (!old.includes(order)) {
                    return cloneDeep(old)
                } else {
                    return old.filter((item) => item !== order)
                }
            }
        })
    })
    const activeSecondPanel = useMemo(() => {
        const active: string[] = []
        scrollToTask && active.push(scrollToTask.index)
        if (activeStream) {
            const first = (activeStream || "").split("|")[0] || ""
            const second = (activeStream || "").split("|")[1] || ""
            active.push(`${first}-${second}`)
        }
        return active.concat(clickSecondPanel.filter((item) => !active.includes(item)))
    }, [activeStream, clickSecondPanel])

    return (
        <div ref={wrapper} className={styles["ai-agent-chat-stream"]}>
            {lists.map((taskName) => {
                const headerTitle = handleGenerateTaskName(taskName)
                const firstExpand = activeFirstPanel.includes(taskName)
                return (
                    <ChatStreamCollapse
                        key={taskName}
                        id={taskName}
                        title={headerTitle}
                        expand={firstExpand}
                        onChange={(value) => handleChangeFirstPanel(value, taskName)}
                        className={classNames({
                            [styles["chat-stream-collapse-expand-first"]]: firstExpand
                        })}
                    >
                        {(streams[taskName] || []).map((info, index) => {
                            const {type, timestamp, data} = info
                            const key = `${taskName}-${type}-${timestamp}`
                            const secondExpand = activeSecondPanel.includes(key)
                            return (
                                <ChatStreamCollapse
                                    key={key}
                                    style={{marginBottom: 0}}
                                    expand={secondExpand}
                                    onChange={(value) => handleChangeSecondPanel(value, key)}
                                    title={
                                        <div className={styles["task-type-header"]}>
                                            {taskAnswerToIconMap[type] || <SolidLightningboltIcon />}
                                            <div className={styles["task-type-header-title"]}>{type}</div>
                                            <div className={styles["task-type-header-time"]}>
                                                {formatTimeUnix(timestamp)}
                                            </div>
                                        </div>
                                    }
                                    className={styles["chat-stream-collapse-expand"]}
                                >
                                    {(data.reason || data.system) && (
                                        <div className={styles["think-wrapper"]}>
                                            {data.reason && <div>{data.reason}</div>}

                                            {data.system && <div>{data.system}</div>}
                                        </div>
                                    )}

                                    {data.stream && (
                                        <div className={styles["anwser-wrapper"]}>
                                            <React.Fragment>
                                                <ChatMarkdown content={data.stream} skipHtml={true} />
                                            </React.Fragment>
                                        </div>
                                    )}
                                </ChatStreamCollapse>
                            )
                        })}
                    </ChatStreamCollapse>
                )
            })}
        </div>
    )
})
/** @name 回答信息折叠组件 */
const ChatStreamCollapse: React.FC<ChatStreamCollapseProps> = memo((props) => {
    const {id, className, style, title, headerExtra, children, expand, onChange} = props

    return (
        <div id={id} className={classNames(className, styles["chat-stream-collapse"])} style={style}>
            <div className={styles["collapse-header"]}>
                <div className={styles["header-body"]}>
                    <div className={classNames(styles["expand-icon"], {[styles["no-expand-icon"]]: !expand})}>
                        <OutlineChevrondownIcon />
                    </div>
                    <div className={styles["header-title"]} onClick={() => onChange && onChange(!expand)}>
                        {title}
                    </div>
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
    const {execute, review, positon, onStop, onPositon, onReExe, onNewChat} = props

    // const [question, setQuestion] = useState("")
    // const isQuestion = useMemo(() => {
    //     return !!(question && question.trim())
    // }, [question])
    // const [inputFocus, setInputFocus] = useState(false)

    return (
        <div className={styles["ai-agent-chat-footer"]}>
            {/* <div className={styles["input-textarea-wrapper"]}>
                <div
                    className={classNames(styles["continue-ask-input"], {
                        [styles["continue-ask-input-focus"]]: inputFocus
                    })}
                >
                    <div className={styles["input-body"]}>
                        <div className={styles["input-icon"]}>
                            <div className={styles["icon-wrapper"]}>
                                <ColorsSparklesIcon />
                            </div>
                        </div>

                        <Input.TextArea
                            className={styles["input-textArea"]}
                            bordered={false}
                            placeholder='告诉我你的需求...'
                            value={question}
                            autoSize={true}
                            onChange={(e) => setQuestion(e.target.value)}
                            onFocus={() => setInputFocus(true)}
                            onBlur={() => setInputFocus(false)}
                        />

                        {!inputFocus && (
                            <div className={styles["input-blur-btn"]}>
                                <YakitButton
                                    className={styles["input-btn-style"]}
                                    size='small'
                                    disabled={!isQuestion}
                                    icon={<OutlineArrowrightIcon />}
                                />
                            </div>
                        )}
                    </div>

                    {inputFocus && (
                        <div className={styles["input-footer-btn"]}>
                            <YakitButton
                                className={styles["input-btn-style"]}
                                size='small'
                                disabled={!isQuestion}
                                icon={<OutlineArrowrightIcon />}
                            />
                        </div>
                    )}
                </div>
            </div> */}

            <div className={styles["footer-btns"]}>
                <div className={styles["btns-group"]}>
                    {execute && !review && (
                        <>
                            <Tooltip title='中止' overlayStyle={{paddingBottom: 3}}>
                                <YakitButton
                                    className={styles["rounded-icon-btn"]}
                                    colors='danger'
                                    icon={<SolidStopIcon className={styles["stop-icon"]} />}
                                    onClick={onStop}
                                />
                            </Tooltip>
                            {positon && (
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

                    {execute && review && (
                        <YakitButton
                            className={styles["rounded-text-icon-btn"]}
                            colors='danger'
                            icon={<SolidStopIcon className={styles["stop-icon"]} />}
                            onClick={onStop}
                        >
                            中止
                        </YakitButton>
                    )}

                    {!execute && (
                        <>
                            <YakitButton
                                className={styles["rounded-text-icon-btn"]}
                                icon={<OutlineRefreshIcon />}
                                type='secondary2'
                                onClick={onReExe}
                            >
                                重新执行
                            </YakitButton>
                            <YakitButton
                                className={styles["rounded-text-icon-btn"]}
                                icon={<OutlinePlusIcon />}
                                onClick={() => onNewChat()}
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
    const {delayLoading, review, onSend, onSendAIRequire} = props

    const [expand, setExpand] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "expand",
        trigger: "setExpand"
    })

    const [isReviewMode, setIsReviewMode] = useState<boolean>(false)
    const [reviewTrees, setReviewTrees] = useState<AIChatMessage.PlanTask[]>([])
    const initReviewTreesRef = useRef<AIChatMessage.PlanTask[]>([])

    useEffect(() => {
        if (review.type === "plan_review_require") {
            const data = review.data as AIChatMessage.PlanReviewRequire
            const list: AIChatMessage.PlanTask[] = []
            handleFlatAITree(list, data.plans.root_task)
            initReviewTreesRef.current = [...list]
            setReviewTrees(list)
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
            const list = isReviewMode ? reviewTrees : initReviewTreesRef.current
            return (
                <AIPlanReviewTree
                    defaultList={initReviewTreesRef.current}
                    list={list}
                    setList={setReviewTrees}
                    editable={isReviewMode}
                />
            )
        }
        return null
    }, [reviewTrees, isReviewMode])

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
        if (editShow) return
        if (!info.allow_extra_prompt) {
            onSend(info)
            return
        }
        editInfo.current = cloneDeep(info)
        setEditShow(true)
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
                <YakitButton disabled={true} type='outline2' onClick={() => setIsReviewMode(true)}>
                    进入修改批阅模式
                </YakitButton>
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
        if (isReviewMode) {
            /**TODO 接口对接:如果数据结构变化不大,则不需要修改，下方代码根据后端提供的结构直接传出去*/
            // const jsonInput: Record<string, string> = {}
            // onSendAIRequire(JSON.stringify(jsonInput))
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
        const jsonInput: Record<string, string> = {suggestion: info.prompt}
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
                    <AIAgentChatTextarea
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
                    return (
                        <YakitButton key={el.prompt} type='outline2' onClick={() => handleAIRequireOpSend(el)}>
                            {el.prompt}
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
                            {!isReviewMode && (
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
                            {isReviewMode ? (
                                <>
                                    <YakitButton type='outline2' onClick={() => setIsReviewMode(false)}>
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

    useEffect(() => {
        if (wrapper.current) {
            const {scrollHeight} = wrapper.current
            const {height} = wrapper.current.getBoundingClientRect()
            if (height < scrollHeight) {
                wrapper.current.scrollTop = scrollHeight
            }
        }
    }, [logs])

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

const AIAgentChatTextarea: React.FC<AIAgentChatTextareaProps> = memo((props) => {
    const {className, bordered, autoSize, ...rest} = props

    return (
        <Input.TextArea
            {...rest}
            className={classNames(styles["ai-agent-chat-textarea"], className)}
            bordered={false}
            autoSize={true}
        />
    )
})
