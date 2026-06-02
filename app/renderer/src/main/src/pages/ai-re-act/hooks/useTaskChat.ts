import type {
  AIChatLogData,
  CurrentExecTaskTree,
  handleSendFunc,
  UseTaskChatEvents,
  UseTaskChatParams,
  UseTaskChatState,
} from './type'
import type { AIChatQSData, AIReviewType, ReActChatRenderItem, AITaskInfoProps, TodoListCardData } from './aiRender'
import type { AIAgentGrpcApi, AIOutputEvent } from './grpcApi'
import { useRef, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { Uint8ArrayToString } from '@/utils/str'
import cloneDeep from 'lodash/cloneDeep'
import { DefaultCurrentExecTaskTree } from './defaultConstant'
import { genBaseAIChatData, genExecTasks, handleGrpcDataPushLog } from './utils'
import { yakitNotify } from '@/utils/notification'
import { AIInputEventSyncTypeEnum, AITaskStatus } from './grpcApi'
import { AIChatQSDataTypeEnum } from './aiRender'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { has } from 'lodash'
import { grpcAIMessageHandlers } from './grpcAIMessageHandlers'

function useTaskChat(params: UseTaskChatParams): [UseTaskChatState, UseTaskChatEvents]

function useTaskChat(params: UseTaskChatParams) {
  const {
    pushLog,
    getChatDataStore,
    getRequest,
    getCurrentTaskPlanID,
    onReview,
    onReviewExtra,
    onReviewRelease,
    sendRequest,
  } = params || {}

  const handlePushLog = useMemoizedFn((logInfo: AIChatLogData) => {
    pushLog && pushLog(logInfo)
  })

  const [elements, setElements, getElements] = useGetSetState<ReActChatRenderItem[]>([])

  const getTodoList = useMemoizedFn(() => {
    return getChatDataStore?.()?.taskChat?.todoListMap
  })

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

  /** 正在执行中的叶子任务的mapKey集合(已结束的叶子任务会被移除) */
  const activeLeafTasks = useRef<Set<string>>(new Set())
  const handleResetActiveLeafTasks = useMemoizedFn(() => {
    activeLeafTasks.current.clear()
  })

  /**
   * 任务节点开始执行, 生成UI展示的信息
   * 实时数据里 先给push_task，后给pop_task，所以push_task是生成数据的主要依据
   * 任务规划里该类型只有实时数据
   */
  const handleTaskNode = useMemoizedFn((res: AIOutputEvent) => {
    try {
      let ipcContent = Uint8ArrayToString(res.Content) || ''
      const info = JSON.parse(ipcContent) as AIAgentGrpcApi.ChangeTask
      if (!info.task.task_uuid || info.task.index === '1') return
      if (res.IsSync) return

      let taskNodeInfo: AIChatQSData | undefined = getContentMap(info.task.task_uuid)
      if (!taskNodeInfo) {
        taskNodeInfo = {
          ...genBaseAIChatData(res),
          id: info.task.task_uuid,
          chatType: 'task',
          type: AIChatQSDataTypeEnum.TASK_INDEX_NODE,
          data: {
            taskIndex: info.task.index,
            taskName: info.task.name,
            goal: info.task.goal,
            status: info.task.task_status || AITaskStatus.inProgress,
          },
        }
        setContentMap(taskNodeInfo.id, taskNodeInfo)
      }

      if (info.type === 'push_task') {
        activeLeafTasks.current.add(taskNodeInfo.id)
        setElements((old) => [
          ...old,
          { token: taskNodeInfo!.id, type: taskNodeInfo!.type, renderNum: 1, chatType: 'task' },
        ])
      } else if (info.type === 'pop_task') {
        // 删除正在执行队列里的叶子任务, 因为当前任务已经结束了
        activeLeafTasks.current.delete(info.task.task_uuid)
        if (taskNodeInfo.type !== AIChatQSDataTypeEnum.TASK_INDEX_NODE) return
        taskNodeInfo.data.status = info.task.task_status
        setElements((old) => {
          return old.map((item) => {
            if (item.token === taskNodeInfo!.id && item.type === taskNodeInfo!.type) {
              return { ...item, renderNum: item.renderNum + 1 }
            }
            return item
          })
        })
      }
    } catch {}
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
      if (!taskNodeInfo || taskNodeInfo.type !== AIChatQSDataTypeEnum.TASK_INDEX_NODE) {
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
  const handleGetReview = useMemoizedFn(() => {
    return review.current
  })
  const handleSetReview = useMemoizedFn((newReview: AIChatQSData | undefined) => {
    review.current = cloneDeep(newReview)
  })
  const handleResetReview = useMemoizedFn(() => {
    review.current = undefined
  })

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
  const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
    try {
      let funcKey = res.Type
      if (res.Type === 'structured' && res.NodeId === 'stream-finished') {
        // stream数据结束标识
        funcKey = res.NodeId
      } else if (res.Type === 'api_request_failed' && res.NodeId === 'ai_call_failure') {
        funcKey = res.Type
      }
      const handleFunc = grpcAIMessageHandlers[funcKey || '']
      if (handleFunc) {
        handleFunc({
          res,
          info: { chatType: 'task' },
          getRequest,
          setElements,
          getElements,
          setContentMap,
          getContentMap,
          pushLog: handlePushLog,
          review: {
            handleGetReview,
            handleSetReview,
            onReview,
            onReviewExtra,
            handleReviewDataToUI,
          },
        })
        return
      }

      const ipcContent = Uint8ArrayToString(res.Content) || ''

      if (res.Type === 'structured' && res.NodeId === 'system') {
        const data = JSON.parse(ipcContent) || ''

        if (data && typeof data === 'object' && data?.type === 'push_task') {
          const info = JSON.parse(ipcContent) as AIAgentGrpcApi.ChangeTask
          handleTaskNode(res)
          handleUpdateTaskState(info.task.index, AITaskStatus.inProgress)
        }

        if (data && typeof data === 'object' && data?.type === 'pop_task') {
          // 结束任务 & 请求更新任务树最新状态数据
          handleTaskNode(res)
          sendRequest && sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN })
        }
        return
      } else if (res.Type === 'plan') {
        // 更新正在执行的任务树
        const tasks = JSON.parse(ipcContent) as { root_task: AIAgentGrpcApi.PlanTask }
        if (has(tasks, 'root_task')) {
          const plans = genExecTasks(tasks.root_task)
          setPlan({ task_tree: cloneDeep(plans), root_task_name: tasks.root_task.name })
        } else {
          setPlan(cloneDeep(DefaultCurrentExecTaskTree))
        }
        return
      } else if (res.Type === 'todo_list_update' && res.NodeId === 'todo_list') {
        // 更新待办清单卡片数据
        const info = JSON.parse(ipcContent) as AIAgentGrpcApi.TodoListUpdate
        const { items, stats, task_id, task_index } = info
        if (!task_id || !task_index) return
        if (Array.isArray(items) && items.length === 0) return
        if (task_id !== getCurrentTaskPlanID()?.taskID) return
        const todoListMap = getTodoList()
        if (!todoListMap) return
        todoListMap.set(task_index, { items, stats })
      }

      // 未识别类型全部归档到日志处理
      handleGrpcDataPushLog({ info: res, pushLog: handlePushLog })
    } catch (error) {
      handleGrpcDataPushLog({
        info: res,
        pushLog: handlePushLog,
      })
    }
  })

  const handleResetData = useMemoizedFn(() => {
    handleResetPlanTree()
    handleResetActiveLeafTasks()
    setElements([])
  })

  /** review 界面选项触发事件 */
  const handleSend: handleSendFunc = useMemoizedFn(({ request, optionValue, cb }) => {
    try {
      const { InteractiveId, InteractiveJSONInput } = request
      if (!review.current || review.current.id !== InteractiveId) {
        yakitNotify('error', '未获取到 review 信息, 操作无效')
        return
      }

      const chatData = cloneDeep(review.current)
      ;(chatData.data as AIReviewType).selected = InteractiveJSONInput || ''
      ;(chatData.data as AIReviewType).optionValue = optionValue

      handleResetReview()
      handleReviewDataToUI(chatData)
      setContentMap(chatData.id, chatData)
      setElements((old) => old.concat({ token: chatData.id, type: chatData.type, renderNum: 1, chatType: 'task' }))

      cb && cb()
    } catch (error) {}
  })

  /** grpc接口关闭后的后续处理逻辑 */
  const handleCloseGrpc = useMemoizedFn(() => {
    // 将进行中的任务变更为中止状态
    handleAbortTaskState()
  })

  /** 当前任务规划结束-触发UI展示结束标识 */
  const handlePlanExecEnd = useMemoizedFn((res: AIOutputEvent) => {
    const chatData: AIChatQSData = {
      ...genBaseAIChatData(res),
      chatType: 'task',
      type: AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION,
      data: '',
    }
    setContentMap(chatData.id, chatData)
    setElements((old) => [...old, { token: chatData.id, type: chatData.type, renderNum: 1, chatType: 'task' }])
  })

  /** 用户手动介入逻辑 */
  const handleUserManualIntervention = useMemoizedFn((chatInfo: AIChatQSData) => {
    try {
      setContentMap(chatInfo.id, cloneDeep(chatInfo))
      setElements((old) => [...old, { token: chatInfo.id, type: chatInfo.type, renderNum: 1, chatType: 'task' }])
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
