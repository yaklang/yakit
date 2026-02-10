import {useRef} from "react"
import {useCreation, useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {genBaseAIChatData, genErrorLogData, handleGrpcDataPushLog, isAutoExecuteReviewContinue} from "./utils"
import {v4 as uuidv4} from "uuid"
import {AIChatLogData, handleSendFunc, UseCasualChatEvents, UseCasualChatParams, UseCasualChatState} from "./type"
import {AIReviewJudgeLevelMap} from "./defaultConstant"
import {yakitNotify} from "@/utils/notification"
import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"
import {AIChatQSData, AIChatQSDataTypeEnum, AIReviewType, ReActChatRenderItem} from "./aiRender"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useChatContent from "./useChatContent"

function useCasualChat(params?: UseCasualChatParams): [UseCasualChatState, UseCasualChatEvents]

function useCasualChat(params?: UseCasualChatParams) {
    const {pushLog, getChatDataStore, getRequest, onReviewRelease} = params || {}

    const handlePushLog = useMemoizedFn((logInfo: AIChatLogData) => {
        pushLog && pushLog(logInfo)
    })

    const [elements, setElements, getElements] = useGetSetState<ReActChatRenderItem[]>([])
    const handleSetElements = useMemoizedFn((newElements: ReActChatRenderItem[]) => {
        setElements(newElements)
    })

    const getContentMap = useMemoizedFn((mapKey: string) => {
        const contentMap = getChatDataStore?.()?.casualChat?.contents
        if (!contentMap) return undefined
        return contentMap.get(mapKey)
    })
    const setContentMap = useMemoizedFn((mapKey: string, value: AIChatQSData) => {
        const contentMap = getChatDataStore?.()?.casualChat?.contents
        contentMap && contentMap.set(mapKey, value)
    })
    const deleteContentMap = useMemoizedFn((mapKey: string) => {
        const contentMap = getChatDataStore?.()?.casualChat?.contents
        contentMap && contentMap.delete(mapKey)
    })

    // #region review事件转换成UI处理逻辑
    const review = useRef<AIChatQSData>()

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
                chatType: "reAct",
                id: data.id,
                type: AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE,
                data: {
                    ...cloneDeep(data),
                    selected: isAuto ? JSON.stringify({suggestion: "continue"}) : undefined,
                    optionValue: isAuto ? "continue" : undefined
                }
            }
            review.current = isAuto ? undefined : chatData
            setContentMap(chatData.id, chatData)
            setElements((old) => [...old, {token: chatData.id, type: chatData.type, renderNum: 1, chatType: "reAct"}])
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
                chatType: "reAct",
                id: data.id,
                type: AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE,
                data: {
                    ...cloneDeep(data),
                    selected: isAuto ? JSON.stringify({suggestion: "continue"}) : undefined,
                    optionValue: isAuto ? "continue" : undefined
                }
            }
            review.current = isAuto ? undefined : chatData
            setContentMap(chatData.id, chatData)
            setElements((old) => [...old, {token: chatData.id, type: chatData.type, renderNum: 1, chatType: "reAct"}])
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
                handlePushLog(genErrorLogData(res.Timestamp, `${res.Type}数据异常: id:${data?.id || "-"}`))
                return
            }

            review.current = {
                ...genBaseAIChatData(res),
                chatType: "reAct",
                id: data.id,
                type: AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE,
                data: cloneDeep(data)
            }
            setContentMap(review.current.id, cloneDeep(review.current))
            setElements((old) => {
                const newArr = [...old]
                if (!review.current) return newArr
                newArr.push({token: review.current.id, type: review.current.type, renderNum: 1, chatType: "reAct"})
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
                handlePushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据异常: interactive_id:${score?.interactive_id || "-"}`
                    )
                )
                return
            }

            const {interactive_id} = score
            score.levelLabel = AIReviewJudgeLevelMap[score?.level || ""]?.label || undefined
            if (
                review.current &&
                (review.current.type === AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE ||
                    review.current.type === AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE)
            ) {
                if (
                    !review.current.data.aiReview ||
                    (review.current.data.aiReview && typeof review.current.data.aiReview.seconds === "undefined")
                ) {
                    review.current.data.aiReview = cloneDeep(score)
                }
            }

            const chatData = getContentMap(interactive_id)
            if (
                !!chatData &&
                (chatData.type === AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE ||
                    chatData.type === AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE)
            ) {
                if (
                    !chatData.data.aiReview ||
                    (chatData.data.aiReview && typeof chatData.data.aiReview.seconds === "undefined")
                ) {
                    // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
                    chatData.data.aiReview = cloneDeep(score)
                    setContentMap(chatData.id, chatData)
                    setElements((old) => {
                        return old.map((item) => {
                            if (item.token === chatData.id && item.type === chatData.type) {
                                item.renderNum += 1
                            }
                            return item
                        })
                    })
                }
            } else {
                handlePushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据(interactive_id:${score?.interactive_id || "-"})未找到对应review`
                    )
                )
            }
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
            review.current = undefined
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
            if (!isAuto) {
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
        chatType: "reAct",
        getContentMap,
        setContentMap,
        deleteContentMap,
        setElements,
        getElements,
        pushLog: handlePushLog,
        handleUnkData: handleSpecialData
    })
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

                const chatData = cloneDeep(review.current)
                review.current = undefined
                setContentMap(chatData.id, chatData)
                setElements((old) => {
                    return old.map((item) => {
                        if (item.token === chatData.id && item.type === chatData.type) {
                            item.renderNum += 1
                        }
                        return item
                    })
                })
            }

            if (IsFreeInput && FreeInput) {
                // 用户问题
                const chatData: AIChatQSData = {
                    id: uuidv4(),
                    chatType: "reAct",
                    type: AIChatQSDataTypeEnum.QUESTION,
                    Timestamp: Date.now(),
                    data: {qs: FreeInput || "", setting: request},
                    AIService: "",
                    AIModelName: "",
                    extraValue: extraValue
                }

                setContentMap(chatData.id, chatData)
                setElements((old) => [
                    ...old,
                    {token: chatData.id, type: chatData.type, renderNum: 1, chatType: "reAct"}
                ])
            }

            cb && cb()
        } catch (error) {}
    })

    const handleResetData = useMemoizedFn(() => {
        review.current = undefined
        chatContentEvent.handleResetData()
        setElements([])
    })

    const state: UseCasualChatState = useCreation(() => {
        return {elements}
    }, [elements])

    const events: UseCasualChatEvents = useCreation(() => {
        return {handleSetData, handleResetData, handleSend, handleSetElements}
    }, [])

    return [state, events] as const
}

export default useCasualChat
