import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useControllableValue, useMemoizedFn} from "ahooks"
import {
    AIAgentChatBodyProps,
    AIAgentChatReviewProps,
    AIAgentChatStreamProps,
    AIAgentEmptyProps,
    AIChatLeftSideProps,
    AIChatLogsProps
} from "../aiAgentType"
import {
    OutlineArrowdownIcon,
    OutlineArrowrightIcon,
    OutlineArrowupIcon,
    OutlineChevrondoubledownIcon,
    OutlineChevrondoubleupIcon,
    OutlineCloseIcon,
    OutlineEngineIcon,
    OutlineHandIcon,
    OutlineRocketLaunchIcon,
    OutlineWarpIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {formatNumberUnits, formatTime, formatTimeUnix} from "../utils"
import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {Input, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidAnnotationIcon, SolidPaperairplaneIcon, SolidVariableIcon} from "@/assets/icon/solid"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {AITree} from "../aiTree/AITree"
import cloneDeep from "lodash/cloneDeep"
import {AIChatMessage, NoAIChatReviewSelector} from "../type/aiChat"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {handleFlatAITree} from "../useChatData"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

import classNames from "classnames"
import styles from "./AIAgentChatTemplate.module.scss"

import {ContextPressureEcharts, ResponseSpeedEcharts} from "./AIEcharts"

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
    const {tasks, pressure, cost} = props

    const [expand, setExpand] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "expand",
        trigger: "setExpand"
    })
    const handleCancelExpand = useMemoizedFn(() => {
        setExpand(false)
    })

    const lastPressure = useMemo(() => {
        const length = pressure.current_cost_token_size.length
        if (length === 0) return 0
        return pressure.current_cost_token_size[length - 1]
    }, [pressure])

    const costInfo = useMemo(() => {
        if (cost.length === 0) return -1
        return cost[cost.length - 1]
    }, [cost])

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
                    <AITree tasks={tasks} />
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

                    {pressure?.current_cost_token_size?.length > 0 && (
                        <ContextPressureEcharts data={pressure?.current_cost_token_size} threshold={lastPressure} />
                    )}
                </div>

                <div className={styles["divder-style"]}></div>

                <div className={styles["line-echats"]}>
                    <div className={styles["line-header"]}>
                        <div className={styles["header-title"]}>响应速度</div>
                        <div className={classNames(styles["tag-last"], styles["cost-wrapper"])}>
                            <OutlineRocketLaunchIcon />
                            {`${costInfo < 0 ? "-" : costInfo}ms`}
                        </div>
                    </div>
                    {cost.length > 0 && <ResponseSpeedEcharts data={cost} />}
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
                <div className={styles["question-style"]}>{qs}</div>
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

