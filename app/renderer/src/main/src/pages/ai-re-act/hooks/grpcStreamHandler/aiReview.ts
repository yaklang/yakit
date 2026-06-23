import type { AIMessageHandler, AIMessageHandlerParams } from '../type'
import type { AIAgentGrpcApi } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import {
  genBaseAIChatData,
  generateTaskNodeDataID,
  genErrorLogData,
  genExecTasks,
  isAutoExecuteReviewContinue,
} from '../utils'
import { type AIChatQSData, AIChatQSDataTypeEnum, type AIReviewType } from '../aiRender'
import cloneDeep from 'lodash/cloneDeep'
import { AIReviewJudgeLevelMap } from '../defaultConstant'

/** grpc流数据转换成错误信息输出到日志中 */
const handleErrorGRPCToLog: (
  /** 该条grpc流数据是历史数据 */
  isHistory: AIMessageHandlerParams['res']['IsSync'],
  pushLog: AIMessageHandlerParams['pushLog'],
  error: ReturnType<typeof genErrorLogData>,
) => void = (isHistory, pushLog, error) => {
  if (isHistory) return
  pushLog(error)
}

const handlePlanReviewRequire: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta, pushLog } = requestInfo
  if (res.Type !== 'plan_review_require') return
  // 历史数据-grpc流数据在任务规划下无效，不处理
  if (res.IsSync && chatType === 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequire
  if (!data?.id || !data?.plans || !data?.plans?.root_task || !data?.selectors || !data?.selectors?.length) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据异常: ${ipcContent}`))
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE,
    data: { ...cloneDeep(data) },
  }
  if (res.IsSync) {
    // 历史review数据，直接存入map里，等待review_release出现后渲染到UI上
    const target = meta.historyReviewReleaseID[data.id]
    if (target) {
      chatData.data.selected = JSON.stringify(target.params)
      chatData.data.optionValue = target.params?.suggestion || 'continue'
    }
    rawData.contents.set(chatData.id, cloneDeep(chatData))
    if (target) {
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
        },
        groupTokenGenerator: () => '',
      })
    }
    return
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: () => request })
  if (isAuto) {
    chatData.data.selected = JSON.stringify({ suggestion: 'continue' })
    chatData.data.optionValue = 'continue'
  }
  // 将数据存入hook里的缓存变量中
  if (!isAuto) meta.reviewData.set(chatData.id, cloneDeep(chatData))
  if (chatType === 'task') {
    // 该类型的实时数据只有任务规划才有
    if (isAuto) {
      rawData.contents.set(chatData.id, cloneDeep(chatData))
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
        },
        groupTokenGenerator: () => '',
      })
      const tasks = chatData.data
      const plans = genExecTasks(tasks.plans.root_task)
      store.getState().updatePlanTree({
        task_tree: cloneDeep(plans),
        root_task_name: tasks.plans.root_task.name,
      })
    } else {
      meta.currentPlanReviewId = ''
      store.getState().updateState({ currentPlanReviewData: cloneDeep(chatData) })
    }
  }
}
const handlePlanTaskAnalysis: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta, pushLog } = requestInfo
  if (res.Type !== 'plan_task_analysis') return
  // 历史数据-grpc流数据在任务规划下无效，不处理
  if (res.IsSync || chatType !== 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequireExtra
  const reviewDetail = meta.reviewData.get(data.plans_id)
  if (!reviewDetail || reviewDetail.type !== AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据异常: 未找到对应plan_review_require数据`),
    )
    return
  }

  if (
    !data?.plans_id ||
    !data?.index ||
    !data?.keywords?.length ||
    (meta.currentPlanReviewId && meta.currentPlanReviewId !== data.plans_id)
  ) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据异常: ${ipcContent}`))
    return
  }

  if (!meta.currentPlanReviewId) meta.currentPlanReviewId = data.plans_id
  const reviewInfo = reviewDetail.data
  if (!reviewInfo.taskExtra) reviewInfo.taskExtra = new Map()
  reviewInfo.taskExtra.set(data.index, data)

  const isAuto = isAutoExecuteReviewContinue({ getFunc: () => request })
  if (!isAuto) meta.planReviewExtraData.set(data.index, cloneDeep(data))
}

const handleTaskReviewRequire: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta, pushLog } = requestInfo
  if (res.Type !== 'task_review_require') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.TaskReviewRequire
  if (!data?.id || !data?.selectors || !data?.selectors?.length) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据异常: ${ipcContent}`))
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE,
    data: { ...cloneDeep(data) },
    taskIndex: generateTaskNodeDataID({
      chatType,
      planID: meta.currentTaskPlanID?.taskID,
      taskID: res.TaskIndex,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  if (res.IsSync) {
    // 历史review数据，直接存入map里，等待review_release出现后渲染到UI上
    const target = meta.historyReviewReleaseID[data.id]
    if (target) {
      chatData.data.selected = JSON.stringify(target.params)
      chatData.data.optionValue = target.params?.suggestion || 'continue'
    }
    rawData.contents.set(chatData.id, cloneDeep(chatData))
    if (target) {
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
        },
        groupTokenGenerator: () => '',
      })
    }
    return
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: () => request })
  if (isAuto) {
    chatData.data.selected = JSON.stringify({ suggestion: 'continue' })
    chatData.data.optionValue = 'continue'
  }
  // 将数据存入hook里的缓存变量中
  if (!isAuto) meta.reviewData.set(chatData.id, cloneDeep(chatData))
  if (chatType === 'task') {
    if (isAuto) {
      rawData.contents.set(chatData.id, cloneDeep(chatData))
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
        },
        groupTokenGenerator: () => '',
      })
    } else {
      // 有问题，需要调整
      store.getState().updateState({ currentPlanReviewData: cloneDeep(chatData) })
    }
  } else if (chatType === 'reAct') {
    rawData.contents.set(chatData.id, cloneDeep(chatData))
    store.getState().dispatchStreamingNode({
      chatType: chatType,
      node: {
        token: chatData.id,
        kind: 'item',
        type: chatData.type,
        dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
      },
      groupTokenGenerator: () => '',
    })
  }
}

