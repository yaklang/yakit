import {useRef, useState} from "react"
import {useCreation, useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {AIReviewJudgeLevelMap} from "./defaultConstant"
import {AIChatLogData, handleSendFunc, UseTaskChatEvents, UseTaskChatParams, UseTaskChatState} from "./type"
import {
    genBaseAIChatData,
    genErrorLogData,
    genExecTasks,
    handleGrpcDataPushLog,
    isAutoExecuteReviewContinue
} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {AIAgentGrpcApi, AIInputEventSyncTypeEnum, AIOutputEvent, AITaskStatus} from "./grpcApi"
import {AIChatQSData, AIChatQSDataTypeEnum, AIReviewType, AITaskInfoProps, ReActChatRenderItem} from "./aiRender"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useChatContent from "./useChatContent"

function useTaskChat(params?: UseTaskChatParams): [UseTaskChatState, UseTaskChatEvents]

function useTaskChat(params?: UseTaskChatParams) {
    const {pushLog, getChatDataStore, getRequest, onReview, onReviewExtra, onReviewRelease, sendRequest} = params || {}

    const handlePushLog = useMemoizedFn((logInfo: AIChatLogData) => {
        pushLog && pushLog(logInfo)
    })

    const [elements, setElements, getElements] = useGetSetState<ReActChatRenderItem[]>([])
    const handleSetElements = useMemoizedFn((newElements: ReActChatRenderItem[]) => {
        setElements(newElements)
    })

    const getContentMap = useMemoizedFn((mapKey: string) => {
        const contentMap = getChatDataStore?.()?.taskChat?.contents
        if (!contentMap) return undefined
        return contentMap.get(mapKey)
    })
    const setContentMap = useMemoizedFn((mapKey: string, value: AIChatQSData) => {
        const contentMap = getChatDataStore?.()?.taskChat?.contents
        contentMap && contentMap.set(mapKey, value)
    })
    const deleteContentMap = useMemoizedFn((mapKey: string) => {
        const contentMap = getChatDataStore?.()?.taskChat?.contents
        contentMap && contentMap.delete(mapKey)
    })

    // #region 任务树相关逻辑
    // plan_review 原始树结构
    const planTree = useRef<AIAgentGrpcApi.PlanTask>()
    /** 树结构的任务树 */
    const fetchPlanTree = useMemoizedFn(() => {
        return cloneDeep(planTree.current)
    })
    const [plan, setPlan] = useState<AITaskInfoProps[]>([])
    const handleResetPlanTree = useMemoizedFn(() => {
        planTree.current = undefined
        setPlan([])
    })

    /** 任务节点开始执行, 生成UI展示的信息 */
    const handleTaskStartNode = useMemoizedFn((res: AIOutputEvent, nodeInfo: AIAgentGrpcApi.ChangeTask) => {
        try {
            // 任务树根节点不进行节点展示
            if (nodeInfo.task.index === "1") return

            const chatData: AIChatQSData = {
                ...genBaseAIChatData(res),
                chatType: "task",
                type: AIChatQSDataTypeEnum.TASK_INDEX_NODE,
                data: {
                    taskIndex: nodeInfo.task.index,
                    taskName: nodeInfo.task.name
                }
            }
            setContentMap(chatData.id, chatData)
            setElements((old) => [...old, {token: chatData.id, type: chatData.type, renderNum: 1, chatType: "task"}])
        } catch (error) {}
    })

    /** 更新任务树指定任务节点的状态 */
    const handleUpdateTaskState = useMemoizedFn((index: string, state: AITaskInfoProps["progress"]) => {
        setPlan((old) => {
            return old.map((item) => {
                if (item.index === index) item.progress = state
                return item
            })
        })
    })

    /** 将任务树中, 所有进行中的任务, 变更为中止状态 */
    const handleAbortTaskState = useMemoizedFn(() => {
        setPlan((old) => {
            const newData = cloneDeep(old)
            return newData.map((item) => {
                if (item.progress === AITaskStatus.inProgress) {
                    item.progress = AITaskStatus.error
                }
                return item
            })
        })
    })
    // #endregion

    // #region review事件转换成UI处理逻辑
    const review = useRef<AIChatQSData>()
    /** 记录plan_review补充信息的唯一ID */
    const currentPlansId = useRef<string>("")
    const handleResetReview = useMemoizedFn(() => {
        review.current = undefined
        currentPlansId.current = ""
    })

    // 将 review 数据处理成需要展示的UI数据
    const handleRviewDataToUI = useMemoizedFn((reviewInfo: AIChatQSData) => {
        if (
            reviewInfo.type === AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE &&
            reviewInfo.data.optionValue === "continue"
        ) {
            // plan_review, 选择是continue选项, 则进行UI任务树的生成
            const tasks = reviewInfo.data
            planTree.current = cloneDeep(tasks.plans.root_task)
            const plans = genExecTasks(tasks.plans.root_task)
            setPlan(cloneDeep(plans))
        }
    })

    /** plan_review */
    const handlePlanReview = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequire

            if (!data?.id || !data?.plans || !data?.plans?.root_task || !data?.selectors || !data?.selectors?.length) {
                handlePushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据异常: id:${data?.id || "-"}; selectors:${JSON.stringify(
                            data?.selectors || "-"
                        )}; plans:${!!data?.plans?.root_task ? "valid" : "invalid"} data`
                    )
                )
                return
            }

            const isAuto = isAutoExecuteReviewContinue({type: res.Type, getFunc: getRequest})
            const chatData: AIChatQSData = {
                ...genBaseAIChatData(res),
                chatType: "task",
                id: data.id,
                type: AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE,
                data: {
                    ...cloneDeep(data),
                    selected: isAuto ? JSON.stringify({suggestion: "continue"}) : undefined,
                    optionValue: isAuto ? "continue" : undefined
                }
            }
            review.current = isAuto ? undefined : chatData
            if (isAuto) {
                setContentMap(chatData.id, chatData)
                setElements((old) => [
                    ...old,
                    {token: chatData.id, type: chatData.type, renderNum: 1, chatType: "task"}
                ])
                handleRviewDataToUI(chatData)
            } else {
                onReview && onReview(chatData)
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })
    /** plan_review 的补充数据 */
    const handlePlanReviewExtra = useMemoizedFn((res: AIOutputEvent) => {
        try {
            if (!review.current || review.current.type !== AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE) {
                handlePushLog(genErrorLogData(res.Timestamp, `${res.Type}数据异常: 未找到对应plan_review_require数据`))
                return
            }

            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequireExtra
            if (
                !data?.plans_id ||
                !data?.index ||
                !data?.keywords?.length ||
                (currentPlansId.current && currentPlansId.current !== data.plans_id)
            ) {
                handlePushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据异常: plans_id:${data?.plans_id || "-"};index:${
                            data?.index || "-"
                        };keywords:${JSON.stringify(data?.keywords || "-")}`
                    )
                )
                return
            }

            if (!currentPlansId.current) currentPlansId.current = data.plans_id
            const reviewInfo = review.current.data
            if (!reviewInfo.taskExtra) reviewInfo.taskExtra = new Map()
            reviewInfo.taskExtra.set(data.index, data)

            const isAuto = isAutoExecuteReviewContinue({getFunc: getRequest})
            if (!isAuto && onReviewExtra) onReviewExtra(data)
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })
    // tool_review
    const handleToolReview = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolUseReviewRequire
            if (!data?.id || !data?.selectors || !data?.selectors?.length) {
                handlePushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据异常: id:${data?.id || "-"}; selectors:${JSON.stringify(
                            data?.selectors || "-"
                        )}`
                    )
                )
                return
            }

            const isAuto = isAutoExecuteReviewContinue({type: res.Type, getFunc: getRequest})
            const chatData: AIChatQSData = {
                ...genBaseAIChatData(res),
                chatType: "task",
                id: data.id,
                type: AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE,
                data: {
                    ...cloneDeep(data),
                    selected: isAuto ? JSON.stringify({suggestion: "continue"}) : undefined,
                    optionValue: isAuto ? "continue" : undefined
                }
            }
            review.current = isAuto ? undefined : chatData
            if (isAuto) {
                setContentMap(chatData.id, chatData)
                setElements((old) => [
                    ...old,
                    {token: chatData.id, type: chatData.type, renderNum: 1, chatType: "task"}
                ])
            } else {
                onReview && onReview(chatData)
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })
    // task_review
    const handleTaskReview = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.TaskReviewRequire
            if (!data?.id || !data?.selectors || !data?.selectors?.length) {
                handlePushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据异常: id:${data?.id || "-"}; selectors:${JSON.stringify(
                            data?.selectors || "-"
                        )}`
                    )
                )
                return
            }

            const isAuto = isAutoExecuteReviewContinue({type: res.Type, getFunc: getRequest})
            const chatData: AIChatQSData = {
                ...genBaseAIChatData(res),
                chatType: "task",
                id: data.id,
                type: AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE,
                data: {
                    ...cloneDeep(data),
                    selected: isAuto ? JSON.stringify({suggestion: "continue"}) : undefined,
                    optionValue: isAuto ? "continue" : undefined
                }
            }
            review.current = isAuto ? undefined : chatData
            if (isAuto) {
                setContentMap(chatData.id, chatData)
                setElements((old) => [
                    ...old,
                    {token: chatData.id, type: chatData.type, renderNum: 1, chatType: "task"}
                ])
            } else {
                onReview && onReview(chatData)
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // AI人机交互的review事件处理(require_user_interactive)
    const handleUserRequireReview = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewRequire
            if (!data?.id) {
                handlePushLog(genErrorLogData(res.Timestamp, `${res.Type}数据异常: id:${data?.id || "-"}`))
                return
            }

            const chatData: AIChatQSData = {
                ...genBaseAIChatData(res),
                chatType: "task",
                id: data.id,
                type: AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE,
                data: cloneDeep(data)
            }
            review.current = chatData
            onReview && onReview(chatData)
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 处理 tool_review和forge_view 的 ai 判断得分事件
    const handleReviewJudgement = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const score = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewJudgement

            if (!score?.interactive_id) {
                handlePushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据异常: interactive_id:${score?.interactive_id || "-"}`
                    )
                )
                return
            }
            if (
                !review.current ||
                review.current.type !== AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE ||
                review.current.data.id !== score.interactive_id
            ) {
                handlePushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据异常(interactive_id:${score?.interactive_id || "-"})未找到对应review`
                    )
                )
                return
            }

            score.levelLabel = AIReviewJudgeLevelMap[score?.level || ""]?.label || undefined
            const info = review.current.data
            if (!info.aiReview || (info.aiReview && typeof info.aiReview.seconds === "undefined")) {
                // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
                info.aiReview = cloneDeep(score)
                review.current.data = cloneDeep(info)
            }
            const isAuto = isAutoExecuteReviewContinue({getFunc: getRequest})
            if (!isAuto && onReview) onReview(cloneDeep(review.current))
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 释放当前review信息
    const handleReviewRelease = useMemoizedFn((res: AIOutputEvent) => {
        try {
            if (!review.current) return

            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReviewRelease
            if (!data?.id) {
                handlePushLog(genErrorLogData(res.Timestamp, `${res.Type}数据异常: id:${data?.id || "-"}`))
                return
            }

            const info = cloneDeep(review.current.data) as AIReviewType
            if (info?.id !== data.id) {
                handlePushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据(id:${data?.id || "-"})和当前展示review数据(id:${info?.id || "-"})不匹配`
                    )
                )
                return
            }

            info.selected = JSON.stringify({suggestion: "continue"})
            info.optionValue = "continue"
            const chatData: AIChatQSData = {
                ...review.current,
                data: info as any
            }
            handleResetReview()
            handleRviewDataToUI(chatData)
            setContentMap(chatData.id, chatData)
            setElements((old) => {
                return old.map((item) => {
                    if (item.token === chatData.id && item.type === chatData.type) {
                        item.renderNum += 1
                    }
                    return item
                })
            })

            const isAuto = isAutoExecuteReviewContinue({type: chatData.type, getFunc: getRequest})
            if (!isAuto && onReviewRelease) onReviewRelease(data.id)
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })
    // #endregion

    // 处理专属任务规划的特殊数据流
    const handleSpecialData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""

            if (res.Type === "structured" && res.NodeId === "system") {
                const data = JSON.parse(ipcContent) || ""

                if (!!data && typeof data === "object" && data?.type === "push_task") {
                    const info = JSON.parse(ipcContent) as AIAgentGrpcApi.ChangeTask
                    handleTaskStartNode(res, info)
                    handleUpdateTaskState(info.task.index, AITaskStatus.inProgress)
                }

                if (!!data && typeof data === "object" && data?.type === "pop_task") {
                    // 结束任务 & 请求更新任务树最新状态数据
                    sendRequest && sendRequest({IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN})
                }
                return
            }

            if (res.Type === "plan_review_require") {
                handlePlanReview(res)
                return
            }
            if (res.Type === "plan_task_analysis") {
                handlePlanReviewExtra(res)
                return
            }
            if (res.Type === "tool_use_review_require") {
                handleToolReview(res)
                return
            }
            if (res.Type === "task_review_require") {
                handleTaskReview(res)
                return
            }
            if (res.Type === "require_user_interactive") {
                handleUserRequireReview(res)
                return
            }

            if (["ai_review_start", "ai_review_countdown", "ai_review_end"].includes(res.Type)) {
                handleReviewJudgement(res)
                return
            }

            if (res.Type === "review_release") {
                // review释放通知
                handleReviewRelease(res)
                return
            }

            if (res.Type === "plan") {
                // 更新正在执行的任务树
                const tasks = JSON.parse(ipcContent) as {root_task: AIAgentGrpcApi.PlanTask}
                planTree.current = cloneDeep(tasks.root_task)
                const plans = genExecTasks(tasks.root_task)
                setPlan(cloneDeep(plans))
                return
            }

            // 未识别类型全部归档到日志处理
            handleGrpcDataPushLog({info: res, pushLog: handlePushLog})
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    const chatContentEvent = useChatContent({
        chatType: "task",
        getContentMap,
        setContentMap,
        deleteContentMap,
        setElements,
        getElements,
        pushLog: handlePushLog,
        handleUnkData: handleSpecialData
    })
    // #endregion

    /** 处理数据方法 */
    const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            chatContentEvent.handleSetData(res)
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    const handleResetData = useMemoizedFn(() => {
        handleResetPlanTree()
        handleResetReview()
        chatContentEvent.handleResetData()
        setElements([])
    })

    /** review 界面选项触发事件 */
    const handleSend: handleSendFunc = useMemoizedFn(({request, optionValue, cb}) => {
        try {
            const {InteractiveId, InteractiveJSONInput} = request
            if (!review.current || review.current.id !== InteractiveId) {
                yakitNotify("error", "未获取到 review 信息, 操作无效")
                return
            }

            const chatData = cloneDeep(review.current)
            ;(chatData.data as AIReviewType).selected = InteractiveJSONInput || ""
            ;(chatData.data as AIReviewType).optionValue = optionValue

            handleResetReview()
            handleRviewDataToUI(chatData)
            setContentMap(chatData.id, chatData)
            setElements((old) => old.concat({token: chatData.id, type: chatData.type, renderNum: 1, chatType: "task"}))

            cb && cb()
        } catch (error) {}
    })

    /** grpc接口关闭后的后续处理逻辑 */
    const handleCloseGrpc = useMemoizedFn(() => {
        // 将进行中的任务变更为中止状态
        handleAbortTaskState()
    })

    /** 当前任务规划结束-触发UI展示结束标识 */
    const handlePlanExecEnd = useMemoizedFn((res: AIOutputEvent) => {
        const chatData: AIChatQSData = {
            ...genBaseAIChatData(res),
            chatType: "task",
            type: AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION,
            data: ""
        }
        setContentMap(chatData.id, chatData)
        setElements((old) => [...old, {token: chatData.id, type: chatData.type, renderNum: 1, chatType: "task"}])
    })

    const state: UseTaskChatState = useCreation(() => {
        return {plan, elements}
    }, [plan, elements])

    const events: UseTaskChatEvents = useCreation(() => {
        return {
            fetchPlanTree,
            handleSetData,
            handleResetData,
            handleSend,
            handleCloseGrpc,
            handlePlanExecEnd,
            handleSetElements
        }
    }, [])

    return [state, events] as const
}

export default useTaskChat