/** @name chat-信息流展示 */
export const AIAgentChatStream: React.FC<AIAgentChatStreamProps> = memo((props) => {
    const {tasks, activeStream, streams} = props

    const lists = useMemo(() => {
        return Object.keys(streams)
    }, [streams])

    const wrapper = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (wrapper.current) {
            const {scrollHeight} = wrapper.current
            const {height} = wrapper.current.getBoundingClientRect()
            if (height < scrollHeight) {
                wrapper.current.scrollTop = scrollHeight
            }
        }
    }, [streams])

    const [secondActive, setSecondActive] = useState<string[]>([])
    const handleSecondChange = useMemoizedFn((arr: string | string[]) => {
        setSecondActive(arr as string[])
    })
    const [firstActive, setFirstActive] = useState<string[]>([])
    const handleFirstChange = useMemoizedFn((arr: string | string[]) => {
        setFirstActive(arr as string[])
        setSecondActive((old) => {
            return old.filter((item) => {
                try {
                    const firstKey = item.split("-")[0]
                    return arr.includes(firstKey)
                } catch (error) {
                    return false
                }
            })
        })
    })

    const activeStreamInfo = useMemo(() => {
        if (activeStream) {
            try {
                const type = activeStream.split("|")[0]
                const streamKey = activeStream.split("|")[1]
                return {first: type, second: `${type}-${streamKey}`}
            } catch (error) {}
        }
        return {first: "", second: ""}
    }, [activeStream])

    const activeKeys = useMemo(() => {
        const firstKeys = firstActive.includes(activeStreamInfo.first)
            ? firstActive
            : [...firstActive, activeStreamInfo.first]
        const secondKeys = secondActive.includes(activeStreamInfo.second)
            ? secondActive
            : [...secondActive, activeStreamInfo.second]
        return {firstActive: firstKeys, secondActive: secondKeys}
    }, [activeStream, firstActive, secondActive])

    // console.log("streams-log", firstActive, secondActive, activeStream, activeStreamInfo, activeKeys)

    const handleFetchTitle = useMemoizedFn((taskIndex: string) => {
        if (taskIndex === "system") return "系统输出"
        const task = tasks.find((item) => item.index === taskIndex)
        if (!task) return "未知任务"
        return task.name
    })

    return (
        <div ref={wrapper} className={styles["ai-agent-chat-stream"]}>
            <div className={styles["stream-list"]}>
                <YakitCollapse
                    destroyInactivePanel={true}
                    activeKey={activeKeys.firstActive}
                    onChange={handleFirstChange}
                >
                    {lists.map((item) => {
                        const streamMap = streams[item]
                        if (!streamMap || streamMap.length === 0) return null
                        const title = handleFetchTitle(item)

                        return (
                            <YakitCollapse.YakitPanel
                                key={item}
                                header={<span className={styles["first-title"]}>{title}</span>}
                            >
                                <div className={styles["content-item"]}>
                                    <YakitCollapse
                                        destroyInactivePanel={true}
                                        activeKey={activeKeys.secondActive}
                                        onChange={handleSecondChange}
                                    >
                                        {streamMap.map((el) => {
                                            const {type, timestamp, data} = el
                                            const key = `${type}-${timestamp}`
                                            return (
                                                <YakitCollapse.YakitPanel
                                                    key={`${item}-${key}`}
                                                    header={
                                                        <span className={styles["second-title"]}>
                                                            {type}
                                                            <span className={styles["time-style"]}>
                                                                {formatTimeUnix(timestamp)}
                                                            </span>
                                                        </span>
                                                    }
                                                >
                                                    <div className={styles["content-item"]}>
                                                        {data.reason && (
                                                            <div className={styles["item-stream"]}>
                                                                <div className={styles["stream-header"]}>思考: </div>
                                                                <div className={styles["stream-content"]}>
                                                                    {data.reason}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {data.system && (
                                                            <div className={styles["item-stream"]}>
                                                                <div className={styles["stream-header"]}>
                                                                    系统提示:{" "}
                                                                </div>
                                                                <div className={styles["stream-content"]}>
                                                                    {data.system}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {data.stream && (
                                                            <div className={styles["item-stream"]}>
                                                                <div className={styles["stream-header"]}>回答: </div>
                                                                <div className={styles["stream-content"]}>
                                                                    <React.Fragment>
                                                                        <ChatMarkdown
                                                                            content={data.stream}
                                                                            skipHtml={true}
                                                                        />
                                                                    </React.Fragment>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </YakitCollapse.YakitPanel>
                                            )
                                        })}
                                    </YakitCollapse>
                                </div>
                            </YakitCollapse.YakitPanel>
                        )
                    })}

                    {lists.length === 0 && <div className={styles["stream-empty"]}>思考中...</div>}
                </YakitCollapse>
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
    const handleExpand = useMemoizedFn(() => {
        setExpand((old) => !old)
    })

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
            return {title: "决策", subTitle: "请选择以下决策？"}
        }

        return {}
    }, [review])

    const isContinue = useMemo(() => {
        if (delayLoading) return false
        if (review.type === "require_user_interactive") return false
        const findIndex = (review.data as NoAIChatReviewSelector).selectors?.findIndex(
            (item) => item.value === "continue"
        )
        return findIndex !== -1
    }, [delayLoading, review])

    // #region 审阅-选项相关
    const [editShow, setEditShow] = useState(false)
    const editInfo = useRef<AIChatMessage.ReviewSelector>()
    const [question, setQuestion] = useState("")
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
            onSend(editInfo.current, question)
        }
        editInfo.current = undefined
        setQuestion("")
        setEditShow(false)
    })

    /** 继续执行 */
    const handleContinue = useMemoizedFn(() => {
        if (delayLoading) return
        if (!isContinue) return
        if (review.type === "require_user_interactive") return
        const find = (review.data as NoAIChatReviewSelector).selectors.find((item) => item.value === "continue")
        if (!find) return
        onSend(find)
    })

    // 用来控制被disabled为true的button, 想触发tooltip的方法
    const [tooltipShow, setTooltipShow] = useState(false)
    const handleChangeTooltip = useMemoizedFn((show: boolean) => setTooltipShow(show))

    const noAIOptions = useMemo(() => {
        if (review.type === "require_user_interactive") return null

        const {data} = review
        const {selectors = []} = data as NoAIChatReviewSelector
        const showList = selectors.filter((item) => item.value !== "continue")

        return (
            <>
                <Tooltip overlayStyle={{paddingBottom: 4}} title={"开发中..."} placement='top' visible={tooltipShow}>
                    <YakitButton
                        type='outline1'
                        disabled={true}
                        onMouseOver={() => handleChangeTooltip(true)}
                        onMouseLeave={() => handleChangeTooltip(false)}
                    >
                        进入修改批阅模式
                    </YakitButton>
                </Tooltip>
                {showList.map((el) => {
                    return (
                        <YakitButton key={el.value} type='outline2' onClick={() => handleShowEdit(el)}>
                            {el.prompt}
                        </YakitButton>
                    )
                })}
            </>
        )
    }, [tooltipShow, review])

    const handleAIRequireSend = useMemoizedFn((info: AIChatMessage.AIRequireOption) => {
        onSendAIRequire(info.prompt)
    })

    const aiOptions = useMemo(() => {
        const {data} = review
        const {options = []} = data as AIChatMessage.AIReviewRequire

        return (
            <>
                {options.map((el) => {
                    return (
                        <YakitButton key={el.prompt} type='outline2' onClick={() => handleAIRequireSend(el)}>
                            {el.prompt}
                        </YakitButton>
                    )
                })}
            </>
        )
    }, [review])
    // #endregion

    const planReview = useMemo(() => {
        if (review.type === "plan_review_require") {
            const data = review.data as AIChatMessage.PlanReviewRequire
            const list: AIChatMessage.PlanTask[] = []
            handleFlatAITree(list, data.plans.root_task)
            return <AITree tasks={list} />
        }
        return null
    }, [review])
    const taskReview = useMemo(() => {
        if (review.type === "task_review_require") {
            const data = review.data as AIChatMessage.TaskReviewRequire
            const {task, short_summary, long_summary} = data
            return (
                <div className={styles["task-tool-body"]}>
                    <div className={styles["task-tool-info"]}>
                        <div className={styles["info-title"]}>{task.name}</div>
                        <div className={styles["info-description"]}>{task.goal}</div>
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
            return (
                <div className={styles["task-tool-body"]}>
                    <div className={styles["task-tool-info"]}>
                        <div className={styles["info-title"]}>{tool}</div>
                        <div className={styles["info-description"]}>{tool_description}</div>
                    </div>

                    <div className={styles["tool-params"]}>
                        <div className={styles["params-title"]}>
                            <SolidVariableIcon /> 参数
                        </div>
                        <div className={styles["params-content"]}>{JSON.stringify(params)}</div>
                    </div>
                </div>
            )
        }
        return null
    }, [review])

    return (
        <div className={styles["ai-agent-chat-review"]}>
            <div className={classNames(styles["review-content"], {[styles["review-content-hidden"]]: !expand})}>
                <div className={styles["review-header"]}>
                    <OutlineHandIcon />
                    <div className={styles["title-style"]}>{reviewTitle.title || "异常错误"}</div>
                    <div className={styles["sub-title-style"]}>{reviewTitle.subTitle || ""}</div>
                </div>

                {delayLoading ? (
                    <div className={styles["review-delay-loading"]}>
                        <YakitSpin wrapperClassName={styles["spin-wrapper"]} spinning={true} tip='加载中...' />
                    </div>
                ) : (
                    <>
                        {review.type !== "require_user_interactive" && (
                            <div className={styles["review-body"]}>
                                {planReview}
                                {taskReview}
                                {toolReview}
                            </div>
                        )}

                        <div className={styles["review-btns"]}>
                            {review.type === "require_user_interactive" ? (
                                aiOptions
                            ) : editShow ? (
                                <div className={styles["review-input"]}>
                                    <Input.TextArea
                                        bordered={false}
                                        placeholder={editInfo.current?.prompt || "请输入..."}
                                        value={question}
                                        autoSize={{minRows: 4, maxRows: 4}}
                                        onChange={(e) => setQuestion(e.target.value)}
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
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className={styles["review-footer"]}>
                <div className={styles["btn-group"]}>
                    <YakitButton
                        type='outline2'
                        icon={expand ? <OutlineChevrondoubledownIcon /> : <OutlineChevrondoubleupIcon />}
                        onClick={handleExpand}
                    >
                        {expand ? "隐藏，稍后审阅" : "展开审阅信息"}
                    </YakitButton>
                </div>

                <div className={styles["btn-group"]}>
                    {isContinue && (
                        <YakitButton onClick={handleContinue}>
                            继续执行
                            <OutlineWarpIcon />
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
