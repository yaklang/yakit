import { AIChatQSDataTypeEnum, ReActChatDataOriginEnum, type ChatStoreState } from './aiRender'
import { createStore } from 'zustand/vanilla'
import { immer } from 'zustand/middleware/immer'
import cloneDeep from 'lodash/cloneDeep'
import {
  DefaultAIQuestionQueues,
  DefaultCurrentExecTaskTree,
  DefaultPlanHistoryList,
  DefaultPlanLoadingStatus,
} from './defaultConstant'
import { CurrentExecTaskTree } from './type'
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

      grpcFolders: [],
      reActTimelines: [],

      notifyMessage: null,
      planHistoryList: cloneDeep(DefaultPlanHistoryList),
      questionQueue: cloneDeep(DefaultAIQuestionQueues),

      httpTabShow: false,
      httpTabUpdate: 0,
      riskTabShow: false,
      riskTabUpdate: 0,

      casualTitle: '',
      casualLoading: false,
      focusMode: '',
      showPlanList: false,
      taskStatus: cloneDeep(DefaultPlanLoadingStatus),
      currentPlanReviewData: undefined,

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
        todoListMap: new Map(),
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

      updateCasualTodoList: () => {
        set((state) => {
          state.casualChat.todoListUpdate += 1
        })
      },
      updateTaskLoadingStatus: (partial) =>
        set((state) => {
          Object.assign(state.taskStatus, partial)
        }),
      updatePlanTree: (planTree: CurrentExecTaskTree) =>
        set((state) => {
          Object.assign(state.taskChat.plan, planTree)
        }),

      updateExecFileRecord: (callToolID, info, order) =>
        set((state) => {
          const keyName = callToolID || 'system'
          const keyList = state.execFileRecord.get(keyName) || []
          keyList.push({ ...info, id: uuidv4(), order: order })
          state.execFileRecord.set(keyName, keyList)
        }),

      dispatchStreamingNode: ({ chatType, parentTaskId, node, groupTokenGenerator }) =>
        set((state) => {
          const isCached = node.isCached ?? false
          const cacheOrder = node.cacheOrder ?? 0
          const dataOrigin = node.dataOrigin ?? ReActChatDataOriginEnum.GrpcRealtimeData
          // 1. 实体字典动态初始化守卫
          if (node.kind === 'item' && !state.items[node.token]) {
            state.items[node.token] = { token: node.token, kind: 'item', type: node.type || 'assistant', renderNum: 0 }
          } else if (node.kind === 'task' && !state.tasks[node.token]) {
            state.tasks[node.token] = {
              token: node.token,
              kind: 'task',
              type: node.type || 'assistant',
              childrenTokens: [],
              renderNum: 0,
            }
          }

          // 2. 路由分发决策（以普通看板为例，去掉了大任务内部分支以精简示范）
          const targetElements = chatType === 'reAct' ? state.casualChat.elements : state.taskChat.elements

          if (targetElements.length === 0) {
            targetElements.push({ kind: node.kind, token: node.token, chatType, isCached, cacheOrder, dataOrigin })
            return
          }

          const lastNode = targetElements[targetElements.length - 1]
          const lastToken = lastNode.token
          const lastItem = state.items[lastToken]
          const lastGroup = state.groups[lastToken]

          // 🌟 核心结界拦截：如果是 IndexedDB 或后端的历史，严禁触碰折叠逻辑
          if (!isCached) {
            // 合并组吞噬逻辑
            // 需要调整，因为只有stream会有聚合group的情况
            if (lastGroup && lastGroup.kind === 'group' && node.kind === 'item') {
              lastGroup.childrenTokens.push(node.token)
              lastGroup.renderNum += 1
              return
            }
            // 偷梁换柱成组逻辑
            if (
              lastItem &&
              lastItem.type === AIChatQSDataTypeEnum.STREAM &&
              node.type === AIChatQSDataTypeEnum.STREAM &&
              node.kind === 'item'
            ) {
              const newGroupToken = groupTokenGenerator()
              state.groups[newGroupToken] = {
                token: newGroupToken,
                kind: 'group',
                type: AIChatQSDataTypeEnum.STREAM_GROUP,
                childrenTokens: [lastToken, node.token],
                renderNum: 0,
              }
              targetElements[targetElements.length - 1] = {
                kind: 'group',
                token: newGroupToken,
                chatType,
                isCached,
                cacheOrder,
                dataOrigin,
              }
              return
            }
          }

          targetElements.push({ kind: node.kind, token: node.token, chatType, isCached, cacheOrder, dataOrigin })
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
