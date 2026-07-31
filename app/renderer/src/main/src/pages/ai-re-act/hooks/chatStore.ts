import { AIChatQSDataTypeEnum, CurrentExecTaskTree, type ChatStoreState } from './aiRender'
import { createStore } from 'zustand/vanilla'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import cloneDeep from 'lodash/cloneDeep'
import {
  DefaultAIQuestionQueues,
  DefaultCurrentExecTaskTree,
  DefaultPlanHistoryList,
  DefaultTaskPlanStatus,
} from './defaultConstant'
import { v4 as uuidv4 } from 'uuid'
// state 里有 Map（execFileRecord），Immer 操作 Map/Set 前必须加载 MapSet 插件
enableMapSet()
export type CreateChatStoreOptions = {
  /** 渲染树结构变更时回调（dispatch / delete / replaceItemToken），用于 dirty debounce 落库 */
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

      initLoading: false,
      grpcLoadMoreLoading: false,

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
      /**
       * 批量合并文件系统 pin 记录，按 path 去重。
       * 在 set 回调里拿最新 state 合并，避免 Controller 用 stale state 拼接。
       */
      setGrpcFolders: (folders) =>
        set((state) => {
          state.grpcFolders = [...new Map([...folders, ...state.grpcFolders].map((item) => [item.path, item])).values()]
        }),
      updateTimeLineItem: (item) =>
        set((state) => {
          state.reActTimelines.push(item)
        }),
      /**
       * 批量前插 timeline 历史并按 id 去重。
       * 在 set 回调里拿最新 state 合并，避免 Controller 用 stale state 拼接导致丢失实时数据。
       */
      setReActTimelines: (timelines) =>
        set((state) => {
          const existingIds = new Set(state.reActTimelines.map((t) => t.id))
          const deduped = timelines.filter((t) => !existingIds.has(t.id))
          state.reActTimelines = [...deduped, ...state.reActTimelines]
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
          const direction = isHistory ? 'prepend' : 'append'
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

          /** 挂树幂等：同一 token 重复 dispatch 时跳过，避免 elements / childrenTokens 双插 */
          const isAlreadyInTree = () => {
            /** stream 合并后 item 挂在 group.childrenTokens，不在 siblings 顶层列表里 */
            const isInGroupChildren = (tokens: string[] | undefined) =>
              !!tokens?.some((t) => state.groups[t]?.childrenTokens.includes(node.token))

            if (parentTaskId) {
              const children = state.tasks[parentTaskId]?.childrenTokens
              if (!children) return false
              if (children.includes(node.token)) return true
              return isInGroupChildren(children)
            }

            // 顶层 item / task / group
            if (targetElements.some((el) => el.token === node.token)) return true
            // 顶层 stream 组内的 item
            return targetElements.some((el) => state.groups[el.token]?.childrenTokens.includes(node.token))
          }
          if (isAlreadyInTree()) return

          if (targetElements.length === 0) {
            if (direction === 'append') targetElements.push(elementRef)
            else targetElements.unshift(elementRef)
            return
          }

          const parentChildren = parentTaskId ? state.tasks[parentTaskId]?.childrenTokens : undefined
          if (parentTaskId && !parentChildren) return

          const siblingToken = parentChildren?.length
            ? direction === 'append'
              ? parentChildren.at(-1)
              : parentChildren[0]
            : parentTaskId
              ? undefined
              : direction === 'append'
                ? targetElements.at(-1)?.token
                : targetElements[0]?.token

          if (siblingToken) {
            const siblingItem = state.items[siblingToken]
            const siblingGroup = state.groups[siblingToken]
            const isStreamItem = node.kind === 'item' && node.type === AIChatQSDataTypeEnum.STREAM && !!node.nodeId

            if (isStreamItem && siblingGroup?.kind === 'group' && siblingGroup.nodeId === node.nodeId) {
              if (siblingGroup.childrenTokens.includes(node.token)) return
              node.groupExtra?.(siblingGroup.token, [node.token])
              if (direction === 'append') siblingGroup.childrenTokens.push(node.token)
              else siblingGroup.childrenTokens.unshift(node.token)
              siblingGroup.renderNum += 1
              return
            }

            if (
              isStreamItem &&
              siblingItem?.type === AIChatQSDataTypeEnum.STREAM &&
              siblingItem.nodeId === node.nodeId
            ) {
              const newGroupToken = `${node.nodeId}-${uuidv4()}`
              const groupChildrenTokens =
                direction === 'append' ? [siblingToken, node.token] : [node.token, siblingToken]
              node.groupExtra?.(newGroupToken, groupChildrenTokens)
              state.groups[newGroupToken] = {
                kind: 'group',
                token: newGroupToken,
                type: AIChatQSDataTypeEnum.STREAM_GROUP,
                renderNum: 1,
                nodeId: node.nodeId,
                childrenTokens: groupChildrenTokens,
              }
              const groupElementRef = { kind: 'group' as const, token: newGroupToken, chatType, isHistory }
              if (parentChildren?.length) {
                parentChildren[direction === 'append' ? parentChildren.length - 1 : 0] = newGroupToken
              } else {
                targetElements[direction === 'append' ? targetElements.length - 1 : 0] = groupElementRef
              }
              return
            }
          }

          if (parentChildren) {
            if (direction === 'append') parentChildren.push(node.token)
            else parentChildren.unshift(node.token)
            return
          }

          const lastEl = state.taskChat.elements.at(-1)
          if (
            direction === 'append' &&
            chatType === 'task' &&
            node.type === AIChatQSDataTypeEnum.TASK_NODE_GROUP &&
            lastEl?.kind === 'task' &&
            state.tasks[lastEl.token]?.type === AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP
          ) {
            // 任务规划最新一个元素，一定是默认任务组，所以别的元素需要往前插入
            state.taskChat.elements.splice(state.taskChat.elements.length - 1, 0, elementRef)
          } else {
            if (direction === 'append') targetElements.push(elementRef)
            else targetElements.unshift(elementRef)
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
      deleteElementNode: (params) => {
        let deleted = false
        set((state) => {
          const { token, kind, chatType, taskID, groupID, onDelContent } = params
          const exists =
            (kind === 'item' && !!state.items[token]) ||
            (kind === 'group' && !!state.groups[token]) ||
            (kind === 'task' && !!state.tasks[token])
          if (!exists) return

          deleted = true
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
        })
        if (deleted) onRenderStructureChange?.()
      },

      /** 将指定item的token换成新token，并同步更新 elements / childrenTokens 中的引用 */
      replaceItemToken: (oldToken, newToken) => {
        let replaced = false
        set((state) => {
          if (!state.items[oldToken]) return

          replaced = true
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
        })
        if (replaced) onRenderStructureChange?.()
      },
    })),
  )
}
