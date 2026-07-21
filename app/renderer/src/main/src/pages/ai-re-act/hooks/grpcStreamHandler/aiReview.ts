import type { AIMessageHandler } from '../type'
import type { AIAgentGrpcApi, AIInputEvent } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { genBaseAIChatData, generateTaskNodeDataID, genExecTasks, isAutoExecuteReviewContinue } from '../utils'
import { type AIChatQSData, AIChatQSDataTypeEnum } from '../aiRender'
import cloneDeep from 'lodash/cloneDeep'
import { AIReviewJudgeLevelMap } from '../defaultConstant'

const handlePlanReviewRequire: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, request, meta } = requestInfo
  if (res.Type !== 'plan_review_require') return
  // 历史数据-grpc流数据在任务规划下无效，不处理
  if ((res.IsSync && chatType === 'task') || (!res.IsSync && chatType !== 'task')) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequire
  if (!data?.id || !data?.plans || !data?.plans?.root_task || !data?.selectors || !data?.selectors?.length) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE,
    data: { ...cloneDeep(data) },
    TaskId: meta.currentTaskPlanID?.taskID ? `${meta.currentTaskPlanID.taskID}-default` : undefined,
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
        parentTaskId: chatData.TaskId,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          isHistory: true,
        },
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
  // 该类型的实时数据只有任务规划才有
  if (isAuto) {
    store.getState().dispatchStreamingNode({
      chatType: chatType,
      parentTaskId: chatData.TaskId,
      node: {
        token: chatData.id,
        kind: 'item',
        type: chatData.type,
      },
    })
    const tasks = chatData.data
    const plans = genExecTasks(tasks.plans.root_task)
    store.getState().updatePlanTree({
      task_tree: cloneDeep(plans),
      root_task_name: tasks.plans.root_task.name,
    })
  } else {
    store.getState().updateState({ currentPlanReviewToken: { token: chatData.id, renderNum: 0 } })
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
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  if (!store.getState().currentPlanReviewToken.token) return
  const reviewDetail = rawData.contents.get(store.getState().currentPlanReviewToken.token)
  if (!reviewDetail || reviewDetail.type !== AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: 未找到对应plan_review_require数据` })
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
  const { res, chatType, request, sendRequest } = requestInfo
  if (res.Type !== 'task_review_require') return
  // 实时数据-没有task_review类型
  if (!res.IsSync && chatType !== 'task') return
  // 历史数据-task-review数据不进行展示
  if (res.IsSync) return

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
  const { res, chatType, store, rawData, meta, request, sendRequest } = requestInfo
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
      planID: chatType === 'reAct' ? store.getState().currentCasualTaskID : meta.currentTaskPlanID?.taskID,
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
      store.getState().updateCasualReview(chatData.id, 'add')
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        parentTaskId: chatData.TaskId,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
        },
      })
    }
  }
}

const handleUserInteractive: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'require_user_interactive') return

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
      planID: chatType === 'reAct' ? store.getState().currentCasualTaskID : meta.currentTaskPlanID?.taskID,
      taskID: res.TaskId,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  // 历史数据
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
        parentTaskId: chatData.TaskId,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          isHistory: true,
        },
      })
    }
    return
  }

  // 将数据存入hook里的缓存变量中
  rawData.contents.set(chatData.id, cloneDeep(chatData))
  if (chatType === 'task') {
    store.getState().updateState({ currentPlanReviewToken: { token: chatData.id, renderNum: 0 } })
  } else if (chatType === 'reAct') {
    store.getState().updateCasualReview(chatData.id, 'add')
    store.getState().dispatchStreamingNode({
      chatType: chatType,
      parentTaskId: chatData.TaskId,
      node: {
        token: chatData.id,
        kind: 'item',
        type: chatData.type,
      },
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
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    id: data.id,
    type: AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE,
    data: { ...cloneDeep(data) },
    TaskId: generateTaskNodeDataID({
      chatType,
      planID: chatType === 'reAct' ? store.getState().currentCasualTaskID : meta.currentTaskPlanID?.taskID,
      taskID: res.TaskId,
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
        parentTaskId: chatData.TaskId,
        node: {
          token: chatData.id,
          kind: 'item',
          type: chatData.type,
          isHistory: true,
        },
      })
    }
    return
  }

  // 实时数据处理逻辑
  const isAuto = isAutoExecuteReviewContinue({ type: res.Type, getFunc: () => request })
  if (isAuto) {
    chatData.data.selected = JSON.stringify({ suggestion: 'continue' })
    chatData.data.optionValue = 'continue'
  } else {
    store.getState().updateCasualReview(chatData.id, 'add')
  }
  // 将数据存入hook里的缓存变量中
  rawData.contents.set(chatData.id, cloneDeep(chatData))
  store.getState().dispatchStreamingNode({
    chatType: chatType,
    parentTaskId: chatData.TaskId,
    node: {
      token: chatData.id,
      kind: 'item',
      type: chatData.type,
    },
  })
}

const handleAIReviewJudgement: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData } = requestInfo
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
      if (
        !reviewDetail.data.aiReview ||
        (reviewDetail.data.aiReview && typeof reviewDetail.data.aiReview.seconds === 'undefined')
      ) {
        // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
        reviewDetail.data.aiReview = cloneDeep(score)
      }
      if (chatType === 'reAct') {
        store.getState().incrementNodeVersion(reviewDetail.id, 'item')
      } else {
        const reviewStore = store.getState().currentPlanReviewToken
        reviewStore.renderNum += 1
        store.getState().updateState({ currentPlanReviewToken: { ...reviewStore } })
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
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'review_release') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReviewRelease
  if (!data?.id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  const reviewDetail = rawData.contents.get(data.id)

  // 历史数据
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
          parentTaskId: reviewDetail.TaskId,
          node: {
            token: reviewDetail.id,
            kind: 'item',
            type: reviewDetail.type,
            isHistory: true,
          },
        })
        break
      case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
        // 历史数据-不展示，直接跳过处理逻辑
        break
      default:
        break
    }

    return
  }

  if (!reviewDetail) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据(id:${data?.id || '-'})没有对应的review数据` })
    return
  }
  // 任务规划下没有该review
  const noTaskReview =
    !store.getState().currentPlanReviewToken.token || store.getState().currentPlanReviewToken.token !== reviewDetail.id
  // 自由对话下没有该review
  const noCasualReview = !store.getState().currentCasualReview.includes(reviewDetail.id)

  // 实时数据
  switch (reviewDetail.type) {
    case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
      if (noTaskReview) return

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
      // 将操作记录渲染到列表上
      store.getState().dispatchStreamingNode({
        chatType: chatType,
        node: {
          token: reviewDetail.id,
          kind: 'item',
          type: reviewDetail.type,
        },
      })
      // 关闭review的弹窗
      if (chatType === 'task') store.getState().updateState({ currentPlanReviewToken: { token: '', renderNum: 0 } })
      break
    case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
      if (chatType === 'reAct') {
        if (noCasualReview) return
        reviewDetail.data.selected = JSON.stringify(data.params)
        reviewDetail.data.optionValue = data.params?.suggestion || 'continue'
        store.getState().updateCasualReview(reviewDetail.id, 'remove')
        store.getState().incrementNodeVersion(reviewDetail.id, 'item')
      }
      break
    case AIChatQSDataTypeEnum.DETACHED_PLAN_REQUIRE:
      if (chatType === 'reAct') {
        if (noTaskReview) return
        reviewDetail.data.selected = JSON.stringify(data.params)
        reviewDetail.data.optionValue = data.params?.suggestion || 'continue'
        store.getState().updateState({ currentPlanReviewToken: { token: '', renderNum: 0 } })
        store.getState().dispatchStreamingNode({
          chatType: chatType,
          parentTaskId: reviewDetail.TaskId,
          node: {
            token: reviewDetail.id,
            kind: 'item',
            type: reviewDetail.type,
            isHistory: true,
          },
        })
      }
      break
    case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
      if (chatType === 'reAct') {
        if (noCasualReview) return
        reviewDetail.data.selected = JSON.stringify(data.params)
        reviewDetail.data.optionValue = data.params?.suggestion || 'continue'
        store.getState().updateCasualReview(reviewDetail.id, 'remove')
        store.getState().incrementNodeVersion(reviewDetail.id, 'item')
      } else {
        if (noTaskReview) return
        store.getState().dispatchStreamingNode({
          chatType: chatType,
          parentTaskId: reviewDetail.TaskId,
          node: {
            token: reviewDetail.id,
            kind: 'item',
            type: reviewDetail.type,
          },
        })
        store.getState().updateState({ currentPlanReviewToken: { token: '', renderNum: 0 } })
      }
      break
    case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
      // 实时数据-不会有task_review_release出现，出现则舍弃无效数据
      break
    case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
      // 实时数据-任务规划-tool_review都会自动执行，不展示到UI上
      // 自由对话里，没有在执行任务组的tool_review会展示到UI上，需要处理数据并在UI上删除掉
      rawData.contents.delete(reviewDetail.id)
      store.getState().updateCasualReview(reviewDetail.id, 'remove')
      store.getState().deleteElementNode({
        chatType: chatType,
        token: reviewDetail.id,
        kind: 'item',
        taskID: reviewDetail.TaskId || undefined,
        onDelContent: (mapKey) => {
          rawData.contents.delete(mapKey)
        },
      })
      break
    default:
      break
  }
}

const handleDetachedPlanReview: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
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
    const reviewStore = store.getState().currentPlanReviewToken
    reviewStore.renderNum += 1
    store.getState().updateState({ currentPlanReviewToken: { ...reviewStore } })
  } else {
    const chatData: AIChatQSData = {
      ...genBaseAIChatData(res),
      chatType: chatType,
      id: data.id,
      type: AIChatQSDataTypeEnum.DETACHED_PLAN_REQUIRE,
      data: { ...cloneDeep(data) },
      TaskId: generateTaskNodeDataID({
        chatType: chatType,
        planID: chatType === 'reAct' ? store.getState().currentCasualTaskID : meta.currentTaskPlanID?.coordinatorId,
        taskID: res.TaskId,
        isExist: (key) => rawData.contents.has(key),
      }),
    }
    rawData.contents.set(chatData.id, cloneDeep(chatData))
    if (chatType === 'reAct') {
      store.getState().updateState({ currentPlanReviewToken: { token: chatData.id, renderNum: 0 } })
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
