import type { handleSendFunc, UseCasualChatEvents, UseCasualChatParams, UseCasualChatState } from './type'
import type { AIChatQSData, ReActChatRenderItem } from './aiRender'
import type { AIOutputEvent } from './grpcApi'
import { useRef, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import cloneDeep from 'lodash/cloneDeep'
import { yakitNotify } from '@/utils/notification'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { DefaultTodoListCardData } from './defaultConstant'

function useCasualChat(params: UseCasualChatParams): [UseCasualChatState, UseCasualChatEvents]

function useCasualChat(params: UseCasualChatParams) {
  const { getChatDataStore, getRequest, onReviewRelease } = params || {}

  const [elements, setElements, getElements] = useGetSetState<ReActChatRenderItem[]>([])

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

  // #region review数据-hook缓存数据
  const review = useRef<AIChatQSData>()

  // #endregion

  // 处理数据方法
  const handleSetData = useMemoizedFn((res: AIOutputEvent) => {})

  // 用户问题或review的主动操作
  const handleSend: handleSendFunc = useMemoizedFn(({ request, optionValue, cb }) => {})

  const handleResetData = useMemoizedFn(() => {
    review.current = undefined
    getChatDataStore?.()?.casualChat.planDetailsMap.clear()
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
