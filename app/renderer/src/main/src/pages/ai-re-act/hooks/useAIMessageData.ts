import { useRef, useState } from 'react'
import aiChatMessageStore from '../../ai-agent/store/aiChatMessageStore'
import type { GetDialoguesData, StoreName } from '../../ai-agent/store/type'
import { useMemoizedFn } from 'ahooks'
import { getTreeDataIds, indexedDBDataToReActChatRenderItem, toDialogueData } from './utils'
import type { AIMessageDataProps, PaginationCursors, UseAIMessageDataEvents, UseAIMessageDataState } from './type'

const LIMIT = 10

const useAIMessageData = ({
  type,
  getChatStore,
  setContentMap,
  setCasualElements,
  setTaskElements,
  grpcLoadMore,
}: AIMessageDataProps): [UseAIMessageDataState, UseAIMessageDataEvents] => {
  const [initLoading, setInitLoading] = useState(false)
  const [taskLoadMoreLoading, setTaskLoadMoreLoading] = useState(false)
  const [casualLoadMoreLoading, setCasualLoadMoreLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  // 是否还有数据
  const hasMoreRef = useRef({ casual: true, task: true })
  // 分页id
  const cursorsRef = useRef<PaginationCursors>({})
  // 记录后端的id
  const grpcIdRef = useRef<number>(-1)

  const handleLoadInit: UseAIMessageDataEvents['handleLoadInit'] = async (sessionId) => {
    setInitLoading(true)
    // 重置分页状态
    handleReset()

    try {
      await aiChatMessageStore.open()
      const [casualResult, taskResult, sessionMetadata] = await Promise.all([
        aiChatMessageStore.getDialogues({ storeName: `${type}CasualDB`, sessionId, limit: LIMIT }),
        aiChatMessageStore.getDialogues({ storeName: `${type}TaskDB`, sessionId, limit: LIMIT }),
        aiChatMessageStore.getSessionMetadata(sessionId),
      ])
      if (sessionMetadata?.offset !== undefined && sessionMetadata.offset !== -1) {
        grpcIdRef.current = sessionMetadata?.offset
        const chatStore = getChatStore()
        if (chatStore) chatStore.beforeID.chatID = sessionMetadata.offset
      } else {
        grpcIdRef.current = getChatStore()?.beforeID.chatID ?? -1
      }
      // 记录分页游标（第一条记录的 token）
      cursorsRef.current = {
        casualId: casualResult.items.at(0)?.token,
        taskId: taskResult.items.at(0)?.token,
      }
      hasMoreRef.current = { casual: casualResult.hasMore, task: taskResult.hasMore }
      if (!casualResult.hasMore && grpcIdRef.current > 0) {
        grpcLoadMore?.({ limit: 1, start_id: grpcIdRef.current })
      }

      // 用每条记录的 token 作为 pToken 查询对应的正文内容。
      const [casualContents, taskContents] = await Promise.all([
        aiChatMessageStore.getDialogueContentsByPid({ sessionId, pTokens: getTreeDataIds(casualResult.items) }),
        aiChatMessageStore.getDialogueContentsByPid({ sessionId, pTokens: getTreeDataIds(taskResult.items) }),
      ])
      casualContents.forEach((item) => {
        setContentMap('reAct', item.token, JSON.parse(item.content))
      })
      taskContents.forEach((item) => {
        setContentMap('task', item.token, JSON.parse(item.content))
      })
      setCasualElements(indexedDBDataToReActChatRenderItem('reAct', casualResult.items))
      setTaskElements(indexedDBDataToReActChatRenderItem('task', taskResult.items))
    } catch (err) {
      throw err instanceof Error ? err : new Error('未知错误')
    } finally {
      setInitLoading(false)
    }
  }

  // ─── 加载更多：按 chatType 分别翻页 ─────────────────────────────────
  const handleLoadMore: UseAIMessageDataEvents['handleLoadMore'] = async (sessionId, chatType) => {
    const isCasual = chatType === 'reAct'
    const hasMore = isCasual ? hasMoreRef.current.casual : hasMoreRef.current.task
    const loadMoreLoading = isCasual ? casualLoadMoreLoading : taskLoadMoreLoading
    // 没有更多数据或正在加载时直接返回，防止重复请求
    if (!hasMore || loadMoreLoading) return

    isCasual ? setCasualLoadMoreLoading(true) : setTaskLoadMoreLoading(true)
    try {
      const storeName = (isCasual ? `${type}CasualDB` : `${type}TaskDB`) as StoreName
      const cursorId = isCasual ? cursorsRef.current.casualId : cursorsRef.current.taskId

      const result: GetDialoguesData = await aiChatMessageStore.getDialogues({
        storeName,
        sessionId,
        token: cursorId,
        limit: LIMIT,
      })

      const contents = await aiChatMessageStore.getDialogueContentsByPid({
        sessionId,
        pTokens: result.items.map((item) => item.token),
      })
      contents.forEach((item) => {
        setContentMap(chatType, item.token, JSON.parse(item.content))
      })
      // 更新游标
      if (isCasual) {
        cursorsRef.current.casualId = result.items.at(0)?.token
        hasMoreRef.current.casual = result.hasMore
        if (!result.hasMore && grpcIdRef.current > 0) grpcLoadMore?.({ limit: 1, start_id: grpcIdRef.current })
        setCasualElements((prev) => [...indexedDBDataToReActChatRenderItem('reAct', result.items), ...prev])
      } else {
        cursorsRef.current.taskId = result.items.at(0)?.token
        hasMoreRef.current.task = result.hasMore
        setTaskElements((prev) => [...indexedDBDataToReActChatRenderItem('task', result.items), ...prev])
      }
    } catch (err) {
      console.log('err:', err)
    } finally {
      isCasual ? setCasualLoadMoreLoading(false) : setTaskLoadMoreLoading(false)
    }
  }

  const handleSave: UseAIMessageDataEvents['handleSave'] = async (
    sessionId,
    { casualElements, taskElements, casualContentMap, taskContentMap },
  ) => {
    setSaveLoading(true)

    const sessionMetadataPromise = aiChatMessageStore.setSessionMetadata({
      sessionId,
      offset: grpcIdRef.current || 0,
    })
    const casualDialoguesPromise = aiChatMessageStore.setDialogues({
      storeName: `${type}CasualDB`,
      data: toDialogueData(casualElements, sessionId),
    })
    const taskDialoguesPromise = aiChatMessageStore.setDialogues({
      storeName: `${type}TaskDB`,
      data: toDialogueData(taskElements, sessionId),
    })
    const allContents = [...casualContentMap.values(), ...taskContentMap.values()]

    const dialogueContentPromise = aiChatMessageStore.setDialogueContent({
      data: allContents.map((content) => ({
        token: content.id,
        sessionId,
        content: JSON.stringify(content),
        pToken: content.id,
      })),
    })
    await Promise.all([sessionMetadataPromise, casualDialoguesPromise, taskDialoguesPromise, dialogueContentPromise])
      .catch((err) => {
        console.error('保存聊天数据失败', err)
      })
      .finally(() => {
        setSaveLoading(false)
      })
  }

  // ─── 重置 ────────────────────────────────────────────────────────────
  const handleReset: UseAIMessageDataEvents['handleReset'] = () => {
    hasMoreRef.current = { casual: true, task: true }
    cursorsRef.current = {}
  }

  const handleGrpcLoadMore: UseAIMessageDataEvents['handleGrpcLoadMore'] = useMemoizedFn(
    async ({ has_more, next_start_id }) => {
      if (grpcIdRef.current > 0) {
        hasMoreRef.current.casual = has_more
      }
      grpcIdRef.current = next_start_id
    },
  )

  const handleHasMore: UseAIMessageDataEvents['handleHasMore'] = (chatType) => {
    return hasMoreRef.current[chatType === 'reAct' ? 'casual' : 'task']
  }

  const handleDeleteSession: UseAIMessageDataEvents['handleDeleteSession'] = async (sessions) => {
    setSaveLoading(true)
    try {
      await aiChatMessageStore.deleteSession({ domain: type, sessions })
      // 删除成功后重置状态
      handleReset()
    } catch (err) {
      console.error('删除聊天数据失败', err)
    } finally {
      setSaveLoading(false)
    }
  }

  return [
    {
      /** 初始化加载中 */
      initLoading,
      /** 加载更多加载中 */
      casualLoadMoreLoading,
      taskLoadMoreLoading,
      saveLoading,
    },
    {
      handleLoadInit,
      handleLoadMore,
      handleReset,
      handleSave,
      handleGrpcLoadMore,
      handleHasMore,
      handleDeleteSession,
    },
  ]
}

export default useAIMessageData
