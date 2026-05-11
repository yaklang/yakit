import type {
  AIChatLogData,
  handleSendFunc,
  UseCasualChatEvents,
  UseCasualChatParams,
  UseCasualChatState,
} from './type'
import type { AIChatQSData, AIReviewType, ReActChatRenderItem } from './aiRender'
import type { AIOutputEvent } from './grpcApi'
import { useRef } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import cloneDeep from 'lodash/cloneDeep'
import { handleGrpcDataPushLog } from './utils'
import { v4 as uuidv4 } from 'uuid'
import { yakitNotify } from '@/utils/notification'
import { AIChatQSDataTypeEnum } from './aiRender'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import moment from 'moment'
import { grpcAIMessageHandlers } from './grpcAIMessageHandlers'

function useCasualChat(params: UseCasualChatParams): [UseCasualChatState, UseCasualChatEvents]

function useCasualChat(params: UseCasualChatParams) {
  const { pushLog, getChatDataStore, getRequest, onReviewRelease } = params || {}

  const handlePushLog = useMemoizedFn((logInfo: AIChatLogData) => {
    pushLog && pushLog(logInfo)
  })

  const [elements, setElements, getElements] = useGetSetState<ReActChatRenderItem[]>([])

  const getContentMap = useMemoizedFn((mapKey: string) => {
    const contentMap = getChatDataStore?.()?.casualChat?.contents
    if (!contentMap) return undefined
    return contentMap.get(mapKey)
  })
  const setContentMap = useMemoizedFn((mapKey: string, value: AIChatQSData) => {
    const contentMap = getChatDataStore?.()?.casualChat?.contents
    contentMap && contentMap.set(mapKey, value)
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
      let funcKey = res.Type
      if (res.Type === 'structured' && res.NodeId === 'stream-finished') {
        // stream数据结束标识
        funcKey = res.NodeId
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
        })
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
  const handleSend: handleSendFunc = useMemoizedFn(({ request, optionValue, extraValue, cb }) => {
    try {
      const { IsInteractiveMessage, InteractiveId, IsFreeInput, FreeInput } = request
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

      if (IsFreeInput && FreeInput && !cb) {
        // 用户问题
        const chatData: AIChatQSData = {
          id: uuidv4(),
          chatType: 'reAct',
          type: AIChatQSDataTypeEnum.QUESTION,
          Timestamp: moment().unix(),
          data: { qs: FreeInput || '', setting: request },
          AIService: '',
          AIModelName: '',
          extraValue: extraValue,
        }

        setContentMap(chatData.id, chatData)
        setElements((old) => [...old, { token: chatData.id, type: chatData.type, renderNum: 1, chatType: 'reAct' }])
      }

      cb && cb()
    } catch (error) {}
  })

  const handleResetData = useMemoizedFn(() => {
    review.current = undefined
    setElements([])
  })

  /** 用户手动介入逻辑 */
  const handleUserManualIntervention = useMemoizedFn((chatInfo: AIChatQSData) => {
    try {
      setContentMap(chatInfo.id, cloneDeep(chatInfo))
      setElements((old) => [...old, { token: chatInfo.id, type: chatInfo.type, renderNum: 1, chatType: 'reAct' }])
    } catch (error) {
      yakitNotify('error', `用户手动干预操作失败: ${error}`)
    }
  })

  const state: UseCasualChatState = useCreation(() => {
    return { elements }
  }, [elements])

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
    }
  }, [])

  return [state, events] as const
}

export default useCasualChat
