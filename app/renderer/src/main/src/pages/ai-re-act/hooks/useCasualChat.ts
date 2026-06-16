import type {
  AIChatLogData,
  handleSendFunc,
  UseCasualChatEvents,
  UseCasualChatParams,
  UseCasualChatState,
} from './type'
import type { AIChatQSData, AIReviewType, ReActChatRenderItem } from './aiRender'
import type { AIOutputEvent } from './grpcApi'
import { useRef, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import cloneDeep from 'lodash/cloneDeep'
import { handleGrpcDataPushLog } from './utils'
import { yakitNotify } from '@/utils/notification'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { grpcAIMessageHandlers } from './grpcAIMessageHandlers'
import { DefaultPlanItemDetailsData } from './defaultConstant'

function useCasualChat(params: UseCasualChatParams): [UseCasualChatState, UseCasualChatEvents]

function useCasualChat(params: UseCasualChatParams) {
  const { pushLog, getChatDataStore, getRequest, onReviewRelease } = params || {}

  const handlePushLog = useMemoizedFn((logInfo: AIChatLogData) => {
    pushLog && pushLog(logInfo)
  })

  const [elements, setElements, getElements] = useGetSetState<ReActChatRenderItem[]>([])
  const getCasualChat = useMemoizedFn(() => {
    return getChatDataStore?.()?.casualChat
  })
  const [toolListRenderNumber, setToolListRenderNumber] = useState(0)
  const resetTodoListData = useMemoizedFn(() => {
    const chatDetail = getCasualChat()
    if (!chatDetail) return
    chatDetail.planDetails = cloneDeep(DefaultPlanItemDetailsData)
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

  /**
   * 任务节点开始执行, 生成UI展示的信息
   * 历史数据里 先给pop_task，后给push_task，所以pop_task是生成数据的主要依据
   * 自由对话里该类型只有历史数据
   */
  // const handleTaskNode = useMemoizedFn((res: AIOutputEvent) => {
  //   try {
  //     let ipcContent = Uint8ArrayToString(res.Content) || ''
  //     const info = JSON.parse(ipcContent) as AIAgentGrpcApi.ChangeTask
  //     if (!info.task.task_uuid || info.task.index === '1') return
  //     if (!res.IsSync) return

  //     let taskNodeInfo: AIChatQSData | undefined = getContentMap(info.task.task_uuid)
  //     if (!taskNodeInfo) {
  //       taskNodeInfo = {
  //         ...genBaseAIChatData(res),
  //         id: info.task.task_uuid,
  //         chatType: 'reAct',
  //         type: AIChatQSDataTypeEnum.TASK_INDEX_NODE,
  //         data: {
  //           taskIndex: info.task.index,
  //           taskName: info.task.name,
  //           goal: info.task.goal,
  //           status: info.task.task_status || AITaskStatus.error,
  //         },
  //       }
  //       setContentMap(taskNodeInfo.id, taskNodeInfo)
  //     }

  //     if (info.type === 'push_task') {
  //       if (taskNodeInfo.type !== AIChatQSDataTypeEnum.TASK_INDEX_NODE) return
  //       setElements((old) => [
  //         { token: taskNodeInfo!.id, type: taskNodeInfo!.type, renderNum: 1, chatType: 'reAct' },
  //         ...old,
  //       ])
  //     }
  //   } catch {}
  // })

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
      } else if (res.Type === 'current_task_todo_list_update' && res.NodeId === 'current_task_todo_list') {
        funcKey = res.Type
      }
      const handleFunc = grpcAIMessageHandlers[funcKey || '']
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
            onReviewRelease,
          },
          getChatDataStore,
          callback: (data) => {
            if (data.Type === 'current_task_todo_list_update' && data.NodeId === 'current_task_todo_list') {
              setToolListRenderNumber((old) => old + 1)
            }
          },
        })
        return
      }

      // if (res.Type === 'structured' && res.NodeId === 'system') {
      //   const data = JSON.parse(ipcContent) || ''
      //   if (data && typeof data === 'object' && ['pop_task', 'push_task'].includes(data?.type)) {
      //     handleTaskNode(res)
      //   }
      //   return
      // } else

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
    setElements([])
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
    return { elements, toolListRenderNumber }
  }, [elements, toolListRenderNumber])

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
