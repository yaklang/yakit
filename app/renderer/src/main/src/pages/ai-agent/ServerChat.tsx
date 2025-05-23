import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn, useThrottleFn} from "ahooks"
import {AIAgentTriggerEventInfo, AIChatTaskListProps, ServerChatProps} from "./aiAgentType"
import {
    OutlineCheckcircleIcon,
    OutlineChevrondoubledownIcon,
    OutlineChevrondoubleleftIcon,
    OutlineChevrondoublerightIcon,
    OutlineClipboardlistIcon,
    OutlineCloseIcon,
    OutlineInformationcircleIcon,
    OutlineLoadingIcon,
    OutlineMenualt2Icon,
    OutlineNewspaperIcon,
    OutlinePlusIcon,
    OutlineWarpIcon,
    OutlineXcircleIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import cloneDeep from "lodash/cloneDeep"
import {Input, Tooltip} from "antd"
import {SolidPaperairplaneIcon, SolidStopIcon} from "@/assets/icon/solid"
import useChatData from "./useChatData"
import useStore from "./useContext/useStore"
import useDispatcher from "./useContext/useDispatcher"
import {
    AIAgentChat,
    AIAgentChatBody,
    AIAgentChatReview,
    AIAgentEmpty,
    AIChatLogs
} from "./chatTemplate/AIAgentChatTemplate"
import {AIChatInfo, AIChatMessage, AIChatReview, AIInputEvent} from "./type/aiChat"
import {randomString} from "@/utils/randomUtil"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {yakitNotify} from "@/utils/notification"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"
import {AITree} from "./aiTree/AITree"

export const ServerChat: React.FC<ServerChatProps> = memo((props) => {
    const {} = props

    const wrapper = useRef<HTMLDivElement>(null)

    const {setting, activeChat} = useStore()
    const {setSetting, setChats, setActiveChat} = useDispatcher()

    /** 当前激活的对话唯一ID */
    const activeID = useMemo(() => {
        return activeChat?.id
    }, [activeChat])

    // #region chat-对话相关问题和回答数据
    const [question, setQuestion] = useState("")

    // 出现review数据时，弹出审阅框
    const [showReview, setShowReview] = useState(false)
    const handleShowReview = useMemoizedFn((info: AIChatReview) => {
        if (showReview) return
        setShowReview(true)
    })
    const [{execute, consumption, logs, plan, review, activeStream, streams}, events] = useChatData({
        onReview: handleShowReview
    })
    // #endregion

    // #region chat-对话相关方法和逻辑处理
    // 是否在构建发送请求参数中
    const requestLoading = useRef(false)

    // 开始提问
    const handleStartChat = useThrottleFn(
        () => {
            if (!question || !question.trim() || execute) return
            if (requestLoading.current) return
            handleRequestParams(question.trim())
        },
        {wait: 500, trailing: false}
    ).run

    // 构建提问参数并执行
    const handleRequestParams = useMemoizedFn((qs: string) => {
        requestLoading.current = true
        const info: AIChatInfo = {
            id: randomString(10),
            name: question,
            question: question,
            time: Date.now()
        }
        setQuestion("")
        setChats && setChats((old) => old.concat([info]))
        setActiveChat && setActiveChat(info)
        events.onStart(info.id, {
            IsStart: true,
            Params: {
                UserQuery: question,
                EnableSystemFileSystemOperator: !!setting.EnableSystemFileSystemOperator || true,
                UseDefaultAIConfig: !!setting.UseDefaultAIConfig || true,
                ForgeName: setting.ForgeName || undefined
            }
        })

        setTimeout(() => {
            requestLoading.current = false
        }, 300)
    })

    // 停止提问
    const handleStopChat = useMemoizedFn(() => {
        if (execute && activeID) {
            events.onClose(activeID)
        }
    })

    // 保存上次对话信息
    const handleSaveChatInfo = useMemoizedFn(() => {
        const oldID = activeID
        // 如果是历史对话，只是查看，怎么实现点击新对话的功能呢
        if (oldID && events.fetchToken() && oldID === events.fetchToken()) {
            const answer: AIChatInfo["answer"] = {
                consumption: cloneDeep(consumption),
                logs: cloneDeep(logs),
                plan: cloneDeep(plan),
                review: cloneDeep(review),
                streams: cloneDeep(streams)
            }

            setChats &&
                setChats((old) => {
                    const newValue = cloneDeep(old)
                    const findIndex = newValue.findIndex((item) => item.id === oldID)
                    if (findIndex !== -1) {
                        newValue[findIndex].time = Date.now()
                        newValue[findIndex].answer = {...(answer || {})}
                    }
                    return newValue
                })
        }
    })

    // 开启新对话框
    const handleNewChat = useMemoizedFn(() => {
        if (execute) {
            yakitNotify("warning", "请先停止当前对话")
            return
        }
        if (activeID) {
            handleSaveChatInfo()
            events.handleReset()
            setActiveChat && setActiveChat(undefined)
        }
    })

    useEffect(() => {
        const onEvents = (res: string) => {
            try {
                const data = JSON.parse(res) as AIAgentTriggerEventInfo
                if (!data.type) return

                if (data.type === "new-chat") {
                    handleNewChat()
                }
            } catch (error) {}
        }
        emiter.on("onServerChatEvent", onEvents)
        return () => {
            emiter.off("onServerChatEvent", onEvents)
        }
    }, [])
    // #endregion

    // #region chat-审阅相关数据和逻辑
    const [reviewExpand, setReviewExpand] = useState(true)
    // #endregion

    // #region chat-对话相关信息和逻辑

    // ui实际渲染数据-logs
    const uiLogs = useMemo(() => {
        if (activeChat && activeChat.answer && activeChat.answer.logs) return activeChat.answer.logs
        return logs
    }, [activeChat, logs])
    // ui实际渲染数据-plan
    const uiPlan = useMemo(() => {
        if (activeChat && activeChat.answer && activeChat.answer.plan) return activeChat.answer.plan
        return plan
    }, [activeChat, plan])
    // ui实际渲染数据-review
    const uiReview = useMemo(() => {
        if (activeChat && activeChat.answer) return activeChat.answer.review
        return review
    }, [activeChat, review])
    // ui实际渲染数据-streams
    const uiStreams = useMemo(() => {
        if (activeChat && activeChat.answer && activeChat.answer.streams) return activeChat.answer.streams
        return streams
    }, [activeChat, streams])

    // 中途 review 时，存在补充问题的情况，补充问题内容
    const [reviewQuestion, setReviewQuestion] = useState("")
    const [reviewShow, setReviewShow] = useState("")
    const [reviewLoading, setReviewLoading] = useState(false)

    /** 中途补充问题 */
    const onSend = useMemoizedFn((item: AIChatMessage.ReviewSelector) => {
        if (!review) return
        if (reviewLoading) return
        if (!activeID) return
        setReviewLoading(true)
        setReviewShow("")
        const {value, allow_extra_prompt} = item
        const jsonInput: Record<string, string> = {suggestion: value}
        if (allow_extra_prompt && reviewQuestion) jsonInput.extra_prompt = reviewQuestion
        const info: AIInputEvent = {
            IsInteractiveMessage: true,
            InteractiveId: review.data.id,
            InteractiveJSONInput: JSON.stringify(jsonInput)
        }
        setReviewQuestion("")
        console.log("onSend", JSON.stringify(info))
        setTimeout(() => {
            setShowReview(false)
            events.onSend(activeID, review, info)
            setReviewLoading(false)
        }, 300)
    })
    // #endregion

    // #region chat-计划相关
    const [planExpand, setPlanExpand] = useState(true)
    const handlePlanShow = useMemoizedFn(() => {
        noPlanHint.current = true
        setPlanHintCancel(false)
        setPlanHintOpen(false)
        setTimeout(() => {
            setPlanExpand((old) => !old)
        }, 100)
        setTimeout(() => {
            noPlanHint.current = false
        }, 600)
    })

    // 用来防止展开时，同位置不同 icon 的提示内容替换闪烁，在开展时，禁止提示300ms
    const noPlanHint = useRef(false)
    const handleChangePlanHintOpen = useMemoizedFn((visible: boolean) => {
        if (noPlanHint.current) return
        setPlanHintOpen(visible)
    })
    const handleChangePlanHintCancel = useMemoizedFn((visible: boolean) => {
        if (noPlanHint.current) return
        setPlanHintCancel(visible)
    })

    const [planHintOpen, setPlanHintOpen] = useState(false)
    const [planHintCancel, setPlanHintCancel] = useState(false)
    // #endregion

    // #region chat-日志相关
    const [logExpand, setLogExpand] = useState(true)
    const hadnleLogShow = useMemoizedFn(() => {
        setLogExpand((old) => !old)
    })
    // #endregion

    // 生成任务树列表
    const handleGenerateTaskList = useMemoizedFn(
        (infos: AIChatMessage.PlanTask[], isStart: boolean, showState?: boolean) => {
            return (
                <div className={classNames({[styles["list-indent"]]: !isStart})}>
                    {infos.map((item) => {
                        const {name, goal, state, subtasks} = item
                        return (
                            <>
                                <div key={item.name} className={classNames(styles["list-item"])}>
                                    <div className={styles["state"]}>
                                        {showState && !state && <div className={classNames(styles["wait"])}></div>}
                                        {showState && state === "exec" && (
                                            <OutlineLoadingIcon
                                                className={classNames(styles["exec"], "icon-rotate-animation")}
                                            />
                                        )}
                                        {showState && state === "end" && (
                                            <OutlineCheckcircleIcon className={styles["end"]} />
                                        )}
                                        {showState && state === "error" && (
                                            <OutlineXcircleIcon className={styles["error"]} />
                                        )}
                                    </div>

                                    <div
                                        className={classNames(styles["name"], "yakit-content-single-ellipsis")}
                                        title={name}
                                    >
                                        {name}
                                    </div>

                                    <YakitPopover
                                        overlayClassName={styles["task-info-popover"]}
                                        trigger={"click"}
                                        placement='right'
                                        content={
                                            <div className={styles["task-detail"]}>
                                                <div className={styles["detail-title"]}>任务名: </div>
                                                <div className={styles["detail-content"]}>{name}</div>
                                                <div className={styles["detail-title"]}>任务描述: </div>
                                                <div className={styles["detail-content"]}>{goal}</div>
                                            </div>
                                        }
                                    >
                                        <div className={styles["info"]}>
                                            <OutlineInformationcircleIcon />
                                        </div>
                                    </YakitPopover>
                                </div>
                                {subtasks && subtasks.length > 0 && handleGenerateTaskList(subtasks, false, showState)}
                            </>
                        )
                    })}
                </div>
            )
        }
    )

    const planContent = useMemo(() => {
        if (!uiPlan) return null
        return <div className={styles["task-list"]}>{handleGenerateTaskList([uiPlan], true, true)}</div>
    }, [uiPlan])

    // 审阅元素
    const reviewElement = useMemo(() => {
        if (!uiReview) return null

        const {type, data} = uiReview

        if (type === "plan_review_require") {
            const {
                plans: {root_task}
            } = data as AIChatMessage.PlanReviewRequire

            return (
                <>
                    <div className={styles["list-header"]}>计划审阅: </div>
                    {handleGenerateTaskList([root_task], false, false)}
                </>
            )
        }

        if (type === "tool_use_review_require") {
            const {params, tool, tool_description} = data as AIChatMessage.ToolUseReviewRequire
            return (
                <>
                    <div className={styles["list-header"]}>工具审阅: </div>
                    <div className={styles["content-review"]}>
                        <div className={styles["tool-title"]}>tool: {tool}</div>
                        <div className={styles["tool-content"]}>{tool_description}</div>

                        <div className={styles["tool-title"]}>参数:</div>
                        <div className={styles["tool-content"]}>{JSON.stringify(params)}</div>
                    </div>
                </>
            )
        }

        if (type === "task_review_require") {
            const {long_summary, short_summary, task} = data as AIChatMessage.TaskReviewRequire
            return (
                <>
                    <div className={styles["list-header"]}>任务审阅: </div>
                    <div className={styles["content-review"]}>
                        <div className={styles["tool-title"]}>任务名: {task.name}</div>
                        <div className={styles["tool-title"]}>任务内容: {task.goal}</div>
                        <div className={styles["tool-title"]}>short_summary:</div>
                        <div className={styles["tool-content"]}>{short_summary}</div>
                        <div className={styles["tool-title"]}>long_summary:</div>
                        <div className={styles["tool-content"]}>{long_summary}</div>
                    </div>
                </>
            )
        }

        return null
    }, [uiReview])

    // 审阅操作列表
    // 这里的(review)信息只能是从通信数据里获取, 历史对话不展示(review)操作按钮
    const reviewOperations = useMemo(() => {
        if (!review || !review.data || !review.data.selectors || review.data.selectors.length === 0) return null
        return (
            <div className={styles["review-selectors"]}>
                <div className={styles["selectors-header"]}>选项: </div>
                {review.data.selectors.map((el) => {
                    const {value, prompt, allow_extra_prompt} = el
                    const showKey = `${review.data.id}-${value}`
                    const isShow = reviewShow === showKey
                    return (
                        <React.Fragment key={value}>
                            {!allow_extra_prompt ? (
                                <YakitButton
                                    type={value === "continue" ? "primary" : "outline2"}
                                    className={styles["selectors-btn"]}
                                    size='small'
                                    onClick={() => onSend(el)}
                                >
                                    {prompt}
                                </YakitButton>
                            ) : (
                                <YakitPopover
                                    trigger='click'
                                    overlayClassName={styles["review-input-popover"]}
                                    placement='top'
                                    content={
                                        <div className={styles["review-input"]}>
                                            <YakitInput
                                                value={reviewQuestion}
                                                onChange={(e) => setReviewQuestion(e.target.value)}
                                            />
                                            <div className={styles["input-btn"]}>
                                                <YakitButton onClick={() => onSend(el)}>确定</YakitButton>
                                            </div>
                                        </div>
                                    }
                                    visible={isShow}
                                    onVisibleChange={(visible) => {
                                        setReviewShow(visible ? showKey : "")
                                    }}
                                >
                                    <YakitButton type='outline2' className={styles["selectors-btn"]} size='small'>
                                        {prompt}
                                    </YakitButton>
                                </YakitPopover>
                            )}
                        </React.Fragment>
                    )
                })}
            </div>
        )
    }, [review, reviewShow, reviewQuestion])

    // 弹框里的审阅操作列表
    // 这里的(review)信息只能是从通信数据里获取, 历史对话不展示(review)操作按钮
    const hintReviewOperations = useMemo(() => {
        if (!review || !review.data || !review.data.selectors || review.data.selectors.length === 0) return null
        return (
            <div className={styles["review-selectors"]}>
                <div className={styles["selectors-header"]}>选项: </div>
                {review.data.selectors.map((el) => {
                    const {value, prompt, allow_extra_prompt} = el
                    const showKey = `hint-${review.data.id}-${value}`
                    const isShow = reviewShow === showKey
                    return (
                        <React.Fragment key={value}>
                            {!allow_extra_prompt ? (
                                <YakitButton
                                    type={value === "continue" ? "primary" : "outline2"}
                                    className={styles["selectors-btn"]}
                                    size='small'
                                    onClick={() => onSend(el)}
                                >
                                    {prompt}
                                </YakitButton>
                            ) : (
                                <YakitPopover
                                    trigger='click'
                                    overlayClassName={styles["review-input-popover"]}
                                    placement='top'
                                    content={
                                        <div className={styles["review-input"]}>
                                            <YakitInput
                                                value={reviewQuestion}
                                                onChange={(e) => setReviewQuestion(e.target.value)}
                                            />
                                            <div className={styles["input-btn"]}>
                                                <YakitButton onClick={() => onSend(el)}>确定</YakitButton>
                                            </div>
                                        </div>
                                    }
                                    visible={isShow}
                                    onVisibleChange={(visible) => {
                                        setReviewShow(visible ? showKey : "")
                                    }}
                                >
                                    <YakitButton type='outline2' className={styles["selectors-btn"]} size='small'>
                                        {prompt}
                                    </YakitButton>
                                </YakitPopover>
                            )}
                        </React.Fragment>
                    )
                })}
            </div>
        )
    }, [review, reviewShow, reviewQuestion])

    return (
        <div ref={wrapper} className={styles["server-chat"]}>
            <div className={styles["server-chat-body"]}>
                {true || (activeChat && activeID) ? (
                    <div className={styles["server-chat-executing"]}>
                        <div className={styles["chat-executing-header"]}>
                            <div className={styles["header-title"]}>AI-Agent</div>

                            <div className={styles["header-extra"]}>
                                <YakitButton
                                    size='large'
                                    type='secondary2'
                                    isHover={logExpand}
                                    icon={<OutlineNewspaperIcon />}
                                    onClick={hadnleLogShow}
                                >
                                    日志
                                </YakitButton>
                            </div>
                        </div>

                        <div className={styles["chat-executing-content"]}>
                            <div className={styles["content-task-list"]}>
                                <AIChatTaskList />
                            </div>

                            <div className={styles["content-list"]}>
                                <div className={styles["chat-wrapper"]}>
                                    {/* 后面要去掉这个注释 */}
                                    {/* @ts-ignore */}
                                    <AIAgentChatBody info={activeChat} consumption={consumption} />
                                </div>

                                <div className={styles["content-review"]}>
                                    <div className={styles["review-box"]}>
                                        <div
                                            className={classNames(styles["review-border-shadow"], {
                                                [styles["review-mini"]]: !reviewExpand
                                            })}
                                        >
                                            <div className={styles["review-wrapper"]}>
                                                <AIAgentChatReview expand={reviewExpand} setExpand={setReviewExpand} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles["chat-footer"]}>
                                    <YakitButton
                                        className={styles["stop-btn"]}
                                        colors='danger'
                                        icon={<OutlineLoadingIcon className='icon-rotate-animation' />}
                                    >
                                        中止
                                    </YakitButton>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <AIAgentEmpty question={question} setQuestion={setQuestion} onSearch={handleStartChat} />
                )}
            </div>

            <div className={classNames(styles["server-chat-log"], {[styles["server-chat-log-hidden"]]: !logExpand})}>
                <AIChatLogs logs={uiLogs} onClose={hadnleLogShow} />
            </div>
        </div>

        //     <div className={styles["server-chat-body"]}>
        //         {activeID && (
        //             <div className={classNames(styles["chat-plan"], {[styles["chat-plan-hidden"]]: !planExpand})}>
        //                 <div className={styles["header-wrapper"]}>
        //                     <div
        //                         className={classNames(styles["header-title"], {
        //                             [styles["header-title-hidden"]]: !planExpand
        //                         })}
        //                     >
        //                         任务列表
        //                     </div>
        //                     <div className={styles["icon-btn"]} onClick={handlePlanShow}>
        //                         {planExpand ? (
        //                             <Tooltip
        //                                 overlayStyle={{paddingLeft: 8}}
        //                                 title={"收起任务列表"}
        //                                 placement='right'
        //                                 visible={planHintCancel}
        //                                 onVisibleChange={handleChangePlanHintCancel}
        //                             >
        //                                 <OutlineChevrondoubleleftIcon />
        //                             </Tooltip>
        //                         ) : (
        //                             <Tooltip
        //                                 overlayStyle={{paddingLeft: 8}}
        //                                 title={"展开任务列表"}
        //                                 placement='right'
        //                                 visible={planHintOpen}
        //                                 onVisibleChange={handleChangePlanHintOpen}
        //                             >
        //                                 <OutlineMenualt2Icon />
        //                             </Tooltip>
        //                         )}
        //                     </div>
        //                 </div>

        //                 <div
        //                     className={classNames(styles["plan-content"], {
        //                         [styles["plan-content-hidden"]]: !planExpand
        //                     })}
        //                 >
        //                     {uiPlan ? (
        //                         planContent
        //                     ) : (
        //                         <div className={styles["loading"]}>{execute ? "获取任务列表中..." : "无任务列表"}</div>
        //                     )}
        //                 </div>
        //             </div>
        //         )}

        //         <div className={styles["chat-wrapper"]}>
        //             <div className={styles["chat-answer"]}>
        //                     activeChat && (
        //                         <AIAgentChat
        //                             chatInfo={activeChat}
        //                             consumption={consumption}
        //                             activeStream={activeStream}
        //                             streams={uiStreams}
        //                         />
        //                     )
        //                 )}
        //             </div>

        //             <div className={styles["chat-bottom"]}>
        //                 <div className={styles["bottom-box"]}>
        //                     {execute || activeID ? (
        //                         <div className={styles["review-wrapper"]}>
        //                             <div className={styles["review-content"]}>
        //                                 {uiReview ? (
        //                                     <div className={styles["task-list"]}>
        //                                         {reviewElement}
        //                                         {reviewOperations}
        //                                     </div>
        //                                 ) : (
        //                                     <div className={styles["review-loading"]}>
        //                                         {execute ? "思考中..." : "任务已完成, 请点击右下角+号创建新任务"}
        //                                     </div>
        //                                 )}

        //                                 {/* <div className={styles["list-item"]}>
        //                                     <div className={styles["item-header"]}>任务更新: </div>
        //                                     <div className={classNames(styles["item-task-li"], styles["li-style"])}>
        //                                         <div className={styles["name"]}>任务名: {task.name}</div>
        //                                         <div className={styles["goal"]}>任务内容: {task.goal}</div>
        //                                     </div>
        //                                     <div className={classNames(styles["item-task-li"], styles["li-style"])}>
        //                                         <div className={styles["name"]}>
        //                                             状态: {task.executed ? "结束" : "进行中"}
        //                                         </div>
        //                                     </div>
        //                                 </div> */}
        //                             </div>

        //
        //                         </div>
        //
        //                 </div>
        //             </div>
        //         </div>
        //     </div>

        //     <YakitModal
        //         getContainer={wrapper.current || undefined}
        //         style={{bottom: 0, right: 10, top: "unset", position: "absolute"}}
        //         maskStyle={{backgroundColor: "rgba(0, 0, 0, 0.15)"}}
        //         type='white'
        //         title='审阅'
        //         closable={false}
        //         keyboard={false}
        //         maskClosable={false}
        //         okButtonProps={{style: {display: "none"}}}
        //         cancelText='隐藏'
        //         visible={showReview}
        //         onCancel={() => setShowReview(false)}
        //     >
        //         <div className={styles["task-list"]}>
        //             {reviewElement}
        //             {hintReviewOperations}
        //         </div>
        //     </YakitModal>
        // </div>
    )
})

/** chat-任务列表 */
export const AIChatTaskList: React.FC<AIChatTaskListProps> = memo((props) => {
    const {} = props

    return (
        <div className={styles["ai-chat-task-list"]}>
            <div className={styles["header"]}>
                <div className={styles["header-title"]}>
                    任务列表
                    <YakitRoundCornerTag>2</YakitRoundCornerTag>
                </div>

                <YakitButton type='text2' icon={<OutlineCloseIcon />} />
            </div>

            <div className={styles["task-list"]}>
                <AITree />
            </div>

            <div className={styles["task-token"]}>
                <div className={styles["line-echats"]}>
                    <div className={styles["line-header"]}>
                        <div className={styles["header-title"]}>上下文压力</div>
                        <div></div>
                    </div>

                    <div></div>
                </div>

                <div className={styles["divder-style"]}></div>

                <div className={styles["line-echats"]}>
                    <div className={styles["line-header"]}>
                        <div className={styles["header-title"]}>响应速度</div>
                        <div></div>
                    </div>

                    <div></div>
                </div>
            </div>
        </div>
    )
})
