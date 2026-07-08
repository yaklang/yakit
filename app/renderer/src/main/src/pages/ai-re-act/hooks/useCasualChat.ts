import type {
  AIChatLogData,
  handleSendFunc,
  UseCasualChatEvents,
  UseCasualChatParams,
  UseCasualChatState,
} from './type'
import type { AIChatQSData, AIReviewType, ReActChatRenderItem } from './aiRender'
import type { AIAgentGrpcApi, AIOutputEvent, AITaskStatusType } from './grpcApi'
import { useRef, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { Uint8ArrayToString } from '@/utils/str'
import cloneDeep from 'lodash/cloneDeep'
import { genBaseAIChatData, handleGrpcDataPushLog } from './utils'
import { AIChatQSDataTypeEnum } from './aiRender'
import { yakitNotify } from '@/utils/notification'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { grpcAIMessageHandlers } from './grpcAIMessageHandlers'
import { DefaultTodoListCardData, DefaultPlanItemDetailsData } from './defaultConstant'

function useCasualChat(params: UseCasualChatParams): [UseCasualChatState, UseCasualChatEvents]

function useCasualChat(params: UseCasualChatParams) {
  const { pushLog, getChatDataStore, getRequest, onReview, onReviewRelease } = params || {}

  const handlePushLog = useMemoizedFn((logInfo: AIChatLogData) => {
    pushLog && pushLog(logInfo)
  })

  const [elements, setElements, getElements] = useGetSetState<ReActChatRenderItem[]>([])
  const [casualQuestionList, setCasualQuestionList] = useState<string[]>([])

  const getCasualChat = useMemoizedFn(() => {
    return getChatDataStore?.()?.casualChat
  })
  const [toolListRenderNumber, setToolListRenderNumber] = useState(0)
  const resetTodoListData = useMemoizedFn(() => {
    const chatDetail = getCasualChat()
    if (!chatDetail) return
    chatDetail.planDetails.todoList = cloneDeep(DefaultTodoListCardData)
    setToolListRenderNumber(0)
  })
  const getContentMap = useMemoizedFn((mapKey: string) => {
    const contentMap = getChatDataStore?.()?.casualChat?.contents
    if (!contentMap) return undefined
    return contentMap.get(mapKey)
  })
  const setContentMap = useMemoizedFn((mapKey: string, value: AIChatQSData) => {
    const contentMap = getChatDataStore?.()?.casualChat?.contents
    contentMap && contentMap.set(mapKey, value)
  })

  const appendCasualQuestion = useMemoizedFn((token: string) => {
    const chatData = getContentMap(token)
    if (!chatData || chatData.type !== AIChatQSDataTypeEnum.QUESTION) return
    setCasualQuestionList((old) => {
      if (old.includes(token)) return old
      return [...old, token]
    })
  })

  /** 子 agent 任务创建时生成聚合卡片 */
  const handleReactTaskCreated = useMemoizedFn((res: AIOutputEvent, info: AIAgentGrpcApi.CasualCreated) => {
    if (!info.react_task_is_sub_agent) return

    const taskKey = info.react_task_id
    if (!taskKey) return

    const existing = getContentMap(taskKey)
    if (existing && existing.type !== AIChatQSDataTypeEnum.TASK_NODE_GROUP) {
      handleGrpcDataPushLog({ info: res, pushLog: handlePushLog })
      return
    }

    if (existing) {
      if (info.react_task_name) existing.data.taskName = info.react_task_name
      if (info.react_user_input) existing.data.goal = info.react_user_input
      existing.data.status = info.react_task_status
      setContentMap(existing.id, existing)
      const chatStore = getChatDataStore?.()
      if (chatStore && !chatStore.casualChat.planDetailsMap.has(taskKey)) {
        chatStore.casualChat.planDetailsMap.set(taskKey, cloneDeep(DefaultPlanItemDetailsData))
      }
      setElements((old) =>
        old.map((item) => {
          if (item.token === existing.id && item.type === existing.type) {
            return { ...item, renderNum: item.renderNum + 1 }
          }
          return item
        }),
      )
      return
    }

    const chatData: AIChatQSData = {
      ...genBaseAIChatData(res),
      id: taskKey,
      chatType: 'reAct',
      type: AIChatQSDataTypeEnum.TASK_NODE_GROUP,
      data: {
        taskId: info.react_task_id,
        taskIndex: info.react_task_id,
        taskName: info.react_task_name || info.react_user_input || info.react_task_id,
        goal: info.react_user_input || '',
        status: info.react_task_status,
      },
    } as AIChatQSData

    setContentMap(chatData.id, chatData)
    const chatStore = getChatDataStore?.()
    if (chatStore && !chatStore.casualChat.planDetailsMap.has(taskKey)) {
      chatStore.casualChat.planDetailsMap.set(taskKey, cloneDeep(DefaultPlanItemDetailsData))
    }
    setElements((old) => {
      const exists = old.some((item) => item.token === chatData.id && item.type === chatData.type)
      if (exists) return old
      return [
        ...old,
        { token: chatData.id, type: chatData.type, renderNum: 1, chatType: 'reAct', kind: 'task', children: [] },
      ]
    })
  })

  /** 子 agent 任务状态变更时更新聚合卡片 */
  const handleReactTaskStatusChanged = useMemoizedFn((res: AIOutputEvent, info: AIAgentGrpcApi.ReactTaskChanged) => {
    const taskKey = res.TaskId || info.react_task_id
    if (!taskKey) return

    const existing = getContentMap(taskKey)
    if (!existing || existing.type !== AIChatQSDataTypeEnum.TASK_NODE_GROUP) return

    existing.data.status = info.react_task_now_status as AITaskStatusType
    setContentMap(taskKey, existing)
    setElements((old) =>
      old.map((item) => {
        if (item.token === taskKey && item.type === existing.type) {
          return { ...item, renderNum: item.renderNum + 1 }
        }
        return item
      }),
    )
  })

  // #region review数据-hook缓存数据
  const review = useRef<AIChatQSData>()
  const handleGetReview = useMemoizedFn(() => {
    return review.current
  })
  const handleSetReview = useMemoizedFn((newReview: AIChatQSData | undefined) => {
    review.current = cloneDeep(newReview)
  })
  // #endregion

  // 处理数据方法
  const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
    try {
      const ipcContent = Uint8ArrayToString(res.Content) || ''

      if (res.Type === 'structured' && res.NodeId === 'react_task_created') {
        const data = JSON.parse(ipcContent) as AIAgentGrpcApi.CasualCreated
        handleReactTaskCreated(res, data)
        return
      }

      if (res.Type === 'structured' && res.NodeId === 'react_task_status_changed') {
        const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReactTaskChanged
        handleReactTaskStatusChanged(res, data)
        return
      }

      let funcKey = res.Type
      if (res.Type === 'report_finish' && res.NodeId === 'report-finish') {
        funcKey = res.NodeId
      }
      if (res.Type === 'structured' && res.NodeId === 'stream-finished') {
        // stream数据结束标识
        funcKey = res.NodeId
      } else if (res.Type === 'structured' && res.NodeId === 'react_task_dequeue') {
        // 用户问题开始执行标识
        funcKey = res.NodeId
      } else if (res.Type === 'api_request_failed' && res.NodeId === 'ai_call_failure') {
        funcKey = res.Type
      } else if (res.Type === 'structured' && res.NodeId === 'capability_inventory') {
        funcKey = res.NodeId
      } else if (res.Type === 'perception' && res.NodeId === 'perception') {
        funcKey = res.Type
      } else if (res.Type === 'current_task_todo_list_update' && res.NodeId === 'current_task_todo_list') {
        funcKey = res.Type
      } else if (res.NodeId === 'session_snapshot') {
        funcKey = res.NodeId
      }
      const handleFunc = grpcAIMessageHandlers[funcKey || '']
      const isReactTaskDequeue = res.Type === 'structured' && res.NodeId === 'react_task_dequeue'
      if (handleFunc) {
        handleFunc({
          res,
          info: { chatType: 'reAct' },
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
            onReviewRelease,
          },
          getChatDataStore,
          callback: (data) => {
            if (data.Type === 'current_task_todo_list_update' && data.NodeId === 'current_task_todo_list') {
              setToolListRenderNumber((old) => old + 1)
            }
          },
        })
        if (isReactTaskDequeue) {
          const data = JSON.parse(ipcContent) as AIAgentGrpcApi.QuestionQueueStatusChange
          appendCasualQuestion(res.TaskId || data.react_task_id)
        }
        return
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

  // 用户问题或review的主动操作
  const handleSend: handleSendFunc = useMemoizedFn(({ request, optionValue, cb }) => {
    try {
      const { IsInteractiveMessage, InteractiveId } = request
      if (IsInteractiveMessage && InteractiveId) {
        if (!review.current || (review.current.data as AIReviewType)?.id !== InteractiveId) {
          yakitNotify('error', '未获取到 review 信息, 操作无效')
          return
        }

        ;(review.current.data as AIReviewType).selected = request.InteractiveJSONInput
        ;(review.current.data as AIReviewType).optionValue = optionValue

        const chatData = cloneDeep(review.current)
        review.current = undefined
        setContentMap(chatData.id, chatData)
        setElements((old) => {
          return old.map((item) => {
            if (item.token === chatData.id && item.type === chatData.type) {
              return { ...item, renderNum: item.renderNum + 1 }
            }
            return item
          })
        })
      }
      cb && cb()
    } catch (error) {}
  })

  const handleResetData = useMemoizedFn(() => {
    review.current = undefined
    getChatDataStore?.()?.casualChat.planDetailsMap.clear()
    setElements([])
    setCasualQuestionList([])
    setToolListRenderNumber(0)
  })

  /** 用户手动介入逻辑 */
  const handleUserManualIntervention = useMemoizedFn((chatInfo: AIChatQSData) => {
    try {
      setContentMap(chatInfo.id, cloneDeep(chatInfo))
      setElements((old) => [
        ...old,
        { token: chatInfo.id, type: chatInfo.type, renderNum: 1, chatType: 'reAct', kind: 'item' },
      ])
    } catch (error) {
      yakitNotify('error', `用户手动干预操作失败: ${error}`)
    }
  })

  const state: UseCasualChatState = useCreation(() => {
    return { elements, toolListRenderNumber, casualQuestionList }
  }, [elements, toolListRenderNumber, casualQuestionList])

  const events: UseCasualChatEvents = useCreation(() => {
    return {
      handleSetData,
      handleResetData,
      handleSend,
      getContentMap,
      setContentMap,
      setElements: setElements,
      getElements: getElements,
      handleUserManualIntervention,
      resetTodoListData,
    }
  }, [])

  return [state, events] as const
}

export default useCasualChat
