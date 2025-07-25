import React, {forwardRef, memo, useImperativeHandle, useMemo, useRef, useState} from "react"
import {AITaskChatProps} from "./type"
import useAIAgentStore from "../useContext/useStore"
import useAIAgentDispatcher from "../useContext/useDispatcher"
import {useDebounceFn, useMap, useMemoizedFn, useSize, useThrottleFn} from "ahooks"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {AIChatInfo, AIChatMessage, AIChatReview, AIChatReviewExtra, AIInputEvent, AIStartParams} from "../type/aiChat"
import cloneDeep from "lodash/cloneDeep"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import useChatData from "../useChatData"
import {formatAIAgentSetting, formatNumberUnits} from "../utils"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowdownIcon,
    OutlineArrowupIcon,
    OutlineChevrondownIcon,
    OutlineNewspaperIcon
} from "@/assets/icon/outline"
import {
    AIAgentChatBody,
    AIAgentChatFooter,
    AIAgentChatReview,
    AIChatLeftSide,
    AIChatLogs
} from "../chatTemplate/AIAgentChatTemplate"

import classNames from "classnames"
import styles from "./AITaskChat.module.scss"
import {formatTimeYMD} from "@/utils/timeUtil"

const AITaskChat: React.FC<AITaskChatProps> = memo(
    forwardRef((props, ref) => {
        const {onBack} = props
        const [coordinatorId, setCoordinatorId] = useState<string>()

        useImperativeHandle(
            ref,
            () => ({
                onStart: handleStartChat,
                onShowTask: handleSetTaskChat,
                onGetExecuting: handleGetExecuting
            }),
            []
        )

        const {setting} = useAIAgentStore()
        const {setChats, setActiveChat} = useAIAgentDispatcher()

        const [taskChat, setTaskChat, getTaskChat] = useGetSetState<AIChatInfo>()
        /** 当前对话唯一ID */
        const activeID = useMemo(() => {
            return taskChat?.id
        }, [taskChat])

        const handleSetTaskChat = useMemoizedFn((info: AIChatInfo) => {
            if (info.id === taskChat?.id) return
            if (execute) {
                setActiveChat && setActiveChat(cloneDeep(getTaskChat()))
                yakitNotify("warning", "执行中, 不能切换对话")
                return
            }
            setTaskChat(cloneDeep(info))
        })

        // #region chat-左侧侧边栏
        const [leftExpand, setLeftExpand] = useState(true)
        // #endregion

        // #region chat-审阅相关数据和逻辑
        const chatBody = useRef<HTMLDivElement>(null)
        // 用来控制审阅框的高度
        const chatBodyHeight = useSize(chatBody)

        // review数据
        const [reviewInfo, setReviewInfo, getReviewInfo] = useGetSetState<AIChatReview>()
        // review数据中树的数据中需要的解释和关键词工具
        const [planReviewTreeKeywordsMap, {set: setPlanReviewTreeKeywords, reset: resetPlanReviewTreeKeywords}] =
            useMap<string, AIChatMessage.PlanReviewRequireExtra>(new Map())

        // 接受到 review 后的1秒 loading 状态
        const [delayLoading, setDelayLoading] = useGetSetState(false)
        const delayLoadingTime = useRef<any>(null)
        // 清除定时器
        const handleResetDelayLoadingTime = useMemoizedFn(() => {
            if (delayLoadingTime.current) {
                clearTimeout(delayLoadingTime.current)
                delayLoadingTime.current = null
            }
        })

        const [reviewExpand, setReviewExpand] = useState(true)

        // 展示review
        const handleShowReview = useMemoizedFn((info: AIChatReview) => {
            setReviewExpand(true)
            setDelayLoading(true)
            setReviewInfo(cloneDeep(info))
            handleResetDelayLoadingTime()
            delayLoadingTime.current = setTimeout(() => {
                setDelayLoading(false)
            }, 1000)
        })
        const handleShowReviewExtra = useMemoizedFn((info: AIChatReviewExtra) => {
            if (info.type === "plan_task_analysis") {
                setPlanReviewTreeKeywords(info.data.index, info.data)
            }
        })
        // 释放review
        const handleReleaseReview = useMemoizedFn((id: string) => {
            const info = getReviewInfo()
            if (!info) return
            if (info.data.id === id) {
                if (!delayLoading) yakitNotify("warning", "审阅自动执行，弹框将自动关闭")
                handleStopAfterChangeState()
                handleResetDelayLoadingTime()
                setDelayLoading(false)
            }
        })

        const sendLoading = useRef(false)
        /** 中途补充问题 */
        const handleSend = useMemoizedFn((item: AIChatMessage.ReviewSelector, qs?: string) => {
            if (!activeID) return
            if (sendLoading.current) return
            const reviewData = getReviewInfo()
            if (!reviewData) return

            sendLoading.current = true
            const {value, allow_extra_prompt} = item
            const jsonInput: Record<string, string> = {suggestion: value}
            if (allow_extra_prompt && qs) jsonInput.extra_prompt = qs
            const info: AIInputEvent = {
                IsInteractiveMessage: true,
                InteractiveId: reviewData.data.id,
                InteractiveJSONInput: JSON.stringify(jsonInput)
            }
            setTimeout(() => {
                events.onSend(activeID, reviewData, info)
                handleStopAfterChangeState()
                sendLoading.current = false
            }, 50)
        })

        /** AI交互补充策略 */
        const handleSendAIRequire = useMemoizedFn((value: string) => {
            if (!activeID) return
            if (sendLoading.current) return
            const reviewData = getReviewInfo()
            if (!reviewData) return

            sendLoading.current = true
            const info: AIInputEvent = {
                IsInteractiveMessage: true,
                InteractiveId: reviewData.data.id,
                InteractiveJSONInput: value
            }
            setTimeout(() => {
                events.onSend(activeID, reviewData, info)
                handleStopAfterChangeState()
                sendLoading.current = false
            }, 50)
        })
        // #endregion

        // #region chat-对话相关问题和回答数据
        // 提问结束后缓存数据
        const handleChatingEnd = useMemoizedFn(() => {
            handleSaveChatInfo()
        })

        const [
            {execute, pressure, firstCost, totalCost, consumption, logs, plan, streams, activeStream, card},
            events
        ] = useChatData({
            onReview: handleShowReview,
            onReviewExtra: handleShowReviewExtra,
            onReviewRelease: handleReleaseReview,
            onEnd: handleChatingEnd,
            setCoordinatorId
        })
        const handleGetExecuting = useMemoizedFn(() => {
            return execute
        })
        // #endregion

        // #region chat-对话相关方法和逻辑处理
        // 是否在构建发送请求参数中
        const requestLoading = useRef(false)

        // 构建提问参数并执行
        const handleRequestParams = useMemoizedFn((request: AIStartParams) => {
            requestLoading.current = true
            const info: AIChatInfo = {
                id: randomString(10),
                name: request.UserQuery || request.ForgeName || "",
                question: request.UserQuery || request.ForgeName || "",
                time: Date.now(),
                request: {
                    ...formatAIAgentSetting(setting),
                    UserQuery: request.UserQuery,
                    ForgeName: request.ForgeName || undefined,
                    ForgeParams: request.ForgeParams || undefined
                }
            }
            setChats && setChats((old) => old.concat([info]))
            setTaskChat(info)

            setActiveChat && setActiveChat(cloneDeep(info))
            events.onStart(info.id, {
                IsStart: true,
                Params: info.request
            })
            handleSubmitAfterChangState()

            setTimeout(() => {
                requestLoading.current = false
            }, 200)
        })
        // 开始提问
        const handleStartChat = useThrottleFn(
            (request: AIStartParams) => {
                if (execute) return
                if (requestLoading.current) return
                handleRequestParams(request)
            },
            {wait: 500, trailing: false}
        ).run

        // 重新执行
        const handleReExecute = useMemoizedFn(() => {
            if (execute) return
            if (requestLoading.current) return

            if (activeID && taskChat) {
                requestLoading.current = true
                let request: AIStartParams = {
                    ...formatAIAgentSetting(setting),
                    UserQuery: taskChat.request.UserQuery,
                    ForgeName: taskChat.request.ForgeName || undefined,
                    ForgeParams: taskChat.request.ForgeParams || undefined
                }
                setTaskChat((old) => {
                    if (!old) return old
                    const newChat = cloneDeep(old)
                    newChat.request = request
                    newChat && delete newChat.answer
                    return newChat
                })

                events.onStart(activeID, {
                    IsStart: true,
                    Params: request
                })
                setTimeout(() => {
                    requestLoading.current = false
                }, 200)
            }
        })

        // 停止提问
        const handleStopChat = useMemoizedFn(() => {
            if (execute && activeID) {
                events.onClose(activeID)
                handleStopAfterChangeState()
            }
        })

        // 保存上次对话信息
        const handleSaveChatInfo = useMemoizedFn(() => {
            const showID = activeID
            // 如果是历史对话，只是查看，怎么实现点击新对话的功能呢
            if (showID && events.fetchToken() && showID === events.fetchToken()) {
                const answer: AIChatInfo["answer"] = {
                    pressure: cloneDeep(pressure),
                    firstCost: cloneDeep(firstCost),
                    totalCost: cloneDeep(totalCost),
                    consumption: cloneDeep(consumption),
                    plans: events.fetchPlanTree(),
                    taskList: cloneDeep(plan),
                    logs: cloneDeep(logs),
                    streams: cloneDeep(streams)
                }

                setChats &&
                    setChats((old) => {
                        const newValue = cloneDeep(old)
                        const findIndex = newValue.findIndex((item) => item.id === showID)
                        if (findIndex !== -1) {
                            newValue[findIndex].answer = {...(answer || {})}
                        }
                        return newValue
                    })
            }
        })

        // 开启新对话框
        const handleBack = useMemoizedFn(() => {
            if (execute) {
                yakitNotify("warning", "请先停止当前对话")
                return
            }
            if (taskChat) {
                handleSaveChatInfo()
                events.handleReset()
                setTaskChat(undefined)
                handleResetState()
            }
            events.handleReset()
            onBack()
        })

        /** 新开窗口后需要重置的状态 */
        const handleResetState = useMemoizedFn(() => {
            // 打开左侧侧边栏
            setLeftExpand(true)
            // 重置回答定位
            setScrollTo(undefined)
            setIsStopScroll(false)
            // 隐藏日志
            setLogExpand(false)
        })

        /** 开始提问后的状态调整 */
        const handleSubmitAfterChangState = useMemoizedFn(() => {
            // 打开左侧侧边栏
            setLeftExpand(true)
        })

        /** 停止回答后的状态调整||清空Review状态 */
        const handleStopAfterChangeState = useMemoizedFn(() => {
            // 清空review信息
            setReviewInfo(undefined)
            resetPlanReviewTreeKeywords()
            setReviewExpand(true)
        })
        // #endregion

        // #region chat-UI实际展示数据
        // ui实际渲染数据-pressure
        const uiPressure = useMemo(() => {
            if (taskChat && taskChat.answer && taskChat.answer.pressure) return taskChat.answer.pressure
            return pressure
        }, [taskChat, pressure])
        // ui实际渲染数据-firstCost
        const uiFirstCost = useMemo(() => {
            if (taskChat && taskChat.answer && taskChat.answer.firstCost) return taskChat.answer.firstCost
            return firstCost
        }, [taskChat, firstCost])
        // ui实际渲染数据-consumption
        const uiConsumption = useMemo(() => {
            if (taskChat && taskChat.answer && taskChat.answer.consumption) return taskChat.answer.consumption
            return consumption
        }, [taskChat, consumption])
        // ui实际渲染数据-plan
        const uiPlan = useMemo(() => {
            if (taskChat && taskChat.answer && taskChat.answer.taskList) return taskChat.answer.taskList
            return plan
        }, [taskChat, plan])
        // ui实际渲染数据-streams
        const uiStreams = useMemo(() => {
            if (taskChat && taskChat.answer && taskChat.answer.streams) return taskChat.answer.streams
            return streams
        }, [taskChat, streams])
        // ui实际渲染数据-logs
        const uiLogs = useMemo(() => {
            if (taskChat && taskChat.answer && taskChat.answer.logs) return taskChat.answer.logs
            return logs
        }, [taskChat, logs])
        // #endregion

        // #region chat-左侧任务栏定位到右侧回答栏模块
        // 左侧执行任务跳转的定位位置
        const [scrollTo, setScrollTo] = useState<AIChatMessage.PlanTask>()
        // 是否停止自动滚动到最新的更新内容
        const [isStopScroll, setIsStopScroll] = useState(false)
        const handleSetScrollTo = useDebounceFn(
            (info: AIChatMessage.PlanTask) => {
                setScrollTo(info)
            },
            {wait: 300}
        ).run
        // #endregion

        // #region chat-日志相关
        const [logExpand, setLogExpand] = useState(false)
        const hadnleLogShow = useMemoizedFn(() => {
            setLogExpand((old) => !old)
        })
        // #endregion
        //#region title UI 相关数据
        // 问题
        const qs = useMemo(() => {
            if (!taskChat) return ""
            return taskChat.question
        }, [taskChat])
        // AI的Token消耗
        const token = useMemo(() => {
            let input = 0
            let output = 0
            const keys = Object.keys(uiConsumption || {})
            for (let name of keys) {
                input += uiConsumption[name]?.input_consumption || 0
                output += uiConsumption[name]?.output_consumption || 0
            }
            return [formatNumberUnits(input || 0), formatNumberUnits(output || 0)]
        }, [uiConsumption])
        // #endregion
        return (
            <div className={styles["ai-task-chat"]}>
                <div className={styles["task-chat-body"]}>
                    <div className={styles["task-chat-executing"]}>
                        <div className={styles["chat-executing-header"]}>
                            <div className={styles["header-title"]}>
                                <div className={styles["header-title-qs"]}>{qs}</div>
                                <div className={styles["header-title-info-wrapper"]}>
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
                                    <div className={styles["info-time"]}>
                                        创建时间:{taskChat?.time ? <> {formatTimeYMD(taskChat.time)}</> : "-"}
                                    </div>
                                </div>
                            </div>

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
                            <div
                                className={classNames(styles["content-left-side"], {
                                    [styles["content-left-side-hidden"]]: !leftExpand
                                })}
                            >
                                <AIChatLeftSide
                                    expand={leftExpand}
                                    setExpand={setLeftExpand}
                                    tasks={uiPlan}
                                    onLeafNodeClick={handleSetScrollTo}
                                    pressure={uiPressure}
                                    cost={uiFirstCost}
                                    card={card}
                                />
                                <div className={styles["open-wrapper"]} onClick={() => setLeftExpand(true)}>
                                    <YakitButton
                                        type='outline2'
                                        className={styles["side-header-btn"]}
                                        icon={<OutlineChevrondownIcon />}
                                        size='small'
                                    />
                                    <div className={styles["text"]}>任务列表</div>
                                </div>
                            </div>

                            <div className={styles["content-list"]}>
                                <div ref={chatBody} className={styles["chat-wrapper"]}>
                                    {taskChat && (
                                        <AIAgentChatBody
                                            info={taskChat}
                                            consumption={uiConsumption}
                                            scrollToTask={scrollTo}
                                            setScrollToTask={setScrollTo}
                                            isStopScroll={isStopScroll}
                                            setIsStopScroll={setIsStopScroll}
                                            tasks={uiPlan}
                                            activeStream={activeStream}
                                            streams={uiStreams}
                                            coordinatorId={coordinatorId}
                                        />
                                    )}
                                </div>

                                <div className={styles["content-review"]}>
                                    {!!reviewInfo && (
                                        <div
                                            className={styles["review-box"]}
                                            style={{maxHeight: (chatBodyHeight?.height || 0) - 60}}
                                        >
                                            <div
                                                className={classNames(styles["review-border-shadow"], {
                                                    [styles["review-mini"]]: !reviewExpand
                                                })}
                                            >
                                                <div className={styles["review-wrapper"]}>
                                                    <AIAgentChatReview
                                                        expand={reviewExpand}
                                                        setExpand={setReviewExpand}
                                                        delayLoading={delayLoading}
                                                        review={reviewInfo}
                                                        planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
                                                        onSend={handleSend}
                                                        onSendAIRequire={handleSendAIRequire}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className={styles["chat-footer"]}>
                                    <AIAgentChatFooter
                                        execute={execute}
                                        review={!!reviewInfo}
                                        positon={!!scrollTo || isStopScroll}
                                        showReExe={!!taskChat && !!taskChat.request}
                                        onStop={handleStopChat}
                                        onPositon={() => {
                                            setScrollTo(undefined)
                                            setIsStopScroll(false)
                                        }}
                                        onReExe={handleReExecute}
                                        onNewChat={handleBack}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={classNames(styles["task-chat-log"], {[styles["task-chat-log-hidden"]]: !logExpand})}>
                    <AIChatLogs logs={uiLogs} onClose={hadnleLogShow} />
                </div>
            </div>
        )
    })
)

export default AITaskChat
