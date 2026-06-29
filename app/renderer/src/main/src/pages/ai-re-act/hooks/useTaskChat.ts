import type {
  CurrentExecTaskTree,
  handleSendFunc,
  UseTaskChatEvents,
  UseTaskChatParams,
  UseTaskChatState,
} from './type'
import type { AIChatQSData, ReActChatRenderItem, AITaskInfoProps } from './aiRender'
import type { AIAgentGrpcApi, AIOutputEvent } from './grpcApi'
import { useRef, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import cloneDeep from 'lodash/cloneDeep'
import { DefaultCurrentExecTaskTree } from './defaultConstant'
import { genBaseAIChatData, genExecTasks } from './utils'
import { yakitNotify } from '@/utils/notification'
import { AITaskStatus } from './grpcApi'
import { AIChatQSDataTypeEnum } from './aiRender'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'

function useTaskChat(params: UseTaskChatParams): [UseTaskChatState, UseTaskChatEvents]

function useTaskChat(params: UseTaskChatParams) {
  const { getChatDataStore, getRequest, getCurrentTaskPlanID, onReview, onReviewExtra, onReviewRelease, sendRequest } =
    params || {}

  const [elements, setElements, getElements] = useGetSetState<ReActChatRenderItem[]>([])

  const getContentMap = useMemoizedFn((mapKey: string) => {
    const contentMap = getChatDataStore?.()?.taskChat?.contents
    if (!contentMap) return undefined
    return contentMap.get(mapKey)
  })
  const setContentMap = useMemoizedFn((mapKey: string, value: AIChatQSData) => {
    const contentMap = getChatDataStore?.()?.taskChat?.contents
    contentMap && contentMap.set(mapKey, value)
  })

  // #region 任务树相关逻辑
  const [plan, setPlan] = useState<CurrentExecTaskTree>(cloneDeep(DefaultCurrentExecTaskTree))
  const handleResetPlanTree = useMemoizedFn(() => {
    setPlan(cloneDeep(DefaultCurrentExecTaskTree))
  })

  /**
   * 正在执行中的叶子任务的mapKey集合(已结束的叶子任务会被移除)
   * 主要为了在任务中断时，手动设置为error状态使用
   */
  const activeLeafTasks = useRef<Set<string>>(new Set())
  const handleResetActiveLeafTasks = useMemoizedFn(() => {
    activeLeafTasks.current.clear()
  })

  const handleTaskNode = useMemoizedFn((res: AIOutputEvent, info: AIAgentGrpcApi.ChangeTask) => {
    try {
      const taskId = getCurrentTaskPlanID?.()?.taskID
      const ownTaskId = info.task.task_id || res.TaskId
      if (!taskId || !ownTaskId) return
      const taskKey = `${taskId}-${ownTaskId}`
      const existing = getContentMap(taskKey)
      if (existing && existing.type !== AIChatQSDataTypeEnum.TASK_NODE_GROUP) {
        // push log
        return
      }
      const chatData: AIChatQSData =
        existing ??
        ({
          ...genBaseAIChatData(res),
          id: taskKey,
          chatType: 'task',
          type: AIChatQSDataTypeEnum.TASK_NODE_GROUP,
          data: {
            taskId: ownTaskId,
            taskName: info.task.name,
            goal: info.task.goal,
            status: info.task.task_status || AITaskStatus.inProgress,
          },
        } as AIChatQSData)

      setContentMap(chatData.id, chatData)
      if (info.type === 'push_task') {
        activeLeafTasks.current.add(chatData.id)
        setElements((old) => {
          const exists = old.some((item) => item.token === chatData.id && item.type === chatData.type)
          if (exists) return old
          const last = old[old.length - 1]
          if (last.type === AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP) {
            // 实时数据下，将默认任务聚合组置底
            old.splice(old.length - 1, 0, {
              token: chatData.id,
              type: chatData.type,
              renderNum: 1,
              chatType: 'task',
              kind: 'task',
              children: [],
            })
            return [...old]
          }
          return [
            ...old,
            { token: chatData.id, type: chatData.type, renderNum: 1, chatType: 'task', kind: 'task', children: [] },
          ]
        })
      } else if (info.type === 'pop_task') {
        // 删除正在执行队列里的叶子任务, 因为当前任务已经结束了
        activeLeafTasks.current.delete(chatData.id)
        if (chatData.type === AIChatQSDataTypeEnum.TASK_NODE_GROUP) {
          chatData.data.status = info.task.task_status
        }
        setElements((old) => {
          return old.map((item) => {
            if (item.token === chatData.id && item.type === chatData.type) {
              return { ...item, renderNum: item.renderNum + 1 }
            }
            return item
          })
        })
      }
    } catch {
      // push log
    }
  })

  /** 更新任务树指定任务节点的状态 */
  const handleUpdateTaskState = useMemoizedFn((index: string, state: AITaskInfoProps['progress']) => {
    setPlan((old) => {
      return {
        ...old,
        task_tree: old.task_tree.map((item) => {
          if (item.index === index) item.progress = state
          return item
        }),
      }
    })
  })

  /** 将任务树中, 所有进行中的任务, 变更为中止状态 */
  const handleAbortTaskState = useMemoizedFn(() => {
    const leafTasks = activeLeafTasks.current
    for (let mapKey of leafTasks) {
      const taskNodeInfo = getContentMap(mapKey)
      if (!taskNodeInfo || taskNodeInfo.type !== AIChatQSDataTypeEnum.TASK_NODE_GROUP) {
        continue
      }
      taskNodeInfo.data.status = AITaskStatus.error
      setElements((old) => {
        return old.map((item) => {
          if (item.token === taskNodeInfo.id && item.type === taskNodeInfo.type) {
            return { ...item, renderNum: item.renderNum + 1 }
          }
          return item
        })
      })
    }
    handleResetActiveLeafTasks()
    setPlan((old) => {
      return {
        ...old,
        task_tree: old.task_tree.map((item) => {
          if (item.progress === AITaskStatus.inProgress) {
            item.progress = AITaskStatus.error
          }
          return item
        }),
      }
    })
  })
  // #endregion

  // #region review数据-hook缓存数据
  const review = useRef<AIChatQSData>()

  // 将 review 数据处理成需要展示的UI数据
  const handleReviewDataToUI = useMemoizedFn((reviewInfo: AIChatQSData) => {
    if (reviewInfo.type === AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE && reviewInfo.data.optionValue === 'continue') {
      // plan_review, 选择是continue选项, 则进行UI任务树的生成
      const tasks = reviewInfo.data
      const plans = genExecTasks(tasks.plans.root_task)
      setPlan({
        task_tree: cloneDeep(plans),
        root_task_name: tasks.plans.root_task.name,
      })
    }
  })

  // #endregion

  /** 处理数据方法 */
  const handleSetData = useMemoizedFn((res: AIOutputEvent) => {})

  const handleResetData = useMemoizedFn(() => {
    handleResetPlanTree()
    handleResetActiveLeafTasks()
    setElements([])
  })

  /** review 界面选项触发事件 */
  const handleSend: handleSendFunc = useMemoizedFn(({ request, optionValue, cb }) => {})

  /** grpc接口关闭后的后续处理逻辑 */
  const handleCloseGrpc = useMemoizedFn(() => {
    // 将进行中的任务变更为中止状态
    handleAbortTaskState()
  })

  /** 当前任务规划结束-触发UI展示结束标识 */
  const handlePlanExecEnd = useMemoizedFn((res: AIOutputEvent) => {})

  /** 用户手动介入逻辑 */
  const handleUserManualIntervention = useMemoizedFn((chatInfo: AIChatQSData) => {
    try {
      setContentMap(chatInfo.id, cloneDeep(chatInfo))
      setElements((old) => [
        ...old,
        { token: chatInfo.id, type: chatInfo.type, renderNum: 1, chatType: 'task', kind: 'item' },
      ])
    } catch (error) {
      yakitNotify('error', `用户手动干预操作失败: ${error}`)
    }
  })

  const state: UseTaskChatState = useCreation(() => {
    return { plan, elements }
  }, [plan, elements])

  const events: UseTaskChatEvents = useCreation(() => {
    return {
      handleSetData,
      handleResetData,
      handleSend,
      handleCloseGrpc,
      handlePlanExecEnd,
      getContentMap,
      setContentMap,
      setElements: setElements,
      getElements: getElements,
      handleUserManualIntervention,
      handleResetPlanTree,
    }
  }, [])

  return [state, events] as const
}

export default useTaskChat
