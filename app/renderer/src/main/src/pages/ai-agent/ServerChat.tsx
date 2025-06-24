import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useDebounceFn, useMemoizedFn, useSize, useThrottleFn} from "ahooks"
import {AIAgentTriggerEventInfo, ServerChatProps} from "./aiAgentType"
import {OutlineNewspaperIcon, OutlineOpenIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import cloneDeep from "lodash/cloneDeep"
import useChatData from "./useChatData"
import useStore from "./useContext/useStore"
import useDispatcher from "./useContext/useDispatcher"
import {
    AIAgentChatBody,
    AIAgentChatFooter,
    AIAgentChatReview,
    AIChatLeftSide,
    AIChatLogs
} from "./chatTemplate/AIAgentChatTemplate"
import {AIChatInfo, AIChatMessage, AIChatReview, AIInputEvent, AIStartParams} from "./type/aiChat"
import {randomString} from "@/utils/randomUtil"
import emiter from "@/utils/eventBus/eventBus"
import {yakitNotify} from "@/utils/notification"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {formatAIAgentSetting} from "./utils"
import {AIAgentWelcome} from "./AIAgentWelcome/AIAgentWelcome"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

export const ServerChat: React.FC<ServerChatProps> = memo((props) => {
    const {} = props

    const wrapper = useRef<HTMLDivElement>(null)

    const {setting, activeChat} = useStore()
    const {setSetting, setChats, setActiveChat} = useDispatcher()

    /** 当前激活的对话唯一ID */
    const activeID = useMemo(() => {
        return activeChat?.id
    }, [activeChat])

    // #region chat-左侧侧边栏
    const [leftExpand, setLeftExpand] = useState(true)
    // #endregion

    // #region chat-审阅相关数据和逻辑
    const chatBody = useRef<HTMLDivElement>(null)
    // 用来控制审阅框的高度
    const chatBodyHeight = useSize(chatBody)

    // review数据
    const [reviewInfo, setReviewInfo, getReviewInfo] = useGetSetState<AIChatReview>()
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
    // 释放review
    const handleReleaseReview = useMemoizedFn((id: string) => {
        const info = getReviewInfo()
        if (!info) return
        if (info.data.id === id) {
            if (!delayLoading) yakitNotify("warning", "审阅自动执行，弹框将自动关闭")
            setReviewInfo(undefined)
            setReviewExpand(true)
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
            setReviewInfo(undefined)
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
            setReviewInfo(undefined)
            sendLoading.current = false
        }, 50)
    })
    // #endregion

    // #region chat-意外情况
    const hintID = useRef("")
    const oldRequest = useRef<AIStartParams>()
    const forgeName = useRef("")
    const [redirectForgeShow, setRedirectForgeShow] = useState(false)
    const [loading, setLoading] = useState(false)
    const handleOpenHintShow = useMemoizedFn((old: AIStartParams, request: AIStartParams) => {
        if (!activeID) return
        if (redirectForgeShow) return
        if (!old) return
        hintID.current = activeID || ""
        oldRequest.current = old
        forgeName.current = request.ForgeName || ""
        setRedirectForgeShow(true)
    })
    const handleHintShowCallback = useMemoizedFn((result: boolean) => {
        if (loading) return
        if (result) {
            setSetting && setSetting((old) => ({...old, ForgeName: forgeName.current}))
            setLoading(true)
            handleStopChat()
            setTimeout(() => {
                if (!forgeName.current) {
                    yakitNotify("warning", "未获取到forgeName,不进行打开操作新对话操作")
                    return
                }
                yakitNotify("info", "准备打开新对话中...")
                handleNewChat(() => {
                    if (!oldRequest.current) return
                    requestLoading.current = true
                    const info: AIChatInfo = {
                        id: randomString(10),
                        name: oldRequest.current?.UserQuery,
                        question: oldRequest.current.UserQuery,
                        time: Date.now()
                    }
                    setQuestion("")
                    setChats && setChats((old) => old.concat([info]))
                    setActiveChat && setActiveChat(info)
                    events.onStart(info.id, {
                        IsStart: true,
                        Params: {
                            ...oldRequest.current,
                            ForgeName: forgeName.current || undefined
                        }
                    })
                    handleSubmitAfterChangState()

                    setTimeout(() => {
                        requestLoading.current = false
                    }, 300)
                })
            }, 500)
        }
        hintID.current = ""
        oldRequest.current = undefined
        forgeName.current = ""
        setRedirectForgeShow(false)
        setLoading(false)
    })
    // #endregion

    // #region chat-对话相关问题和回答数据
    const [question, setQuestion] = useState("")

    // 提问结束后缓存数据
    const handleChatingEnd = useMemoizedFn(() => {
        handleSaveChatInfo()
    })

    const [{execute, pressure, firstCost, totalCost, consumption, logs, plan, streams, activeStream}, events] =
        useChatData({
            onReview: handleShowReview,
            onReviewRelease: handleReleaseReview,
            onRedirectForge: handleOpenHintShow,
            onEnd: handleChatingEnd
        })
    // #endregion

    // #region chat-对话相关方法和逻辑处理
    // 是否在构建发送请求参数中
    const requestLoading = useRef(false)

    // 开始提问
    const handleStartChat = useThrottleFn(
        (request: AIStartParams) => {
            if (execute) return
            if (requestLoading.current) return
            if (!request.UserQuery) {
                request.UserQuery = question.trim()
            }
            handleRequestParams(request)
        },
        {wait: 500, trailing: false}
    ).run

    const reExeLoading = useRef(false)
    // 重新执行
    const handleReExecute = useMemoizedFn(() => {
        if (execute) return
        if (reExeLoading.current) return

        reExeLoading.current = true
        if (activeID && activeChat) {
            let reQS = ""
            setActiveChat &&
                setActiveChat((old) => {
                    const newChat = cloneDeep(old)
                    reQS = newChat?.question || ""
                    newChat && delete newChat.answer
                    return newChat
                })

            requestLoading.current = true
            setQuestion("")
            events.onStart(activeID, {
                IsStart: true,
                Params: {
                    ...formatAIAgentSetting(setting),
                    UserQuery: reQS
                }
            })

            setTimeout(() => {
                requestLoading.current = false
            }, 300)
        }
        setTimeout(() => {
            reExeLoading.current = false
        }, 300)
    })

    // 构建提问参数并执行
    const handleRequestParams = useMemoizedFn((request: AIStartParams) => {
        requestLoading.current = true
        const info: AIChatInfo = {
            id: randomString(10),
            name: request.UserQuery,
            question: request.UserQuery,
            time: Date.now()
        }
        setQuestion("")
        setChats && setChats((old) => old.concat([info]))
        setActiveChat && setActiveChat(info)
        events.onStart(info.id, {
            IsStart: true,
            Params: {
                ...formatAIAgentSetting(setting),
                UserQuery: request.UserQuery,
                ForgeName: request.ForgeName || undefined,
                ForgeParams: request.ForgeParams || undefined
            }
        })
        handleSubmitAfterChangState()

        setTimeout(() => {
            requestLoading.current = false
        }, 300)
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
    const handleNewChat = useMemoizedFn((cb?: () => void) => {
        if (execute) {
            yakitNotify("warning", "请先停止当前对话")
            return
        }
        if (activeID) {
            handleSaveChatInfo()
            events.handleReset()
            setActiveChat && setActiveChat(undefined)
            handleResetState()
            cb && cb()
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

    /** 新开窗口后需要重置的状态 */
    const handleResetState = useMemoizedFn(() => {
        // 隐藏日志
        setLogExpand(false)
        // 清空问题
        setQuestion("")
        // 打开左侧侧边栏
        setLeftExpand(true)
        // 重置回答定位
        setScrollTo(undefined)
    })

    /** 开始提问后的状态调整 */
    const handleSubmitAfterChangState = useMemoizedFn(() => {
        // 打开左侧侧边栏
        setLeftExpand(true)
    })

    /** 停止回答后的状态调整 */
    const handleStopAfterChangeState = useMemoizedFn(() => {
        // 清空review信息
        setReviewInfo(undefined)
        setReviewExpand(true)
    })
    // #endregion

    // #region chat-UI实际展示数据
    // ui实际渲染数据-pressure
    const uiPressure = useMemo(() => {
        if (activeChat && activeChat.answer && activeChat.answer.pressure) return activeChat.answer.pressure
        return pressure
    }, [activeChat, pressure])
    // ui实际渲染数据-firstCost
    const uiFirstCost = useMemo(() => {
        if (activeChat && activeChat.answer && activeChat.answer.firstCost) return activeChat.answer.firstCost
        return firstCost
    }, [activeChat, firstCost])
    // ui实际渲染数据-consumption
    const uiConsumption = useMemo(() => {
        if (activeChat && activeChat.answer && activeChat.answer.consumption) return activeChat.answer.consumption
        return consumption
    }, [activeChat, consumption])
    // ui实际渲染数据-plan
    const uiPlan = useMemo(() => {
        if (activeChat && activeChat.answer && activeChat.answer.taskList) return activeChat.answer.taskList
        return plan
    }, [activeChat, plan])
    // ui实际渲染数据-streams
    const uiStreams = useMemo(() => {
        if (activeChat && activeChat.answer && activeChat.answer.streams) return activeChat.answer.streams
        return streams
    }, [activeChat, streams])
    // ui实际渲染数据-logs
    const uiLogs = useMemo(() => {
        if (activeChat && activeChat.answer && activeChat.answer.logs) return activeChat.answer.logs
        return logs
    }, [activeChat, logs])
    // #endregion

    // #region chat-左侧任务栏定位到右侧回答栏模块
    const [scrollTo, setScrollTo] = useState<AIChatMessage.PlanTask>()
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

    return (
        <div ref={wrapper} className={styles["server-chat"]}>
            <div className={styles["server-chat-body"]}>
                {activeChat && activeID ? (
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
                                />
                                <div className={styles["open-wrapper"]}>
                                    <YakitButton
                                        type='text2'
                                        icon={<OutlineOpenIcon />}
                                        onClick={() => setLeftExpand(true)}
                                    />
                                </div>
                            </div>

                            <div className={styles["content-list"]}>
                                <div ref={chatBody} className={styles["chat-wrapper"]}>
                                    {activeChat && (
                                        <AIAgentChatBody
                                            info={activeChat}
                                            consumption={uiConsumption}
                                            scrollToTask={scrollTo}
                                            setScrollToTask={setScrollTo}
                                            tasks={uiPlan}
                                            activeStream={activeStream}
                                            streams={uiStreams}
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
                                        review={false}
                                        positon={!!scrollTo}
                                        onStop={handleStopChat}
                                        onPositon={() => setScrollTo(undefined)}
                                        onReExe={handleReExecute}
                                        onNewChat={handleNewChat}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <AIAgentWelcome question={question} setQuestion={setQuestion} onSearch={handleStartChat} />
                )}
            </div>

            <div className={classNames(styles["server-chat-log"], {[styles["server-chat-log-hidden"]]: !logExpand})}>
                <AIChatLogs logs={uiLogs} onClose={hadnleLogShow} />
            </div>

            <YakitHint
                getContainer={wrapper.current || undefined}
                wrapClassName={styles["server-chat-hint"]}
                title={"打开新的 AIAgent 对话"}
                content={`forgeName : ${forgeName.current}`}
                visible={hintID.current === activeID && redirectForgeShow}
                okButtonText='立即停止'
                okButtonProps={{loading: loading}}
                onOk={() => handleHintShowCallback(true)}
                cancelButtonText='忽略'
                cancelButtonProps={{loading: loading}}
                onCancel={() => handleHintShowCallback(false)}
            />
        </div>
    )
})