const handleToolReview: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta, pushLog } = requestInfo
  if (res.Type !== 'tool_use_review_require') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolUseReviewRequire
  if (!data?.id || !data?.selectors || !data?.selectors?.length) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据异常: ${ipcContent}`))
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE,
    data: { ...cloneDeep(data) },
    taskIndex: generateTaskNodeDataID({
      chatType,
      planID: meta.currentTaskPlanID?.taskID,
      taskID: res.TaskIndex,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  if (res.IsSync) {
    // 历史review数据，直接存入map里，等待review_release出现后渲染到UI上
    const target = meta.historyReviewReleaseID[data.id]
    if (target) {
      chatData.data.selected = JSON.stringify(target.params)
      chatData.data.optionValue = target.params?.suggestion || 'continue'
    }
    rawData.contents.set(chatData.id, cloneDeep(chatData))
    if (target) {
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        parentTaskId: chatData.taskIndex,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
        },
        groupTokenGenerator: () => '',
      })
    }
    return
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: () => request })
  if (isAuto) {
    chatData.data.selected = JSON.stringify({ suggestion: 'continue' })
    chatData.data.optionValue = 'continue'
  }
  // 将数据存入hook里的缓存变量中
  if (!isAuto) meta.reviewData.set(chatData.id, cloneDeep(chatData))
  if (chatType === 'task') {
    if (isAuto) {
      rawData.contents.set(chatData.id, cloneDeep(chatData))
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
        },
        groupTokenGenerator: () => '',
      })
    } else {
      // 有问题，需要调整
      store.getState().updateState({ currentPlanReviewData: cloneDeep(chatData) })
    }
  } else if (chatType === 'reAct') {
    rawData.contents.set(chatData.id, cloneDeep(chatData))
    store.getState().dispatchStreamingNode({
      chatType: chatType,
      node: {
        token: chatData.id,
        kind: 'item',
        type: chatData.type,
        dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
      },
      groupTokenGenerator: () => '',
    })
  }
}

const handleUserInteractive: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta, pushLog } = requestInfo
  if (res.Type !== 'require_user_interactive') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewRequire
  if (!data?.id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据异常: ${ipcContent}`))
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE,
    data: cloneDeep(data),
    taskIndex: generateTaskNodeDataID({
      chatType,
      planID: meta.currentTaskPlanID?.taskID,
      taskID: res.TaskIndex,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  if (res.IsSync) {
    // 历史review数据，直接存入map里，等待review_release出现后渲染到UI上
    const target = meta.historyReviewReleaseID[data.id]
    if (target) {
      chatData.data.selected = JSON.stringify(target.params)
      chatData.data.optionValue = target.params?.suggestion || 'continue'
    }
    rawData.contents.set(chatData.id, cloneDeep(chatData))
    if (target) {
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        parentTaskId: chatData.taskIndex,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
        },
        groupTokenGenerator: () => '',
      })
    }
    return
  }

  // 将数据存入hook里的缓存变量中
  meta.reviewData.set(chatData.id, cloneDeep(chatData))
  if (chatType === 'task') {
    // 有问题，需要调整
    store.getState().updateState({ currentPlanReviewData: cloneDeep(chatData) })
  } else if (chatType === 'reAct') {
    rawData.contents.set(chatData.id, cloneDeep(chatData))
    store.getState().dispatchStreamingNode({
      chatType: chatType,
      node: {
        token: chatData.id,
        kind: 'item',
        type: chatData.type,
        dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
      },
      groupTokenGenerator: () => '',
    })
  }
}

