import { AIChatQSDataTypeEnum, type ChatStoreState } from './aiRender'
import { createStore } from 'zustand/vanilla'
import { immer } from 'zustand/middleware/immer'
import cloneDeep from 'lodash/cloneDeep'
import {
  DefaultAIQuestionQueues,
  DefaultCurrentExecTaskTree,
  DefaultPlanHistoryList,
  DefaultPlanLoadingStatus,
} from './defaultConstant'
import type { CurrentExecTaskTree } from './type'
import { v4 as uuidv4 } from 'uuid'

export const createChatStore = () => {
  return createStore<ChatStoreState>()(
    immer((set) => ({
      execute: false,

      httpFuzzRequestUpdate: 0,
      httpFlowFuzzStatusUpdate: 0,
      sessionTitleUpdate: 0,
      memoryListUpdate: 0,
      updateSystemStream: 0,
      yaklangCodeChangeUpdate: 0,
      syncIDUpdate: 0,

      grpcFolders: [],
      reActTimelines: [],

      notifyMessage: null,
      planHistoryList: cloneDeep(DefaultPlanHistoryList),
      questionQueue: cloneDeep(DefaultAIQuestionQueues),

      httpTabShow: false,
      httpTabUpdate: 0,
      riskTabShow: false,
      riskTabUpdate: 0,

      currentCasualTaskID: '',
      casualTitle: '',
      casualLoading: false,
      focusMode: '',
      showPlanList: false,
      taskStatus: cloneDeep(DefaultPlanLoadingStatus),

      currentCasualReview: [],
      currentPlanReviewToken: '',
      currentPlanReviewExtraUpdate: 0,

      items: {},
      groups: {},
      tasks: {},

      casualChat: {
        elements: [],
        todoListUpdate: 0,
      },
      taskChat: {
        elements: [],
        plan: cloneDeep(DefaultCurrentExecTaskTree),
      },

      card: [],
      execFileRecord: new Map(),
      yakExecResultLogs: [],

      switchLoading: false,
      cancelCasualLoading: false,
      cancelTaskLoading: false,
      requestHistoryState: {
        initLoading: false,
        casualLoadMoreLoading: false,
        taskLoadMoreLoading: false,
        saveLoading: false,
        timelinesLoading: false,
      },

      updateStateCount: (type) =>
        set((state) => {
          state[type] += 1
        }),

      updateFolders: (info) =>
        set((state) => {
          const isExist = state.grpcFolders.find((item) => item.path === info.path)
          if (!isExist) state.grpcFolders.push(info)
        }),
      updateTimeLineItem: (item) =>
        set((state) => {
          state.reActTimelines.push(item)
        }),

      updateHttpData: () => {
        set((state) => {
          if (!state.httpTabShow) state.httpTabShow = true
          state.httpTabUpdate += 1
        })
      },
      updateRiskData: () => {
        set((state) => {
          if (!state.riskTabShow) state.riskTabShow = true
          state.riskTabUpdate += 1
        })
      },

      updateState: (partial) =>
        set((state) => {
          Object.assign(state, partial)
        }),

      updateTaskLoadingStatus: (partial) =>
        set((state) => {
          Object.assign(state.taskStatus, partial)
        }),

      updateCasualReview: (id: string, status: 'add' | 'remove') =>
        set((state) => {
          if (status === 'add') {
            if (!state.currentCasualReview.includes(id)) state.currentCasualReview.push(id)
          } else if (status === 'remove') {
            if (state.currentCasualReview.includes(id)) {
              state.currentCasualReview = state.currentCasualReview.filter((item) => item !== id)
            }
          }
        }),

      updateCasualTodoList: () => {
        set((state) => {
          state.casualChat.todoListUpdate += 1
        })
      },
      updatePlanTree: (planTree: CurrentExecTaskTree) =>
        set((state) => {
          state.taskChat.plan = planTree
        }),

      updateExecFileRecord: (callToolID, info, order) =>
        set((state) => {
          const keyName = callToolID || 'system'
          const keyList = state.execFileRecord.get(keyName) || []
          keyList.push({ ...info, id: uuidv4(), order: order })
          state.execFileRecord.set(keyName, keyList)
        }),

      dispatchStreamingNode: ({ chatType, parentTaskId, node }) =>
        set((state) => {
          const isHistory = node.isHistory ?? false

          /**
           * 添加节点数据到实体字典中
           *
           * 这里为什么没有group类型，因为group是通过两个item碰撞自动合成的group
           * 暂不支持代码手动新增group类型数据
           */
          if (node.kind === 'item' && !state.items[node.token]) {
            state.items[node.token] = {
              kind: 'item',
              token: node.token,
              type: node.type,
              renderNum: 0,
              nodeId: node.nodeId || '',
            }
          } else if (node.kind === 'task' && !state.tasks[node.token]) {
            state.tasks[node.token] = {
              kind: 'task',
              token: node.token,
              type: node.type,
              renderNum: 0,
              childrenTokens: [],
            }
          }

          // 2. 路由分发决策（以普通看板为例，去掉了大任务内部分支以精简示范）
          const targetElements = chatType === 'reAct' ? state.casualChat.elements : state.taskChat.elements

          if (isHistory) {
            // 历史数据处理逻辑
          } else {
            // 实时数据处理逻辑
            if (targetElements.length === 0) {
              targetElements.push({ kind: node.kind, token: node.token, chatType, isHistory })
              return
            }

            let lastToken = ''
            if (parentTaskId) {
              // 属于某个子任务组内的数据
              const targetList = state.tasks[parentTaskId]?.childrenTokens
              // 异常数据，暂不警告处理，直接无视
              if (!targetList) return
              lastToken = targetList[targetList.length - 1]
            } else {
              // 属于顶层或者group内的数据
              const lastElement = targetElements[targetElements.length - 1]
              lastToken = lastElement.token
            }

            const lastItem = state.items[lastToken]
            const lastGroup = state.groups[lastToken]

            // 已经存在组，并且和组标识一致，直接添加到组中
            if (
              lastGroup &&
              lastGroup.kind === 'group' &&
              lastGroup.nodeId &&
              node.kind === 'item' &&
              node.type === AIChatQSDataTypeEnum.STREAM &&
              node.nodeId &&
              lastGroup.nodeId === node.nodeId
            ) {
              lastGroup.childrenTokens.push(node.token)
              // lastGroup.renderNum += 1
              node?.groupExtra?.(lastGroup.token, [node.token])
              return
            }

            //  两个stream-item数据合并成组的逻辑
            if (
              lastItem &&
              lastItem.type === AIChatQSDataTypeEnum.STREAM &&
              lastItem.nodeId &&
              node.type === AIChatQSDataTypeEnum.STREAM &&
              node.kind === 'item' &&
              node.nodeId &&
              lastItem.nodeId === node.nodeId
            ) {
              const newGroupToken = `${node.nodeId}-${uuidv4()}`
              state.groups[newGroupToken] = {
                kind: 'group',
                token: newGroupToken,
                type: AIChatQSDataTypeEnum.STREAM_GROUP,
                renderNum: 0,
                nodeId: node.nodeId,
                childrenTokens: [lastToken, node.token],
              }
              if (parentTaskId && state.tasks[parentTaskId]?.childrenTokens) {
                // 更新子任务组最后一个token为新组token
                state.tasks[parentTaskId].childrenTokens[state.tasks[parentTaskId].childrenTokens.length - 1] =
                  newGroupToken
              } else {
                // 添加到顶层或者group内的数据
                targetElements[targetElements.length - 1] = {
                  kind: 'group',
                  token: newGroupToken,
                  chatType,
                  isHistory,
                }
              }
              node?.groupExtra?.(newGroupToken, [lastToken, node.token])
              return
            }
          }

          if (parentTaskId && state.tasks[parentTaskId]?.childrenTokens) {
            // 剩余情况，直接添加到子任务组中
            state.tasks[parentTaskId].childrenTokens.push(node.token)
          } else {
            // 添加到顶层数据中
            targetElements.push({ kind: node.kind, token: node.token, chatType, isHistory })
          }
        }),

      /** 高频更新节点渲染 */
      incrementNodeVersion: (token, kind) =>
        set((state) => {
          if (kind === 'item' && state.items[token]) state.items[token].renderNum += 1
          if (kind === 'group' && state.groups[token]) state.groups[token].renderNum += 1
          if (kind === 'task' && state.tasks[token]) state.tasks[token].renderNum += 1
        }),
    })),
  )
}
