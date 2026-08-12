import type { AIMessageHandler } from '../type'
import type { AIAgentGrpcApi, AIInputEvent } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { genBaseAIChatData, generateTaskNodeDataID, genExecTasks, isAutoExecuteReviewContinue } from '../utils'
import { type AIChatQSData, AIChatQSDataTypeEnum } from '../aiRender'
import cloneDeep from 'lodash/cloneDeep'
import { AIReviewJudgeLevelMap } from '../defaultConstant'

const handlePlanReviewRequire: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request } = requestInfo
  if (res.Type !== 'plan_review_require') return
  if (res.IsSync || chatType !== 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequire
  if (!data?.id || !data?.plans || !data?.plans?.root_task || !data?.selectors || !data?.selectors?.length) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: () => request })
  // 该类型的实时数据只有任务规划才有
  if (isAuto) {
    const plans = genExecTasks(data.plans.root_task)
    store.getState().updatePlanTree({
      task_tree: cloneDeep(plans),
      root_task_name: data.plans.root_task.name,
    })
  } else {
    // 弹框展示, 将数据存入hook里的缓存变量中
    const chatData: AIChatQSData = {
      ...genBaseAIChatData(res),
      chatType: chatType,
      id: data.id,
      type: AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE,
      data: { ...cloneDeep(data) },
    }
    rawData.contents.set(chatData.id, cloneDeep(chatData))
    store.getState().updateState({ currentReviewDetail: { token: chatData.id, renderNum: 0 } })
  }
}
const handlePlanTaskAnalysis: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta } = requestInfo
  if (res.Type !== 'plan_task_analysis') return
  // 历史数据-grpc流数据在任务规划下无效，不处理
  if (res.IsSync || chatType !== 'task') return

  const reviewStore = store.getState().currentReviewDetail
  const reviewDetail = rawData.contents.get(reviewStore.token)
  if (!reviewStore.token || reviewDetail?.type !== AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequireExtra
  if (
    !data?.plans_id ||
    !data?.task_id ||
    !data?.keywords?.length ||
    (meta.currentPlanReviewExtraId && meta.currentPlanReviewExtraId !== data.plans_id)
  ) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  if (!meta.currentPlanReviewExtraId) meta.currentPlanReviewExtraId = data.plans_id
  const reviewInfo = reviewDetail.data
  if (!reviewInfo.taskExtra) reviewInfo.taskExtra = new Map()
  reviewInfo.taskExtra.set(data.task_id, data)

  const isAuto = isAutoExecuteReviewContinue({ getFunc: () => request })
  if (!isAuto) {
    meta.planReviewExtraData.set(data.task_id, cloneDeep(data))
    store.getState().updateStateCount('currentPlanReviewExtraUpdate')
  }
}

const handleTaskReviewRequire: AIMessageHandler = (requestInfo) => {
  const { res, chatType, request, sendRequest } = requestInfo
  if (res.Type !== 'task_review_require') return
  if (res.IsSync) return
  // 实时数据-没有task_review类型
  if (chatType !== 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.TaskReviewRequire
  if (!data?.id || !data?.selectors || !data?.selectors?.length) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: () => request })
  // 实时数据-(自由对话|任务规划)的 review 自动执行，并且不展示在UI上
  if (isAuto) return

  // 任务规划下，task_review在非yolo模式时，自动执行continue操作，并且不在UI上展示操作结果
  const info: AIInputEvent = {
    IsInteractiveMessage: true,
    InteractiveId: data.id,
    InteractiveJSONInput: JSON.stringify({ suggestion: 'continue' }),
  }
  sendRequest(info)
}

const handleToolReview: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, sendRequest } = requestInfo
  if (res.Type !== 'tool_use_review_require') return
  // 历史数据-tool-review数据不进行展示
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolUseReviewRequire
  if (!data?.id || !data?.selectors || !data?.selectors?.length) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE,
    data: { ...cloneDeep(data) },
    TaskId: generateTaskNodeDataID({
      chatType,
      planID: store.getState().currentChatStatus.questionID,
      taskID: res.TaskId,
      isExist: (key) => rawData.contents.has(key),
    }),
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: () => request })
  // 实时数据-(自由对话|任务规划)的 review 自动执行，并且不展示在UI上
  if (isAuto) return

  if (chatType === 'task') {
    // 任务规划下，tool_review在非yolo模式时，自动执行continue操作，并且不在UI上展示操作结果
    const info: AIInputEvent = {
      IsInteractiveMessage: true,
      InteractiveId: chatData.id,
      InteractiveJSONInput: JSON.stringify({ suggestion: 'continue' }),
    }
    sendRequest(info)
  } else {
    const taskGroupDetail = rawData.contents.get(chatData.TaskId || '')
    // 自由对话下，如果属于执行任务组里的task_review，在任何review模式下，后端都会自动执行continue操作，并且不在UI上展示操作结果
    // 非执行任务组的review，正常显示到UI上，根据review模式和用户主动操作，决定结果，并且操作后，也不在UI上展示结果
    if (!taskGroupDetail || taskGroupDetail.type !== AIChatQSDataTypeEnum.TASK_NODE_GROUP) {
      rawData.contents.set(chatData.id, cloneDeep(chatData))
      // 操作后会从列表删除，展示态不落库
      store.getState().updateState({ currentReviewDetail: { token: chatData.id, renderNum: 0 } })
    }
  }
}

