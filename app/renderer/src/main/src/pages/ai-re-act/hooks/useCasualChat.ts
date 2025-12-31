import {useRef, useState} from "react"
import {useCreation, useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {
    genBaseAIChatData,
    handleGrpcDataPushLog,
    isAutoContinueReview,
    isToolExecStream,
    isToolStderrStream,
    isToolStdoutStream,
    noSkipReviewTypes
} from "./utils"
import {v4 as uuidv4} from "uuid"
import {AIChatLogData, handleSendFunc, UseCasualChatEvents, UseCasualChatParams, UseCasualChatState} from "./type"
import {
    AIReviewJudgeLevelMap,
    convertNodeIdToVerbose,
    DefaultAIToolResult,
    DefaultToolResultSummary
} from "./defaultConstant"
import {yakitNotify} from "@/utils/notification"
import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"
import {
    AIChatQSData,
    AIChatQSDataTypeEnum,
    AIReviewType,
    AIStreamOutput,
    AIToolResult,
    ReActChatElement,
    ToolStreamSelectors
} from "./aiRender"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useChatContent from "./useChatContent"

// 属于该 hook 处理数据的类型
export const UseCasualChatTypes = [
    "thought",
    "result",
    "exec_aiforge_review_require",
    // 自由对话崩溃的错误信息
    "fail_react_task",
    // 自由对话成功结束标志
    "success_react_task"
]

function useCasualChat(params?: UseCasualChatParams): [UseCasualChatState, UseCasualChatEvents]

function useCasualChat(params?: UseCasualChatParams) {
    const {pushLog, getRequest, onReviewRelease} = params || {}

    const handlePushLog = useMemoizedFn((logInfo: AIChatLogData) => {
        pushLog && pushLog(logInfo)
    })

    const [elements, setElements, getElements] = useGetSetState<ReActChatElement[]>([])
    const contentMap = useRef<Map<string, AIChatQSData>>(new Map())
    const getContentMap = useMemoizedFn((key: string) => {
        return contentMap.current.get(key)
    })
    const setContentMap = useMemoizedFn((key: string, value: AIChatQSData) => {
        contentMap.current.set(key, value)
    })
    const deleteContentMap = useMemoizedFn((key: string) => {
        contentMap.current.delete(key)
    })

    // #region review事件转换成UI处理逻辑
    const review = useRef<AIChatQSData>()

    // review触发事件处理
    const handleToolReview = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolUseReviewRequire

            if (!data?.id || !data?.selectors || !data?.selectors?.length) {
                
                throw new Error("tool_review data is invalid")
            }

            const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes("tool_use_review_require")
            review.current = cloneDeep({
                type: AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE,
                data: {
                    ...cloneDeep(data),
                    selected: isTrigger ? undefined : JSON.stringify({suggestion: "continue"}),
                    optionValue: isTrigger ? undefined : "continue"
                },
                ...genBaseAIChatData(res)
            })

            setContents((old) => {
                const newArr = [...old]
                if (!review.current) return newArr
                newArr.push(cloneDeep(review.current))
                return newArr
            })
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
                throw new Error("review_judgement data is invalid")
            }

            const {interactive_id} = score
            score.levelLabel = AIReviewJudgeLevelMap[score?.level || ""]?.label || undefined
            setContents((old) => {
                return old.map((item) => {
                    if (
                        (item.type === "tool_use_review_require" || item.type === "exec_aiforge_review_require") &&
                        item.data
                    ) {
                        const data = item.data
                        if (
                            data.id === interactive_id &&
                            // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
                            (!data.aiReview || (data.aiReview && typeof data.aiReview.seconds === "undefined"))
                        ) {
                            data.aiReview = cloneDeep(score)
                            item.data = cloneDeep(data)
                        }
                        return item
                    }
                    return item
                })
            })
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // AI人机交互的review事件处理
    const handleUserRequireReview = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewRequire

            if (!data?.id) {
                throw new Error("user_require_review data is invalid")
            }

            review.current = cloneDeep({
                type: AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE,
                data: cloneDeep(data),
                ...genBaseAIChatData(res)
            })

            setContents((old) => {
                const newArr = [...old]
                if (!review.current) return newArr
                newArr.push(cloneDeep(review.current))
                return newArr
            })
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // forge_review 事件处理
    const handleExecForgeReview = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ExecForgeReview

            if (!data?.id) {
                throw new Error("exec_forge_review data is invalid")
            }

            const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes("exec_aiforge_review_require")
            review.current = cloneDeep({
                type: AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE,
                data: {
                    ...cloneDeep(data),
                    selected: isTrigger ? undefined : JSON.stringify({suggestion: "continue"}),
                    optionValue: isTrigger ? undefined : "continue"
                },
                ...genBaseAIChatData(res)
            })

            setContents((old) => {
                const newArr = [...old]
                if (!review.current) return newArr
                newArr.push(cloneDeep(review.current))
                return newArr
            })
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
                throw new Error("review_release data is invalid")
            }
            const type = review.current.type
            const info = cloneDeep(review.current.data) as AIReviewType
            if (info?.id !== data.id) {
                throw new Error("review_release data is invalid")
            }

            info.selected = JSON.stringify({suggestion: "continue"})
            info.optionValue = "continue"
            review.current = undefined
            setContents((old) => {
                return old.map((item) => {
                    if (item.type === type && item.data && (item.data as AIReviewType).id === info.id) {
                        item.data = cloneDeep(info)
                    }
                    return item
                })
            })

            const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes(type)
            if (isTrigger) {
                onReviewRelease && onReviewRelease(data.id)
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })
    // #endregion

    // 处理专属自由对话的特殊数据流
    const handleSpecialData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            if (res.Type === "tool_use_review_require") {
                handleToolReview(res)
                return
            }
            if (res.Type === "require_user_interactive") {
                handleUserRequireReview(res)
                return
            }
            if (res.Type === "exec_aiforge_review_require") {
                handleExecForgeReview(res)
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

            if (res.Type === "success_react_task") {
                // ReAct任务成功结束标志
                // 暂时过滤不展示到UI上
                return
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    const chatContentEvent = useChatContent({
        getContentMap,
        setContentMap,
        deleteContentMap,
        setElements,
        getElements,
        pushLog: handlePushLog,
        handleUnkData: handleSpecialData
    })

    const [contents, setContents] = useState<AIChatQSData[]>([])

    // #endregion

    // 处理数据方法
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

    // 用户问题或review的主动操作
    const handleSend: handleSendFunc = useMemoizedFn(({request, optionValue, extraValue, cb}) => {
        try {
            const {IsInteractiveMessage, InteractiveId, IsFreeInput, FreeInput} = request
            if (IsInteractiveMessage && InteractiveId) {
                if (!review.current || (review.current.data as AIReviewType)?.id !== InteractiveId) {
                    yakitNotify("error", "未获取到 review 信息, 操作无效")
                    return
                }

                ;(review.current.data as AIReviewType).selected = request.InteractiveJSONInput
                ;(review.current.data as AIReviewType).optionValue = optionValue

                const type = review.current.type
                const info = cloneDeep(review.current.data) as AIReviewType
                review.current = undefined
                setContents((old) => {
                    return old.map((item) => {
                        if (item.type === type && item.data && (item.data as AIReviewType).id === info.id) {
                            item.data = cloneDeep(info)
                        }
                        return item
                    })
                })
            }

            if (IsFreeInput && FreeInput) {
                // 用户问题
                setContents((old) => {
                    const newArr = [...old]
                    newArr.push({
                        id: uuidv4(),
                        type: AIChatQSDataTypeEnum.QUESTION,
                        Timestamp: Date.now(),
                        data: {qs: FreeInput || "", setting: request},
                        AIService: "",
                        AIModelName: "",
                        extraValue: extraValue
                    })
                    return newArr
                })
            }
            cb && cb()
        } catch (error) {}
    })

    const handleResetData = useMemoizedFn(() => {
        contentMap.current.clear()
        setElements([])

        review.current = undefined
        setContents([])
    })

    const events: UseCasualChatEvents = useCreation(() => {
        return {handleSetData, handleResetData, handleSend}
    }, [])

    return [{elements, contentMap}, events] as const
}

export default useCasualChat
