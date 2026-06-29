import type { AIMessageHandler } from '../type'
import type { AIAgentGrpcApi } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import {
  genBaseAIChatData,
  generateTaskNodeDataID,
  pushLogToOtherWindow,
  genExecTasks,
  isAutoExecuteReviewContinue,
} from '../utils'
import { type AIChatQSData, AIChatQSDataTypeEnum } from '../aiRender'
import cloneDeep from 'lodash/cloneDeep'
import { AIReviewJudgeLevelMap } from '../defaultConstant'

const handlePlanReviewRequire: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta } = requestInfo
  if (res.Type !== 'plan_review_require') return
  // 历史数据-grpc流数据在任务规划下无效，不处理
  if (res.IsSync && chatType === 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequire
  if (!data?.id || !data?.plans || !data?.plans?.root_task || !data?.selectors || !data?.selectors?.length) {
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据异常: ${ipcContent}`,
    })
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
  if (chatType !== 'task') return
  // 将数据存入hook里的缓存变量中
  rawData.contents.set(chatData.id, cloneDeep(chatData))
  // 该类型的实时数据只有任务规划才有
  if (isAuto) {
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
    store.getState().updateState({ currentPlanReviewToken: chatData.id })
  }
}
const handlePlanTaskAnalysis: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta } = requestInfo
  if (res.Type !== 'plan_task_analysis') return
  // 历史数据-grpc流数据在任务规划下无效，不处理
  if (res.IsSync || chatType !== 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequireExtra
  if (
    !data?.plans_id ||
    !data?.index ||
    !data?.keywords?.length ||
    (meta.currentPlanReviewExtraId && meta.currentPlanReviewExtraId !== data.plans_id)
  ) {
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据异常: ${ipcContent}`,
    })
    return
  }

  const reviewDetail = rawData.contents.get(store.getState().currentPlanReviewToken)
  if (!reviewDetail || reviewDetail.type !== AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE) {
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据异常: 未找到对应plan_review_require数据`,
    })
    return
  }

  if (!meta.currentPlanReviewExtraId) meta.currentPlanReviewExtraId = data.plans_id
  const reviewInfo = reviewDetail.data
  if (!reviewInfo.taskExtra) reviewInfo.taskExtra = new Map()
  reviewInfo.taskExtra.set(data.index, data)

  const isAuto = isAutoExecuteReviewContinue({ getFunc: () => request })
  if (!isAuto) {
    meta.planReviewExtraData.set(data.index, cloneDeep(data))
    store.getState().updateStateCount('currentPlanReviewExtraUpdate')
  }
}

const handleTaskReviewRequire: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta } = requestInfo
  if (res.Type !== 'task_review_require') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.TaskReviewRequire
  if (!data?.id || !data?.selectors || !data?.selectors?.length) {
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据异常: ${ipcContent}`,
    })
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
  // 历史数据-task-review数据不进行展示
  if (res.IsSync) return

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: () => request })
  if (isAuto) {
    chatData.data.selected = JSON.stringify({ suggestion: 'continue' })
    chatData.data.optionValue = 'continue'
  }
  // 实时数据-task-review-自动执行，不展示在UI上
  if (isAuto) return

  // 将数据存入hook里的缓存变量中
  rawData.contents.set(chatData.id, cloneDeep(chatData))
  if (chatType === 'task') {
    // 实时-任务规划里, 自动请求执行
    // const info: AIInputEvent = {
    //   IsInteractiveMessage: true,
    //   InteractiveId: chatData.id,
    //   InteractiveJSONInput: JSON.stringify({ suggestion: 'continue' }),
    // }
    // sendRequest(info)
    // rawData.contents.delete(chatData.id)
    store.getState().updateState({ currentPlanReviewToken: chatData.id })
  } else if (chatType === 'reAct') {
    store.getState().updateCasualReview(chatData.id, 'add')
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
  const { res, chatType, store, rawData, request, meta } = requestInfo
  if (res.Type !== 'tool_use_review_require') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolUseReviewRequire
  if (!data?.id || !data?.selectors || !data?.selectors?.length) {
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据异常: ${ipcContent}`,
    })
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
  // 历史数据-task-review数据不进行展示
  if (res.IsSync) return

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: () => request })
  if (isAuto) {
    chatData.data.selected = JSON.stringify({ suggestion: 'continue' })
    chatData.data.optionValue = 'continue'
  }
  // 实时数据-task-review-自动执行，不展示在UI上
  if (isAuto) return

  // 将数据存入hook里的缓存变量中
  rawData.contents.set(chatData.id, cloneDeep(chatData))
  if (chatType === 'task') {
    // 后面要改成自动请求执行
    // const info: AIInputEvent = {
    //   IsInteractiveMessage: true,
    //   InteractiveId: chatData.id,
    //   InteractiveJSONInput: JSON.stringify({ suggestion: 'continue' }),
    // }
    // sendRequest(info)
    // rawData.contents.delete(chatData.id)
    store.getState().updateState({ currentPlanReviewToken: chatData.id })
  } else if (chatType === 'reAct') {
    store.getState().updateCasualReview(chatData.id, 'add')
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
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'require_user_interactive') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewRequire
  if (!data?.id) {
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据异常: ${ipcContent}`,
    })
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
  rawData.contents.set(chatData.id, cloneDeep(chatData))
  if (chatType === 'task') {
    store.getState().updateState({ currentPlanReviewToken: chatData.id })
  } else if (chatType === 'reAct') {
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
  const { res, chatType, store, rawData, request, meta } = requestInfo
  if (res.Type !== 'exec_aiforge_review_require') return
  // 任务规划不存在该类型数据
  if (chatType === 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ExecForgeReview
  if (!data?.id || !data?.selectors || !data?.selectors?.length) {
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据异常: ${ipcContent}`,
    })
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
  const { res, store, rawData } = requestInfo
  if (!['ai_review_start', 'ai_review_countdown', 'ai_review_end'].includes(res.Type)) return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const score = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewJudgement
  if (!score?.interactive_id) {
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据异常: ${ipcContent}`,
    })
    return
  }
  const reviewDetail = rawData.contents.get(score.interactive_id)
  if (!reviewDetail || reviewDetail.id !== score.interactive_id) {
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据异常: 没有对应的review数据`,
    })
    return
  }

  score.levelLabel = AIReviewJudgeLevelMap[score?.level || '']?.label || undefined

  switch (reviewDetail.type) {
    case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
    case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
      if (
        !reviewDetail.data.aiReview ||
        (reviewDetail.data.aiReview && typeof reviewDetail.data.aiReview.seconds === 'undefined')
      ) {
        // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
        reviewDetail.data.aiReview = cloneDeep(score)
      }
      store.getState().incrementNodeVersion(reviewDetail.id, 'item')
      break

    default:
      pushLogToOtherWindow({
        sessionId: requestInfo.sessionId,
        isHistory: res.IsSync,
        Timestamp: res.Timestamp,
        level: 'error',
        message: `${res.Type}数据异常(interactive_id:${score?.interactive_id || '-'})未找到对应review`,
      })
      break
  }
}

const handleReviewRelease: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'review_release') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReviewRelease
  if (!data?.id) {
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据异常: ${ipcContent}`,
    })
    return
  }

  const reviewDetail = rawData.contents.get(data.id)

  if (res.IsSync) {
    if (!reviewDetail) {
      meta.historyReviewReleaseID[data.id] = data
      return
    }
    switch (reviewDetail.type) {
      case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
        reviewDetail.data.selected = JSON.stringify(data.params)
        reviewDetail.data.optionValue = data.params?.suggestion || 'continue'
        store.getState().dispatchStreamingNode({
          chatType: chatType,
          node: {
            token: reviewDetail.id,
            kind: 'item',
            type: reviewDetail.type,
            dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
          },
          groupTokenGenerator: () => '',
        })
        break
      case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
        // 历史数据还没有渲染在UI上，所以不需要从UI中删除的逻辑
        rawData.contents.delete(reviewDetail.id)
        break
      default:
        break
    }

    return
  }

  if (!reviewDetail) {
    pushLogToOtherWindow({
      sessionId: requestInfo.sessionId,
      isHistory: res.IsSync,
      Timestamp: res.Timestamp,
      level: 'error',
      message: `${res.Type}数据(id:${data?.id || '-'})没有对应的review数据`,
    })
    return
  }
  switch (reviewDetail.type) {
    case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
      reviewDetail.data.selected = JSON.stringify(data.params)
      reviewDetail.data.optionValue = data.params?.suggestion || 'continue'
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
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        node: {
          token: reviewDetail.id,
          kind: 'item',
          type: reviewDetail.type,
          dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
        },
        groupTokenGenerator: () => '',
      })
      break
    case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
    case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
      reviewDetail.data.selected = JSON.stringify(data.params)
      reviewDetail.data.optionValue = data.params?.suggestion || 'continue'
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        node: {
          token: reviewDetail.id,
          kind: 'item',
          type: reviewDetail.type,
          dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
        },
        groupTokenGenerator: () => '',
      })
      break
    case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
    case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
      let isDelete = false
      if (chatType === 'reAct') {
        isDelete = store.getState().currentCasualReview.includes(reviewDetail.id)
        store.getState().updateCasualReview(reviewDetail.id, 'remove')
      } else if (chatType === 'task') {
        isDelete = store.getState().currentPlanReviewToken === reviewDetail.id
        store.getState().updateState({ currentPlanReviewToken: '' })
      }
      if (isDelete) {
        rawData.contents.delete(reviewDetail.id)
        store.getState().deleteListElement(chatType, reviewDetail.id)
      }
      break
    default:
      break
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