const handleUserInteractive: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData } = requestInfo
  if (res.Type !== 'require_user_interactive') return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewRequire
  if (!data?.id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE,
    data: cloneDeep(data),
    TaskId: generateTaskNodeDataID({
      chatType,
      planID: store.getState().currentChatStatus.questionID,
      taskID: res.TaskId,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  // 将数据存入hook里的缓存变量中
  rawData.contents.set(chatData.id, cloneDeep(chatData))
  store.getState().updateState({ currentReviewDetail: { token: chatData.id, renderNum: 0 } })
}

const handleAIForgeReviewRequire: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request } = requestInfo
  if (res.Type !== 'exec_aiforge_review_require') return
  if (res.IsSync) return
  // 任务规划不存在该类型数据
  if (chatType === 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ExecForgeReview
  if (!data?.id || !data?.selectors || !data?.selectors?.length) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: () => request })
  if (isAuto) return

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE,
    data: { ...cloneDeep(data) },
    TaskId: generateTaskNodeDataID({
      chatType,
      planID: store.getState().currentChatStatus.questionID,
      taskID: res.TaskId,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  rawData.contents.set(chatData.id, cloneDeep(chatData))
  store.getState().updateState({ currentReviewDetail: { token: chatData.id, renderNum: 0 } })
}

const handleAIReviewJudgement: AIMessageHandler = (requestInfo) => {
  const { res, store, rawData } = requestInfo
  if (!['ai_review_start', 'ai_review_countdown', 'ai_review_end'].includes(res.Type)) return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const score = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewJudgement
  if (!score?.interactive_id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }
  const reviewDetail = rawData.contents.get(score.interactive_id)
  if (!reviewDetail || reviewDetail.id !== score.interactive_id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: 没有对应的review数据` })
    return
  }

  score.levelLabel = AIReviewJudgeLevelMap[score?.level || '']?.label || undefined

  switch (reviewDetail.type) {
    case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
    case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
      {
        if (
          !reviewDetail.data.aiReview ||
          (reviewDetail.data.aiReview && typeof reviewDetail.data.aiReview.seconds === 'undefined')
        ) {
          // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
          reviewDetail.data.aiReview = cloneDeep(score)
        }
        const reviewStore = store.getState().currentReviewDetail
        reviewStore.renderNum += 1
        store.getState().updateState({ currentReviewDetail: { ...reviewStore } })
      }
      break

    default:
      requestInfo.pushLog({
        level: 'error',
        message: `${res.Type}数据异常(interactive_id:${score?.interactive_id || '-'})未找到对应review`,
      })
      break
  }
}

const handleReviewRelease: AIMessageHandler = (requestInfo) => {
  const { res, store, rawData, meta } = requestInfo
  if (res.Type !== 'review_release') return
  // 历史数据
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReviewRelease
  if (!data?.id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  const reviewDetail = rawData.contents.get(data.id)

  if (!reviewDetail) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据(id:${data?.id || '-'})没有对应的review数据` })
    return
  }
  const noReview = store.getState().currentReviewDetail.token !== reviewDetail.id
  if (noReview) return
  // 实时数据
  switch (reviewDetail.type) {
    case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
      {
        // 清空plan-review的异步拓展信息
        meta.currentPlanReviewExtraId = ''
        meta.planReviewExtraData.clear()
        // 生成执行的任务树并更新到UI上
        const tasks = reviewDetail.data
        const plans = genExecTasks(tasks.plans.root_task)
        store.getState().updatePlanTree({
          task_tree: cloneDeep(plans),
          root_task_name: tasks.plans.root_task.name,
        })
      }
      break

    default:
      break
  }
  rawData.contents.delete(reviewDetail.id)
  store.getState().updateState({ currentReviewDetail: { token: '', renderNum: 0 } })
}

const handleDetachedPlanReview: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData } = requestInfo
  if (res.Type !== 'detached_plan_require' || res.NodeId !== 'detached-plan') return

  // 历史数据-grpc流数据在任务规划下无效，不处理
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.DetachedPlanRequire
  if (!data?.id || !data?.plans?.root_task || !data?.selectors?.length) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  const reviewDetail = rawData.contents.get(data.id)
  if (reviewDetail) {
    if (reviewDetail.type !== AIChatQSDataTypeEnum.DETACHED_PLAN_REQUIRE) return
    reviewDetail.data = { ...data }
    // 弹窗展示态不落库，操作完成（release）后再写
    const reviewStore = store.getState().currentReviewDetail
    reviewStore.renderNum += 1
    store.getState().updateState({ currentReviewDetail: { ...reviewStore } })
  } else {
    const chatData: AIChatQSData = {
      ...genBaseAIChatData(res),
      chatType: chatType,
      id: data.id,
      type: AIChatQSDataTypeEnum.DETACHED_PLAN_REQUIRE,
      data: { ...cloneDeep(data) },
      TaskId: generateTaskNodeDataID({
        chatType: chatType,
        planID: store.getState().currentChatStatus.questionID,
        taskID: res.TaskId,
        isExist: (key) => rawData.contents.has(key),
      }),
    }
    if (chatType === 'reAct') {
      rawData.contents.set(chatData.id, cloneDeep(chatData))
      store.getState().updateState({ currentReviewDetail: { token: chatData.id, renderNum: 0 } })
    }
  }
}

export const aiReviewDataHandlers = {
  plan_review_require: handlePlanReviewRequire,
  plan_task_analysis: handlePlanTaskAnalysis,
  task_review_require: handleTaskReviewRequire,
  tool_use_review_require: handleToolReview,
  require_user_interactive: handleUserInteractive,
  exec_aiforge_review_require: handleAIForgeReviewRequire,
  ai_review_start: handleAIReviewJudgement,
  ai_review_countdown: handleAIReviewJudgement,
  ai_review_end: handleAIReviewJudgement,
  review_release: handleReviewRelease,
  detached_plan_require: handleDetachedPlanReview,
} as const
