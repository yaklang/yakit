import { AIChatQSDataTypeEnum, CurrentExecTaskTree, type ChatStoreState } from './aiRender'
import { createStore } from 'zustand/vanilla'
import { immer } from 'zustand/middleware/immer'
import cloneDeep from 'lodash/cloneDeep'
import {
  DefaultAIQuestionQueues,
  DefaultCurrentExecTaskTree,
  DefaultPlanHistoryList,
  DefaultTaskPlanStatus,
} from './defaultConstant'
import { v4 as uuidv4 } from 'uuid'

export type CreateChatStoreOptions = {
  /** 渲染树结构变更时回调（dispatchStreamingNode 改 elements/children 后），用于 dirty debounce 落库 */
  onRenderStructureChange?: () => void
}

export const createChatStore = (options?: CreateChatStoreOptions) => {
  const onRenderStructureChange = options?.onRenderStructureChange
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
      taskStatus: cloneDeep(DefaultTaskPlanStatus),

      currentCasualReview: [],
      currentPlanReviewToken: { token: '', renderNum: 0 },
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

      /** 用持久化渲染树快照整体替换 items/groups/tasks/elements（供 Controller 恢复会话） */
      hydrateRenderTree: (content) =>
        set((state) => {
          state.items = content.items || {}
          state.groups = content.groups || {}
          state.tasks = content.tasks || {}
          state.casualChat.elements = content.casualElements || []
          state.taskChat.elements = content.taskElements || []
        }),

      updateTaskLoadingStatus: (partial) =>
        set((state) => {
          Object.assign(state.taskStatus, partial)
        }),

      updateCasualReview: (id: string, status: 'add' | 'remove') =>
        set((state) => {
          if (status === 'add' && !state.currentCasualReview.includes(id)) {
            state.currentCasualReview.push(id)
          } else if (status === 'remove' && state.currentCasualReview.includes(id)) {
            state.currentCasualReview = state.currentCasualReview.filter((item) => item !== id)
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

      dispatchStreamingNode: ({ chatType, parentTaskId, node }) => {
        set((state) => {
          const isHistory = node.isHistory ?? false
          const elementRef = { kind: node.kind, token: node.token, chatType, isHistory }
          const targetElements = chatType === 'reAct' ? state.casualChat.elements : state.taskChat.elements

          // 注册实体（group 由连续 stream item 碰撞自动生成，不支持手动注册）
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

          if (isHistory) {
            // 历史数据处理逻辑
          } else {
            // 空列表直接追加
            if (targetElements.length === 0) {
              targetElements.push(elementRef)
              return
            }

            // 定位同级上一个节点（parentChildren 为空数组时表示无兄弟节点，不做合并）
            const parentChildren = parentTaskId ? state.tasks[parentTaskId]?.childrenTokens : undefined
            if (parentTaskId && !parentChildren) return

            const lastToken = parentChildren?.length
              ? parentChildren.at(-1)
              : parentTaskId
                ? undefined
                : targetElements.at(-1)?.token

            if (lastToken) {
              const lastItem = state.items[lastToken]
              const lastGroup = state.groups[lastToken]
              const isStreamItem = node.kind === 'item' && node.type === AIChatQSDataTypeEnum.STREAM && !!node.nodeId

              // stream 合并：追加到已有组
              if (isStreamItem && lastGroup?.kind === 'group' && lastGroup.nodeId === node.nodeId) {
                node.groupExtra?.(lastGroup.token, [node.token])
                lastGroup.childrenTokens.push(node.token)
                lastGroup.renderNum += 1
                return
              }

              // stream 合并：两个连续 item 合成新组
              if (isStreamItem && lastItem?.type === AIChatQSDataTypeEnum.STREAM && lastItem.nodeId === node.nodeId) {
                const newGroupToken = `${node.nodeId}-${uuidv4()}`
                node.groupExtra?.(newGroupToken, [lastToken, node.token])
                state.groups[newGroupToken] = {
                  kind: 'group',
                  token: newGroupToken,
                  type: AIChatQSDataTypeEnum.STREAM_GROUP,
                  renderNum: 1,
                  nodeId: node.nodeId,
                  childrenTokens: [lastToken, node.token],
                }
                if (parentChildren?.length) {
                  parentChildren[parentChildren.length - 1] = newGroupToken
                } else {
                  targetElements[targetElements.length - 1] = {
                    kind: 'group',
                    token: newGroupToken,
                    chatType,
                    isHistory,
                  }
                }
                return
              }
            }
          }

          // 默认追加（实时数据合并失败也走这里）
          const parentChildren = parentTaskId ? state.tasks[parentTaskId]?.childrenTokens : undefined
          if (parentChildren) {
            parentChildren.push(node.token)
            return
          }

          const lastEl = state.taskChat.elements.at(-1)
          if (
            chatType === 'task' &&
            node.type === AIChatQSDataTypeEnum.TASK_NODE_GROUP &&
            lastEl?.kind === 'task' &&
            state.tasks[lastEl.token]?.type === AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP
          ) {
            // 非组数据放入默认任务组，且默认任务组保持在最下面
            state.taskChat.elements.splice(state.taskChat.elements.length - 1, 0, elementRef)
          } else {
            targetElements.push(elementRef)
          }
        })
        onRenderStructureChange?.()
      },

      /** 高频更新节点渲染 */
      incrementNodeVersion: (token, kind) =>
        set((state) => {
          if (kind === 'item' && state.items[token]) state.items[token].renderNum += 1
          if (kind === 'group' && state.groups[token]) state.groups[token].renderNum += 1
          if (kind === 'task' && state.tasks[token]) state.tasks[token].renderNum += 1
        }),

      /** 删除指定token的节点，并将关联节点一并更新 */
      deleteElementNode: (params) =>
        set((state) => {
          const { token, kind, chatType, taskID, groupID, onDelContent } = params

          const removeChatElement = (targetToken: string) => {
            const target = chatType === 'reAct' ? state.casualChat : state.taskChat
            target.elements = target.elements.filter((item) => item.token !== targetToken)
          }

          const removeFromChildrenTokens = (
            container: { childrenTokens: string[] } | undefined,
            targetToken: string,
          ) => {
            if (container) {
              container.childrenTokens = container.childrenTokens.filter((t) => t !== targetToken)
            }
          }

          /** 如果是group类型, 则清除整个group里的所有item数据 */
          const purgeGroup = (groupToken: string) => {
            const group = state.groups[groupToken]
            if (!group) return
            group.childrenTokens.forEach(onDelContent)
            delete state.groups[groupToken]
          }

          const detachFromParentOrTopLevel = () => {
            if (taskID) {
              removeFromChildrenTokens(state.tasks[taskID], token)
            } else {
              removeChatElement(token)
            }
          }

          switch (kind) {
            case 'item':
              onDelContent(token)
              if (groupID) {
                removeFromChildrenTokens(state.groups[groupID], token)
              } else if (taskID) {
                removeFromChildrenTokens(state.tasks[taskID], token)
              } else {
                removeChatElement(token)
              }
              break
            case 'group':
              onDelContent(token)
              purgeGroup(token)
              detachFromParentOrTopLevel()
              break
            case 'task': {
              onDelContent(token)
              const task = state.tasks[token]
              if (task) {
                for (const childToken of task.childrenTokens) {
                  purgeGroup(childToken)
                  onDelContent(childToken)
                }
              }
              delete state.tasks[token]
              removeChatElement(token)
              break
            }
          }
        }),

      /** 将指定item的token换成新token，并同步更新 elements / childrenTokens 中的引用 */
      replaceItemToken: (oldToken, newToken) =>
        set((state) => {
          if (!state.items[oldToken]) return

          // 同步 items 实体
          state.items[newToken] = state.items[oldToken]
          state.items[newToken].token = newToken
          state.items[newToken].renderNum += 1
          delete state.items[oldToken]

          // 同步 casualChat.elements 中的 token 引用
          for (const el of state.casualChat.elements) {
            if (el.token === oldToken) el.token = newToken
          }

          // 同步 taskChat.elements 中的 token 引用
          for (const el of state.taskChat.elements) {
            if (el.token === oldToken) el.token = newToken
          }

          // 同步 tasks[*].childrenTokens 中的 token 引用
          for (const task of Object.values(state.tasks)) {
            if (task.childrenTokens.includes(oldToken)) {
              task.childrenTokens = task.childrenTokens.map((t) => (t === oldToken ? newToken : t))
            }
          }

          // 同步 groups[*].childrenTokens 中的 token 引用
          for (const group of Object.values(state.groups)) {
            if (group.childrenTokens.includes(oldToken)) {
              group.childrenTokens = group.childrenTokens.map((t) => (t === oldToken ? newToken : t))
            }
          }
        }),
    })),
  )
}