const handleAIForgeReviewRequire: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta, pushLog } = requestInfo
  // 任务规划不存在该类型数据
  if (chatType === 'task') return
  if (res.Type !== 'exec_aiforge_review_require') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ExecForgeReview
  if (!data?.id || !data?.selectors || !data?.selectors?.length) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据异常: ${ipcContent}`))
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE,
    data: { ...cloneDeep(data) },
    taskIndex: generateTaskNodeDataID({
      chatType,
      planID: meta.currentTaskPlanID?.taskID,
      taskID: res.TaskIndex,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  if (res.IsSync) {
    // 历史review数据，直接存入map里，等待review_release出现后渲染到UI上
    const target = meta.historyReviewReleaseID[data.id]
    if (target) {
      chatData.data.selected = JSON.stringify(target.params)
      chatData.data.optionValue = target.params?.suggestion || 'continue'
    }
    rawData.contents.set(chatData.id, cloneDeep(chatData))
    if (target) {
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        parentTaskId: chatData.taskIndex,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
        },
        groupTokenGenerator: () => '',
      })
    }
    return
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: () => request })
  if (isAuto) {
    chatData.data.selected = JSON.stringify({ suggestion: 'continue' })
    chatData.data.optionValue = 'continue'
  }
  // 将数据存入hook里的缓存变量中
  if (!isAuto) meta.reviewData.set(chatData.id, cloneDeep(chatData))
  rawData.contents.set(chatData.id, cloneDeep(chatData))
  store.getState().dispatchStreamingNode({
    chatType: chatType,
    parentTaskId: chatData.taskIndex,
    node: {
      token: chatData.id,
      kind: 'item',
      type: chatData.type,
      dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
    },
    groupTokenGenerator: () => '',
  })
}

const handleAIReviewJudgement: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta, pushLog } = requestInfo
  if (!['ai_review_start', 'ai_review_countdown', 'ai_review_end'].includes(res.Type)) return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const score = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewJudgement
  const reviewDetail = meta.reviewData.get(score.interactive_id)
  if (!reviewDetail || reviewDetail.id !== score.interactive_id) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据异常: 没有对应的review数据`),
    )
    return
  }
  if (!score?.interactive_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据异常: ${ipcContent}`))
    return
  }

  score.levelLabel = AIReviewJudgeLevelMap[score?.level || '']?.label || undefined
  if (chatType === 'task') {
    if (reviewDetail.type !== AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(
          res.Timestamp,
          `${res.Type}数据异常(interactive_id:${score?.interactive_id || '-'})未找到对应review`,
        ),
      )
      return
    }

    if (
      !reviewDetail.data.aiReview ||
      (reviewDetail.data.aiReview && typeof reviewDetail.data.aiReview.seconds === 'undefined')
    ) {
      // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
      reviewDetail.data.aiReview = cloneDeep(score)
    }
    const isAuto = isAutoExecuteReviewContinue({ getFunc: () => request })
    if (!isAuto) store.getState().incrementNodeVersion(reviewDetail.id, 'item')
  } else if (chatType === 'reAct') {
    if (
      reviewDetail.type === AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE ||
      reviewDetail.type === AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE
    ) {
      if (
        !reviewDetail.data.aiReview ||
        (reviewDetail.data.aiReview && typeof reviewDetail.data.aiReview.seconds === 'undefined')
      ) {
        reviewDetail.data.aiReview = cloneDeep(score)
      }
    }

    const chatData = rawData.contents.get(score.interactive_id)
    if (
      chatData &&
      (chatData.type === AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE ||
        chatData.type === AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE)
    ) {
      if (
        !chatData.data.aiReview ||
        (chatData.data.aiReview && typeof chatData.data.aiReview.seconds === 'undefined')
      ) {
        // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
        chatData.data.aiReview = cloneDeep(score)
        store.getState().incrementNodeVersion(reviewDetail.id, 'item')
      }
    } else {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(
          res.Timestamp,
          `${res.Type}数据(interactive_id:${score?.interactive_id || '-'})未找到对应review`,
        ),
      )
    }
  }
}

const handleReviewRelease: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta, pushLog } = requestInfo
  if (res.Type !== 'review_release') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReviewRelease
  if (!data?.id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据异常: ${ipcContent}`))
    return
  }

  if (res.IsSync) {
    const reviewDetail = rawData.contents.get(data.id)
    if (!reviewDetail) {
      meta.historyReviewReleaseID[data.id] = data
      return
    }
    switch (reviewDetail.type) {
      case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
      case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
        reviewDetail.data.selected = JSON.stringify(data.params)
        reviewDetail.data.optionValue = data.params?.suggestion || 'continue'
        store.getState().incrementNodeVersion(reviewDetail.id, 'item')
        return
    }
  } else {
    const reviewDetail = meta.reviewData.get(data.id)
    if (!reviewDetail) return

    const reviewInfo = cloneDeep(reviewDetail?.data) as AIReviewType
    if (reviewInfo?.id !== data.id) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(
          res.Timestamp,
          `${res.Type}数据(id:${data?.id || '-'})和当前展示review数据(id:${reviewInfo?.id || '-'})不匹配`,
        ),
      )
      return
    }

    reviewInfo.selected = JSON.stringify({ suggestion: 'continue' })
    reviewInfo.optionValue = 'continue'
    const chatData: AIChatQSData = {
      ...reviewDetail,
      data: reviewInfo as any,
    }
    meta.reviewData.delete(data.id)
    if (chatType === 'task') {
      meta.currentPlanReviewId = ''
      // review自动释放后，还需进行的额外逻辑处理
      if (reviewDetail.type === AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE) {
        const tasks = reviewDetail.data
        const plans = genExecTasks(tasks.plans.root_task)
        store.getState().updatePlanTree({
          task_tree: cloneDeep(plans),
          root_task_name: tasks.plans.root_task.name,
        })
      }
    }
    rawData.contents.set(chatData.id, cloneDeep(chatData))
    store.getState().dispatchStreamingNode({
      chatType: chatType,
      node: {
        token: chatData.id,
        kind: 'item',
        type: chatData.type,
        dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
      },
      groupTokenGenerator: () => '',
    })

    // 是否要释放掉控制review弹窗的状态变量???
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
} as const
